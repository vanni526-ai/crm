/**
 * 进度追踪服务
 * 用于跟踪长时间运行任务的进度
 */

export interface Progress {
  taskId: string;
  current: number;
  total: number;
  message: string;
  completed: boolean;
  error?: string;
}

// 内存存储进度信息
const progressStore = new Map<string, Progress>();

/**
 * 创建新任务并返回taskId
 */
export function createTask(taskId: string): string {
  progressStore.set(taskId, {
    taskId,
    current: 0,
    total: 100,
    message: '准备开始...',
    completed: false,
  });
  return taskId;
}

/**
 * 更新任务进度
 */
export function updateProgress(taskId: string, progress: Partial<Progress>) {
  const existing = progressStore.get(taskId);
  if (existing) {
    progressStore.set(taskId, {
      ...existing,
      ...progress,
    });
  }
}

/**
 * 标记任务完成
 */
export function completeTask(taskId: string, message?: string) {
  const existing = progressStore.get(taskId);
  if (existing) {
    progressStore.set(taskId, {
      ...existing,
      current: existing.total,
      message: message || existing.message,
      completed: true,
    });
  }
}

/**
 * 标记任务失败
 */
export function failTask(taskId: string, error: string) {
  const existing = progressStore.get(taskId);
  if (existing) {
    progressStore.set(taskId, {
      ...existing,
      completed: true,
      error,
    });
  }
}

/**
 * 获取任务进度
 */
export function getProgress(taskId: string): Progress | null {
  return progressStore.get(taskId) || null;
}

/**
 * 清理已完成的任务(1小时后自动清理)
 */
export function cleanupTask(taskId: string) {
  setTimeout(() => {
    progressStore.delete(taskId);
  }, 60 * 60 * 1000); // 1小时
}

/**
 * 生成唯一的taskId
 */
export function generateTaskId(): string {
  return `task_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}
