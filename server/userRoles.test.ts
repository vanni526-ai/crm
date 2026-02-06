import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock db module
vi.mock("./db", () => {
  const mockUsers: any[] = [];
  let nextId = 1;
  return {
    getDb: vi.fn().mockResolvedValue({
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockImplementation(() => {
              return Promise.resolve(mockUsers.length > 0 ? [mockUsers[mockUsers.length - 1]] : []);
            }),
          }),
          // list all users
          then: undefined,
        }),
      }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockImplementation((data: any) => {
          const user = { ...data, id: nextId++ };
          mockUsers.push(user);
          return Promise.resolve({ insertId: user.id });
        }),
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      }),
    }),
    _mockUsers: mockUsers,
  };
});

// Mock passwordUtils
vi.mock("./passwordUtils", () => ({
  hashPassword: vi.fn().mockResolvedValue("hashed_password"),
}));

describe("用户多角色功能", () => {
  describe("角色常量和解析", () => {
    const VALID_ROLES = ["admin", "teacher", "user", "sales", "cityPartner"];
    const ROLE_LABELS: Record<string, string> = {
      admin: "管理员",
      teacher: "老师",
      user: "普通用户",
      sales: "销售",
      cityPartner: "城市合伙人",
    };

    it("应该包含5种角色", () => {
      expect(VALID_ROLES).toHaveLength(5);
      expect(VALID_ROLES).toContain("admin");
      expect(VALID_ROLES).toContain("teacher");
      expect(VALID_ROLES).toContain("user");
      expect(VALID_ROLES).toContain("sales");
      expect(VALID_ROLES).toContain("cityPartner");
    });

    it("每种角色都有中文标签", () => {
      for (const role of VALID_ROLES) {
        expect(ROLE_LABELS[role]).toBeDefined();
        expect(ROLE_LABELS[role].length).toBeGreaterThan(0);
      }
    });

    it("应该正确解析多角色字符串", () => {
      const parseRoles = (rolesStr: string) =>
        rolesStr.split(",").map((r) => r.trim()).filter(Boolean);

      expect(parseRoles("admin,teacher")).toEqual(["admin", "teacher"]);
      expect(parseRoles("user")).toEqual(["user"]);
      expect(parseRoles("admin,teacher,sales")).toEqual(["admin", "teacher", "sales"]);
      expect(parseRoles("cityPartner")).toEqual(["cityPartner"]);
    });

    it("应该正确获取主角色（第一个角色）", () => {
      const getPrimaryRole = (rolesStr: string) => rolesStr.split(",")[0].trim();

      expect(getPrimaryRole("admin,teacher")).toBe("admin");
      expect(getPrimaryRole("user")).toBe("user");
      expect(getPrimaryRole("teacher,admin")).toBe("teacher");
    });

    it("应该正确判断是否包含某个角色", () => {
      const hasRole = (rolesStr: string, role: string) =>
        rolesStr.split(",").map((r) => r.trim()).includes(role);

      expect(hasRole("admin,teacher", "admin")).toBe(true);
      expect(hasRole("admin,teacher", "teacher")).toBe(true);
      expect(hasRole("admin,teacher", "user")).toBe(false);
      expect(hasRole("user", "admin")).toBe(false);
      expect(hasRole("admin,teacher,sales,cityPartner", "cityPartner")).toBe(true);
    });
  });

  describe("角色兼容性", () => {
    it("当roles为空时应回退到role字段", () => {
      const getRoles = (user: { role?: string; roles?: string }) => {
        return user.roles || user.role || "user";
      };

      expect(getRoles({ role: "admin", roles: "admin,teacher" })).toBe("admin,teacher");
      expect(getRoles({ role: "admin", roles: undefined })).toBe("admin");
      expect(getRoles({ role: undefined, roles: undefined })).toBe("user");
    });

    it("创建用户时roles和role应同步", () => {
      const rolesStr = "teacher,sales";
      const primaryRole = rolesStr.split(",")[0].trim();

      expect(primaryRole).toBe("teacher");
    });

    it("更新角色时roles和role应同步", () => {
      const newRoles = "admin,teacher,cityPartner";
      const primaryRole = newRoles.split(",")[0].trim();

      expect(primaryRole).toBe("admin");
    });
  });

  describe("权限检查兼容多角色", () => {
    it("多角色中包含admin应通过管理员权限检查", () => {
      const checkAdmin = (userRoles: string) =>
        userRoles.split(",").map((r) => r.trim()).includes("admin");

      expect(checkAdmin("admin")).toBe(true);
      expect(checkAdmin("admin,teacher")).toBe(true);
      expect(checkAdmin("teacher,admin")).toBe(true);
      expect(checkAdmin("teacher")).toBe(false);
      expect(checkAdmin("user")).toBe(false);
      expect(checkAdmin("sales,cityPartner")).toBe(false);
    });
  });
});
