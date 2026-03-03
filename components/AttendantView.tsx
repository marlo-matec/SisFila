
import React, { useState } from 'react';
import { Ticket, TicketStatus, Service, User } from '../types';
import { Megaphone, Play, RotateCcw, UserX, Monitor, Briefcase, AlertCircle } from 'lucide-react';
import { TicketItem } from './TicketItem';

interface AttendantViewProps {
  tickets: Ticket[];
  services: Service[];
  currentUser: User; // Agora recebe o usuário logado
  onCallNext: (serviceId: string, attendantName: string, deskNumber: string) => void;
  onRecall: (ticketId: string) => void;
  onStartAttendance: (ticketId: string) => void;
  onFinishTicket: (ticketId: string) => void;
  onNoShow: (ticketId: string) => void;
}

export const AttendantView: React.FC<AttendantViewProps> = ({ 
  tickets, services, currentUser, 
  onCallNext, onRecall, onStartAttendance, onFinishTicket, onNoShow 
}) => {
  
  // Validation: Check if the user has a valid service assigned
  // Support for '*' which means All Services for Admin
  const isAllServices = currentUser.serviceId === '*';
  const currentService = isAllServices 
      ? { id: '*', name: 'Todos os Serviços', active: true } 
      : services.find(s => s.id === currentUser.serviceId);

  if (!currentService) {
      return (
          <div className="flex items-center justify-center h-full text-red-500">
              <div className="text-center">
                  <AlertCircle size={48} className="mx-auto mb-4"/>
                  <h2 className="text-2xl font-bold">Erro de Configuração</h2>
                  <p>Seu usuário está vinculado a um serviço que não existe mais.</p>
                  <p>Contate o administrador.</p>
              </div>
          </div>
      )
  }

  // Find ticket currently being processed by THIS attendant
  const currentTicket = tickets.find(t => 
    t.status === TicketStatus.CALLED && 
    t.attendantName === currentUser.name
  );

  // Tickets for the selected service only (from user profile) OR all if admin
  const myQueue = tickets.filter(t => {
      if (isAllServices) return t.status === TicketStatus.WAITING;
      return t.serviceId === currentUser.serviceId && t.status === TicketStatus.WAITING;
  });

  // Tickets handled by THIS sector (Called, In Progress, Finished, No-Show)
  const myCalledTickets = tickets
    .filter(t => {
      if (isAllServices) return t.status !== TicketStatus.WAITING;
      return t.serviceId === currentUser.serviceId && t.status !== TicketStatus.WAITING;
    })
    .sort((a, b) => (b.tvPriority || b.calledAt || 0) - (a.tvPriority || a.calledAt || 0));
  
  const waitingCount = myQueue.length;
  const waitingPriority = myQueue.filter(t => t.priority === 'Prioritário').length;

  // --- Render Dashboard with Fixed Header ---
  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white transition-colors duration-300">
      
      {/* FIXED HEADER BAR - Always Visible */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm z-30 shrink-0 sticky top-0">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-4">
          
          <div className="flex items-center gap-6">
            {/* Atendente Info */}
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold text-lg">
                {currentUser.name.charAt(0)}
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Atendente</span>
                <span className="font-bold text-lg text-slate-900 dark:text-white leading-tight">{currentUser.name}</span>
              </div>
            </div>

            {/* Separator */}
            <div className="hidden md:block h-8 w-px bg-slate-200 dark:bg-slate-700"></div>

            {/* Mesa Info - HIGHLIGHTED */}
            <div className="flex items-center gap-2 bg-yellow-50 dark:bg-yellow-900/10 px-3 py-1 rounded-lg border border-yellow-200 dark:border-yellow-900/30">
               <Monitor className="text-yellow-600 dark:text-yellow-500" size={20} />
               <div className="flex flex-col">
                 <span className="text-[10px] font-bold text-yellow-600 dark:text-yellow-500 uppercase">Local</span>
                 <span className="font-black text-xl text-yellow-700 dark:text-yellow-400 leading-none">Mesa {currentUser.deskNumber}</span>
               </div>
            </div>

            {/* Serviço Info */}
             <div className="hidden lg:flex items-center gap-2">
               <Briefcase className="text-slate-400" size={18} />
               <div className="flex flex-col">
                 <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase">Setor</span>
                 <span className="font-semibold text-sm text-slate-700 dark:text-slate-300">{currentService.name}</span>
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* SCROLLABLE CONTENT */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-10">
            
            {/* Main Controls (Left) */}
            <div className="lg:col-span-7 space-y-4">
              {/* Active Attendance Card */}
              <div className={`p-6 rounded-2xl border transition-all shadow-md min-h-[300px] flex flex-col justify-center ${currentTicket ? 'bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-900/40 dark:to-slate-900 border-indigo-500' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 border-dashed'}`}>
                {currentTicket ? (
                  <div className="text-center w-full">
                    
                    {/* Status Badge */}
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold mb-4 border bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 border-yellow-500/50">
                      Chamando...
                    </span>

                    <h2 className="text-6xl font-black mb-2 tracking-tighter text-slate-900 dark:text-white">{currentTicket.displayId}</h2>
                    
                    <div className="flex justify-center gap-2 mb-8">
                      <span className="text-base text-slate-600 dark:text-slate-300">{currentTicket.serviceName}</span>
                      <span className="text-slate-400 dark:text-slate-600">•</span>
                      <span className={`text-base font-bold ${currentTicket.priority === 'Prioritário' ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'}`}>
                        {currentTicket.priority}
                      </span>
                    </div>

                    {/* Actions based on Status */}
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => onRecall(currentTicket.id)}
                        className="bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-white font-bold py-3 rounded-lg shadow flex flex-col items-center justify-center gap-1 transition-all text-xs"
                      >
                        <RotateCcw size={18} /> Chamar Novamente
                      </button>
                      
                        <button
                        onClick={() => onNoShow(currentTicket.id)}
                        className="bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 font-bold py-3 rounded-lg shadow flex flex-col items-center justify-center gap-1 transition-all text-xs border border-red-200 dark:border-red-900/50"
                      >
                        <UserX size={18} /> Não Compareceu
                      </button>

                      <button
                        onClick={() => onStartAttendance(currentTicket.id)}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg shadow flex flex-col items-center justify-center gap-1 transition-all text-xs"
                      >
                        <Play size={18} /> Atender
                      </button>
                    </div>

                  </div>
                ) : (
                  <div className="text-center text-slate-400 dark:text-slate-500 py-6">
                    <Monitor size={48} className="mx-auto mb-3 opacity-20" />
                    <p className="text-lg font-medium">Mesa Livre</p>
                    <p className="text-sm mt-1 opacity-60">Aguardando chamada</p>
                  </div>
                )}
              </div>

              {/* Call Next Button - Only active if no current ticket */}
              <button
                onClick={() => onCallNext(currentUser.serviceId, currentUser.name, currentUser.deskNumber)}
                disabled={!!currentTicket || waitingCount === 0}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-600 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl shadow-md flex items-center justify-center gap-2 transition-all text-lg border-b-4 border-blue-800 disabled:border-slate-300 dark:disabled:border-slate-700 active:border-b-0 active:translate-y-1"
              >
                <Megaphone size={24} /> 
                {waitingCount === 0 ? 'Fila Vazia' : 'Chamar Próxima Senha'}
              </button>

              {/* SENHAS CHAMADAS */}
              <div className="flex flex-col h-[300px] bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-md overflow-hidden transition-colors">
                <div className="p-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center">
                  <h3 className="font-bold flex items-center gap-2 text-sm text-slate-700 dark:text-white">
                    <RotateCcw size={16} className="text-emerald-600 dark:text-emerald-400" /> 
                    Senhas Chamadas
                  </h3>
                  <span className="px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-[10px] rounded border border-emerald-200 dark:border-emerald-900/50">
                    {myCalledTickets.length} Total
                  </span>
                </div>
                
                <div className="overflow-y-auto p-2 space-y-2 flex-1">
                  {myCalledTickets.length > 0 ? (
                    myCalledTickets.map((ticket) => (
                      <TicketItem 
                        key={ticket.id} 
                        ticket={ticket} 
                        onRecall={onRecall} 
                      />
                    ))
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-600">
                      <p className="text-sm">Nenhuma senha chamada.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Queue Lists (Right) */}
            <div className="lg:col-span-5 space-y-4">
              
              {/* A ATENDER */}
              <div className="flex flex-col h-[500px] bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-md overflow-hidden transition-colors">
                <div className="p-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center">
                  <h3 className="font-bold flex items-center gap-2 text-sm text-slate-700 dark:text-white">
                    <Monitor size={16} className="text-indigo-600 dark:text-indigo-400" /> 
                    Senhas a Atender
                  </h3>
                  <div className="flex gap-2">
                    <span className="px-1.5 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-[10px] rounded border border-red-200 dark:border-red-900/50">{waitingPriority} P</span>
                    <span className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] rounded border border-slate-300 dark:border-slate-600">{waitingCount} Total</span>
                  </div>
                </div>
                
                <div className="overflow-y-auto p-2 space-y-2 flex-1">
                  {myQueue.length > 0 ? (
                    myQueue.sort((a,b) => {
                      if (a.priority === 'Prioritário' && b.priority !== 'Prioritário') return -1;
                      if (b.priority === 'Prioritário' && a.priority !== 'Prioritário') return 1;
                      return a.createdAt - b.createdAt;
                    }).map((ticket, index) => (
                      <div key={ticket.id} className={`flex justify-between items-center p-3 rounded-lg border-l-4 shadow-sm ${index === 0 ? 'bg-indigo-50 dark:bg-slate-700/80 border-green-500' : 'bg-slate-50 dark:bg-slate-700/30 border-slate-300 dark:border-slate-600'}`}>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-lg tracking-tight text-slate-900 dark:text-white">{ticket.displayId}</span>
                            {ticket.priority === 'Prioritário' && <span className="text-red-600 dark:text-red-400 text-[10px] font-bold border border-red-200 dark:border-red-900 bg-red-100 dark:bg-red-900/20 px-1 rounded">P</span>}
                          </div>
                          <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{ticket.serviceName}</div>
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {Math.floor((Date.now() - ticket.createdAt) / 60000)} min
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-600">
                      <p className="text-sm">Nenhuma senha aguardando.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};
