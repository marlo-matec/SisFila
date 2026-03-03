
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Ticket, Service, PriorityType, PrinterConfig, SystemInfo } from '../types';
import { Printer, ArrowLeft, Accessibility, Users } from 'lucide-react';

interface TotemViewProps {
  services: Service[];
  onIssueTicket: (serviceId: string, priority: PriorityType) => void;
  lastTicket: Ticket | null;
  printerConfig: PrinterConfig | null;
  systemInfo: SystemInfo | null;
}

type Step = 'priority' | 'service';

export const TotemView: React.FC<TotemViewProps> = ({ services, onIssueTicket, lastTicket, printerConfig, systemInfo }) => {
  const [step, setStep] = useState<Step>('priority');
  const [selectedPriority, setSelectedPriority] = useState<PriorityType | null>(null);

  const handlePrioritySelect = (priority: PriorityType) => {
    setSelectedPriority(priority);
    setStep('service');
  };

  const handleServiceSelect = (serviceId: string) => {
    if (selectedPriority) {
      onIssueTicket(serviceId, selectedPriority);
      // Reset view after small delay
      setTimeout(() => {
        setStep('priority');
        setSelectedPriority(null);
      }, 500);
    }
  };

  const handleBack = () => {
    setStep('priority');
    setSelectedPriority(null);
  };
  
  const triggerPrint = () => {
    if (!lastTicket) return;

    // Client-side printing using window.print()
    window.print();
  }

  // Handle Auto Print Logic
  useEffect(() => {
    if (lastTicket && printerConfig?.autoPrint) {
      // Delay to ensure Portal has rendered the content
      const timer = setTimeout(() => {
        triggerPrint();
      }, 1000); 
      return () => clearTimeout(timer);
    }
  }, [lastTicket, printerConfig]);

  // Ticket Receipt Template for Printing
  const renderPrintableTicket = () => {
    if (!lastTicket) return null;

    const date = new Date(lastTicket.createdAt);
    const scale = parseInt(printerConfig?.fontSize || '2') || 2;
    const passwordFontSize = 40 + (scale * 10);
    const widthMm = parseInt(String(printerConfig?.paperWidth || '80').replace(/\D/g, '')) || 80;

    // Default template if none is provided in config
    const DEFAULT_TEMPLATE = `
      <html>
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
      </html>
    `;

    let html = printerConfig?.ticketTemplate || DEFAULT_TEMPLATE;

    // Replace placeholders
    const logoHtml = systemInfo?.clientLogo 
      ? `<img src="${systemInfo.clientLogo}" class="logo" alt="Logo" />` 
      : '';
    
    html = html
      .replace('{{LOGO}}', logoHtml)
      .replace('{{EMPRESA}}', systemInfo?.clientName || 'SISFILA')
      .replace('{{SENHA}}', lastTicket.displayId)
      .replace('{{SERVICO}}', lastTicket.serviceName)
      .replace('{{PRIORIDADE}}', lastTicket.priority)
      .replace('{{DATA}}', date.toLocaleDateString('pt-BR'))
      .replace('{{HORA}}', date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }))
      .replace('{{FONT_SIZE_PX}}', String(passwordFontSize));

    const ticketContent = (
      <div 
        className="ticket-receipt" 
        style={{ width: `${widthMm}mm` }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );

    const printRoot = document.getElementById('print-root');
    if (!printRoot) return null;

    return createPortal(ticketContent, printRoot);
  };

  // If a ticket was just issued, show the success screen overlay
  if (lastTicket) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white p-8">
         {/* Portal Area (Rendered into #print-root) */}
         {renderPrintableTicket()}

         <div className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-12 rounded-3xl shadow-2xl text-center max-w-lg w-full border-4 border-indigo-500 no-print">
          <p className="text-xl text-slate-500 uppercase tracking-wide mb-4 font-bold">Sua Senha</p>
          <div className="text-8xl font-black mb-6 tracking-tighter">{lastTicket.displayId}</div>
          <div className="space-y-2">
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">{lastTicket.serviceName}</p>
            <p className={`text-lg font-medium inline-block px-4 py-1 rounded-full ${lastTicket.priority === 'Prioritário' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'}`}>
              {lastTicket.priority}
            </p>
          </div>
          
          {printerConfig?.autoPrint ? (
            <p className="text-sm text-slate-400 mt-8 animate-pulse">Imprimindo...</p>
          ) : (
            <button 
               onClick={triggerPrint}
               className="mt-8 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-8 rounded-xl shadow-lg flex items-center justify-center gap-2 mx-auto"
            >
               <Printer size={20} /> Imprimir Senha
            </button>
          )}
          
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-4">{new Date(lastTicket.createdAt).toLocaleString()}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white p-8 transition-colors duration-300">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        {step === 'service' ? (
          <button onClick={handleBack} className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors bg-white dark:bg-slate-800 shadow px-6 py-3 rounded-xl border border-slate-200 dark:border-slate-700">
             <ArrowLeft /> Voltar
          </button>
        ) : <div />}
        <h1 className="text-3xl font-bold text-slate-700 dark:text-slate-300">Retire sua Senha</h1>
      </div>

      <div className="flex-1 flex flex-col justify-center max-w-6xl mx-auto w-full">
        
        {step === 'priority' && (
          <div className="space-y-8">
             <h2 className="text-5xl font-bold text-center mb-12 text-slate-800 dark:text-white">Escolha o Tipo de Atendimento</h2>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <button
                  onClick={() => handlePrioritySelect('Normal')}
                  className="bg-blue-600 hover:bg-blue-500 h-80 rounded-3xl shadow-2xl flex flex-col items-center justify-center gap-6 transition-all transform hover:-translate-y-2 border-4 border-transparent hover:border-white/20 text-white"
                >
                  <Users size={80} className="text-white/90" />
                  <span className="text-4xl font-bold">Normal</span>
                </button>
                <button
                  onClick={() => handlePrioritySelect('Prioritário')}
                  className="bg-red-600 hover:bg-red-500 h-80 rounded-3xl shadow-2xl flex flex-col items-center justify-center gap-6 transition-all transform hover:-translate-y-2 border-4 border-transparent hover:border-white/20 text-white"
                >
                  <Accessibility size={80} className="text-white/90" />
                  <span className="text-4xl font-bold">Prioritário</span>
                  <span className="text-sm opacity-75 max-w-xs text-center px-4">Gestantes, Idosos, PCD, Autistas</span>
                </button>
             </div>
          </div>
        )}

        {step === 'service' && (
          <div className="space-y-8">
            <h2 className="text-4xl font-bold text-center mb-8 text-slate-900 dark:text-white">
              <span className="text-slate-500 dark:text-slate-400">Atendimento {selectedPriority}</span>
              <br/>
              Selecione o Serviço
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {services.map((service) => (
                <button
                  key={service.id}
                  onClick={() => handleServiceSelect(service.id)}
                  className="bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 h-48 rounded-2xl shadow-lg flex flex-col items-center justify-center gap-4 transition-all border border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-400 group"
                >
                  <Printer size={40} className="text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-white" />
                  <span className="text-2xl font-bold text-slate-700 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-white text-center px-4">{service.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
