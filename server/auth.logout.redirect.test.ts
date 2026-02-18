import { describe, it, expect } from "vitest";

describe("退出登录功能测试", () => {
  it("测试用例1: 验证logout函数包含重定向逻辑", async () => {
    // 读取useAuth hook的源代码
    const fs = await import("fs/promises");
    const useAuthCode = await fs.readFile(
      "client/src/_core/hooks/useAuth.ts",
      "utf-8"
    );

    // 验证logout函数包含getLoginUrl()调用
    expect(useAuthCode).toContain("window.location.href = getLoginUrl()");
    
    // 验证在finally块中有重定向逻辑
    const finallyBlockMatch = useAuthCode.match(/finally\s*{[\s\S]*?}/);
    expect(finallyBlockMatch).toBeTruthy();
    expect(finallyBlockMatch![0]).toContain("window.location.href = getLoginUrl()");

    console.log("✅ 退出登录功能包含重定向逻辑");
  });

  it("测试用例2: 验证在认证失败时也会重定向", async () => {
    const fs = await import("fs/promises");
    const useAuthCode = await fs.readFile(
      "client/src/_core/hooks/useAuth.ts",
      "utf-8"
    );

    // 验证在UNAUTHORIZED错误处理中也有重定向
    const unauthorizedBlockMatch = useAuthCode.match(
      /if\s*\(\s*error instanceof TRPCClientError[\s\S]*?return;/
    );
    expect(unauthorizedBlockMatch).toBeTruthy();
    expect(unauthorizedBlockMatch![0]).toContain("window.location.href = getLoginUrl()");

    console.log("✅ 认证失败时也会重定向到登录页");
  });
});
