import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import { storagePut } from "./storage";
import { TRPCError } from "@trpc/server";

/**
 * 文件上传路由
 */
export const uploadRouter = router({
  /**
   * 上传头像
   * 接收base64编码的图片数据,上传到S3并返回URL
   */
  uploadAvatar: protectedProcedure
    .input(z.object({
      base64Data: z.string(), // base64编码的图片数据(包含data:image/...前缀)
      fileName: z.string().optional(), // 原始文件名
    }))
    .mutation(async ({ input }) => {
      try {
        // 解析base64数据
        const matches = input.base64Data.match(/^data:image\/(\w+);base64,(.+)$/);
        if (!matches) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "无效的图片数据格式",
          });
        }

        const imageType = matches[1]; // png, jpeg, jpg, etc.
        const base64Content = matches[2];
        const buffer = Buffer.from(base64Content, 'base64');

        // 生成唯一的文件名
        const timestamp = Date.now();
        const randomSuffix = Math.random().toString(36).substring(2, 8);
        const fileKey = `avatars/teacher-${timestamp}-${randomSuffix}.${imageType}`;

        // 上传到S3
        const contentType = `image/${imageType}`;
        const result = await storagePut(fileKey, buffer, contentType);

        return {
          success: true,
          url: result.url,
          key: result.key,
        };
      } catch (error) {
        console.error("头像上传失败:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "头像上传失败",
        });
      }
    }),

  /**
   * 上传文件(通用)
   * 接收base64编码的文件数据,上传到S3并返回URL
   */
  uploadFile: protectedProcedure
    .input(z.object({
      base64Data: z.string(), // base64编码的文件数据
      fileName: z.string(), // 原始文件名
      fileType: z.string(), // MIME类型
    }))
    .mutation(async ({ input }) => {
      try {
        // 解析base64数据
        const base64Content = input.base64Data.replace(/^data:.+;base64,/, '');
        const buffer = Buffer.from(base64Content, 'base64');

        // 生成唯一的文件名
        const timestamp = Date.now();
        const randomSuffix = Math.random().toString(36).substring(2, 8);
        const ext = input.fileName.split('.').pop() || 'bin';
        const fileKey = `uploads/${timestamp}-${randomSuffix}.${ext}`;

        // 上传到S3
        const result = await storagePut(fileKey, buffer, input.fileType);

        return {
          success: true,
          url: result.url,
          key: result.key,
        };
      } catch (error) {
        console.error("文件上传失败:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "文件上传失败",
        });
      }
    }),
});
