export interface ProposedTask {
  id: string;
  title: string;
  deadline: string;
}

export interface ConfirmedTask {
  id: string;
  title: string;
  deadline: string;
  completed: boolean;
  addedAt: string;
}

export interface ExtractTasksResponse {
  tasks: ProposedTask[];
}
