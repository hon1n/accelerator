export type TaskStatus = "pending" | "processing_transcribe" | "done" | "error" | string;

export interface Pagination {
  page: number;
  limit: number;
  total_items: number;
  total_pages: number;
}

export interface TaskListItem {
  task_id: string;
  original_filename: string;
  status: TaskStatus;
  task_name?: string;
  meeting_date?: string;
  duration_seconds?: number;
}

export interface TasksListResponse {
  tasks: TaskListItem[];
  pagination: Pagination;
}

export interface StageProgress {
  pending: boolean;
  denoising: boolean;
  transcribing: boolean;
  diarizing: boolean;
  summarizing: boolean;
}

export interface TaskResult {
  transcript?: { format: string; url: string };
  summary?: { format: string; url: string };
  speakers?: Array<{ id: string; label: string }>;
}

export interface TaskDetailResponse {
  task_id: string;
  task_name: string;
  description: string;
  meeting_date: string;
  file_name: string;
  duration_seconds: number;
  status: TaskStatus;
  stage_progress: StageProgress;
  created_at: string;
  estimated_completion_seconds?: number;
  completed_at?: string;
  result?: TaskResult;
  metadata?: {
    model_asr: string;
    model_llm: string;
    summary_prompt: string;
    processing_time_sec?: number;
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface UploadTaskParams {
  group_id: string;
  task_name: string;
  description: string;
  meeting_date: string;
  summary_prompt: string;
  asr_model: string;
  llm_model: string;
}
