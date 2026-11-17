import { useRef, useState, type KeyboardEvent } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  RotateCcw,
  X,
} from "lucide-react";
import { EditablePreview } from "./components/EditablePreview";
import { IdeaToProjectView } from "./components/IdeaToProjectView";
import { SessionTaskList } from "./components/SessionTaskList";
import type {
  DevelopIdeaErrorResponse,
  DevelopIdeaSuccessResponse,
  IdeaPipelineStep,
  ProjectCritique,
  ProjectDraft,
  UpdatedProjectPlan,
} from "./types/idea";
import type {
  ConfirmedTask,
  ExtractTasksResponse,
  ProposedTask,
} from "./types/tasks";

const EXAMPLE_NOTE = `Aggiornamento progetto sito web:
Ho già inviato il preventivo definitivo a Marco stamattina e ho chiuso la chiamata con il fornitore.
Sarebbe bello prima o poi rifare anche le foto del team o aprire un canale newsletter, vediamo più avanti.
Da fare:
- Preparare le slide di presentazione per il cliente entro venerdì 22 novembre
- Chiamare il commercialista per verificare le fatture di ottobre (domani pomeriggio)
- Aggiornare i testi della pagina Contatti`;

type WorkspaceMode = "notes" | "idea";

export default function App() {
  const [activeMode, setActiveMode] = useState<WorkspaceMode>("notes");

  const [note, setNote] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [emptyResult, setEmptyResult] = useState(false);
  const [proposals, setProposals] = useState<ProposedTask[]>([]);
  const [confirmedTasks, setConfirmedTasks] = useState<ConfirmedTask[]>([]);
  const [addedNotice, setAddedNotice] = useState<string | null>(null);

  const [idea, setIdea] = useState("");
  const [isDeveloping, setIsDeveloping] = useState(false);
  const [ideaError, setIdeaError] = useState<string | null>(null);
  const [failedStep, setFailedStep] = useState<IdeaPipelineStep | null>(null);
  const [failedStepLabel, setFailedStepLabel] = useState<string | null>(null);
  const [draft, setDraft] = useState<ProjectDraft | null>(null);
  const [critique, setCritique] = useState<ProjectCritique | null>(null);
  const [updatedPlan, setUpdatedPlan] = useState<UpdatedProjectPlan | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  async function handleExtract() {
    const trimmed = note.trim();
    if (!trimmed || isExtracting) return;

    setIsExtracting(true);
    setErrorMessage(null);
    setEmptyResult(false);
    setAddedNotice(null);
    setProposals([]);

    try {
      const response = await fetch("/api/extract-tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ note: trimmed }),
      });

      const payload = (await response.json().catch(() => null)) as
        | (ExtractTasksResponse & { error?: string })
        | null;

      if (!response.ok) {
        throw new Error(
          payload?.error ||
            "Si è verificato un errore durante l'estrazione delle attività."
        );
      }

      const extracted = Array.isArray(payload?.tasks) ? payload.tasks : [];

      if (extracted.length === 0) {
        setProposals([]);
        setEmptyResult(true);
      } else {
        setProposals(extracted);
        setEmptyResult(false);
      }
    } catch (err) {
      // Conserva la nota e la eventuale anteprima precedente solo se non in conflitto;
      // la nota rimane sempre intatta nella textarea.
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Connessione non riuscita. La nota è stata conservata: riprova."
      );
    } finally {
      setIsExtracting(false);
    }
  }

  function handleTextareaKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      void handleExtract();
    }
  }

  function handleUpdateTitle(id: string, title: string) {
    setProposals((prev) =>
      prev.map((item) => (item.id === id ? { ...item, title } : item))
    );
  }

  function handleUpdateDeadline(id: string, deadline: string) {
    setProposals((prev) =>
      prev.map((item) => (item.id === id ? { ...item, deadline } : item))
    );
  }

  function handleDiscardProposal(id: string) {
    setProposals((prev) => prev.filter((item) => item.id !== id));
  }

  function handleDiscardAllProposals() {
    setProposals([]);
  }

  function handleConfirmProposals() {
    const valid = proposals
      .map((item) => ({
        ...item,
        title: item.title.trim(),
        deadline: item.deadline.trim(),
      }))
      .filter((item) => item.title.length > 0);

    if (valid.length === 0) return;

    const now = new Date().toISOString();
    const newTasks: ConfirmedTask[] = valid.map((item) => ({
      id: item.id,
      title: item.title,
      deadline: item.deadline,
      completed: false,
      addedAt: now,
    }));

    setConfirmedTasks((prev) => [...newTasks, ...prev]);
    setProposals([]);
    setEmptyResult(false);
    setAddedNotice(
      valid.length === 1
        ? "1 attività aggiunta alla lista."
        : `${valid.length} attività aggiunte alla lista.`
    );
  }

  function handleToggleTask(id: string) {
    setConfirmedTasks((prev) =>
      prev.map((task) =>
        task.id === id ? { ...task, completed: !task.completed } : task
      )
    );
  }

  function handleRemoveTask(id: string) {
    setConfirmedTasks((prev) => prev.filter((task) => task.id !== id));
  }

  function handleClearCompleted() {
    setConfirmedTasks((prev) => prev.filter((task) => !task.completed));
  }

  function handleLoadExample() {
    setNote(EXAMPLE_NOTE);
    setErrorMessage(null);
    setEmptyResult(false);
    setAddedNotice(null);
    textareaRef.current?.focus();
  }

  function handleResetComposer() {
    setNote("");
    setProposals([]);
    setErrorMessage(null);
    setEmptyResult(false);
    setAddedNotice(null);
    textareaRef.current?.focus();
  }

  function handleResetIdea() {
    setIdea("");
    setIdeaError(null);
    setFailedStep(null);
    setFailedStepLabel(null);
    setDraft(null);
    setCritique(null);
    setUpdatedPlan(null);
  }

  async function runDevelopIdea(resumeFromFailedStep: boolean) {
    const trimmed = idea.trim();
    if (!trimmed || isDeveloping) return;

    const currentFailedStep = resumeFromFailedStep ? failedStep : null;
    const preservedDraft =
      resumeFromFailedStep && currentFailedStep && currentFailedStep >= 2
        ? draft
        : null;
    const preservedCritique =
      resumeFromFailedStep && currentFailedStep === 3 ? critique : null;

    setIsDeveloping(true);
    setIdeaError(null);
    setFailedStep(null);
    setFailedStepLabel(null);
    setDraft(preservedDraft);
    setCritique(preservedCritique);
    setUpdatedPlan(null);

    try {
      const response = await fetch("/api/develop-idea", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          idea: trimmed,
          draft: preservedDraft ?? undefined,
          critique: preservedCritique ?? undefined,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | DevelopIdeaSuccessResponse
        | DevelopIdeaErrorResponse
        | null;

      if (!response.ok) {
        const errPayload = payload as DevelopIdeaErrorResponse | null;
        if (errPayload?.draft) setDraft(errPayload.draft);
        if (errPayload?.critique) setCritique(errPayload.critique);
        setUpdatedPlan(null);
        setFailedStep(errPayload?.failedStep ?? currentFailedStep ?? 1);
        setFailedStepLabel(
          errPayload?.failedStepLabel ??
            "Passaggio 1 — Pianificatore (Bozza)"
        );
        setIdeaError(
          errPayload?.error ||
            "Errore durante lo sviluppo dell'idea. Puoi riprovare dal passaggio interrotto."
        );
        return;
      }

      const successPayload = payload as DevelopIdeaSuccessResponse | null;
      if (
        !successPayload?.draft ||
        !successPayload?.critique ||
        !successPayload?.updatedPlan
      ) {
        setFailedStep(1);
        setFailedStepLabel("Passaggio 1 — Pianificatore (Bozza)");
        setIdeaError("Risposta incompleta ricevuta dal server.");
        return;
      }

      setDraft(successPayload.draft);
      setCritique(successPayload.critique);
      setUpdatedPlan(successPayload.updatedPlan);
    } catch {
      setFailedStep(currentFailedStep ?? (preservedCritique ? 3 : preservedDraft ? 2 : 1));
      setFailedStepLabel(
        preservedCritique
          ? "Passaggio 3 — Pianificatore (Piano aggiornato)"
          : preservedDraft
            ? "Passaggio 2 — Revisore (Critica)"
            : "Passaggio 1 — Pianificatore (Bozza)"
      );
      setIdeaError(
        "Connessione non riuscita. I risultati già ottenuti sono stati conservati."
      );
    } finally {
      setIsDeveloping(false);
    }
  }

  const canExtract = note.trim().length > 0 && !isExtracting;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          <button
            type="button"
            onClick={() => setActiveMode("notes")}
            className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded text-left"
          >
            Personal Project Manager
          </button>

          <nav
            aria-label="Funzioni principali"
            className="hidden md:flex items-center gap-6 text-sm font-medium"
          >
            <button
              type="button"
              onClick={() => setActiveMode("notes")}
              aria-current={activeMode === "notes" ? "page" : undefined}
              className={`py-5 border-b-2 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                activeMode === "notes"
                  ? "border-blue-700 text-slate-900"
                  : "border-transparent text-slate-500 hover:text-slate-900"
              }`}
            >
              Da nota ad attività
            </button>
            <button
              type="button"
              onClick={() => setActiveMode("idea")}
              aria-current={activeMode === "idea" ? "page" : undefined}
              className={`py-5 border-b-2 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                activeMode === "idea"
                  ? "border-blue-700 text-slate-900"
                  : "border-transparent text-slate-500 hover:text-slate-900"
              }`}
            >
              Da idea a progetto
            </button>
          </nav>

          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={activeMode === "notes" ? handleResetComposer : handleResetIdea}
              className="px-4 py-2 min-h-[40px] text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200/80 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            >
              {activeMode === "notes" ? "Nuova nota" : "Nuova idea"}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-[1200px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        {/* Selettore funzione per dispositivi mobile */}
        <div className="md:hidden mb-6">
          <div
            role="tablist"
            aria-label="Seleziona funzione"
            className="grid grid-cols-2 gap-1 p-1 bg-slate-200/70 rounded-lg"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeMode === "notes"}
              onClick={() => setActiveMode("notes")}
              className={`px-3 py-2 min-h-[40px] text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                activeMode === "notes"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Da nota ad attività
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeMode === "idea"}
              onClick={() => setActiveMode("idea")}
              className={`px-3 py-2 min-h-[40px] text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                activeMode === "idea"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Da idea a progetto
            </button>
          </div>
        </div>

        {activeMode === "idea" ? (
          <IdeaToProjectView
            idea={idea}
            onChangeIdea={setIdea}
            isDeveloping={isDeveloping}
            errorMessage={ideaError}
            failedStep={failedStep}
            failedStepLabel={failedStepLabel}
            draft={draft}
            critique={critique}
            updatedPlan={updatedPlan}
            onDevelopIdea={() => void runDevelopIdea(false)}
            onRetryFromFailedStep={() => void runDevelopIdea(true)}
            onClearError={() => {
              setIdeaError(null);
              setFailedStep(null);
              setFailedStepLabel(null);
            }}
          />
        ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Colonna principale: Da nota ad attività + Anteprima modificabile */}
          <div id="da-nota" className="lg:col-span-7 space-y-6">
            <div className="space-y-1.5">
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900 text-balance">
                Da nota ad attività
              </h1>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                Incolla una nota per individuare solo le azioni concrete ancora da
                svolgere, modificarle in anteprima e confermarle nella tua lista.
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label
                  htmlFor="note-input"
                  className="text-sm font-medium text-slate-900"
                >
                  Nota
                </label>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleLoadExample}
                    disabled={isExtracting}
                    className="text-xs font-medium text-blue-700 hover:text-blue-800 hover:underline disabled:opacity-50 py-1 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded"
                  >
                    Inserisci esempio
                  </button>
                  {note.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setNote("");
                        setErrorMessage(null);
                        textareaRef.current?.focus();
                      }}
                      disabled={isExtracting}
                      className="text-xs font-medium text-slate-500 hover:text-slate-900 disabled:opacity-50 py-1 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded"
                    >
                      Svuota testo
                    </button>
                  )}
                </div>
              </div>

              <textarea
                ref={textareaRef}
                id="note-input"
                rows={7}
                value={note}
                onChange={(e) => {
                  setNote(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                onKeyDown={handleTextareaKeyDown}
                placeholder="Incolla qui appunti, messaggi, verbali di riunione o promemoria..."
                className="w-full px-3.5 py-3 text-sm sm:text-[15px] leading-relaxed text-slate-900 placeholder:text-slate-400 bg-slate-50/50 focus:bg-white border border-slate-200 focus:border-blue-600 rounded-lg resize-y min-h-[168px] transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600/20"
              />

              <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
                <span className="text-xs text-slate-500 tabular-nums">
                  {note.trim().length} caratteri
                  <span className="hidden sm:inline text-slate-400">
                    {" "}
                    · Ctrl/⌘ + Invio per estrarre
                  </span>
                </span>

                <button
                  type="button"
                  onClick={() => void handleExtract()}
                  disabled={!canExtract}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 min-h-[44px] text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 disabled:bg-slate-200 disabled:text-slate-500 disabled:cursor-not-allowed rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
                >
                  {isExtracting && (
                    <Loader2
                      className="w-4 h-4 animate-spin shrink-0"
                      aria-hidden="true"
                    />
                  )}
                  <span>
                    {isExtracting ? "Estrazione in corso..." : "Estrai attività"}
                  </span>
                </button>
              </div>
            </div>

            {errorMessage && (
              <div
                role="alert"
                className="bg-red-50 border border-red-200 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <AlertCircle
                    className="w-5 h-5 text-red-600 shrink-0 mt-0.5"
                    aria-hidden="true"
                  />
                  <div className="space-y-0.5 min-w-0">
                    <p className="text-sm font-semibold text-red-900">
                      Estrazione non riuscita
                    </p>
                    <p className="text-xs sm:text-sm text-red-800 leading-relaxed">
                      {errorMessage}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => void handleExtract()}
                  disabled={isExtracting}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 min-h-[40px] text-xs font-medium text-red-900 bg-white hover:bg-red-100/70 border border-red-300 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
                >
                  <RotateCcw className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>Riprova</span>
                </button>
              </div>
            )}

            {emptyResult && (
              <div
                role="status"
                className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6"
              >
                <p className="text-base font-semibold text-slate-900">
                  Nessuna attività da aggiungere
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  La nota contiene solo idee vaghe o azioni già concluse. Modifica
                  il testo se vuoi provare con un nuovo contenuto.
                </p>
              </div>
            )}

            {proposals.length > 0 && (
              <EditablePreview
                proposals={proposals}
                onUpdateTitle={handleUpdateTitle}
                onUpdateDeadline={handleUpdateDeadline}
                onDiscardOne={handleDiscardProposal}
                onDiscardAll={handleDiscardAllProposals}
                onConfirm={handleConfirmProposals}
              />
            )}

            {addedNotice && (
              <div
                role="status"
                className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2.5 text-sm font-medium text-emerald-900">
                  <CheckCircle2
                    className="w-4 h-4 text-emerald-700 shrink-0"
                    aria-hidden="true"
                  />
                  <span>{addedNotice}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setAddedNotice(null)}
                  aria-label="Chiudi avviso"
                  className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-md text-emerald-700 hover:bg-emerald-100 transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            )}
          </div>

          {/* Colonna destra: Lista attività della sessione */}
          <div className="lg:col-span-5">
            <SessionTaskList
              tasks={confirmedTasks}
              onToggleTask={handleToggleTask}
              onRemoveTask={handleRemoveTask}
              onClearCompleted={handleClearCompleted}
            />
          </div>
        </div>
        )}
      </main>
    </div>
  );
}
