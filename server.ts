import "dotenv/config";
import crypto from "crypto";
import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

interface RawExtractedTask {
  title?: unknown;
  deadline?: unknown;
}

interface CleanExtractedTask {
  id: string;
  title: string;
  deadline: string;
}

interface ProjectDraft {
  obiettivo: string;
  ipotesiPiuRischiosa: string;
  primoEsperimento: string;
  criterioDiSuccesso: string;
}

interface ProjectCritique {
  puntoPiuDebole: string;
  percheConta: string;
  modificaConcreta: string;
}

interface UpdatedProjectPlan {
  obiettivo: string;
  ipotesiPiuRischiosa: string;
  primoEsperimento: string;
  criterioDiSuccesso: string;
  modificaApplicata: string;
  motivazioneModifica: string;
}

type IdeaPipelineStep = 1 | 2 | 3;

interface DevelopIdeaResult {
  draft: ProjectDraft;
  critique: ProjectCritique;
  updatedPlan: UpdatedProjectPlan;
}

class StepExecutionError extends Error {
  failedStep: IdeaPipelineStep;
  failedStepLabel: string;
  causeError: unknown;
  partialDraft: ProjectDraft | null;
  partialCritique: ProjectCritique | null;

  constructor(
    failedStep: IdeaPipelineStep,
    failedStepLabel: string,
    causeError: unknown,
    partialDraft: ProjectDraft | null,
    partialCritique: ProjectCritique | null
  ) {
    super(causeError instanceof Error ? causeError.message : String(causeError));
    this.name = "StepExecutionError";
    this.failedStep = failedStep;
    this.failedStepLabel = failedStepLabel;
    this.causeError = causeError;
    this.partialDraft = partialDraft;
    this.partialCritique = partialCritique;
  }
}

const SYSTEM_INSTRUCTION = `Sei l'assistente di estrazione attività di Personal Project Manager.
Analizza la nota fornita dall'utente e individua ESCLUSIVAMENTE le azioni concrete ancora da svolgere.

Regole rigorose:
1. Estrai SOLO azioni concrete, pratiche e non ancora completate.
2. ESCLUDI categoricamente:
   - Azioni già concluse o svolte (es. "ho già mandato la mail", "abbiamo già inviato il preventivo", "fatto", "pagato ieri", "riunione già conclusa").
   - Idee vaghe, desideri generici, ipotesi o spunti non azionabili (es. "sarebbe bello migliorare il sito", "prima o poi dovremmo pensare al marketing", "idea: fare un podcast").
3. Per ogni azione concreta ancora da svolgere:
   - "title": proponi un titolo chiaro, sintetico e azionabile in italiano senza includere la scadenza nel titolo (es. da "Mandare a Luca la bozza entro venerdì" il titolo è "Mandare a Luca la bozza").
   - "deadline": se nella nota è presente una scadenza per quell'azione, riportala così come è scritta nella nota senza la preposizione introduttiva come "entro" o "per" (es. da "entro venerdì" riporta "venerdì"; da "entro venerdì 22 novembre" riporta "venerdì 22 novembre"; da "domani pomeriggio" riporta "domani pomeriggio"). Non riformattare le date. Se non è presente alcuna scadenza, restituisci una stringa vuota "".
4. Se la nota contiene solo idee vaghe, considerazioni o azioni già concluse, restituisci un array "tasks" vuota.`;

const PLANNER_DRAFT_INSTRUCTION = `Sei il Pianificatore di Personal Project Manager.
Ricevi un'idea di progetto dall'utente e produci una prima bozza pratica e concreta in italiano.
Restituisci esclusivamente JSON strutturato con tutti e quattro i campi obbligatori:
- "obiettivo": risultato concreto e misurabile da raggiungere.
- "ipotesiPiuRischiosa": l'assunzione più incerta da cui dipende il successo dell'idea.
- "primoEsperimento": il primo esperimento minimo e realizzabile in tempi brevi per testare l'ipotesi più rischiosa.
- "criterioDiSuccesso": soglia chiara e osservabile per decidere se l'esperimento ha avuto successo.`;

const REVIEWER_CRITIQUE_INSTRUCTION = `Sei il Revisore critico di Personal Project Manager.
Ricevi l'idea originale dell'utente e la bozza preparata dal Pianificatore.
Individua criticamente ciò che potrebbe far fallire l'esperimento o renderlo poco utile e proponi un miglioramento mirato.

Regola specifica quando l'obiettivo riguarda la verifica della disponibilità a pagare:
- Distingui chiaramente tra interesse dichiarato (complimenti, iscrizioni gratuite o intenzioni verbali), utilizzo effettivo e pagamento reale.
- In "modificaConcreta", proponi sempre un'offerta concreta a un prezzo preciso (es. importo numerico esplicito) e un criterio di successo misurabile basato esclusivamente sui pagamenti effettivi ricevuti.
- Spiega esplicitamente (in "percheConta" o in "modificaConcreta") che il risultato ottenuto vale soltanto per la specifica offerta, il prezzo e il pubblico testati nell'esperimento.

Restituisci esclusivamente JSON strutturato con tutti e tre i campi obbligatori:
- "puntoPiuDebole": la fragilità principale della bozza attuale.
- "percheConta": spiegazione chiara del perché questo punto debole mette a rischio il progetto o l'esperimento.
- "modificaConcreta": un intervento specifico, pratico e immediato da applicare al piano.`;

const PLANNER_REVISION_INSTRUCTION = `Sei il Pianificatore di Personal Project Manager.
Ricevi l'idea originale, la tua bozza iniziale e la critica ricevuta dal Revisore.
Integra la critica in un piano aggiornato migliore e spiega con chiarezza quale modifica hai fatto e perché.
Restituisci esclusivamente JSON strutturato con tutti i campi obbligatori:
- "obiettivo": obiettivo aggiornato.
- "ipotesiPiuRischiosa": ipotesi più rischiosa aggiornata.
- "primoEsperimento": primo esperimento aggiornato tenendo conto della critica.
- "criterioDiSuccesso": criterio di successo aggiornato e verificabile.
- "modificaApplicata": sintesi esplicita di quale modifica hai apportato rispetto alla bozza iniziale.
- "motivazioneModifica": spiegazione chiara del perché hai effettuato quella modifica alla luce della critica.`;

function createGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

function getErrorStatus(err: unknown): number | undefined {
  if (typeof err === "object" && err !== null && "status" in err) {
    const status = (err as { status?: unknown }).status;
    if (typeof status === "number") return status;
  }
  return undefined;
}

function isRetryableError(err: unknown): boolean {
  const status = getErrorStatus(err);
  if (status && status >= 500) return true;
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  return (
    msg.includes("503") ||
    msg.includes("500") ||
    msg.includes("502") ||
    msg.includes("504") ||
    msg.includes("timeout") ||
    msg.includes("econnreset") ||
    msg.includes("fetch failed")
  );
}

function isQuotaError(err: unknown): boolean {
  const status = getErrorStatus(err);
  if (status === 429) return true;
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  return msg.includes("429") || msg.includes("resource_exhausted");
}

async function generateJsonWithQuotaFallback<T>(
  tag: string,
  runCall: (model: string) => Promise<T>
): Promise<T> {
  const models = ["gemini-4-hydrogen", "gemini-3.1-flash-lite"];
  let lastError: unknown;

  for (let m = 0; m < models.length; m++) {
    const model = models[m];
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        return await runCall(model);
      } catch (err) {
        lastError = err;
        if (isQuotaError(err) && m < models.length - 1) {
          console.warn(
            `[${tag}] Quota esaurita per ${model}, passaggio a ${models[m + 1]}.`
          );
          break;
        }
        if (attempt === 0 && isRetryableError(err)) {
          await new Promise((resolve) => setTimeout(resolve, 600));
          continue;
        }
        throw err;
      }
    }
  }

  throw lastError;
}

function nonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function validateProjectDraft(raw: unknown): ProjectDraft | null {
  if (typeof raw !== "object" || raw === null) return null;
  const obj = raw as Record<string, unknown>;
  const obiettivo = nonEmptyString(obj.obiettivo);
  const ipotesiPiuRischiosa = nonEmptyString(obj.ipotesiPiuRischiosa);
  const primoEsperimento = nonEmptyString(obj.primoEsperimento);
  const criterioDiSuccesso = nonEmptyString(obj.criterioDiSuccesso);

  if (!obiettivo || !ipotesiPiuRischiosa || !primoEsperimento || !criterioDiSuccesso) {
    return null;
  }

  return {
    obiettivo,
    ipotesiPiuRischiosa,
    primoEsperimento,
    criterioDiSuccesso,
  };
}

function validateProjectCritique(raw: unknown): ProjectCritique | null {
  if (typeof raw !== "object" || raw === null) return null;
  const obj = raw as Record<string, unknown>;
  const puntoPiuDebole = nonEmptyString(obj.puntoPiuDebole);
  const percheConta = nonEmptyString(obj.percheConta);
  const modificaConcreta = nonEmptyString(obj.modificaConcreta);

  if (!puntoPiuDebole || !percheConta || !modificaConcreta) {
    return null;
  }

  return {
    puntoPiuDebole,
    percheConta,
    modificaConcreta,
  };
}

function validateUpdatedProjectPlan(raw: unknown): UpdatedProjectPlan | null {
  if (typeof raw !== "object" || raw === null) return null;
  const obj = raw as Record<string, unknown>;
  const obiettivo = nonEmptyString(obj.obiettivo);
  const ipotesiPiuRischiosa = nonEmptyString(obj.ipotesiPiuRischiosa);
  const primoEsperimento = nonEmptyString(obj.primoEsperimento);
  const criterioDiSuccesso = nonEmptyString(obj.criterioDiSuccesso);
  const modificaApplicata = nonEmptyString(obj.modificaApplicata);
  const motivazioneModifica = nonEmptyString(obj.motivazioneModifica);

  if (
    !obiettivo ||
    !ipotesiPiuRischiosa ||
    !primoEsperimento ||
    !criterioDiSuccesso ||
    !modificaApplicata ||
    !motivazioneModifica
  ) {
    return null;
  }

  return {
    obiettivo,
    ipotesiPiuRischiosa,
    primoEsperimento,
    criterioDiSuccesso,
    modificaApplicata,
    motivazioneModifica,
  };
}

async function callModelForTasks(
  ai: GoogleGenAI,
  model: string,
  note: string
): Promise<CleanExtractedTask[]> {
  const response = await ai.models.generateContent({
    model,
    contents: `Nota da analizzare:\n"""\n${note}\n"""`,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      thinkingConfig: {
        thinkingLevel: ThinkingLevel.LOW,
      },
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          tasks: {
            type: Type.ARRAY,
            description: "Lista delle sole azioni concrete ancora da svolgere.",
            items: {
              type: Type.OBJECT,
              properties: {
                title: {
                  type: Type.STRING,
                  description:
                    "Titolo chiaro e azionabile dell'attività in italiano, senza la scadenza.",
                },
                deadline: {
                  type: Type.STRING,
                  description:
                    "La scadenza così come è scritta nella nota (senza 'entro'), oppure stringa vuota se assente.",
                },
              },
              required: ["title", "deadline"],
            },
          },
        },
        required: ["tasks"],
      },
    },
  });

  const rawText = (response.text ?? "").trim();
  if (!rawText) {
    throw new Error("EMPTY_MODEL_RESPONSE");
  }

  const parsed = JSON.parse(rawText) as { tasks?: unknown };
  if (!parsed || !Array.isArray(parsed.tasks)) {
    throw new Error("INVALID_MODEL_JSON");
  }

  const cleaned: CleanExtractedTask[] = [];
  for (const item of parsed.tasks as RawExtractedTask[]) {
    const title = typeof item?.title === "string" ? item.title.trim() : "";
    if (!title) continue;
    const rawDeadline =
      typeof item?.deadline === "string" ? item.deadline.trim() : "";
    const deadline = rawDeadline.replace(/^entro\s+/i, "").trim();
    cleaned.push({
      id: crypto.randomUUID(),
      title,
      deadline,
    });
  }

  return cleaned;
}

async function extractTasksFromNote(note: string): Promise<CleanExtractedTask[]> {
  const ai = createGeminiClient();
  if (!ai) {
    throw new Error("MISSING_API_KEY");
  }

  return generateJsonWithQuotaFallback("extract-tasks", (model) =>
    callModelForTasks(ai, model, note)
  );
}

async function callPlannerDraft(
  ai: GoogleGenAI,
  idea: string
): Promise<ProjectDraft> {
  return generateJsonWithQuotaFallback("develop-idea:step1", async (model) => {
    const response = await ai.models.generateContent({
      model,
      contents: `Idea originale dell'utente:\n"""\n${idea}\n"""`,
      config: {
        systemInstruction: PLANNER_DRAFT_INSTRUCTION,
        responseMimeType: "application/json",
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.LOW,
        },
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            obiettivo: {
              type: Type.STRING,
              description: "Obiettivo concreto del progetto.",
            },
            ipotesiPiuRischiosa: {
              type: Type.STRING,
              description: "L'ipotesi più rischiosa da validare.",
            },
            primoEsperimento: {
              type: Type.STRING,
              description: "Il primo esperimento pratico per testare l'ipotesi.",
            },
            criterioDiSuccesso: {
              type: Type.STRING,
              description: "Il criterio osservabile di successo dell'esperimento.",
            },
          },
          required: [
            "obiettivo",
            "ipotesiPiuRischiosa",
            "primoEsperimento",
            "criterioDiSuccesso",
          ],
        },
      },
    });

    const rawText = (response.text ?? "").trim();
    if (!rawText) {
      throw new Error("EMPTY_MODEL_RESPONSE");
    }

    const parsed: unknown = JSON.parse(rawText);
    const validated = validateProjectDraft(parsed);
    if (!validated) {
      throw new Error("INVALID_DRAFT_SCHEMA");
    }
    return validated;
  });
}

async function callReviewerCritique(
  ai: GoogleGenAI,
  idea: string,
  draft: ProjectDraft
): Promise<ProjectCritique> {
  return generateJsonWithQuotaFallback("develop-idea:step2", async (model) => {
    const response = await ai.models.generateContent({
      model,
      contents: `Idea originale dell'utente:\n"""\n${idea}\n"""\n\nBozza del Pianificatore:\n${JSON.stringify(
        draft,
        null,
        2
      )}`,
      config: {
        systemInstruction: REVIEWER_CRITIQUE_INSTRUCTION,
        responseMimeType: "application/json",
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.LOW,
        },
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            puntoPiuDebole: {
              type: Type.STRING,
              description: "Il punto più debole della bozza.",
            },
            percheConta: {
              type: Type.STRING,
              description: "Perché questo punto debole è critico per il progetto.",
            },
            modificaConcreta: {
              type: Type.STRING,
              description: "Modifica concreta suggerita per rafforzare il piano.",
            },
          },
          required: ["puntoPiuDebole", "percheConta", "modificaConcreta"],
        },
      },
    });

    const rawText = (response.text ?? "").trim();
    if (!rawText) {
      throw new Error("EMPTY_MODEL_RESPONSE");
    }

    const parsed: unknown = JSON.parse(rawText);
    const validated = validateProjectCritique(parsed);
    if (!validated) {
      throw new Error("INVALID_CRITIQUE_SCHEMA");
    }
    return validated;
  });
}

async function callPlannerRevision(
  ai: GoogleGenAI,
  idea: string,
  draft: ProjectDraft,
  critique: ProjectCritique
): Promise<UpdatedProjectPlan> {
  return generateJsonWithQuotaFallback("develop-idea:step3", async (model) => {
    const response = await ai.models.generateContent({
      model,
      contents: `Idea originale dell'utente:\n"""\n${idea}\n"""\n\nBozza iniziale:\n${JSON.stringify(
        draft,
        null,
        2
      )}\n\nCritica del Revisore:\n${JSON.stringify(critique, null, 2)}`,
      config: {
        systemInstruction: PLANNER_REVISION_INSTRUCTION,
        responseMimeType: "application/json",
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.LOW,
        },
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            obiettivo: {
              type: Type.STRING,
              description: "Obiettivo del piano aggiornato.",
            },
            ipotesiPiuRischiosa: {
              type: Type.STRING,
              description: "Ipotesi più rischiosa del piano aggiornato.",
            },
            primoEsperimento: {
              type: Type.STRING,
              description: "Primo esperimento rivisto alla luce della critica.",
            },
            criterioDiSuccesso: {
              type: Type.STRING,
              description: "Criterio di successo del piano aggiornato.",
            },
            modificaApplicata: {
              type: Type.STRING,
              description: "Quale modifica è stata apportata rispetto alla bozza.",
            },
            motivazioneModifica: {
              type: Type.STRING,
              description: "Perché è stata fatta questa modifica.",
            },
          },
          required: [
            "obiettivo",
            "ipotesiPiuRischiosa",
            "primoEsperimento",
            "criterioDiSuccesso",
            "modificaApplicata",
            "motivazioneModifica",
          ],
        },
      },
    });

    const rawText = (response.text ?? "").trim();
    if (!rawText) {
      throw new Error("EMPTY_MODEL_RESPONSE");
    }

    const parsed: unknown = JSON.parse(rawText);
    const validated = validateUpdatedProjectPlan(parsed);
    if (!validated) {
      throw new Error("INVALID_UPDATED_PLAN_SCHEMA");
    }
    return validated;
  });
}

async function coordinateIdeaDevelopment(
  idea: string,
  resumeState?: { draft?: unknown; critique?: unknown }
): Promise<DevelopIdeaResult> {
  const ai = createGeminiClient();
  if (!ai) {
    throw new StepExecutionError(
      1,
      "Passaggio 1 — Pianificatore (Bozza)",
      new Error("MISSING_API_KEY"),
      null,
      null
    );
  }

  let draft = validateProjectDraft(resumeState?.draft);
  if (!draft) {
    try {
      draft = await callPlannerDraft(ai, idea);
    } catch (err) {
      throw new StepExecutionError(
        1,
        "Passaggio 1 — Pianificatore (Bozza)",
        err,
        null,
        null
      );
    }
  }

  let critique = validateProjectCritique(resumeState?.critique);
  if (!critique) {
    try {
      critique = await callReviewerCritique(ai, idea, draft);
    } catch (err) {
      throw new StepExecutionError(
        2,
        "Passaggio 2 — Revisore (Critica)",
        err,
        draft,
        null
      );
    }
  }

  try {
    const updatedPlan = await callPlannerRevision(ai, idea, draft, critique);
    return { draft, critique, updatedPlan };
  } catch (err) {
    throw new StepExecutionError(
      3,
      "Passaggio 3 — Pianificatore (Piano aggiornato)",
      err,
      draft,
      critique
    );
  }
}

function mapGeminiErrorResponse(err: unknown, fallbackMessage: string): {
  httpStatus: number;
  error: string;
} {
  const status = getErrorStatus(err);

  if (err instanceof Error && err.message === "MISSING_API_KEY") {
    return {
      httpStatus: 500,
      error:
        "Configurazione Gemini mancante sul server. Verifica la chiave API in Settings > Secrets e riprova.",
    };
  }

  if (isQuotaError(err)) {
    return {
      httpStatus: 429,
      error:
        "Limite di richieste Gemini raggiunto (quota esaurita). Riprova tra qualche minuto oppure configura una chiave con fatturazione in Settings > Secrets.",
    };
  }

  if (status === 400 || status === 403) {
    return {
      httpStatus: status,
      error:
        "Chiave API Gemini non valida o non autorizzata. Verifica la chiave in Settings > Secrets e riprova.",
    };
  }

  return {
    httpStatus: 502,
    error: fallbackMessage,
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "256kb" }));

  app.post("/api/extract-tasks", async (req, res) => {
    const note = typeof req.body?.note === "string" ? req.body.note.trim() : "";

    if (!note) {
      res.status(400).json({
        error: "Inserisci o incolla una nota prima di avviare l'estrazione.",
      });
      return;
    }

    if (note.length > 15000) {
      res.status(400).json({
        error: "La nota è troppo lunga. Riduci il testo entro 15.000 caratteri e riprova.",
      });
      return;
    }

    try {
      const tasks = await extractTasksFromNote(note);
      res.json({ tasks });
    } catch (err) {
      const status = getErrorStatus(err);
      const message = err instanceof Error ? err.message : String(err);
      console.error("[extract-tasks] Extraction failed:", { status, message });

      const mapped = mapGeminiErrorResponse(
        err,
        "Impossibile completare l'estrazione delle attività in questo momento. La tua nota è stata conservata: riprova tra qualche istante."
      );
      res.status(mapped.httpStatus).json({ error: mapped.error });
    }
  });

  app.post("/api/develop-idea", async (req, res) => {
    const idea = typeof req.body?.idea === "string" ? req.body.idea.trim() : "";

    if (!idea) {
      res.status(400).json({
        error: "Scrivi un'idea prima di avviare lo sviluppo del progetto.",
        failedStep: 1,
        failedStepLabel: "Passaggio 1 — Pianificatore (Bozza)",
        draft: null,
        critique: null,
        updatedPlan: null,
      });
      return;
    }

    if (idea.length > 15000) {
      res.status(400).json({
        error: "L'idea è troppo lunga. Riduci il testo entro 15.000 caratteri e riprova.",
        failedStep: 1,
        failedStepLabel: "Passaggio 1 — Pianificatore (Bozza)",
        draft: null,
        critique: null,
        updatedPlan: null,
      });
      return;
    }

    try {
      const result = await coordinateIdeaDevelopment(idea, {
        draft: req.body?.draft,
        critique: req.body?.critique,
      });
      res.json(result);
    } catch (err) {
      if (err instanceof StepExecutionError) {
        const status = getErrorStatus(err.causeError);
        const message =
          err.causeError instanceof Error
            ? err.causeError.message
            : String(err.causeError);
        console.error(`[develop-idea] Failed at step ${err.failedStep}:`, {
          status,
          message,
        });

        const mapped = mapGeminiErrorResponse(
          err.causeError,
          `Errore durante "${err.failedStepLabel}". I risultati già ottenuti sono stati conservati: puoi riprovare da questo passaggio.`
        );

        res.status(mapped.httpStatus).json({
          error: mapped.error,
          failedStep: err.failedStep,
          failedStepLabel: err.failedStepLabel,
          draft: err.partialDraft,
          critique: err.partialCritique,
          updatedPlan: null,
        });
        return;
      }

      console.error("[develop-idea] Unexpected error:", err);
      res.status(502).json({
        error:
          "Si è verificato un errore imprevisto durante lo sviluppo dell'idea.",
        failedStep: 1,
        failedStepLabel: "Passaggio 1 — Pianificatore (Bozza)",
        draft: null,
        critique: null,
        updatedPlan: null,
      });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, "dist");
    app.use(express.static(distDir));
    app.get("/{*path}", (_req, res) => {
      const indexFile = path.join(distDir, "index.html");
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send("Build non trovata.");
      }
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Personal Project Manager server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
