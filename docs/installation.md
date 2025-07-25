# ScriptFlow Installation Guide

## Overview

This guide provides detailed instructions for installing and configuring ScriptFlow in various environments, from development setups to production deployments.

## System Requirements

### Minimum Requirements

#### Hardware
- **CPU**: 2 cores (x64 architecture)
- **RAM**: 4GB
- **Storage**: 20GB available space
- **Network**: Internet connection for initial setup and updates

#### Software
- **Operating System**: 
  - Windows 10/11 or Windows Server 2019+
  - Ubuntu 20.04+ or CentOS 8+
  - macOS 12+ (for development only)
- **Node.js**: Version 18.0 or higher
- **Database**: SQLite 3.35+ (included) or PostgreSQL 13+ (recommended for production)
- **Docker**: Version 20.0+ (optional, for containerized deployment)

### Recommended Requirements

#### Hardware (Production)
- **CPU**: 4+ cores
- **RAM**: 8GB+
- **Storage**: 100GB+ SSD
- **Network**: Gigabit Ethernet

#### Additional Software
- **Reverse Proxy**: Nginx or Apache HTTP Server
- **SSL Certificate**: Let's Encrypt or commercial certificate
- **Monitoring**: Prometheus + Grafana (optional)
- **Backup Solution**: Database backup system

## Installation Methods

### Method 1: Docker Deployment (Recommended)

#### Prerequisites
- Docker and Docker Compose installed
- 4GB+ RAM available
- Ports 3000 and 5432 available

#### Quick Start
```bash
# Clone the repository
git clone https://github.com/scriptflow/scriptflow.git
cd scriptflow

# Copy environment configuration
cp packages/backend/.env.example packages/backend/.env

# Edit configuration (see Configuration section)
nano packages/backend/.env

# Start services
docker-compose up -d

# Verify installation
curl http://localhost:3000/api/health
```

#### Docker Compose Configuration
```yaml
# docker-compose.yml
version: '3.8'

services:
  scriptflow-app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://scriptflow:password@db:5432/scriptflow
    depends_on:
      - db
      - redis
    volumes:
      - ./data/scripts:/app/data/scripts
      - ./data/logs:/app/data/logs

  db:
    image: postgres:15
    environment:
      POSTGRES_DB: scriptflow
      POSTGRES_USER: scriptflow
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - scriptflow-app

volumes:
  postgres_data:
  redis_data:
```

### Method 2: Manual Installation

#### Step 1: Install Dependencies

**Ubuntu/Debian:**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL (optional)
sudo apt-get install -y postgresql postgresql-contrib

# Install additional tools
sudo apt-get install -y git curl wget unzip
```

**CentOS/RHEL:**
```bash
# Update system
sudo yum update -y

# Install Node.js 18
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# Install PostgreSQL (optional)
sudo yum install -y postgresql-server postgresql-contrib

# Install additional tools
sudo yum install -y git curl wget unzip
```

**Windows:**
```powershell
# Install using Chocolatey (recommended)
choco install nodejs postgresql git

# Or download and install manually:
# - Node.js: https://nodejs.org/
# - PostgreSQL: https://www.postgresql.org/download/windows/
# - Git: https://git-scm.com/download/win
```

#### Step 2: Clone and Setup

```bash
# Clone repository
git clone https://github.com/scriptflow/scriptflow.git
cd scriptflow

# Install dependencies
npm run install:all

# Copy configuration
cp packages/backend/.env.example packages/backend/.env
```

#### Step 3: Database Setup

**SQLite (Default):**
```bash
# SQLite database will be created automatically
# No additional setup required
```

**PostgreSQL:**
```bash
# Create database and user
sudo -u postgres psql << EOF
CREATE DATABASE scriptflow;
CREATE USER scriptflow WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE scriptflow TO scriptflow;
\q
EOF

# Update .env file
echo "DATABASE_URL=postgresql://scriptflow:your_secure_password@localhost:5432/scriptflow" >> packages/backend/.env
```

#### Step 4: Initialize Application

```bash
# Run database migrations
npm run db:migrate

# Seed initial data (optional)
npm run db:seed

# Build frontend
npm run build:frontend

# Start application
npm start
```

### Method 3: Kubernetes Deployment

#### Prerequisites
- Kubernetes cluster (1.20+)
- kubectl configured
- Helm 3.0+ (optional)

#### Using Helm Chart
```bash
# Add ScriptFlow Helm repository
helm repo add scriptflow https://charts.scriptflow.dev
helm repo update

# Install with custom values
helm install scriptflow scriptflow/scriptflow \
  --set database.type=postgresql \
  --set ingress.enabled=true \
  --set ingress.hostname=scriptflow.yourdomain.com

# Check deployment status
kubectl get pods -l app=scriptflow
```

#### Manual Kubernetes Deployment
```yaml
# scriptflow-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: scriptflow
spec:
  replicas: 3
  selector:
    matchLabels:
      app: scriptflow
  template:
    metadata:
      labels:
        app: scriptflow
    spec:
      containers:
      - name: scriptflow
        image: scriptflow/scriptflow:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: scriptflow-secrets
              key: database-url
---
apiVersion: v1
kind: Service
metadata:
  name: scriptflow-service
spec:
  selector:
    app: scriptflow
  ports:
  - port: 80
    targetPort: 3000
  type: LoadBalancer
```

## Configuration

### Environment Variables

#### Core Configuration
```bash
# Application
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
APP_NAME="ScriptFlow"
APP_URL=https://scriptflow.yourdomain.com

# Database
DATABASE_TYPE=postgresql  # or sqlite
DATABASE_URL=postgresql://user:password@host:port/database
DATABASE_SSL=true

# Security
JWT_SECRET=your-super-secure-jwt-secret-key-here
JWT_EXPIRES_IN=24h
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# File Storage
UPLOAD_DIR=./data/uploads
MAX_FILE_SIZE=50MB
ALLOWED_FILE_TYPES=.ps1,.sh,.py,.yml,.yaml,.json,.txt

# Email (for notifications)
SMTP_HOST=smtp.yourdomain.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=noreply@yourdomain.com
SMTP_PASS=your-email-password

# External Integrations
STRIPE_SECRET_KEY=sk_live_...  # For billing
STRIPE_WEBHOOK_SECRET=whsec_...
SLACK_BOT_TOKEN=xoxb-...  # For Slack notifications
```

#### Advanced Configuration
```bash
# Logging
LOG_LEVEL=info
LOG_FORMAT=json
LOG_FILE=./logs/scriptflow.log
LOG_MAX_SIZE=100MB
LOG_MAX_FILES=10

# Redis (for caching and sessions)
REDIS_URL=redis://localhost:6379
REDIS_PREFIX=scriptflow:
SESSION_SECRET=your-session-secret-key

# Monitoring
METRICS_ENABLED=true
HEALTH_CHECK_ENABLED=true
PROMETHEUS_METRICS=true

# Security Headers
CORS_ORIGIN=https://yourdomain.com
TRUST_PROXY=true
HELMET_ENABLED=true

# Script Execution
EXECUTION_TIMEOUT=300000  # 5 minutes
MAX_CONCURRENT_EXECUTIONS=10
SCRIPT_SANDBOX_ENABLED=true
ELEVATED_EXECUTION_ENABLED=true

# Service Account (for elevated execution)
SERVICE_ACCOUNT_USERNAME=scriptflow-service
SERVICE_ACCOUNT_DOMAIN=yourdomain.com
```

### Database Configuration

#### PostgreSQL Setup
```sql
-- Create database
CREATE DATABASE scriptflow
  WITH ENCODING 'UTF8'
       LC_COLLATE='en_US.UTF-8'
       LC_CTYPE='en_US.UTF-8'
       TEMPLATE=template0;

-- Create user
CREATE USER scriptflow WITH
  PASSWORD 'secure_password'
  CREATEDB
  NOSUPERUSER
  NOCREATEROLE;

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE scriptflow TO scriptflow;

-- Configure connection limits
ALTER USER scriptflow CONNECTION LIMIT 50;
```

#### Database Optimization
```sql
-- Performance tuning (adjust based on your hardware)
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;
SELECT pg_reload_conf();
```

### Web Server Configuration

#### Nginx Configuration
```nginx
# /etc/nginx/sites-available/scriptflow
upstream scriptflow_backend {
    server 127.0.0.1:3000;
    keepalive 32;
}

server {
    listen 80;
    server_name scriptflow.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name scriptflow.yourdomain.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/scriptflow.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/scriptflow.yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;

    # Security Headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Proxy Configuration
    location / {
        proxy_pass http://scriptflow_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # WebSocket Support
    location /ws {
        proxy_pass http://scriptflow_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Static Files
    location /static/ {
        alias /var/www/scriptflow/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # File Upload Size
    client_max_body_size 50M;
}
```

## Post-Installation Setup

### 1. Create Admin User

```bash
# Using the CLI tool
npm run create-admin

# Or via API
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "email": "admin@yourdomain.com",
    "password": "secure_admin_password",
    "role": "admin"
  }'
```

### 2. Configure System Settings

Access the admin panel at `https://yourdomain.com/admin` and configure:

- **Organization Settings**: Company name, logo, contact information
- **Email Settings**: SMTP configuration for notifications
- **Security Policies**: Password requirements, session timeouts
- **Integration Settings**: External service connections
- **Backup Configuration**: Automated backup schedules

### 3. Set Up SSL Certificate

#### Using Let's Encrypt
```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d scriptflow.yourdomain.com

# Test auto-renewal
sudo certbot renew --dry-run
```

### 4. Configure Monitoring

#### Prometheus Configuration
```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'scriptflow'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/metrics'
```

#### Grafana Dashboard
- Import the ScriptFlow dashboard from `monitoring/grafana-dashboard.json`
- Configure data source to point to your Prometheus instance
- Set up alerting rules for critical metrics

### 5. Backup Configuration

#### Database Backup Script
```bash
#!/bin/bash
# backup-scriptflow.sh

BACKUP_DIR="/var/backups/scriptflow"
DB_NAME="scriptflow"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
pg_dump $DB_NAME | gzip > $BACKUP_DIR/scriptflow_db_$DATE.sql.gz

# Backup application data
tar -czf $BACKUP_DIR/scriptflow_data_$DATE.tar.gz /opt/scriptflow/data

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
```

## Troubleshooting

### Common Issues

#### Application Won't Start
```bash
# Check logs
tail -f packages/backend/logs/error.log

# Verify Node.js version
node --version  # Should be 18.0+

# Check port availability
netstat -tulpn | grep :3000

# Verify database connection
npm run db:test
```

#### Database Connection Issues
```bash
# Test PostgreSQL connection
psql -h localhost -U scriptflow -d scriptflow -c "SELECT version();"

# Check database logs
sudo tail -f /var/log/postgresql/postgresql-15-main.log

# Verify database permissions
psql -h localhost -U scriptflow -d scriptflow -c "\du"
```

#### Performance Issues
```bash
# Monitor resource usage
htop

# Check database performance
psql -d scriptflow -c "SELECT * FROM pg_stat_activity;"

# Review slow queries
psql -d scriptflow -c "SELECT * FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10;"
```

### Log File Locations

- **Application Logs**: `./logs/scriptflow.log`
- **Database Logs**: `/var/log/postgresql/`
- **Nginx Logs**: `/var/log/nginx/`
- **System Logs**: `/var/log/syslog`

### Support Resources

- **Documentation**: https://docs.scriptflow.dev
- **Community Forum**: https://community.scriptflow.dev
- **GitHub Issues**: https://github.com/scriptflow/scriptflow/issues
- **Discord Support**: https://discord.gg/scriptflow
- **Professional Support**: support@scriptflow.dev

## Security Considerations

### Network Security
- Use HTTPS with strong SSL/TLS configuration
- Implement proper firewall rules
- Use VPN for administrative access
- Regular security updates and patches

### Application Security
- Change default passwords immediately
- Enable two-factor authentication
- Regular security audits and penetration testing
- Implement proper backup and disaster recovery

### Data Protection
- Encrypt sensitive data at rest
- Secure database connections
- Regular backup testing
- Compliance with data protection regulations

This installation guide provides comprehensive instructions for deploying ScriptFlow in various environments. For additional support or custom deployment requirements, please contact our support team.