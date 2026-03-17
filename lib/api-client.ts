import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

// ==================== 配置 ====================
const EXTERNAL_API_URL = "https://crm.bdsm.com.cn";

// Web端代理服务器地址推导
const getProxyBaseUrl = () => {
  if (typeof window !== "undefined" && window.location) {
    const origin = window.location.origin;
    // 将前端端口替换为代理端口3000
    let apiUrl = origin;
    if (apiUrl.includes("://8081-")) {
      apiUrl = apiUrl.replace("://8081-", "://3000-");
    } else if (apiUrl.match(/:8081(\/|$)/)) {
      apiUrl = apiUrl.replace(/:8081/, ":3000");
    }
    return apiUrl;
  }
  return "http://localhost:3000";
};

// API基础URL：Web端走代理，移动端直连
const getApiBaseUrl = () => {
  if (Platform.OS === "web") {
    return `${getProxyBaseUrl()}/api/proxy`;
  }
  return EXTERNAL_API_URL;
};

const API_BASE = getApiBaseUrl();

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
  isActive: boolean;
  email?: string;
  wechat?: string;
  hourlyRate?: number;
  bankAccount?: string;
  bankName?: string;
}

export interface Course {
  id: number;
  name: string;
  introduction?: string | null;
  description: string | null;
  price: number | null;
  duration: number | null;
  level: string | null;
  isActive: boolean;
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

// tRPC query (GET)
async function trpcQuery<T>(procedure: string, input?: any): Promise<T> {
  let url = `${API_BASE}/api/trpc/${procedure}`;
  const params = new URLSearchParams();
  if (input !== undefined) {
    params.set("input", JSON.stringify({ json: input }));
  }
  // 附加token到URL参数（绕过Cloudflare header过滤）
  const token = await getToken();
  if (token) {
    params.set("token", token);
  }
  const qs = params.toString();
  if (qs) url += `?${qs}`;

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const resp = await fetch(url, { method: "GET", headers, credentials: "include" });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    const msg = err?.error?.json?.message || err?.error?.message || `Request failed: ${resp.status}`;
    throw new Error(msg);
  }
  const data = await resp.json();
  return data?.result?.data?.json as T;
}

// tRPC mutation (POST)
async function trpcMutation<T>(procedure: string, input: any): Promise<T> {
  let url = `${API_BASE}/api/trpc/${procedure}`;
  const token = await getToken();
  if (token) {
    url += `?token=${encodeURIComponent(token)}`;
  }

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const resp = await fetch(url, {
    method: "POST",
    headers,
    credentials: "include",
    body: JSON.stringify({ json: input }),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    const msg = err?.error?.json?.message || err?.error?.message || `Request failed: ${resp.status}`;
    throw new Error(msg);
  }
  const data = await resp.json();
  return data?.result?.data?.json as T;
}

// ==================== 城市名称过滤 ====================
const VALID_CITY_NAMES = [
  "北京", "上海", "广州", "深圳", "成都", "重庆", "杭州", "武汉",
  "南京", "长沙", "西安", "苏州", "天津", "郑州", "青岛", "大连",
  "厦门", "宁波", "合肥", "福州", "济南", "昆明", "贵阳", "南宁",
  "海口", "三亚", "珠海", "东莞", "佛山", "无锡", "常州", "温州",
  "安徽", "北京巡游", "重庆教室", "测试城市",
];

function isValidCityName(name: string): boolean {
  if (!name || name.length > 10) return false;
  if (name.includes("http") || name.includes("://") || name.includes("\n")) return false;
  if (name.includes("会议室") || name.includes("点击") || name.includes("链接")) return false;
  if (/^\d+$/.test(name)) return false;
  // 只保留中文字符组成的城市名
  return /^[\u4e00-\u9fa5]{1,10}$/.test(name) || VALID_CITY_NAMES.includes(name);
}

// ==================== API客户端 ====================
export const api = {
  // 认证
  auth: {
    login: async (username: string, password: string): Promise<LoginResponse> => {
      try {
        console.log("[API] Login:", { username, api: API_BASE });
        const result = await trpcMutation<any>("auth.login", { username, password });
        console.log("[API] Login result:", result);
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

    logout: async (): Promise<void> => {
      try {
        await trpcMutation("auth.logout", {});
      } catch {}
      await clearToken();
    },
  },

  // 城市
  cities: {
    list: async (): Promise<City[]> => {
      try {
        const result = await trpcQuery<any>("metadata.getCities");
        // 后端返回 { success, data: string[], count }
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
        // 后端返回 Teacher[] 直接数组
        const teachers = Array.isArray(result) ? result : (result?.data || []);
        return teachers.map((t: any) => ({
          ...t,
          isActive: t.isActive ?? (t.status === "活跃"),
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
          // city字段可能是JSON数组字符串或普通字符串
          try {
            const cities = JSON.parse(t.city as string);
            if (Array.isArray(cities)) {
              return cities.some((c: string) => c.includes(cityName) || cityName.includes(c));
            }
          } catch {}
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
        // 后端返回 { success, data: Course[], count }
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

  // 订单
  orders: {
    myOrders: async (params?: { status?: string }): Promise<Order[]> => {
      try {
        const result = await trpcQuery<any>("orders.myOrders", params || {});
        return result?.data || (Array.isArray(result) ? result : []);
      } catch (error) {
        console.error("[API] orders.myOrders error:", error);
        return [];
      }
    },

    list: async (params?: any): Promise<{ data: Order[]; total: number }> => {
      try {
        const result = await trpcQuery<any>("orders.list", params || {});
        const data = result?.data || (Array.isArray(result) ? result : []);
        return { data, total: result?.total || result?.count || data.length };
      } catch (error) {
        console.error("[API] orders.list error:", error);
        return { data: [], total: 0 };
      }
    },

    getById: async (orderId: number | string): Promise<Order | null> => {
      try {
        return await trpcQuery<Order>("orders.getById", { id: Number(orderId) });
      } catch (error) {
        console.error("[API] orders.getById error:", error);
        return null;
      }
    },

    create: async (orderData: any): Promise<any> => {
      try {
        return await trpcMutation("orders.userCreate", orderData);
      } catch (error: any) {
        console.error("[API] orders.create error:", error);
        throw error;
      }
    },

    update: async (orderData: any): Promise<any> => {
      try {
        return await trpcMutation("orders.update", orderData);
      } catch (error: any) {
        console.error("[API] orders.update error:", error);
        throw error;
      }
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
  },

  // ==================== 新增 API 模块 ====================

  // 账户管理
  account: {
    /** 获取当前用户信息 */
    getProfile: async (): Promise<any> => {
      try {
        return await trpcQuery("account.getProfile");
      } catch (error) {
        console.error("[API] account.getProfile error:", error);
        return null;
      }
    },
    /** 更新用户信息 */
    updateProfile: async (data: any): Promise<any> => {
      try {
        return await trpcMutation("account.updateProfile", data);
      } catch (error: any) {
        console.error("[API] account.updateProfile error:", error);
        throw error;
      }
    },
    /** 修改密码 */
    changePassword: async (data: { oldPassword: string; newPassword: string }): Promise<any> => {
      try {
        return await trpcMutation("account.changePassword", data);
      } catch (error: any) {
        console.error("[API] account.changePassword error:", error);
        throw error;
      }
    },
  },

  // 客户管理
  customers: {
    /** 获取客户列表 */
    list: async (params?: any): Promise<{ data: any[]; total: number }> => {
      try {
        const result = await trpcQuery<any>("customers.list", params || {});
        const data = result?.data || (Array.isArray(result) ? result : []);
        return { data, total: result?.total || result?.count || data.length };
      } catch (error) {
        console.error("[API] customers.list error:", error);
        return { data: [], total: 0 };
      }
    },
    /** 获取客户详情 */
    getById: async (id: number): Promise<any> => {
      try {
        return await trpcQuery("customers.getById", { id });
      } catch (error) {
        console.error("[API] customers.getById error:", error);
        return null;
      }
    },
    /** 创建客户 */
    create: async (data: any): Promise<any> => {
      try {
        return await trpcMutation("customers.create", data);
      } catch (error: any) {
        console.error("[API] customers.create error:", error);
        throw error;
      }
    },
    /** 更新客户 */
    update: async (data: any): Promise<any> => {
      try {
        return await trpcMutation("customers.update", data);
      } catch (error: any) {
        console.error("[API] customers.update error:", error);
        throw error;
      }
    },
    /** 获取我的客户列表（销售用） */
    myCustomers: async (params?: any): Promise<{ data: any[]; total: number }> => {
      try {
        const result = await trpcQuery<any>("customers.myCustomers", params || {});
        const data = result?.data || (Array.isArray(result) ? result : []);
        return { data, total: result?.total || result?.count || data.length };
      } catch (error) {
        console.error("[API] customers.myCustomers error:", error);
        return { data: [], total: 0 };
      }
    },
  },

  // 销售人员管理
  salespersons: {
    /** 获取销售人员列表 */
    list: async (params?: any): Promise<{ data: any[]; total: number }> => {
      try {
        const result = await trpcQuery<any>("salespersons.list", params || {});
        const data = result?.data || (Array.isArray(result) ? result : []);
        return { data, total: result?.total || result?.count || data.length };
      } catch (error) {
        console.error("[API] salespersons.list error:", error);
        return { data: [], total: 0 };
      }
    },
    /** 获取销售业绩 */
    getPerformance: async (params?: any): Promise<any> => {
      try {
        return await trpcQuery("salespersons.getPerformance", params || {});
      } catch (error) {
        console.error("[API] salespersons.getPerformance error:", error);
        return null;
      }
    },
    /** 获取我的销售业绩 */
    getMyPerformance: async (params?: any): Promise<any> => {
      try {
        return await trpcQuery("salespersons.getMyPerformance", params || {});
      } catch (error) {
        console.error("[API] salespersons.getMyPerformance error:", error);
        return null;
      }
    },
    /** 获取我的销售统计 */
    getMyStats: async (params?: any): Promise<any> => {
      try {
        return await trpcQuery("salespersons.getMyStats", params || {});
      } catch (error) {
        console.error("[API] salespersons.getMyStats error:", error);
        return null;
      }
    },
  },

  // 数据分析
  analytics: {
    /** 获取总览统计 */
    getOverview: async (params?: any): Promise<any> => {
      try {
        return await trpcQuery("analytics.getOverview", params || {});
      } catch (error) {
        console.error("[API] analytics.getOverview error:", error);
        return null;
      }
    },
    /** 获取管理员仪表盘数据 */
    getDashboard: async (params?: any): Promise<any> => {
      try {
        return await trpcQuery("analytics.getDashboard", params || {});
      } catch (error) {
        console.error("[API] analytics.getDashboard error:", error);
        return null;
      }
    },
    /** 获取销售统计 */
    getSalesStats: async (params?: any): Promise<any> => {
      try {
        return await trpcQuery("analytics.getSalesStats", params || {});
      } catch (error) {
        console.error("[API] analytics.getSalesStats error:", error);
        return null;
      }
    },
    /** 获取收入统计 */
    getRevenueStats: async (params?: any): Promise<any> => {
      try {
        return await trpcQuery("analytics.getRevenueStats", params || {});
      } catch (error) {
        console.error("[API] analytics.getRevenueStats error:", error);
        return null;
      }
    },
  },

  // 老师收入/支付管理
  teacherPayments: {
    /** 获取我的收入记录 */
    getMyPayments: async (params?: any): Promise<{ data: TeacherPaymentRecord[]; total: number; totalAmount: number }> => {
      try {
        const result = await trpcQuery<any>("teacherPayments.getMyPayments", params || {});
        const data = result?.data || (Array.isArray(result) ? result : []);
        return {
          data,
          total: result?.total || result?.count || data.length,
          totalAmount: result?.totalAmount || 0,
        };
      } catch (error) {
        console.error("[API] teacherPayments.getMyPayments error:", error);
        return { data: [], total: 0, totalAmount: 0 };
      }
    },
    /** 获取收入统计 */
    getMyStats: async (params?: any): Promise<any> => {
      try {
        return await trpcQuery("teacherPayments.getMyStats", params || {});
      } catch (error) {
        console.error("[API] teacherPayments.getMyStats error:", error);
        return { monthlyIncome: 0, totalIncome: 0 };
      }
    },
    /** 获取收入列表（管理员用） */
    list: async (params?: any): Promise<{ data: TeacherPaymentRecord[]; total: number }> => {
      try {
        const result = await trpcQuery<any>("teacherPayments.list", params || {});
        const data = result?.data || (Array.isArray(result) ? result : []);
        return { data, total: result?.total || result?.count || data.length };
      } catch (error) {
        console.error("[API] teacherPayments.list error:", error);
        return { data: [], total: 0 };
      }
    },
  },

  // 排课/日程管理
  schedules: {
    /** 获取排课列表 */
    list: async (params?: any): Promise<{ data: any[]; total: number }> => {
      try {
        const result = await trpcQuery<any>("schedules.list", params || {});
        const data = result?.data || (Array.isArray(result) ? result : []);
        return { data, total: result?.total || result?.count || data.length };
      } catch (error) {
        console.error("[API] schedules.list error:", error);
        return { data: [], total: 0 };
      }
    },
    /** 获取我的排课（老师用） */
    getMySchedules: async (params?: any): Promise<{ data: any[]; total: number }> => {
      try {
        const result = await trpcQuery<any>("schedules.getMySchedules", params || {});
        const data = result?.data || (Array.isArray(result) ? result : []);
        return { data, total: result?.total || result?.count || data.length };
      } catch (error) {
        console.error("[API] schedules.getMySchedules error:", error);
        return { data: [], total: 0 };
      }
    },
    /** 创建排课 */
    create: async (data: any): Promise<any> => {
      try {
        return await trpcMutation("schedules.create", data);
      } catch (error: any) {
        console.error("[API] schedules.create error:", error);
        throw error;
      }
    },
    /** 更新排课 */
    update: async (data: any): Promise<any> => {
      try {
        return await trpcMutation("schedules.update", data);
      } catch (error: any) {
        console.error("[API] schedules.update error:", error);
        throw error;
      }
    },
  },

  // 老师端课程（从订单中提取老师相关的课程）
  teacher: {
    /** 获取老师的课程列表（按状态筛选） */
    courses: async (params?: { status?: string }): Promise<TeacherCourse[]> => {
      try {
        const result = await trpcQuery<any>("orders.teacherCourses", params || {});
        const data = result?.data || (Array.isArray(result) ? result : []);
        return data;
      } catch (error) {
        console.error("[API] teacher.courses error:", error);
        return [];
      }
    },
    /** 获取课程详情 */
    courseDetail: async (params: { id: number }): Promise<TeacherCourse | null> => {
      try {
        const result = await trpcQuery<any>("orders.teacherCourseDetail", params);
        return result || null;
      } catch (error) {
        console.error("[API] teacher.courseDetail error:", error);
        return null;
      }
    },
    /** 接单 */
    acceptCourse: async (params: { courseId: number }): Promise<any> => {
      try {
        return await trpcMutation("orders.acceptCourse", params);
      } catch (error: any) {
        console.error("[API] teacher.acceptCourse error:", error);
        throw error;
      }
    },
  },
};

export default api;
