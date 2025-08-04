import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

@Injectable()
export class SecurityMiddleware implements NestMiddleware {
  private readonly logger = new Logger(SecurityMiddleware.name);

  use(req: Request, res: Response, next: NextFunction) {
    // Add security headers
    this.addSecurityHeaders(res);

    // Log security-relevant information
    this.logSecurityInfo(req);

    // Check for suspicious patterns
    this.checkSuspiciousPatterns(req);

    next();
  }

  private addSecurityHeaders(res: Response) {
    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');

    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // Enable XSS protection
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Referrer policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Permissions policy
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');

    // Content Security Policy (basic)
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;"
    );
  }

  private logSecurityInfo(req: Request) {
    const securityInfo = {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      origin: req.get('Origin'),
      referer: req.get('Referer'),
      method: req.method,
      url: req.url,
    };

    // Log suspicious user agents
    const suspiciousUserAgents = [
      'sqlmap',
      'nikto',
      'nmap',
      'masscan',
      'nessus',
      'openvas',
      'burp',
      'w3af',
    ];

    if (securityInfo.userAgent) {
      const lowerUserAgent = securityInfo.userAgent.toLowerCase();
      if (suspiciousUserAgents.some(agent => lowerUserAgent.includes(agent))) {
        this.logger.warn('Suspicious user agent detected', securityInfo);
      }
    }
  }

  private checkSuspiciousPatterns(req: Request) {
    const url = req.url.toLowerCase();
    const body = JSON.stringify(req.body || {}).toLowerCase();
    const query = JSON.stringify(req.query || {}).toLowerCase();

    // SQL injection patterns
    const sqlPatterns = [
      'union select',
      'drop table',
      'insert into',
      'delete from',
      'update set',
      'exec(',
      'execute(',
      'sp_',
      'xp_',
      '--',
      '/*',
      '*/',
      'char(',
      'ascii(',
      'substring(',
      'waitfor delay',
    ];

    // XSS patterns
    const xssPatterns = [
      '<script',
      'javascript:',
      'onload=',
      'onerror=',
      'onclick=',
      'onmouseover=',
      'eval(',
      'alert(',
      'confirm(',
      'prompt(',
    ];

    // Path traversal patterns
    const pathTraversalPatterns = ['../', '..\\', '..%2f', '..%5c', '%2e%2e%2f', '%2e%2e%5c'];

    const allContent = `${url} ${body} ${query}`;

    // Check for SQL injection
    if (sqlPatterns.some(pattern => allContent.includes(pattern))) {
      this.logger.warn('Potential SQL injection attempt detected', {
        ip: req.ip,
        url: req.url,
        userAgent: req.get('User-Agent'),
        body: req.body,
        query: req.query,
      });
    }

    // Check for XSS
    if (xssPatterns.some(pattern => allContent.includes(pattern))) {
      this.logger.warn('Potential XSS attempt detected', {
        ip: req.ip,
        url: req.url,
        userAgent: req.get('User-Agent'),
        body: req.body,
        query: req.query,
      });
    }

    // Check for path traversal
    if (pathTraversalPatterns.some(pattern => allContent.includes(pattern))) {
      this.logger.warn('Potential path traversal attempt detected', {
        ip: req.ip,
        url: req.url,
        userAgent: req.get('User-Agent'),
        body: req.body,
        query: req.query,
      });
    }
  }
}
