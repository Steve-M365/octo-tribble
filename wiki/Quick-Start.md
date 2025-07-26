# Quick Start Guide

Get ScriptFlow up and running in 5 minutes! This guide will have you executing your first script in no time.

## 🚀 5-Minute Setup

### Prerequisites
- Docker and Docker Compose installed
- 4GB+ RAM available
- Ports 3000 and 5432 available

### Step 1: Clone and Start (2 minutes)

```bash
# Clone the repository
git clone https://github.com/Steve-M365/scriptflow.git
cd scriptflow

# Start with Docker Compose
docker-compose up -d

# Wait for services to start (usually 30-60 seconds)
docker-compose logs -f scriptflow
```

### Step 2: Access ScriptFlow (30 seconds)

1. Open your browser and go to: http://localhost:3000
2. Login with default credentials:
   - **Username**: `admin`
   - **Password**: `admin123`

### Step 3: Create Your First Script (2 minutes)

1. **Navigate to Scripts**: Click "Scripts" in the sidebar
2. **Create New Script**: Click the "+" button
3. **Fill in details**:
   ```
   Name: System Info
   Description: Get basic system information
   Language: Bash
   Category: Monitoring
   ```
4. **Add script content**:
   ```bash
   #!/bin/bash
   echo "=== System Information ==="
   echo "Date: $(date)"
   echo "Hostname: $(hostname)"
   echo "Uptime: $(uptime)"
   echo "Disk Usage:"
   df -h /
   echo "Memory Usage:"
   free -h
   ```
5. **Save the script**

### Step 4: Execute Your Script (30 seconds)

1. **Click "Execute"** on your script
2. **Watch real-time output** in the execution window
3. **View results** and execution history

🎉 **Congratulations!** You've successfully set up ScriptFlow and executed your first script!

## 🔧 Configuration (Optional)

### Change Default Password

```bash
# Option 1: Through the web interface
# Go to Profile → Settings → Change Password

# Option 2: Using API
curl -X PUT http://localhost:3000/api/users/me/password \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"currentPassword": "admin123", "newPassword": "your_new_password"}'
```

### Environment Variables

Create a `.env` file to customize your installation:

```bash
# Copy example environment file
cp .env.example .env

# Edit with your settings
nano .env
```

Common customizations:
```bash
# Change default port
SCRIPTFLOW_PORT=8080

# Set your domain
APP_URL=https://scriptflow.yourdomain.com

# Configure email notifications
SMTP_HOST=smtp.gmail.com
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

## 📚 Next Steps

Now that ScriptFlow is running, explore these features:

### 1. User Management
- **Add users**: Go to Admin → Users → Add User
- **Set roles**: Assign appropriate roles (Admin, Power User, User, etc.)
- **Configure permissions**: Fine-tune access controls

### 2. Script Categories
Create organized categories for your scripts:
- **Monitoring**: System health checks
- **Maintenance**: Cleanup and optimization
- **Deployment**: Application deployment scripts
- **Backup**: Data backup procedures
- **Security**: Security scans and updates

### 3. Scheduling
Automate script execution:
```
1. Go to Scripts → Your Script → Schedule
2. Choose schedule type (CRON, Interval, One-time)
3. Set execution parameters
4. Configure notifications
```

### 4. Service Desk (If Applicable)
Set up ticket management:
- Configure queues
- Set SLA rules
- Assign agents
- Define escalation procedures

## 🛠️ Common Use Cases

### IT Operations
```bash
# Server Health Check
#!/bin/bash
echo "Checking server health..."
systemctl status nginx
systemctl status postgresql
df -h
free -m
```

### DevOps Automation
```bash
# Application Deployment
#!/bin/bash
echo "Deploying application..."
git pull origin main
npm install
npm run build
pm2 restart app
```

### System Administration
```powershell
# Windows System Info
Get-ComputerInfo | Select-Object WindowsProductName, WindowsVersion, TotalPhysicalMemory
Get-Service | Where-Object {$_.Status -eq "Stopped"} | Select-Object Name, Status
Get-EventLog -LogName System -Newest 10 -EntryType Error
```

## 🔗 Integration Examples

### Slack Notifications
Add to your scripts for notifications:
```bash
# Send result to Slack
curl -X POST -H 'Content-type: application/json' \
  --data '{"text":"Script execution completed successfully!"}' \
  YOUR_SLACK_WEBHOOK_URL
```

### Email Alerts
Configure SMTP in `.env` and use:
```bash
# Send email notification
echo "Script completed at $(date)" | mail -s "ScriptFlow Notification" admin@yourdomain.com
```

### API Integration
Use ScriptFlow's API:
```bash
# Execute script via API
curl -X POST http://localhost:3000/api/scripts/SCRIPT_ID/execute \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"parameters": {"server": "prod-01"}}'
```

## 📊 Monitoring Dashboard

Access built-in monitoring:
1. **Metrics**: http://localhost:9090 (Prometheus)
2. **Dashboards**: http://localhost:3001 (Grafana)
3. **Logs**: `docker-compose logs scriptflow`

## 🐛 Troubleshooting

### Port Conflicts
```bash
# Check what's using port 3000
sudo lsof -i :3000

# Change port in docker-compose.yml
ports:
  - "8080:3000"  # Use port 8080 instead
```

### Container Issues
```bash
# Restart services
docker-compose restart

# View logs
docker-compose logs scriptflow

# Rebuild if needed
docker-compose build --no-cache
docker-compose up -d
```

### Database Issues
```bash
# Reset database
docker-compose down -v
docker-compose up -d
```

## 📞 Getting Help

### Documentation
- **Full User Guide**: [User Guide](User-Guide)
- **API Documentation**: [API Documentation](API-Documentation)
- **Installation Guide**: [Installation](Installation)

### Community Support
- **Discord**: [Join our community](https://discord.gg/scriptflow)
- **GitHub Issues**: [Report problems](https://github.com/Steve-M365/scriptflow/issues)
- **Discussions**: [Ask questions](https://github.com/Steve-M365/scriptflow/discussions)

### Professional Support
- **Email**: support@scriptflow.dev
- **Documentation**: https://docs.scriptflow.dev
- **Training**: Available for enterprise customers

## 🎯 What's Next?

After completing this quick start:

1. **Explore Features**: Try scheduling, service desk, and sharing
2. **Join Community**: Connect with other ScriptFlow users
3. **Contribute**: Help improve ScriptFlow on GitHub
4. **Learn More**: Read the complete documentation
5. **Scale Up**: Consider production deployment

## 📋 Quick Reference

### Default Credentials
- **Username**: `admin`
- **Password**: `admin123`

### Default Ports
- **ScriptFlow**: http://localhost:3000
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3001

### Useful Commands
```bash
# Check status
docker-compose ps

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Update ScriptFlow
docker-compose pull && docker-compose up -d
```

---

**Ready to dive deeper?** Check out our [User Guide](User-Guide) for comprehensive feature documentation!