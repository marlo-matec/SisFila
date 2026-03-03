
import { Ticket } from '../types';

export const formatTimeDiff = (ms: number) => {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
};

export const calculateAverageTime = (tickets: Ticket[], type: 'wait' | 'service') => {
  let total = 0;
  let count = 0;

  tickets.forEach(t => {
    if (type === 'wait' && t.calledAt && t.createdAt) {
      total += (t.calledAt - t.createdAt);
      count++;
    } else if (type === 'service' && t.finishedAt && t.startedAt) {
      total += (t.finishedAt - t.startedAt);
      count++;
    }
  });

  if (count === 0) return "0 min";
  return formatTimeDiff(total / count);
};

export const formatWaitTime = (ticket: Ticket) => {
  if (!ticket.calledAt) return '-';
  return formatTimeDiff(ticket.calledAt - ticket.createdAt);
};
