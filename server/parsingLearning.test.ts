import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { getDb } from "./db";
import { parsingCorrections, promptOptimizationHistory } from "../drizzle/schema";
import { eq } from "drizzle-orm";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "测试用户",
    nickname: "测试用户",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return ctx;
}

describe("Parsing Learning API", () => {
  let caller: any;
  let testCorrectionId: number;

  beforeAll(async () => {
    const ctx = createAuthContext();
    caller = appRouter.createCaller(ctx);
  });

  describe("recordCorrection", () => {
    it("应该成功记录用户修正数据", async () => {
      const result = await caller.parsingLearning.recordCorrection({
        originalText: "山竹 12.16 15:00-18:30 基础局+裸足丝袜 声声上 (北京大兴) 不爱吃汉堡 2500已付",
        fieldName: "transportFee",
        llmValue: null,
        correctedValue: "50",
        correctionType: "field_missing",
        context: {
          customerName: "不爱吃汉堡",
          paymentAmount: "2500",
          deliveryTeacher: "声声上",
        },
      });

      expect(result.success).toBe(true);

      // 验证数据库中是否保存了修正记录
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const corrections = await db
        .select()
        .from(parsingCorrections)
        .where(eq(parsingCorrections.fieldName, "transportFee"));

      expect(corrections.length).toBeGreaterThan(0);
      const lastCorrection = corrections[corrections.length - 1];
      expect(lastCorrection.fieldName).toBe("transportFee");
      expect(lastCorrection.correctedValue).toBe("50");
      expect(lastCorrection.correctionType).toBe("field_missing");
      expect(lastCorrection.isLearned).toBe(false);

      testCorrectionId = lastCorrection.id;
    });
  });

  describe("getUnlearnedCorrections", () => {
    it("应该返回未学习的修正记录", async () => {
      const result = await caller.parsingLearning.getUnlearnedCorrections({
        limit: 100,
      });

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);

      // 验证返回的记录都是未学习的
      result.forEach((correction: any) => {
        expect(correction.isLearned).toBe(false);
      });
    });
  });

  describe("getCorrectionStats", () => {
    it("应该返回修正统计数据", async () => {
      const stats = await caller.parsingLearning.getCorrectionStats();

      expect(stats).toHaveProperty("total");
      expect(stats).toHaveProperty("unlearned");
      expect(stats).toHaveProperty("byField");
      expect(stats).toHaveProperty("byType");

      expect(typeof stats.total).toBe("number");
      expect(typeof stats.unlearned).toBe("number");
      expect(stats.total).toBeGreaterThanOrEqual(stats.unlearned);
    });
  });

  describe("analyzePatterns", () => {
    it("应该分析修正模式并返回分析结果", async () => {
      const analysis = await caller.parsingLearning.analyzePatterns();

      expect(analysis).toHaveProperty("corrections");
      expect(analysis).toHaveProperty("patterns");
      expect(analysis).toHaveProperty("recommendations");

      expect(typeof analysis.corrections).toBe("number");
      expect(Array.isArray(analysis.patterns)).toBe(true);
      expect(Array.isArray(analysis.recommendations)).toBe(true);
    }, 30000); // 增加超时时间
  });

  describe("markAsLearned", () => {
    it("应该成功标记修正记录为已学习", async () => {
      if (!testCorrectionId) {
        // 如果没有测试修正记录,先创建一个
        await caller.parsingLearning.recordCorrection({
          originalText: "测试数据",
          fieldName: "testField",
          llmValue: "oldValue",
          correctedValue: "newValue",
          correctionType: "field_wrong",
        });

        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const corrections = await db
          .select()
          .from(parsingCorrections)
          .where(eq(parsingCorrections.fieldName, "testField"));
        testCorrectionId = corrections[corrections.length - 1].id;
      }

      const result = await caller.parsingLearning.markAsLearned({
        correctionIds: [testCorrectionId],
      });

      expect(result.success).toBe(true);

      // 验证数据库中的记录已标记为已学习
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const corrections = await db
        .select()
        .from(parsingCorrections)
        .where(eq(parsingCorrections.id, testCorrectionId));

      expect(corrections.length).toBe(1);
      expect(corrections[0].isLearned).toBe(true);
      expect(corrections[0].learnedAt).not.toBeNull();
    });
  });

  describe("getOptimizationHistory", () => {
    it("应该返回优化历史记录", async () => {
      const history = await caller.parsingLearning.getOptimizationHistory({
        limit: 20,
      });

      expect(Array.isArray(history)).toBe(true);

      // 如果有历史记录,验证记录结构
      if (history.length > 0) {
        const record = history[0];
        expect(record).toHaveProperty("version");
        expect(record).toHaveProperty("optimizationType");
        expect(record).toHaveProperty("changeDescription");
        expect(record).toHaveProperty("correctionCount");
        expect(record).toHaveProperty("isActive");
      }
    });
  });

  describe("createOptimization", () => {
    it("应该成功创建优化记录", async () => {
      const result = await caller.parsingLearning.createOptimization({
        version: "v1.0.0-test",
        optimizationType: "add_example",
        changeDescription: "测试优化记录",
        newExamples: ["示例1", "示例2"],
        correctionCount: 5,
      });

      expect(result.success).toBe(true);
      expect(result.id).toBeDefined();

      // 验证数据库中是否保存了优化记录
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const history = await db
        .select()
        .from(promptOptimizationHistory)
        .where(eq(promptOptimizationHistory.version, "v1.0.0-test"));

      expect(history.length).toBeGreaterThanOrEqual(1);
      const testRecord = history.find(h => h.version === "v1.0.0-test");
      expect(testRecord).toBeDefined();
      expect(testRecord?.optimizationType).toBe("add_example");
      expect(testRecord?.changeDescription).toBe("测试优化记录");
      expect(testRecord?.correctionCount).toBe(5);
    });
  });

  describe("triggerAutoOptimization", () => {
    it("应该在有足够修正记录时触发自动优化", async () => {
      // 先创建一些未学习的修正记录
      for (let i = 0; i < 3; i++) {
        await caller.parsingLearning.recordCorrection({
          originalText: `测试数据${i}`,
          fieldName: "testField",
          llmValue: `oldValue${i}`,
          correctedValue: `newValue${i}`,
          correctionType: "field_wrong",
        });
      }

      // 触发自动优化(最少1条就可以触发)
      const result = await caller.parsingLearning.triggerAutoOptimization({
        minCorrections: 1,
      });

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("version");
      expect(result).toHaveProperty("newExamples");
      expect(result).toHaveProperty("correctionCount");

      expect(Array.isArray(result.newExamples)).toBe(true);
      expect(result.correctionCount).toBeGreaterThan(0);
    }, 60000); // 增加超时时间,因为LLM调用可能较慢
  });

  describe("getConfig", () => {
    it("应该成功获取配置", async () => {
      // 先设置配置
      await caller.parsingLearning.setConfig({
        configKey: "test_config",
        configValue: { value: 123 },
        description: "测试配置",
      });

      // 获取配置
      const config = await caller.parsingLearning.getConfig({
        configKey: "test_config",
      });

      expect(config).not.toBeNull();
      expect(config?.configKey).toBe("test_config");
      expect(config?.configValue.value).toBe(123);
    });
  });

  describe("setConfig", () => {
    it("应该成功设置配置", async () => {
      const result = await caller.parsingLearning.setConfig({
        configKey: "auto_optimize_threshold",
        configValue: { threshold: 15 },
        description: "自动优化阈值",
      });

      expect(result.success).toBe(true);

      // 验证配置是否保存
      const config = await caller.parsingLearning.getConfig({
        configKey: "auto_optimize_threshold",
      });

      expect(config).not.toBeNull();
      expect(config?.configValue.threshold).toBe(15);
    });
  });

  describe("batchAnnotate", () => {
    it("应该成功批量标注修正记录", async () => {
      // 先创建一些修正记录
      const ids: number[] = [];
      for (let i = 0; i < 3; i++) {
        await caller.parsingLearning.recordCorrection({
          originalText: `测试数据${i}`,
          fieldName: "testField",
          llmValue: `oldValue${i}`,
          correctedValue: `newValue${i}`,
          correctionType: "field_wrong",
        });
      }

      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const corrections = await db
        .select()
        .from(parsingCorrections)
        .where(eq(parsingCorrections.fieldName, "testField"))
        .limit(3);

      ids.push(...corrections.map(c => c.id));

      // 批量标注
      const result = await caller.parsingLearning.batchAnnotate({
        correctionIds: ids,
        annotationType: "typical_error",
        annotationNote: "这是一个典型错误",
      });

      expect(result.success).toBe(true);
      expect(result.count).toBe(3);

      // 验证标注是否保存
      const annotatedCorrections = await db
        .select()
        .from(parsingCorrections)
        .where(eq(parsingCorrections.id, ids[0]));

      expect(annotatedCorrections.length).toBe(1);
      expect(annotatedCorrections[0].annotationType).toBe("typical_error");
      expect(annotatedCorrections[0].annotationNote).toBe("这是一个典型错误");
      expect(annotatedCorrections[0].annotatedBy).toBe(1);
      expect(annotatedCorrections[0].annotatedAt).not.toBeNull();
    });
  });
});
