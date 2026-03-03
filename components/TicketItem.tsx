
import React from 'react';
import { Ticket, TicketStatus } from '../types';
import { Megaphone } from 'lucide-react';
import { TicketBadge } from './TicketBadge';

interface TicketItemProps {
  ticket: Ticket;
  onRecall?: (id: string) => void;
  showAttendant?: boolean;
}

export const TicketItem: React.FC<TicketItemProps> = ({ ticket, onRecall, showAttendant = true }) => {
  return (
    <div className="flex justify-between items-center p-3 rounded-lg border-l-4 border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/30">
      <div>
        <div className="flex items-center gap-2">
          <span className="font-bold text-base text-slate-900 dark:text-white">{ticket.displayId}</span>
          <TicketBadge status={ticket.status} />
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500">
          <span>{ticket.serviceName}</span>
          {showAttendant && ticket.attendantName && (
            <>
              <span>•</span>
              <span className="font-medium text-indigo-500/70">{ticket.attendantName} (Mesa {ticket.deskNumber})</span>
            </>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="text-[10px] text-slate-500">
          {new Date(ticket.finishedAt || ticket.calledAt || 0).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
        </div>
        {onRecall && (ticket.status === TicketStatus.CALLED || ticket.status === TicketStatus.IN_PROGRESS || ticket.status === TicketStatus.NO_SHOW || ticket.status === TicketStatus.FINISHED) && (
          <button 
            onClick={() => onRecall(ticket.id)}
            className="p-1.5 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
            title="Re-chamar na TV"
          >
            <Megaphone size={14} />
          </button>
        )}
      </div>
    </div>
  );
};
