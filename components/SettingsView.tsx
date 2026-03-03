
import React, { useState, useEffect } from 'react';
import { Service, User, UserRole } from '../types';
import { Trash2, Edit2, Plus, Save, X, User as UserIcon, Settings, Key, Monitor, Briefcase, AlertTriangle, Globe, Wifi, Shield, Lock, CheckCircle, Download, FileCode, Mail, FileText, CreditCard, Star, ExternalLink, Copy, Phone, Image as ImageIcon, Database, UploadCloud, MapPin, RefreshCw, Printer, LayoutTemplate, Server, Cpu, Info, MessageCircle, Code2, Rocket, Layers, Zap, Calendar, Clock, Archive, FileJson, AlertOctagon, Smartphone, HardDrive, BrainCircuit } from 'lucide-react';

interface SettingsViewProps {
  services: Service[];
  users: User[];
  currentServerUrl?: string;
  onUpdateServerUrl?: (url: string) => void;
  onAddService: (name: string) => void;
  onUpdateService: (id: string, name: string) => void;
  onDeleteService: (id: string) => void;
  onAddUser: (user: Omit<User, 'id' | 'active'>) => void;
  onUpdateUser: (id: string, user: Partial<User>) => void;
  onDeleteUser: (id: string) => void;
  onResetSystem?: () => void;
  onRefreshSystemInfo?: () => void;
  onNavigateHome?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ 
  services, users,
  currentServerUrl, onUpdateServerUrl,
  onAddService, onUpdateService, onDeleteService, 
  onAddUser, onUpdateUser, onDeleteUser,
  onResetSystem, onRefreshSystemInfo, onNavigateHome
}) => {
  const [activeTab, setActiveTab] = useState<'services' | 'users' | 'register' | 'network' | 'system' | 'about'>('services');

  // Network Tab State
  const [tempUrl, setTempUrl] = useState(currentServerUrl || '');

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto p-4 md:p-6 text-slate-900 dark:text-white">
        <div className="mb-4 flex justify-between items-center">
          <div>
            <h1 className="text-lg font-bold">Configurações</h1>
            <p className="text-slate-500 dark:text-slate-400 text-xs">Gerenciamento do sistema.</p>
          </div>
          <button onClick={onNavigateHome} className="text-xs bg-slate-200 dark:bg-slate-700 px-3 py-1.5 rounded hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">Voltar</button>
        </div>

        <div className="flex gap-2 mb-4 border-b border-slate-200 dark:border-slate-700 overflow-x-auto no-scrollbar">
          {[
            { id: 'services', label: 'Serviços' },
            { id: 'users', label: 'Usuários' },
            { id: 'register', label: 'Empresa' },
            { id: 'network', label: 'Rede' },
            { id: 'system', label: 'Sistema' },
            { id: 'about', label: 'Sobre' }
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)} 
              className={`pb-2 px-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${activeTab === tab.id ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 min-h-[400px]">
            {activeTab === 'services' && (
            <ServicesTab 
                services={services} 
                onAdd={onAddService} 
                onEdit={onUpdateService} 
                onDelete={onDeleteService} 
            />
            )}
            
            {activeTab === 'users' && (
            <UsersTab 
                users={users} 
                services={services}
                onAdd={onAddUser} 
                onUpdate={onUpdateUser}
                onDelete={onDeleteUser} 
            />
            )}

            {activeTab === 'register' && (
            <RegisterTab onRefresh={onRefreshSystemInfo} onNavigateHome={onNavigateHome} />
            )}

            {activeTab === 'network' && (
            <div className="p-6">
                <h3 className="text-base font-bold text-slate-800 dark:text-white mb-2 flex items-center gap-2">
                <Globe size={18} className="text-indigo-600 dark:text-indigo-400" /> Configuração de Rede
                </h3>
                <p className="text-slate-600 dark:text-slate-300 mb-4 text-xs">
                Endereço do backend para conexão de terminais (Totem/TV).
                </p>

                <div className="max-w-md">
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide">URL do Servidor</label>
                    <div className="flex gap-2">
                    <div className="flex-1 flex items-center gap-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded px-3 py-2 focus-within:border-indigo-500">
                        <Wifi size={16} className="text-slate-400" />
                        <input 
                        value={tempUrl}
                        onChange={(e) => setTempUrl(e.target.value)}
                        placeholder="http://192.168.0.100:3000"
                        className="bg-transparent w-full outline-none text-slate-900 dark:text-white text-sm"
                        />
                    </div>
                    <button 
                        onClick={() => onUpdateServerUrl && onUpdateServerUrl(tempUrl)}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2 rounded text-xs transition-colors"
                    >
                        Salvar
                    </button>
                    </div>
                </div>
            </div>
            )}

            {activeTab === 'system' && (
            <SystemTab onResetSystem={onResetSystem} />
            )}

            {activeTab === 'about' && (
            <AboutTab />
            )}
        </div>
      </div>
    </div>
  );
};

// --- About Tab ---
const AboutTab = () => {
  return (
    <div className="p-6 space-y-8">
      
      {/* Developer Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl shadow-xl p-8 text-white relative overflow-hidden border border-indigo-500/30">
         <div className="absolute top-0 right-0 p-8 opacity-10">
            <Code2 size={120} />
         </div>
         
         <div className="relative z-10">
             <div className="flex items-center gap-3 mb-2">
                <Rocket className="text-indigo-400" size={24} />
                <h2 className="text-3xl font-black tracking-tight">MATEC Tecnologia</h2>
             </div>
             <p className="text-indigo-200 text-lg mb-6">Desenvolvimento de Sistemas Inteligentes</p>
             
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
                 <a href="https://wa.me/5568999835658" target="_blank" rel="noreferrer" className="bg-emerald-600/90 hover:bg-emerald-500 p-3 rounded-xl flex items-center gap-3 transition-all hover:scale-105 border border-emerald-400/30 group">
                    <div className="bg-white/20 p-2 rounded-full group-hover:bg-white/30 transition-colors">
                        <MessageCircle size={20} className="text-white" />
                    </div>
                    <div>
                        <span className="block text-[10px] text-emerald-100 font-bold uppercase">WhatsApp / Telefone</span>
                        <span className="block font-bold text-sm">(68) 9 9983-5658</span>
                    </div>
                 </a>
                 
                 <a href="mailto:marlo360@hotmail.com" className="bg-blue-600/90 hover:bg-blue-500 p-3 rounded-xl flex items-center gap-3 transition-all hover:scale-105 border border-blue-400/30 group">
                    <div className="bg-white/20 p-2 rounded-full group-hover:bg-white/30 transition-colors">
                        <Mail size={20} className="text-white" />
                    </div>
                    <div>
                        <span className="block text-[10px] text-blue-100 font-bold uppercase">E-mail</span>
                        <span className="block font-bold text-sm">marlo360@hotmail.com</span>
                    </div>
                 </a>
             </div>
         </div>
      </div>

      {/* Sobre o Sistema */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <Info size={20} className="text-indigo-600" /> Sobre o SisFila
              </h3>
              <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed text-justify">
                  O SisFila é um sistema completo de gestão de atendimento. Desenvolvido para organizar o fluxo de clientes, 
                  ele oferece emissão de senhas via Totem, chamadas visuais e sonoras (TV), e painel de controle para atendentes.
                  Utiliza tecnologias modernas para garantir rapidez, segurança e operação offline.
              </p>
          </div>

          <div className="space-y-4">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <Cpu size={20} className="text-indigo-600" /> Tecnologias Utilizadas
              </h3>
              <ul className="space-y-3">
                  <TechItem icon={<Code2 size={16}/>} title="Frontend (Interface)" desc="React 19, Vite, TailwindCSS - Rápido e Responsivo." />
                  <TechItem icon={<Server size={16}/>} title="Backend (Servidor)" desc="Node.js & Express - Alta performance e baixo consumo." />
                  <TechItem icon={<Database size={16}/>} title="Armazenamento" desc="SQLite3 - Banco de dados seguro, local e portátil." />
                  <TechItem icon={<RefreshCw size={16}/>} title="Tempo Real" desc="Socket.io - Comunicação instantânea entre Totem e TVs." />
                  <TechItem icon={<BrainCircuit size={16}/>} title="Inteligência Artificial" desc="Google Gemini 2.5 - Análise avançada de relatórios." />
              </ul>
          </div>
      </div>

      <div className="text-center pt-8 border-t border-slate-200 dark:border-slate-700">
         <p className="text-xs text-slate-400">Desenvolvido por Marlo (MATEC) • Versão 2.4 • Build 2024</p>
      </div>
    </div>
  );
};

const TechItem = ({ icon, title, desc }: any) => (
    <li className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
        <div className="bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 p-2 rounded-full">
            {icon}
        </div>
        <div>
            <span className="block text-sm font-bold text-slate-800 dark:text-white">{title}</span>
            <span className="block text-xs text-slate-500 dark:text-slate-400">{desc}</span>
        </div>
    </li>
);

// --- Components ---

const LayoutTab = () => {
  const [template, setTemplate] = useState('');
  const [msg, setMsg] = useState('');
  const DEFAULT_TEMPLATE = `<html><head><style>@page { margin: 0; } body { margin: 0; padding: 5px; font-family: 'Arial', sans-serif; text-align: center; color: black; } h2, .label, .password, .info, .meta, .extra1 { text-align: center; } .logo { max-width: 80%; max-height: 60px; margin-bottom: 5px; } h2 { font-size: 14px; margin: 2px 0; text-transform: uppercase; } .divider { border-top: 1px dashed black; margin: 5px 0; width: 100%; } .label { font-size: 12px; font-weight: bold; margin-top: 5px; } .password { font-size: {{FONT_SIZE_PX}}px; font-weight: 900; margin: 5px 0; line-height: 1; } .info { font-size: 30px; font-weight: bold; margin: 2px 0; } .meta { font-size: 20px; margin-top: 10px; margin-bottom: 80px; } .extra1 { font-size: 10px; margin-top: 10px; }</style></head><body>{{LOGO}}<h2>{{EMPRESA}}</h2><div class="divider"></div><div class="label">SENHA</div><div class="password">{{SENHA}}</div><div class="extra1">Serviço solicitado</div><div class="info">{{SERVICO}}</div><div class="extra1">Tipo de atendimento</div><div class="info">{{PRIORIDADE}}</div><div class="divider"></div><div class="meta">{{DATA}} - {{HORA}}</div><div class="divider"></div><br/><br/></body></html>`;

  useEffect(() => {
    fetch('/api/printer-config')
      .then(async res => {
         const text = await res.text();
         try { return JSON.parse(text); } catch { return {}; }
      })
      .then(data => setTemplate(data.ticketTemplate || DEFAULT_TEMPLATE));
  }, []);

  const handleSave = async () => {
    try {
       const currentRes = await fetch('/api/printer-config');
       const currentConfig = await currentRes.json();
       await fetch('/api/printer-config', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ ...currentConfig, ticketTemplate: template })
       });
       setMsg('Salvo!');
       setTimeout(() => setMsg(''), 2000);
    } catch(e) { setMsg('Erro'); }
  };

  return (
    <div className="p-2">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[400px]">
         <div className="flex flex-col h-full">
            <label className="text-xs font-bold text-slate-500 mb-1">HTML do Ticket</label>
            <textarea 
              value={template}
              onChange={e => setTemplate(e.target.value)}
              className="flex-1 w-full bg-slate-900 text-emerald-400 font-mono text-[10px] p-3 rounded border border-slate-700 outline-none resize-none"
              spellCheck={false}
            />
            <div className="flex gap-2 mt-2">
               <button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-1.5 px-4 rounded text-xs flex items-center gap-2"><Save size={14}/> Salvar</button>
               {msg && <span className="text-emerald-500 text-xs font-bold py-1.5">{msg}</span>}
            </div>
         </div>
         <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded border border-slate-200 dark:border-slate-700 overflow-y-auto">
            <h4 className="font-bold mb-2 text-xs uppercase text-slate-500">Variáveis</h4>
            <ul className="space-y-1 text-[10px] font-mono text-slate-700 dark:text-slate-300">
               {['{{LOGO}}', '{{EMPRESA}}', '{{SENHA}}', '{{SERVICO}}', '{{PRIORIDADE}}', '{{DATA}}', '{{HORA}}'].map(v => (
                   <li key={v} className="bg-white dark:bg-slate-800 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 select-all">{v}</li>
               ))}
            </ul>
         </div>
      </div>
    </div>
  );
};

const PrinterTab = () => {
  const [printerName, setPrinterName] = useState('');
  const [availablePrinters, setAvailablePrinters] = useState<string[]>([]);
  const [paperWidth, setPaperWidth] = useState('80');
  const [autoPrint, setAutoPrint] = useState(true);
  const [fontSize, setFontSize] = useState('2');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    fetch('/api/printer-config').then(r=>r.json()).then(data => {
        if(data.printerName) setPrinterName(data.printerName);
        if(data.paperWidth) setPaperWidth(data.paperWidth.replace('mm', ''));
        if(data.fontSize) setFontSize(data.fontSize);
        setAutoPrint(!!data.autoPrint);
    }).catch(()=>{});

    fetch('/api/printers').then(r=>r.json()).then(data => {
         if (Array.isArray(data)) setAvailablePrinters(data);
    }).catch(()=>{});
  }, []);

  const handleSave = async () => {
    try {
       const currentRes = await fetch('/api/printer-config');
       const currentConfig = await currentRes.json();
       await fetch('/api/printer-config', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ ...currentConfig, printerName, paperWidth, autoPrint, fontSize })
       });
       setMsg('Salvo!');
       setTimeout(() => setMsg(''), 2000);
    } catch(e) { setMsg('Erro'); }
  };

  return (
    <div className="max-w-md">
       <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase">Impressora</label>
            <select value={printerName} onChange={e => setPrinterName(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded px-3 py-2 outline-none text-slate-900 dark:text-white text-sm">
              <option value="">Selecione...</option>
              {availablePrinters.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
               <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase">Largura (mm)</label>
               <input type="number" value={paperWidth} onChange={e => setPaperWidth(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded px-3 py-2 outline-none text-slate-900 dark:text-white text-sm" placeholder="80" />
            </div>
            <div>
               <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase">Fonte (1-8)</label>
               <input type="number" min="1" max="8" value={fontSize} onChange={e => setFontSize(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded px-3 py-2 outline-none text-slate-900 dark:text-white text-sm" placeholder="2" />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer text-sm">
             <input type="checkbox" checked={autoPrint} onChange={e => setAutoPrint(e.target.checked)} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
             <span className="text-slate-700 dark:text-slate-300">Imprimir automaticamente</span>
          </label>

          <div className="flex items-center gap-3">
            <button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-6 rounded text-sm transition-colors">Salvar</button>
            {msg && <span className="text-emerald-500 text-xs font-bold">{msg}</span>}
          </div>
       </div>
    </div>
  );
};

const RegisterTab = ({ onRefresh, onNavigateHome }: { onRefresh?: () => void, onNavigateHome?: () => void }) => {
  const [client, setClient] = useState('');
  const [email, setEmail] = useState('');
  const [document, setDocument] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [logo, setLogo] = useState(''); 
  const [saveMessage, setSaveMessage] = useState('');
  
  React.useEffect(() => {
    fetch('/api/license').then(r=>r.json()).then(data => {
        if(data.clientName) setClient(data.clientName);
        if(data.clientEmail) setEmail(data.clientEmail);
        if(data.clientDocument) setDocument(data.clientDocument);
        if(data.clientPhone) setPhone(data.clientPhone);
        if(data.clientAddress) setAddress(data.clientAddress);
        if(data.clientCity) setCity(data.clientCity);
        if(data.clientLogo) setLogo(data.clientLogo);
    }).catch(()=>{});
  }, []);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) return alert("Máximo 2MB");
      const reader = new FileReader();
      reader.onloadend = () => setLogo(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSaveClientInfo = async () => {
    try {
      const res = await fetch('/api/client-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientName: client, clientEmail: email, clientDocument: document, clientPhone: phone, clientAddress: address, clientCity: city, clientLogo: logo })
      });
      if ((await res.json()).success) {
        setSaveMessage('Salvo!');
        if(onRefresh) onRefresh(); 
        setTimeout(() => setSaveMessage(''), 2000);
      }
    } catch (e) { setSaveMessage('Erro.'); }
  };

  const handleRefresh = async () => {
    try {
      const r = await fetch('/api/license');
      const data = await r.json();
      if(data.clientName) setClient(data.clientName);
      if(data.clientEmail) setEmail(data.clientEmail);
      if(data.clientDocument) setDocument(data.clientDocument);
      if(data.clientPhone) setPhone(data.clientPhone);
      if(data.clientAddress) setAddress(data.clientAddress);
      if(data.clientCity) setCity(data.clientCity);
      if(data.clientLogo) setLogo(data.clientLogo);
      if(onRefresh) onRefresh();
      setSaveMessage('Atualizado!');
      setTimeout(() => setSaveMessage(''), 2000);
    } catch(e) {}
  };

  return (
    <div className="p-6">
        <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Briefcase size={18} className="text-indigo-600" /> Dados da Empresa
            </h3>
            <button 
                onClick={handleRefresh}
                className="text-[10px] flex items-center gap-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 px-2 py-1 rounded transition-colors font-bold text-slate-600 dark:text-slate-300"
            >
                <RefreshCw size={12} /> Atualizar
            </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="col-span-1">
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase">Logo</label>
              <div className="border border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-2 flex flex-col items-center justify-center text-center h-40 relative bg-slate-50 dark:bg-slate-900/50">
                 {logo ? (
                   <>
                     <img src={logo} alt="Preview" className="max-h-32 max-w-full object-contain" />
                     <button onClick={() => setLogo('')} className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full"><X size={12} /></button>
                   </>
                 ) : (
                   <div className="text-slate-400">
                     <ImageIcon size={32} className="mx-auto mb-1" />
                     <p className="text-xs">Enviar Logo</p>
                   </div>
                 )}
                 <input type="file" accept="image/*" onChange={handleLogoUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
              </div>
            </div>
            <div className="col-span-2 space-y-3">
               <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Empresa</label>
                    <input value={client} onChange={e => setClient(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded px-3 py-2 text-sm outline-none dark:text-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">CNPJ/CPF</label>
                    <input value={document} onChange={e => setDocument(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded px-3 py-2 text-sm outline-none dark:text-white" />
                  </div>
               </div>
               <div className="grid grid-cols-2 gap-3">
                 <div>
                   <label className="block text-xs font-bold text-slate-500 mb-1">E-mail</label>
                   <input value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded px-3 py-2 text-sm outline-none dark:text-white" type="email" />
                 </div>
                 <div>
                   <label className="block text-xs font-bold text-slate-500 mb-1">Telefone</label>
                   <input value={phone} onChange={e => setPhone(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded px-3 py-2 text-sm outline-none dark:text-white" />
                 </div>
               </div>
               <div className="grid grid-cols-2 gap-3">
                 <div>
                   <label className="block text-xs font-bold text-slate-500 mb-1">Cidade</label>
                   <input value={city} onChange={e => setCity(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded px-3 py-2 text-sm outline-none dark:text-white" />
                 </div>
                 <div>
                   <label className="block text-xs font-bold text-slate-500 mb-1">Endereço</label>
                   <input value={address} onChange={e => setAddress(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded px-3 py-2 text-sm outline-none dark:text-white" />
                 </div>
               </div>
               <div className="pt-2 flex items-center gap-3">
                  <button onClick={handleSaveClientInfo} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-6 rounded text-sm shadow flex items-center gap-2"><Save size={16} /> Salvar</button>
                  {saveMessage && <p className="text-xs text-emerald-600 font-bold">{saveMessage}</p>}
               </div>
            </div>
        </div>
    </div>
  );
};

const LicenseTab = () => {
  const [key, setKey] = useState('');
  const [status, setStatus] = useState<any>(null);
  const [message, setMessage] = useState('');
  
  React.useEffect(() => {
    fetch('/api/license').then(r=>r.json()).then(setStatus).catch(()=>{});
  }, []);

  const handleRefresh = async () => {
    try {
      const r = await fetch('/api/license');
      const data = await r.json();
      setStatus(data);
      setMessage('Informações atualizadas!');
      setTimeout(() => setMessage(''), 2000);
    } catch(e) {}
  };

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/license', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key }) });
      const data = await res.json();
      if (data.success) {
        setMessage(data.message || 'Sistema ativado!');
        fetch('/api/license').then(r=>r.json()).then(setStatus);
        setKey('');
      } else { setMessage('Erro: ' + data.message); }
    } catch (error) { setMessage('Erro de conexão.'); }
  };

  const isLicenseActive = status?.hasLicense;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2"><Lock size={20} /> Licenciamento</h3>
        <button 
            onClick={handleRefresh}
            className="text-[10px] flex items-center gap-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 px-2 py-1 rounded transition-colors font-bold text-slate-600 dark:text-slate-300"
        >
            <RefreshCw size={12} /> Atualizar
        </button>
      </div>
      
      {status && (
          <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
             <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-bold">Status Atual</p>
                  <p className={`text-base font-bold ${isLicenseActive ? 'text-emerald-600' : 'text-yellow-600'}`}>{isLicenseActive ? 'Ativado' : 'Trial (Teste)'}</p>
                </div>
                
                {isLicenseActive && status.licenseExpiryDate && (
                  <>
                    <div>
                       <p className="text-[10px] text-slate-500 uppercase font-bold flex items-center gap-1">Vencimento</p>
                       <p className="text-base font-bold text-slate-700 dark:text-slate-200">
                         {new Date(status.licenseExpiryDate).toLocaleDateString('pt-BR')}
                       </p>
                    </div>
                  </>
                )}
                
                <div className="col-span-2 border-t border-slate-200 dark:border-slate-700 pt-2">
                    <p className="text-[10px] text-slate-500 uppercase font-bold">Dias Restantes</p>
                    <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                        {status.trialDaysLeft} dias
                    </p>
                </div>
             </div>
          </div>
      )}

      <div>
        <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
            {isLicenseActive ? 'Renovar / Estender Licença' : 'Ativar Sistema'}
        </h4>
        <p className="text-xs text-slate-500 mb-3">
            {isLicenseActive ? 'Deseja adicionar mais tempo ao seu plano? Insira a nova chave abaixo.' : 'Sistema bloqueado ou em teste. Insira sua chave para desbloquear.'}
        </p>
        
        <form onSubmit={handleActivate} className="flex gap-2">
           <input required value={key} onChange={e => setKey(e.target.value)} placeholder="SIS-XXXX-XXXX..." className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded px-3 py-2 text-sm outline-none dark:text-white font-mono uppercase" />
           <button type="submit" className={`text-white font-bold py-2 px-6 rounded text-sm shadow ${isLicenseActive ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-emerald-600 hover:bg-emerald-500'}`}>
              {isLicenseActive ? 'Adicionar Dias' : 'Inserir Licença'}
           </button>
        </form>
        {message && <p className="mt-2 text-xs font-bold text-emerald-500">{message}</p>}
      </div>
    </div>
  );
};

const SystemTab = ({ onResetSystem }: { onResetSystem?: () => void }) => {
  const [subTab, setSubTab] = useState<'general' | 'printer' | 'layout' | 'license'>('general');
  const [restoreMessage, setRestoreMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Restore DB File directly
  const handleRestoreBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && confirm("ATENÇÃO: Você está prestes a substituir o banco de dados inteiro.\nTodos os dados atuais serão perdidos.\nO sistema será reiniciado.\n\nDeseja continuar?")) {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('file', file); // Embora backend use pipe raw, isso é útil se mudar
      
      try {
        // Envia como binary stream ou FormData (o servidor foi atualizado para raw stream se Content-Type for octet-stream, ou form-data)
        // Vamos usar raw stream com header customizado para simplificar no backend sem multer
        const res = await fetch('/api/restore-db', { 
            method: 'POST', 
            headers: {
                'Content-Type': 'application/octet-stream' 
            },
            body: file 
        });
        
        if ((await res.json()).success) { 
             setRestoreMessage('Sucesso! Reiniciando...'); 
             setTimeout(() => window.location.reload(), 2000); 
        } else { 
             setRestoreMessage('Erro no upload.'); 
        }
      } catch (err) { 
          setRestoreMessage('Erro de conexão.'); 
      } finally {
          setIsUploading(false);
      }
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-[450px]">
        {/* Sidebar */}
        <div className="md:w-40 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-700 p-2 flex flex-row md:flex-col gap-1 overflow-x-auto">
           {[
               {id:'general', icon:Cpu, l:'Geral'},
               {id:'printer', icon:Printer, l:'Impressão'},
               {id:'layout', icon:LayoutTemplate, l:'Layout'},
               {id:'license', icon:Key, l:'Licença'}
           ].map(t => (
               <button 
                 key={t.id}
                 onClick={() => setSubTab(t.id as any)}
                 className={`px-3 py-2 text-left rounded-md text-xs font-bold flex items-center gap-2 ${subTab === t.id ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
               >
                 <t.icon size={14} /> {t.l}
               </button>
           ))}
        </div>

        {/* Content */}
        <div className="flex-1 p-4 overflow-y-auto">
          {subTab === 'general' && (
            <div className="space-y-6 max-w-sm">
              
              <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2"><Database size={16} className="text-indigo-500"/> Banco de Dados (SQLite)</h3>
                  
                  <div className="grid grid-cols-1 gap-4">
                     {/* BACKUP CARD */}
                     <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 shadow-sm relative overflow-hidden group">
                         <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                             <Archive size={40} className="text-blue-600 dark:text-blue-400" />
                         </div>
                         <h4 className="text-blue-800 dark:text-blue-300 font-bold text-sm mb-1">Backup Completo (.db)</h4>
                         <p className="text-blue-600 dark:text-blue-400 text-xs mb-3 leading-relaxed">
                             Baixa o arquivo físico do banco de dados (sisfila.db). Contém todos os dados e configurações.
                         </p>
                         <button onClick={() => window.location.href = '/api/backup-db'} className="bg-blue-600 hover:bg-blue-500 text-white py-1.5 px-4 rounded text-xs font-bold flex items-center gap-2 transition-colors">
                             <Download size={14} /> Baixar Banco de Dados
                         </button>
                     </div>

                     {/* RESTORE CARD */}
                     <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 shadow-sm relative overflow-hidden group">
                         <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                             <RefreshCw size={40} className="text-amber-600 dark:text-amber-400" />
                         </div>
                         <h4 className="text-amber-800 dark:text-amber-300 font-bold text-sm mb-1">Restaurar Banco (.db)</h4>
                         <p className="text-amber-600 dark:text-amber-400 text-xs mb-3 leading-relaxed">
                             Envia um arquivo .db para substituir o atual. <br/><span className="font-bold">Cuidado:</span> Isso apagará os dados atuais.
                         </p>
                         <div className="relative inline-block">
                            <button className="bg-amber-600 hover:bg-amber-500 text-white py-1.5 px-4 rounded text-xs font-bold flex items-center gap-2 transition-colors" disabled={isUploading}>
                                <UploadCloud size={14} /> {isUploading ? 'Enviando...' : 'Carregar Arquivo .db'}
                            </button>
                            <input type="file" accept=".db,.sqlite,.sqlite3" onChange={handleRestoreBackup} className="absolute inset-0 opacity-0 cursor-pointer" disabled={isUploading} />
                         </div>
                         {restoreMessage && <p className="text-[10px] mt-2 font-bold text-emerald-600">{restoreMessage}</p>}
                     </div>
                  </div>
              </div>

              <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                <h3 className="text-xs font-bold text-red-600 dark:text-red-400 mb-2 flex items-center gap-1 uppercase"><AlertOctagon size={12}/> Zona de Perigo</h3>
                <button onClick={onResetSystem} className="bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 px-4 py-2 rounded text-xs font-bold w-full transition-colors">
                    Zerar Sistema de Fábrica
                </button>
              </div>

            </div>
          )}
          {subTab === 'printer' && <PrinterTab />}
          {subTab === 'layout' && <LayoutTab />}
          {subTab === 'license' && <LicenseTab />}
        </div>
    </div>
  );
}

const ServicesTab = ({ services, onAdd, onEdit, onDelete }: any) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleSaveNew = () => { if (newName.trim()) { onAdd(newName.trim()); setNewName(''); setIsAdding(false); } };
  const handleSaveEdit = () => { if (editingId && editName.trim()) { onEdit(editingId, editName.trim()); setEditingId(null); } };

  return (
    <div className="p-0">
      <div className="p-4 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center border-b border-slate-200 dark:border-slate-700">
        <h3 className="font-bold text-sm text-slate-700 dark:text-white flex items-center gap-2"><Settings size={16} /> Lista de Serviços</h3>
        <button onClick={() => setIsAdding(true)} className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded text-xs flex items-center gap-1 font-bold"><Plus size={14} /> Adicionar</button>
      </div>
      {isAdding && (
        <div className="p-3 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex gap-2 items-center">
          <input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nome do Serviço" className="flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded px-3 py-1.5 text-sm outline-none dark:text-white" />
          <button onClick={handleSaveNew} className="text-emerald-500 p-1.5 hover:bg-emerald-50 rounded"><Save size={16} /></button>
          <button onClick={() => setIsAdding(false)} className="text-red-500 p-1.5 hover:bg-red-50 rounded"><X size={16} /></button>
        </div>
      )}
      <div className="divide-y divide-slate-200 dark:divide-slate-700">
        {services.map((service: Service) => (
            <div key={service.id} className="p-3 px-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group">
              {editingId === service.id ? (
                <div className="flex-1 flex gap-2 items-center">
                  <input autoFocus value={editName} onChange={(e) => setEditName(e.target.value)} className="flex-1 bg-white dark:bg-slate-900 border border-indigo-500 rounded px-3 py-1.5 text-sm outline-none dark:text-white" />
                  <button onClick={handleSaveEdit} className="text-emerald-500 p-1"><Save size={16} /></button>
                  <button onClick={() => setEditingId(null)} className="text-red-500 p-1"><X size={16} /></button>
                </div>
              ) : (
                <>
                  <span className="font-medium text-sm text-slate-700 dark:text-slate-200">{service.name}</span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setEditingId(service.id); setEditName(service.name); }} className="p-1.5 text-slate-400 hover:text-indigo-600"><Edit2 size={16} /></button>
                    <button onClick={() => onDelete(service.id)} className="p-1.5 text-slate-400 hover:text-red-600"><Trash2 size={16} /></button>
                  </div>
                </>
              )}
            </div>
        ))}
      </div>
    </div>
  );
};

const UsersTab = ({ users, services, onAdd, onUpdate, onDelete }: any) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', username: '', password: '', deskNumber: '', serviceId: '', role: 'attendant' as UserRole });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => { setFormData(prev => ({ ...prev, [e.target.name]: e.target.value })); };
  const handleStartAdd = () => { setFormData({ name: '', username: '', password: '', deskNumber: '', serviceId: '', role: 'attendant' }); setEditingId(null); setIsAdding(true); };
  const handleStartEdit = (user: User) => {
    setFormData({ name: user.name, username: user.username, password: user.password, deskNumber: user.deskNumber, serviceId: Array.isArray(user.serviceId) ? user.serviceId[0] : user.serviceId, role: user.role || 'attendant' });
    setEditingId(user.id); setIsAdding(true);
  };
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...formData, deskNumber: formData.deskNumber || '01' };
    if (editingId) onUpdate(editingId, payload); else onAdd(payload);
    setIsAdding(false);
  };

  return (
    <div className="p-0">
       <div className="p-4 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center border-b border-slate-200 dark:border-slate-700">
        <h3 className="font-bold text-sm text-slate-700 dark:text-white flex items-center gap-2"><UserIcon size={16} /> Usuários</h3>
        <button onClick={handleStartAdd} className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded text-xs flex items-center gap-1 font-bold"><Plus size={14} /> Novo</button>
      </div>

      {/* Modal de Cadastro/Edição */}
      {isAdding && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
              <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                {editingId ? <Edit2 size={16} className="text-indigo-500" /> : <Plus size={16} className="text-indigo-500" />}
                {editingId ? 'Editar Usuário' : 'Novo Usuário'}
              </h4>
              <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-[10px] text-slate-500 uppercase font-bold mb-1 tracking-wider">Nome Completo</label>
                  <input required name="name" value={formData.name} onChange={handleChange} className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 w-full text-sm outline-none focus:border-indigo-500 dark:text-white transition-all" placeholder="Ex: João Silva" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] text-slate-500 uppercase font-bold mb-1 tracking-wider">Login (Usuário)</label>
                    <input required name="username" value={formData.username} onChange={handleChange} className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 w-full text-sm outline-none focus:border-indigo-500 dark:text-white transition-all" placeholder="joao.silva" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 uppercase font-bold mb-1 tracking-wider">Senha</label>
                    <input required name="password" value={formData.password} onChange={handleChange} className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 w-full text-sm outline-none focus:border-indigo-500 dark:text-white transition-all" type="text" placeholder="••••••" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] text-slate-500 uppercase font-bold mb-1 tracking-wider">Função</label>
                    <select name="role" value={formData.role} onChange={handleChange} className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 w-full text-sm outline-none focus:border-indigo-500 dark:text-white transition-all">
                      <option value="attendant">Atendente</option>
                      <option value="admin">Administrador</option>
                      <option value="totem_tv">Totem / TV</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 uppercase font-bold mb-1 tracking-wider">Mesa / Guichê</label>
                    <input required name="deskNumber" value={formData.deskNumber} onChange={handleChange} className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 w-full text-sm outline-none focus:border-indigo-500 dark:text-white transition-all" placeholder="01" />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-500 uppercase font-bold mb-1 tracking-wider">Serviço Vinculado</label>
                  <select name="serviceId" value={formData.serviceId} onChange={handleChange} className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 w-full text-sm outline-none focus:border-indigo-500 dark:text-white transition-all">
                    <option value="">Selecione um serviço...</option>
                    {formData.role === 'admin' && <option value="*">Todos os Serviços</option>}
                    {services.map((s: Service) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
                  Cancelar
                </button>
                <button type="submit" className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-bold shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2">
                  <Save size={16} />
                  {editingId ? 'Atualizar Dados' : 'Criar Usuário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="divide-y divide-slate-200 dark:divide-slate-700">
        {users.map((user: User) => {
             const userServices = Array.isArray(user.serviceId) ? user.serviceId : [user.serviceId];
             const serviceNames = userServices.map(sid => {
                 const s = services.find((srv: Service) => srv.id === sid);
                 return s ? s.name : (sid === '*' ? 'Todos' : null);
             }).filter(Boolean).join(', ');
             return (
              <div key={user.id} className="p-3 px-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group">
                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded flex items-center justify-center text-white font-bold text-[10px] bg-slate-400`}>{user.name.charAt(0)}</div>
                  <div><div className="font-bold text-sm text-slate-800 dark:text-white leading-none">{user.name}</div><div className="text-[10px] text-slate-500 mt-0.5">{serviceNames || 'Nenhum'}</div></div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleStartEdit(user)} className="p-1.5 text-slate-400 hover:text-indigo-600"><Edit2 size={16} /></button>
                  <button onClick={() => onDelete(user.id)} className="p-1.5 text-slate-400 hover:text-red-600"><Trash2 size={16} /></button>
                </div>
              </div>
             )
        })}
      </div>
    </div>
  );
};
