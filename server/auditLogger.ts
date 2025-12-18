import { getDb } from "./db";
import { auditLogs } from "../drizzle/schema";

export type AuditAction = 
  | "order_create"
  | "order_update"
  | "order_delete"
  | "user_create"
  | "user_role_update"
  | "user_status_update"
  | "user_delete"
  | "data_import"
  | "customer_create"
  | "customer_update"
  | "customer_delete"
  | "teacher_create"
  | "teacher_update"
  | "teacher_delete"
  | "schedule_create"
  | "schedule_update"
  | "schedule_delete";

export interface AuditLogParams {
  action: AuditAction;
  userId: number;
  userName?: string;
  userRole?: string;
  targetType?: string;
  targetId?: number;
  targetName?: string;
  description: string;
  changes?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * 记录操作日志
 */
export async function logAudit(params: AuditLogParams): Promise<void> {
  try {
    const db = await getDb();
    if (!db) {
      console.error("[AuditLogger] Database connection failed");
      return;
    }

    await db.insert(auditLogs).values({
      action: params.action,
      userId: params.userId,
      userName: params.userName,
      userRole: params.userRole,
      targetType: params.targetType,
      targetId: params.targetId,
      targetName: params.targetName,
      description: params.description,
      changes: params.changes,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });

    console.log(`[AuditLogger] ${params.action} by user ${params.userId}: ${params.description}`);
  } catch (error) {
    console.error("[AuditLogger] Failed to log audit:", error);
    // 不抛出错误,避免影响主业务流程
  }
}

/**
 * 从请求中提取IP地址和User-Agent
 */
export function extractRequestInfo(req: any): { ipAddress?: string; userAgent?: string } {
  return {
    ipAddress: req?.ip || req?.headers?.['x-forwarded-for'] || req?.connection?.remoteAddress,
    userAgent: req?.headers?.['user-agent'],
  };
}
