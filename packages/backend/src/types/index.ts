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
  USER = 'user',
  SERVICE_DESK_AGENT = 'service_desk_agent',
  SERVICE_DESK_MANAGER = 'service_desk_manager'
}

// Service Desk specific types
export interface ServiceTicket {
  id: string;
  ticket_number: string;
  title: string;
  description: string;
  requester_id: string;
  requester_email: string;
  requester_name: string;
  assigned_agent_id?: string;
  priority: TicketPriority;
  status: TicketStatus;
  category: TicketCategory;
  requested_script_id?: string;
  script_parameters?: Record<string, any>;
  execution_id?: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  due_date?: string;
  escalation_level: number;
  internal_notes: TicketNote[];
  customer_communications: TicketNote[];
}

export enum TicketPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
  EMERGENCY = 'emergency'
}

export enum TicketStatus {
  NEW = 'new',
  ASSIGNED = 'assigned',
  IN_PROGRESS = 'in_progress',
  PENDING_APPROVAL = 'pending_approval',
  EXECUTING = 'executing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  ON_HOLD = 'on_hold'
}

export enum TicketCategory {
  USER_ACCOUNT = 'user_account',
  SYSTEM_MAINTENANCE = 'system_maintenance',
  APPLICATION_SUPPORT = 'application_support',
  NETWORK_ISSUE = 'network_issue',
  SECURITY_REQUEST = 'security_request',
  DATA_REQUEST = 'data_request',
  BACKUP_RESTORE = 'backup_restore',
  OTHER = 'other'
}

export interface TicketNote {
  id: string;
  ticket_id: string;
  author_id: string;
  author_name: string;
  content: string;
  is_internal: boolean;
  created_at: string;
  attachments?: TicketAttachment[];
}

export interface TicketAttachment {
  id: string;
  filename: string;
  file_size: number;
  mime_type: string;
  storage_path: string;
  uploaded_by: string;
  uploaded_at: string;
}

export interface ServiceDeskQueue {
  id: string;
  name: string;
  description: string;
  default_assignee_id?: string;
  escalation_rules: EscalationRule[];
  sla_rules: SLARule[];
  allowed_categories: TicketCategory[];
  is_active: boolean;
}

export interface EscalationRule {
  id: string;
  queue_id: string;
  trigger_condition: 'time_based' | 'priority_based' | 'manual';
  escalation_time_hours: number;
  escalate_to_user_id?: string;
  escalate_to_queue_id?: string;
  notification_template: string;
}

export interface SLARule {
  id: string;
  priority: TicketPriority;
  response_time_hours: number;
  resolution_time_hours: number;
  business_hours_only: boolean;
}

// Enhanced script execution for service desk context
export interface ServiceDeskExecution extends ScriptExecution {
  ticket_id?: string;
  approved_by?: string;
  approval_timestamp?: string;
  customer_notification_sent: boolean;
  requires_customer_confirmation: boolean;
  customer_confirmed: boolean;
  customer_confirmation_timestamp?: string;
}

// Service desk dashboard metrics
export interface ServiceDeskMetrics {
  total_tickets: number;
  open_tickets: number;
  tickets_due_today: number;
  overdue_tickets: number;
  avg_resolution_time_hours: number;
  sla_compliance_percentage: number;
  tickets_by_priority: Record<TicketPriority, number>;
  tickets_by_status: Record<TicketStatus, number>;
  agent_workload: AgentWorkload[];
}

export interface AgentWorkload {
  agent_id: string;
  agent_name: string;
  assigned_tickets: number;
  completed_today: number;
  avg_resolution_time: number;
  sla_compliance: number;
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

export enum ScriptCategory {
  GENERAL = 'general',
  USER_MANAGEMENT = 'user_management',
  SYSTEM_MAINTENANCE = 'system_maintenance',
  NETWORK = 'network',
  SECURITY = 'security',
  DIAGNOSTICS = 'diagnostics',
  PERFORMANCE = 'performance',
  BACKUP_RESTORE = 'backup_restore'
}

export enum DiagnosticCategory {
  SYSTEM_INFO = 'system_info',
  NETWORK_DIAGNOSTICS = 'network_diagnostics',
  DISK_HEALTH = 'disk_health',
  MEMORY_ANALYSIS = 'memory_analysis',
  PERFORMANCE_MONITORING = 'performance_monitoring',
  PROCESS_ANALYSIS = 'process_analysis',
  SERVICE_STATUS = 'service_status',
  LOG_ANALYSIS = 'log_analysis',
  CONNECTIVITY_TEST = 'connectivity_test',
  HARDWARE_INFO = 'hardware_info'
}

export interface DiagnosticTool {
  id: string;
  name: string;
  description: string;
  category: DiagnosticCategory;
  supported_platforms: Platform[];
  script_content: string;
  script_language: ScriptLanguage;
  execution_time_estimate: number; // seconds
  requires_elevation: boolean;
  output_format: 'json' | 'text' | 'html' | 'csv';
  parameters: DiagnosticParameter[];
  interpretation_guide: string;
  troubleshooting_steps: TroubleshootingStep[];
  is_built_in: boolean;
  version: string;
  created_at: string;
  updated_at: string;
}

export interface DiagnosticParameter extends ScriptParameter {
  diagnostic_purpose: string;
  common_values: string[];
  impact_on_system: 'none' | 'low' | 'medium' | 'high';
}

export interface TroubleshootingStep {
  condition: string;
  description: string;
  action: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  automated_fix_script_id?: string;
}

export enum Platform {
  WINDOWS_10 = 'windows_10',
  WINDOWS_11 = 'windows_11',
  WINDOWS_SERVER_2016 = 'windows_server_2016',
  WINDOWS_SERVER_2019 = 'windows_server_2019',
  WINDOWS_SERVER_2022 = 'windows_server_2022',
  MACOS_MONTEREY = 'macos_monterey',
  MACOS_VENTURA = 'macos_ventura',
  MACOS_SONOMA = 'macos_sonoma',
  UBUNTU_18_04 = 'ubuntu_18_04',
  UBUNTU_20_04 = 'ubuntu_20_04',
  UBUNTU_22_04 = 'ubuntu_22_04'
}

export interface DiagnosticResult {
  id: string;
  diagnostic_tool_id: string;
  execution_id: string;
  ticket_id?: string;
  platform: Platform;
  raw_output: string;
  parsed_results: DiagnosticData;
  issues_found: DiagnosticIssue[];
  recommendations: DiagnosticRecommendation[];
  executed_by: string;
  executed_at: string;
  execution_duration: number;
}

export interface DiagnosticData {
  summary: Record<string, any>;
  metrics: DiagnosticMetric[];
  status_checks: StatusCheck[];
  resource_usage: ResourceUsage;
}

export interface DiagnosticMetric {
  name: string;
  value: number | string | boolean;
  unit?: string;
  threshold?: {
    warning: number;
    critical: number;
  };
  status: 'healthy' | 'warning' | 'critical' | 'unknown';
}

export interface StatusCheck {
  component: string;
  status: 'running' | 'stopped' | 'error' | 'unknown';
  message: string;
  details?: Record<string, any>;
}

export interface ResourceUsage {
  cpu_percent: number;
  memory_percent: number;
  disk_usage: DiskUsage[];
  network_interfaces: NetworkInterface[];
}

export interface DiskUsage {
  drive: string;
  total_gb: number;
  used_gb: number;
  free_gb: number;
  percent_used: number;
}

export interface NetworkInterface {
  name: string;
  ip_address: string;
  status: 'up' | 'down';
  bytes_sent: number;
  bytes_received: number;
}

export interface DiagnosticIssue {
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  title: string;
  description: string;
  affected_component: string;
  recommended_action: string;
  automated_fix_available: boolean;
  fix_script_id?: string;
}

export interface DiagnosticRecommendation {
  priority: 'low' | 'medium' | 'high';
  category: string;
  title: string;
  description: string;
  implementation_steps: string[];
  estimated_time_minutes: number;
  risk_level: 'low' | 'medium' | 'high';
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