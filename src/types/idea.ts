export interface ProjectDraft {
  obiettivo: string;
  ipotesiPiuRischiosa: string;
  primoEsperimento: string;
  criterioDiSuccesso: string;
}

export interface ProjectCritique {
  puntoPiuDebole: string;
  percheConta: string;
  modificaConcreta: string;
}

export interface UpdatedProjectPlan {
  obiettivo: string;
  ipotesiPiuRischiosa: string;
  primoEsperimento: string;
  criterioDiSuccesso: string;
  modificaApplicata: string;
  motivazioneModifica: string;
}

export type IdeaPipelineStep = 1 | 2 | 3;

export interface DevelopIdeaSuccessResponse {
  draft: ProjectDraft;
  critique: ProjectCritique;
  updatedPlan: UpdatedProjectPlan;
}

export interface DevelopIdeaErrorResponse {
  error: string;
  failedStep: IdeaPipelineStep;
  failedStepLabel: string;
  draft: ProjectDraft | null;
  critique: ProjectCritique | null;
  updatedPlan: null;
}
