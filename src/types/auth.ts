export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  TokenType: string;
}

export interface ErrorResponse {
  error: string;
}
