import { describe, it, expect, beforeAll } from "vitest";
import * as db from "./db";

describe("元数据API测试", () => {
  // 确保数据库中有测试数据
  beforeAll(async () => {
    // 创建测试订单(包含城市、课程、教室信息)
    try {
      await db.createOrder({
        orderNo: "TEST-META-001",
        salesId: 1,
        customerName: "测试客户A",
        salesPerson: "测试销售",
        paymentAmount: "1000",
        courseAmount: "800",
        deliveryCity: "上海",
        deliveryRoom: "瀛姬体验馆1101",
        deliveryCourse: "基础课程",
        deliveryTeacher: "张老师",
      });
    } catch (error) {
      // 如果订单已存在,忽略错误
      console.log("测试订单可能已存在,跳过创建");
    }

    // 创建测试老师
    try {
      await db.createTeacher({
        name: "测试老师A",
        city: "北京",
        status: "活跃",
      });
    } catch (error) {
      console.log("测试老师可能已存在,跳过创建");
    }
  });

  describe("城市列表API", () => {
    it("应该能够获取所有唯一城市列表", async () => {
      const cities = await db.getUniqueCities();

      expect(cities).toBeDefined();
      expect(Array.isArray(cities)).toBe(true);
      expect(cities.length).toBeGreaterThan(0);

      // 验证返回的是字符串数组
      cities.forEach((city) => {
        expect(typeof city).toBe("string");
        expect(city.length).toBeGreaterThan(0);
      });
    });

    it("城市列表应该不包含重复项", async () => {
      const cities = await db.getUniqueCities();
      const uniqueCities = Array.from(new Set(cities));

      expect(cities.length).toBe(uniqueCities.length);
    });

    it("城市列表应该按中文排序", async () => {
      const cities = await db.getUniqueCities();

      if (cities.length > 1) {
        // 验证是否按中文排序
        for (let i = 0; i < cities.length - 1; i++) {
          const comparison = cities[i]!.localeCompare(cities[i + 1]!, "zh-CN");
          expect(comparison).toBeLessThanOrEqual(0);
        }
      }
    });

    it("城市列表应该包含测试数据中的城市", async () => {
      const cities = await db.getUniqueCities();

      // 至少应该包含上海或北京(来自测试数据)
      const hasTestCity = cities.some(
        (city) => city === "上海" || city === "北京"
      );
      expect(hasTestCity).toBe(true);
    });
  });

  describe("课程列表API", () => {
    it("应该能够获取所有唯一课程类型列表", async () => {
      const courses = await db.getUniqueCourses();

      expect(courses).toBeDefined();
      expect(Array.isArray(courses)).toBe(true);
    });

    it("课程列表应该不包含重复项", async () => {
      const courses = await db.getUniqueCourses();
      const uniqueCourses = Array.from(new Set(courses));

      expect(courses.length).toBe(uniqueCourses.length);
    });

    it("课程列表应该按中文排序", async () => {
      const courses = await db.getUniqueCourses();

      if (courses.length > 1) {
        for (let i = 0; i < courses.length - 1; i++) {
          const comparison = courses[i]!.localeCompare(
            courses[i + 1]!,
            "zh-CN"
          );
          expect(comparison).toBeLessThanOrEqual(0);
        }
      }
    });
  });

  describe("教室列表API", () => {
    it("应该能够获取所有唯一教室列表", async () => {
      const classrooms = await db.getUniqueClassrooms();

      expect(classrooms).toBeDefined();
      expect(Array.isArray(classrooms)).toBe(true);
    });

    it("教室列表应该不包含重复项", async () => {
      const classrooms = await db.getUniqueClassrooms();
      const uniqueClassrooms = Array.from(new Set(classrooms));

      expect(classrooms.length).toBe(uniqueClassrooms.length);
    });

    it("教室列表应该按中文排序", async () => {
      const classrooms = await db.getUniqueClassrooms();

      if (classrooms.length > 1) {
        for (let i = 0; i < classrooms.length - 1; i++) {
          const comparison = classrooms[i]!.localeCompare(
            classrooms[i + 1]!,
            "zh-CN"
          );
          expect(comparison).toBeLessThanOrEqual(0);
        }
      }
    });
  });

  describe("老师名称列表API", () => {
    it("应该能够获取所有唯一老师名称列表", async () => {
      const teacherNames = await db.getUniqueTeacherNames();

      expect(teacherNames).toBeDefined();
      expect(Array.isArray(teacherNames)).toBe(true);
      expect(teacherNames.length).toBeGreaterThan(0);
    });

    it("老师名称列表应该不包含重复项", async () => {
      const teacherNames = await db.getUniqueTeacherNames();
      const uniqueNames = Array.from(new Set(teacherNames));

      expect(teacherNames.length).toBe(uniqueNames.length);
    });

    it("老师名称列表应该按中文排序", async () => {
      const teacherNames = await db.getUniqueTeacherNames();

      if (teacherNames.length > 1) {
        for (let i = 0; i < teacherNames.length - 1; i++) {
          const comparison = teacherNames[i]!.localeCompare(
            teacherNames[i + 1]!,
            "zh-CN"
          );
          expect(comparison).toBeLessThanOrEqual(0);
        }
      }
    });

    it("老师名称列表应该包含测试数据中的老师", async () => {
      const teacherNames = await db.getUniqueTeacherNames();

      // 应该包含张老师或测试老师A
      const hasTestTeacher = teacherNames.some(
        (name) => name === "张老师" || name === "测试老师A"
      );
      expect(hasTestTeacher).toBe(true);
    });
  });

  describe("销售人员列表API", () => {
    it("应该能够获取所有销售人员列表", async () => {
      const salespeople = await db.getAllSalespersons();

      expect(salespeople).toBeDefined();
      expect(Array.isArray(salespeople)).toBe(true);
    });

    it("销售人员应该包含必要的字段", async () => {
      const salespeople = await db.getAllSalespersons();

      if (salespeople.length > 0) {
        const person = salespeople[0];
        expect(person).toHaveProperty("id");
        expect(person).toHaveProperty("name");
        expect(person).toHaveProperty("nickname");
      }
    });

    it("销售人员列表应该不包含重复ID", async () => {
      const salespeople = await db.getAllSalespersons();
      const ids = salespeople.map((p) => p.id);
      const uniqueIds = Array.from(new Set(ids));

      expect(ids.length).toBe(uniqueIds.length);
    });
  });

  describe("数据完整性测试", () => {
    it("所有元数据查询函数应该返回有效数据", async () => {
      const [cities, courses, classrooms, teacherNames, salespeople] =
        await Promise.all([
          db.getUniqueCities(),
          db.getUniqueCourses(),
          db.getUniqueClassrooms(),
          db.getUniqueTeacherNames(),
          db.getAllSalespersons(),
        ]);

      // 验证所有查询都返回了数组
      expect(Array.isArray(cities)).toBe(true);
      expect(Array.isArray(courses)).toBe(true);
      expect(Array.isArray(classrooms)).toBe(true);
      expect(Array.isArray(teacherNames)).toBe(true);
      expect(Array.isArray(salespeople)).toBe(true);

      // 至少城市和老师应该有数据(因为我们创建了测试数据)
      expect(cities.length).toBeGreaterThan(0);
      expect(teacherNames.length).toBeGreaterThan(0);
    });

    it("元数据查询应该能够并发执行", async () => {
      const startTime = Date.now();

      // 并发执行所有查询
      const results = await Promise.all([
        db.getUniqueCities(),
        db.getUniqueCourses(),
        db.getUniqueClassrooms(),
        db.getUniqueTeacherNames(),
        db.getAllSalespersons(),
      ]);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // 并发执行应该在合理时间内完成(小于5秒)
      expect(duration).toBeLessThan(5000);

      // 所有查询都应该成功
      results.forEach((result) => {
        expect(Array.isArray(result)).toBe(true);
      });
    });
  });

  describe("空值和错误处理", () => {
    it("城市列表不应该包含null或空字符串", async () => {
      const cities = await db.getUniqueCities();

      cities.forEach((city) => {
        expect(city).toBeTruthy();
        expect(city!.trim().length).toBeGreaterThan(0);
      });
    });

    it("课程列表不应该包含null或空字符串", async () => {
      const courses = await db.getUniqueCourses();

      courses.forEach((course) => {
        expect(course).toBeTruthy();
        expect(course!.trim().length).toBeGreaterThan(0);
      });
    });

    it("教室列表不应该包含null或空字符串", async () => {
      const classrooms = await db.getUniqueClassrooms();

      classrooms.forEach((classroom) => {
        expect(classroom).toBeTruthy();
        expect(classroom!.trim().length).toBeGreaterThan(0);
      });
    });

    it("老师名称列表不应该包含null或空字符串", async () => {
      const teacherNames = await db.getUniqueTeacherNames();

      teacherNames.forEach((name) => {
        expect(name).toBeTruthy();
        expect(name!.trim().length).toBeGreaterThan(0);
      });
    });
  });

  describe("老师分类列表API", () => {
    it("应该能够获取所有唯一老师分类列表", async () => {
      const categories = await db.getUniqueTeacherCategories();

      expect(categories).toBeDefined();
      expect(Array.isArray(categories)).toBe(true);
    });

    it("老师分类列表应该不包含重复项", async () => {
      const categories = await db.getUniqueTeacherCategories();
      const uniqueCategories = Array.from(new Set(categories));

      expect(categories.length).toBe(uniqueCategories.length);
    });

    it("老师分类列表应该按中文排序", async () => {
      const categories = await db.getUniqueTeacherCategories();

      if (categories.length > 1) {
        for (let i = 0; i < categories.length - 1; i++) {
          const comparison = categories[i]!.localeCompare(
            categories[i + 1]!,
            "zh-CN"
          );
          expect(comparison).toBeLessThanOrEqual(0);
        }
      }
    });

    it("老师分类列表不应该包含null或空字符串", async () => {
      const categories = await db.getUniqueTeacherCategories();

      categories.forEach((category) => {
        expect(category).toBeTruthy();
        expect(category!.trim().length).toBeGreaterThan(0);
      });
    });
  });

  describe("课程价格列表API", () => {
    it("应该能够获取所有唯一课程价格列表", async () => {
      const amounts = await db.getUniqueCourseAmounts();

      expect(amounts).toBeDefined();
      expect(Array.isArray(amounts)).toBe(true);
    });

    it("课程价格列表应该不包含重复项", async () => {
      const amounts = await db.getUniqueCourseAmounts();
      const uniqueAmounts = Array.from(new Set(amounts));

      expect(amounts.length).toBe(uniqueAmounts.length);
    });

    it("课程价格应该按数值从小到大排序", async () => {
      const amounts = await db.getUniqueCourseAmounts();

      if (amounts.length > 1) {
        for (let i = 0; i < amounts.length - 1; i++) {
          const current = parseFloat(amounts[i]!);
          const next = parseFloat(amounts[i + 1]!);
          expect(current).toBeLessThanOrEqual(next);
        }
      }
    });

    it("课程价格列表不应该包含0或负数", async () => {
      const amounts = await db.getUniqueCourseAmounts();

      amounts.forEach((amount) => {
        const numAmount = parseFloat(amount!);
        expect(numAmount).toBeGreaterThan(0);
      });
    });

    it("课程价格应该是有效的数字字符串", async () => {
      const amounts = await db.getUniqueCourseAmounts();

      amounts.forEach((amount) => {
        expect(amount).toBeTruthy();
        const numAmount = parseFloat(amount!);
        expect(isNaN(numAmount)).toBe(false);
      });
    });
  });

  describe("完整元数据API测试(包含新字段)", () => {
    it("getAll应该返回所有元数据包括老师分类和课程价格", async () => {
      const [
        cities,
        courses,
        classrooms,
        teacherNames,
        salespeople,
        teacherCategories,
        courseAmounts,
      ] = await Promise.all([
        db.getUniqueCities(),
        db.getUniqueCourses(),
        db.getUniqueClassrooms(),
        db.getUniqueTeacherNames(),
        db.getAllSalespersons(),
        db.getUniqueTeacherCategories(),
        db.getUniqueCourseAmounts(),
      ]);

      // 验证所有查询都返回了数组
      expect(Array.isArray(cities)).toBe(true);
      expect(Array.isArray(courses)).toBe(true);
      expect(Array.isArray(classrooms)).toBe(true);
      expect(Array.isArray(teacherNames)).toBe(true);
      expect(Array.isArray(salespeople)).toBe(true);
      expect(Array.isArray(teacherCategories)).toBe(true);
      expect(Array.isArray(courseAmounts)).toBe(true);
    });

    it("所有元数据查询应该能够并发执行(包含新API)", async () => {
      const startTime = Date.now();

      // 并发执行所有查询(包含新增的两个)
      const results = await Promise.all([
        db.getUniqueCities(),
        db.getUniqueCourses(),
        db.getUniqueClassrooms(),
        db.getUniqueTeacherNames(),
        db.getAllSalespersons(),
        db.getUniqueTeacherCategories(),
        db.getUniqueCourseAmounts(),
      ]);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // 并发执行应该在合理时间内完成(小于5秒)
      expect(duration).toBeLessThan(5000);

      // 所有查询都应该成功
      results.forEach((result) => {
        expect(Array.isArray(result)).toBe(true);
      });
    });
  });
});
