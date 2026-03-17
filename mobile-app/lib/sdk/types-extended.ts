/**
 * 扩展类型定义
 * 
 * 补充 SDK 中缺失的类型，统一类型引用
 */

// 城市类型
export interface City {
  id: number;
  city: string;
  pinyin?: string;
  areaCode?: string;
  isActive: boolean;
}

// 老师类型
export interface Teacher {
  id: number;
  name: string;
  teacherName?: string;
  phone?: string;
  city?: string;
  customerType?: string;
  notes?: string;
  avatarUrl?: string;
  isActive?: boolean;
  status?: string;
  specialties?: string[];
  courses?: Array<{ name: string } | string>;
}

// 课程类型
export interface Course {
  id: number;
  name: string;
  price: number;
  duration?: number;
  description?: string;
  level?: string;
  isActive: boolean;
  category?: string;
}

// 订单类型
export interface Order {
  id: number;
  orderNo: string;
  status: string;
  totalAmount: number | string;
  courseName?: string;
  teacherName?: string;
  city?: string;
  classDate?: string;
  classTime?: string;
  createdAt?: string;
  updatedAt?: string;
  customerName?: string;
  customerPhone?: string;
  paymentMethod?: string;
  deliveryStatus?: string;
  notes?: string;
}

// 用户类型
export interface User {
  id: number;
  openId?: string;
  name: string;
  phone?: string;
  role: string;
  roles?: string;
  balance?: number | string;
  city?: string;
  status?: string;
  createdAt?: string;
}

// 客户类型
export interface Customer {
  id: number;
  name?: string;
  customerName?: string;
  phone?: string;
  customerPhone?: string;
  city?: string;
  balance?: string;
  totalAmount?: string;
  createdAt?: string;
}

// 老师收入统计
export interface TeacherIncomeStats {
  totalIncome: number;
  monthlyIncome: number;
  totalCourses: number;
  monthlyCourses: number;
  monthlyData: Array<{
    month: string;
    income: number;
    courses: number;
  }>;
}

// 老师收入明细
export interface TeacherPaymentRecord {
  id: number;
  orderId: number;
  orderNo?: string;
  amount: number;
  courseName?: string;
  studentName?: string;
  classDate?: string;
  status?: string;
  createdAt?: string;
}

// 登录响应
export interface LoginResponse {
  success: boolean;
  token?: string;
  user?: User;
  message?: string;
  error?: string;
}

// 分页响应
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
}

// 列表查询参数
export interface ListQueryParams {
  search?: string;
  limit?: number;
  offset?: number;
  status?: string;
}
