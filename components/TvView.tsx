import React, { useEffect, useRef } from 'react';
import { Ticket, TicketStatus, SystemInfo } from '../types';
import { TicketBadge } from './TicketBadge';

interface TvViewProps {
  tickets: Ticket[];
  systemInfo: SystemInfo | null;
}

export const TvView: React.FC<TvViewProps> = ({ tickets, systemInfo }) => {
  const lastCalledTimeRef = useRef<number>(0);
  const lastCalledIdRef = useRef<string | null>(null);
  
  // Logic: Show the latest ticket that was CALLED or is IN_PROGRESS (as long as it was called recently)
  // History shows finished calls.
  
  const history = tickets
    .filter(t => t.status !== TicketStatus.WAITING)
    .sort((a, b) => (b.tvPriority || b.calledAt || 0) - (a.tvPriority || a.calledAt || 0));

  const currentTicket = history[0];
  const previousTickets = history.slice(1, 7);

  useEffect(() => {
    // Check if there is a ticket AND if its calledAt timestamp is newer than what we processed
    // This handles both new tickets AND recall (same ticket, new timestamp)
    if (currentTicket && currentTicket.calledAt && (currentTicket.calledAt > lastCalledTimeRef.current || (currentTicket.id !== lastCalledIdRef.current && currentTicket.status === TicketStatus.CALLED))) {
      const currentTimestamp = currentTicket.calledAt;
      lastCalledTimeRef.current = currentTimestamp;
      lastCalledIdRef.current = currentTicket.id;
      
      const audio = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');
      audio.play().catch(e => console.log("Audio autoplay might be blocked", e)).then(() => {
        setTimeout(() => {
          // Cancel any ongoing speech to prevent double calls
          window.speechSynthesis.cancel();

          const utterance = new SpeechSynthesisUtterance(
            `Senha ${currentTicket.displayId.split('').join(' ')}, Mesa ${currentTicket.deskNumber}`
          );
          utterance.lang = 'pt-BR';
          utterance.rate = 0.9;

          // --- VOICE SELECTION LOGIC (FEMALE PRIORITY) ---
          const voices = window.speechSynthesis.getVoices();
          
          // Tenta encontrar vozes femininas conhecidas em PT-BR
          const targetVoice = voices.find(v => 
            v.lang.includes('pt-BR') && (
              v.name.includes('Google') ||   // Google Português do Brasil (Chrome/Android - Feminina Padrão)
              v.name.includes('Luciana') ||  // macOS/iOS (Feminina)
              v.name.includes('Maria') ||    // Windows (Feminina)
              v.name.includes('Francisca')   // Windows (Feminina)
            )
          );

          // Fallback: Tenta encontrar qualquer voz pt-BR se as específicas não existirem
          const fallbackVoice = voices.find(v => v.lang.includes('pt-BR') || v.lang.includes('pt_BR'));

          if (targetVoice) {
            utterance.voice = targetVoice;
          } else if (fallbackVoice) {
            utterance.voice = fallbackVoice;
          }
          // -----------------------------------------------

          window.speechSynthesis.speak(utterance);
        }, 1000);
      });
    }
  }, [currentTicket?.calledAt, currentTicket?.displayId, currentTicket?.deskNumber]); // Depend on timestamp

  return (
    <div className="flex h-screen w-screen bg-slate-950 text-white overflow-hidden relative">
      
      {/* BRANDING - TOP RIGHT */}
      {systemInfo?.clientLogo && (
        <div className="absolute top-4 right-4 z-50 bg-white/10 p-2 rounded-lg backdrop-blur-sm border border-white/10">
           <img src={systemInfo.clientLogo} alt="Logo" className="h-16 object-contain" />
        </div>
      )}

      {/* Left Panel: Current Ticket - Always Dark High Contrast for TV */}
      <div className="w-2/3 flex flex-col items-center justify-center border-r border-slate-800 p-12 bg-gradient-to-br from-slate-900 to-slate-800 relative">
        <div className="absolute top-8 left-8 text-2xl font-bold text-slate-500 tracking-widest uppercase">Chamada Atual</div>
        {currentTicket ? (
          <div className="text-center animate-pulse-slow">
            <div className={`text-[15rem] leading-none font-black mb-4 text-transparent bg-clip-text ${currentTicket.priority === 'Prioritário' ? 'bg-gradient-to-br from-red-400 to-orange-400' : 'bg-gradient-to-br from-blue-400 to-cyan-400'}`}>
              {currentTicket.displayId}
            </div>
            <div className="mb-8">
               <TicketBadge status={currentTicket.status} variant="bold" />
            </div>
            <div className="space-y-6">
              <div className="text-7xl font-bold text-white flex items-center justify-center gap-6">
                MESA <span className="text-yellow-400 text-8xl">{currentTicket.deskNumber}</span>
              </div>
              <div className="text-5xl text-slate-400 mt-4 font-light">
                {currentTicket.serviceName}
              </div>
               {currentTicket.priority === 'Prioritário' && (
                 <div className="inline-block mt-8 px-8 py-3 bg-red-900/50 text-red-300 rounded-full text-2xl font-bold border border-red-500/30">
                   Prioridade
                 </div>
               )}
            </div>
          </div>
        ) : (
          <div className="text-center text-slate-600">
            <h1 className="text-6xl font-bold opacity-30">Aguardando...</h1>
          </div>
        )}
      </div>

      {/* Right Panel: History */}
      <div className="w-1/3 bg-slate-900 flex flex-col">
        <div className="bg-slate-800 p-8 shadow-md z-10 border-b border-slate-700">
          <h3 className="text-3xl font-bold text-slate-300">Últimas Chamadas</h3>
        </div>
        <div className="flex-1 overflow-hidden p-4 space-y-2">
          {previousTickets.map((ticket) => (
            <div key={ticket.id} className="bg-slate-800/50 p-4 rounded-xl border-l-4 border-slate-600 flex justify-between items-center opacity-70">
              <div>
                <span className="block text-3xl font-bold text-white mb-0.5">{ticket.displayId}</span>
                <div className="mb-0.5">
                  <TicketBadge status={ticket.status} />
                </div>
                <span className="block text-sm text-slate-400 truncate max-w-[150px]">{ticket.serviceName}</span>
              </div>
              <div className="text-right">
                <span className="block text-xl font-bold text-yellow-500">Mesa {ticket.deskNumber}</span>
                <span className="text-[10px] text-slate-500">{ticket.calledAt ? new Date(ticket.calledAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}</span>
              </div>
            </div>
          ))}
        </div>
        
        {/* Footer Info */}
        <div className="p-6 bg-slate-950 text-center text-slate-600 text-sm border-t border-slate-800">
          SisFila • {new Date().toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
};