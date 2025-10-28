// Authentication types based on backend implementation

export interface Organization {
  id: number;
  name: string;
}

export interface User {
  id?: string | number;
  email: string;
  username: string;
  organization: Organization | null;
  roles: string[];
  team_id?: number;  // Add team_id field
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  refresh: string;
  user: User;
  message: string;
  organization_access_token?: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  username: string;
  organization_id?: number;
}

export interface RegisterResponse {
  message: string;
}

export interface AuthError {
  error: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
}

// Form validation types
export interface FormValidation {
  email?: string;
  password?: string;
  username?: string;
  confirmPassword?: string;
  organization_id?: string;
  general?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface SsoRedirectParams {
  org: string;
}

export interface SsoCallbackParams {
  code: string;
  state?: string;
} 