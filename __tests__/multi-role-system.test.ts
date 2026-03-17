import { describe, it, expect } from "vitest";
import { 
  parseRoles, 
  hasRole, 
  hasAnyRole, 
  getRoleLabel, 
  getRoleHomeRoute,
  USER_ROLES,
  ROLE_LABELS,
  ROLE_HOME_ROUTES,
  type UserRole 
} from "../src/constants/roles";

describe("Multi-Role System", () => {
  describe("parseRoles", () => {
    it("should parse single role", () => {
      const result = parseRoles("user");
      expect(result).toEqual(["user"]);
    });

    it("should parse multiple roles", () => {
      const result = parseRoles("admin,teacher");
      expect(result).toEqual(["admin", "teacher"]);
    });

    it("should parse multiple roles with spaces", () => {
      const result = parseRoles("admin, teacher, user");
      expect(result).toEqual(["admin", "teacher", "user"]);
    });

    it("should return default role for null", () => {
      const result = parseRoles(null);
      expect(result).toEqual(["user"]);
    });

    it("should return default role for undefined", () => {
      const result = parseRoles(undefined);
      expect(result).toEqual(["user"]);
    });

    it("should return default role for empty string", () => {
      const result = parseRoles("");
      expect(result).toEqual(["user"]);
    });

    it("should filter out invalid roles", () => {
      const result = parseRoles("admin,invalid,teacher");
      expect(result).toEqual(["admin", "teacher"]);
    });

    it("should handle all valid roles", () => {
      const result = parseRoles("admin,teacher,user,sales,cityPartner");
      expect(result).toEqual(["admin", "teacher", "user", "sales", "cityPartner"]);
    });
  });

  describe("hasRole", () => {
    it("should return true for single role", () => {
      expect(hasRole("user", "user")).toBe(true);
    });

    it("should return false for missing role", () => {
      expect(hasRole("user", "admin")).toBe(false);
    });

    it("should return true for role in multiple roles", () => {
      expect(hasRole("admin,teacher", "teacher")).toBe(true);
    });

    it("should return false for role not in multiple roles", () => {
      expect(hasRole("admin,teacher", "user")).toBe(false);
    });

    it("should handle null roles string", () => {
      expect(hasRole(null, "admin")).toBe(false);
      expect(hasRole(null, "user")).toBe(true); // default role
    });

    it("should handle undefined roles string", () => {
      expect(hasRole(undefined, "admin")).toBe(false);
      expect(hasRole(undefined, "user")).toBe(true); // default role
    });
  });

  describe("hasAnyRole", () => {
    it("should return true if has any of the roles", () => {
      expect(hasAnyRole("admin,teacher", ["admin", "user"])).toBe(true);
    });

    it("should return false if has none of the roles", () => {
      expect(hasAnyRole("user", ["admin", "teacher"])).toBe(false);
    });

    it("should return true if has all of the roles", () => {
      expect(hasAnyRole("admin,teacher,user", ["admin", "teacher"])).toBe(true);
    });

    it("should handle empty check roles array", () => {
      expect(hasAnyRole("admin", [])).toBe(false);
    });

    it("should handle null roles string", () => {
      expect(hasAnyRole(null, ["admin"])).toBe(false);
      expect(hasAnyRole(null, ["user"])).toBe(true); // default role
    });
  });

  describe("getRoleLabel", () => {
    it("should return correct label for admin", () => {
      expect(getRoleLabel("admin")).toBe("管理员");
    });

    it("should return correct label for teacher", () => {
      expect(getRoleLabel("teacher")).toBe("老师");
    });

    it("should return correct label for user", () => {
      expect(getRoleLabel("user")).toBe("学员");
    });

    it("should return correct label for sales", () => {
      expect(getRoleLabel("sales")).toBe("销售");
    });

    it("should return correct label for cityPartner", () => {
      expect(getRoleLabel("cityPartner")).toBe("合伙人");
    });

    it("should have labels for all roles", () => {
      USER_ROLES.forEach(role => {
        expect(ROLE_LABELS[role]).toBeDefined();
        expect(typeof ROLE_LABELS[role]).toBe("string");
        expect(ROLE_LABELS[role].length).toBeGreaterThan(0);
      });
    });
  });

  describe("getRoleHomeRoute", () => {
    it("should return correct route for admin", () => {
      expect(getRoleHomeRoute("admin")).toBe("/(admin)");
    });

    it("should return correct route for teacher", () => {
      expect(getRoleHomeRoute("teacher")).toBe("/(teacher)");
    });

    it("should return correct route for user", () => {
      expect(getRoleHomeRoute("user")).toBe("/(tabs)");
    });

    it("should return correct route for sales", () => {
      expect(getRoleHomeRoute("sales")).toBe("/(sales)");
    });

    it("should return correct route for cityPartner", () => {
      expect(getRoleHomeRoute("cityPartner")).toBe("/(partner)");
    });

    it("should have routes for all roles", () => {
      USER_ROLES.forEach(role => {
        expect(ROLE_HOME_ROUTES[role]).toBeDefined();
        expect(typeof ROLE_HOME_ROUTES[role]).toBe("string");
        expect(ROLE_HOME_ROUTES[role].length).toBeGreaterThan(0);
      });
    });
  });

  describe("Role Constants", () => {
    it("should have 5 roles defined", () => {
      expect(USER_ROLES.length).toBe(5);
    });

    it("should have all expected roles", () => {
      expect(USER_ROLES).toContain("admin");
      expect(USER_ROLES).toContain("teacher");
      expect(USER_ROLES).toContain("user");
      expect(USER_ROLES).toContain("sales");
      expect(USER_ROLES).toContain("cityPartner");
    });

    it("should have labels for all roles", () => {
      expect(Object.keys(ROLE_LABELS).length).toBe(5);
    });

    it("should have routes for all roles", () => {
      expect(Object.keys(ROLE_HOME_ROUTES).length).toBe(5);
    });
  });

  describe("Multi-Role Scenarios", () => {
    it("should handle user with admin and teacher roles", () => {
      const rolesStr = "admin,teacher";
      const roles = parseRoles(rolesStr);
      
      expect(roles.length).toBe(2);
      expect(hasRole(rolesStr, "admin")).toBe(true);
      expect(hasRole(rolesStr, "teacher")).toBe(true);
      expect(hasRole(rolesStr, "user")).toBe(false);
    });

    it("should handle user with all roles", () => {
      const rolesStr = "admin,teacher,user,sales,cityPartner";
      const roles = parseRoles(rolesStr);
      
      expect(roles.length).toBe(5);
      USER_ROLES.forEach(role => {
        expect(hasRole(rolesStr, role)).toBe(true);
      });
    });

    it("should handle user with only user role", () => {
      const rolesStr = "user";
      const roles = parseRoles(rolesStr);
      
      expect(roles.length).toBe(1);
      expect(hasRole(rolesStr, "user")).toBe(true);
      expect(hasRole(rolesStr, "admin")).toBe(false);
      expect(hasRole(rolesStr, "teacher")).toBe(false);
    });
  });
});
