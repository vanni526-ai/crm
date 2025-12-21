import { router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { getDb } from "./db";
import { gmailImportConfig } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { TrafficSourceAlias } from "./trafficSourceUtils";

/**
 * 流量来源配置路由
 */
export const trafficSourceConfigRouter = router({
  /**
   * 获取流量来源别名配置
   */
  getAliasConfig: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const config = await db
      .select()
      .from(gmailImportConfig)
      .where(eq(gmailImportConfig.configKey, "traffic_source_aliases"))
      .limit(1);

    if (config.length === 0) {
      return [] as TrafficSourceAlias[];
    }

    return config[0].configValue as TrafficSourceAlias[];
  }),

  /**
   * 更新流量来源别名配置
   */
  updateAliasConfig: protectedProcedure
    .input(
      z.object({
        aliases: z.array(
          z.object({
            pattern: z.string(),
            standardName: z.string(),
          })
        ),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const existing = await db
        .select()
        .from(gmailImportConfig)
        .where(eq(gmailImportConfig.configKey, "traffic_source_aliases"))
        .limit(1);

      if (existing.length === 0) {
        await db.insert(gmailImportConfig).values({
          configKey: "traffic_source_aliases",
          configValue: input.aliases,
          description: "流量来源别名映射配置",
        });
      } else {
        await db
          .update(gmailImportConfig)
          .set({
            configValue: input.aliases,
            updatedAt: new Date(),
          })
          .where(eq(gmailImportConfig.configKey, "traffic_source_aliases"));
      }

      return { success: true };
    }),
});
