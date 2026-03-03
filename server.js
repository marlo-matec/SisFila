
/**
 * SisFila - Servidor Backend (Node.js + SQLite3 Async)
 * Arquitetura Versão 2.5 - Professional Edition
 * - Suporte a Backup/Restore Binário
 * - Migrations Automáticas (Update Seguro)
 * - Caminho de Dados Configurável
 */

require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const cors = require('cors');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { exec } = require('child_process');
const https = require('https');
const puppeteer = require('puppeteer');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

const PORT = 3000;

// --- 1. CONFIGURAÇÃO AVANÇADA DE DIRETÓRIOS ---
// Permite definir uma pasta externa para salvar o banco (Ideal para atualizações)
const userDataPath = process.env.USER_DATA_PATH || __dirname;

// Garante que a pasta de dados exista (Se usar caminho externo)
if (!fs.existsSync(userDataPath)) {
    try {
        fs.mkdirSync(userDataPath, { recursive: true });
        console.log(`[SYSTEM] Diretório de dados criado: ${userDataPath}`);
    } catch (e) {
        console.error(`[ERROR] Falha ao criar diretório de dados: ${e.message}`);
    }
}

const DB_PATH = path.join(userDataPath, 'sisfila.db');
const TEMP_PDF_FILE = path.join(userDataPath, 'ticket.pdf');

// Caminho do SumatraPDF
let SUMATRA_EXE = path.join(__dirname, 'SumatraPDF.exe');
if (process.env.ELECTRON_RUN === 'true' && __dirname.includes('app.asar')) {
    SUMATRA_EXE = path.join(__dirname.replace('app.asar', 'app.asar.unpacked'), 'SumatraPDF.exe');
}

const SECRET_KEY = "SISFILA_SECURE_SIGNATURE_V1"; 

// Enable CORS first
app.use(cors());

// --- ROTA CRÍTICA: RESTORE DB (BINÁRIO) ---
// Deve vir antes dos body-parsers para evitar corrupção do stream
app.post('/api/restore-db', (req, res) => {
    console.log("Iniciando upload de banco de dados...");
    
    // Create restore file
    const restorePath = path.join(userDataPath, 'sisfila_restoring.db');
    const writeStream = fs.createWriteStream(restorePath);
    
    // Manually pipe the request to the file
    req.pipe(writeStream);
    
    writeStream.on('finish', async () => {
        try {
            // VERIFICAR SE O ARQUIVO TEM CONTEÚDO
            const stats = fs.statSync(restorePath);
            if (stats.size === 0) {
                 console.error("Arquivo de upload vazio.");
                 fs.unlinkSync(restorePath);
                 return res.status(400).json({ success: false, message: "Arquivo vazio." });
            }

            console.log(`Upload concluído (${stats.size} bytes). Iniciando substituição...`);
            
            // 1. Close existing DB connection
            if (db) {
                await db.close();
                console.log("Conexão com Banco Fechada.");
            }

            // 2. Wait for OS locks to release (Critical for Windows)
            setTimeout(async () => {
                try {
                    // 3. CLEAN UP OLD WAL FILES (Critical for SQLite Corruption Prevention)
                    const walFile = DB_PATH + '-wal';
                    const shmFile = DB_PATH + '-shm';
                    
                    if (fs.existsSync(walFile)) {
                        try { fs.unlinkSync(walFile); console.log("Arquivo WAL removido."); } catch(e) { console.error("Falha ao deletar WAL", e); }
                    }
                    if (fs.existsSync(shmFile)) {
                         try { fs.unlinkSync(shmFile); console.log("Arquivo SHM removido."); } catch(e) { console.error("Falha ao deletar SHM", e); }
                    }

                    // 4. Backup current DB (safety)
                    if (fs.existsSync(DB_PATH)) {
                        try { fs.copyFileSync(DB_PATH, DB_PATH + '.bak'); } catch(e) {}
                    }
                    
                    // 5. Replace DB File
                    fs.copyFileSync(restorePath, DB_PATH);
                    fs.unlinkSync(restorePath); // delete temp
                    
                    console.log("Banco de dados substituído com sucesso.");

                    // 6. Reopen DB
                    await openDB();
                    
                    // 7. Notify clients
                    io.emit('sync-update', { type: 'RESET' });
                    
                    res.json({ success: true });
                } catch (err) {
                    console.error("ERRO CRÍTICO AO SUBSTITUIR:", err);
                    // Try to revive
                    await openDB();
                    res.status(500).json({ success: false, message: "Erro ao substituir arquivos." });
                }
            }, 2000); // 2s delay for safety

        } catch (e) {
            console.error(e);
            if (fs.existsSync(restorePath)) fs.unlinkSync(restorePath);
            res.status(500).json({ success: false });
        }
    });

    writeStream.on('error', (err) => {
        console.error("Erro stream:", err);
        res.status(500).json({ success: false });
    });
});
// -------------------------------------------------------------

// Middleware Standard
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(__dirname, 'dist')));

console.log(`Banco de Dados SQL: ${DB_PATH}`);

// --- BANCO DE DADOS (SQLite Async) ---

let db;
let dbQueue = Promise.resolve();

/**
 * Executa uma tarefa no banco de dados de forma sequencial (Fila de Escrita)
 * Isso evita erros de "database is locked" e conflitos de transação.
 */
async function runQueued(task) {
    dbQueue = dbQueue.then(async () => {
        try {
            await task();
        } catch (err) {
            console.error('[DB QUEUE ERROR]', err);
        }
    });
    return dbQueue;
}

async function openDB() {
    try {
        db = await open({
            filename: DB_PATH,
            driver: sqlite3.Database
        });
        // Configurações para alta concorrência e performance
        await db.run('PRAGMA journal_mode = WAL;');
        await db.run('PRAGMA synchronous = NORMAL;');
        await db.run('PRAGMA busy_timeout = 5000;'); // 5 segundos de espera antes de dar erro de "locked"
        
        console.log('Conectado ao SQLite (Async) com sucesso.');
        await initDB();
    } catch (err) {
        console.error('Erro fatal ao abrir SQLite:', err);
    }
}

// --- SISTEMA DE MIGRATION (AJUSTE AUTOMÁTICO DE VERSÃO) ---
// Função segura para adicionar colunas novas em bancos existentes
async function ensureColumn(tableName, columnName, columnType) {
    try {
        // Tenta adicionar a coluna. Se falhar, assume que já existe.
        await db.run(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnType}`);
        console.log(`[MIGRATION] Coluna '${columnName}' adicionada na tabela '${tableName}'.`);
    } catch (e) {
        // Erro esperado se a coluna já existir: "duplicate column name"
        // console.log(`[INFO] Coluna ${columnName} já existe em ${tableName}.`);
    }
}

// Inicialização das Tabelas e Migrações
async function initDB() {
    // 1. Criação Básica (Para instalação limpa)
    await db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT,
            username TEXT,
            password TEXT,
            deskNumber TEXT,
            serviceId TEXT,
            role TEXT,
            active INTEGER DEFAULT 1
        );
        CREATE TABLE IF NOT EXISTS services (
            id TEXT PRIMARY KEY,
            name TEXT,
            active INTEGER DEFAULT 1
        );
        CREATE TABLE IF NOT EXISTS tickets (
            id TEXT PRIMARY KEY,
            displayId TEXT,
            serviceId TEXT,
            serviceName TEXT,
            priority TEXT,
            status TEXT,
            createdAt INTEGER,
            calledAt INTEGER,
            startedAt INTEGER,
            finishedAt INTEGER,
            attendantName TEXT,
            deskNumber TEXT,
            tvPriority INTEGER DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS config (
            key TEXT PRIMARY KEY,
            value TEXT
        );
    `);

    // 2. MIGRATIONS (Atualização de Bancos Antigos)
    // Se você lançar uma versão nova com campos novos, adicione aqui:
    // Exemplo: await ensureColumn('users', 'email', 'TEXT');
    // Exemplo: await ensureColumn('tickets', 'observation', 'TEXT');
    
    // (Por enquanto nenhuma migration necessária para versão 2.4 -> 2.5, mas o sistema está pronto)
    await ensureColumn('tickets', 'tvPriority', 'INTEGER DEFAULT 0');

    // 3. Dados Iniciais (Apenas se o banco estiver vazio)
    const result = await db.get("SELECT count(*) as c FROM users");
    if (result.c === 0) {
        console.log("Criando dados padrão (Banco novo)...");
        await db.run("INSERT INTO services (id, name, active) VALUES (?, ?, ?)", ['1', 'Comercial', 1]);
        await db.run("INSERT INTO services (id, name, active) VALUES (?, ?, ?)", ['2', 'Financeiro', 1]);
        await db.run("INSERT INTO services (id, name, active) VALUES (?, ?, ?)", ['3', 'Suporte', 1]);

        await db.run(
            "INSERT INTO users (id, name, username, password, deskNumber, serviceId, role, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", 
            ['u1', 'Admin', 'admin', 'admin', '01', '1', 'admin', 1]
        );

        // Configs Default
        await setConfig('printerConfig', {
            printerName: '', paperWidth: '80', autoPrint: true, fontSize: '2', ticketTemplate: DEFAULT_TICKET_TEMPLATE
        });
        await setConfig('systemInfo', {
            installDate: Date.now(), licenseKey: null, clientName: '', clientLogo: ''
        });
    }
}

// Helpers de Configuração (Key-Value Store no SQL)
async function getConfig(key) {
    if (!db) return null;
    const row = await db.get("SELECT value FROM config WHERE key = ?", [key]);
    return row ? JSON.parse(row.value) : null;
}

async function setConfig(key, value) {
    if (!db) return;
    const json = JSON.stringify(value);
    await db.run("INSERT INTO config (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?", [key, json, json]);
}

const DEFAULT_TICKET_TEMPLATE = `<html>
  <head>
    <style>
      @page { margin: 0; }
      body { margin: 0; padding: 5px; font-family: 'Arial', sans-serif; text-align: center; color: black; }
      h2, .label, .password, .info, .meta, .extra1 { text-align: center; }
      .logo { max-width: 80%; max-height: 60px; margin-bottom: 5px; }
      h2 { font-size: 14px; margin: 2px 0; text-transform: uppercase; }
      .divider { border-top: 1px dashed black; margin: 5px 0; width: 100%; }
      .label { font-size: 12px; font-weight: bold; margin-top: 5px; }
      .password { font-size: {{FONT_SIZE_PX}}px; font-weight: 900; margin: 5px 0; line-height: 1; }
      .info { font-size: 30px; font-weight: bold; margin: 2px 0; }
      .meta { font-size: 20px; margin-top: 10px; margin-bottom: 80px; }
      .extra1 { font-size: 10px; margin-top: 10px; }
    </style>
  </head>
  <body>
    {{LOGO}}
    <h2>{{EMPRESA}}</h2>
    <div class="divider"></div>
    <div class="label">SENHA</div>
    <div class="password">{{SENHA}}</div>
    <div class="extra1">Serviço solicitado</div>
    <div class="info">{{SERVICO}}</div>
    <div class="extra1">Tipo de atendimento</div>
    <div class="info">{{PRIORIDADE}}</div>
    <div class="divider"></div>
    <div class="meta">{{DATA}} - {{HORA}}</div>
    <div class="divider"></div>
    <br/><br/>
  </body>
</html>`;

// --- FUNÇÕES DE UTILIDADE ---

function downloadWithRedirects(url, dest, cb) {
  let options;
  try {
    const urlObj = new URL(url);
    options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      protocol: urlObj.protocol,
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': '*/*' }
    };
  } catch (e) { if (cb) cb(new Error("URL Inválida")); return; }

  const request = https.get(options, (response) => {
    if ([301, 302, 307, 308].includes(response.statusCode) && response.headers.location) {
        downloadWithRedirects(response.headers.location, dest, cb);
        return;
    }
    if (response.statusCode !== 200) { if (cb) cb(new Error(`Status: ${response.statusCode}`)); return; }
    const file = fs.createWriteStream(dest);
    response.pipe(file);
    file.on('finish', () => { file.close(() => { if (cb) cb(null); }); });
  }).on('error', (err) => { try { fs.unlink(dest, () => {}); } catch(e){} if (cb) cb(err); });
}

function ensureSumatra() {
  if (!fs.existsSync(SUMATRA_EXE)) {
    console.log("Baixando SumatraPDF...");
    downloadWithRedirects("https://files2.sumatrapdfreader.org/software/sumatrapdf/rel/3.5.2/SumatraPDF-3.5.2-64.exe", SUMATRA_EXE, (err) => {
      if (!err) console.log("SumatraPDF pronto.");
    });
  }
}

// Valida uma chave recebida
function validateLicenseKey(key, name, email) {
  if (!key) return false;
  const parts = key.split('-');
  if (parts.length !== 3 || parts[0] !== 'SIS') return false;
  const expiryHex = parts[1];
  const signature = parts[2];
  const safeName = (name || '').trim().toLowerCase();
  const safeEmail = (email || '').trim().toLowerCase();
  const payload = `${safeName}|${safeEmail}|${expiryHex}`;
  const expectedSignature = crypto.createHmac('sha256', SECRET_KEY).update(payload).digest('hex').substring(0, 12).toUpperCase();
  if (signature !== expectedSignature) return false;
  return true;
}

// Gera uma nova chave assinada (Usado para Stacking de licenças)
function generateLicenseKey(name, email, expiryTimestamp) {
    const safeName = (name || '').trim().toLowerCase();
    const safeEmail = (email || '').trim().toLowerCase();
    const expiryHex = Math.floor(expiryTimestamp).toString(36).toUpperCase();
    
    const payload = `${safeName}|${safeEmail}|${expiryHex}`;
    const signature = crypto.createHmac('sha256', SECRET_KEY).update(payload).digest('hex').substring(0, 12).toUpperCase();
    
    return `SIS-${expiryHex}-${signature}`;
}

// Inicializa
ensureSumatra();
openDB();

// --- REST API (SQL Async) ---

app.get('/api/tickets', async (req, res) => {
    try {
        const rows = await db.all("SELECT * FROM tickets ORDER BY createdAt ASC");
        res.json(rows);
    } catch (e) { res.status(500).json([]); }
});

app.get('/api/services', async (req, res) => {
    try {
        const rows = await db.all("SELECT * FROM services WHERE active = 1");
        const fixed = rows.map(r => ({...r, active: !!r.active}));
        res.json(fixed);
    } catch (e) { res.status(500).json([]); }
});

app.get('/api/users', async (req, res) => {
    try {
        const rows = await db.all("SELECT * FROM users WHERE active = 1");
        const fixed = rows.map(r => ({...r, active: !!r.active}));
        res.json(fixed);
    } catch (e) { res.status(500).json([]); }
});

app.get('/api/license', async (req, res) => {
    const systemInfo = (await getConfig('systemInfo')) || {};
    const now = Date.now();
    const installDate = systemInfo.installDate || now;
    
    // Validação
    const isValid = validateLicenseKey(systemInfo.licenseKey, systemInfo.clientName, systemInfo.clientEmail);
    
    let trialDaysLeft = 0;
    let licenseExpiryDate = null;

    if (isValid && systemInfo.licenseKey) {
        const parts = systemInfo.licenseKey.split('-');
        const expiryTimestamp = parseInt(parts[1], 36);
        licenseExpiryDate = expiryTimestamp;
        
        if (now > expiryTimestamp) {
             trialDaysLeft = 0;
        } else {
             const diffMs = expiryTimestamp - now;
             trialDaysLeft = Math.ceil(diffMs / (86400000));
        }
    } else {
        const diffDays = Math.ceil(Math.abs(now - installDate) / (86400000));
        trialDaysLeft = 30 - diffDays;
    }
    
    const isLicenseExpired = licenseExpiryDate && (now > licenseExpiryDate);
    const isBlocked = (trialDaysLeft <= 0) && (!isValid || isLicenseExpired);

    res.json({
        installDate,
        trialDaysLeft: Math.max(0, trialDaysLeft),
        licenseExpiryDate,
        isBlocked,
        hasLicense: isValid && !isLicenseExpired,
        licenseKey: systemInfo.licenseKey || null,
        clientName: systemInfo.clientName || '',
        clientEmail: systemInfo.clientEmail || '',
        clientDocument: systemInfo.clientDocument || '',
        clientPhone: systemInfo.clientPhone || '',
        clientAddress: systemInfo.clientAddress || '',
        clientCity: systemInfo.clientCity || '',
        clientLogo: systemInfo.clientLogo || ''
    });
});

app.post('/api/client-info', async (req, res) => {
    const systemInfo = (await getConfig('systemInfo')) || {};
    const newInfo = { ...systemInfo, ...req.body };
    await setConfig('systemInfo', newInfo);
    res.json({ success: true });
});

app.post('/api/license', async (req, res) => {
    const { key: newKey } = req.body;
    const systemInfo = (await getConfig('systemInfo')) || {};
    
    if (validateLicenseKey(newKey, systemInfo.clientName, systemInfo.clientEmail)) {
        const partsNew = newKey.split('-');
        const newKeyExpiry = parseInt(partsNew[1], 36);
        const now = Date.now();
        
        let durationMs = newKeyExpiry - now;
        if (durationMs < 0) durationMs = 0; 

        let currentExpiry = now;
        if (systemInfo.licenseKey && validateLicenseKey(systemInfo.licenseKey, systemInfo.clientName, systemInfo.clientEmail)) {
             const partsOld = systemInfo.licenseKey.split('-');
             const oldExpiry = parseInt(partsOld[1], 36);
             if (oldExpiry > now) {
                 currentExpiry = oldExpiry;
             }
        }

        const finalExpiryTimestamp = currentExpiry + durationMs;
        const stackedKey = generateLicenseKey(systemInfo.clientName, systemInfo.clientEmail, finalExpiryTimestamp);

        systemInfo.licenseKey = stackedKey;
        await setConfig('systemInfo', systemInfo);
        
        res.json({ success: true, message: 'Licença ativada e dias adicionados!' });
    } else {
        res.status(400).json({ success: false, message: 'Chave inválida para o Cliente/Email cadastrados.' });
    }
});

app.get('/api/printer-config', async (req, res) => {
    const config = (await getConfig('printerConfig')) || { printerName: '', paperWidth: '80', autoPrint: true, fontSize: '2', ticketTemplate: DEFAULT_TICKET_TEMPLATE };
    res.json(config);
});

app.post('/api/printer-config', async (req, res) => {
    const current = (await getConfig('printerConfig')) || {};
    await setConfig('printerConfig', { ...current, ...req.body });
    res.json({ success: true });
});

app.get('/api/printers', (req, res) => {
    const psCommand = 'powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-Printer | Select-Object Name | ConvertTo-Json"';
    exec(psCommand, (error, stdout) => {
        if (!error && stdout) {
            try {
                let p = JSON.parse(stdout);
                const list = Array.isArray(p) ? p.map(x => x.Name) : [p.Name];
                return res.json(list);
            } catch {}
        }
        exec('wmic printer get name', (errWmic, stdoutWmic) => {
            if (errWmic) return res.json([]);
            const lines = stdoutWmic.split('\n').map(line => line.trim()).filter(line => line && line !== 'Name');
            res.json(lines);
        });
    });
});

app.post('/api/print-ticket', async (req, res) => {
    const { displayId, serviceName, priority, createdAt, fontSize } = req.body;
    const printerConfig = (await getConfig('printerConfig')) || {};
    const systemInfo = (await getConfig('systemInfo')) || {};

    if (!printerConfig.printerName) return res.status(400).json({ success: false, message: 'Impressora não configurada.' });

    const scale = parseInt(fontSize || printerConfig.fontSize) || 2;
    const baseSize = 40; 
    const passwordFontSize = baseSize + (scale * 10);
    const date = new Date(createdAt);
    const widthMm = parseInt(String(printerConfig.paperWidth).replace(/\D/g, '')) || 80;

    let rawHtml = printerConfig.ticketTemplate || DEFAULT_TICKET_TEMPLATE;
    const logoImg = systemInfo.clientLogo ? `<img src="${systemInfo.clientLogo}" class="logo" />` : '';
    
    const map = {
        '{{LOGO}}': logoImg,
        '{{EMPRESA}}': systemInfo.clientName || 'SISFILA',
        '{{SENHA}}': displayId,
        '{{SERVICO}}': serviceName,
        '{{PRIORIDADE}}': priority,
        '{{DATA}}': date.toLocaleDateString('pt-BR'),
        '{{HORA}}': date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        '{{FONT_SIZE_PX}}': passwordFontSize
    };
    
    for (const [k, v] of Object.entries(map)) rawHtml = rawHtml.replace(new RegExp(k, 'g'), v);
    const css = `<style>@page { margin: 0; size: ${widthMm}mm auto; } body { width: ${widthMm}mm; }</style>`;
    rawHtml = rawHtml.includes('<head>') ? rawHtml.replace('<head>', '<head>' + css) : css + rawHtml;

    try {
        const browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();
        await page.setViewport({ width: Math.ceil(widthMm * 3.78), height: 800 });
        await page.setContent(rawHtml, { waitUntil: 'networkidle0' });
        await page.pdf({ path: TEMP_PDF_FILE, width: `${widthMm}mm`, printBackground: true, margin: { top:0, right:0, bottom:0, left:0 } });
        await browser.close();

        const cmd = `"${SUMATRA_EXE}" -print-to "${printerConfig.printerName}" -silent "${TEMP_PDF_FILE}"`;
        exec(cmd, (error) => {
            setTimeout(() => { try { fs.unlinkSync(TEMP_PDF_FILE); } catch(e) {} }, 5000);
            if (error) res.status(500).json({ success: false });
            else res.json({ success: true });
        });
    } catch(err) {
        console.error(err);
        res.status(500).json({ success: false });
    }
});

// --- BACKUP (BINARY .DB FILE) ---

app.get('/api/backup-db', async (req, res) => {
    try {
        // FORÇA O CHECKPOINT DO WAL PARA GARANTIR QUE TODOS OS DADOS ESTEJAM NO .DB
        if (db) {
            console.log("Realizando checkpoint WAL antes do backup...");
            await db.run("PRAGMA wal_checkpoint(TRUNCATE);");
        }
        
        if (fs.existsSync(DB_PATH)) {
            res.download(DB_PATH, 'sisfila_backup.db');
        } else {
            res.status(404).send("Banco de dados não encontrado.");
        }
    } catch (e) {
        console.error("Erro ao gerar backup:", e);
        res.status(500).send("Erro interno ao gerar backup.");
    }
});

app.post('/api/reset', async (req, res) => {
    try {
        await db.run("DELETE FROM tickets");
        io.emit('sync-update', { type: 'RESET' });
        res.json({ success: true });
    } catch(e) { res.status(500).json({success:false}); }
});

// --- SOCKET.IO ---

io.on('connection', async (socket) => {
    if(!db) return;

    // Initial Data Fetch
    const tickets = await db.all("SELECT * FROM tickets ORDER BY createdAt ASC");
    const services = await db.all("SELECT * FROM services WHERE active = 1");
    const users = await db.all("SELECT * FROM users WHERE active = 1");
    
    socket.emit('initial-data', { 
        tickets, 
        services: services.map(s => ({...s, active: !!s.active})), 
        users: users.map(u => ({...u, active: !!u.active})) 
    });

    socket.on('update-tickets', async (data) => {
        const items = Array.isArray(data) ? data : [data];
        runQueued(async () => {
            let transactionStarted = false;
            try {
                await db.run("BEGIN IMMEDIATE");
                transactionStarted = true;
                
                const now = Date.now();
                for (const t of items) {
                    // Se a senha está sendo CHAMADA, garantimos o timestamp do SERVIDOR
                    // Isso evita que máquinas com relógios atrasados/adiantados quebrem a ordem na TV
                    if (t.status === 'CALLED') {
                        const row = await db.get("SELECT MAX(tvPriority) as maxP FROM tickets");
                        t.tvPriority = (row.maxP || 0) + 1;
                        t.calledAt = now;
                    }

                    await db.run(`
                        INSERT INTO tickets (id, displayId, serviceId, serviceName, priority, status, createdAt, calledAt, startedAt, finishedAt, attendantName, deskNumber, tvPriority) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        ON CONFLICT(id) DO UPDATE SET
                        status=?, calledAt=?, startedAt=?, finishedAt=?, attendantName=?, deskNumber=?, tvPriority=?
                    `, [
                        t.id, t.displayId, t.serviceId, t.serviceName, t.priority, t.status, t.createdAt, t.calledAt, t.startedAt, t.finishedAt, t.attendantName, t.deskNumber, t.tvPriority || 0,
                        t.status, t.calledAt, t.startedAt, t.finishedAt, t.attendantName, t.deskNumber, t.tvPriority || 0
                    ]);
                }
                await db.run("COMMIT");
                // Usamos io.emit para que o REMETENTE também receba o timestamp oficial do servidor
                io.emit('sync-update', { type: 'TICKETS', data: data });
            } catch(e) {
                console.error("Erro update-tickets", e);
                if (transactionStarted) {
                    try { await db.run("ROLLBACK"); } catch(re) {}
                }
            }
        });
    });

    socket.on('update-services', async (data) => {
        const items = Array.isArray(data) ? data : [data];
        runQueued(async () => {
            let transactionStarted = false;
            try {
                await db.run("BEGIN IMMEDIATE");
                transactionStarted = true;
                for (const s of items) {
                    await db.run("INSERT INTO services (id, name, active) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET name=?, active=?", 
                        [s.id, s.name, 1, s.name, 1]);
                }
                await db.run("COMMIT");
                socket.broadcast.emit('sync-update', { type: 'SERVICES', data: data });
            } catch(e) { 
                if (transactionStarted) {
                    try { await db.run("ROLLBACK"); } catch(re) {}
                }
            }
        });
    });

    socket.on('delete-service', async (id) => {
        runQueued(async () => {
            await db.run("DELETE FROM services WHERE id = ?", [id]);
            socket.broadcast.emit('sync-delete-service', id);
        });
    });

    socket.on('update-users', async (data) => {
        const items = Array.isArray(data) ? data : [data];
        runQueued(async () => {
            let transactionStarted = false;
            try {
                await db.run("BEGIN IMMEDIATE");
                transactionStarted = true;
                for (const u of items) {
                    await db.run(`
                        INSERT INTO users (id, name, username, password, deskNumber, serviceId, role, active) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, 1)
                        ON CONFLICT(id) DO UPDATE SET 
                        name=?, username=?, password=?, deskNumber=?, serviceId=?, role=?, active=1
                    `, [
                        u.id, u.name, u.username, u.password, u.deskNumber, u.serviceId, u.role,
                        u.name, u.username, u.password, u.deskNumber, u.serviceId, u.role
                    ]);
                }
                await db.run("COMMIT");
                socket.broadcast.emit('sync-update', { type: 'USERS', data: data });
            } catch (e) { 
                if (transactionStarted) {
                    try { await db.run("ROLLBACK"); } catch(re) {}
                }
            }
        });
    });

    socket.on('delete-user', async (id) => {
        runQueued(async () => {
            await db.run("DELETE FROM users WHERE id = ?", [id]);
            socket.broadcast.emit('sync-delete-user', id);
        });
    });
});

app.get('*', (req, res) => {
  if (!req.path.startsWith('/api') && !req.path.startsWith('/socket.io')) {
    const indexPath = path.join(__dirname, 'dist', 'index.html');
    if (fs.existsSync(indexPath)) res.sendFile(indexPath);
    else res.status(404).send(`<h1>App não compilado. Execute 'npm run build'</h1>`);
  }
});

function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address;
    }
  }
  return 'localhost';
}

server.listen(PORT, '0.0.0.0', () => {
  const ip = getLocalIp();
  console.log(`\n=== SISFILA 2.5 (SQLite Async) ONLINE ===`);
  console.log(`Local: http://localhost:${PORT}`);
  console.log(`Rede:  http://${ip}:${PORT}`);
  console.log(`Data:  ${DB_PATH}`);
  console.log(`-----------------------------------`);
});
