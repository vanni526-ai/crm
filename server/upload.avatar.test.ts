import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { appRouter } from "./routers";
import type { Context } from "./_core/context";

// 模拟用户上下文
const mockContext: Context = {
  user: {
    openId: "test-open-id",
    name: "测试管理员",
    email: "admin@test.com",
    role: "admin",
  },
};

// 创建测试caller
const caller = appRouter.createCaller(mockContext);

describe("头像上传功能测试", () => {
  describe("upload.uploadAvatar接口", () => {
    it("应该成功上传PNG格式的头像", async () => {
      // 创建一个简单的1x1像素的PNG图片的base64数据
      const pngBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

      const result = await caller.upload.uploadAvatar({
        base64Data: pngBase64,
        fileName: "test-avatar.png",
      });

      expect(result.success).toBe(true);
      expect(result.url).toBeDefined();
      expect(result.url).toContain("https://");
      expect(result.key).toBeDefined();
      expect(result.key).toContain("avatars/teacher-");
      expect(result.key).toContain(".png");
    });

    it("应该成功上传JPEG格式的头像", async () => {
      // 创建一个简单的1x1像素的JPEG图片的base64数据
      const jpegBase64 = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA//2Q==";

      const result = await caller.upload.uploadAvatar({
        base64Data: jpegBase64,
        fileName: "test-avatar.jpg",
      });

      expect(result.success).toBe(true);
      expect(result.url).toBeDefined();
      expect(result.url).toContain("https://");
      expect(result.key).toBeDefined();
      expect(result.key).toContain("avatars/teacher-");
      expect(result.key).toContain(".jpeg");
    });

    it("应该拒绝无效的base64数据格式", async () => {
      const invalidBase64 = "invalid-base64-data";

      await expect(
        caller.upload.uploadAvatar({
          base64Data: invalidBase64,
          fileName: "test.png",
        })
      ).rejects.toThrow("无效的图片数据格式");
    });

    it("应该拒绝非图片的base64数据", async () => {
      const textBase64 = "data:text/plain;base64,SGVsbG8gV29ybGQ=";

      await expect(
        caller.upload.uploadAvatar({
          base64Data: textBase64,
          fileName: "test.txt",
        })
      ).rejects.toThrow();
    });

    it("应该为每次上传生成唯一的文件名", async () => {
      const pngBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

      const result1 = await caller.upload.uploadAvatar({
        base64Data: pngBase64,
        fileName: "avatar.png",
      });

      const result2 = await caller.upload.uploadAvatar({
        base64Data: pngBase64,
        fileName: "avatar.png",
      });

      expect(result1.key).not.toBe(result2.key);
      expect(result1.url).not.toBe(result2.url);
    });
  });

  describe("teachers接口与avatarUrl集成", () => {
    let createdTeacherId: number;

    it("应该支持在创建老师时包含avatarUrl", async () => {
      const result = await caller.teachers.create({
        name: "测试老师-头像",
        city: "北京",
        avatarUrl: "https://example.com/avatar.png",
        phone: "13800138000",
        customerType: "温柔御姐",
      });

      expect(result.success).toBe(true);
      expect(result.id).toBeDefined();
      createdTeacherId = result.id;

      // 验证头像URL是否正确保存
      const teacher = await caller.teachers.getById({ id: createdTeacherId });
      expect(teacher.avatarUrl).toBe("https://example.com/avatar.png");
    });

    it("应该支持更新老师的avatarUrl", async () => {
      const newAvatarUrl = "https://example.com/new-avatar.png";

      const result = await caller.teachers.update({
        id: createdTeacherId,
        data: {
          avatarUrl: newAvatarUrl,
        },
      });

      expect(result.success).toBe(true);

      // 验证头像URL是否正确更新
      const teacher = await caller.teachers.getById({ id: createdTeacherId });
      expect(teacher.avatarUrl).toBe(newAvatarUrl);
    });

    it("teachers.list应该返回avatarUrl字段", async () => {
      const teachers = await caller.teachers.list();

      const testTeacher = teachers.find((t: any) => t.id === createdTeacherId);
      expect(testTeacher).toBeDefined();
      expect(testTeacher.avatarUrl).toBe("https://example.com/new-avatar.png");
    });

    afterAll(async () => {
      // 清理测试数据
      if (createdTeacherId) {
        await caller.teachers.batchDelete({ ids: [createdTeacherId] });
      }
    });
  });

  describe("完整的头像上传流程", () => {
    let teacherId: number;

    it("应该完成完整的头像上传和老师创建流程", async () => {
      // 1. 上传头像
      const pngBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

      const uploadResult = await caller.upload.uploadAvatar({
        base64Data: pngBase64,
        fileName: "teacher-avatar.png",
      });

      expect(uploadResult.success).toBe(true);
      expect(uploadResult.url).toBeDefined();

      // 2. 创建老师,使用上传的头像URL
      const createResult = await caller.teachers.create({
        name: "测试老师-完整流程",
        city: "上海",
        avatarUrl: uploadResult.url,
        phone: "13900139000",
        customerType: "活泼可爱",
      });

      expect(createResult.success).toBe(true);
      expect(createResult.id).toBeDefined();
      teacherId = createResult.id;

      // 3. 验证老师信息包含头像URL
      const teacher = await caller.teachers.getById({ id: teacherId });
      expect(teacher.avatarUrl).toBe(uploadResult.url);
      expect(teacher.name).toBe("测试老师-完整流程");
    });

    it("应该完成完整的头像更新流程", async () => {
      // 1. 上传新头像
      const jpegBase64 = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA//2Q==";

      const uploadResult = await caller.upload.uploadAvatar({
        base64Data: jpegBase64,
        fileName: "new-avatar.jpg",
      });

      expect(uploadResult.success).toBe(true);

      // 2. 更新老师头像
      const updateResult = await caller.teachers.update({
        id: teacherId,
        data: {
          avatarUrl: uploadResult.url,
        },
      });

      expect(updateResult.success).toBe(true);

      // 3. 验证头像已更新
      const teacher = await caller.teachers.getById({ id: teacherId });
      expect(teacher.avatarUrl).toBe(uploadResult.url);
    });

    afterAll(async () => {
      // 清理测试数据
      if (teacherId) {
        await caller.teachers.batchDelete({ ids: [teacherId] });
      }
    });
  });
});
