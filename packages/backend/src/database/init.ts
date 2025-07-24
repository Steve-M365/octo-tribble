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

  // Create indexes for better performance
  await db.run(`CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)`);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_scripts_created_by ON scripts(created_by)`);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_scripts_language ON scripts(language)`);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_executions_script_id ON script_executions(script_id)`);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_executions_executed_by ON script_executions(executed_by)`);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_audit_user_id ON audit_logs(user_id)`);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp)`);
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