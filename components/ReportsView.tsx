
import React, { useState } from 'react';
import { Ticket, TicketStatus, Service, User, SystemInfo } from '../types';
import { BarChart3, Filter, Calendar, Briefcase, User as UserIcon, Printer, Clock, Users, PieChart, Table, Download } from 'lucide-react';
import { calculateAverageTime, formatWaitTime } from '../utils/timeUtils';

declare const html2pdf: any; // Global declaration for the CDN library

interface ReportsViewProps {
  tickets: Ticket[];
  services: Service[];
  users: User[];
  systemInfo: SystemInfo | null;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ tickets, services, users, systemInfo }) => {
  const [reportData, setReportData] = useState<Ticket[] | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Filters State
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState('all');
  const [selectedAttendant, setSelectedAttendant] = useState('all');

  // --- 1. Geração do Relatório Convencional (Instantâneo) ---
  const handleConsultData = () => {
    
    // Apply Filters
    let filteredTickets = tickets.filter(t => t.status !== TicketStatus.WAITING);

    if (startDate) {
      const start = new Date(startDate + 'T00:00:00').getTime();
      filteredTickets = filteredTickets.filter(t => t.createdAt >= start);
    }
    if (endDate) {
      const end = new Date(endDate + 'T23:59:59').getTime();
      filteredTickets = filteredTickets.filter(t => t.createdAt <= end);
    }
    if (selectedServiceId !== 'all') {
      filteredTickets = filteredTickets.filter(t => t.serviceId === selectedServiceId);
    }
    if (selectedAttendant !== 'all') {
      filteredTickets = filteredTickets.filter(t => t.attendantName === selectedAttendant);
    }

    setReportData(filteredTickets);
  };

  const handlePrint = () => {
    window.print();
  };

  // --- 2. Save as PDF (Using html2pdf) ---
  const handleDownloadPDF = () => {
    const element = document.querySelector('.print-container');
    if (!element) return;
    
    setIsGeneratingPdf(true);

    const opt = {
      margin: 5, // Margem pequena para PDF também
      filename: `Relatorio_SisFila_${new Date().toISOString().slice(0,10)}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    
    html2pdf().set(opt).from(element).save().then(() => {
      setIsGeneratingPdf(false);
    }).catch((err: any) => {
      console.error("PDF Error", err);
      setIsGeneratingPdf(false);
    });
  };

  // --- Helpers for Statistics ---

  const getGroupedStats = (data: Ticket[], key: 'serviceName' | 'attendantName') => {
    const counts = data.reduce((acc, t) => {
      const val = t[key] || 'N/A';
      acc[val] = (acc[val] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  };

  return (
    <div className="report-scroll-container h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto p-4 md:p-6 text-slate-900 dark:text-white transition-colors duration-300">
        <div className="flex items-center justify-between mb-4 no-print">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <BarChart3 className="text-indigo-600 dark:text-indigo-400" size={24} /> Relatórios
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-xs">Consulte estatísticas detalhadas.</p>
          </div>
        </div>

        {/* Filter Section - Hidden on Print */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm mb-6 no-print">
          <div className="flex items-center gap-2 mb-4 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700 pb-2">
            <Filter size={16} /> <span className="text-sm">Filtros de Busca</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide">Data Início</label>
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded px-3 py-2">
                <Calendar size={14} className="text-slate-400" />
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-transparent w-full outline-none text-slate-900 dark:text-white text-xs" />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide">Data Fim</label>
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded px-3 py-2">
                <Calendar size={14} className="text-slate-400" />
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-transparent w-full outline-none text-slate-900 dark:text-white text-xs" />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide">Serviço</label>
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded px-3 py-2">
                <Briefcase size={14} className="text-slate-400" />
                <select value={selectedServiceId} onChange={e => setSelectedServiceId(e.target.value)} className="bg-transparent w-full outline-none text-slate-900 dark:text-white text-xs [&>option]:bg-white [&>option]:text-slate-900 dark:[&>option]:bg-slate-900 dark:[&>option]:text-white">
                  <option value="all">Todos os Serviços</option>
                  {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide">Atendente</label>
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded px-3 py-2">
                <UserIcon size={14} className="text-slate-400" />
                <select value={selectedAttendant} onChange={e => setSelectedAttendant(e.target.value)} className="bg-transparent w-full outline-none text-slate-900 dark:text-white text-xs [&>option]:bg-white [&>option]:text-slate-900 dark:[&>option]:bg-slate-900 dark:[&>option]:text-white">
                  <option value="all">Todos os Atendentes</option>
                  {Array.from(new Set(users.map(u => u.name))).map(name => <option key={name} value={name}>{name}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button 
              onClick={handleConsultData} 
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-6 rounded-lg shadow-sm flex items-center gap-2 transition-all hover:scale-105 active:scale-95 text-xs"
            >
              <Table size={16} /> Consultar Dados
            </button>
          </div>
        </div>

        {/* REPORT OUTPUT AREA - ALWAYS WHITE BACKGROUND FOR CLEAN PDF */}
        {reportData && (
          <div className="print-container bg-white text-black p-4 relative overflow-hidden max-w-[210mm] mx-auto">
            
            {/* WATERMARK - VISIBLE */}
            {systemInfo?.clientLogo && (
               <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.15] z-0">
                  <img src={systemInfo.clientLogo} className="w-1/2 object-contain filter grayscale" />
               </div>
            )}

            {/* Header */}
            <div className="flex justify-between items-start mb-2 border-b-2 border-black pb-2 relative z-10">
              <div className="flex items-center gap-4 w-full">
                 {systemInfo?.clientLogo && (
                    <img src={systemInfo.clientLogo} alt="Logo" className="h-12 object-contain" />
                 )}
                 <div className="flex-1">
                    <h1 className="text-xl font-bold uppercase text-black leading-tight">
                       {systemInfo?.clientName || 'SISFILA GESTÃO DE ATENDIMENTO'}
                    </h1>
                    <div className="text-[9pt] text-slate-600 flex flex-wrap gap-x-3 gap-y-0 leading-tight mt-1">
                        {systemInfo?.clientAddress && <span>{systemInfo.clientAddress}</span>}
                        {systemInfo?.clientCity && <span>• {systemInfo.clientCity}</span>}
                        {systemInfo?.clientPhone && <span>• Tel: {systemInfo.clientPhone}</span>}
                        {systemInfo?.clientEmail && <span>• Email: {systemInfo.clientEmail}</span>}
                    </div>
                    
                    <div className="mt-1 pt-1 border-t border-dotted border-black/30 w-full flex justify-between items-end">
                       <span className="text-[9pt] font-bold">RELATÓRIO DE ATENDIMENTOS</span>
                       <span className="text-[8pt]">Período: {startDate ? new Date(startDate).toLocaleDateString() : 'Início'} a {endDate ? new Date(endDate).toLocaleDateString() : 'Hoje'}</span>
                    </div>
                 </div>
              </div>
              
              <div className="flex gap-2 no-print ml-4">
                <button 
                  onClick={handleDownloadPDF} 
                  disabled={isGeneratingPdf}
                  className="bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded text-xs flex items-center gap-2 font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Salvar arquivo PDF (Download)"
                >
                  <Download size={14} /> {isGeneratingPdf ? 'Gerando...' : 'PDF'}
                </button>
                <button 
                  onClick={handlePrint} 
                  className="bg-slate-200 hover:bg-slate-300 text-slate-800 px-3 py-1.5 rounded text-xs flex items-center gap-2 font-bold transition-colors"
                  title="Abrir caixa de impressão"
                >
                  <Printer size={14} /> Imprimir
                </button>
              </div>
            </div>

            {/* CONTENT BODY - STRICTLY TRANSPARENT/WHITE & BLACK - CONDENSED */}
            <div className="text-[11pt] leading-none relative z-10 text-black">
              
              {/* 1. KPIs Cards - EXTREMELY CONDENSED */}
              <div className="grid grid-cols-2 gap-2 mb-2">
                
                <div className="bg-transparent p-1 rounded border border-gray-400 flex flex-col justify-between h-14">
                  <div className="flex items-center gap-1.5 text-black">
                    <Users size={12} />
                    <h3 className="font-bold text-[8pt] leading-none uppercase">Total Atendimentos</h3>
                  </div>
                  <div>
                    <p className="text-xl font-black text-black leading-none">{reportData.length}</p>
                    <p className="text-[7pt] text-slate-600 leading-none mt-0.5">Registros</p>
                  </div>
                </div>
                
                <div className="bg-transparent p-1 rounded border border-gray-400 flex flex-col justify-between h-14">
                  <div className="flex items-center gap-1.5 text-black">
                    <Clock size={12} />
                    <h3 className="font-bold text-[8pt] leading-none uppercase">T.M. Espera</h3>
                  </div>
                  <div>
                    <p className="text-xl font-black text-black leading-none">
                      {calculateAverageTime(reportData, 'wait')}
                    </p>
                    <p className="text-[7pt] text-slate-600 leading-none mt-0.5">Emissão p/ Chamada</p>
                  </div>
                </div>

              </div>

              {/* 2. Resumo por Categorias - CONDENSED */}
              <div className="grid grid-cols-2 gap-2 mb-2">
                
                {/* Por Serviço */}
                <div className="border border-gray-400 rounded p-1 bg-transparent">
                  <h3 className="font-bold mb-1 flex items-center gap-1 text-black text-[9pt]">
                    <PieChart size={10} /> Resumo por Serviço
                  </h3>
                  <div className="overflow-hidden">
                    <table className="w-full text-[9pt]">
                      <thead>
                        <tr className="bg-transparent text-left border-b border-gray-300">
                          <th className="p-0.5 font-semibold text-black">Serviço</th>
                          <th className="p-0.5 font-semibold text-right text-black">Qtd.</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {getGroupedStats(reportData, 'serviceName').map(([name, count]) => (
                          <tr key={name}>
                            <td className="p-0.5 text-black">{name}</td>
                            <td className="p-0.5 text-right font-bold text-black">{count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Por Atendente */}
                <div className="border border-gray-400 rounded p-1 bg-transparent">
                  <h3 className="font-bold mb-1 flex items-center gap-1 text-black text-[9pt]">
                    <UserIcon size={10} /> Resumo por Atendente
                  </h3>
                  <div className="overflow-hidden">
                    <table className="w-full text-[9pt]">
                      <thead>
                        <tr className="bg-transparent text-left border-b border-gray-300">
                          <th className="p-0.5 font-semibold text-black">Atendente</th>
                          <th className="p-0.5 font-semibold text-right text-black">Qtd.</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {getGroupedStats(reportData, 'attendantName').map(([name, count]) => (
                          <tr key={name}>
                            <td className="p-0.5 text-black">{name}</td>
                            <td className="p-0.5 text-right font-bold text-black">{count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>

              {/* 3. Detailed Table - REORDERED COLUMNS */}
              <div className="mb-0 overflow-x-auto bg-transparent rounded border border-gray-400">
                <table className="w-full text-left border-collapse text-[9pt]">
                  <thead>
                    <tr className="bg-transparent border-b border-gray-400">
                      <th className="p-1 font-bold text-black">Senha</th>
                      <th className="p-1 font-bold text-black">Data/Hora</th>
                      <th className="p-1 font-bold text-black">T. Espera</th>
                      <th className="p-1 font-bold text-black">Serviço</th>
                      <th className="p-1 font-bold text-black">Atendimento</th>
                      <th className="p-1 font-bold text-black">Prioridade</th>
                      <th className="p-1 font-bold text-black">Atendente</th>
                      <th className="p-1 font-bold text-black">Mesa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-300">
                    {reportData.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-2 text-center text-slate-500">Nenhum dado encontrado.</td>
                      </tr>
                    ) : (
                      reportData.map(ticket => (
                        <tr key={ticket.id} className="bg-transparent">
                           <td className="p-0.5 font-bold text-black">{ticket.displayId}</td>
                           <td className="p-0.5 text-black">
                              {new Date(ticket.createdAt).toLocaleDateString()} {new Date(ticket.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                           </td>
                           <td className="p-0.5 text-black">{formatWaitTime(ticket)}</td>
                           <td className="p-0.5 text-black">{ticket.serviceName}</td>
                           <td className="p-0.5 text-black">{ticket.startedAt ? new Date(ticket.startedAt).toLocaleTimeString() : '-'}</td>
                           <td className="p-0.5 text-black">{ticket.priority}</td>
                           <td className="p-0.5 text-black">{ticket.attendantName || '-'}</td>
                           <td className="p-0.5 text-black">{ticket.deskNumber || '-'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            
          </div>
        )}
      </div>
    </div>
  );
};
