# IT Operations Team - Stakeholder Interview Template

**Interviewer**: [BA Name]  
**Interviewee**: [Name, Title, Department]  
**Date**: [Date]  
**Duration**: 60-90 minutes

## Pre-Interview Setup
- [ ] Send agenda 48 hours in advance
- [ ] Include current script management overview document
- [ ] Request access to existing script repositories/tools
- [ ] Prepare demo environment if needed

## Interview Agenda

### 1. Current State Assessment (20 minutes)

#### Script Inventory & Management
- **Q1**: How many scripts do you currently manage across all platforms?
  - Windows (PowerShell/Batch): ___
  - macOS (Bash/Shell): ___
  - Ubuntu/Linux (Bash/Shell): ___
  - Ansible playbooks: ___
  - Other: ___

- **Q2**: How are these scripts currently organized and stored?
  - File system locations
  - Version control systems
  - Documentation practices
  - Naming conventions

- **Q3**: What is your current script development workflow?
  - Creation process
  - Testing procedures
  - Approval workflows
  - Deployment methods

#### Pain Points & Challenges
- **Q4**: What are the biggest challenges with your current script management approach?
  - Versioning issues
  - Access control problems
  - Documentation gaps
  - Deployment difficulties
  - User support burden

- **Q5**: How do you currently handle script execution requests from non-technical users?
  - Request process
  - Parameter collection
  - Execution method
  - Result delivery
  - Support overhead

### 2. Platform Requirements (25 minutes)

#### Script Types & Categories
- **Q6**: What categories of scripts do you manage? (Check all that apply)
  - [ ] System maintenance (updates, cleanup, monitoring)
  - [ ] User account management (creation, modification, deletion)
  - [ ] Application deployment and configuration
  - [ ] Network configuration and troubleshooting
  - [ ] Security compliance and auditing
  - [ ] Backup and recovery operations
  - [ ] Performance monitoring and tuning
  - [ ] Database operations
  - [ ] Other: ___________

- **Q7**: Which scripts require elevated privileges?
  - Percentage requiring admin/root access: ___%
  - Service account requirements
  - Delegation scenarios
  - Security concerns

#### IDE & Development Features
- **Q8**: What features would you want in a script IDE?
  - [ ] Syntax highlighting
  - [ ] Auto-completion
  - [ ] Error detection/linting
  - [ ] Debugging capabilities
  - [ ] Version comparison
  - [ ] Collaborative editing
  - [ ] Template library
  - [ ] Testing framework integration

- **Q9**: How important is multi-language support in a single interface?
  - Critical / Important / Nice-to-have / Not needed
  - Cross-platform script dependencies

#### Parameter Management
- **Q10**: How complex are your script parameters?
  - Simple text inputs
  - File/directory selections
  - Dropdown/choice selections
  - Complex validation rules
  - Conditional parameters

- **Q11**: What parameter validation do you need?
  - Format validation (email, IP, etc.)
  - Range validation (numbers, dates)
  - File existence checks
  - Custom validation rules

### 3. User Experience & Workflow (20 minutes)

#### End User Interaction
- **Q12**: Describe your ideal workflow for non-technical users:
  - Script discovery process
  - Parameter input method
  - Execution approval process
  - Progress monitoring
  - Result presentation

- **Q13**: What information should users see before running a script?
  - [ ] Script description
  - [ ] Expected runtime
  - [ ] System impact
  - [ ] Prerequisites
  - [ ] Risk level
  - [ ] Rollback procedures

#### Administrative Features
- **Q14**: What administrative capabilities do you need?
  - User permission management
  - Script usage analytics
  - Performance monitoring
  - Error tracking
  - Audit reporting

- **Q15**: How should script permissions be managed?
  - Individual user permissions
  - Group-based permissions
  - Role-based access control
  - Temporary access grants
  - Approval workflows

### 4. Technical Integration (15 minutes)

#### Platform Compatibility
- **Q16**: What operating system versions must be supported?
  - Windows: [versions]
  - macOS: [versions]
  - Ubuntu/Linux: [distributions and versions]

- **Q17**: What existing tools/systems need integration?
  - Monitoring systems (Nagios, SCOM, etc.)
  - Ticketing systems (ServiceNow, Jira, etc.)
  - Identity providers (AD, LDAP, SSO)
  - Configuration management (Ansible, Puppet, Chef)
  - Version control (Git, SVN)

#### Service Account Management
- **Q18**: How should service accounts be managed?
  - Creation and rotation process
  - Permission assignment
  - Credential storage
  - Audit requirements

### 5. Security & Compliance (10 minutes)

- **Q19**: What security standards must the platform comply with?
  - [ ] SOX
  - [ ] HIPAA
  - [ ] PCI DSS
  - [ ] ISO 27001
  - [ ] Company-specific policies

- **Q20**: What audit information needs to be captured?
  - User actions
  - Script modifications
  - Execution logs
  - Permission changes
  - System access

## Post-Interview Actions

### Immediate Follow-up (Within 24 hours)
- [ ] Send thank you email with interview summary
- [ ] Request any additional documentation mentioned
- [ ] Schedule follow-up session if needed
- [ ] Share relevant findings with Solutions Architect

### Analysis Tasks
- [ ] Document requirements in backlog
- [ ] Identify integration touchpoints
- [ ] Flag security/compliance requirements
- [ ] Note technical constraints
- [ ] Prioritize features based on feedback

### Validation
- [ ] Review findings with interviewee
- [ ] Cross-reference with other stakeholder inputs
- [ ] Validate technical feasibility with Solutions Architect
- [ ] Update requirements documentation

## Additional Notes Section
_Use this space for any additional observations, concerns, or requirements that don't fit the structured questions above._

---

**Next Steps Discussed:**
- [ ] Demo of current prototype
- [ ] Review of technical architecture
- [ ] Participation in requirements validation workshop
- [ ] Beta testing program involvement

**Contact for Follow-up:**
Email: _______________  
Preferred communication method: _______________  
Best times for contact: _______________