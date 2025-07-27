import { ScriptLanguage } from '../types';
import { logger } from '../utils/logger';
import crypto from 'crypto';
import path from 'path';

export interface SecurityRisk {
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: string;
  description: string;
  line?: number;
  suggestion?: string;
}

export interface ScriptValidationResult {
  isValid: boolean;
  isSecure: boolean;
  securityScore: number; // 0-100, higher is more secure
  risks: SecurityRisk[];
  sanitizedContent?: string;
  metadata: {
    linesOfCode: number;
    complexity: number;
    hasElevatedCommands: boolean;
    hasNetworkAccess: boolean;
    hasFileSystemAccess: boolean;
    hasDangerousOperations: boolean;
  };
}

export interface ScriptSignature {
  hash: string;
  algorithm: string;
  timestamp: string;
  signedBy: string;
}

export class ScriptSecurityValidator {
  // Critical command patterns that pose security risks
  private static readonly CRITICAL_PATTERNS = {
    // Destructive operations
    DESTRUCTIVE: [
      /\brm\s+(-rf|--recursive\s+--force|\-r\s+\-f)\s+\//gi,
      /\bdel\s+(\/[sq]|\-r)\s+[a-z]:\\/gi,
      /\bformat\s+[a-z]:/gi,
      /\bdd\s+if=.*of=.*bs=/gi,
      /\bmkfs\./gi,
      /\bfdisk.*\-l/gi
    ],
    
    // Network operations
    NETWORK: [
      /\b(wget|curl|nc|netcat|telnet|ssh|scp|rsync)\b/gi,
      /\b(nmap|nslookup|dig|ping).*\-[a-z]/gi,
      /\biptables\b/gi,
      /\bufw\s+(allow|deny)/gi
    ],
    
    // Code execution
    CODE_EXECUTION: [
      /\b(eval|exec|system|shell_exec|passthru)\s*\(/gi,
      /\$\(.*\)/g, // Command substitution
      /`[^`]+`/g, // Backtick execution
      /\bsudo\s+.*\$\(/gi,
      /\|\s*sh\b/gi,
      /\|\s*bash\b/gi
    ],
    
    // File system operations
    FILE_SYSTEM: [
      /\bchmod\s+777/gi,
      /\bchown\s+root/gi,
      /\bmount\s+/gi,
      /\bumount\s+/gi,
      /\>.*\/etc\//gi,
      /\bcp\s+.*\/etc\//gi
    ],
    
    // Process manipulation
    PROCESS: [
      /\bkill\s+-9/gi,
      /\bkillall\s+/gi,
      /\bps\s+aux.*grep/gi,
      /\bnohup\s+.*&/gi,
      /\bdisown\b/gi
    ],
    
    // Environment manipulation
    ENVIRONMENT: [
      /\bexport\s+PATH=/gi,
      /\bunset\s+PATH/gi,
      /\bLD_PRELOAD=/gi,
      /\bLD_LIBRARY_PATH=/gi
    ],
    
    // Credential harvesting
    CREDENTIALS: [
      /\/etc\/passwd/gi,
      /\/etc\/shadow/gi,
      /\$HOME\/\.ssh/gi,
      /id_rsa/gi,
      /authorized_keys/gi,
      /\.aws\/credentials/gi
    ]
  };

  // Language-specific dangerous patterns
  private static readonly LANGUAGE_PATTERNS = {
    powershell: [
      /Invoke-Expression/gi,
      /IEX\s+/gi,
      /Invoke-Command/gi,
      /Start-Process.*-Verb\s+RunAs/gi,
      /Get-Credential/gi,
      /ConvertTo-SecureString.*-AsPlainText/gi,
      /Bypass.*ExecutionPolicy/gi,
      /Hidden.*WindowStyle/gi,
      /EncodedCommand/gi,
      /DownloadString/gi,
      /WebClient/gi,
      /System\.Net/gi
    ],
    
    python: [
      /\bexec\s*\(/gi,
      /\beval\s*\(/gi,
      /\b__import__\s*\(/gi,
      /\bcompile\s*\(/gi,
      /\bgetattr\s*\(/gi,
      /\bsetattr\s*\(/gi,
      /\bsubprocess\./gi,
      /\bos\.system/gi,
      /\bos\.popen/gi,
      /\bos\.spawn/gi
    ],
    
    ansible: [
      /ansible_become_pass/gi,
      /ansible_sudo_pass/gi,
      /vault_password/gi,
      /become:\s*yes.*become_method:\s*sudo/gi,
      /shell:\s*\|/gi,
      /raw:/gi
    ]
  };

  // Safe command allowlists
  private static readonly SAFE_COMMANDS = {
    bash: [
      'echo', 'cat', 'grep', 'awk', 'sed', 'sort', 'uniq', 'head', 'tail',
      'ls', 'pwd', 'whoami', 'date', 'uptime', 'df', 'free', 'top', 'ps',
      'find', 'locate', 'which', 'type', 'history', 'alias'
    ],
    
    powershell: [
      'Get-Date', 'Get-Location', 'Get-ChildItem', 'Get-Content', 'Get-Process',
      'Get-Service', 'Get-EventLog', 'Get-WmiObject', 'Get-Counter',
      'Test-Path', 'Test-Connection', 'Measure-Object', 'Select-Object',
      'Where-Object', 'Sort-Object', 'Group-Object', 'Format-Table'
    ]
  };

  /**
   * Comprehensive script validation
   */
  static async validateScript(
    content: string,
    language: ScriptLanguage,
    allowElevated: boolean = false
  ): Promise<ScriptValidationResult> {
    const risks: SecurityRisk[] = [];
    let securityScore = 100;
    
    try {
      // Basic content validation
      if (!content || content.trim().length === 0) {
        return {
          isValid: false,
          isSecure: false,
          securityScore: 0,
          risks: [{ severity: 'critical', type: 'empty_script', description: 'Script content is empty' }],
          metadata: this.generateMetadata(content)
        };
      }

      // Check script length
      if (content.length > 100000) { // 100KB limit
        risks.push({
          severity: 'medium',
          type: 'size_limit',
          description: 'Script exceeds maximum size limit',
          suggestion: 'Consider breaking into smaller scripts'
        });
        securityScore -= 10;
      }

      // Analyze critical patterns
      const criticalRisks = this.analyzeCriticalPatterns(content, language);
      risks.push(...criticalRisks);
      securityScore -= criticalRisks.reduce((score, risk) => {
        switch (risk.severity) {
          case 'critical': return score + 30;
          case 'high': return score + 20;
          case 'medium': return score + 10;
          case 'low': return score + 5;
          default: return score;
        }
      }, 0);

      // Language-specific validation
      const languageRisks = this.validateLanguageSpecific(content, language);
      risks.push(...languageRisks);
      securityScore -= languageRisks.length * 5;

      // Check for obfuscation attempts
      const obfuscationRisks = this.detectObfuscation(content);
      risks.push(...obfuscationRisks);
      securityScore -= obfuscationRisks.length * 15;

      // Validate file paths and operations
      const pathRisks = this.validateFilePaths(content);
      risks.push(...pathRisks);
      securityScore -= pathRisks.length * 10;

      // Check for privilege escalation
      if (!allowElevated) {
        const privilegeRisks = this.detectPrivilegeEscalation(content, language);
        risks.push(...privilegeRisks);
        securityScore -= privilegeRisks.length * 25;
      }

      // Generate metadata
      const metadata = this.generateMetadata(content);

      // Determine if script is secure
      const criticalRiskCount = risks.filter(r => r.severity === 'critical').length;
      const highRiskCount = risks.filter(r => r.severity === 'high').length;
      
      const isSecure = criticalRiskCount === 0 && highRiskCount <= 2 && securityScore >= 60;
      const isValid = criticalRiskCount === 0 && securityScore >= 30;

      // Ensure score doesn't go below 0
      securityScore = Math.max(0, securityScore);

      logger.info('Script validation completed', {
        language,
        securityScore,
        riskCount: risks.length,
        isSecure,
        isValid,
        linesOfCode: metadata.linesOfCode
      });

      return {
        isValid,
        isSecure,
        securityScore,
        risks,
        sanitizedContent: this.sanitizeScript(content, risks),
        metadata
      };

    } catch (error) {
      logger.error('Script validation error', { error, language });
      return {
        isValid: false,
        isSecure: false,
        securityScore: 0,
        risks: [{ 
          severity: 'critical', 
          type: 'validation_error', 
          description: 'Failed to validate script due to internal error' 
        }],
        metadata: this.generateMetadata(content)
      };
    }
  }

  /**
   * Analyze critical security patterns
   */
  private static analyzeCriticalPatterns(content: string, language: ScriptLanguage): SecurityRisk[] {
    const risks: SecurityRisk[] = [];
    const lines = content.split('\n');

    Object.entries(this.CRITICAL_PATTERNS).forEach(([category, patterns]) => {
      patterns.forEach(pattern => {
        lines.forEach((line, index) => {
          const matches = line.match(pattern);
          if (matches) {
            const severity = this.getPatternSeverity(category);
            risks.push({
              severity,
              type: `critical_${category.toLowerCase()}`,
              description: `Detected ${category.toLowerCase().replace('_', ' ')} operation: ${matches[0]}`,
              line: index + 1,
              suggestion: this.getSuggestionForPattern(category)
            });
          }
        });
      });
    });

    return risks;
  }

  /**
   * Language-specific validation
   */
  private static validateLanguageSpecific(content: string, language: ScriptLanguage): SecurityRisk[] {
    const risks: SecurityRisk[] = [];
    const patterns = this.LANGUAGE_PATTERNS[language];
    
    if (!patterns) return risks;

    const lines = content.split('\n');
    
    patterns.forEach(pattern => {
      lines.forEach((line, index) => {
        const matches = line.match(pattern);
        if (matches) {
          risks.push({
            severity: 'high',
            type: `${language}_security`,
            description: `Detected potentially dangerous ${language} operation: ${matches[0]}`,
            line: index + 1,
            suggestion: `Consider using safer alternatives for ${language}`
          });
        }
      });
    });

    return risks;
  }

  /**
   * Detect script obfuscation
   */
  private static detectObfuscation(content: string): SecurityRisk[] {
    const risks: SecurityRisk[] = [];
    
    // Check for base64 encoding
    const base64Pattern = /(?:[A-Za-z0-9+\/]{4})*(?:[A-Za-z0-9+\/]{2}==|[A-Za-z0-9+\/]{3}=)?/g;
    const base64Matches = content.match(base64Pattern) || [];
    const longBase64 = base64Matches.filter(match => match.length > 50);
    
    if (longBase64.length > 0) {
      risks.push({
        severity: 'high',
        type: 'obfuscation',
        description: 'Detected potential base64 encoded content',
        suggestion: 'Avoid encoded content in scripts'
      });
    }

    // Check for hex encoding
    const hexPattern = /\\x[0-9a-f]{2}/gi;
    if (hexPattern.test(content)) {
      risks.push({
        severity: 'medium',
        type: 'obfuscation',
        description: 'Detected hex-encoded content',
        suggestion: 'Use plain text instead of encoded content'
      });
    }

    // Check for excessive string concatenation (obfuscation technique)
    const concatPattern = /["'][^"']*["']\s*[+&]\s*["'][^"']*["']/g;
    const concatMatches = content.match(concatPattern) || [];
    if (concatMatches.length > 5) {
      risks.push({
        severity: 'medium',
        type: 'obfuscation',
        description: 'Excessive string concatenation detected',
        suggestion: 'Use clear, readable string literals'
      });
    }

    return risks;
  }

  /**
   * Validate file paths for security issues
   */
  private static validateFilePaths(content: string): SecurityRisk[] {
    const risks: SecurityRisk[] = [];

    // Path traversal patterns
    const traversalPatterns = [
      /\.\.[\/\\]/g,
      /[\/\\]\.\.[\/\\]/g,
      /\%2e\%2e[\/\\]/gi,
      /\%2f\%2e\%2e/gi
    ];

    traversalPatterns.forEach(pattern => {
      if (pattern.test(content)) {
        risks.push({
          severity: 'high',
          type: 'path_traversal',
          description: 'Detected potential path traversal pattern',
          suggestion: 'Use absolute paths or validate path inputs'
        });
      }
    });

    // Sensitive file access
    const sensitiveFiles = [
      /\/etc\/passwd/gi,
      /\/etc\/shadow/gi,
      /\/etc\/sudoers/gi,
      /\/root\/\./gi,
      /\/home\/[^\/]*\/\.ssh/gi,
      /\/var\/log\/auth\.log/gi,
      /C:\\Windows\\System32\\config/gi,
      /C:\\Users\\[^\\]*\\NTUSER\.DAT/gi
    ];

    sensitiveFiles.forEach(pattern => {
      if (pattern.test(content)) {
        risks.push({
          severity: 'critical',
          type: 'sensitive_file_access',
          description: 'Detected access to sensitive system files',
          suggestion: 'Avoid accessing sensitive system files'
        });
      }
    });

    return risks;
  }

  /**
   * Detect privilege escalation attempts
   */
  private static detectPrivilegeEscalation(content: string, language: ScriptLanguage): SecurityRisk[] {
    const risks: SecurityRisk[] = [];

    const escalationPatterns = [
      /\bsudo\s+/gi,
      /\bsu\s+-/gi,
      /runas\s+\/user:/gi,
      /Start-Process.*-Verb\s+RunAs/gi,
      /UAC/gi,
      /elevation/gi,
      /admin.*privilege/gi
    ];

    escalationPatterns.forEach(pattern => {
      if (pattern.test(content)) {
        risks.push({
          severity: 'critical',
          type: 'privilege_escalation',
          description: 'Detected privilege escalation attempt',
          suggestion: 'Use service accounts with minimal required privileges'
        });
      }
    });

    return risks;
  }

  /**
   * Generate script metadata
   */
  private static generateMetadata(content: string) {
    const lines = content.split('\n');
    const nonEmptyLines = lines.filter(line => line.trim().length > 0);
    
    return {
      linesOfCode: nonEmptyLines.length,
      complexity: this.calculateComplexity(content),
      hasElevatedCommands: /\b(sudo|runas|elevat)/gi.test(content),
      hasNetworkAccess: /\b(wget|curl|http|ftp|ssh)/gi.test(content),
      hasFileSystemAccess: /\b(rm|del|cp|mv|mkdir|touch)/gi.test(content),
      hasDangerousOperations: /\b(format|fdisk|dd|mkfs)/gi.test(content)
    };
  }

  /**
   * Calculate script complexity score
   */
  private static calculateComplexity(content: string): number {
    let complexity = 0;
    
    // Count control structures
    const controlPatterns = [
      /\bif\b/gi,
      /\belse\b/gi,
      /\bwhile\b/gi,
      /\bfor\b/gi,
      /\bswitch\b/gi,
      /\btry\b/gi,
      /\bcatch\b/gi
    ];

    controlPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      complexity += matches ? matches.length : 0;
    });

    // Count function definitions
    const functionPatterns = [
      /function\s+\w+/gi,
      /def\s+\w+/gi,
      /\w+\s*\(\s*\)\s*{/gi
    ];

    functionPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      complexity += matches ? matches.length * 2 : 0;
    });

    return complexity;
  }

  /**
   * Sanitize script content
   */
  private static sanitizeScript(content: string, risks: SecurityRisk[]): string {
    let sanitized = content;

    // Remove or comment out critical risks
    risks.forEach(risk => {
      if (risk.severity === 'critical' && risk.line) {
        const lines = sanitized.split('\n');
        if (lines[risk.line - 1]) {
          lines[risk.line - 1] = `# SECURITY: ${risk.description}\n# ${lines[risk.line - 1]}`;
        }
        sanitized = lines.join('\n');
      }
    });

    return sanitized;
  }

  /**
   * Get severity for pattern category
   */
  private static getPatternSeverity(category: string): SecurityRisk['severity'] {
    switch (category) {
      case 'DESTRUCTIVE':
      case 'CREDENTIALS':
        return 'critical';
      case 'CODE_EXECUTION':
      case 'PROCESS':
        return 'high';
      case 'NETWORK':
      case 'FILE_SYSTEM':
        return 'medium';
      default:
        return 'low';
    }
  }

  /**
   * Get suggestion for pattern category
   */
  private static getSuggestionForPattern(category: string): string {
    switch (category) {
      case 'DESTRUCTIVE':
        return 'Avoid destructive file operations. Use backup strategies instead.';
      case 'CODE_EXECUTION':
        return 'Avoid dynamic code execution. Use predefined functions instead.';
      case 'NETWORK':
        return 'Limit network operations. Use secure protocols and validate inputs.';
      case 'CREDENTIALS':
        return 'Never access credential files directly. Use secure credential management.';
      case 'PROCESS':
        return 'Use graceful process management instead of forced termination.';
      case 'FILE_SYSTEM':
        return 'Use minimal file system permissions and validate paths.';
      default:
        return 'Review and minimize security impact.';
    }
  }

  /**
   * Generate script signature for integrity verification
   */
  static generateSignature(content: string, signedBy: string): ScriptSignature {
    const hash = crypto.createHash('sha256').update(content).digest('hex');
    
    return {
      hash,
      algorithm: 'SHA-256',
      timestamp: new Date().toISOString(),
      signedBy
    };
  }

  /**
   * Verify script signature
   */
  static verifySignature(content: string, signature: ScriptSignature): boolean {
    const currentHash = crypto.createHash('sha256').update(content).digest('hex');
    return currentHash === signature.hash;
  }

  /**
   * Check if script is safe for execution based on validation result
   */
  static isSafeForExecution(validationResult: ScriptValidationResult): boolean {
    const criticalRisks = validationResult.risks.filter(r => r.severity === 'critical');
    const highRisks = validationResult.risks.filter(r => r.severity === 'high');
    
    return criticalRisks.length === 0 && 
           highRisks.length <= 1 && 
           validationResult.securityScore >= 70 &&
           validationResult.isValid;
  }

  /**
   * Generate security report
   */
  static generateSecurityReport(validationResult: ScriptValidationResult): string {
    const { securityScore, risks, metadata } = validationResult;
    
    let report = `Script Security Analysis Report\n`;
    report += `=====================================\n\n`;
    report += `Security Score: ${securityScore}/100\n`;
    report += `Validation Status: ${validationResult.isValid ? 'VALID' : 'INVALID'}\n`;
    report += `Security Status: ${validationResult.isSecure ? 'SECURE' : 'INSECURE'}\n\n`;
    
    report += `Metadata:\n`;
    report += `- Lines of Code: ${metadata.linesOfCode}\n`;
    report += `- Complexity Score: ${metadata.complexity}\n`;
    report += `- Has Elevated Commands: ${metadata.hasElevatedCommands ? 'Yes' : 'No'}\n`;
    report += `- Has Network Access: ${metadata.hasNetworkAccess ? 'Yes' : 'No'}\n`;
    report += `- Has File System Access: ${metadata.hasFileSystemAccess ? 'Yes' : 'No'}\n`;
    report += `- Has Dangerous Operations: ${metadata.hasDangerousOperations ? 'Yes' : 'No'}\n\n`;
    
    if (risks.length > 0) {
      report += `Security Risks (${risks.length} found):\n`;
      report += `========================\n`;
      
      risks.forEach((risk, index) => {
        report += `${index + 1}. [${risk.severity.toUpperCase()}] ${risk.type}\n`;
        report += `   Description: ${risk.description}\n`;
        if (risk.line) report += `   Line: ${risk.line}\n`;
        if (risk.suggestion) report += `   Suggestion: ${risk.suggestion}\n`;
        report += `\n`;
      });
    } else {
      report += `No security risks detected.\n`;
    }
    
    return report;
  }
}