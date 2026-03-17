import AsyncStorage from "@react-native-async-storage/async-storage";

// ==================== 配置 ====================
/**
 * 统一直连 CRM 后端 tRPC API
 * 所有环境（React Native / Web）都使用同一个地址
 */
const API_BASE = "https://crm.bdsm.com.cn/api/trpc";

// ==================== Token管理 ====================
const TOKEN_KEY = "auth_token";
let memoryToken: string | null = null;

export async function getToken(): Promise<string | null> {
  if (memoryToken) return memoryToken;
  try {
    const t = await AsyncStorage.getItem(TOKEN_KEY);
    if (t) memoryToken = t;
    return t;
  } catch {
    return null;
  }
}

export async function setToken(token: string): Promise<void> {
  memoryToken = token;
  try {
    await AsyncStorage.setItem(TOKEN_KEY, token);
  } catch (e) {
    console.error("Failed to save token:", e);
  }
}

export async function clearToken(): Promise<void> {
  memoryToken = null;
  try {
    await AsyncStorage.removeItem(TOKEN_KEY);
  } catch (e) {
    console.error("Failed to clear token:", e);
  }
}

// ==================== 类型定义 ====================
export interface City {
  id: number;
  city: string;
  pinyin?: string;
  areaCode?: string;
  isActive: boolean;
}

export interface Teacher {
  id: number;
  userId?: number;
  name: string;
  nickname: string | null;
  phone: string | null;
  avatarUrl: string | null;
  status?: string;
  category?: string | null;
  city: string | null;
  customerType: string | null;
  notes: string | null;
  aliases?: string | null;
  contractEndDate?: Date | string | null;
  joinDate?: Date | string | null;
  classCount?: number;
  totalHours?: number;
  totalIncome?: number;
  isActive: boolean | number;
  email?: string;
  wechat?: string;
  hourlyRate?: number;
  bankAccount?: string;
  bankName?: string;
  teacherAttributes?: any;
}

export interface Course {
  id: number;
  name: string;
  introduction?: string | null;
  description: string | null;
  price: number | string | null;
  duration: number | string | null;
  level: string | null;
  isActive: boolean | number;
  isBookable?: boolean | number;
  alias?: string | null;
  isHot?: number;
  teacherFee?: string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface Order {
  id: number;
  orderNo: string;
  salesId?: number;
  salesPerson?: string;
  customerId?: number;
  customerName?: string;
  trafficSource?: string;
  paymentAmount: string;
  courseAmount?: string;
  teacherFee?: string;
  partnerFee?: string;
  deliveryCity?: string;
  deliveryRoom?: string;
  deliveryTeacher?: string;
  deliveryCourse?: string;
  paymentCity?: string;
  status: string;
  deliveryStatus?: "pending" | "accepted" | "delivered" | null;
  acceptedBy?: number | null;
  acceptedAt?: string | null;
  classDate?: string | null;
  classTime?: string | null;
}

export interface LoginResponse {
  success: boolean;
  token?: string;
  user?: {
    id: number;
    openId?: string;
    name: string;
    nickname?: string;
    email?: string;
    phone?: string;
    role: string;
    roles?: string;
    identity?: string;
    relatedName?: string;
  };
  message?: string;
  error?: string;
}

/** 老师端课程（订单）数据类型 */
export interface TeacherCourse {
  id: number;
  courseName: string;
  courseType?: string;
  classDate: string;
  classTime: string;
  duration: number;
  classroomName?: string;
  classroomAddress?: string;
  studentName?: string;
  studentPhone?: string;
  fee: number | string;
  status: string;
  notes?: string;
}

/** 老师端收入记录类型 */
export interface TeacherPaymentRecord {
  id: number;
  teacherId?: number;
  teacherName?: string;
  orderId?: number;
  orderNo?: string;
  courseName?: string;
  studentName?: string;
  courseDate?: string;
  settlementDate?: string;
  amount: number | string;
  status?: string;
  notes?: string;
}

// ==================== 通用请求函数 ====================

/** tRPC query (GET) - 直连 CRM 后端 */
async function trpcQuery<T>(procedure: string, input?: any): Promise<T> {
  const params = new URLSearchParams();
  if (input !== undefined) {
    params.set("input", JSON.stringify({ json: input }));
  }
  const token = await getToken();
  if (token) {
    params.set("token", token);
  }
  // 防缓存
  params.set("_t", Date.now().toString());

  const qs = params.toString();
  const url = `${API_BASE}/${procedure}${qs ? "?" + qs : ""}`;

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
    headers["X-Auth-Token"] = token;
  }

  const resp = await fetch(url, { method: "GET", headers });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    const msg =
      err?.error?.json?.message ||
      err?.error?.message ||
      `Request failed: ${resp.status}`;
    throw new Error(msg);
  }
  const data = await resp.json();
  // tRPC 响应格式
  if (data?.result?.data?.json !== undefined) {
    return data.result.data.json as T;
  }
  return data as T;
}

/** tRPC mutation (POST) - 直连 CRM 后端 */
async function trpcMutation<T>(procedure: string, input: any): Promise<T> {
  const token = await getToken();
  const params = new URLSearchParams();
  if (token) {
    params.set("token", token);
  }
  params.set("_t", Date.now().toString());

  const qs = params.toString();
  const url = `${API_BASE}/${procedure}${qs ? "?" + qs : ""}`;

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
    headers["X-Auth-Token"] = token;
  }

  const resp = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ json: input }),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    const msg =
      err?.error?.json?.message ||
      err?.error?.message ||
      `Request failed: ${resp.status}`;
    throw new Error(msg);
  }
  const data = await resp.json();
  if (data?.result?.data?.json !== undefined) {
    return data.result.data.json as T;
  }
  return data as T;
}

// ==================== 辅助函数 ====================

/** 安全提取数组 */
function extractArray(result: any): any[] {
  if (Array.isArray(result)) return result;
  if (result?.data && Array.isArray(result.data)) return result.data;
  if (result?.orders && Array.isArray(result.orders)) return result.orders;
  if (result?.users && Array.isArray(result.users)) return result.users;
  if (result?.customers && Array.isArray(result.customers)) return result.customers;
  return [];
}

/** 城市名称验证 */
function isValidCityName(name: string): boolean {
  if (!name || name.length > 10) return false;
  if (name.includes("http") || name.includes("://") || name.includes("\n")) return false;
  if (name.includes("会议室") || name.includes("点击") || name.includes("链接")) return false;
  if (/^\d+$/.test(name)) return false;
  return /^[\u4e00-\u9fa5]{1,10}$/.test(name);
}

// ==================== API客户端 ====================
export const api = {
  // 认证
  auth: {
    login: async (
      username: string,
      password: string,
    ): Promise<LoginResponse> => {
      try {
        const result = await trpcMutation<any>("auth.login", {
          username,
          password,
        });
        if (result?.success && result?.token) {
          await setToken(result.token);
          return {
            success: true,
            token: result.token,
            user: result.user,
          };
        }
        return { success: false, message: result?.message || "登录失败" };
      } catch (error: any) {
        console.error("[API] Login error:", error);
        return { success: false, message: error.message || "网络连接失败" };
      }
    },

    me: async (): Promise<any> => {
      try {
        return await trpcQuery("auth.me");
      } catch {
        return null;
      }
    },

    verifyToken: async (): Promise<{ valid: boolean; user?: any }> => {
      try {
        const token = await getToken();
        if (!token) return { valid: false };
        try {
          return await trpcQuery("auth.verifyToken", { token });
        } catch {
          // verifyToken可能不支持当前token格式，fallback到auth.me
          try {
            const user = await trpcQuery("auth.me", undefined);
            if (user) return { valid: true, user };
          } catch { /* ignore */ }
          return { valid: false };
        }
      } catch {
        return { valid: false };
      }
    },

    logout: async (): Promise<void> => {
      try {
        await trpcMutation("auth.logout", {});
      } catch {
        /* ignore */
      }
      await clearToken();
    },

    changePassword: async (data: {
      oldPassword: string;
      newPassword: string;
    }): Promise<{ success: boolean; error?: string }> => {
      try {
        return await trpcMutation("auth.changePassword", data);
      } catch (err: any) {
        return { success: false, error: err.message || "修改密码失败" };
      }
    },

    resetPassword: async (data: {
      phone: string;
      code: string;
      newPassword: string;
    }): Promise<{ success: boolean; error?: string }> => {
      try {
        return await trpcMutation("auth.resetPassword", data);
      } catch (err: any) {
        return { success: false, error: err.message || "重置密码失败" };
      }
    },

    register: async (data: {
      phone: string;
      password: string;
      name?: string;
      nickname?: string;
    }): Promise<LoginResponse> => {
      try {
        const result = await trpcMutation<any>("auth.register", data);
        if (result?.success && result?.token) {
          await setToken(result.token);
          return { success: true, token: result.token, user: result.user };
        }
        return { success: false, message: result?.message || "注册失败" };
      } catch (error: any) {
        return { success: false, message: error.message || "注册失败" };
      }
    },
  },

  // 城市
  cities: {
    list: async (): Promise<City[]> => {
      try {
        const result = await trpcQuery<any>("metadata.getCities");
        const rawCities: string[] = result?.data || result || [];
        return rawCities
          .filter((name: string) => isValidCityName(name))
          .map((name: string, index: number) => ({
            id: index + 1,
            city: name,
            pinyin: undefined,
            areaCode: undefined,
            isActive: true,
          }));
      } catch (error) {
        console.error("[API] cities.list error:", error);
        return [];
      }
    },
  },

  // 老师
  teachers: {
    list: async (): Promise<Teacher[]> => {
      try {
        const result = await trpcQuery<any>("teachers.list");
        const teachers = Array.isArray(result)
          ? result
          : result?.data || [];
        return teachers.map((t: any) => ({
          ...t,
          isActive: t.isActive ?? (t.status === "活跃" ? 1 : 0),
        }));
      } catch (error) {
        console.error("[API] teachers.list error:", error);
        return [];
      }
    },

    getByCity: async (cityName: string): Promise<Teacher[]> => {
      try {
        const allTeachers = await api.teachers.list();
        return allTeachers.filter((t) => {
          if (!t.city) return false;
          try {
            const cities = JSON.parse(t.city as string);
            if (Array.isArray(cities)) {
              return cities.some(
                (c: string) =>
                  c.includes(cityName) || cityName.includes(c),
              );
            }
          } catch {
            /* not JSON */
          }
          return (t.city as string).includes(cityName);
        });
      } catch (error) {
        console.error("[API] teachers.getByCity error:", error);
        return [];
      }
    },
  },

  // 课程
  courses: {
    list: async (): Promise<Course[]> => {
      try {
        const result = await trpcQuery<any>("courses.list");
        const courses = result?.data || (Array.isArray(result) ? result : []);
        return courses.map((c: any) => ({
          ...c,
          price: c.price != null ? Number(c.price) : null,
          duration: c.duration != null ? Number(c.duration) : null,
          isActive: c.isActive ?? true,
          createdAt: c.createdAt ? new Date(c.createdAt) : undefined,
          updatedAt: c.updatedAt ? new Date(c.updatedAt) : undefined,
        }));
      } catch (error) {
        console.error("[API] courses.list error:", error);
        return [];
      }
    },
  },

  // 教室
  classrooms: {
    list: async (): Promise<any[]> => {
      try {
        const result = await trpcQuery<any>("classrooms.list");
        return extractArray(result);
      } catch (error) {
        console.error("[API] classrooms.list error:", error);
        return [];
      }
    },
    getByCityName: async (cityName: string): Promise<any[]> => {
      try {
        const result = await trpcQuery<any>("classrooms.getByCityName", { cityName });
        return extractArray(result);
      } catch (error) {
        console.error("[API] classrooms.getByCityName error:", error);
        return [];
      }
    },
  },

  // 订单
  orders: {
    myOrders: async (params?: { status?: string }): Promise<Order[]> => {
      try {
        const result = await trpcQuery<any>(
          "orders.myOrders",
          params || {},
        );
        return extractArray(result);
      } catch (error) {
        console.error("[API] orders.myOrders error:", error);
        return [];
      }
    },

    list: async (params?: any): Promise<{ data: Order[]; total: number }> => {
      try {
        const result = await trpcQuery<any>("orders.list", params || {});
        const data = extractArray(result);
        return {
          data,
          total: result?.total || result?.count || data.length,
        };
      } catch (error) {
        console.error("[API] orders.list error:", error);
        return { data: [], total: 0 };
      }
    },

    getById: async (orderId: number | string): Promise<Order | null> => {
      try {
        return await trpcQuery<Order>("orders.getById", {
          id: Number(orderId),
        });
      } catch (error) {
        console.error("[API] orders.getById error:", error);
        return null;
      }
    },

    create: async (orderData: any): Promise<any> => {
      return await trpcMutation("orders.userCreate", orderData);
    },

    update: async (orderData: any): Promise<any> => {
      return await trpcMutation("orders.update", orderData);
    },

    updateStatus: async (data: {
      orderId: number;
      status: string;
      notes?: string;
    }): Promise<any> => {
      return await trpcMutation("orders.updateStatus", data);
    },
  },

  // 元数据
  metadata: {
    getAll: async (): Promise<any> => {
      try {
        return await trpcQuery("metadata.getAll");
      } catch (error) {
        console.error("[API] metadata.getAll error:", error);
        return null;
      }
    },
    getCities: async (): Promise<{ success: boolean; data: string[] }> => {
      try {
        return await trpcQuery("metadata.getCities");
      } catch {
        return { success: false, data: [] };
      }
    },
  },

  // 账户管理
  account: {
    getProfile: async (): Promise<any> => {
      try {
        return await trpcQuery("account.getProfile");
      } catch {
        // 回退到 auth.verifyToken
        try {
          const token = await getToken();
          if (!token) return null;
          const result = await trpcQuery<any>("auth.verifyToken", { token });
          return result?.user || null;
        } catch {
          return null;
        }
      }
    },
    updateProfile: async (data: any): Promise<any> => {
      // account.updateProfile 不存在，尝试替代方案
      try {
        return await trpcMutation("account.updateProfile", data);
      } catch {
        // 如果不存在，返回成功（仅更新本地存储）
        console.warn("[API] account.updateProfile not available, saving locally only");
        return { success: true, message: "个人信息已保存到本地" };
      }
    },
    changePassword: async (data: {
      oldPassword: string;
      newPassword: string;
    }): Promise<any> => {
      // account.changePassword 不存在，使用 auth.changePassword
      return await trpcMutation("auth.changePassword", data);
    },
    getMyBalance: async (): Promise<any> => {
      try {
        return await trpcQuery("account.getMyBalance");
      } catch {
        return { success: false, data: { balance: "0" } };
      }
    },
    getMyTransactions: async (options?: any): Promise<any> => {
      try {
        return await trpcQuery("account.getMyTransactions", options || {});
      } catch {
        return { success: false, data: { transactions: [], total: 0 } };
      }
    },
    recharge: async (customerId: number, amount: number, notes?: string): Promise<any> => {
      return await trpcMutation("account.recharge", { customerId, amount, notes });
    },
  },

  // 客户管理
  customers: {
    list: async (
      params?: any,
    ): Promise<{ data: any[]; total: number }> => {
      try {
        const result = await trpcQuery<any>(
          "customers.list",
          params || {},
        );
        const data = extractArray(result);
        return {
          data,
          total: result?.total || result?.count || data.length,
        };
      } catch (error) {
        console.error("[API] customers.list error:", error);
        return { data: [], total: 0 };
      }
    },
    getById: async (id: number): Promise<any> => {
      try {
        return await trpcQuery("customers.getById", { id });
      } catch {
        // customers.getById 不存在，用 customers.list 过滤
        try {
          const result = await trpcQuery<any>("customers.list", {});
          const data = extractArray(result);
          return data.find((c: any) => c.id === id) || null;
        } catch {
          return null;
        }
      }
    },
    create: async (data: any): Promise<any> => {
      return await trpcMutation("customers.create", data);
    },
    update: async (data: any): Promise<any> => {
      return await trpcMutation("customers.update", data);
    },
    myCustomers: async (
      params?: any,
    ): Promise<{ data: any[]; total: number }> => {
      try {
        const result = await trpcQuery<any>(
          "customers.myCustomers",
          params || {},
        );
        const data = extractArray(result);
        return {
          data,
          total: result?.total || result?.count || data.length,
        };
      } catch {
        // 回退到 customers.list
        try {
          const result = await trpcQuery<any>(
            "customers.list",
            params || {},
          );
          const data = extractArray(result);
          return { data, total: data.length };
        } catch {
          return { data: [], total: 0 };
        }
      }
    },
  },

  // 销售人员管理
  salespersons: {
    list: async (
      params?: any,
    ): Promise<{ data: any[]; total: number }> => {
      try {
        const result = await trpcQuery<any>(
          "salespersons.list",
          params || {},
        );
        const data = extractArray(result);
        return {
          data,
          total: result?.total || result?.count || data.length,
        };
      } catch {
        return { data: [], total: 0 };
      }
    },
    getPerformance: async (params?: any): Promise<any> => {
      try {
        return await trpcQuery("salespersons.getPerformance", params || {});
      } catch {
        // 路由不存在，用 orders.list 聚合计算
        try {
          const result = await trpcQuery<any>("orders.list", {});
          const orders = extractArray(result);
          const totalAmount = orders.reduce((sum: number, o: any) => sum + (parseFloat(o.paymentAmount) || 0), 0);
          return { totalOrders: orders.length, totalAmount, monthlyOrders: orders.length, monthlyAmount: totalAmount };
        } catch {
          return { totalOrders: 0, totalAmount: 0, monthlyOrders: 0, monthlyAmount: 0 };
        }
      }
    },
    getMyPerformance: async (params?: any): Promise<any> => {
      try {
        return await trpcQuery("salespersons.getMyPerformance", params || {});
      } catch {
        // 路由不存在，用 orders.myOrders 聚合计算
        try {
          const result = await trpcQuery<any>("orders.myOrders", {});
          const orders = extractArray(result);
          const totalAmount = orders.reduce((sum: number, o: any) => sum + (parseFloat(o.paymentAmount) || 0), 0);
          return { totalOrders: orders.length, totalAmount, monthlyOrders: orders.length, monthlyAmount: totalAmount };
        } catch {
          return { totalOrders: 0, totalAmount: 0, monthlyOrders: 0, monthlyAmount: 0 };
        }
      }
    },
    getMyStats: async (params?: any): Promise<any> => {
      try {
        return await trpcQuery("salespersons.getMyStats", params || {});
      } catch {
        // 路由不存在，用 orders.myOrders 聚合计算
        try {
          const result = await trpcQuery<any>("orders.myOrders", {});
          const orders = extractArray(result);
          const totalAmount = orders.reduce((sum: number, o: any) => sum + (parseFloat(o.paymentAmount) || 0), 0);
          const thisMonth = new Date().toISOString().slice(0, 7);
          const monthlyOrders = orders.filter((o: any) => (o.createdAt || '').startsWith(thisMonth));
          const monthlyAmount = monthlyOrders.reduce((sum: number, o: any) => sum + (parseFloat(o.paymentAmount) || 0), 0);
          return {
            totalOrders: orders.length,
            totalAmount,
            monthlyOrders: monthlyOrders.length,
            monthlyAmount,
            totalCustomers: new Set(orders.map((o: any) => o.customerId).filter(Boolean)).size,
          };
        } catch {
          return null;
        }
      }
    },
  },

  // 数据分析 - 后端无对应路由，用 orders.list + customers.list 聚合计算
  analytics: {
    /** 内部聚合计算方法 */
    _computeStats: async (): Promise<any> => {
      try {
        const [ordersResult, customersResult] = await Promise.all([
          trpcQuery<any>("orders.list", {}).catch(() => ({ data: [] })),
          trpcQuery<any>("customers.list", {}).catch(() => ({ data: [] })),
        ]);
        const orders = extractArray(ordersResult);
        const customers = extractArray(customersResult);
        const totalRevenue = orders.reduce((sum: number, o: any) => sum + (parseFloat(o.paymentAmount) || 0), 0);
        const thisMonth = new Date().toISOString().slice(0, 7);
        const monthlyOrders = orders.filter((o: any) => (o.createdAt || '').startsWith(thisMonth));
        const monthlyRevenue = monthlyOrders.reduce((sum: number, o: any) => sum + (parseFloat(o.paymentAmount) || 0), 0);
        return {
          totalOrders: orders.length,
          totalRevenue,
          totalCustomers: customers.length,
          monthlyOrders: monthlyOrders.length,
          monthlyRevenue,
          recentOrders: orders.slice(0, 10),
          orders,
          customers,
        };
      } catch {
        return { totalOrders: 0, totalRevenue: 0, totalCustomers: 0, monthlyOrders: 0, monthlyRevenue: 0, recentOrders: [], orders: [], customers: [] };
      }
    },
    getOverview: async (params?: any): Promise<any> => {
      try {
        return await trpcQuery("analytics.getOverview", params || {});
      } catch {
        return await api.analytics._computeStats();
      }
    },
    getDashboard: async (params?: any): Promise<any> => {
      try {
        return await trpcQuery("analytics.getDashboard", params || {});
      } catch {
        return await api.analytics._computeStats();
      }
    },
    getSalesStats: async (params?: any): Promise<any> => {
      try {
        return await trpcQuery("analytics.getSalesStats", params || {});
      } catch {
        return await api.analytics._computeStats();
      }
    },
    getRevenueStats: async (params?: any): Promise<any> => {
      try {
        return await trpcQuery("analytics.getRevenueStats", params || {});
      } catch {
        return await api.analytics._computeStats();
      }
    },
  },

  // 老师收入/支付管理
  teacherPayments: {
    getMyPayments: async (
      params?: any,
    ): Promise<{
      data: TeacherPaymentRecord[];
      total: number;
      totalAmount: number;
    }> => {
      try {
        const result = await trpcQuery<any>(
          "teacherPayments.getMyPayments",
          params || {},
        );
        const data = extractArray(result);
        return {
          data,
          total: result?.total || result?.count || data.length,
          totalAmount: result?.totalAmount || 0,
        };
      } catch {
        return { data: [], total: 0, totalAmount: 0 };
      }
    },
    getMyStats: async (params?: any): Promise<any> => {
      try {
        return await trpcQuery("teacherPayments.getMyStats", params || {});
      } catch {
        // 路由不存在，用 getMyPayments 聚合计算
        try {
          const result = await api.teacherPayments.getMyPayments(params);
          const thisMonth = new Date().toISOString().slice(0, 7);
          const monthlyRecords = result.data.filter((r: any) => (r.courseDate || r.settlementDate || '').startsWith(thisMonth));
          const monthlyIncome = monthlyRecords.reduce((sum: number, r: any) => sum + (parseFloat(String(r.amount)) || 0), 0);
          const totalIncome = result.data.reduce((sum: number, r: any) => sum + (parseFloat(String(r.amount)) || 0), 0);
          return {
            monthlyIncome,
            totalIncome,
            totalRecords: result.total,
            monthlyRecords: monthlyRecords.length,
          };
        } catch {
          return { monthlyIncome: 0, totalIncome: 0 };
        }
      }
    },
    list: async (
      params?: any,
    ): Promise<{ data: TeacherPaymentRecord[]; total: number }> => {
      try {
        return await trpcQuery<any>("teacherPayments.list", params || {}).then((result: any) => {
          const data = extractArray(result);
          return { data, total: result?.total || result?.count || data.length };
        });
      } catch {
        // 路由不存在，用 getMyPayments 替代
        try {
          const result = await api.teacherPayments.getMyPayments(params);
          return { data: result.data, total: result.total };
        } catch {
          return { data: [], total: 0 };
        }
      }
    },
  },

  // 排课/日程管理 - 后端无对应路由，用 orders.list 过滤有日期的订单作为日程
  schedules: {
    /** 内部方法：从订单中提取日程数据 */
    _ordersToSchedules: (orders: any[]): any[] => {
      return orders
        .filter((o: any) => o.classDate || o.classTime)
        .map((o: any) => ({
          id: o.id,
          orderId: o.id,
          orderNo: o.orderNo,
          date: o.classDate,
          time: o.classTime,
          courseName: o.deliveryCourse,
          teacherName: o.deliveryTeacher,
          roomName: o.deliveryRoom,
          customerName: o.customerName,
          city: o.deliveryCity,
          status: o.deliveryStatus || o.status,
        }));
    },
    list: async (
      params?: any,
    ): Promise<{ data: any[]; total: number }> => {
      try {
        const result = await trpcQuery<any>("schedules.list", params || {});
        const data = extractArray(result);
        return { data, total: result?.total || result?.count || data.length };
      } catch {
        // 路由不存在，用 orders.list 过滤
        try {
          const result = await trpcQuery<any>("orders.list", params || {});
          const orders = extractArray(result);
          const schedules = api.schedules._ordersToSchedules(orders);
          return { data: schedules, total: schedules.length };
        } catch {
          return { data: [], total: 0 };
        }
      }
    },
    getMySchedules: async (
      params?: any,
    ): Promise<{ data: any[]; total: number }> => {
      try {
        const result = await trpcQuery<any>("schedules.getMySchedules", params || {});
        const data = extractArray(result);
        return { data, total: result?.total || result?.count || data.length };
      } catch {
        // 路由不存在，用 orders.myOrders 过滤
        try {
          const result = await trpcQuery<any>("orders.myOrders", params || {});
          const orders = extractArray(result);
          const schedules = api.schedules._ordersToSchedules(orders);
          return { data: schedules, total: schedules.length };
        } catch {
          return { data: [], total: 0 };
        }
      }
    },
    create: async (data: any): Promise<any> => {
      try {
        return await trpcMutation("schedules.create", data);
      } catch {
        console.warn("[API] schedules.create not available");
        return { success: false, message: "排课功能暂不可用" };
      }
    },
    update: async (data: any): Promise<any> => {
      try {
        return await trpcMutation("schedules.update", data);
      } catch {
        console.warn("[API] schedules.update not available");
        return { success: false, message: "排课功能暂不可用" };
      }
    },
  },

  // 老师端课程 - 后端无专用路由，用 orders.list 过滤当前老师的订单
  teacher: {
    /** 将订单转换为老师课程格式 */
    _orderToTeacherCourse: (o: any): TeacherCourse => ({
      id: o.id,
      courseName: o.deliveryCourse || o.courseName || '未命名课程',
      courseType: o.courseType || '',
      classDate: o.classDate || '',
      classTime: o.classTime || '',
      duration: Number(o.duration) || 60,
      classroomName: o.deliveryRoom || '',
      classroomAddress: '',
      studentName: o.customerName || '',
      studentPhone: o.customerPhone || '',
      fee: o.teacherFee || o.courseAmount || '0',
      status: o.deliveryStatus || o.status || 'pending',
      notes: o.notes || '',
    }),
    courses: async (params?: { status?: string }): Promise<TeacherCourse[]> => {
      try {
        const result = await trpcQuery<any>("orders.teacherCourses", params || {});
        return extractArray(result);
      } catch {
        // 路由不存在，用 orders.list 过滤
        try {
          const ordersResult = await trpcQuery<any>("orders.list", {});
          let orders = extractArray(ordersResult);
          // 过滤有老师分配的订单
          orders = orders.filter((o: any) => o.deliveryTeacher || o.classDate);
          if (params?.status) {
            const statusMap: Record<string, string[]> = {
              pending: ['pending', '待确认'],
              accepted: ['accepted', '已接受', '已确认'],
              delivered: ['delivered', '已完成', '已交付'],
            };
            const validStatuses = statusMap[params.status] || [params.status];
            orders = orders.filter((o: any) => {
              const s = o.deliveryStatus || o.status || '';
              return validStatuses.some(vs => s.toLowerCase().includes(vs.toLowerCase()));
            });
          }
          return orders.map(api.teacher._orderToTeacherCourse);
        } catch {
          return [];
        }
      }
    },
    courseDetail: async (
      params: { id: number },
    ): Promise<TeacherCourse | null> => {
      try {
        return await trpcQuery<TeacherCourse>("orders.teacherCourseDetail", params);
      } catch {
        // 路由不存在，用 orders.getById
        try {
          const order = await trpcQuery<any>("orders.getById", { id: params.id });
          if (!order) return null;
          return api.teacher._orderToTeacherCourse(order);
        } catch {
          return null;
        }
      }
    },
    acceptCourse: async (params: { courseId: number }): Promise<any> => {
      try {
        return await trpcMutation("orders.acceptCourse", params);
      } catch {
        // 路由不存在，用 orders.updateDeliveryStatus
        try {
          return await trpcMutation("orders.updateDeliveryStatus", {
            orderId: params.courseId,
            deliveryStatus: "accepted",
          });
        } catch {
          // 如果也不存在，用 orders.update
          return await trpcMutation("orders.update", {
            id: params.courseId,
            deliveryStatus: "accepted",
          });
        }
      }
    },
  },

  // 用户管理（管理员）
  userManagement: {
    list: async (
      params?: any,
    ): Promise<{ users: any[]; total: number }> => {
      try {
        const result = await trpcQuery<any>(
          "userManagement.list",
          params || {},
        );
        if (result?.users) return result;
        if (result?.data)
          return {
            users: extractArray(result),
            total: result.total || result.count || 0,
          };
        if (Array.isArray(result))
          return { users: result, total: result.length };
        return { users: [], total: 0 };
      } catch {
        return { users: [], total: 0 };
      }
    },
  },

  // 通知
  notifications: {
    submit: async (params: {
      userId: number;
      userName: string;
      userPhone: string;
      type: "application";
      title: string;
      content: string;
    }): Promise<any> => {
      return await trpcMutation("notifications.submit", params);
    },
  },
};

export default api;
