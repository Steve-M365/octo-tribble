import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import { UserRole } from '../types';

class Database {
  private db: sqlite3.Database;
  
  constructor(dbPath: string) {
    // Ensure directory exists
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    this.db = new sqlite3.Database(dbPath);
  }

  async run(sql: string, params: any[] = []): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async get<T>(sql: string, params: any[] = []): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row as T);
      });
    });
  }

  async all<T>(sql: string, params: any[] = []): Promise<T[]> {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows as T[]);
      });
    });
  }

  close(): void {
    this.db.close();
  }
}

let database: Database;

export function getDatabase(): Database {
  if (!database) {
    const dbPath = process.env.DATABASE_PATH || './data/database.sqlite';
    database = new Database(dbPath);
  }
  return database;
}

export async function initializeDatabase(): Promise<void> {
  const db = getDatabase();
  
  try {
    // Create tables
    await createTables(db);
    
    // Create default admin user if none exists
    await createDefaultAdmin(db);
    
    logger.info('Database initialized successfully');
  } catch (error) {
    logger.error('Database initialization failed:', error);
    throw error;
  }
}

async function createTables(db: Database): Promise<void> {
  // Users table
  await db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login DATETIME
    )
  `);

  // Scripts table
  await db.run(`
    CREATE TABLE IF NOT EXISTS scripts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      content TEXT NOT NULL,
      language TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'general',
      requires_elevation BOOLEAN DEFAULT 0,
      parameters TEXT DEFAULT '[]',
      created_by TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      version INTEGER DEFAULT 1,
      is_active BOOLEAN DEFAULT 1,
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `);

  // Script executions table
  await db.run(`
    CREATE TABLE IF NOT EXISTS script_executions (
      id TEXT PRIMARY KEY,
      script_id TEXT NOT NULL,
      executed_by TEXT NOT NULL,
      parameters TEXT DEFAULT '{}',
      status TEXT NOT NULL DEFAULT 'pending',
      output TEXT DEFAULT '',
      error_output TEXT,
      exit_code INTEGER,
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      duration INTEGER,
      FOREIGN KEY (script_id) REFERENCES scripts(id),
      FOREIGN KEY (executed_by) REFERENCES users(id)
    )
  `);

  // Permissions table
  await db.run(`
    CREATE TABLE IF NOT EXISTS permissions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      script_id TEXT NOT NULL,
      can_execute BOOLEAN DEFAULT 1,
      can_edit BOOLEAN DEFAULT 0,
      can_delete BOOLEAN DEFAULT 0,
      granted_by TEXT NOT NULL,
      granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (script_id) REFERENCES scripts(id),
      FOREIGN KEY (granted_by) REFERENCES users(id),
      UNIQUE(user_id, script_id)
    )
  `);

  // Audit logs table
  await db.run(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      action TEXT NOT NULL,
      resource_type TEXT NOT NULL,
      resource_id TEXT,
      details TEXT DEFAULT '{}',
      ip_address TEXT,
      user_agent TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Service desk tickets table
  await db.run(`
    CREATE TABLE IF NOT EXISTS service_tickets (
      id TEXT PRIMARY KEY,
      ticket_number TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      requester_id TEXT,
      requester_email TEXT NOT NULL,
      requester_name TEXT NOT NULL,
      assigned_agent_id TEXT,
      priority TEXT NOT NULL DEFAULT 'medium',
      status TEXT NOT NULL DEFAULT 'new',
      category TEXT NOT NULL DEFAULT 'other',
      requested_script_id TEXT,
      script_parameters TEXT DEFAULT '{}',
      execution_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      resolved_at DATETIME,
      due_date DATETIME,
      escalation_level INTEGER DEFAULT 0,
      FOREIGN KEY (requester_id) REFERENCES users(id),
      FOREIGN KEY (assigned_agent_id) REFERENCES users(id),
      FOREIGN KEY (requested_script_id) REFERENCES scripts(id),
      FOREIGN KEY (execution_id) REFERENCES script_executions(id)
    )
  `);

  // Ticket notes table
  await db.run(`
    CREATE TABLE IF NOT EXISTS ticket_notes (
      id TEXT PRIMARY KEY,
      ticket_id TEXT NOT NULL,
      author_id TEXT NOT NULL,
      author_name TEXT NOT NULL,
      content TEXT NOT NULL,
      is_internal BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (ticket_id) REFERENCES service_tickets(id),
      FOREIGN KEY (author_id) REFERENCES users(id)
    )
  `);

  // Ticket attachments table
  await db.run(`
    CREATE TABLE IF NOT EXISTS ticket_attachments (
      id TEXT PRIMARY KEY,
      ticket_id TEXT NOT NULL,
      note_id TEXT,
      filename TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      mime_type TEXT NOT NULL,
      storage_path TEXT NOT NULL,
      uploaded_by TEXT NOT NULL,
      uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (ticket_id) REFERENCES service_tickets(id),
      FOREIGN KEY (note_id) REFERENCES ticket_notes(id),
      FOREIGN KEY (uploaded_by) REFERENCES users(id)
    )
  `);

  // Service desk queues table
  await db.run(`
    CREATE TABLE IF NOT EXISTS service_desk_queues (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      default_assignee_id TEXT,
      allowed_categories TEXT DEFAULT '[]',
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (default_assignee_id) REFERENCES users(id)
    )
  `);

  // SLA rules table
  await db.run(`
    CREATE TABLE IF NOT EXISTS sla_rules (
      id TEXT PRIMARY KEY,
      queue_id TEXT NOT NULL,
      priority TEXT NOT NULL,
      response_time_hours INTEGER NOT NULL,
      resolution_time_hours INTEGER NOT NULL,
      business_hours_only BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (queue_id) REFERENCES service_desk_queues(id)
    )
  `);

  // Escalation rules table
  await db.run(`
    CREATE TABLE IF NOT EXISTS escalation_rules (
      id TEXT PRIMARY KEY,
      queue_id TEXT NOT NULL,
      trigger_condition TEXT NOT NULL DEFAULT 'time_based',
      escalation_time_hours INTEGER NOT NULL,
      escalate_to_user_id TEXT,
      escalate_to_queue_id TEXT,
      notification_template TEXT,
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (queue_id) REFERENCES service_desk_queues(id),
      FOREIGN KEY (escalate_to_user_id) REFERENCES users(id),
      FOREIGN KEY (escalate_to_queue_id) REFERENCES service_desk_queues(id)
    )
  `);

  // Create indexes for better performance
  await db.run(`CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)`);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_scripts_created_by ON scripts(created_by)`);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_scripts_language ON scripts(language)`);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_executions_script_id ON script_executions(script_id)`);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_executions_executed_by ON script_executions(executed_by)`);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_audit_user_id ON audit_logs(user_id)`);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp)`);
  
  // Service desk indexes
  await db.run(`CREATE INDEX IF NOT EXISTS idx_tickets_status ON service_tickets(status)`);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_tickets_assigned_agent ON service_tickets(assigned_agent_id)`);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_tickets_requester ON service_tickets(requester_email)`);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_tickets_priority ON service_tickets(priority)`);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON service_tickets(created_at)`);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_ticket_notes_ticket_id ON ticket_notes(ticket_id)`);

          // Security-related tables
        await db.run(`
          CREATE TABLE IF NOT EXISTS refresh_tokens (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            token TEXT UNIQUE NOT NULL,
            expires_at DATETIME NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_used_at DATETIME,
            ip_address TEXT NOT NULL,
            user_agent TEXT NOT NULL,
            is_revoked BOOLEAN DEFAULT 0,
            FOREIGN KEY (user_id) REFERENCES users(id)
          )
        `);

        await db.run(`
          CREATE TABLE IF NOT EXISTS login_attempts (
            id TEXT PRIMARY KEY,
            username TEXT NOT NULL,
            ip_address TEXT NOT NULL,
            user_agent TEXT NOT NULL,
            success BOOLEAN NOT NULL,
            failure_reason TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        await db.run(`
          CREATE TABLE IF NOT EXISTS script_signatures (
            id TEXT PRIMARY KEY,
            script_id TEXT NOT NULL,
            hash TEXT NOT NULL,
            algorithm TEXT NOT NULL,
            signed_by TEXT NOT NULL,
            signature_data TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            is_valid BOOLEAN DEFAULT 1,
            FOREIGN KEY (script_id) REFERENCES scripts(id),
            FOREIGN KEY (signed_by) REFERENCES users(id)
          )
        `);

        await db.run(`
          CREATE TABLE IF NOT EXISTS security_scans (
            id TEXT PRIMARY KEY,
            script_id TEXT NOT NULL,
            scan_type TEXT NOT NULL,
            security_score INTEGER NOT NULL,
            risk_count INTEGER NOT NULL,
            is_secure BOOLEAN NOT NULL,
            scan_results TEXT NOT NULL,
            scanned_by TEXT NOT NULL,
            scanned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (script_id) REFERENCES scripts(id),
            FOREIGN KEY (scanned_by) REFERENCES users(id)
          )
        `);

        await db.run(`
          CREATE TABLE IF NOT EXISTS api_keys (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            name TEXT NOT NULL,
            key_hash TEXT UNIQUE NOT NULL,
            permissions TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            expires_at DATETIME,
            last_used_at DATETIME,
            is_active BOOLEAN DEFAULT 1,
            FOREIGN KEY (user_id) REFERENCES users(id)
          )
        `);

        // Sharing system tables
        await db.run(`
          CREATE TABLE IF NOT EXISTS shareable_links (
            id TEXT PRIMARY KEY,
            resource_type TEXT NOT NULL,
            resource_id TEXT NOT NULL,
            share_token TEXT UNIQUE NOT NULL,
            created_by TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            expires_at DATETIME,
            access_level TEXT NOT NULL DEFAULT 'view_only',
            password_protected BOOLEAN DEFAULT 0,
            password_hash TEXT,
            max_uses INTEGER,
            current_uses INTEGER DEFAULT 0,
            is_active BOOLEAN DEFAULT 1,
            title TEXT NOT NULL,
            description TEXT,
            thumbnail_url TEXT,
            metadata TEXT DEFAULT '{}',
            FOREIGN KEY (created_by) REFERENCES users(id)
          )
        `);

  await db.run(`
    CREATE TABLE IF NOT EXISTS share_access_logs (
      id TEXT PRIMARY KEY,
      share_id TEXT NOT NULL,
      accessed_by_ip TEXT NOT NULL,
      accessed_by_user_id TEXT,
      accessed_by_email TEXT,
      accessed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      user_agent TEXT,
      action_taken TEXT NOT NULL,
      success BOOLEAN DEFAULT 1,
      error_message TEXT,
      FOREIGN KEY (share_id) REFERENCES shareable_links(id),
      FOREIGN KEY (accessed_by_user_id) REFERENCES users(id)
    )
  `);

  await db.run(`
    CREATE TABLE IF NOT EXISTS quick_action_links (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      icon TEXT NOT NULL,
      color TEXT NOT NULL,
      action_type TEXT NOT NULL,
      target_resource_id TEXT NOT NULL,
      parameters TEXT DEFAULT '{}',
      requires_confirmation BOOLEAN DEFAULT 0,
      confirmation_message TEXT,
      success_message TEXT NOT NULL,
      error_message TEXT NOT NULL,
      is_active BOOLEAN DEFAULT 1,
      usage_count INTEGER DEFAULT 0,
      created_by TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `);

  await db.run(`
    CREATE TABLE IF NOT EXISTS short_urls (
      id TEXT PRIMARY KEY,
      short_code TEXT UNIQUE NOT NULL,
      original_url TEXT NOT NULL,
      created_by TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME,
      click_count INTEGER DEFAULT 0,
      last_accessed DATETIME,
      is_active BOOLEAN DEFAULT 1,
      custom_domain TEXT,
      analytics_enabled BOOLEAN DEFAULT 1,
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `);

  // Help system tables
  await db.run(`
    CREATE TABLE IF NOT EXISTS help_articles (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      category TEXT NOT NULL,
      subcategory TEXT,
      tags TEXT DEFAULT '[]',
      difficulty_level TEXT NOT NULL DEFAULT 'beginner',
      estimated_read_time_minutes INTEGER DEFAULT 5,
      target_roles TEXT DEFAULT '[]',
      prerequisites TEXT DEFAULT '[]',
      related_articles TEXT DEFAULT '[]',
      video_url TEXT,
      interactive_demo_url TEXT,
      created_by TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      version TEXT DEFAULT '1.0',
      view_count INTEGER DEFAULT 0,
      helpful_votes INTEGER DEFAULT 0,
      unhelpful_votes INTEGER DEFAULT 0,
      is_published BOOLEAN DEFAULT 0,
      is_featured BOOLEAN DEFAULT 0,
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `);

  await db.run(`
    CREATE TABLE IF NOT EXISTS help_attachments (
      id TEXT PRIMARY KEY,
      article_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      file_type TEXT NOT NULL,
      file_size_bytes INTEGER NOT NULL,
      storage_path TEXT NOT NULL,
      description TEXT,
      uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (article_id) REFERENCES help_articles(id)
    )
  `);

  await db.run(`
    CREATE TABLE IF NOT EXISTS contextual_help (
      id TEXT PRIMARY KEY,
      page_path TEXT NOT NULL,
      user_role TEXT NOT NULL,
      element_selector TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      help_type TEXT NOT NULL DEFAULT 'tooltip',
      trigger_event TEXT NOT NULL DEFAULT 'hover',
      position TEXT NOT NULL DEFAULT 'top',
      priority INTEGER DEFAULT 1,
      related_article_id TEXT,
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (related_article_id) REFERENCES help_articles(id)
    )
  `);

  await db.run(`
    CREATE TABLE IF NOT EXISTS user_feedback (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      article_id TEXT,
      page_path TEXT,
      feedback_type TEXT NOT NULL,
      rating INTEGER,
      comment TEXT,
      category TEXT,
      status TEXT NOT NULL DEFAULT 'new',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      reviewed_by TEXT,
      reviewed_at DATETIME,
      response TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (article_id) REFERENCES help_articles(id),
      FOREIGN KEY (reviewed_by) REFERENCES users(id)
    )
  `);

  await db.run(`
    CREATE TABLE IF NOT EXISTS guided_tours (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      target_role TEXT NOT NULL,
      trigger_condition TEXT NOT NULL DEFAULT 'manual',
      steps TEXT NOT NULL DEFAULT '[]',
      is_active BOOLEAN DEFAULT 1,
      completion_rate REAL DEFAULT 0,
      average_completion_time_minutes INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.run(`
    CREATE TABLE IF NOT EXISTS tour_progress (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      tour_id TEXT NOT NULL,
      current_step INTEGER DEFAULT 0,
      completed_steps TEXT DEFAULT '[]',
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      abandoned BOOLEAN DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (tour_id) REFERENCES guided_tours(id),
      UNIQUE(user_id, tour_id)
    )
  `);

  // Diagnostic tools tables
  await db.run(`
    CREATE TABLE IF NOT EXISTS diagnostic_tools (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      supported_platforms TEXT NOT NULL DEFAULT '[]',
      script_content TEXT NOT NULL,
      script_language TEXT NOT NULL,
      execution_time_estimate INTEGER DEFAULT 30,
      requires_elevation BOOLEAN DEFAULT 0,
      output_format TEXT NOT NULL DEFAULT 'json',
      parameters TEXT DEFAULT '[]',
      interpretation_guide TEXT,
      troubleshooting_steps TEXT DEFAULT '[]',
      is_built_in BOOLEAN DEFAULT 1,
      version TEXT DEFAULT '1.0',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.run(`
    CREATE TABLE IF NOT EXISTS diagnostic_results (
      id TEXT PRIMARY KEY,
      diagnostic_tool_id TEXT NOT NULL,
      execution_id TEXT NOT NULL,
      ticket_id TEXT,
      platform TEXT NOT NULL,
      raw_output TEXT NOT NULL,
      parsed_results TEXT DEFAULT '{}',
      issues_found TEXT DEFAULT '[]',
      recommendations TEXT DEFAULT '[]',
      executed_by TEXT NOT NULL,
      executed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      execution_duration INTEGER,
      FOREIGN KEY (diagnostic_tool_id) REFERENCES diagnostic_tools(id),
      FOREIGN KEY (execution_id) REFERENCES script_executions(id),
      FOREIGN KEY (ticket_id) REFERENCES service_tickets(id),
      FOREIGN KEY (executed_by) REFERENCES users(id)
    )
  `);

  // System telemetry tables
  await db.run(`
    CREATE TABLE IF NOT EXISTS system_metrics (
      id TEXT PRIMARY KEY,
      metric_type TEXT NOT NULL,
      metric_name TEXT NOT NULL,
      metric_value REAL NOT NULL,
      metric_unit TEXT,
      tags TEXT DEFAULT '{}',
      recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.run(`
    CREATE TABLE IF NOT EXISTS performance_logs (
      id TEXT PRIMARY KEY,
      endpoint TEXT NOT NULL,
      method TEXT NOT NULL,
      response_time_ms INTEGER NOT NULL,
      status_code INTEGER NOT NULL,
      user_id TEXT,
      ip_address TEXT,
      user_agent TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Additional indexes for new tables
  await db.run(`CREATE INDEX IF NOT EXISTS idx_shareable_links_token ON shareable_links(share_token)`);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_shareable_links_created_by ON shareable_links(created_by)`);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_share_access_logs_share_id ON share_access_logs(share_id)`);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_short_urls_code ON short_urls(short_code)`);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_help_articles_category ON help_articles(category)`);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_help_articles_published ON help_articles(is_published)`);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_contextual_help_page ON contextual_help(page_path)`);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_diagnostic_results_tool_id ON diagnostic_results(diagnostic_tool_id)`);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_system_metrics_type ON system_metrics(metric_type)`);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_performance_logs_endpoint ON performance_logs(endpoint)`);
}

async function createDefaultAdmin(db: Database): Promise<void> {
  const existingAdmin = await db.get(
    'SELECT id FROM users WHERE role = ? LIMIT 1',
    [UserRole.ADMIN]
  );

  if (!existingAdmin) {
    const adminId = uuidv4();
    const passwordHash = await bcrypt.hash('admin123', 10);
    
    await db.run(`
      INSERT INTO users (id, username, email, password_hash, role, is_active)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      adminId,
      'admin',
      'admin@scriptmanager.local',
      passwordHash,
      UserRole.ADMIN,
      1
    ]);

    logger.info('Default admin user created (username: admin, password: admin123)');
    logger.warn('Please change the default admin password immediately!');
  }
}