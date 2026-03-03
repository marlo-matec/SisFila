import { GoogleGenAI } from "@google/genai";
import { Ticket, TicketStatus } from "../types";

// Vite injeta process.env.API_KEY durante o build.
// Se não existir (offline), a classe não deve quebrar o app imediatamente.
const apiKey = process.env.API_KEY || ""; 
let ai: GoogleGenAI | null = null;

if (apiKey) {
    ai = new GoogleGenAI({ apiKey });
}

const MODEL_NAME = 'gemini-2.5-flash';

/**
 * Analisa o histórico de tickets e gera um relatório executivo.
 */
export async function generateQueueReport(tickets: Ticket[], filterContext: string = ""): Promise<string> {
  // OFFLINE CHECK (INTERNET)
  if (!navigator.onLine) {
    return "⚠️ **Sem Conexão com a Internet**\n\nNão é possível gerar a análise com Inteligência Artificial no momento, pois ela requer acesso aos servidores do Google.\n\nO SisFila continua operando normalmente na rede local.";
  }

  if (!ai) {
    return "⚠️ **API Key Não Configurada**\n\nVerifique o arquivo .env no servidor.";
  }

  const finishedTickets = tickets.filter(t => t.status === TicketStatus.FINISHED || t.status === TicketStatus.IN_PROGRESS || t.status === TicketStatus.CALLED || t.status === TicketStatus.NO_SHOW);
  
  if (finishedTickets.length === 0) {
    return "Não foram encontrados atendimentos finalizados para os filtros selecionados.";
  }

  // Prepara os dados brutos para a IA (minimizando tokens desnecessários)
  const dataSummary = JSON.stringify(finishedTickets.map(t => ({
    senha: t.displayId,
    servico: t.serviceName,
    prioridade: t.priority,
    status: t.status === TicketStatus.NO_SHOW ? 'NAO_COMPARECEU' : t.status,
    chamado: t.calledAt ? new Date(t.calledAt).toLocaleTimeString() : null,
    inicio_atendimento: t.startedAt ? new Date(t.startedAt).toLocaleTimeString() : null,
    finalizado: t.finishedAt ? new Date(t.finishedAt).toLocaleTimeString() : null,
    atendente: t.attendantName || "N/A",
    mesa: t.deskNumber || "N/A",
    // Tempo que o cliente esperou desde a criação até ser chamado
    tempo_espera_fila_seg: t.calledAt ? (t.calledAt - t.createdAt) / 1000 : 0,
    // Tempo entre ser chamado e aparecer na mesa (startedAt - calledAt)
    tempo_deslocamento_seg: (t.startedAt && t.calledAt) ? (t.startedAt - t.calledAt) / 1000 : 0,
    // Tempo real de atendimento (Finished - Started)
    duracao_atendimento_seg: (t.finishedAt && t.startedAt) ? (t.finishedAt - t.startedAt) / 1000 : 0
  })));

  const prompt = `
    Aja como um Gerente de Operações Sênior de um centro de atendimento.
    Analise os seguintes dados de atendimento (tickets) em formato JSON e gere um relatório em Markdown.
    
    Contexto do Filtro Aplicado: ${filterContext}
    
    Dados: ${dataSummary}

    O relatório deve ser visualmente rico e conter:
    1. **KPIs Resumidos**: 
       - Total de senhas chamadas.
       - Taxa de Absenteísmo (Não Compareceu).
       - Tempo médio de Espera na Fila (antes de chamar).
       - Tempo médio de Atendimento Real (na mesa) - *Excluir não comparecimentos desta média*.
    2. **Performance**: Se houver dados suficientes, compare a performance (Ex: Atendentes ou Serviços).
    3. **Análise de Demanda**:
       - Qual o Serviço mais procurado?
       - Proporção Normal vs Prioritário.
    4. **Insights Operacionais**: Identifique gargalos ou padrões interessantes.
    
    Importante: Se houver apenas 1 ou 2 registros, forneça uma análise direta desses casos específicos, sem tentar criar estatísticas complexas. Adapte o tom para a quantidade de dados disponível.
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
    });
    return response.text || "Não foi possível gerar o relatório.";
  } catch (error) {
    console.error("Erro ao gerar relatório:", error);
    return "Erro ao conectar com a IA para gerar o relatório. Verifique sua chave de API e conexão.";
  }
}