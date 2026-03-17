/**
 * 共享类型定义
 * 从旧的 api-client.ts 迁移过来的类型
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
  userId: number;            // 关联的用户ID
  name: string;              // 从 users 表同步
  nickname: string | null;   // 从 users 表同步
  phone: string | null;      // 从 users 表同步
  avatarUrl: string | null;  // 头像URL
  status: string;            // "活跃" | "不激活"
  category: string | null;   // 分类（本部老师/合伙店老师）
  city: string | null;       // 城市（JSON数组字符串）
  customerType: string | null;  // 受众客户类型
  notes: string | null;      // 备注
  aliases: string | null;    // 别名（逗号分隔）
  contractEndDate: Date | null;  // 合同到期时间
  joinDate: Date | null;     // 入职时间
  // 统计数据
  classCount: number;        // 授课次数
  totalHours: number;        // 总课时
  totalIncome: number;       // 总收入
  // 兼容旧字段
  isActive: boolean;         // 根据 status 计算：status === "活跃"
  email?: string;            // 兼容旧代码
  wechat?: string;           // 兼容旧代码
  hourlyRate?: number;       // 兼容旧代码
  bankAccount?: string;      // 兼容旧代码
  bankName?: string;         // 兼容旧代码
}

// 课程类型
export interface Course {
  id: number;
  name: string;
  description: string | null;
  price: number | null;
  duration: number | null;
  level: string | null;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

// 订单类型
export interface Order {
  id: number;
  orderNo: string;
  salesId: number;
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
  // 交付状态相关字段
  deliveryStatus?: "pending" | "accepted" | "delivered" | null;  // 交付状态
  acceptedBy?: number | null;      // 接单老师ID（users表的用户ID）
  acceptedAt?: Date | null;        // 接单时间
  classDate?: Date | null;         // 上课日期
  classTime?: string | null;       // 上课时间
}

// 用户类型
export interface User {
  id: number;
  openId: string;
  name: string;
  nickname: string | null;
  email: string | null;
  phone: string | null;
  role: string;              // 主要角色（兼容旧字段）
  roles: string;             // 多角色，逗号分隔，如 "teacher,cityPartner"
  isActive: boolean;
  createdAt: Date;
  lastSignedIn: Date | null;
}

// 预约类型
export interface Booking {
  id: number;
  cityName: string;
  teacherId: number;
  teacherName: string;
  courseName: string;
  coursePrice: string;
  bookingDate: string;
  bookingTime: string;
  status: string;
  createdAt: string;
}
