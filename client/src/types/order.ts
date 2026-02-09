/**
 * 订单相关类型定义
 * 与后端 drizzle/schema.ts 中的 orders 表保持一致
 */

export type OrderStatus = "pending" | "paid" | "completed" | "cancelled" | "refunded";
export type DeliveryStatus = "pending" | "accepted" | "delivered";

/**
 * 订单完整类型定义
 */
export interface Order {
  id: number;
  orderNo: string;
  customerId?: number | null;
  customerName?: string | null;
  salespersonId?: number | null;
  salesId: number;
  salesPerson?: string | null;
  trafficSource?: string | null;
  
  // 金额相关
  paymentAmount: string | number;  // decimal in DB
  courseAmount: string | number;  // decimal in DB
  accountBalance: string | number;  // decimal in DB
  
  // 支付信息
  paymentCity?: string | null;
  paymentChannel?: string | null;
  channelOrderNo?: string | null;
  paymentDate?: Date | string | null;
  paymentTime?: string | null;
  
  // 费用明细
  teacherFee: string | number;  // decimal in DB
  transportFee: string | number;  // decimal in DB
  partnerFee: string | number;  // decimal in DB
  consumablesFee: string | number;  // decimal in DB
  rentFee: string | number;  // decimal in DB
  propertyFee: string | number;  // decimal in DB
  utilityFee: string | number;  // decimal in DB
  otherFee: string | number;  // decimal in DB
  finalAmount: string | number;  // decimal in DB
  
  // 交付信息
  deliveryCity?: string | null;
  deliveryRoom?: string | null;
  deliveryClassroomId?: number | null;
  deliveryTeacher?: string | null;
  deliveryCourse?: string | null;
  classDate?: Date | string | null;
  classTime?: string | null;
  
  // 状态相关
  status: OrderStatus;
  deliveryStatus: DeliveryStatus;
  acceptedAt?: Date | string | null;  // 接单时间
  acceptedBy?: number | null;  // 接单老师ID(关联users表)
  isVoided: boolean;
  notes?: string | null;
  
  // 结构化备注字段
  noteTags?: string | null;  // JSON数组
  discountInfo?: string | null;  // JSON对象
  couponInfo?: string | null;  // JSON对象
  membershipInfo?: string | null;  // JSON对象
  paymentStatus?: string | null;
  specialNotes?: string | null;
  
  // 时间戳
  createdAt: Date | string;
  updatedAt: Date | string;
}

/**
 * 更新订单交付状态参数
 */
export interface UpdateOrderDeliveryStatusParams {
  id: number;
  deliveryStatus: DeliveryStatus;
}

/**
 * 更新订单字段参数（通用）
 */
export interface UpdateOrderFieldsParams {
  id: number;
  data: {
    status?: OrderStatus;
    deliveryStatus?: DeliveryStatus;
    deliveryTeacher?: string;
    deliveryCity?: string;
    deliveryRoom?: string;
    deliveryCourse?: string;
    classDate?: Date | string;
    classTime?: string;
  };
}

/**
 * 订单列表查询参数
 */
export interface OrderListParams {
  page?: number;
  pageSize?: number;
  status?: OrderStatus;
  deliveryStatus?: DeliveryStatus;
  startDate?: string;
  endDate?: string;
  keyword?: string;
}

/**
 * 订单统计数据
 */
export interface OrderStats {
  totalOrders: number;
  totalAmount: string | number;
  pendingOrders: number;
  completedOrders: number;
}

/**
 * 交付状态显示文本映射
 */
export const DELIVERY_STATUS_TEXT: Record<DeliveryStatus, string> = {
  pending: "待接单",
  accepted: "已接单",
  delivered: "已交付",
};

/**
 * 订单状态显示文本映射
 */
export const ORDER_STATUS_TEXT: Record<OrderStatus, string> = {
  pending: "待支付",
  paid: "已支付",
  completed: "已完成",
  cancelled: "已取消",
  refunded: "已退款",
};

/**
 * 交付状态颜色映射（Tailwind CSS类名）
 */
export const DELIVERY_STATUS_COLOR: Record<DeliveryStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  accepted: "bg-blue-100 text-blue-800",
  delivered: "bg-green-100 text-green-800",
};

/**
 * 订单状态颜色映射（Tailwind CSS类名）
 */
export const ORDER_STATUS_COLOR: Record<OrderStatus, string> = {
  pending: "bg-gray-100 text-gray-800",
  paid: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
  refunded: "bg-orange-100 text-orange-800",
};
