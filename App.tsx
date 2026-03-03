import React, { useState, useEffect, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Ticket, TicketStatus, AppState, PriorityType, User, Service, SystemInfo, PrinterConfig } from './types';
import { TotemView } from './components/TotemView';
import { TvView } from './components/TvView';
import { AttendantView } from './components/AttendantView';
import { ReportsView } from './components/ReportsView';
import { SettingsView } from './components/SettingsView';
import { Monitor, Tv, Users, FileText, Layers, Settings, ExternalLink, Sun, Moon, Wifi, WifiOff, Download, LogOut, Lock, LogIn, AlertCircle, User as UserIcon, ShieldAlert, RefreshCw } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { openDB } from 'idb';

const DB_NAME = 'SISFILA_DB_V2';
const STORE_NAME = 'state';
const PENDING_STORE = 'pending_ops'; // Nova store para fila de sincronização

import { useTheme } from './hooks/useTheme';
import { useIndexedDB } from './hooks/useIndexedDB';
import { useSocket } from './hooks/useSocket';
import { useSystemInfo } from './hooks/useSystemInfo';

const DEFAULT_STATE: AppState = {
  tickets: [],
  services: [
    { id: '1', name: 'Comercial', active: true },
    { id: '2', name: 'Financeiro', active: true },
    { id: '3', name: 'Suporte', active: true }
  ],
  users: [
    { 
      id: 'u1', 
      name: 'Admin', 
      username: 'admin', 
      password: 'admin', 
      deskNumber: '01', 
      serviceId: '1',
      role: 'admin',
      active: true 
    }
  ],
  view: 'home'
};

function App() {
  const [isTvMode, setIsTvMode] = useState(false);
  const { isDarkMode, toggleTheme } = useTheme();
  
  const [serverMode, setServerMode] = useState(false); 
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  // State Global
  const [state, setState] = useState<AppState>(DEFAULT_STATE);
  const [lastIssuedTicket, setLastIssuedTicket] = useState<Ticket | null>(null);

  // Hooks
  const storedServerUrl = localStorage.getItem('SISFILA_SERVER_URL');
  const apiBase = storedServerUrl || '';
  const socketUrl = storedServerUrl || ((import.meta as any).env?.DEV ? 'http://localhost:3000' : undefined);

  const { 
    pendingSyncCount, 
    saveBackup, 
    loadBackup, 
    addPendingOp, 
    getPendingOps, 
    clearPendingOps, 
    updatePendingCount 
  } = useIndexedDB();

  const { 
    socket, 
    connectionStatus, 
    setConnectionStatus, 
    isOnline, 
    emit, 
    on 
  } = useSocket(socketUrl);

  const { 
    systemInfo, 
    setSystemInfo, 
    printerConfig, 
    refresh: refreshSystemInfo 
  } = useSystemInfo(apiBase);

  // Authentication State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // --- ATUALIZA TÍTULO DA ABA ---
  useEffect(() => {
    document.title = currentUser ? `SisFila - ${currentUser.name}` : `SisFila - Login`;
  }, [currentUser]);

  // --- FUNÇÃO DE SINCRONIZAÇÃO (OFFLINE -> ONLINE) ---
  const syncOfflineChanges = useCallback(async () => {
    if (!socket) return;
    const pendingOps = await getPendingOps();
    
    if (pendingOps.length > 0) {
      setConnectionStatus('syncing');
      console.log(`🔄 Sincronizando ${pendingOps.length} operações offline com o SQLite...`);
      
      for (const op of pendingOps) {
        const eventName = op.action === 'delete' 
           ? `delete-${op.type.toLowerCase().slice(0, -1)}` 
           : `update-${op.type.toLowerCase()}`;
        
        socket.emit(eventName, op.data);
      }

      await clearPendingOps();
      console.log("✅ Sincronização concluída.");
    }
    setConnectionStatus('connected');
  }, [socket, getPendingOps, clearPendingOps, setConnectionStatus]);

  // --- 1. INICIALIZAÇÃO E CONEXÃO ---
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    const params = new URLSearchParams(window.location.search);
    if (params.get('view') === 'tv') {
      setIsTvMode(true);
      setState(prev => ({ ...prev, view: 'tv' }));
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleConnect = async () => {
      setServerMode(true);
      await syncOfflineChanges();
    };

    const handleInitialData = async (data: any) => {
      setState(prev => ({
        ...prev,
        tickets: data.tickets || [],
        services: data.services || [],
        users: data.users || []
      }));
      
      if (!isTvMode) {
        await saveBackup({ tickets: data.tickets, services: data.services, users: data.users });
      }
    };

    const handleSyncUpdate = (event: any) => {
      if (event.type === 'TICKETS') {
         if (Array.isArray(event.data)) {
            setState(prev => {
                const newTickets = [...prev.tickets];
                event.data.forEach((t: Ticket) => {
                    const idx = newTickets.findIndex(ot => ot.id === t.id);
                    if (idx >= 0) newTickets[idx] = t;
                    else newTickets.push(t);
                });
                return { ...prev, tickets: newTickets };
            });
         } else {
            setState(prev => {
               const exists = prev.tickets.find(t => t.id === event.data.id);
               if (exists) {
                 return { ...prev, tickets: prev.tickets.map(t => t.id === event.data.id ? event.data : t) };
               } else {
                 return { ...prev, tickets: [...prev.tickets, event.data] };
               }
            });
         }
      }
      else if (event.type === 'SERVICES') {
         if (Array.isArray(event.data)) setState(prev => ({ ...prev, services: event.data }));
      }
      else if (event.type === 'USERS') {
         if (Array.isArray(event.data)) setState(prev => ({ ...prev, users: event.data }));
      }
      else if (event.type === 'RESET') {
         window.location.reload();
      }
    };

    socket.on('connect', handleConnect);
    socket.on('initial-data', handleInitialData);
    socket.on('sync-update', handleSyncUpdate);
    socket.on('sync-delete-service', (id: string) => {
        setState(prev => ({ ...prev, services: prev.services.filter(s => s.id !== id) }));
    });
    socket.on('sync-delete-user', (id: string) => {
        setState(prev => ({ ...prev, users: prev.users.filter(u => u.id !== id) }));
    });

    return () => {
      socket.off('connect', handleConnect);
      socket.off('initial-data', handleInitialData);
      socket.off('sync-update', handleSyncUpdate);
    };
  }, [socket, isTvMode, saveBackup, syncOfflineChanges]);

  useEffect(() => {
    if (connectionStatus === 'offline') {
      setServerMode(false);
      const loadData = async () => {
        const backup = await loadBackup();
        await updatePendingCount();
        if (backup && state.tickets.length === 0) {
          console.log("📂 Dados carregados do Cache Local (Offline Mode)");
          setState(prev => ({ ...DEFAULT_STATE, ...backup, view: prev.view }));
        }
      };
      loadData();
    }
  }, [connectionStatus, loadBackup, updatePendingCount, state.tickets.length]);

  // --- 2. GERENCIADOR DE PERSISTÊNCIA (SQLite + Fila Offline) ---
  const persistChanges = async (type: 'TICKETS' | 'SERVICES' | 'USERS', data: any, action: 'update' | 'delete' = 'update') => {
    if (isOnline && socket) {
      const eventName = action === 'delete' 
        ? `delete-${type.toLowerCase().slice(0, -1)}` 
        : `update-${type.toLowerCase()}`;
      socket.emit(eventName, data);
    } else {
      console.warn("⚠️ Offline: Adicionando à fila de sincronização.");
      await addPendingOp({ type, action, data });
    }
  };

  // Effect to sync state backup to IndexedDB whenever it changes
  useEffect(() => {
    if (isTvMode) return;
    const timer = setTimeout(() => {
      saveBackup({
        tickets: state.tickets,
        services: state.services,
        users: state.users
      });
    }, 1000);
    return () => clearTimeout(timer);
  }, [state.tickets, state.services, state.users, isTvMode, saveBackup]);


  // --- Actions ---
  // Manipulador de URL do Servidor (Settings)
  const handleUpdateServerUrl = (url: string) => {
    if (url) {
        localStorage.setItem('SISFILA_SERVER_URL', url);
    } else {
        localStorage.removeItem('SISFILA_SERVER_URL');
    }
    window.location.reload();
  };

  const handleOpenTvWindow = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('view', 'tv');
    window.open(url.toString(), '_blank', 'width=1920,height=1080,menubar=no,toolbar=no,location=no,status=no');
  };
  
  const handleInstallClick = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstallPrompt(null);
    }
  };

  const handleResetSystem = () => {
    if (confirm("ATENÇÃO: Isso apagará TODOS os dados do SQLite. Continuar?")) {
      if (serverMode) {
        fetch(`/api/reset`, { method: 'POST' })
          .then(() => window.location.reload())
          .catch(() => alert("Erro ao resetar servidor"));
      } else {
        clearPendingOps();
        setState(prev => ({ ...DEFAULT_STATE, view: prev.view }));
        window.location.reload();
      }
    }
  };

  // --- LOGIN HANDLER ---
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginUsername === 'mestre' && loginPassword === 'mestre') {
      const masterUser: User = {
        id: 'master-root', 
        name: 'SUPER ADMIN (MESTRE)',
        username: 'mestre',
        password: '',
        role: 'admin',
        active: true,
        deskNumber: '00',
        serviceId: '*' 
      };
      setCurrentUser(masterUser);
      return;
    }
    const user = state.users.find(u => u.username === loginUsername && u.password === loginPassword);
    
    if (user) {
      if (!user.active) {
        setLoginError('Usuário desativado.');
        return;
      }
      setCurrentUser(user);
      setLoginError('');
      setLoginUsername('');
      setLoginPassword('');
    } else {
      setLoginError('Acesso Negado.');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setState(prev => ({ ...prev, view: 'home' }));
  };

  // Crud Wrappers
  const handleAddService = (name: string) => {
    const newService = { id: uuidv4(), name, active: true };
    setState(prev => ({ ...prev, services: [...prev.services, newService] }));
    persistChanges('SERVICES', [...state.services, newService]); // Envia array atualizado (ou apenas o novo se o server suportasse)
    // O Server atual (sqlite) suporta update via array (upsert), então enviamos o array com o novo para garantir.
    // Otimização: Poderíamos enviar apenas o novo objeto. O server suporta array ou objeto.
    // Vamos enviar apenas o novo para economizar banda, mas o state local já foi atualizado.
    persistChanges('SERVICES', [newService]); 
  };
  
  const handleUpdateService = (id: string, name: string) => {
    const updatedServices = state.services.map(s => s.id === id ? { ...s, name } : s);
    setState(prev => ({ ...prev, services: updatedServices }));
    const updatedItem = updatedServices.find(s => s.id === id);
    if(updatedItem) persistChanges('SERVICES', [updatedItem]);
  };

  const handleDeleteService = (id: string) => {
    setState(prev => ({ ...prev, services: prev.services.filter(s => s.id !== id) }));
    persistChanges('SERVICES', id, 'delete');
  };

  const handleAddUser = (userData: Omit<User, 'id' | 'active'>) => {
    const newUser = { id: uuidv4(), ...userData, active: true };
    setState(prev => ({ ...prev, users: [...prev.users, newUser] }));
    persistChanges('USERS', [newUser]);
  };

  const handleUpdateUser = (id: string, userData: Partial<User>) => {
    const updatedUsers = state.users.map(u => u.id === id ? { ...u, ...userData } : u);
    setState(prev => ({ ...prev, users: updatedUsers }));
    const updatedItem = updatedUsers.find(u => u.id === id);
    if(updatedItem) persistChanges('USERS', [updatedItem]);
  };

  const handleDeleteUser = (id: string) => {
    setState(prev => ({ ...prev, users: prev.users.filter(u => u.id !== id) }));
    persistChanges('USERS', id, 'delete');
  };

  const issueTicket = (serviceId: string, priority: PriorityType) => {
    const service = state.services.find(s => s.id === serviceId);
    if (!service) return;

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    
    // Conta TODAS as senhas emitidas HOJE (sequência única para todos os setores)
    const dailyCount = state.tickets.filter(t => 
      t.createdAt >= startOfDay
    ).length + 1;
    
    const serviceChar = service.name.charAt(0).toUpperCase();
    const priorityChar = priority === 'Prioritário' ? 'P' : 'N';
    const displayId = `${serviceChar}${priorityChar}${dailyCount.toString().padStart(3, '0')}`;

    const newTicket: Ticket = {
      id: uuidv4(),
      displayId,
      serviceId: service.id,
      serviceName: service.name,
      priority,
      status: TicketStatus.WAITING,
      createdAt: Date.now()
    };

    setLastIssuedTicket(newTicket);
    setState(prev => ({ ...prev, tickets: [...prev.tickets, newTicket] }));
    persistChanges('TICKETS', [newTicket]); // Envia como array para bater com lógica de update
    
    setTimeout(() => setLastIssuedTicket(null), 5000); 
  };

  const callNextTicket = (serviceId: string, attendantName: string, deskNumber: string) => {
    let candidates = state.tickets.filter(t => t.status === TicketStatus.WAITING);
    const hasAccessToAll = serviceId === '*';

    if (!hasAccessToAll) {
        candidates = candidates.filter(t => t.serviceId === serviceId);
    }
    
    if (candidates.length === 0) return;

    candidates.sort((a, b) => {
      if (a.priority === 'Prioritário' && b.priority !== 'Prioritário') return -1;
      if (b.priority === 'Prioritário' && a.priority !== 'Prioritário') return 1;
      return a.createdAt - b.createdAt;
    });

    const ticketToCall = candidates[0];
    const updatedTicket = { ...ticketToCall, status: TicketStatus.CALLED, calledAt: Date.now(), attendantName, deskNumber };
    
    const updatedList = state.tickets.map(t => t.id === ticketToCall.id ? updatedTicket : t);
    setState(prev => ({ ...prev, tickets: updatedList }));
    persistChanges('TICKETS', [updatedTicket]);
  };

  const recallTicket = (ticketId: string) => {
    const ticket = state.tickets.find(t => t.id === ticketId);
    if(!ticket) return;
    // Quando re-chama, volta para o estado CALLED para que o atendente possa gerenciar novamente
    const updatedTicket = { ...ticket, status: TicketStatus.CALLED, calledAt: Date.now() }; 

    const updatedList = state.tickets.map(t => t.id === ticketId ? updatedTicket : t);
    setState(prev => ({ ...prev, tickets: updatedList }));
    persistChanges('TICKETS', [updatedTicket]);
  };

  const startAttendance = (ticketId: string) => {
    const ticket = state.tickets.find(t => t.id === ticketId);
    if(!ticket) return;
    const updatedTicket = { ...ticket, status: TicketStatus.FINISHED, startedAt: Date.now(), finishedAt: Date.now() }; // Started=Finished logic simplified for now or fix

    // Correção lógica: Started deve ser agora, Finished só quando terminar. 
    // Mas o botão "Atender" neste app finaliza a espera e inicia o atendimento.
    // Se houver botão "Finalizar", separamos. Por enquanto mantém lógica simples.
    // Vamos ajustar: status IN_PROGRESS
    const updatedTicketFixed = { ...ticket, status: TicketStatus.IN_PROGRESS, startedAt: Date.now() };

    const updatedList = state.tickets.map(t => t.id === ticketId ? updatedTicketFixed : t);
    setState(prev => ({ ...prev, tickets: updatedList }));
    persistChanges('TICKETS', [updatedTicketFixed]);
  };

  const finishTicket = (ticketId: string) => {
    const ticket = state.tickets.find(t => t.id === ticketId);
    if(!ticket) return;
    const updatedTicket = { ...ticket, status: TicketStatus.FINISHED, finishedAt: Date.now() };
    
    const updatedList = state.tickets.map(t => t.id === ticketId ? updatedTicket : t);
    setState(prev => ({ ...prev, tickets: updatedList }));
    persistChanges('TICKETS', [updatedTicket]);
  };

  const handleNoShow = (ticketId: string) => {
    const ticket = state.tickets.find(t => t.id === ticketId);
    if(!ticket) return;
    const updatedTicket = { ...ticket, status: TicketStatus.NO_SHOW, finishedAt: Date.now() };

    const updatedList = state.tickets.map(t => t.id === ticketId ? updatedTicket : t);
    setState(prev => ({ ...prev, tickets: updatedList }));
    persistChanges('TICKETS', [updatedTicket]);
  };

  // --- View: TV (Login Bypass) ---
  if (isTvMode) {
    return <TvView tickets={state.tickets} systemInfo={systemInfo} />;
  }

  // --- BLOCK SCREEN (LICENSE EXPIRED) ---
  if (systemInfo?.isBlocked) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-slate-900 text-white p-8">
        <div className="max-w-md w-full bg-slate-800 p-8 rounded-2xl shadow-2xl border border-red-500/50 text-center">
          <Lock size={64} className="mx-auto text-red-500 mb-6" />
          <h1 className="text-3xl font-bold mb-4">Licença Expirada</h1>
          <p className="text-slate-400 mb-8">
            O período de avaliação expirou. Insira uma chave válida.
          </p>
          
          <button 
             onClick={() => {
                setState(prev => ({ ...prev, view: 'settings' }));
                if (!currentUser) setCurrentUser({ id: 'temp', name: 'Ativação', username: 'temp', password: '', active: true, deskNumber: '', serviceId: '*', role: 'admin' });
             }}
             className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-8 rounded-xl w-full"
          >
            Inserir Chave de Ativação
          </button>
        </div>
      </div>
    );
  }

  // --- View: LOGIN SCREEN (Required) ---
  if (!currentUser) {
    return (
      <div className="flex flex-col h-screen bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-950 transition-colors duration-300">
        <div className="flex-1 flex items-center justify-center p-4">
           <form onSubmit={handleLogin} className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-xl w-full max-w-[340px] border border-slate-200 dark:border-slate-700 space-y-4 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-600"></div>
              
              <div className="text-center mb-4 pt-2">
                {systemInfo?.clientLogo ? (
                  <img src={systemInfo.clientLogo} alt="Logo" className="h-12 mx-auto mb-2 object-contain" />
                ) : (
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 mb-2 text-indigo-600 dark:text-indigo-400 shadow-sm">
                    <Layers size={24} />
                  </div>
                )}
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">SisFila</h1>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide">Acesso Restrito</p>
              </div>

              {loginError && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 px-3 py-2 rounded-lg text-xs flex items-center gap-2 animate-pulse font-medium">
                   <AlertCircle size={14} /> {loginError}
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide">Usuário</label>
                  <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition-all">
                    <UserIcon size={14} className="text-slate-400" />
                    <input 
                      autoFocus
                      value={loginUsername}
                      onChange={(e) => setLoginUsername(e.target.value)}
                      className="bg-transparent w-full text-sm text-slate-900 dark:text-white outline-none placeholder-slate-400 dark:placeholder-slate-600 font-medium"
                      placeholder="admin"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide">Senha</label>
                  <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition-all">
                    <Lock size={14} className="text-slate-400" />
                    <input 
                      type="password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="bg-transparent w-full text-sm text-slate-900 dark:text-white outline-none placeholder-slate-400 dark:placeholder-slate-600 font-medium"
                      placeholder="••••••"
                    />
                  </div>
                </div>
              </div>

              <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-lg shadow-md transition-all mt-2 flex justify-center items-center gap-2 group text-sm">
                <LogIn size={16} className="group-hover:translate-x-0.5 transition-transform" /> Entrar
              </button>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/50 flex justify-between items-center text-[10px] text-slate-400 font-medium">
                 <div className="flex items-center gap-1.5">
                   {connectionStatus === 'connected' ? <Wifi size={10} className="text-emerald-500"/> : <WifiOff size={10} className="text-slate-500"/>}
                   {connectionStatus === 'connected' ? 'Online' : 'Offline'}
                 </div>
                 <button type="button" onClick={toggleTheme} className="hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                   {isDarkMode ? 'Modo Claro' : 'Modo Escuro'}
                 </button>
              </div>
           </form>
        </div>
      </div>
    );
  }

  // --- View: MAIN APP (Logged In) ---
  const renderView = () => {
    switch (state.view) {
      case 'totem':
        if (currentUser.role === 'attendant') return <div className="p-8 text-center text-red-500">Acesso Negado</div>;
        return <TotemView 
          services={state.services} 
          onIssueTicket={issueTicket} 
          lastTicket={lastIssuedTicket}
          printerConfig={printerConfig}
          systemInfo={systemInfo}
        />;
      case 'tv':
        if (currentUser.role === 'attendant') return <div className="p-8 text-center text-red-500">Acesso Negado</div>;
        return <TvView tickets={state.tickets} systemInfo={systemInfo} />;
      case 'attendant':
        if (currentUser.role === 'totem_tv') return <div className="p-8 text-center text-red-500">Acesso Negado</div>;
        return <AttendantView 
          tickets={state.tickets} 
          services={state.services} 
          currentUser={currentUser}
          onCallNext={callNextTicket} 
          onRecall={recallTicket}
          onStartAttendance={startAttendance}
          onFinishTicket={finishTicket} 
          onNoShow={handleNoShow}
        />;
      case 'settings':
        // RBAC Check
        if (currentUser.role !== 'admin') {
           return <div className="p-8 text-center text-red-500">Acesso Negado: Apenas administradores.</div>
        }
        return <SettingsView 
          services={state.services} 
          users={state.users}
          currentServerUrl={localStorage.getItem('SISFILA_SERVER_URL') || ''}
          onUpdateServerUrl={handleUpdateServerUrl}
          onAddService={handleAddService} 
          onUpdateService={handleUpdateService} 
          onDeleteService={handleDeleteService}
          onAddUser={handleAddUser}
          onUpdateUser={handleUpdateUser}
          onDeleteUser={handleDeleteUser}
          onResetSystem={handleResetSystem}
          onRefreshSystemInfo={refreshSystemInfo}
          onNavigateHome={() => setState(prev => ({ ...prev, view: 'home' }))} 
        />;
      case 'reports':
        if (currentUser.role !== 'admin') return <div className="p-8 text-center text-red-500">Acesso Negado</div>;
        return <ReportsView tickets={state.tickets} services={state.services} users={state.users} systemInfo={systemInfo} />;
      default:
        // DASHBOARD PRINCIPAL
        if (currentUser.role === 'totem_tv') {
          return (
             <div className="flex flex-col items-center justify-center h-full space-y-8 p-8 overflow-y-auto">
               <h1 className="text-3xl font-bold text-slate-800 dark:text-white">Modo Quiosque (Totem/TV)</h1>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-4xl">
                  <RoleCard icon={<Monitor size={36} />} title="Totem" desc="Emissão de senhas" onClick={() => setState(p => ({ ...p, view: 'totem' }))} color="bg-emerald-600" />
                  <div className="relative group">
                    <RoleCard icon={<Tv size={36} />} title="TV / Painel" desc="Exibição de chamadas" onClick={() => setState(p => ({ ...p, view: 'tv' }))} color="bg-blue-600" />
                    <button onClick={handleOpenTvWindow} className="absolute top-2 right-2 p-2 bg-white/20 hover:bg-white/40 rounded-full text-white" title="Abrir em nova janela">
                      <ExternalLink size={20} />
                    </button>
                  </div>
               </div>
               
               {/* Atalho para Configurações (Rede) mesmo em Totem, para configurar IP inicial */}
               <button onClick={() => setState(p => ({ ...p, view: 'settings' }))} className="mt-8 text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 underline text-xs">
                  Configurar Rede
               </button>
             </div>
          );
        }

        return (
          <div className="flex flex-col items-center justify-center h-full space-y-8 p-8 overflow-y-auto">
            <div className="text-center mb-6 relative">
               {systemInfo?.clientLogo ? (
                  <img src={systemInfo.clientLogo} alt="Logo Cliente" className="h-20 mx-auto mb-4 object-contain" />
                ) : (
                  <h1 className="text-5xl font-black text-slate-900 dark:text-white mb-2 tracking-tighter">SisFila</h1>
                )}
              
              <p className="text-slate-600 dark:text-slate-400 text-lg">Bem-vindo, <span className="text-indigo-600 dark:text-indigo-400 font-bold">{currentUser.name}</span></p>
              
              {currentUser.id === 'master-root' && (
                <div className="mt-2 inline-flex items-center gap-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-3 py-1 rounded-full text-xs font-bold border border-red-200 dark:border-red-900/50">
                  <ShieldAlert size={14} /> MODO DE EMERGÊNCIA (MESTRE)
                </div>
              )}

              <div className="mt-4 flex flex-col items-center gap-2">
                 {installPrompt && (
                   <button 
                     onClick={handleInstallClick}
                     className="mt-2 text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 text-sm font-medium animate-bounce"
                   >
                     <Download size={16} /> Instalar Aplicativo no Computador
                   </button>
                 )}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-5xl">
              {/* Only Admin sees Totem and TV on this dashboard (Attendant only sees Mesa) */}
              {currentUser.role === 'admin' && (
                <>
                  <RoleCard icon={<Monitor size={36} />} title="Totem" desc="Emissão de senhas" onClick={() => setState(p => ({ ...p, view: 'totem' }))} color="bg-emerald-600" />
                  
                  <div className="relative group">
                    <RoleCard icon={<Tv size={36} />} title="TV / Painel" desc="Exibição de chamadas" onClick={() => setState(p => ({ ...p, view: 'tv' }))} color="bg-blue-600" />
                    <button onClick={handleOpenTvWindow} className="absolute top-2 right-2 p-2 bg-white/20 hover:bg-white/40 rounded-full text-white" title="Abrir em nova janela">
                      <ExternalLink size={20} />
                    </button>
                  </div>
                </>
              )}
              
              <RoleCard icon={<Users size={36} />} title="Mesa" desc="Realizar Atendimento" onClick={() => setState(p => ({ ...p, view: 'attendant' }))} color="bg-indigo-600" />
              
              {/* Only Admin sees Reports and Settings */}
              {currentUser.role === 'admin' && (
                <>
                  <RoleCard icon={<FileText size={36} />} title="Relatórios" desc="Histórico e Estatísticas" onClick={() => setState(p => ({ ...p, view: 'reports' }))} color="bg-purple-600" />
                  <RoleCard icon={<Settings size={36} />} title="Configurações" desc="Adminstração do Sistema" onClick={() => setState(p => ({ ...p, view: 'settings' }))} color="bg-slate-600" />
                </>
              )}
            </div>
          </div>
        );
    }
  };

  return (
    <div className="h-screen flex flex-col bg-slate-50 dark:bg-slate-950 font-sans transition-colors duration-300">
      {/* Banner de Licença (Trial) */}
      {!systemInfo?.hasLicense && systemInfo && (
         <div className="bg-orange-500 text-white text-xs font-bold text-center py-1">
            MÓDULO DE TESTE - RESTAM {systemInfo.trialDaysLeft} DIAS - <button onClick={() => setState(p => ({ ...p, view: 'settings' }))} className="underline hover:text-orange-200">ATIVAR AGORA</button>
         </div>
      )}

      <nav className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-2 flex justify-between items-center z-50 transition-colors duration-300">
        <div className="flex items-center gap-2 cursor-pointer text-slate-900 dark:text-white font-bold px-2" onClick={() => setState(p => ({ ...p, view: 'home' }))}>
          <Layers size={20} className="text-indigo-600 dark:text-indigo-500" />
          <span>SisFila</span>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2" title="Status da Conexão">
             {connectionStatus === 'connected' ? (
                <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-full border border-emerald-200 dark:border-emerald-900">
                   <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                   Online
                </div>
             ) : connectionStatus === 'syncing' ? (
                <div className="flex items-center gap-1.5 text-xs text-blue-600 font-bold bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-full border border-blue-200 dark:border-blue-900">
                   <RefreshCw size={10} className="animate-spin"/>
                   Sync
                </div>
             ) : connectionStatus === 'connecting' ? (
                <div className="w-3 h-3 rounded-full bg-yellow-500 animate-pulse"></div>
             ) : (
                <div className="flex items-center gap-1 text-xs text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full border border-slate-300 dark:border-slate-700">
                  <WifiOff size={12} /> <span className="hidden lg:inline">Offline {pendingSyncCount > 0 ? `(${pendingSyncCount} pendentes)` : ''}</span>
                </div>
             )}
          </div>

          {state.view !== 'home' && currentUser?.role !== 'totem_tv' && (
            <div className="flex gap-2 overflow-x-auto">
              <NavButton active={state.view === 'totem'} onClick={() => setState(p => ({ ...p, view: 'totem' }))}>Totem</NavButton>
              <NavButton active={state.view === 'tv'} onClick={() => setState(p => ({ ...p, view: 'tv' }))}>TV</NavButton>
              <NavButton active={state.view === 'attendant'} onClick={() => setState(p => ({ ...p, view: 'attendant' }))}>Mesa</NavButton>
              <NavButton active={state.view === 'reports'} onClick={() => setState(p => ({ ...p, view: 'reports' }))}>Relatórios</NavButton>
              {currentUser.role === 'admin' && (
                 <NavButton active={state.view === 'settings'} onClick={() => setState(p => ({ ...p, view: 'settings' }))}>Configurações</NavButton>
              )}
            </div>
          )}
          
          <button 
            onClick={handleOpenTvWindow}
            className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors border border-indigo-200 dark:border-indigo-800"
            title="Abrir Painel TV em outra janela"
          >
            <ExternalLink size={16} />
            <span>Abrir TV</span>
          </button>

          {/* USER INFO DISPLAY */}
          {currentUser && (
            <div className="hidden md:flex flex-col items-end mr-2 px-2 border-r border-slate-200 dark:border-slate-800">
               <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase">Logado como</span>
               <span className="text-sm font-bold text-slate-800 dark:text-white leading-none">{currentUser.name}</span>
            </div>
          )}

          <button 
            onClick={toggleTheme} 
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors"
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          <button 
            onClick={handleLogout}
            className="p-2 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
            title="Sair"
          >
            <LogOut size={20} />
          </button>
        </div>
      </nav>
      <main className="flex-1 overflow-hidden relative">{renderView()}</main>
    </div>
  );
}

const RoleCard = ({ icon, title, desc, onClick, color }: any) => (
  <button onClick={onClick} className={`${color} w-full hover:brightness-110 p-4 rounded-xl shadow-lg flex flex-col items-center text-center gap-2 transition-all hover:-translate-y-1 group min-h-[130px] border border-white/10`}>
    <div className="bg-white/20 p-2.5 rounded-full text-white mb-0.5 group-hover:scale-110 transition-transform">{icon}</div>
    <h3 className="text-lg font-bold text-white leading-tight">{title}</h3>
    <p className="text-white/80 text-xs font-medium leading-tight">{desc}</p>
  </button>
);

const NavButton = ({ children, onClick, active }: any) => (
  <button onClick={onClick} className={`px-3 py-1 rounded text-xs font-medium whitespace-nowrap transition-colors ${active ? 'bg-indigo-600 text-white' : 'text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-white hover:bg-indigo-50 dark:hover:bg-slate-800'}`}>
    {children}
  </button>
);

export default App;