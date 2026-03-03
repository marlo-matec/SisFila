
import React from 'react';
import { TicketStatus } from '../types';

interface TicketBadgeProps {
  status: TicketStatus;
  variant?: 'standard' | 'bold';
}

export const TicketBadge: React.FC<TicketBadgeProps> = ({ status, variant = 'standard' }) => {
  const getStatusStyles = () => {
    if (variant === 'bold') {
      switch (status) {
        case TicketStatus.FINISHED:
          return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/40';
        case TicketStatus.NO_SHOW:
          return 'bg-red-500/10 text-red-400 border-red-500/40';
        case TicketStatus.CALLED:
          return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/40 animate-pulse';
        case TicketStatus.IN_PROGRESS:
          return 'bg-blue-500/10 text-blue-400 border-blue-500/40';
        default:
          return 'bg-slate-500/10 text-slate-400 border-slate-500/40';
      }
    }

    switch (status) {
      case TicketStatus.FINISHED:
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800';
      case TicketStatus.NO_SHOW:
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800';
      case TicketStatus.CALLED:
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800';
      case TicketStatus.IN_PROGRESS:
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800';
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700';
    }
  };

  const getStatusLabel = () => {
    switch (status) {
      case TicketStatus.FINISHED:
        return variant === 'bold' ? 'ATENDIDA' : 'OK';
      case TicketStatus.NO_SHOW:
        return 'AUSENTE';
      case TicketStatus.CALLED:
        return 'CHAMANDO';
      case TicketStatus.IN_PROGRESS:
        return 'EM ATENDIMENTO';
      case TicketStatus.WAITING:
        return 'AGUARDANDO';
      default:
        return status;
    }
  };

  const baseClasses = variant === 'bold' 
    ? 'text-2xl font-black px-6 py-2 rounded-full border-2' 
    : 'text-[9px] px-1.5 py-0.5 rounded font-bold border';

  return (
    <span className={`${baseClasses} ${getStatusStyles()}`}>
      {getStatusLabel()}
    </span>
  );
};
