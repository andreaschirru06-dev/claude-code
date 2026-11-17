import { useRef, type KeyboardEvent } from "react";
import { AlertCircle, CheckCircle2, Loader2, RotateCcw } from "lucide-react";
import type {
  IdeaPipelineStep,
  ProjectCritique,
  ProjectDraft,
  UpdatedProjectPlan,
} from "../types/idea";

const EXAMPLE_IDEA =
  "Vorrei creare un servizio di consegna settimanale di pasti freschi bilanciati per professionisti che lavorano da casa e non hanno tempo di cucinare a pranzo.";

interface IdeaToProjectViewProps {
  idea: string;
  onChangeIdea: (value: string) => void;
  isDeveloping: boolean;
  errorMessage: string | null;
  failedStep: IdeaPipelineStep | null;
  failedStepLabel: string | null;
  draft: ProjectDraft | null;
  critique: ProjectCritique | null;
  updatedPlan: UpdatedProjectPlan | null;
  onDevelopIdea: () => void;
  onRetryFromFailedStep: () => void;
  onClearError: () => void;
}

export function IdeaToProjectView({
  idea,
  onChangeIdea,
  isDeveloping,
  errorMessage,
  failedStep,
  failedStepLabel,
  draft,
  critique,
  updatedPlan,
  onDevelopIdea,
  onRetryFromFailedStep,
  onClearError,
}: IdeaToProjectViewProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const canSubmit = idea.trim().length > 0 && !isDeveloping;
  const hasAnyOutput = Boolean(draft || critique || updatedPlan);

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      if (canSubmit) {
        onDevelopIdea();
      }
    }
  }

  function handleInsertExample() {
    onChangeIdea(EXAMPLE_IDEA);
    onClearError();
    textareaRef.current?.focus();
  }

  return (
    <div id="da-idea" className="space-y-8">
      <div className="space-y-1.5 max-w-2xl">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900 text-balance">
          Da idea a progetto
        </h1>
        <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
          Descrivi un&apos;idea: il sistema genera una prima bozza, la sottopone a una
          revisione critica e produce un piano aggiornato in tre passaggi sequenziali.
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label
            htmlFor="idea-input"
            className="text-sm font-medium text-slate-900"
          >
            La tua idea
          </label>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleInsertExample}
              disabled={isDeveloping}
              className="text-xs font-medium text-blue-700 hover:text-blue-800 hover:underline disabled:opacity-50 py-1 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded"
            >
              Inserisci esempio
            </button>
            {idea.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  onChangeIdea("");
                  onClearError();
                  textareaRef.current?.focus();
                }}
                disabled={isDeveloping}
                className="text-xs font-medium text-slate-500 hover:text-slate-900 disabled:opacity-50 py-1 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded"
              >
                Svuota testo
              </button>
            )}
          </div>
        </div>

        <textarea
          ref={textareaRef}
          id="idea-input"
          rows={4}
          value={idea}
          onChange={(e) => {
            onChangeIdea(e.target.value);
            if (errorMessage) onClearError();
          }}
          onKeyDown={handleKeyDown}
          placeholder="Es: Vorrei lanciare un piccolo servizio di..."
          className="w-full px-3.5 py-3 text-sm sm:text-[15px] leading-relaxed text-slate-900 placeholder:text-slate-400 bg-slate-50/50 focus:bg-white border border-slate-200 focus:border-blue-600 rounded-lg resize-y min-h-[120px] transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600/20"
        />

        <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
          <span className="text-xs text-slate-500 tabular-nums">
            {idea.trim().length} caratteri
            <span className="hidden sm:inline text-slate-400">
              {" "}
              · Ctrl/⌘ + Invio per avviare
            </span>
          </span>

          <button
            type="button"
            onClick={onDevelopIdea}
            disabled={!canSubmit}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 min-h-[44px] text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 disabled:bg-slate-200 disabled:text-slate-500 disabled:cursor-not-allowed rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
          >
            {isDeveloping && (
              <Loader2
                className="w-4 h-4 animate-spin shrink-0"
                aria-hidden="true"
              />
            )}
            <span>{isDeveloping ? "Sviluppo in corso..." : "Sviluppa idea"}</span>
          </button>
        </div>
      </div>

      {isDeveloping && (
        <div
          role="status"
          aria-live="polite"
          className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-3"
        >
          <div className="flex items-center gap-2.5 text-sm font-medium text-slate-900">
            <Loader2
              className="w-4 h-4 text-blue-700 animate-spin shrink-0"
              aria-hidden="true"
            />
            <span>Esecuzione sequenziale dei passaggi sul server...</span>
          </div>
          <ol className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-600">
            <li className="flex items-center gap-2">
              {draft ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
              ) : (
                <span className="font-mono text-slate-400 tabular-nums">01.</span>
              )}
              <span>Pianificatore (Bozza)</span>
            </li>
            <li className="flex items-center gap-2">
              {critique ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
              ) : (
                <span className="font-mono text-slate-400 tabular-nums">02.</span>
              )}
              <span>Revisore (Critica)</span>
            </li>
            <li className="flex items-center gap-2">
              {updatedPlan ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
              ) : (
                <span className="font-mono text-slate-400 tabular-nums">03.</span>
              )}
              <span>Pianificatore (Piano aggiornato)</span>
            </li>
          </ol>
        </div>
      )}

      {errorMessage && failedStep && (
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
                Errore nel {failedStepLabel ?? `passaggio ${failedStep}`}
              </p>
              <p className="text-xs sm:text-sm text-red-800 leading-relaxed">
                {errorMessage}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onRetryFromFailedStep}
            disabled={isDeveloping || idea.trim().length === 0}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 min-h-[40px] text-xs font-medium text-red-900 bg-white hover:bg-red-100/70 disabled:opacity-50 border border-red-300 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
          >
            <RotateCcw className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>Riprova dal passaggio {failedStep}</span>
          </button>
        </div>
      )}

      {hasAnyOutput && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
            {/* Sezione 1: Bozza */}
            <section
              aria-labelledby="sezione-bozza-heading"
              className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col"
            >
              <div className="px-5 sm:px-6 py-4 border-b border-slate-200 flex items-baseline justify-between gap-3">
                <h2
                  id="sezione-bozza-heading"
                  className="text-base font-semibold text-slate-900 tracking-tight"
                >
                  01. Bozza
                </h2>
                <span className="text-xs text-slate-500 whitespace-nowrap">
                  Pianificatore
                </span>
              </div>

              {draft ? (
                <dl className="divide-y divide-slate-200 flex-1">
                  <div className="px-5 sm:px-6 py-4 space-y-1">
                    <dt className="text-xs font-medium text-slate-500">
                      Obiettivo
                    </dt>
                    <dd className="text-sm text-slate-900 leading-relaxed">
                      {draft.obiettivo}
                    </dd>
                  </div>
                  <div className="px-5 sm:px-6 py-4 space-y-1">
                    <dt className="text-xs font-medium text-slate-500">
                      Ipotesi più rischiosa
                    </dt>
                    <dd className="text-sm text-slate-900 leading-relaxed">
                      {draft.ipotesiPiuRischiosa}
                    </dd>
                  </div>
                  <div className="px-5 sm:px-6 py-4 space-y-1">
                    <dt className="text-xs font-medium text-slate-500">
                      Primo esperimento
                    </dt>
                    <dd className="text-sm text-slate-900 leading-relaxed">
                      {draft.primoEsperimento}
                    </dd>
                  </div>
                  <div className="px-5 sm:px-6 py-4 space-y-1">
                    <dt className="text-xs font-medium text-slate-500">
                      Criterio di successo
                    </dt>
                    <dd className="text-sm text-slate-900 leading-relaxed">
                      {draft.criterioDiSuccesso}
                    </dd>
                  </div>
                </dl>
              ) : (
                <div className="px-5 sm:px-6 py-8 text-sm text-slate-500">
                  In attesa della bozza iniziale.
                </div>
              )}
            </section>

            {/* Sezione 2: Critica */}
            <section
              aria-labelledby="sezione-critica-heading"
              className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col"
            >
              <div className="px-5 sm:px-6 py-4 border-b border-slate-200 flex items-baseline justify-between gap-3">
                <h2
                  id="sezione-critica-heading"
                  className="text-base font-semibold text-slate-900 tracking-tight"
                >
                  02. Critica
                </h2>
                <span className="text-xs text-slate-500 whitespace-nowrap">
                  Revisore
                </span>
              </div>

              {critique ? (
                <dl className="divide-y divide-slate-200 flex-1">
                  <div className="px-5 sm:px-6 py-4 space-y-1">
                    <dt className="text-xs font-medium text-slate-500">
                      Punto più debole
                    </dt>
                    <dd className="text-sm text-slate-900 leading-relaxed">
                      {critique.puntoPiuDebole}
                    </dd>
                  </div>
                  <div className="px-5 sm:px-6 py-4 space-y-1">
                    <dt className="text-xs font-medium text-slate-500">
                      Perché conta
                    </dt>
                    <dd className="text-sm text-slate-900 leading-relaxed">
                      {critique.percheConta}
                    </dd>
                  </div>
                  <div className="px-5 sm:px-6 py-4 space-y-1">
                    <dt className="text-xs font-medium text-slate-500">
                      Modifica concreta
                    </dt>
                    <dd className="text-sm text-slate-900 leading-relaxed">
                      {critique.modificaConcreta}
                    </dd>
                  </div>
                </dl>
              ) : (
                <div className="px-5 sm:px-6 py-8 text-sm text-slate-500 flex-1 flex items-center">
                  {failedStep === 2
                    ? "La critica non è stata generata a causa dell'errore nel passaggio 2. Puoi riprovare mantenendo la bozza già ottenuta."
                    : "La critica del Revisore apparirà qui dopo la bozza."}
                </div>
              )}
            </section>
          </div>

          {/* Sezione 3: Piano aggiornato */}
          <section
            aria-labelledby="sezione-piano-heading"
            className="bg-white border border-slate-200 rounded-xl overflow-hidden"
          >
            <div className="px-5 sm:px-6 py-4 border-b border-slate-200 flex items-baseline justify-between gap-3">
              <h2
                id="sezione-piano-heading"
                className="text-base font-semibold text-slate-900 tracking-tight"
              >
                03. Piano aggiornato
              </h2>
              <span className="text-xs text-slate-500 whitespace-nowrap">
                Pianificatore · Revisione completata
              </span>
            </div>

            {updatedPlan ? (
              <div className="p-5 sm:p-6 space-y-6">
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1">
                    <h3 className="text-xs font-medium text-slate-500">
                      Modifica effettuata
                    </h3>
                    <p className="text-sm text-slate-900 leading-relaxed">
                      {updatedPlan.modificaApplicata}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-xs font-medium text-slate-500">
                      Perché è stata fatta
                    </h3>
                    <p className="text-sm text-slate-900 leading-relaxed">
                      {updatedPlan.motivazioneModifica}
                    </p>
                  </div>
                </div>

                <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
                  <div className="space-y-1">
                    <dt className="text-xs font-medium text-slate-500">
                      Obiettivo
                    </dt>
                    <dd className="text-sm text-slate-900 leading-relaxed">
                      {updatedPlan.obiettivo}
                    </dd>
                  </div>
                  <div className="space-y-1">
                    <dt className="text-xs font-medium text-slate-500">
                      Ipotesi più rischiosa
                    </dt>
                    <dd className="text-sm text-slate-900 leading-relaxed">
                      {updatedPlan.ipotesiPiuRischiosa}
                    </dd>
                  </div>
                  <div className="space-y-1">
                    <dt className="text-xs font-medium text-slate-500">
                      Primo esperimento
                    </dt>
                    <dd className="text-sm text-slate-900 leading-relaxed">
                      {updatedPlan.primoEsperimento}
                    </dd>
                  </div>
                  <div className="space-y-1">
                    <dt className="text-xs font-medium text-slate-500">
                      Criterio di successo
                    </dt>
                    <dd className="text-sm text-slate-900 leading-relaxed">
                      {updatedPlan.criterioDiSuccesso}
                    </dd>
                  </div>
                </dl>
              </div>
            ) : (
              <div className="px-5 sm:px-6 py-8 text-sm text-slate-500">
                {failedStep === 3
                  ? "Il piano aggiornato non è stato generato a causa dell'errore nel passaggio 3. Bozza e Critica sono state conservate: premi «Riprova dal passaggio 3» per completare il piano."
                  : "Il piano aggiornato apparirà qui al termine della revisione."}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
