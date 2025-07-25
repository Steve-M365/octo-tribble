# Contributing to ScriptFlow

Thank you for your interest in contributing to ScriptFlow! This guide will help you understand how to contribute effectively to our open source enterprise script management platform.

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
3. [Development Setup](#development-setup)
4. [Contributing Guidelines](#contributing-guidelines)
5. [Pull Request Process](#pull-request-process)
6. [Issue Guidelines](#issue-guidelines)
7. [Testing](#testing)
8. [Documentation](#documentation)
9. [Community](#community)

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md). Please read it before contributing.

### Our Pledge

We are committed to making participation in our project a harassment-free experience for everyone, regardless of age, body size, disability, ethnicity, sex characteristics, gender identity and expression, level of experience, education, socio-economic status, nationality, personal appearance, race, religion, or sexual identity and orientation.

## Getting Started

### Ways to Contribute

There are many ways to contribute to ScriptFlow:

- 🐛 **Report bugs** - Help us identify and fix issues
- 💡 **Suggest features** - Propose new functionality
- 🔧 **Submit code** - Fix bugs or implement features
- 📚 **Improve documentation** - Help others understand and use ScriptFlow
- 🌍 **Translate** - Add support for new languages
- 💬 **Help others** - Answer questions in discussions and forums
- 🎨 **Design** - Improve UI/UX and create assets
- 🧪 **Test** - Help with testing new features and releases

### Before You Start

1. **Check existing issues** - Look for existing bug reports or feature requests
2. **Join our community** - Connect with other contributors on [Discord](https://discord.gg/scriptflow)
3. **Read the documentation** - Familiarize yourself with ScriptFlow's architecture and features
4. **Start small** - Begin with good first issues to understand our workflow

## Development Setup

### Prerequisites

- **Node.js** 18.0 or higher
- **npm** 8.0 or higher
- **Git** 2.30 or higher
- **Docker** (optional, for containerized development)
- **PostgreSQL** 13+ (optional, SQLite is used by default)

### Local Development

1. **Fork the repository**
   ```bash
   # Fork on GitHub, then clone your fork
   git clone https://github.com/YOUR_USERNAME/scriptflow.git
   cd scriptflow
   ```

2. **Set up the development environment**
   ```bash
   # Install dependencies for all packages
   npm run install:all
   
   # Copy environment configuration
   cp packages/backend/.env.example packages/backend/.env
   
   # Edit .env file with your local settings
   nano packages/backend/.env
   ```

3. **Initialize the database**
   ```bash
   # Run database migrations
   npm run db:migrate
   
   # Seed with sample data (optional)
   npm run db:seed
   ```

4. **Start the development servers**
   ```bash
   # Start both frontend and backend in development mode
   npm run dev
   
   # Or start them separately
   npm run dev:backend  # Backend on http://localhost:3000
   npm run dev:frontend # Frontend on http://localhost:3001
   ```

5. **Verify the setup**
   - Backend API: http://localhost:3000/api/health
   - Frontend: http://localhost:3001
   - Default login: `admin` / `admin123`

### Docker Development

For a consistent development environment:

```bash
# Start development environment with Docker
docker-compose -f docker-compose.dev.yml up

# Run tests in Docker
docker-compose -f docker-compose.dev.yml exec app npm test
```

### Project Structure

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
│       └── tests/             # Backend tests
├── docs/                  # Documentation
├── testing/              # Testing framework and plans
├── scripts/              # Build and deployment scripts
└── tools/                # Development tools
```

## Contributing Guidelines

### Coding Standards

#### General Principles

- **Consistency** - Follow existing code patterns and conventions
- **Readability** - Write clear, self-documenting code
- **Performance** - Consider performance implications of your changes
- **Security** - Follow security best practices
- **Accessibility** - Ensure UI changes are accessible

#### TypeScript/JavaScript

```typescript
// Use TypeScript for all new code
// Follow these conventions:

// 1. Use descriptive variable names
const userExecutionHistory = await getUserExecutions(userId);

// 2. Use async/await instead of promises
async function executeScript(scriptId: string): Promise<ExecutionResult> {
  try {
    const result = await scriptService.execute(scriptId);
    return result;
  } catch (error) {
    logger.error('Script execution failed', { scriptId, error });
    throw error;
  }
}

// 3. Use proper error handling
if (!user) {
  throw new Error('User not found');
}

// 4. Add JSDoc comments for functions
/**
 * Executes a script with the given parameters
 * @param scriptId - The ID of the script to execute
 * @param parameters - Script execution parameters
 * @returns Promise resolving to execution result
 */
async function executeScript(scriptId: string, parameters: Record<string, any>): Promise<ExecutionResult> {
  // Implementation
}
```

#### React Components

```tsx
// Use functional components with hooks
import React, { useState, useEffect } from 'react';

interface ScriptCardProps {
  script: Script;
  onExecute: (scriptId: string) => void;
}

export const ScriptCard: React.FC<ScriptCardProps> = ({ script, onExecute }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleExecute = async () => {
    setIsLoading(true);
    try {
      await onExecute(script.id);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="script-card">
      <h3>{script.name}</h3>
      <p>{script.description}</p>
      <button 
        onClick={handleExecute} 
        disabled={isLoading}
        className="btn btn-primary"
      >
        {isLoading ? 'Executing...' : 'Execute'}
      </button>
    </div>
  );
};
```

#### CSS/Styling

- Use Tailwind CSS classes for styling
- Create custom components for reusable styles
- Follow mobile-first responsive design
- Ensure accessibility (proper contrast, focus states)

```tsx
// Good: Using Tailwind classes
<button className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-blue-500">
  Execute Script
</button>

// Good: Custom component for consistency
<Button variant="primary" size="md" onClick={handleClick}>
  Execute Script
</Button>
```

### Git Workflow

#### Branch Naming

- **Feature branches**: `feature/description-of-feature`
- **Bug fixes**: `fix/description-of-bug`
- **Documentation**: `docs/description-of-change`
- **Refactoring**: `refactor/description-of-change`
- **Tests**: `test/description-of-test`

Examples:
```bash
git checkout -b feature/ai-script-validation
git checkout -b fix/execution-timeout-handling
git checkout -b docs/api-authentication-guide
```

#### Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```bash
# Format: type(scope): description

# Examples:
feat(api): add script execution endpoint
fix(ui): resolve script editor syntax highlighting
docs(readme): update installation instructions
test(backend): add unit tests for user service
refactor(frontend): simplify component structure
```

**Types:**
- `feat` - New features
- `fix` - Bug fixes
- `docs` - Documentation changes
- `style` - Code style changes (formatting, etc.)
- `refactor` - Code refactoring
- `test` - Adding or updating tests
- `chore` - Maintenance tasks

#### Commit Best Practices

- **Keep commits atomic** - One logical change per commit
- **Write descriptive messages** - Explain what and why, not just what
- **Reference issues** - Include issue numbers when applicable

```bash
# Good commit message
feat(scheduler): add CRON expression validation

- Add validation for CRON expressions in schedule creation
- Include user-friendly error messages for invalid expressions
- Add unit tests for validation logic

Fixes #123
```

## Pull Request Process

### Before Submitting

1. **Test your changes**
   ```bash
   # Run all tests
   npm test
   
   # Run linting
   npm run lint
   
   # Check TypeScript compilation
   npm run type-check
   
   # Test the build
   npm run build
   ```

2. **Update documentation** if needed
3. **Add or update tests** for your changes
4. **Check for breaking changes** and update accordingly

### Pull Request Template

When creating a pull request, use this template:

```markdown
## Description
Brief description of the changes and their purpose.

## Type of Change
- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update
- [ ] Refactoring (no functional changes)
- [ ] Performance improvement

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed
- [ ] New tests added for new functionality

## Screenshots (if applicable)
Include screenshots for UI changes.

## Checklist
- [ ] My code follows the project's coding standards
- [ ] I have performed a self-review of my code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] New and existing unit tests pass locally
- [ ] Any dependent changes have been merged and published
```

### Review Process

1. **Automated checks** - All CI checks must pass
2. **Code review** - At least one maintainer review required
3. **Testing** - Changes are tested in staging environment
4. **Documentation** - Relevant documentation is updated
5. **Approval** - Final approval from maintainer

### After Submission

- **Respond to feedback** promptly and professionally
- **Make requested changes** in additional commits
- **Keep PR updated** with main branch if needed
- **Participate in discussion** about the changes

## Issue Guidelines

### Before Creating an Issue

1. **Search existing issues** to avoid duplicates
2. **Check the documentation** for answers
3. **Try the latest version** to see if the issue is already fixed
4. **Gather information** about your environment and steps to reproduce

### Bug Reports

Use the bug report template:

```markdown
**Describe the bug**
A clear and concise description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

**Expected behavior**
A clear and concise description of what you expected to happen.

**Screenshots**
If applicable, add screenshots to help explain your problem.

**Environment:**
 - OS: [e.g. Windows 10, Ubuntu 20.04]
 - Browser [e.g. chrome, safari]
 - ScriptFlow Version [e.g. 1.0.0]
 - Node.js Version [e.g. 18.0.0]

**Additional context**
Add any other context about the problem here.
```

### Feature Requests

Use the feature request template:

```markdown
**Is your feature request related to a problem? Please describe.**
A clear and concise description of what the problem is.

**Describe the solution you'd like**
A clear and concise description of what you want to happen.

**Describe alternatives you've considered**
A clear and concise description of any alternative solutions or features you've considered.

**Additional context**
Add any other context or screenshots about the feature request here.

**Implementation ideas**
If you have ideas about how this could be implemented, please share them.
```

### Issue Labels

We use labels to categorize and prioritize issues:

**Type:**
- `bug` - Something isn't working
- `feature` - New feature or request
- `documentation` - Improvements or additions to documentation
- `question` - Further information is requested

**Priority:**
- `critical` - Critical issues that need immediate attention
- `high` - High priority issues
- `medium` - Medium priority issues
- `low` - Low priority issues

**Status:**
- `good first issue` - Good for newcomers
- `help wanted` - Extra attention is needed
- `in progress` - Someone is working on this
- `needs review` - Needs review from maintainers

**Area:**
- `frontend` - Frontend related
- `backend` - Backend related
- `api` - API related
- `security` - Security related
- `performance` - Performance related

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run specific test files
npm test -- --testNamePattern="user service"

# Run frontend tests only
cd packages/frontend && npm test

# Run backend tests only
cd packages/backend && npm test
```

### Writing Tests

#### Unit Tests

```typescript
// Example unit test
import { validateScriptParameters } from '../utils/validation';

describe('validateScriptParameters', () => {
  it('should validate required parameters', () => {
    const parameters = [
      { name: 'server', type: 'string', required: true }
    ];
    const values = { server: 'localhost' };
    
    const result = validateScriptParameters(parameters, values);
    expect(result.isValid).toBe(true);
  });

  it('should reject missing required parameters', () => {
    const parameters = [
      { name: 'server', type: 'string', required: true }
    ];
    const values = {};
    
    const result = validateScriptParameters(parameters, values);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('server is required');
  });
});
```

#### Integration Tests

```typescript
// Example integration test
import request from 'supertest';
import { app } from '../app';
import { setupTestDb, cleanupTestDb } from '../test-utils';

describe('POST /api/scripts', () => {
  beforeAll(async () => {
    await setupTestDb();
  });

  afterAll(async () => {
    await cleanupTestDb();
  });

  it('should create a new script', async () => {
    const scriptData = {
      name: 'Test Script',
      description: 'A test script',
      language: 'bash',
      content: 'echo "Hello World"'
    };

    const response = await request(app)
      .post('/api/scripts')
      .set('Authorization', 'Bearer valid-token')
      .send(scriptData)
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.name).toBe(scriptData.name);
  });
});
```

#### End-to-End Tests

```typescript
// Example E2E test with Playwright
import { test, expect } from '@playwright/test';

test('user can execute a script', async ({ page }) => {
  // Login
  await page.goto('/login');
  await page.fill('[data-testid=username]', 'testuser');
  await page.fill('[data-testid=password]', 'password');
  await page.click('[data-testid=login-button]');

  // Navigate to scripts
  await page.click('[data-testid=scripts-nav]');
  
  // Execute a script
  await page.click('[data-testid=script-card]:first-child [data-testid=execute-button]');
  await page.click('[data-testid=confirm-execute]');
  
  // Verify execution started
  await expect(page.locator('[data-testid=execution-status]')).toContainText('Running');
});
```

### Test Coverage

We aim for:
- **Unit tests**: 80%+ code coverage
- **Integration tests**: All API endpoints covered
- **E2E tests**: Critical user journeys covered

## Documentation

### Types of Documentation

1. **Code documentation** - JSDoc comments, inline comments
2. **API documentation** - OpenAPI/Swagger specs
3. **User guides** - How to use features
4. **Developer guides** - How to contribute and develop
5. **Architecture docs** - System design and architecture

### Writing Documentation

#### Code Comments

```typescript
/**
 * Executes a script with the provided parameters
 * 
 * @param scriptId - Unique identifier for the script
 * @param parameters - Key-value pairs for script parameters
 * @param options - Execution options (timeout, environment, etc.)
 * @returns Promise resolving to execution result
 * @throws {ValidationError} When parameters are invalid
 * @throws {PermissionError} When user lacks execution permission
 * 
 * @example
 * ```typescript
 * const result = await executeScript('script-123', {
 *   serverName: 'prod-server-01',
 *   action: 'restart'
 * });
 * ```
 */
async function executeScript(
  scriptId: string,
  parameters: Record<string, any>,
  options: ExecutionOptions = {}
): Promise<ExecutionResult> {
  // Implementation
}
```

#### README Updates

When adding new features, update relevant README sections:

- Installation instructions
- Configuration options
- Usage examples
- API changes
- Breaking changes

#### Documentation Style

- **Clear and concise** - Easy to understand
- **Complete** - Cover all necessary information
- **Up-to-date** - Keep in sync with code changes
- **Examples** - Include practical examples
- **Accessible** - Use simple language when possible

### Documentation Tools

- **JSDoc** - Code documentation
- **Markdown** - General documentation
- **OpenAPI** - API documentation
- **Storybook** - Component documentation (for UI components)

## Community

### Communication Channels

- **GitHub Discussions** - General questions and discussions
- **Discord** - Real-time chat and community support
- **GitHub Issues** - Bug reports and feature requests
- **Twitter** - Updates and announcements
- **Blog** - In-depth articles and tutorials

### Community Guidelines

1. **Be respectful** - Treat everyone with respect and kindness
2. **Be helpful** - Help others when you can
3. **Be patient** - Remember that everyone has different experience levels
4. **Be constructive** - Provide actionable feedback
5. **Stay on topic** - Keep discussions relevant
6. **Follow the Code of Conduct** - Maintain a welcoming environment

### Getting Help

- **Documentation** - Check the docs first
- **Search issues** - Look for existing solutions
- **Ask in discussions** - Post questions in GitHub Discussions
- **Join Discord** - Get real-time help from the community
- **Contact maintainers** - For urgent issues or security concerns

### Mentorship

We offer mentorship for new contributors:

- **Good first issues** - Labeled issues perfect for beginners
- **Mentorship program** - Pairing experienced contributors with newcomers
- **Office hours** - Regular sessions for questions and guidance
- **Pair programming** - Collaborative coding sessions

### Recognition

We recognize contributions in various ways:

- **Contributors page** - Listed on our website
- **Release notes** - Mentioned in release announcements
- **Swag** - ScriptFlow merchandise for significant contributions
- **Conference opportunities** - Speaking opportunities at events
- **Reference letters** - Professional references for job applications

## Release Process

### Versioning

We follow [Semantic Versioning](https://semver.org/):

- **MAJOR** version for incompatible API changes
- **MINOR** version for backward-compatible functionality additions
- **PATCH** version for backward-compatible bug fixes

### Release Cycle

- **Major releases** - Every 6-12 months
- **Minor releases** - Every 1-2 months
- **Patch releases** - As needed for critical fixes

### Contributing to Releases

- **Feature freeze** - 2 weeks before major releases
- **Release candidates** - Beta testing period
- **Documentation updates** - Must accompany feature changes
- **Migration guides** - For breaking changes

## Security

### Reporting Security Issues

**DO NOT** create public issues for security vulnerabilities. Instead:

1. Email security@scriptflow.dev
2. Include detailed information about the vulnerability
3. Wait for acknowledgment before public disclosure
4. Work with maintainers on fixing the issue

### Security Best Practices

- **Input validation** - Validate all user inputs
- **Authentication** - Proper authentication and authorization
- **Encryption** - Encrypt sensitive data
- **Dependencies** - Keep dependencies updated
- **Code review** - Security-focused code reviews

## License

By contributing to ScriptFlow, you agree that your contributions will be licensed under the MIT License. See [LICENSE](LICENSE) file for details.

---

Thank you for contributing to ScriptFlow! Your efforts help make script management better for everyone. If you have questions about contributing, please don't hesitate to ask in our community channels.