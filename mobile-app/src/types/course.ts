/**
 * 课程状态
 */
export type CourseStatus = 'pending' | 'accepted' | 'completed' | 'cancelled';

/**
 * 课程类型
 */
export interface Course {
  id: number;
  /** 课程名称 */
  courseName: string;
  /** 课程类型 */
  courseType: string;
  /** 上课日期 */
  classDate: string;
  /** 上课时间 */
  classTime: string;
  /** 课程时长（分钟） */
  duration: number;
  /** 教室地址 */
  classroomAddress: string;
  /** 教室名称 */
  classroomName: string;
  /** 学员姓名 */
  studentName: string;
  /** 学员电话 */
  studentPhone: string;
  /** 课程状态 */
  status: CourseStatus;
  /** 课程费用 */
  fee: number;
  /** 备注 */
  notes?: string;
  /** 创建时间 */
  createdAt: string;
  /** 更新时间 */
  updatedAt: string;
  /** 接单老师ID */
  teacherId?: number;
  /** 接单老师姓名 */
  teacherName?: string;
}

/**
 * 课程列表查询参数
 */
export interface CourseListParams {
  /** 课程状态 */
  status?: CourseStatus;
  /** 页码 */
  page?: number;
  /** 每页数量 */
  pageSize?: number;
}

/**
 * 课程列表响应
 */
export interface CourseListResponse {
  courses: Course[];
  total: number;
  page: number;
  pageSize: number;
}
