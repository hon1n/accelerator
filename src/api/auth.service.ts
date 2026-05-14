import { api } from "./index";
import type { AuthResponse } from "../types/auth";

export const AuthService = {
  /**
   * Вход по логину и паролю
   */
  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>("/api/v1/auth/login", {
      email,
      password,
    });
    return response.data;
  },

  /**
   * Ручное обновление токена
   */
  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>("/api/v1/auth/refresh", {
      refresh_token: refreshToken,
    });
    return response.data;
  },
};
