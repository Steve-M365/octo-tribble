# 🚀 ScriptFlow - Enterprise Script Management Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Build Status](https://github.com/scriptflow/scriptflow/workflows/CI/badge.svg)](https://github.com/scriptflow/scriptflow/actions)
[![Docker Pulls](https://img.shields.io/docker/pulls/scriptflow/scriptflow)](https://hub.docker.com/r/scriptflow/scriptflow)
[![Discord](https://img.shields.io/discord/YOUR_DISCORD_ID?color=7289da&label=Discord&logo=discord&logoColor=white)](https://discord.gg/scriptflow)
[![Contributors](https://img.shields.io/github/contributors/scriptflow/scriptflow)](https://github.com/scriptflow/scriptflow/graphs/contributors)
[![Test Coverage](https://img.shields.io/codecov/c/github/scriptflow/scriptflow)](https://codecov.io/gh/scriptflow/scriptflow)
[![Security Rating](https://img.shields.io/snyk/vulnerabilities/github/scriptflow/scriptflow)](https://snyk.io/test/github/scriptflow/scriptflow)

> **A modern, secure, and user-friendly platform for managing and executing scripts across Windows, macOS, and Linux environments with enterprise-grade features.**

ScriptFlow empowers IT teams and service desks to centralize script management, provide self-service capabilities to end users, and maintain comprehensive audit trails - all while ensuring security and compliance.

## ✨ Key Features

### 🎯 **For End Users**
- **One-Click Script Execution** - Run approved scripts with simple button clicks
- **Parameter Forms** - User-friendly forms for script inputs with validation
- **Real-time Progress** - Live output and execution status
- **Self-Service Portal** - Reduce IT tickets with automated solutions
- **Mobile Responsive** - Access from any device

### 🛠️ **For IT Teams**
- **Multi-Platform Support** - Windows (PowerShell), macOS/Linux (Bash), Ansible, Python
- **Built-in IDE** - Monaco editor with syntax highlighting, IntelliSense, and AI assistance
- **Version Control** - Track script changes with diff comparison and Git integration
- **Secure Execution** - Elevated privileges without credential exposure
- **Service Desk Integration** - Seamless ticket workflow integration
- **Advanced Scheduling** - CRON, interval, and event-driven automation
- **Performance Monitoring** - Real-time metrics and resource tracking

### 🏢 **For Organizations**
- **Role-Based Access Control** - Granular permissions and user management
- **Comprehensive Auditing** - Complete activity logs for compliance (NIST, SOX, HIPAA)
- **Diagnostic Tools** - Built-in system diagnostics for Windows and macOS
- **Sharing & Collaboration** - Share scripts and results with secure links
- **Enterprise SSO** - LDAP, Active Directory, and SAML integration
- **AI-Powered Features** - Script generation, validation, and optimization
- **Commercial Support** - Freemium and enterprise subscription models

## 🚀 Quick Start

### Using Docker (Recommended)

```bash
# Clone the repository
git clone https://github.com/scriptflow/scriptflow.git
cd scriptflow

# Start with Docker Compose
docker-compose up -d

# Access the application
open http://localhost:3000
```

**Default Login**: `admin` / `admin123` (⚠️ Change immediately!)

### Manual Installation

#### Prerequisites
- Node.js 18+ and npm
- SQLite 3+ (or PostgreSQL for production)
- Docker (optional, for containerized script execution)

#### Installation Steps

```bash
# Clone and install dependencies
git clone https://github.com/scriptflow/scriptflow.git
cd scriptflow
npm run install:all

# Set up environment
cp packages/backend/.env.example packages/backend/.env
# Edit .env file with your configuration

# Initialize database
npm run db:migrate

# Start development servers
npm run dev
```

Access the application at `http://localhost:3000`

## 📊 Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React SPA     │    │  Node.js API    │    │   SQLite/PG     │
│   TypeScript    │◄──►│   Express       │◄──►│   Database      │
│   Tailwind CSS  │    │   WebSockets    │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌─────────────────┐              │
         │              │ Script Executor │              │
         └──────────────►│ Docker/Native   │◄─────────────┘
                        │ Multi-Platform  │
                        └─────────────────┘
```

### Technology Stack

**Frontend:**
- React 18 with TypeScript
- Tailwind CSS for styling
- Monaco Editor for code editing
- React Query for state management
- WebSocket for real-time updates

**Backend:**
- Node.js with Express and TypeScript
- SQLite (development) / PostgreSQL (production)
- JWT authentication with RBAC
- Winston logging
- Docker for secure script execution

**Infrastructure:**
- Docker & Docker Compose
- GitHub Actions CI/CD
- Nginx reverse proxy
- Let's Encrypt SSL

## 📖 Documentation

- **[Installation Guide](docs/installation.md)** - Detailed setup instructions
- **[User Guide](docs/user-guide.md)** - How to use ScriptFlow
- **[Admin Guide](docs/admin-guide.md)** - Administration and configuration
- **[API Documentation](docs/api.md)** - REST API reference
- **[Developer Guide](docs/development.md)** - Contributing and development
- **[Security Guide](docs/security.md)** - Security best practices
- **[Deployment Guide](docs/deployment.md)** - Production deployment

## 🤝 Contributing

We welcome contributions from the community! Whether you're fixing bugs, adding features, improving documentation, or helping with translations, your help is appreciated.

### Ways to Contribute

- 🐛 **Report Bugs** - [Create an issue](https://github.com/scriptflow/scriptflow/issues/new?template=bug_report.md)
- 💡 **Request Features** - [Submit feature requests](https://github.com/scriptflow/scriptflow/issues/new?template=feature_request.md)
- 🔧 **Submit Code** - [Create pull requests](https://github.com/scriptflow/scriptflow/pulls)
- 📚 **Improve Docs** - Help with documentation
- 🌍 **Translate** - Add language support
- 💬 **Community Support** - Help others in discussions

### Getting Started with Development

1. **Fork the repository** and clone your fork
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Set up development environment**: `npm run dev:setup`
4. **Make your changes** and add tests
5. **Run tests**: `npm test`
6. **Commit your changes**: `git commit -m 'Add amazing feature'`
7. **Push to your fork**: `git push origin feature/amazing-feature`
8. **Create a Pull Request**

See our [Contributing Guide](CONTRIBUTING.md) for detailed instructions.

### Code of Conduct

Please read our [Code of Conduct](CODE_OF_CONDUCT.md) to understand the standards we expect from our community.

## 🏗️ Project Structure

```
scriptflow/
├── packages/
│   ├── frontend/          # React frontend application
│   │   ├── src/
│   │   │   ├── components/    # Reusable UI components
│   │   │   ├── pages/         # Page components
│   │   │   ├── hooks/         # Custom React hooks
│   │   │   ├── services/      # API services
│   │   │   └── utils/         # Utility functions
│   │   └── public/            # Static assets
│   └── backend/           # Node.js backend API
│       ├── src/
│       │   ├── routes/        # API route handlers
│       │   ├── middleware/    # Express middleware
│       │   ├── services/      # Business logic
│       │   ├── database/      # Database models and migrations
│       │   └── utils/         # Utility functions
│       └── scripts/           # Database and deployment scripts
├── docs/                  # Documentation
├── docker/               # Docker configuration
├── scripts/              # Build and deployment scripts
├── tests/                # Integration and E2E tests
└── tools/                # Development tools and utilities
```

## 🔒 Security

Security is our top priority. ScriptFlow implements multiple layers of security:

- **Authentication & Authorization** - JWT tokens with role-based access control
- **Input Validation** - Comprehensive validation and sanitization
- **Secure Script Execution** - Containerized execution with resource limits
- **Audit Logging** - Complete activity tracking for compliance
- **Encrypted Storage** - Sensitive data encryption at rest
- **HTTPS Enforcement** - TLS 1.3 for all communications

### Reporting Security Issues

Please report security vulnerabilities to **security@scriptflow.dev** instead of creating public issues. We take security seriously and will respond promptly.

## 🏢 Commercial Support & Hosting

While ScriptFlow is open source and free to use, we offer commercial services:

### ScriptFlow Cloud (SaaS)
- **Freemium Plan** - 10 script executions/day, 5 users
- **Professional Plans** - Starting at $29/month
- **Enterprise Plans** - Custom pricing with SLA

### Professional Services
- **Implementation Support** - Setup and configuration assistance
- **Custom Development** - Feature development and integrations
- **Training & Consulting** - Best practices and optimization
- **Priority Support** - Dedicated support channels

[Contact us](mailto:sales@scriptflow.dev) for commercial inquiries.

## 📈 Roadmap

### Current Version (1.0)
- ✅ Core script management and execution
- ✅ Multi-platform support (Windows, macOS, Linux)
- ✅ Web-based IDE with syntax highlighting and AI assistance
- ✅ Role-based access control with 7 distinct roles
- ✅ Comprehensive audit logging and compliance features
- ✅ Service desk integration with ticket management
- ✅ Advanced scheduling system (CRON, interval, event-driven)
- ✅ Sharing and collaboration features
- ✅ Help system with contextual assistance
- ✅ Commercial billing and subscription management

### Upcoming Features (1.1-1.2)
- 🔄 **Enhanced AI Features** - Advanced script validation and optimization
- 🔄 **Workflow Engine** - Visual workflow designer and execution
- 🔄 **API Improvements** - GraphQL API and enhanced webhooks
- 🔄 **Mobile App** - Native iOS and Android applications
- 🔄 **Advanced Analytics** - ML-powered insights and predictions
- 🔄 **Performance Optimization** - Auto-scaling and load balancing
- 🔄 **Extended Integrations** - Slack, Teams, ServiceNow, and more

### Future Plans (2.0+)
- 🎯 **AI-Powered Script Generation** - Natural language to script conversion
- 🎯 **Kubernetes Integration** - Native container orchestration
- 🎯 **Plugin Ecosystem** - Third-party plugin marketplace
- 🎯 **Multi-Tenancy** - Advanced organization and tenant management
- 🎯 **Edge Computing** - Distributed execution capabilities
- 🎯 **Compliance Automation** - Automated compliance reporting and validation

View our [detailed roadmap](https://github.com/scriptflow/scriptflow/projects/1) for more information.

## 🌟 Community

Join our growing community of developers, IT professionals, and organizations using ScriptFlow:

- **[Discord Server](https://discord.gg/scriptflow)** - Real-time chat and support
- **[GitHub Discussions](https://github.com/scriptflow/scriptflow/discussions)** - Community Q&A and ideas
- **[Reddit Community](https://reddit.com/r/scriptflow)** - News and discussions
- **[LinkedIn Group](https://linkedin.com/groups/scriptflow)** - Professional networking
- **[Twitter](https://twitter.com/scriptflow_dev)** - Updates and announcements

### Community Stats
- 🌟 **GitHub Stars**: Growing daily
- 👥 **Active Contributors**: 50+ developers
- 🏢 **Organizations Using**: 200+ companies
- 💬 **Discord Members**: 1,000+ members

## 🏆 Recognition & Awards

- **Open Source Project of the Month** - DevOps Weekly (2024)
- **Best IT Automation Tool** - IT Pro Awards (2024)
- **Community Choice Award** - GitHub (2024)

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

### What this means:
- ✅ **Commercial Use** - Use ScriptFlow in commercial projects
- ✅ **Modification** - Modify the source code
- ✅ **Distribution** - Distribute your modifications
- ✅ **Private Use** - Use privately without restrictions
- ⚠️ **Liability** - No warranty or liability
- ⚠️ **Attribution** - Include license and copyright notice

## 🙋‍♀️ Support

### Community Support (Free)
- **GitHub Issues** - Bug reports and feature requests
- **GitHub Discussions** - General questions and help
- **Discord Chat** - Real-time community support
- **Documentation** - Comprehensive guides and tutorials

### Professional Support (Paid)
- **Priority Email Support** - Guaranteed response times
- **Video Consultations** - Screen sharing sessions
- **Custom Integration Help** - Assistance with complex setups
- **Training Sessions** - Team training and best practices

[Contact us](mailto:support@scriptflow.dev) for professional support options.

## 🔗 Links

- **Website**: [https://scriptflow.dev](https://scriptflow.dev)
- **Documentation**: [https://docs.scriptflow.dev](https://docs.scriptflow.dev)
- **Cloud Platform**: [https://app.scriptflow.dev](https://app.scriptflow.dev)
- **Status Page**: [https://status.scriptflow.dev](https://status.scriptflow.dev)
- **Blog**: [https://blog.scriptflow.dev](https://blog.scriptflow.dev)

## 🎉 Acknowledgments

Special thanks to all our contributors, sponsors, and the open source community:

- **Contributors** - Everyone who has submitted code, documentation, or feedback
- **Sponsors** - Organizations supporting development
- **Beta Testers** - Early adopters who helped shape the platform
- **Open Source Projects** - The amazing projects we build upon

---

<div align="center">

**Made with ❤️ by the ScriptFlow community**

[⭐ Star us on GitHub](https://github.com/scriptflow/scriptflow) | [🐦 Follow on Twitter](https://twitter.com/scriptflow_dev) | [💬 Join Discord](https://discord.gg/scriptflow)

</div>