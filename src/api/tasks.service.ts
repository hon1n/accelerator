import { api } from './index';
import type { 
  TasksListResponse, 
  TaskDetailResponse, 
  UploadTaskParams 
} from '../types/tasks';

export const TasksService = {
  /**
   * Получение списка задач с пагинацией
   */
  async getTasks(page = 1, limit = 10, groupId?: string): Promise<TasksListResponse> {
    const params: Record<string, any> = { page, limit };
    if (groupId) params.group = groupId;

    const response = await api.get<TasksListResponse>('/api/v1/tasks', { params });
    return response.data;
  },

  /**
   * Получение детальной информации о задаче
   */
  async getTaskById(taskId: string): Promise<TaskDetailResponse> {
    const response = await api.get<TaskDetailResponse>(`/api/v1/tasks/${taskId}`);
    return response.data;
  },

  /**
   * Загрузка аудиофайла и создание задачи (multipart/form-data)
   */
  async uploadTask(file: File, data: UploadTaskParams): Promise<any> {
    const formData = new FormData();
    formData.append('data', JSON.stringify(data));
    formData.append('audio', file);

    const response = await api.post('/api/v1/tasks/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }
};