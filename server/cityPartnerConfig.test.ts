import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";

describe("CityPartnerConfig API - Public Access", () => {
  it("should allow unauthenticated access to cityPartnerConfig.list", async () => {
    const caller = appRouter.createCaller({ user: null } as any);
    const result = await caller.cityPartnerConfig.list();
    
    expect(result.success).toBe(true);
    expect(Array.isArray(result.data)).toBe(true);
    expect(typeof result.count).toBe("number");
  });

  it("should return city partner configs with required fields", async () => {
    const caller = appRouter.createCaller({ user: null } as any);
    const result = await caller.cityPartnerConfig.list();
    
    if (result.data.length > 0) {
      const config = result.data[0];
      expect(config).toHaveProperty("id");
      expect(config).toHaveProperty("city");
      expect(config).toHaveProperty("partnerFeeRate");
      expect(config).toHaveProperty("isActive");
    }
  });

  it("should allow unauthenticated access to cityPartnerConfig.getByCity", async () => {
    const caller = appRouter.createCaller({ user: null } as any);
    
    // 先获取列表找到一个有效的城市
    const listResult = await caller.cityPartnerConfig.list();
    
    if (listResult.data.length > 0) {
      const firstCity = listResult.data[0].city;
      const result = await caller.cityPartnerConfig.getByCity({ city: firstCity });
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.city).toBe(firstCity);
    }
  });

  it("should return null for non-existent city", async () => {
    const caller = appRouter.createCaller({ user: null } as any);
    const result = await caller.cityPartnerConfig.getByCity({ city: "不存在的城市" });
    
    expect(result.success).toBe(false);
    expect(result.data).toBeNull();
  });
});
