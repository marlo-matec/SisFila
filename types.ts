
export type PriorityType = 'Normal' | 'Prioritário';

export interface Service {
  id: string;
  name: string;
  active: boolean;
}

export type UserRole = 'admin' | 'attendant' | 'totem_tv';

export interface User {
  id: string;
  name: string;
  username: string;
  password: string;
  deskNumber: string;
  serviceId: string; // ID ou '*'
  role: UserRole;
  active: boolean;
}

export enum TicketStatus {
  WAITING = 'waiting',
  CALLED = 'called',
  IN_PROGRESS = 'in_progress',
  FINISHED = 'finished',
  NO_SHOW = 'no_show'
}

export interface Ticket {
  id: string; // UUID
  displayId: string; // Ex: FN001 (Financeiro Normal)
  serviceId: string;
  serviceName: string;
  priority: PriorityType;
  status: TicketStatus;
  createdAt: number;
  calledAt?: number;
  startedAt?: number; // Quando clicou em "Atender"
  finishedAt?: number;
  attendantName?: string;
  deskNumber?: string; // Mesa
  tvPriority?: number;
}

export interface PrinterConfig {
  printerName?: string; // Nome da impressora no SO
  paperWidth: string; // Custom width e.g., "80", "58"
  autoPrint: boolean; 
  fontSize: string;
  ticketTemplate?: string; // HTML personalizado
}

export interface SystemInfo {
  installDate: number;
  trialDaysLeft: number;
  licenseExpiryDate?: number; // Timestamp da validade da chave
  isBlocked: boolean;
  hasLicense: boolean;
  licenseKey: string | null;
  clientName: string;
  clientEmail: string;
  clientDocument: string;
  clientPhone: string;
  clientAddress: string;
  clientCity: string;
  clientLogo: string; // Base64
}

export interface AppState {
  tickets: Ticket[];
  services: Service[];
  users: User[];
  view: 'home' | 'totem' | 'tv' | 'attendant' | 'settings' | 'reports' | 'connection';
}

export const PRIORITY_CONFIG = {
  'Normal': { code: 'N', label: 'Atendimento Normal', color: 'bg-blue-600' },
  'Prioritário': { code: 'P', label: 'Prioritário', color: 'bg-red-600' }
};
