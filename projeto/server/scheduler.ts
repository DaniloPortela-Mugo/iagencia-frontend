import * as dbHelpers from "./db-helpers";
import { searchNewsForClient } from "./news-search";

// Intervalo de verificação em milissegundos (5 minutos)
const CHECK_INTERVAL = 5 * 60 * 1000;

let schedulerInterval: NodeJS.Timeout | null = null;
let isRunning = false;

/**
 * Executa as buscas agendadas que estão pendentes
 */
export async function runDueSearches(): Promise<{
  executed: number;
  successful: number;
  failed: number;
  results: Array<{
    clientId: number;
    status: "success" | "failed";
    newsFound: number;
    newsSaved: number;
    error?: string;
  }>;
}> {
  if (isRunning) {
    console.log("[Scheduler] Already running, skipping...");
    return { executed: 0, successful: 0, failed: 0, results: [] };
  }

  isRunning = true;
  const results: Array<{
    clientId: number;
    status: "success" | "failed";
    newsFound: number;
    newsSaved: number;
    error?: string;
  }> = [];

  try {
    // Buscar agendamentos pendentes
    const dueSearches = await dbHelpers.getDueScheduledSearches();
    
    if (dueSearches.length === 0) {
      console.log("[Scheduler] No due searches found");
      return { executed: 0, successful: 0, failed: 0, results: [] };
    }

    console.log(`[Scheduler] Found ${dueSearches.length} due searches`);

    for (const schedule of dueSearches) {
      const startTime = Date.now();
      
      try {
        console.log(`[Scheduler] Running search for client ${schedule.clientId}`);
        
        // Executar busca de notícias
        const searchResult = await searchNewsForClient(
          schedule.clientId,
          schedule.createdBy,
          schedule.searchQuery || undefined
        );

        const executionTime = Date.now() - startTime;

        // Registrar log de execução
        await dbHelpers.createScheduledSearchLog({
          scheduledSearchId: schedule.id,
          clientId: schedule.clientId,
          status: searchResult.status === "completed" ? "success" : "failed",
          newsFound: searchResult.newsFound.length,
          newsSaved: searchResult.newsSaved,
          executionTimeMs: executionTime,
          errorMessage: searchResult.errorMessage || null,
        });

        // Atualizar agendamento
        await dbHelpers.updateScheduledSearchAfterRun(
          schedule.id,
          searchResult.status === "completed"
        );

        results.push({
          clientId: schedule.clientId,
          status: searchResult.status === "completed" ? "success" : "failed",
          newsFound: searchResult.newsFound.length,
          newsSaved: searchResult.newsSaved,
          error: searchResult.errorMessage,
        });

        console.log(`[Scheduler] Client ${schedule.clientId}: ${searchResult.newsFound.length} found, ${searchResult.newsSaved} saved`);

      } catch (error) {
        const executionTime = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : "Unknown error";

        // Registrar log de falha
        await dbHelpers.createScheduledSearchLog({
          scheduledSearchId: schedule.id,
          clientId: schedule.clientId,
          status: "failed",
          newsFound: 0,
          newsSaved: 0,
          executionTimeMs: executionTime,
          errorMessage,
        });

        // Atualizar agendamento como falha
        await dbHelpers.updateScheduledSearchAfterRun(schedule.id, false);

        results.push({
          clientId: schedule.clientId,
          status: "failed",
          newsFound: 0,
          newsSaved: 0,
          error: errorMessage,
        });

        console.error(`[Scheduler] Error for client ${schedule.clientId}:`, errorMessage);
      }
    }

    const successful = results.filter(r => r.status === "success").length;
    const failed = results.filter(r => r.status === "failed").length;

    console.log(`[Scheduler] Completed: ${successful} successful, ${failed} failed`);

    return {
      executed: results.length,
      successful,
      failed,
      results,
    };

  } finally {
    isRunning = false;
  }
}

/**
 * Inicia o scheduler em background
 */
export function startScheduler() {
  if (schedulerInterval) {
    console.log("[Scheduler] Already started");
    return;
  }

  console.log("[Scheduler] Starting background scheduler...");
  
  // Executar imediatamente na inicialização
  runDueSearches().catch(console.error);

  // Configurar intervalo de verificação
  schedulerInterval = setInterval(() => {
    runDueSearches().catch(console.error);
  }, CHECK_INTERVAL);

  console.log(`[Scheduler] Running every ${CHECK_INTERVAL / 1000 / 60} minutes`);
}

/**
 * Para o scheduler
 */
export function stopScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log("[Scheduler] Stopped");
  }
}

/**
 * Verifica se o scheduler está ativo
 */
export function isSchedulerRunning(): boolean {
  return schedulerInterval !== null;
}
