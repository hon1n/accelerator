export interface UploadTaskData {
  task_name: string;
  description?: string;
  meeting_date?: string;
  summary_prompt: string;
  additional_prompt: string;
  asr_model: string;
  llm_model: string;
  tokens: string;
}

export interface UploadTaskResponse {
  task_id: string;
  status: string;
  original_filename: string;
  file_type: string;
  duration_seconds: number;
  estimated_wait_seconds: number;
  created_at: string;
}
