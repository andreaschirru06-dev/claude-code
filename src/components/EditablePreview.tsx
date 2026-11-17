import { Calendar, Check, Trash2 } from "lucide-react";
import type { ProposedTask } from "../types/tasks";

interface EditablePreviewProps {
  proposals: ProposedTask[];
  onUpdateTitle: (id: string, title: string) => void;
  onUpdateDeadline: (id: string, deadline: string) => void;
  onDiscardOne: (id: string) => void;
  onDiscardAll: () => void;
  onConfirm: () => void;
}

export function EditablePreview({
  proposals,
  onUpdateTitle,
  onUpdateDeadline,
  onDiscardOne,
  onDiscardAll,
  onConfirm,
}: EditablePreviewProps) {
  const validCount = proposals.filter((item) => item.title.trim().length > 0).length;
  const hasInvalidEmptyTitle = proposals.some((item) => item.title.trim().length === 0);

  return (
    <section
      id="anteprima"
      aria-labelledby="anteprima-heading"
      className="bg-white border border-slate-200 rounded-xl overflow-hidden"
    >
      <div className="px-5 sm:px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-2.5 min-w-0">
          <h2
            id="anteprima-heading"
            className="text-base font-semibold text-slate-900 tracking-tight"
          >
            Anteprima modificabile
          </h2>
          <span className="text-xs text-slate-500 tabular-nums whitespace-nowrap">
            <span aria-hidden="true">· </span>
            {proposals.length} {proposals.length === 1 ? "proposta" : "proposte"}
          </span>
        </div>

        <button
          type="button"
          onClick={onDiscardAll}
          className="text-xs font-medium text-slate-600 hover:text-slate-900 px-2.5 py-2 min-h-[40px] rounded-md hover:bg-slate-100 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
        >
          Scarta tutto
        </button>
      </div>

      <ul className="divide-y divide-slate-200">
        {proposals.map((proposal, index) => {
          const isEmptyTitle = proposal.title.trim().length === 0;
          return (
            <li key={proposal.id} className="px-5 sm:px-6 py-4">
              <div className="flex items-start gap-3">
                <span
                  aria-hidden="true"
                  className="font-mono text-xs text-slate-400 tabular-nums pt-2.5 w-5 shrink-0 select-none"
                >
                  {String(index + 1).padStart(2, "0")}
                </span>

                <div className="flex-1 min-w-0 space-y-2.5">
                  <div>
                    <label
                      htmlFor={`proposal-title-${proposal.id}`}
                      className="sr-only"
                    >
                      Titolo attività {index + 1}
                    </label>
                    <input
                      id={`proposal-title-${proposal.id}`}
                      type="text"
                      value={proposal.title}
                      onChange={(e) => onUpdateTitle(proposal.id, e.target.value)}
                      placeholder="Titolo dell'attività..."
                      className={`w-full px-3 py-2 text-sm font-medium text-slate-900 bg-slate-50/70 hover:bg-white focus:bg-white border rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600/20 ${
                        isEmptyTitle
                          ? "border-red-300 focus:border-red-500"
                          : "border-slate-200 focus:border-blue-600"
                      }`}
                    />
                    {isEmptyTitle && (
                      <p className="mt-1 text-xs text-red-600">
                        Inserisci un titolo o scarta questa proposta.
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Calendar
                      className="w-4 h-4 text-slate-400 shrink-0"
                      aria-hidden="true"
                    />
                    <label
                      htmlFor={`proposal-deadline-${proposal.id}`}
                      className="text-xs font-medium text-slate-500 whitespace-nowrap shrink-0"
                    >
                      Scadenza
                    </label>
                    <input
                      id={`proposal-deadline-${proposal.id}`}
                      type="text"
                      value={proposal.deadline}
                      onChange={(e) => onUpdateDeadline(proposal.id, e.target.value)}
                      placeholder="Nessuna scadenza"
                      className="flex-1 min-w-0 px-2.5 py-1.5 text-xs text-slate-700 bg-transparent hover:bg-slate-50 focus:bg-white border border-transparent hover:border-slate-200 focus:border-blue-600 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onDiscardOne(proposal.id)}
                  aria-label={`Scarta "${proposal.title || `proposta ${index + 1}`}"`}
                  className="inline-flex items-center gap-1.5 px-2.5 py-2 min-h-[40px] text-xs font-medium text-slate-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                >
                  <Trash2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span className="hidden sm:inline">Scarta</span>
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="px-5 sm:px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-slate-500">
          Le attività verranno aggiunte alla lista solo dopo la conferma.
        </p>

        <button
          type="button"
          onClick={onConfirm}
          disabled={validCount === 0 || hasInvalidEmptyTitle}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 min-h-[44px] text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
        >
          <Check className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>Conferma</span>
          <span className="font-mono text-xs opacity-90 tabular-nums">
            ({validCount})
          </span>
        </button>
      </div>
    </section>
  );
}
