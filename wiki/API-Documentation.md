# API Documentation

ScriptFlow provides comprehensive REST and GraphQL APIs for programmatic access to all platform features.

## 🌐 Base URLs

```
Production: https://api.scriptflow.dev/v1
Staging: https://staging-api.scriptflow.dev/v1
Development: http://localhost:3000/api
```

## 🔐 Authentication

### JWT Token Authentication

All API requests require a valid JWT token in the Authorization header.

#### Getting a Token

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
      "role": "power_user"
    }
  }
}
```

#### Using the Token

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  https://api.scriptflow.dev/v1/scripts
```

### API Keys

For server-to-server integrations:

```bash
curl -X POST https://api.scriptflow.dev/v1/auth/api-keys \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "Integration Key",
    "permissions": ["execute_script", "read_script"]
  }'
```

Use with:
```bash
curl -H "X-API-Key: sf_1234567890abcdef" \
  https://api.scriptflow.dev/v1/scripts
```

## 📊 Rate Limiting

- **Free Tier**: 100 requests/hour
- **Paid Plans**: 1000 requests/hour  
- **Enterprise**: 10,000 requests/hour

Rate limit headers:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
```

## 🛠️ REST API Endpoints

### Authentication

#### Login
```http
POST /auth/login
```

**Request:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "string",
    "user": {
      "id": "string",
      "username": "string",
      "role": "string"
    }
  }
}
```

### Scripts

#### List Scripts
```http
GET /scripts?page=1&limit=20&category=monitoring
```

**Query Parameters:**
- `page` (integer): Page number
- `limit` (integer): Items per page (max 100)
- `category` (string): Filter by category
- `language` (string): Filter by language
- `search` (string): Search term

**Response:**
```json
{
  "success": true,
  "data": {
    "scripts": [
      {
        "id": "script_123",
        "name": "System Health Check",
        "description": "Monitor system health",
        "language": "bash",
        "category": "monitoring",
        "created_at": "2023-12-01T10:00:00Z"
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

#### Get Script
```http
GET /scripts/{script_id}
```

#### Create Script
```http
POST /scripts
```

**Request:**
```json
{
  "name": "Database Backup",
  "description": "Backup production database",
  "language": "bash",
  "category": "maintenance",
  "content": "#!/bin/bash\npg_dump production_db...",
  "parameters": [
    {
      "name": "database_name",
      "type": "string",
      "required": true,
      "description": "Database to backup"
    }
  ]
}
```

#### Update Script
```http
PUT /scripts/{script_id}
```

#### Delete Script
```http
DELETE /scripts/{script_id}
```

### Script Execution

#### Execute Script
```http
POST /scripts/{script_id}/execute
```

**Request:**
```json
{
  "parameters": {
    "database_name": "production",
    "backup_path": "/backups"
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
    "output": "Backup completed successfully...",
    "exit_code": 0
  }
}
```

#### List Executions
```http
GET /executions?script_id=script_123&status=completed
```

#### Cancel Execution
```http
POST /executions/{execution_id}/cancel
```

### Scheduling

#### List Schedules
```http
GET /schedules?active=true
```

#### Create Schedule
```http
POST /schedules
```

**Request:**
```json
{
  "name": "Daily Backup",
  "script_id": "script_123",
  "schedule_type": "cron",
  "schedule_config": {
    "cron_expression": "0 2 * * *",
    "timezone": "UTC"
  },
  "parameters": {
    "database_name": "production"
  },
  "notification_config": {
    "on_failure": true,
    "email_recipients": ["admin@example.com"]
  }
}
```

#### Update Schedule
```http
PUT /schedules/{schedule_id}
```

#### Delete Schedule
```http
DELETE /schedules/{schedule_id}
```

### Users

#### Get Current User
```http
GET /users/me
```

#### List Users (Admin)
```http
GET /users?role=power_user
```

#### Create User (Admin)
```http
POST /users
```

**Request:**
```json
{
  "username": "new_user",
  "email": "user@example.com",
  "password": "secure_password",
  "role": "user",
  "first_name": "John",
  "last_name": "Doe"
}
```

### Service Desk

#### List Tickets
```http
GET /service-desk/tickets?status=open
```

#### Create Ticket
```http
POST /service-desk/tickets
```

**Request:**
```json
{
  "title": "Server Performance Issue",
  "description": "Production server high CPU usage",
  "priority": "high",
  "category": "infrastructure"
}
```

#### Update Ticket
```http
PUT /service-desk/tickets/{ticket_id}
```

#### Add Note
```http
POST /service-desk/tickets/{ticket_id}/notes
```

### Analytics

#### Usage Statistics
```http
GET /analytics/usage?period=30d
```

#### Script Performance
```http
GET /analytics/scripts/{script_id}/performance
```

#### System Health
```http
GET /analytics/system/health
```

## 🔌 WebSocket API

Real-time updates for script executions and notifications.

### Connection

```javascript
const ws = new WebSocket('wss://api.scriptflow.dev/ws');

ws.onopen = function() {
  // Authenticate
  ws.send(JSON.stringify({
    type: 'auth',
    token: 'your_jwt_token'
  }));
};

ws.onmessage = function(event) {
  const message = JSON.parse(event.data);
  console.log('Received:', message);
};
```

### Message Types

#### Execution Updates
```json
{
  "type": "execution_update",
  "data": {
    "execution_id": "exec_789",
    "status": "running",
    "output": "Processing backup...\n",
    "progress": 45
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

## 📊 GraphQL API

More flexible querying with GraphQL.

### Endpoint
```
POST https://api.scriptflow.dev/v1/graphql
```

### Schema Overview

```graphql
type Query {
  scripts(filter: ScriptFilter): [Script]
  script(id: ID!): Script
  executions(filter: ExecutionFilter): [Execution]
  schedules: [Schedule]
}

type Mutation {
  createScript(input: CreateScriptInput!): Script
  executeScript(id: ID!, parameters: JSON): Execution
}

type Subscription {
  executionUpdates(executionId: ID!): ExecutionUpdate
}
```

### Example Queries

#### Get Scripts
```graphql
query GetScripts {
  scripts(filter: { category: "monitoring" }) {
    id
    name
    description
    language
    parameters {
      name
      type
      required
    }
  }
}
```

#### Execute Script
```graphql
mutation ExecuteScript($scriptId: ID!, $params: JSON) {
  executeScript(id: $scriptId, parameters: $params) {
    id
    status
    startedAt
  }
}
```

#### Subscribe to Updates
```graphql
subscription ExecutionUpdates($executionId: ID!) {
  executionUpdates(executionId: $executionId) {
    status
    output
    progress
  }
}
```

## 📚 SDKs and Libraries

### JavaScript/Node.js

```bash
npm install @scriptflow/sdk
```

```javascript
import ScriptFlow from '@scriptflow/sdk';

const client = new ScriptFlow({
  apiKey: 'your_api_key',
  baseURL: 'https://api.scriptflow.dev/v1'
});

// Execute script
const execution = await client.scripts.execute('script_123', {
  database_name: 'production'
});

// Monitor progress
execution.onUpdate((data) => {
  console.log(`Status: ${data.status}`);
  console.log(`Output: ${data.output}`);
});

// Wait for completion
const result = await execution.waitForCompletion();
console.log(`Exit code: ${result.exit_code}`);
```

### Python

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
    parameters={'database_name': 'production'}
)

# Wait for completion
result = execution.wait_for_completion()
print(f"Exit code: {result.exit_code}")
```

### PowerShell

```powershell
Install-Module -Name ScriptFlow

Connect-ScriptFlow -ApiKey "your_api_key"

# Execute script
$execution = Invoke-ScriptFlowScript -ScriptId "script_123" -Parameters @{
    DatabaseName = "production"
}

# Get results
$result = Get-ScriptFlowExecution -ExecutionId $execution.Id
Write-Output $result.Output
```

## 🪝 Webhooks

Configure webhooks to receive HTTP POST requests when events occur.

### Setup Webhook

```http
POST /webhooks
```

**Request:**
```json
{
  "url": "https://your-app.com/webhooks/scriptflow",
  "events": ["execution.completed", "schedule.failed"],
  "secret": "webhook_secret",
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
    "duration_ms": 135000
  },
  "signature": "sha256=abc123..."
}
```

### Verify Signature

```javascript
const crypto = require('crypto');

function verifySignature(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return signature === `sha256=${expectedSignature}`;
}
```

## 🚨 Error Handling

### Error Response Format

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

- `AUTHENTICATION_REQUIRED` - Missing/invalid auth
- `PERMISSION_DENIED` - Insufficient permissions
- `VALIDATION_ERROR` - Invalid request data
- `RESOURCE_NOT_FOUND` - Resource doesn't exist
- `RATE_LIMIT_EXCEEDED` - Too many requests

## 🔗 Integration Examples

### CI/CD Pipeline

```yaml
# GitHub Actions
- name: Deploy Script
  run: |
    curl -X POST ${{ secrets.SCRIPTFLOW_API }}/scripts \
      -H "X-API-Key: ${{ secrets.SCRIPTFLOW_API_KEY }}" \
      -d @deploy-script.json
```

### Monitoring Integration

```python
# Prometheus metrics
import requests
from prometheus_client import Counter

executions = Counter('scriptflow_executions_total', 'Total executions')

response = requests.get(
    'https://api.scriptflow.dev/v1/analytics/usage',
    headers={'X-API-Key': 'your_key'}
)

for status, count in response.json()['data']['by_status'].items():
    executions.labels(status=status).inc(count)
```

### Slack Integration

```javascript
// Webhook handler
app.post('/webhooks/scriptflow', (req, res) => {
  const { event, data } = req.body;
  
  if (event === 'execution.failed') {
    slack.chat.postMessage({
      channel: '#alerts',
      text: `🚨 Script execution failed: ${data.script_name}`
    });
  }
  
  res.status(200).send('OK');
});
```

## 📖 OpenAPI Specification

Full OpenAPI 3.0 specification available at:
- **Swagger UI**: https://api.scriptflow.dev/docs
- **JSON Spec**: https://api.scriptflow.dev/openapi.json
- **YAML Spec**: https://api.scriptflow.dev/openapi.yaml

## 🛠️ Best Practices

### Authentication
- Use API keys for server-to-server
- Implement token refresh for long-running apps
- Store credentials securely

### Error Handling
- Always check response status
- Implement retry with exponential backoff
- Log errors for debugging

### Performance
- Use pagination for large datasets
- Implement client-side rate limiting
- Cache responses when appropriate

### Security
- Validate webhook signatures
- Use HTTPS for all communications
- Implement proper access controls

## 📞 Support

- **API Documentation**: https://docs.scriptflow.dev/api
- **SDK Docs**: https://docs.scriptflow.dev/sdk
- **GitHub Issues**: https://github.com/scriptflow/scriptflow/issues
- **Discord**: https://discord.gg/scriptflow
- **Email**: api-support@scriptflow.dev

---

**Need help?** Join our [Discord community](https://discord.gg/scriptflow) or check the [Troubleshooting](Troubleshooting) guide.