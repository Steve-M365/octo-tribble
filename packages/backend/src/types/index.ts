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

// Admin Dashboard & Telemetry Types
export interface AdminDashboardMetrics {
  system_health: SystemHealthMetrics;
  user_activity: UserActivityMetrics;
  script_metrics: ScriptMetrics;
  service_desk_metrics: ServiceDeskMetrics;
  security_metrics: SecurityMetrics;
  performance_metrics: PerformanceMetrics;
  resource_utilization: ResourceUtilizationMetrics;
  audit_summary: AuditSummaryMetrics;
}

export interface SystemHealthMetrics {
  overall_status: 'healthy' | 'warning' | 'critical' | 'down';
  uptime_percentage: number;
  last_restart: string;
  active_connections: number;
  database_status: 'connected' | 'disconnected' | 'slow';
  external_services_status: ExternalServiceStatus[];
  error_rate: number;
  response_time_avg_ms: number;
}

export interface ExternalServiceStatus {
  service_name: string;
  status: 'up' | 'down' | 'degraded';
  response_time_ms: number;
  last_check: string;
  error_message?: string;
}

export interface UserActivityMetrics {
  total_users: number;
  active_users_today: number;
  active_users_this_week: number;
  new_registrations_today: number;
  login_attempts_today: number;
  failed_login_attempts: number;
  users_by_role: Record<UserRole, number>;
  top_active_users: TopUser[];
  geographic_distribution: GeographicData[];
}

export interface TopUser {
  user_id: string;
  username: string;
  login_count: number;
  script_executions: number;
  last_activity: string;
}

export interface GeographicData {
  country: string;
  user_count: number;
  active_sessions: number;
}

export interface ScriptMetrics {
  total_scripts: number;
  scripts_by_language: Record<ScriptLanguage, number>;
  scripts_by_category: Record<ScriptCategory, number>;
  executions_today: number;
  executions_this_week: number;
  executions_this_month: number;
  success_rate_percentage: number;
  average_execution_time_seconds: number;
  most_executed_scripts: PopularScript[];
  failed_executions_today: number;
  scripts_requiring_elevation: number;
}

export interface PopularScript {
  script_id: string;
  script_name: string;
  execution_count: number;
  success_rate: number;
  average_duration: number;
}

export interface SecurityMetrics {
  security_events_today: number;
  failed_authentication_attempts: number;
  suspicious_activities: number;
  privilege_escalations_today: number;
  audit_log_entries_today: number;
  compliance_score: number;
  security_alerts: SecurityAlert[];
  vulnerability_scan_results: VulnerabilityResult[];
}

export interface SecurityAlert {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  source: string;
  timestamp: string;
  status: 'new' | 'investigating' | 'resolved' | 'false_positive';
  affected_users: string[];
}

export interface VulnerabilityResult {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  component: string;
  description: string;
  remediation: string;
  discovered_at: string;
  status: 'open' | 'in_progress' | 'resolved';
}

export interface PerformanceMetrics {
  avg_response_time_ms: number;
  p95_response_time_ms: number;
  p99_response_time_ms: number;
  requests_per_minute: number;
  error_rate_percentage: number;
  concurrent_users: number;
  database_query_performance: DatabasePerformance;
  cache_hit_rate: number;
  memory_usage_percentage: number;
  cpu_usage_percentage: number;
}

export interface DatabasePerformance {
  avg_query_time_ms: number;
  slow_queries_count: number;
  connection_pool_usage: number;
  deadlocks_count: number;
}

export interface ResourceUtilizationMetrics {
  server_resources: ServerResource[];
  storage_usage: StorageUsage;
  network_traffic: NetworkTraffic;
  scheduled_tasks_status: ScheduledTaskStatus[];
}

export interface ServerResource {
  server_name: string;
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;
  network_io: number;
  status: 'healthy' | 'warning' | 'critical';
}

export interface StorageUsage {
  total_capacity_gb: number;
  used_capacity_gb: number;
  available_capacity_gb: number;
  growth_rate_gb_per_day: number;
  backup_storage_gb: number;
}

export interface NetworkTraffic {
  inbound_mbps: number;
  outbound_mbps: number;
  peak_traffic_time: string;
  bandwidth_utilization_percentage: number;
}

export interface ScheduledTaskStatus {
  task_name: string;
  last_run: string;
  next_run: string;
  status: 'success' | 'failed' | 'running' | 'pending';
  duration_seconds: number;
}

export interface AuditSummaryMetrics {
  total_audit_entries: number;
  entries_today: number;
  critical_actions_today: number;
  compliance_violations: number;
  data_retention_compliance: boolean;
  audit_log_integrity_status: 'verified' | 'compromised' | 'unknown';
}

// Help System Types
export interface HelpArticle {
  id: string;
  title: string;
  content: string;
  category: HelpCategory;
  subcategory?: string;
  tags: string[];
  difficulty_level: 'beginner' | 'intermediate' | 'advanced';
  estimated_read_time_minutes: number;
  target_roles: UserRole[];
  prerequisites: string[];
  related_articles: string[];
  attachments: HelpAttachment[];
  video_url?: string;
  interactive_demo_url?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  version: string;
  view_count: number;
  helpful_votes: number;
  unhelpful_votes: number;
  is_published: boolean;
  is_featured: boolean;
}

export enum HelpCategory {
  GETTING_STARTED = 'getting_started',
  USER_GUIDE = 'user_guide',
  ADMIN_GUIDE = 'admin_guide',
  SCRIPT_DEVELOPMENT = 'script_development',
  TROUBLESHOOTING = 'troubleshooting',
  API_DOCUMENTATION = 'api_documentation',
  SECURITY = 'security',
  INTEGRATIONS = 'integrations',
  BEST_PRACTICES = 'best_practices',
  FAQ = 'faq',
  RELEASE_NOTES = 'release_notes'
}

export interface HelpAttachment {
  id: string;
  filename: string;
  file_type: 'image' | 'video' | 'document' | 'archive';
  file_size_bytes: number;
  storage_path: string;
  description?: string;
  uploaded_at: string;
}

export interface HelpSearchResult {
  article: HelpArticle;
  relevance_score: number;
  matched_sections: string[];
  highlighted_content: string;
}

export interface ContextualHelp {
  page_path: string;
  user_role: UserRole;
  help_items: ContextualHelpItem[];
}

export interface ContextualHelpItem {
  element_selector: string;
  title: string;
  description: string;
  help_type: 'tooltip' | 'popover' | 'modal' | 'inline';
  trigger: 'hover' | 'click' | 'focus' | 'auto';
  position: 'top' | 'bottom' | 'left' | 'right';
  priority: number;
  related_article_id?: string;
}

export interface UserFeedback {
  id: string;
  user_id: string;
  article_id?: string;
  page_path?: string;
  feedback_type: 'helpful' | 'not_helpful' | 'suggestion' | 'bug_report';
  rating: number; // 1-5 stars
  comment: string;
  category: string;
  status: 'new' | 'reviewed' | 'implemented' | 'rejected';
  created_at: string;
  reviewed_by?: string;
  reviewed_at?: string;
  response?: string;
}

export interface HelpAnalytics {
  most_viewed_articles: PopularArticle[];
  search_queries: SearchQuery[];
  user_journey: UserJourneyStep[];
  help_effectiveness: HelpEffectiveness;
}

export interface PopularArticle {
  article_id: string;
  title: string;
  view_count: number;
  helpful_percentage: number;
  average_time_spent_seconds: number;
}

export interface SearchQuery {
  query: string;
  result_count: number;
  click_through_rate: number;
  search_count: number;
}

export interface UserJourneyStep {
  step_name: string;
  page_path: string;
  help_articles_accessed: string[];
  time_spent_seconds: number;
  completion_rate: number;
}

export interface HelpEffectiveness {
  articles_with_high_satisfaction: number;
  articles_needing_improvement: number;
  average_satisfaction_score: number;
  help_ticket_reduction_percentage: number;
}

// Guided Tour Types
export interface GuidedTour {
  id: string;
  name: string;
  description: string;
  target_role: UserRole;
  trigger_condition: 'first_login' | 'feature_access' | 'manual' | 'scheduled';
  steps: TourStep[];
  is_active: boolean;
  completion_rate: number;
  average_completion_time_minutes: number;
  created_at: string;
  updated_at: string;
}

export interface TourStep {
  id: string;
  order: number;
  title: string;
  description: string;
  element_selector: string;
  action_required: boolean;
  action_description?: string;
  highlight_element: boolean;
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
  allow_skip: boolean;
  completion_criteria?: string;
}

export interface TourProgress {
  user_id: string;
  tour_id: string;
  current_step: number;
  completed_steps: number[];
  started_at: string;
  last_activity: string;
  completed_at?: string;
  abandoned: boolean;
}

// Notification System for Help
export interface HelpNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'tip' | 'warning' | 'update' | 'feature';
  target_roles: UserRole[];
  display_conditions: NotificationCondition[];
  priority: 'low' | 'medium' | 'high';
  is_dismissible: boolean;
  auto_dismiss_after_seconds?: number;
  related_article_id?: string;
  created_at: string;
  expires_at?: string;
  is_active: boolean;
}

export interface NotificationCondition {
  condition_type: 'page_visit' | 'feature_usage' | 'time_based' | 'event_triggered';
  condition_value: string;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than';
}

// Sharing and Deep Linking Types
export interface ShareableLink {
  id: string;
  resource_type: ShareableResourceType;
  resource_id: string;
  share_token: string;
  created_by: string;
  created_at: string;
  expires_at?: string;
  access_level: ShareAccessLevel;
  password_protected: boolean;
  password_hash?: string;
  max_uses?: number;
  current_uses: number;
  is_active: boolean;
  title: string;
  description?: string;
  thumbnail_url?: string;
  metadata: ShareMetadata;
  access_log: ShareAccessLog[];
}

export enum ShareableResourceType {
  SCRIPT = 'script',
  SCRIPT_EXECUTION = 'script_execution',
  DIAGNOSTIC_RESULT = 'diagnostic_result',
  SERVICE_TICKET = 'service_ticket',
  HELP_ARTICLE = 'help_article',
  DASHBOARD_VIEW = 'dashboard_view',
  SCRIPT_COLLECTION = 'script_collection',
  EXECUTION_REPORT = 'execution_report',
  AUDIT_REPORT = 'audit_report'
}

export enum ShareAccessLevel {
  VIEW_ONLY = 'view_only',
  EXECUTE = 'execute',
  COMMENT = 'comment',
  EDIT = 'edit'
}

export interface ShareMetadata {
  script_language?: ScriptLanguage;
  script_category?: ScriptCategory;
  execution_status?: ExecutionStatus;
  ticket_priority?: TicketPriority;
  requires_authentication: boolean;
  allowed_domains?: string[];
  allowed_user_roles?: UserRole[];
  custom_parameters?: Record<string, any>;
}

export interface ShareAccessLog {
  id: string;
  share_id: string;
  accessed_by_ip: string;
  accessed_by_user_id?: string;
  accessed_by_email?: string;
  accessed_at: string;
  user_agent: string;
  action_taken: ShareAction;
  success: boolean;
  error_message?: string;
}

export enum ShareAction {
  VIEW = 'view',
  EXECUTE = 'execute',
  DOWNLOAD = 'download',
  COMMENT = 'comment',
  COPY_LINK = 'copy_link',
  SHARE_FORWARD = 'share_forward'
}

export interface ShareRequest {
  resource_type: ShareableResourceType;
  resource_id: string;
  access_level: ShareAccessLevel;
  expires_in_hours?: number;
  password?: string;
  max_uses?: number;
  title?: string;
  description?: string;
  allowed_domains?: string[];
  allowed_user_roles?: UserRole[];
  notify_on_access?: boolean;
  custom_message?: string;
}

export interface ShareResponse {
  share_id: string;
  share_url: string;
  qr_code_url: string;
  short_url: string;
  embed_code?: string;
  expires_at?: string;
  access_instructions: string;
}

// Deep Link Types
export interface DeepLink {
  id: string;
  path: string;
  parameters: Record<string, string>;
  user_context?: UserContext;
  created_at: string;
  expires_at?: string;
  is_temporary: boolean;
}

export interface UserContext {
  user_id?: string;
  role?: UserRole;
  permissions?: string[];
  session_data?: Record<string, any>;
}

// Script Collection for Sharing
export interface ScriptCollection {
  id: string;
  name: string;
  description: string;
  created_by: string;
  script_ids: string[];
  tags: string[];
  is_public: boolean;
  is_featured: boolean;
  category: ScriptCategory;
  created_at: string;
  updated_at: string;
  view_count: number;
  like_count: number;
  download_count: number;
  collaborators: CollectionCollaborator[];
}

export interface CollectionCollaborator {
  user_id: string;
  username: string;
  role: 'viewer' | 'contributor' | 'admin';
  added_at: string;
  added_by: string;
}

// Quick Action Links
export interface QuickActionLink {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  action_type: QuickActionType;
  target_resource_id: string;
  parameters: Record<string, any>;
  requires_confirmation: boolean;
  confirmation_message?: string;
  success_message: string;
  error_message: string;
  is_active: boolean;
  usage_count: number;
  created_by: string;
  created_at: string;
}

export enum QuickActionType {
  EXECUTE_SCRIPT = 'execute_script',
  RUN_DIAGNOSTIC = 'run_diagnostic',
  CREATE_TICKET = 'create_ticket',
  OPEN_HELP_ARTICLE = 'open_help_article',
  NAVIGATE_TO_PAGE = 'navigate_to_page',
  DOWNLOAD_REPORT = 'download_report',
  EXPORT_DATA = 'export_data'
}

// URL Shortener for Better UX
export interface ShortUrl {
  id: string;
  short_code: string;
  original_url: string;
  created_by: string;
  created_at: string;
  expires_at?: string;
  click_count: number;
  last_accessed?: string;
  is_active: boolean;
  custom_domain?: string;
  analytics_enabled: boolean;
}

export interface UrlAnalytics {
  short_url_id: string;
  total_clicks: number;
  unique_visitors: number;
  clicks_by_date: ClicksByDate[];
  referrers: Referrer[];
  geographic_data: GeographicClick[];
  devices: DeviceClick[];
  browsers: BrowserClick[];
}

export interface ClicksByDate {
  date: string;
  clicks: number;
  unique_visitors: number;
}

export interface Referrer {
  domain: string;
  clicks: number;
  percentage: number;
}

export interface GeographicClick {
  country: string;
  country_code: string;
  clicks: number;
  percentage: number;
}

export interface DeviceClick {
  device_type: 'desktop' | 'mobile' | 'tablet';
  clicks: number;
  percentage: number;
}

export interface BrowserClick {
  browser: string;
  version: string;
  clicks: number;
  percentage: number;
}

// Embed System for External Integration
export interface EmbedConfig {
  id: string;
  resource_type: ShareableResourceType;
  resource_id: string;
  embed_type: EmbedType;
  theme: 'light' | 'dark' | 'auto';
  width: string;
  height: string;
  show_header: boolean;
  show_footer: boolean;
  allowed_domains: string[];
  custom_css?: string;
  custom_js?: string;
  created_by: string;
  created_at: string;
  is_active: boolean;
}

export enum EmbedType {
  IFRAME = 'iframe',
  WIDGET = 'widget',
  BUTTON = 'button',
  CARD = 'card',
  MODAL = 'modal'
}

// Social Sharing Integration
export interface SocialShare {
  platform: SocialPlatform;
  share_url: string;
  title: string;
  description: string;
  image_url?: string;
  hashtags?: string[];
  via?: string;
}

export enum SocialPlatform {
  TWITTER = 'twitter',
  LINKEDIN = 'linkedin',
  FACEBOOK = 'facebook',
  SLACK = 'slack',
  TEAMS = 'teams',
  EMAIL = 'email',
  COPY_LINK = 'copy_link'
}

// Collaboration Features
export interface SharedComment {
  id: string;
  share_id: string;
  author_name: string;
  author_email: string;
  content: string;
  created_at: string;
  is_internal: boolean;
  parent_comment_id?: string;
  replies: SharedComment[];
  attachments: CommentAttachment[];
}

export interface CommentAttachment {
  id: string;
  filename: string;
  file_size: number;
  mime_type: string;
  storage_path: string;
  uploaded_at: string;
}

// Share Templates
export interface ShareTemplate {
  id: string;
  name: string;
  description: string;
  resource_type: ShareableResourceType;
  default_access_level: ShareAccessLevel;
  default_expires_hours: number;
  default_message: string;
  require_password: boolean;
  require_email: boolean;
  allowed_domains: string[];
  custom_branding: ShareBranding;
  is_default: boolean;
  created_by: string;
  created_at: string;
}

export interface ShareBranding {
  logo_url?: string;
  brand_color?: string;
  custom_css?: string;
  footer_text?: string;
  header_text?: string;
}