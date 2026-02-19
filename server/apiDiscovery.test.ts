import { describe, it, expect } from 'vitest';
import { appRouter } from './routers';

describe('API Discovery Router', () => {
  describe('getConfig', () => {
    it('should return backend configuration', async () => {
      const caller = appRouter.createCaller({
        req: {
          headers: {
            host: 'crm.bdsm.com.cn',
            'x-forwarded-proto': 'https',
          },
          connection: {},
        } as any,
        res: {} as any,
        user: null,
      });

      const config = await caller.discovery.getConfig();

      expect(config).toHaveProperty('baseUrl');
      expect(config).toHaveProperty('apiEndpoint');
      expect(config).toHaveProperty('environment');
      expect(config).toHaveProperty('version');
      expect(config).toHaveProperty('endpoints');
      expect(config).toHaveProperty('cors');

      // Check that baseUrl doesn't include port in production
      expect(config.baseUrl).toBe('https://crm.bdsm.com.cn');
      expect(config.apiEndpoint).toBe('https://crm.bdsm.com.cn/api/trpc');
    });

    it('should handle development environment with port', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const caller = appRouter.createCaller({
        req: {
          headers: {
            host: 'localhost:3001',
          },
          connection: {},
        } as any,
        res: {} as any,
        user: null,
      });

      const config = await caller.discovery.getConfig();

      expect(config.baseUrl).toBe('http://localhost:3001');
      expect(config.apiEndpoint).toBe('http://localhost:3001/api/trpc');
      expect(config.environment).toBe('development');

      process.env.NODE_ENV = originalEnv;
    });

    it('should return correct endpoints structure', async () => {
      const caller = appRouter.createCaller({
        req: {
          headers: {
            host: 'crm.bdsm.com.cn',
            'x-forwarded-proto': 'https',
          },
          connection: {},
        } as any,
        res: {} as any,
        user: null,
      });

      const config = await caller.discovery.getConfig();

      expect(config.endpoints).toEqual({
        trpc: '/api/trpc',
        oauth: '/api/oauth',
        discovery: '/api/discovery',
      });
    });

    it('should return CORS configuration', async () => {
      const caller = appRouter.createCaller({
        req: {
          headers: {
            host: 'crm.bdsm.com.cn',
            'x-forwarded-proto': 'https',
          },
          connection: {},
        } as any,
        res: {} as any,
        user: null,
      });

      const config = await caller.discovery.getConfig();

      expect(config.cors.enabled).toBe(true);
      expect(config.cors.allowedOrigins).toContain('*.manus.computer');
      expect(config.cors.allowedOrigins).toContain('*.manus-asia.computer');
      expect(config.cors.allowedOrigins).toContain('localhost');
    });
  });

  describe('health', () => {
    it('should return health status', async () => {
      const caller = appRouter.createCaller({
        req: {} as any,
        res: {} as any,
        user: null,
      });

      const health = await caller.discovery.health();

      expect(health.status).toBe('ok');
      expect(health.timestamp).toBeDefined();
      expect(typeof health.timestamp).toBe('string');
      
      // Verify timestamp is a valid ISO string
      const timestamp = new Date(health.timestamp);
      expect(timestamp.toISOString()).toBe(health.timestamp);
    });

    it('should return current timestamp', async () => {
      const beforeCall = Date.now();
      
      const caller = appRouter.createCaller({
        req: {} as any,
        res: {} as any,
        user: null,
      });

      const health = await caller.discovery.health();
      
      const afterCall = Date.now();
      const healthTimestamp = new Date(health.timestamp).getTime();

      // Health timestamp should be between before and after call
      expect(healthTimestamp).toBeGreaterThanOrEqual(beforeCall);
      expect(healthTimestamp).toBeLessThanOrEqual(afterCall);
    });
  });
});
