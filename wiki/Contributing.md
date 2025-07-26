# Contributing to ScriptFlow

Welcome to the ScriptFlow community! We're thrilled that you're interested in contributing to our open-source enterprise script management platform.

## 🌟 Ways to Contribute

There are many ways to contribute to ScriptFlow:

- 🐛 **Report Bugs** - Help us identify and fix issues
- 💡 **Suggest Features** - Propose new functionality
- 🔧 **Submit Code** - Fix bugs or implement features
- 📚 **Improve Documentation** - Help others understand ScriptFlow
- 🌍 **Translate** - Add support for new languages
- 💬 **Help Others** - Answer questions in discussions
- 🎨 **Design** - Improve UI/UX and create assets
- 🧪 **Test** - Help with testing new features

## 🚀 Getting Started

### 1. Prerequisites

- **Node.js** 18.0 or higher
- **npm** 8.0 or higher
- **Git** 2.30 or higher
- **Docker** (optional, for testing)

### 2. Fork and Clone

```bash
# Fork the repository on GitHub
# Then clone your fork
git clone https://github.com/YOUR_USERNAME/scriptflow.git
cd scriptflow
```

### 3. Set Up Development Environment

```bash
# Install dependencies
npm run install:all

# Copy environment configuration
cp packages/backend/.env.example packages/backend/.env

# Start development servers
npm run dev
```

### 4. Verify Setup

- Backend: http://localhost:3000/api/health
- Frontend: http://localhost:3001
- Login: `admin` / `admin123`

## 🏗️ Project Structure

```
scriptflow/
├── packages/
│   ├── frontend/          # React frontend
│   │   ├── src/
│   │   │   ├── components/    # UI components
│   │   │   ├── pages/         # Page components
│   │   │   ├── hooks/         # Custom hooks
│   │   │   └── services/      # API services
│   │   └── public/            # Static assets
│   └── backend/           # Node.js backend
│       ├── src/
│       │   ├── routes/        # API routes
│       │   ├── middleware/    # Express middleware
│       │   ├── services/      # Business logic
│       │   └── database/      # Database layer
│       └── tests/             # Test files
├── docs/                  # Documentation
├── wiki/                  # GitHub wiki content
└── scripts/              # Build scripts
```

## 📝 Coding Standards

### TypeScript/JavaScript

```typescript
// Use descriptive variable names
const userExecutionHistory = await getUserExecutions(userId);

// Use async/await
async function executeScript(scriptId: string): Promise<ExecutionResult> {
  try {
    const result = await scriptService.execute(scriptId);
    return result;
  } catch (error) {
    logger.error('Script execution failed', { scriptId, error });
    throw error;
  }
}

// Add JSDoc comments
/**
 * Executes a script with the given parameters
 * @param scriptId - The ID of the script to execute
 * @param parameters - Script execution parameters
 * @returns Promise resolving to execution result
 */
async function executeScript(
  scriptId: string, 
  parameters: Record<string, any>
): Promise<ExecutionResult> {
  // Implementation
}
```

### React Components

```tsx
import React, { useState } from 'react';

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

### CSS/Styling

Use Tailwind CSS for consistent styling:

```tsx
// Good: Using Tailwind classes
<button className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded">
  Execute Script
</button>

// Better: Custom component
<Button variant="primary" size="md" onClick={handleClick}>
  Execute Script
</Button>
```

## 🌿 Git Workflow

### Branch Naming

- **Features**: `feature/description-of-feature`
- **Bug fixes**: `fix/description-of-bug`
- **Documentation**: `docs/description-of-change`
- **Refactoring**: `refactor/description-of-change`

Examples:
```bash
git checkout -b feature/ai-script-validation
git checkout -b fix/execution-timeout-handling
git checkout -b docs/api-authentication-guide
```

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```bash
# Format: type(scope): description

feat(api): add script execution endpoint
fix(ui): resolve script editor syntax highlighting  
docs(readme): update installation instructions
test(backend): add unit tests for user service
```

**Types:**
- `feat` - New features
- `fix` - Bug fixes
- `docs` - Documentation changes
- `style` - Code style changes
- `refactor` - Code refactoring
- `test` - Adding tests
- `chore` - Maintenance tasks

### Commit Best Practices

```bash
# Good commit message
feat(scheduler): add CRON expression validation

- Add validation for CRON expressions in schedule creation
- Include user-friendly error messages for invalid expressions
- Add unit tests for validation logic

Fixes #123
```

## 🔄 Pull Request Process

### Before Submitting

1. **Test your changes**:
   ```bash
   npm test                # Run all tests
   npm run lint           # Check code style
   npm run type-check     # TypeScript validation
   npm run build          # Test build
   ```

2. **Update documentation** if needed
3. **Add or update tests** for new functionality
4. **Check for breaking changes**

### Pull Request Template

```markdown
## Description
Brief description of changes and their purpose.

## Type of Change
- [ ] Bug fix (non-breaking change)
- [ ] New feature (non-breaking change) 
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed
- [ ] New tests added

## Checklist
- [ ] Code follows project standards
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No new warnings generated
```

### Review Process

1. **Automated checks** - All CI checks must pass
2. **Code review** - At least one maintainer review
3. **Testing** - Changes tested in staging
4. **Documentation** - Relevant docs updated
5. **Approval** - Final maintainer approval

## 🐛 Issue Guidelines

### Bug Reports

```markdown
**Bug Description**
Clear description of the bug.

**Steps to Reproduce**
1. Go to '...'
2. Click on '...'
3. See error

**Expected Behavior**
What should happen.

**Environment**
- OS: [e.g. Ubuntu 20.04]
- Browser: [e.g. Chrome 96]
- ScriptFlow Version: [e.g. 1.0.0]
```

### Feature Requests

```markdown
**Problem Description**
What problem does this solve?

**Proposed Solution**
How should this work?

**Alternatives Considered**
Other approaches you've considered.

**Additional Context**
Screenshots, mockups, etc.
```

## 🧪 Testing

### Running Tests

```bash
# All tests
npm test

# With coverage
npm run test:coverage

# Watch mode
npm run test:watch

# Specific tests
npm test -- --testNamePattern="user service"
```

### Writing Tests

#### Unit Tests

```typescript
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
import request from 'supertest';
import { app } from '../app';

describe('POST /api/scripts', () => {
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

## 📚 Documentation

### Code Documentation

```typescript
/**
 * Executes a script with the provided parameters
 * 
 * @param scriptId - Unique identifier for the script
 * @param parameters - Key-value pairs for script parameters
 * @param options - Execution options (timeout, environment, etc.)
 * @returns Promise resolving to execution result
 * @throws {ValidationError} When parameters are invalid
 * 
 * @example
 * ```typescript
 * const result = await executeScript('script-123', {
 *   serverName: 'prod-server-01'
 * });
 * ```
 */
```

### Wiki Updates

When adding features, update relevant wiki pages:
- Feature documentation
- API changes
- Configuration options
- Migration guides

## 🏷️ Issue Labels

We use labels to categorize issues:

**Type:**
- `bug` - Something isn't working
- `feature` - New feature request
- `documentation` - Docs improvements
- `question` - Further information needed

**Priority:**
- `critical` - Immediate attention required
- `high` - High priority
- `medium` - Medium priority
- `low` - Low priority

**Status:**
- `good first issue` - Good for newcomers
- `help wanted` - Extra attention needed
- `in progress` - Being worked on
- `needs review` - Needs maintainer review

## 🤝 Community

### Communication Channels

- **GitHub Discussions** - Questions and general discussion
- **Discord** - Real-time community chat
- **GitHub Issues** - Bug reports and feature requests
- **Twitter** - Updates and announcements

### Community Guidelines

1. **Be Respectful** - Treat everyone with kindness
2. **Be Helpful** - Help others when possible
3. **Be Patient** - Everyone has different experience levels
4. **Be Constructive** - Provide actionable feedback
5. **Stay On Topic** - Keep discussions relevant

### Getting Help

- **Documentation** - Check the wiki first
- **Search Issues** - Look for existing solutions
- **Ask in Discussions** - Post questions
- **Join Discord** - Real-time community help

## 🎯 Good First Issues

Looking for your first contribution? Check out issues labeled [`good first issue`](https://github.com/Steve-M365/scriptflow/labels/good%20first%20issue).

These are typically:
- Documentation improvements
- Small bug fixes
- UI/UX enhancements
- Test additions
- Code cleanup

## 🏆 Recognition

We recognize contributors in various ways:

- **Contributors Page** - Listed on our website
- **Release Notes** - Mentioned in announcements
- **Swag** - ScriptFlow merchandise
- **Conference Opportunities** - Speaking at events
- **Reference Letters** - Professional references

## 📞 Getting Help

### Documentation Resources
- **[User Guide](User-Guide)** - Complete feature documentation
- **[API Documentation](API-Documentation)** - REST and GraphQL APIs
- **[Architecture](Architecture)** - System design overview

### Community Support
- **Discord**: [Join our community](https://discord.gg/scriptflow)
- **GitHub Issues**: [Report problems](https://github.com/Steve-M365/scriptflow/issues)
- **Discussions**: [Ask questions](https://github.com/Steve-M365/scriptflow/discussions)

### Professional Support
- **Email**: support@scriptflow.dev
- **Documentation**: https://docs.scriptflow.dev

## 📄 License

By contributing to ScriptFlow, you agree that your contributions will be licensed under the [MIT License](https://github.com/Steve-M365/scriptflow/blob/main/LICENSE).

---

**Thank you for contributing to ScriptFlow!** 🚀

Your efforts help make script management better for everyone. If you have questions about contributing, don't hesitate to ask in our community channels.