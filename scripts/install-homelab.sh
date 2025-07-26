#!/bin/bash

# ScriptFlow Homelab Installation Script
# Repository: https://github.com/Steve-M365/scriptflow
# Author: Steve M365
# License: MIT

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REPO_URL="https://github.com/Steve-M365/scriptflow.git"
PROJECT_DIR="scriptflow"
DOCKER_IMAGE="steve-m365/scriptflow:latest"
DEFAULT_DOMAIN="scriptflow.local"
DEFAULT_EMAIL="admin@scriptflow.local"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_banner() {
    echo -e "${BLUE}"
    cat << "EOF"
    ____            _       _   ______ _                 
   / ___|  ___ _ __(_)_ __ | |_|  ____| | _____      __
   \___ \ / __| '__| | '_ \| __| |_   | |/ _ \ \ /\ / /
    ___) | (__| |  | | |_) | |_|  _|  | | (_) \ V  V / 
   |____/ \___|_|  |_| .__/ \__|_|    |_|\___/ \_/\_/  
                     |_|                               
   
   🚀 Enterprise Script Management Platform
   📦 Automated Homelab Installation
   🔧 Author: Steve M365
   
EOF
    echo -e "${NC}"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to get user input with default
get_input() {
    local prompt="$1"
    local default="$2"
    local value
    
    read -p "$prompt [$default]: " value
    echo "${value:-$default}"
}

# Function to generate secure random password
generate_password() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-16
}

# Function to check system requirements
check_requirements() {
    print_status "Checking system requirements..."
    
    local missing_deps=()
    
    # Check for required commands
    if ! command_exists docker; then
        missing_deps+=("docker")
    fi
    
    if ! command_exists docker-compose; then
        if ! docker compose version >/dev/null 2>&1; then
            missing_deps+=("docker-compose")
        fi
    fi
    
    if ! command_exists git; then
        missing_deps+=("git")
    fi
    
    if ! command_exists curl; then
        missing_deps+=("curl")
    fi
    
    if ! command_exists openssl; then
        missing_deps+=("openssl")
    fi
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        print_error "Missing required dependencies: ${missing_deps[*]}"
        print_status "Please install the missing dependencies and run this script again."
        
        # Provide installation commands for common systems
        if command_exists apt-get; then
            print_status "On Ubuntu/Debian, run:"
            echo "sudo apt-get update && sudo apt-get install -y ${missing_deps[*]}"
        elif command_exists yum; then
            print_status "On CentOS/RHEL, run:"
            echo "sudo yum install -y ${missing_deps[*]}"
        elif command_exists brew; then
            print_status "On macOS with Homebrew, run:"
            echo "brew install ${missing_deps[*]}"
        fi
        
        exit 1
    fi
    
    # Check if Docker is running
    if ! docker info >/dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
    
    # Check available disk space (minimum 5GB)
    local available_space=$(df . | tail -1 | awk '{print $4}')
    local required_space=5242880 # 5GB in KB
    
    if [ "$available_space" -lt "$required_space" ]; then
        print_warning "Less than 5GB of disk space available. Installation may fail."
        read -p "Do you want to continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
    
    print_success "System requirements check passed!"
}

# Function to collect configuration
collect_config() {
    print_status "Collecting configuration..."
    
    echo
    echo "=== ScriptFlow Configuration ==="
    echo
    
    # Domain/hostname
    DOMAIN=$(get_input "Enter domain/hostname for ScriptFlow" "$DEFAULT_DOMAIN")
    
    # Admin email
    ADMIN_EMAIL=$(get_input "Enter admin email address" "$DEFAULT_EMAIL")
    
    # HTTP/HTTPS ports
    HTTP_PORT=$(get_input "Enter HTTP port" "80")
    HTTPS_PORT=$(get_input "Enter HTTPS port" "443")
    
    # Database passwords
    POSTGRES_PASSWORD=$(generate_password)
    REDIS_PASSWORD=$(generate_password)
    JWT_SECRET=$(generate_password)$(generate_password)
    SESSION_SECRET=$(generate_password)$(generate_password)
    
    # Optional: Enable monitoring stack
    echo
    read -p "Enable monitoring stack (Prometheus + Grafana)? (y/N): " -n 1 -r
    echo
    ENABLE_MONITORING=${REPLY:-n}
    
    if [[ $ENABLE_MONITORING =~ ^[Yy]$ ]]; then
        GRAFANA_PASSWORD=$(generate_password)
    fi
    
    # SSL certificate
    echo
    read -p "Generate self-signed SSL certificates? (Y/n): " -n 1 -r
    echo
    GENERATE_SSL=${REPLY:-y}
    
    print_success "Configuration collected!"
}

# Function to clone repository
clone_repository() {
    print_status "Cloning ScriptFlow repository..."
    
    if [ -d "$PROJECT_DIR" ]; then
        print_warning "Directory $PROJECT_DIR already exists."
        read -p "Do you want to remove it and clone fresh? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            rm -rf "$PROJECT_DIR"
        else
            print_error "Please remove or rename the existing directory and try again."
            exit 1
        fi
    fi
    
    git clone "$REPO_URL" "$PROJECT_DIR"
    cd "$PROJECT_DIR"
    
    print_success "Repository cloned successfully!"
}

# Function to generate SSL certificates
generate_ssl_certificates() {
    if [[ ! $GENERATE_SSL =~ ^[Yy]$ ]]; then
        return 0
    fi
    
    print_status "Generating SSL certificates..."
    
    mkdir -p docker/ssl
    
    # Generate private key
    openssl genrsa -out docker/ssl/private.key 2048
    
    # Generate certificate signing request
    openssl req -new -key docker/ssl/private.key -out docker/ssl/cert.csr -subj "/C=US/ST=State/L=City/O=Organization/CN=$DOMAIN"
    
    # Generate self-signed certificate
    openssl x509 -req -days 365 -in docker/ssl/cert.csr -signkey docker/ssl/private.key -out docker/ssl/certificate.crt
    
    # Set proper permissions
    chmod 600 docker/ssl/private.key
    chmod 644 docker/ssl/certificate.crt
    
    rm docker/ssl/cert.csr
    
    print_success "SSL certificates generated!"
}

# Function to create environment file
create_env_file() {
    print_status "Creating environment configuration..."
    
    cat > .env << EOF
# ScriptFlow Homelab Configuration
# Generated on $(date)

# Application
APP_URL=https://$DOMAIN
DOMAIN=$DOMAIN
HTTP_PORT=$HTTP_PORT
HTTPS_PORT=$HTTPS_PORT

# Database
POSTGRES_PASSWORD=$POSTGRES_PASSWORD

# Redis
REDIS_PASSWORD=$REDIS_PASSWORD

# Security
JWT_SECRET=$JWT_SECRET
SESSION_SECRET=$SESSION_SECRET

# Admin
ADMIN_EMAIL=$ADMIN_EMAIL

# CORS
CORS_ORIGIN=https://$DOMAIN,http://$DOMAIN:$HTTP_PORT

# SSL
SSL_ENABLED=true

EOF

    if [[ $ENABLE_MONITORING =~ ^[Yy]$ ]]; then
        cat >> .env << EOF
# Monitoring
GRAFANA_PASSWORD=$GRAFANA_PASSWORD
PROMETHEUS_PORT=9090
GRAFANA_PORT=3001

EOF
    fi
    
    print_success "Environment file created!"
}

# Function to create Nginx configuration
create_nginx_config() {
    print_status "Creating Nginx configuration..."
    
    mkdir -p docker/nginx/conf.d
    
    cat > docker/nginx/conf.d/scriptflow.conf << EOF
upstream scriptflow_backend {
    server scriptflow:3000;
}

server {
    listen 80;
    server_name $DOMAIN;
    
    # Redirect HTTP to HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN;
    
    # SSL Configuration
    ssl_certificate /etc/nginx/ssl/certificate.crt;
    ssl_certificate_key /etc/nginx/ssl/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # Client max body size
    client_max_body_size 100M;
    
    # Proxy configuration
    location / {
        proxy_pass http://scriptflow_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
    
    # WebSocket support
    location /ws {
        proxy_pass http://scriptflow_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # Health check
    location /health {
        access_log off;
        proxy_pass http://scriptflow_backend/api/health;
    }
}
EOF
    
    print_success "Nginx configuration created!"
}

# Function to create monitoring configuration
create_monitoring_config() {
    if [[ ! $ENABLE_MONITORING =~ ^[Yy]$ ]]; then
        return 0
    fi
    
    print_status "Creating monitoring configuration..."
    
    mkdir -p docker/prometheus
    mkdir -p docker/grafana/dashboards
    mkdir -p docker/grafana/datasources
    
    # Prometheus configuration
    cat > docker/prometheus/prometheus.yml << EOF
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  # - "first_rules.yml"
  # - "second_rules.yml"

scrape_configs:
  - job_name: 'scriptflow'
    static_configs:
      - targets: ['scriptflow:3000']
    metrics_path: '/api/metrics'
    scrape_interval: 30s
    
  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres-exporter:9187']
    scrape_interval: 30s
    
  - job_name: 'redis'
    static_configs:
      - targets: ['redis-exporter:9121']
    scrape_interval: 30s
    
  - job_name: 'node'
    static_configs:
      - targets: ['node-exporter:9100']
    scrape_interval: 30s
EOF

    # Grafana datasource
    cat > docker/grafana/datasources/prometheus.yml << EOF
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
EOF
    
    print_success "Monitoring configuration created!"
}

# Function to start services
start_services() {
    print_status "Starting ScriptFlow services..."
    
    # Update docker-compose to use environment file
    export $(cat .env | grep -v '^#' | xargs)
    
    # Start core services
    if [[ $ENABLE_MONITORING =~ ^[Yy]$ ]]; then
        docker-compose --profile monitoring up -d
    else
        docker-compose up -d
    fi
    
    print_status "Waiting for services to start..."
    sleep 30
    
    # Wait for health check
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -sf "http://localhost:3000/api/health" >/dev/null 2>&1; then
            break
        fi
        
        print_status "Waiting for ScriptFlow to be ready... (attempt $attempt/$max_attempts)"
        sleep 10
        ((attempt++))
    done
    
    if [ $attempt -gt $max_attempts ]; then
        print_error "ScriptFlow failed to start within expected time"
        print_status "Checking logs..."
        docker-compose logs scriptflow
        exit 1
    fi
    
    print_success "ScriptFlow is running!"
}

# Function to display installation summary
display_summary() {
    print_success "ScriptFlow installation completed successfully!"
    
    echo
    echo "=== Installation Summary ==="
    echo "Repository: $REPO_URL"
    echo "Installation Directory: $(pwd)"
    echo "Domain: $DOMAIN"
    echo "Admin Email: $ADMIN_EMAIL"
    echo
    echo "=== Access Information ==="
    echo "🌐 Web Interface: https://$DOMAIN"
    echo "🔐 Default Admin: admin / admin (change on first login)"
    echo "📧 Admin Email: $ADMIN_EMAIL"
    echo
    
    if [[ $ENABLE_MONITORING =~ ^[Yy]$ ]]; then
        echo "=== Monitoring ==="
        echo "📊 Grafana: http://$DOMAIN:3001 (admin / $GRAFANA_PASSWORD)"
        echo "📈 Prometheus: http://$DOMAIN:9090"
        echo
    fi
    
    echo "=== Management Commands ==="
    echo "📋 View logs: docker-compose logs -f"
    echo "🔄 Restart: docker-compose restart"
    echo "🛑 Stop: docker-compose down"
    echo "🔧 Update: git pull && docker-compose pull && docker-compose up -d"
    echo
    
    echo "=== Important Files ==="
    echo "📁 Environment: .env"
    echo "🐳 Docker Compose: docker-compose.yml"
    echo "🌐 Nginx Config: docker/nginx/conf.d/scriptflow.conf"
    echo "🔒 SSL Certificates: docker/ssl/"
    echo
    
    if [[ $GENERATE_SSL =~ ^[Yy]$ ]]; then
        print_warning "Self-signed SSL certificates are being used."
        print_warning "Your browser will show security warnings."
        print_warning "For production use, replace with valid certificates."
    fi
    
    echo
    print_success "Installation complete! Visit https://$DOMAIN to get started."
}

# Function to handle cleanup on failure
cleanup_on_failure() {
    print_error "Installation failed!"
    print_status "Cleaning up..."
    
    if [ -d "$PROJECT_DIR" ]; then
        cd "$PROJECT_DIR"
        docker-compose down 2>/dev/null || true
        cd ..
    fi
    
    read -p "Do you want to remove the installation directory? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]] && [ -d "$PROJECT_DIR" ]; then
        rm -rf "$PROJECT_DIR"
        print_status "Installation directory removed."
    fi
    
    exit 1
}

# Function to check if running as root
check_root() {
    if [ "$EUID" -eq 0 ]; then
        print_warning "Running as root is not recommended for security reasons."
        read -p "Do you want to continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
}

# Main installation function
main() {
    # Set up error handling
    trap cleanup_on_failure ERR
    
    # Display banner
    print_banner
    
    # Check if running as root
    check_root
    
    # Check system requirements
    check_requirements
    
    # Collect configuration
    collect_config
    
    # Clone repository
    clone_repository
    
    # Generate SSL certificates
    generate_ssl_certificates
    
    # Create configuration files
    create_env_file
    create_nginx_config
    create_monitoring_config
    
    # Start services
    start_services
    
    # Display summary
    display_summary
}

# Script entry point
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi