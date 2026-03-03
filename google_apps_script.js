/**
 * ===============================================================
 *  AUTOMATIZAÇÃO SISFILA: MERCADO PAGO -> GOOGLE SHEETS -> EMAIL
 * ===============================================================
 * 
 * ESTRUTURA DAS COLUNAS (Ordem Exata):
 * 1. Data (Solicitação)
 * 2. Nome
 * 3. Email
 * 4. Chave (Licença)
 * 5. Valor
 * 6. Tipo (Mensal/Anual)
 * 7. DataValidade
 * 8. StatusEnvio
 */

// --- CONFIGURAÇÕES --- //
const CONFIG = {
  // Seu Token de Produção
  MP_ACCESS_TOKEN: "APP_USR-3349268349803349-120223-7acea410fbf97a6c095c08737330c4eb-5138523",
  
  // ---> COLOQUE O ID DA SUA PLANILHA AQUI <---
  SHEET_ID: "COLE_O_ID_DA_PLANILHA_AQUI",
  
  SHEET_NAME: "Página1" 
};

function doPost(e) {
  try {
    const json = JSON.parse(e.postData.contents);
    
    // Filtra notificações de pagamento do Mercado Pago
    if (json.type === "payment" || json.topic === "payment" || (json.action === "payment.created") || (json.action === "payment.updated")) {
      const paymentId = json.data ? json.data.id : json.id;
      if(paymentId) {
        processarPagamento(paymentId);
      }
    }
    
    return ContentService.createTextOutput("OK").setMimeType(ContentService.MimeType.TEXT);
  } catch (error) {
    return ContentService.createTextOutput("ERRO: " + error.message).setMimeType(ContentService.MimeType.TEXT);
  }
}

function processarPagamento(paymentId) {
  // 1. Consultar Mercado Pago
  const url = `https://api.mercadopago.com/v1/payments/${paymentId}`;
  const response = UrlFetchApp.fetch(url, {
    headers: { "Authorization": `Bearer ${CONFIG.MP_ACCESS_TOKEN}` }
  });
  
  const payment = JSON.parse(response.getContentText());
  
  // Só processa se APROVADO
  if (payment.status === "approved") {
    
    // Extração de Dados
    // Tenta pegar o email/nome de várias fontes possíveis no JSON do MP
    const email = payment.payer.email || (payment.additional_info?.payer?.email) || "";
    const nome = (payment.additional_info?.payer?.first_name) || (payment.payer.first_name) || "Cliente SisFila";
    const valor = parseFloat(payment.transaction_amount);
    
    // Lógica de Plano e Validade
    // Regra: Se valor >= 600 é Anual, senão é Mensal
    let diasValidade = 30;
    let tipoPlano = "Mensal";
    
    if (valor >= 600) {
      diasValidade = 365;
      tipoPlano = "Anual";
    }
    
    // Calcula Datas
    const dataSolicitacao = new Date();
    const dataValidade = new Date();
    dataValidade.setDate(dataValidade.getDate() + diasValidade);
    
    // Formata Data Validade para String (dd/MM/yyyy)
    const dataValidadeStr = Utilities.formatDate(dataValidade, "GMT-3", "dd/MM/yyyy");

    // 2. Gerar Chave
    const chave = gerarChaveSisFila(nome, email, diasValidade);
    
    // 3. Salvar na Planilha (Na ordem solicitada)
    salvarNaPlanilha(dataSolicitacao, nome, email, chave, valor, tipoPlano, dataValidadeStr);
    
    // 4. Enviar E-mail
    if (email && email.includes("@")) {
      enviarEmail(nome, email, chave, tipoPlano, dataValidadeStr);
    }
  }
}

function salvarNaPlanilha(data, nome, email, chave, valor, tipo, dataValidade) {
  const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  
  // Cria cabeçalho se vazio
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["Data", "Nome", "Email", "Chave", "Valor", "Tipo", "DataValidade", "StatusEnvio"]);
  }

  // Adiciona a linha na ordem exata solicitada
  sheet.appendRow([
    new Date(),   // 1. Data
    nome,         // 2. Nome
    email,        // 3. Email
    chave,        // 4. Chave
    valor,        // 5. Valor
    tipo,         // 6. Tipo
    dataValidade, // 7. DataValidade
    "ENVIADO"     // 8. StatusEnvio
  ]);
}

function gerarChaveSisFila(nome, email, dias) {
  const SECRET_KEY = "SISFILA_SECURE_SIGNATURE_V1"; 
  
  const expiryDate = new Date().getTime() + (dias * 24 * 60 * 60 * 1000);
  const expiryHex = expiryDate.toString(36).toUpperCase();
  
  const safeName = nome ? nome.trim().toLowerCase() : "cliente";
  const safeEmail = email ? email.trim().toLowerCase() : "";

  const payload = `${safeName}|${safeEmail}|${expiryHex}`;
  
  const signature = Utilities.computeHmacSha256Signature(payload, SECRET_KEY);
  const signatureHex = signature.reduce((str, byte) => {
      return str + (byte < 0 ? byte + 256 : byte).toString(16).padStart(2, '0');
  }, '');
  
  const shortSignature = signatureHex.substring(0, 12).toUpperCase();
  
  return `SIS-${expiryHex}-${shortSignature}`;
}

function enviarEmail(nome, email, chave, plano, validade) {
  const assunto = `Sua Licença SisFila (${plano}) - Ativação Imediata`;
  
  const corpo = `
    Olá, ${nome}!
    
    Seu pagamento foi confirmado. Segue sua licença de uso do SisFila.
    
    ------------------------------------------------
    DADOS DA LICENÇA
    ------------------------------------------------
    Plano: ${plano}
    Validade até: ${validade}
    
    SUA CHAVE DE ATIVAÇÃO:
    ${chave}
    
    ------------------------------------------------
    COMO ATIVAR:
    1. Abra o SisFila no servidor.
    2. Vá em Configurações > Aba Licença.
    3. Cole a chave acima e clique em "Ativar".
    
    Obrigado por escolher o SisFila!
  `;
  
  try {
    MailApp.sendEmail(email, assunto, corpo);
  } catch (e) {
    console.log("Erro ao enviar email: " + e.message);
  }
}
