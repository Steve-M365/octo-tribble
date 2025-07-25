# ScriptFlow API Documentation

## Overview

ScriptFlow provides comprehensive REST and GraphQL APIs for programmatic access to all platform features. This documentation covers authentication, endpoints, request/response formats, and integration examples.

## Base URL

```
Production: https://api.scriptflow.dev/v1
Staging: https://staging-api.scriptflow.dev/v1
Development: http://localhost:3000/api
```

## Authentication

### JWT Token Authentication

ScriptFlow uses JWT (JSON Web Tokens) for API authentication. All API requests must include a valid JWT token in the Authorization header.

#### Obtaining a Token

**Endpoint:** `POST /auth/login`

```bash
curl -X POST https://api.scriptflow.dev/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "your_username",
    "password": "your_password"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_in": 86400,
    "user": {
      "id": "user_123",
      "username": "your_username",
      "role": "power_user",
      "email": "user@example.com"
    }
  }
}
```

#### Using the Token

Include the JWT token in the Authorization header of all API requests:

```bash
curl -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  https://api.scriptflow.dev/v1/scripts
```

### API Keys

For server-to-server integrations, you can use API keys instead of JWT tokens.

#### Creating an API Key

**Endpoint:** `POST /auth/api-keys`

```bash
curl -X POST https://api.scriptflow.dev/v1/auth/api-keys \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Integration Key",
    "description": "For CI/CD pipeline integration",
    "expires_at": "2024-12-31T23:59:59Z",
    "permissions": ["execute_script", "read_script"]
  }'
```

#### Using API Keys

```bash
curl -H "X-API-Key: sf_1234567890abcdef" \
  https://api.scriptflow.dev/v1/scripts
```

## Rate Limiting

API requests are rate-limited to prevent abuse:

- **Free Tier**: 100 requests per hour
- **Paid Plans**: 1000 requests per hour
- **Enterprise**: 10,000 requests per hour

Rate limit headers are included in all responses:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
```

## Error Handling

### Error Response Format

All API errors follow a consistent format:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": {
      "field": "name",
      "issue": "Name is required"
    }
  }
}
```

### HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `429` - Too Many Requests
- `500` - Internal Server Error

### Common Error Codes

- `AUTHENTICATION_REQUIRED` - Missing or invalid authentication
- `PERMISSION_DENIED` - Insufficient permissions
- `VALIDATION_ERROR` - Invalid request data
- `RESOURCE_NOT_FOUND` - Requested resource doesn't exist
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `INTERNAL_ERROR` - Server error

## REST API Endpoints

### Authentication Endpoints

#### Login
```http
POST /auth/login
Content-Type: application/json

{
  "username": "string",
  "password": "string"
}
```

#### Refresh Token
```http
POST /auth/refresh
Authorization: Bearer <token>
```

#### Logout
```http
POST /auth/logout
Authorization: Bearer <token>
```

### User Management

#### Get Current User
```http
GET /users/me
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "user_123",
    "username": "john_doe",
    "email": "john@example.com",
    "role": "power_user",
    "created_at": "2023-01-15T10:30:00Z",
    "last_login": "2023-12-01T14:22:00Z"
  }
}
```

#### Update User Profile
```http
PUT /users/me
Authorization: Bearer <token>
Content-Type: application/json

{
  "email": "newemail@example.com",
  "first_name": "John",
  "last_name": "Doe"
}
```

#### List Users (Admin Only)
```http
GET /users?page=1&limit=50&role=power_user
Authorization: Bearer <token>
```

### Script Management

#### List Scripts
```http
GET /scripts?page=1&limit=20&category=monitoring&language=powershell
Authorization: Bearer <token>
```

**Query Parameters:**
- `page` (integer): Page number (default: 1)
- `limit` (integer): Items per page (default: 20, max: 100)
- `category` (string): Filter by category
- `language` (string): Filter by programming language
- `search` (string): Search in name and description
- `created_by` (string): Filter by creator user ID

**Response:**
```json
{
  "success": true,
  "data": {
    "scripts": [
      {
        "id": "script_123",
        "name": "System Health Check",
        "description": "Comprehensive system monitoring",
        "language": "powershell",
        "category": "monitoring",
        "parameters": [
          {
            "name": "server_name",
            "type": "string",
            "required": true,
            "description": "Target server name"
          }
        ],
        "created_by": "user_456",
        "created_at": "2023-11-15T09:00:00Z",
        "updated_at": "2023-11-20T14:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "pages": 3
    }
  }
}
```

#### Get Script Details
```http
GET /scripts/{script_id}
Authorization: Bearer <token>
```

#### Create Script
```http
POST /scripts
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Database Backup",
  "description": "Automated database backup script",
  "language": "bash",
  "category": "maintenance",
  "content": "#!/bin/bash\n# Database backup script\npg_dump...",
  "parameters": [
    {
      "name": "database_name",
      "type": "string",
      "required": true,
      "description": "Name of database to backup"
    }
  ]
}
```

#### Update Script
```http
PUT /scripts/{script_id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Script Name",
  "description": "Updated description",
  "content": "#!/bin/bash\n# Updated script content"
}
```

#### Delete Script
```http
DELETE /scripts/{script_id}
Authorization: Bearer <token>
```

### Script Execution

#### Execute Script
```http
POST /scripts/{script_id}/execute
Authorization: Bearer <token>
Content-Type: application/json

{
  "parameters": {
    "server_name": "prod-server-01",
    "timeout": 300
  },
  "environment": "production"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "execution_id": "exec_789",
    "status": "running",
    "started_at": "2023-12-01T15:30:00Z",
    "websocket_url": "wss://api.scriptflow.dev/ws/executions/exec_789"
  }
}
```

#### Get Execution Status
```http
GET /executions/{execution_id}
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "exec_789",
    "script_id": "script_123",
    "status": "completed",
    "started_at": "2023-12-01T15:30:00Z",
    "completed_at": "2023-12-01T15:32:15Z",
    "duration_ms": 135000,
    "output": "System health check completed successfully...",
    "exit_code": 0,
    "parameters": {
      "server_name": "prod-server-01"
    }
  }
}
```

#### List Executions
```http
GET /executions?script_id=script_123&status=completed&limit=50
Authorization: Bearer <token>
```

#### Cancel Execution
```http
POST /executions/{execution_id}/cancel
Authorization: Bearer <token>
```

### Scheduling

#### List Scheduled Tasks
```http
GET /schedules?active=true&page=1&limit=20
Authorization: Bearer <token>
```

#### Create Schedule
```http
POST /schedules
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Daily Backup",
  "description": "Run backup script daily at 2 AM",
  "script_id": "script_123",
  "schedule_type": "cron",
  "schedule_config": {
    "cron_expression": "0 2 * * *",
    "timezone": "UTC"
  },
  "parameters": {
    "database_name": "production"
  },
  "is_active": true,
  "notification_config": {
    "on_failure": true,
    "email_recipients": ["admin@example.com"]
  }
}
```

#### Update Schedule
```http
PUT /schedules/{schedule_id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "is_active": false,
  "schedule_config": {
    "cron_expression": "0 3 * * *"
  }
}
```

#### Delete Schedule
```http
DELETE /schedules/{schedule_id}
Authorization: Bearer <token>
```

### Service Desk

#### List Tickets
```http
GET /service-desk/tickets?status=open&priority=high&assigned_to=me
Authorization: Bearer <token>
```

#### Create Ticket
```http
POST /service-desk/tickets
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Server Performance Issue",
  "description": "Production server experiencing high CPU usage",
  "priority": "high",
  "category": "infrastructure",
  "requester_email": "user@example.com"
}
```

#### Update Ticket
```http
PUT /service-desk/tickets/{ticket_id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "in_progress",
  "assigned_agent_id": "agent_456"
}
```

#### Add Ticket Note
```http
POST /service-desk/tickets/{ticket_id}/notes
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "Investigating the issue, will update shortly",
  "is_internal": false
}
```

### Sharing

#### Create Shareable Link
```http
POST /sharing/links
Authorization: Bearer <token>
Content-Type: application/json

{
  "resource_type": "script",
  "resource_id": "script_123",
  "access_level": "execute",
  "expires_at": "2024-01-01T00:00:00Z",
  "password_protected": true,
  "password": "secure123"
}
```

#### Access Shared Resource
```http
GET /sharing/links/{share_token}?password=secure123
```

### Analytics and Reporting

#### Get Usage Statistics
```http
GET /analytics/usage?period=30d&group_by=user
Authorization: Bearer <token>
```

#### Get Script Performance
```http
GET /analytics/scripts/{script_id}/performance?period=7d
Authorization: Bearer <token>
```

#### Get System Health
```http
GET /analytics/system/health
Authorization: Bearer <token>
```

## WebSocket API

ScriptFlow provides real-time updates through WebSocket connections for script executions, system notifications, and live collaboration.

### Connection

```javascript
const ws = new WebSocket('wss://api.scriptflow.dev/ws');
ws.onopen = function() {
  // Send authentication
  ws.send(JSON.stringify({
    type: 'auth',
    token: 'your_jwt_token'
  }));
};
```

### Message Format

All WebSocket messages follow this format:

```json
{
  "type": "message_type",
  "data": {
    "key": "value"
  },
  "timestamp": "2023-12-01T15:30:00Z"
}
```

### Message Types

#### Script Execution Updates
```json
{
  "type": "execution_update",
  "data": {
    "execution_id": "exec_789",
    "status": "running",
    "output": "Starting system check...\n"
  }
}
```

#### System Notifications
```json
{
  "type": "notification",
  "data": {
    "level": "info",
    "title": "Schedule Completed",
    "message": "Daily backup completed successfully"
  }
}
```

#### Collaboration Events
```json
{
  "type": "collaboration",
  "data": {
    "script_id": "script_123",
    "user": "john_doe",
    "action": "cursor_move",
    "position": { "line": 15, "column": 20 }
  }
}
```

## GraphQL API

ScriptFlow also provides a GraphQL API for more flexible data querying.

### Endpoint

```
POST https://api.scriptflow.dev/v1/graphql
```

### Schema Overview

```graphql
type Query {
  me: User
  scripts(filter: ScriptFilter, pagination: Pagination): ScriptConnection
  script(id: ID!): Script
  executions(filter: ExecutionFilter, pagination: Pagination): ExecutionConnection
  schedules(filter: ScheduleFilter, pagination: Pagination): ScheduleConnection
}

type Mutation {
  createScript(input: CreateScriptInput!): Script
  updateScript(id: ID!, input: UpdateScriptInput!): Script
  deleteScript(id: ID!): Boolean
  executeScript(id: ID!, parameters: JSON): Execution
  createSchedule(input: CreateScheduleInput!): Schedule
}

type Subscription {
  executionUpdates(executionId: ID!): ExecutionUpdate
  notifications: Notification
  collaborationEvents(scriptId: ID!): CollaborationEvent
}
```

### Example Queries

#### Get User Scripts
```graphql
query GetMyScripts {
  scripts(filter: { createdBy: "me" }) {
    edges {
      node {
        id
        name
        description
        language
        category
        createdAt
        parameters {
          name
          type
          required
          description
        }
      }
    }
    pageInfo {
      hasNextPage
      hasPreviousPage
      startCursor
      endCursor
    }
  }
}
```

#### Execute Script
```graphql
mutation ExecuteScript($scriptId: ID!, $parameters: JSON) {
  executeScript(id: $scriptId, parameters: $parameters) {
    id
    status
    startedAt
    output
  }
}
```

#### Subscribe to Execution Updates
```graphql
subscription ExecutionUpdates($executionId: ID!) {
  executionUpdates(executionId: $executionId) {
    executionId
    status
    output
    timestamp
  }
}
```

## SDK and Client Libraries

### JavaScript/TypeScript SDK

```bash
npm install @scriptflow/sdk
```

```javascript
import ScriptFlow from '@scriptflow/sdk';

const client = new ScriptFlow({
  apiKey: 'your_api_key',
  baseURL: 'https://api.scriptflow.dev/v1'
});

// Execute a script
const execution = await client.scripts.execute('script_123', {
  server_name: 'prod-server-01'
});

// Monitor execution progress
execution.onUpdate((data) => {
  console.log('Status:', data.status);
  console.log('Output:', data.output);
});
```

### Python SDK

```bash
pip install scriptflow-sdk
```

```python
from scriptflow import ScriptFlowClient

client = ScriptFlowClient(api_key='your_api_key')

# List scripts
scripts = client.scripts.list(category='monitoring')

# Execute script
execution = client.scripts.execute(
    script_id='script_123',
    parameters={'server_name': 'prod-server-01'}
)

# Wait for completion
result = execution.wait_for_completion()
print(f"Exit code: {result.exit_code}")
print(f"Output: {result.output}")
```

### PowerShell Module

```powershell
Install-Module -Name ScriptFlow

# Connect to ScriptFlow
Connect-ScriptFlow -ApiKey "your_api_key"

# Execute script
$execution = Invoke-ScriptFlowScript -ScriptId "script_123" -Parameters @{
    ServerName = "prod-server-01"
}

# Get results
$result = Get-ScriptFlowExecution -ExecutionId $execution.Id
Write-Output $result.Output
```

## Webhooks

ScriptFlow can send HTTP POST requests to your endpoints when certain events occur.

### Webhook Configuration

```http
POST /webhooks
Authorization: Bearer <token>
Content-Type: application/json

{
  "url": "https://your-app.com/webhooks/scriptflow",
  "events": ["execution.completed", "schedule.failed", "ticket.created"],
  "secret": "webhook_secret_key",
  "active": true
}
```

### Webhook Payload

```json
{
  "event": "execution.completed",
  "timestamp": "2023-12-01T15:32:15Z",
  "data": {
    "execution_id": "exec_789",
    "script_id": "script_123",
    "status": "completed",
    "exit_code": 0,
    "duration_ms": 135000,
    "triggered_by": "user_456"
  },
  "signature": "sha256=abc123..."
}
```

### Verifying Webhook Signatures

```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return signature === `sha256=${expectedSignature}`;
}
```

## Integration Examples

### CI/CD Pipeline Integration

```yaml
# GitHub Actions example
name: Deploy Script
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Deploy to ScriptFlow
        run: |
          curl -X POST https://api.scriptflow.dev/v1/scripts \
            -H "X-API-Key: ${{ secrets.SCRIPTFLOW_API_KEY }}" \
            -H "Content-Type: application/json" \
            -d '{
              "name": "Deployment Script",
              "content": "'$(cat deploy.sh | base64 -w 0)'",
              "language": "bash"
            }'
```

### Monitoring Integration

```python
# Prometheus metrics integration
import requests
from prometheus_client import start_http_server, Counter, Histogram

SCRIPT_EXECUTIONS = Counter('scriptflow_executions_total', 'Total script executions', ['status'])
EXECUTION_TIME = Histogram('scriptflow_execution_seconds', 'Script execution time')

def check_scriptflow_health():
    response = requests.get(
        'https://api.scriptflow.dev/v1/analytics/system/health',
        headers={'X-API-Key': 'your_api_key'}
    )
    
    if response.status_code == 200:
        data = response.json()['data']
        # Update Prometheus metrics
        for status, count in data['execution_counts'].items():
            SCRIPT_EXECUTIONS.labels(status=status).inc(count)
```

### Slack Integration

```javascript
// Slack bot integration
const { WebClient } = require('@slack/web-api');
const slack = new WebClient(process.env.SLACK_TOKEN);

// Handle ScriptFlow webhook
app.post('/webhooks/scriptflow', (req, res) => {
  const { event, data } = req.body;
  
  if (event === 'execution.failed') {
    slack.chat.postMessage({
      channel: '#alerts',
      text: `🚨 Script execution failed: ${data.script_name}`,
      attachments: [{
        color: 'danger',
        fields: [{
          title: 'Error',
          value: data.error_message,
          short: false
        }]
      }]
    });
  }
  
  res.status(200).send('OK');
});
```

## Best Practices

### Authentication
- Use API keys for server-to-server integrations
- Implement token refresh logic for long-running applications
- Store credentials securely using environment variables or secret management systems

### Error Handling
- Always check response status codes
- Implement retry logic with exponential backoff
- Log errors for debugging and monitoring

### Rate Limiting
- Implement client-side rate limiting
- Use pagination for large data sets
- Cache responses when appropriate

### Security
- Validate webhook signatures
- Use HTTPS for all API communications
- Implement proper access controls and permissions

### Performance
- Use GraphQL for complex queries to reduce over-fetching
- Implement connection pooling for high-volume applications
- Monitor API response times and optimize accordingly

## Support and Resources

- **API Documentation**: https://docs.scriptflow.dev/api
- **SDK Documentation**: https://docs.scriptflow.dev/sdk
- **Community Forum**: https://community.scriptflow.dev
- **GitHub Issues**: https://github.com/scriptflow/scriptflow/issues
- **Support Email**: api-support@scriptflow.dev

For additional help with API integration or custom development needs, please contact our professional services team.