export interface User {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_login?: string;
}

export enum UserRole {
  ADMIN = 'admin',
  POWER_USER = 'power_user',
  USER = 'user'
}

export interface Script {
  id: string;
  name: string;
  description?: string;
  content: string;
  language: ScriptLanguage;
  category: string;
  requires_elevation: boolean;
  parameters: ScriptParameter[];
  created_by: string;
  created_at: string;
  updated_at: string;
  version: number;
  is_active: boolean;
}

export enum ScriptLanguage {
  POWERSHELL = 'powershell',
  BASH = 'bash',
  ANSIBLE = 'ansible',
  PYTHON = 'python',
  BATCH = 'batch'
}

export interface ScriptParameter {
  name: string;
  type: ParameterType;
  required: boolean;
  description?: string;
  default_value?: string;
  validation_pattern?: string;
}

export enum ParameterType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  FILE = 'file',
  DIRECTORY = 'directory',
  PASSWORD = 'password'
}

export interface ScriptExecution {
  id: string;
  script_id: string;
  executed_by: string;
  parameters: Record<string, any>;
  status: ExecutionStatus;
  output: string;
  error_output?: string;
  exit_code?: number;
  started_at: string;
  completed_at?: string;
  duration?: number;
}

export enum ExecutionStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  details: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  timestamp: string;
}

export interface Permission {
  id: string;
  user_id: string;
  script_id: string;
  can_execute: boolean;
  can_edit: boolean;
  can_delete: boolean;
  granted_by: string;
  granted_at: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface AuthPayload {
  userId: string;
  username: string;
  role: UserRole;
  iat: number;
  exp: number;
}

export interface WebSocketMessage {
  type: string;
  payload: any;
  timestamp: string;
}