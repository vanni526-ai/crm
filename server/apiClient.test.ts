import { describe, it, expect, beforeAll } from 'vitest';
import { createApiClient, ApiClient } from '../sdk/api-client';

describe('API Client SDK', () => {
  let api: ApiClient;

  beforeAll(async () => {
    // 使用测试配置创建客户端
    api = await createApiClient({
      baseUrl: 'http://localhost:3000',
      tokenStorage: 'memory',
      debug: true,
    });
  });

  describe('Client Initialization', () => {
    it('should initialize successfully', () => {
      expect(api).toBeDefined();
      expect(api.getBaseUrl()).toBe('http://localhost:3000');
    });

    it('should have membership endpoint', () => {
      expect(api.membership).toBeDefined();
    });

    it('should have orders endpoint', () => {
      expect(api.orders).toBeDefined();
    });

    it('should have auth endpoint', () => {
      expect(api.auth).toBeDefined();
    });

    it('should have discovery endpoint', () => {
      expect(api.discovery).toBeDefined();
    });

    it('should have customers endpoint', () => {
      expect(api.customers).toBeDefined();
    });

    it('should have finance endpoint', () => {
      expect(api.finance).toBeDefined();
    });
  });

  describe('Token Management', () => {
    it('should get null token initially', async () => {
      const token = await api.getToken();
      expect(token).toBeNull();
    });

    it('should set and get token', async () => {
      await api.setToken('test-token-123');
      const token = await api.getToken();
      expect(token).toBe('test-token-123');
    });

    it('should clear token', async () => {
      await api.setToken('test-token-456');
      await api.clearToken();
      const token = await api.getToken();
      expect(token).toBeNull();
    });
  });

  describe('Service Discovery', () => {
    it('should have discovery.getConfig method', () => {
      expect(api.discovery.getConfig).toBeDefined();
      expect(typeof api.discovery.getConfig.query).toBe('function');
    });

    it('should have discovery.health method', () => {
      expect(api.discovery.health).toBeDefined();
      expect(typeof api.discovery.health.query).toBe('function');
    });
  });

  describe('Membership Endpoints', () => {
    it('should have getMembershipStatus method', () => {
      expect(api.membership.getMembershipStatus).toBeDefined();
      expect(typeof api.membership.getMembershipStatus.query).toBe('function');
    });

    it('should have createMembership method', () => {
      expect(api.membership.createMembership).toBeDefined();
      expect(typeof api.membership.createMembership.mutate).toBe('function');
    });

    it('should have activateMembership method', () => {
      expect(api.membership.activateMembership).toBeDefined();
      expect(typeof api.membership.activateMembership.mutate).toBe('function');
    });
  });

  describe('Orders Endpoints', () => {
    it('should have list method', () => {
      expect(api.orders.list).toBeDefined();
      expect(typeof api.orders.list.query).toBe('function');
    });

    it('should have getById method', () => {
      expect(api.orders.getById).toBeDefined();
      expect(typeof api.orders.getById.query).toBe('function');
    });

    it('should have userCreate method', () => {
      expect(api.orders.userCreate).toBeDefined();
      expect(typeof api.orders.userCreate.mutate).toBe('function');
    });
  });

  describe('All Required Endpoints', () => {
    const requiredEndpoints = [
      'system',
      'discovery',
      'auth',
      'membership',
      'orders',
      'customers',
      'salespersons',
      'finance',
      'city',
      'permissions',
      'userManagement',
      'users',
      'upload',
      'excelReport',
      'contentGenerator',
      'notifications',
      'reconciliation',
      'salesCityPerformance',
      'teacherPayments',
      'partnerManagement',
      'cityExpense',
      'orderParse',
      'dataCleaning',
      'dataQuality',
      'auditLogs',
    ];

    requiredEndpoints.forEach((endpoint) => {
      it(`should have ${endpoint} endpoint`, () => {
        expect((api as any)[endpoint]).toBeDefined();
      });
    });
  });
});
