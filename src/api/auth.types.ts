import type { UserRole } from "./api.types";

export interface LoginRequest {
  login: string;
  password: string;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface AuthTokensResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: string;
  token_type: string;
  role?: UserRole;
  temporary_password?: boolean;
}

export interface ChangeTempPasswordRequest {
  password: string;
}
