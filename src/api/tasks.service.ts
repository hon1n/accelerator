import { api } from "./api";
import type { UploadTaskData, UploadTaskResponse } from "./tasks.types";

const TASKS_UPLOAD = "/api/v1/tasks/upload";

export const tasksService = {
  /**
   * Multipart: сначала поле `data` (JSON), затем `audio` (файл) — как требует бекенд.
   */
  upload(audio: File, data: UploadTaskData): Promise<UploadTaskResponse> {
    const formData = new FormData();
    formData.append("data", JSON.stringify(data));
    formData.append("audio", audio);

    return api
      .post<UploadTaskResponse>(TASKS_UPLOAD, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data);
  },
};
