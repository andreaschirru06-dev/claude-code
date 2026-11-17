import { useState } from "react";
import { Calendar, Check, ClipboardList, Trash2 } from "lucide-react";
import type { ConfirmedTask } from "../types/tasks";

type TaskFilter = "all" | "pending" | "completed";

interface SessionTaskListProps {
  tasks: ConfirmedTask[];
  onToggleTask: (id: string) => void;
  onRemoveTask: (id: string) => void;
  onClearCompleted: () => void;
}

export function SessionTaskList({
  tasks,
  onToggleTask,
  onRemoveTask,
  onClearCompleted,
}: SessionTaskListProps) {
  const [filter, setFilter] = useState<TaskFilter>("all");

  const completedCount = tasks.filter((t) => t.completed).length;
  const pendingCount = tasks.length - completedCount;

  const filteredTasks = tasks.filter((task) => {
    if (filter === "pending") return !task.completed;
    if (filter === "completed") return task.completed;
    return true;
  });

  return (
    <section
      id="lista-attivita"
      aria-labelledby="lista-attivita-heading"
      className="space-y-4"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2
          id="lista-attivita-heading"
          className="text-xl font-semibold text-slate-900 tracking-tight"
        >
          Lista attività
        </h2>

        <p className="text-sm text-slate-500 tabular-nums">
          {tasks.length === 0 ? (
            "0 attività"
          ) : (
            <>
              <span>{pendingCount} da fare</span>
              <span aria-hidden="true"> · </span>
              <span>
                {completedCount}{" "}
                {completedCount === 1 ? "completata" : "completate"}
              </span>
            </>
          )}
        </p>
      </div>

      {tasks.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div
            role="tablist"
            aria-label="Filtra attività"
            className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg"
          >
            <button
              type="button"
              role="tab"
              aria-selected={filter === "all"}
              onClick={() => setFilter("all")}
              className={`px-3 py-1.5 min-h-[36px] text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                filter === "all"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Tutte ({tasks.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={filter === "pending"}
              onClick={() => setFilter("pending")}
              className={`px-3 py-1.5 min-h-[36px] text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                filter === "pending"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Da fare ({pendingCount})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={filter === "completed"}
              onClick={() => setFilter("completed")}
              className={`px-3 py-1.5 min-h-[36px] text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                filter === "completed"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Completate ({completedCount})
            </button>
          </div>

          {completedCount > 0 && (
            <button
              type="button"
              onClick={onClearCompleted}
              className="text-xs font-medium text-slate-600 hover:text-slate-900 px-2.5 py-2 min-h-[40px] rounded-md hover:bg-slate-100 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            >
              Rimuovi completate
            </button>
          )}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {tasks.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <div className="mx-auto w-10 h-10 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center mb-3">
              <ClipboardList className="w-5 h-5" aria-hidden="true" />
            </div>
            <p className="text-sm font-medium text-slate-900">
              Nessuna attività in lista
            </p>
            <p className="mt-1 text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
              Incolla una nota, estrai le azioni e premi Conferma per aggiungerle
              a questa sessione.
            </p>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <p className="text-sm text-slate-600">
              {filter === "pending"
                ? "Nessuna attività da fare rimasta."
                : "Nessuna attività completata in questa sessione."}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-200">
            {filteredTasks.map((task) => (
              <li
                key={task.id}
                className="px-4 sm:px-5 py-3 flex items-start gap-2.5 hover:bg-slate-50/70 transition-colors"
              >
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={task.completed}
                  aria-label={
                    task.completed
                      ? `Segna "${task.title}" come da fare`
                      : `Segna "${task.title}" come completata`
                  }
                  onClick={() => onToggleTask(task.id)}
                  className="min-w-[40px] min-h-[40px] -ml-1.5 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                >
                  <span
                    className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                      task.completed
                        ? "bg-blue-700 border-blue-700 text-white"
                        : "bg-white border-slate-300 text-transparent"
                    }`}
                  >
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" aria-hidden="true" />
                  </span>
                </button>

                <div className="flex-1 min-w-0 pt-2">
                  <p
                    className={`text-sm font-medium leading-snug break-words ${
                      task.completed
                        ? "line-through text-slate-400"
                        : "text-slate-900"
                    }`}
                  >
                    {task.title}
                  </p>

                  {task.deadline && (
                    <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-slate-500">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
                      <span>Scadenza: {task.deadline}</span>
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => onRemoveTask(task.id)}
                  aria-label={`Rimuovi "${task.title}"`}
                  className="min-w-[40px] min-h-[40px] -mr-1.5 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                >
                  <Trash2 className="w-4 h-4" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-xs text-slate-500">
        Elenco salvato temporaneamente per la sessione corrente.
      </p>
    </section>
  );
}
