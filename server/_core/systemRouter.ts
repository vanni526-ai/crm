import { z } from "zod";
import { notifyOwner } from "./notification";
import { adminProcedure, publicProcedure, router } from "./trpc";
import * as db from "../db";
import { readFileSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";

export const systemRouter = router({
  health: publicProcedure
    .input(
      z.object({
        timestamp: z.number().min(0, "timestamp cannot be negative"),
      })
    )
    .query(() => ({
      ok: true,
    })),

  version: publicProcedure
    .query(() => {
      try {
        // 优先读取package.json的version字段（由generate-version.mjs生成）
        const packagePath = join(process.cwd(), 'package.json');
        const packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'));
        const version = packageJson.version;
        
        // 尝试读取version.json获取详细信息
        try {
          const versionPath = join(process.cwd(), 'client/public/version.json');
          const versionData = JSON.parse(readFileSync(versionPath, 'utf-8'));
          return {
            version, // 使用package.json的version
            buildTime: versionData.buildTime,
            branch: versionData.branch,
            isDirty: versionData.isDirty,
            serverTime: new Date().toISOString(),
          };
        } catch {
          // 如果version.json不存在，只返回package.json的version
          return {
            version,
            buildTime: 'unknown',
            branch: 'unknown',
            isDirty: false,
            serverTime: new Date().toISOString(),
          };
        }
      } catch (error) {
        // 如果读取package.json失败，尝试动态读取Git信息
        try {
          const gitHash = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
          const isDirty = execSync('git status --porcelain', { encoding: 'utf-8' }).trim().length > 0;
          const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
          const version = isDirty ? `${gitHash}-dirty` : gitHash;
          
          return {
            version,
            buildTime: new Date().toISOString(),
            branch,
            isDirty,
            serverTime: new Date().toISOString(),
          };
        } catch {
          return {
            version: 'unknown',
            buildTime: 'unknown',
            branch: 'unknown',
            isDirty: false,
            serverTime: new Date().toISOString(),
          };
        }
      }
    }),

  notifyOwner: adminProcedure
    .input(
      z.object({
        title: z.string().min(1, "title is required"),
        content: z.string().min(1, "content is required"),
      })
    )
    .mutation(async ({ input }) => {
      const delivered = await notifyOwner(input);
      return {
        success: delivered,
      } as const;
    }),

  batchUpdateOrderNumbers: adminProcedure
    .mutation(async () => {
      const updatedCount = await db.batchUpdateOrderNumbers();
      return {
        success: true,
        updatedCount,
      };
    }),
});
