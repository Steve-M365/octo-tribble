# Installation Guide

This guide provides step-by-step instructions for installing ScriptFlow in various environments.

## 📋 System Requirements

### Minimum Requirements
- **CPU**: 2 cores (x64 architecture)
- **RAM**: 4GB
- **Storage**: 20GB available space
- **OS**: Windows 10+, Ubuntu 20.04+, macOS 12+
- **Node.js**: 18.0+
- **Docker**: 20.0+ (for containerized deployment)

### Recommended Requirements (Production)
- **CPU**: 4+ cores
- **RAM**: 8GB+
- **Storage**: 100GB+ SSD
- **Network**: Gigabit Ethernet

## 🐳 Docker Installation (Recommended)

### Quick Start with Docker Compose

1. **Clone the repository**:
   ```bash
   git clone https://github.com/scriptflow/scriptflow.git
   cd scriptflow
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   nano .env
   ```

3. **Start services**:
   ```bash
   docker-compose up -d
   ```

4. **Verify installation**:
   ```bash
   curl http://localhost:3000/api/health
   ```

5. **Access ScriptFlow**:
   - Web Interface: http://localhost:3000
   - Default login: `admin` / `admin123`

### Docker Environment Variables

```bash
# Application
APP_URL=http://localhost:3000
SCRIPTFLOW_PORT=3000

# Database
POSTGRES_PASSWORD=your_secure_password

# Security
JWT_SECRET=your_super_secure_jwt_secret
SESSION_SECRET=your_session_secret

# Optional: Email notifications
SMTP_HOST=smtp.yourdomain.com
SMTP_USER=noreply@yourdomain.com
SMTP_PASS=your_email_password
```

## 🔧 Manual Installation

### Prerequisites

Install Node.js 18+:

**Ubuntu/Debian**:
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs postgresql postgresql-contrib
```

**Windows**:
```powershell
# Using Chocolatey
choco install nodejs postgresql git
```

**macOS**:
```bash
# Using Homebrew
brew install node postgresql
```

### Installation Steps

1. **Clone and setup**:
   ```bash
   git clone https://github.com/scriptflow/scriptflow.git
   cd scriptflow
   npm run install:all
   ```

2. **Database setup**:
   ```bash
   # PostgreSQL
   sudo -u postgres createdb scriptflow
   sudo -u postgres createuser scriptflow
   
   # Or use SQLite (default)
   # No additional setup required
   ```

3. **Configuration**:
   ```bash
   cp packages/backend/.env.example packages/backend/.env
   # Edit configuration
   nano packages/backend/.env
   ```

4. **Initialize database**:
   ```bash
   npm run db:migrate
   npm run db:seed  # Optional sample data
   ```

5. **Build and start**:
   ```bash
   npm run build
   npm start
   ```

## ☸️ Kubernetes Deployment

### Using Helm Chart

```bash
# Add repository
helm repo add scriptflow https://charts.scriptflow.dev
helm repo update

# Install
helm install scriptflow scriptflow/scriptflow \
  --set ingress.enabled=true \
  --set ingress.hostname=scriptflow.yourdomain.com
```

### Manual Kubernetes Deployment

```yaml
# scriptflow-k8s.yaml
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

Apply with:
```bash
kubectl apply -f scriptflow-k8s.yaml
```

## 🌐 Production Deployment

### Nginx Configuration

```nginx
server {
    listen 443 ssl http2;
    server_name scriptflow.yourdomain.com;

    ssl_certificate /path/to/certificate.pem;
    ssl_certificate_key /path/to/private.key;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### SSL Certificate Setup

```bash
# Using Let's Encrypt
sudo certbot --nginx -d scriptflow.yourdomain.com
```

### Systemd Service

```ini
# /etc/systemd/system/scriptflow.service
[Unit]
Description=ScriptFlow Application
After=network.target

[Service]
Type=simple
User=scriptflow
WorkingDirectory=/opt/scriptflow
ExecStart=/usr/bin/node packages/backend/dist/index.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable scriptflow
sudo systemctl start scriptflow
```

## 🔍 Post-Installation

### Create Admin User

```bash
# Using CLI
npm run create-admin

# Or via API
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "email": "admin@yourdomain.com",
    "password": "secure_password",
    "role": "admin"
  }'
```

### Health Check

```bash
curl http://localhost:3000/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "uptime": 123456,
  "database": "connected",
  "redis": "connected"
}
```

## 🐛 Troubleshooting

### Common Issues

**Port already in use**:
```bash
sudo lsof -i :3000
sudo kill -9 PID
```

**Database connection failed**:
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Test connection
psql -h localhost -U scriptflow -d scriptflow
```

**Permission denied**:
```bash
# Fix file permissions
sudo chown -R scriptflow:scriptflow /opt/scriptflow
chmod +x /opt/scriptflow/packages/backend/dist/index.js
```

### Log Locations

- Application logs: `./logs/scriptflow.log`
- System logs: `/var/log/syslog`
- Docker logs: `docker logs scriptflow-app`

## 🔄 Updates

### Docker Update

```bash
docker-compose pull
docker-compose up -d
```

### Manual Update

```bash
git pull origin main
npm run install:all
npm run build
npm run db:migrate
sudo systemctl restart scriptflow
```

## 📊 Monitoring Setup

### Prometheus Configuration

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'scriptflow'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/metrics'
```

### Grafana Dashboard

Import dashboard ID: `scriptflow-main-dashboard` from our [Grafana dashboards repository](https://github.com/scriptflow/grafana-dashboards).

## 🔐 Security Hardening

### Firewall Configuration

```bash
# UFW (Ubuntu)
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw enable
```

### Fail2Ban Setup

```ini
# /etc/fail2ban/jail.local
[scriptflow]
enabled = true
port = 3000
filter = scriptflow
logpath = /opt/scriptflow/logs/access.log
maxretry = 5
bantime = 3600
```

## 📞 Getting Help

If you encounter issues:

1. Check the [Troubleshooting](Troubleshooting) page
2. Review [FAQ](FAQ) for common questions
3. Search [GitHub Issues](https://github.com/scriptflow/scriptflow/issues)
4. Join our [Discord community](https://discord.gg/scriptflow)
5. Contact support: support@scriptflow.dev

## 📚 Next Steps

After installation:

1. Read the [User Guide](User-Guide)
2. Configure [User Management](User-Management)
3. Set up [Monitoring & Logging](Monitoring-and-Logging)
4. Explore [API Documentation](API-Documentation)
5. Join the [Community](Community-Resources)

---

**Need help?** Join our [Discord](https://discord.gg/scriptflow) or create an [issue](https://github.com/scriptflow/scriptflow/issues).