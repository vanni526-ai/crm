/**
 * 订单数据规范化工具函数
 * 用于规范化订单中的交付老师、交付课程、上课时间、交付教室字段
 */

import { getDb } from "./db";
import { users, courses, classrooms } from "../drizzle/schema";
import { like, and, isNotNull, ne, eq } from "drizzle-orm";

/**
 * 计算两个字符串的相似度（Levenshtein距离）
 */
function calculateSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;
  
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  if (s1 === s2) return 1;
  
  const len1 = s1.length;
  const len2 = s2.length;
  const matrix: number[][] = [];
  
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  
  const distance = matrix[len1][len2];
  const maxLen = Math.max(len1, len2);
  return 1 - distance / maxLen;
}

/**
 * 匹配老师花名
 */
export async function matchTeacherNickname(teacherName: string): Promise<{
  matched: boolean;
  originalName: string;
  standardName: string | null;
  similarity: number;
  confidence: 'high' | 'medium' | 'low';
}> {
  if (!teacherName || teacherName.trim() === '') {
    return {
      matched: false,
      originalName: teacherName,
      standardName: null,
      similarity: 0,
      confidence: 'low'
    };
  }
  
  const db = await getDb();
  if (!db) throw new Error('Database connection failed');
  
  // 查询所有老师的花名
  const teachers = await db
    .select({
      id: users.id,
      name: users.name,
      nickname: users.nickname,
      aliases: users.aliases
    })
    .from(users)
    .where(
      and(
        like(users.roles, '%teacher%'),
        isNotNull(users.nickname),
        ne(users.nickname, '')
      )
    );
  
  let bestMatch: { name: string; similarity: number } | null = null;
  
  for (const teacher of teachers) {
    // 精确匹配花名
    if (teacher.nickname?.toLowerCase().trim() === teacherName.toLowerCase().trim()) {
      return {
        matched: true,
        originalName: teacherName,
        standardName: teacher.nickname,
        similarity: 1,
        confidence: 'high'
      };
    }
    
    // 计算相似度
    const similarity = calculateSimilarity(teacherName, teacher.nickname || '');
    if (!bestMatch || similarity > bestMatch.similarity) {
      bestMatch = { name: teacher.nickname || '', similarity };
    }
    
    // 检查别名
    if (teacher.aliases) {
      try {
        const aliases = JSON.parse(teacher.aliases);
        if (Array.isArray(aliases)) {
          for (const alias of aliases) {
            if (alias.toLowerCase().trim() === teacherName.toLowerCase().trim()) {
              return {
                matched: true,
                originalName: teacherName,
                standardName: teacher.nickname,
                similarity: 1,
                confidence: 'high'
              };
            }
          }
        }
      } catch (e) {
        // 忽略JSON解析错误
      }
    }
  }
  
  // 根据相似度判断匹配结果
  if (bestMatch) {
    if (bestMatch.similarity >= 0.8) {
      return {
        matched: true,
        originalName: teacherName,
        standardName: bestMatch.name,
        similarity: bestMatch.similarity,
        confidence: 'high'
      };
    } else if (bestMatch.similarity >= 0.6) {
      return {
        matched: true,
        originalName: teacherName,
        standardName: bestMatch.name,
        similarity: bestMatch.similarity,
        confidence: 'medium'
      };
    } else {
      return {
        matched: false,
        originalName: teacherName,
        standardName: bestMatch.name,
        similarity: bestMatch.similarity,
        confidence: 'low'
      };
    }
  }
  
  return {
    matched: false,
    originalName: teacherName,
    standardName: null,
    similarity: 0,
    confidence: 'low'
  };
}

/**
 * 匹配课程名称
 */
export async function matchCourseName(courseName: string): Promise<{
  matched: boolean;
  originalName: string;
  standardName: string | null;
  duration: string | null;
  similarity: number;
  confidence: 'high' | 'medium' | 'low';
}> {
  if (!courseName || courseName.trim() === '') {
    return {
      matched: false,
      originalName: courseName,
      standardName: null,
      duration: null,
      similarity: 0,
      confidence: 'low'
    };
  }
  
  const db = await getDb();
  if (!db) throw new Error('Database connection failed');
  
  // 查询所有课程
  const allCourses = await db
    .select({
      id: courses.id,
      courseName: courses.name,
      duration: courses.duration
    })
    .from(courses)
    .where(eq(courses.isActive, true));
  
  let bestMatch: { name: string; duration: string; similarity: number } | null = null;
  
  for (const course of allCourses) {
    // 精确匹配
    if (course.courseName?.toLowerCase().trim() === courseName.toLowerCase().trim()) {
      return {
        matched: true,
        originalName: courseName,
        standardName: course.courseName,
        duration: course.duration,
        similarity: 1,
        confidence: 'high'
      };
    }
    
    // 计算相似度
    const similarity = calculateSimilarity(courseName, course.courseName || '');
    if (!bestMatch || similarity > bestMatch.similarity) {
      bestMatch = { name: course.courseName, duration: course.duration, similarity };
    }
  }
  
  // 根据相似度判断匹配结果
  if (bestMatch) {
    if (bestMatch.similarity >= 0.8) {
      return {
        matched: true,
        originalName: courseName,
        standardName: bestMatch.name,
        duration: bestMatch.duration,
        similarity: bestMatch.similarity,
        confidence: 'high'
      };
    } else if (bestMatch.similarity >= 0.6) {
      return {
        matched: true,
        originalName: courseName,
        standardName: bestMatch.name,
        duration: bestMatch.duration,
        similarity: bestMatch.similarity,
        confidence: 'medium'
      };
    } else {
      return {
        matched: false,
        originalName: courseName,
        standardName: bestMatch.name,
        duration: bestMatch.duration,
        similarity: bestMatch.similarity,
        confidence: 'low'
      };
    }
  }
  
  return {
    matched: false,
    originalName: courseName,
    standardName: null,
    duration: null,
    similarity: 0,
    confidence: 'low'
  };
}

/**
 * 规范化上课时间格式
 */
export function normalizeClassTime(classTime: string, courseDuration: string | null): {
  normalized: boolean;
  originalTime: string;
  standardTime: string | null;
  confidence: 'high' | 'medium' | 'low';
} {
  if (!classTime || classTime.trim() === '') {
    return {
      normalized: false,
      originalTime: classTime,
      standardTime: null,
      confidence: 'low'
    };
  }
  
  const trimmedTime = classTime.trim();
  
  // 已经是标准格式（HH:MM-HH:MM）
  const rangePattern = /^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$/;
  if (rangePattern.test(trimmedTime)) {
    return {
      normalized: true,
      originalTime: classTime,
      standardTime: trimmedTime,
      confidence: 'high'
    };
  }
  
  // 只有开始时间（HH:MM）
  const singleTimePattern = /^(\d{1,2}):(\d{2})$/;
  const match = trimmedTime.match(singleTimePattern);
  
  if (match && courseDuration) {
    const startHour = parseInt(match[1]);
    const startMinute = parseInt(match[2]);
    
    // 解析课程时长
    const durationMatch = courseDuration.match(/^(\d+(?:\.\d+)?)\s*h$/);
    if (durationMatch) {
      const hours = parseFloat(durationMatch[1]);
      const totalMinutes = startHour * 60 + startMinute + hours * 60;
      const endHour = Math.floor(totalMinutes / 60);
      const endMinute = totalMinutes % 60;
      
      const standardTime = `${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}-${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;
      
      return {
        normalized: true,
        originalTime: classTime,
        standardTime,
        confidence: 'high'
      };
    }
  }
  
  return {
    normalized: false,
    originalTime: classTime,
    standardTime: null,
    confidence: 'low'
  };
}

/**
 * 匹配教室名称
 */
export async function matchClassroom(roomName: string, cityName: string | null): Promise<{
  matched: boolean;
  originalName: string;
  standardName: string | null;
  classroomId: number | null;
  similarity: number;
  confidence: 'high' | 'medium' | 'low';
}> {
  if (!roomName || roomName.trim() === '') {
    return {
      matched: false,
      originalName: roomName,
      standardName: null,
      classroomId: null,
      similarity: 0,
      confidence: 'low'
    };
  }
  
  const db = await getDb();
  if (!db) throw new Error('Database connection failed');
  
  // 查询教室列表
  let cityClassrooms: any[] = [];
  
  // 如果有城市信息，优先匹配同城市的教室
  if (cityName) {
    cityClassrooms = await db
      .select({
        id: classrooms.id,
        classroomName: classrooms.name,
        cityName: classrooms.cityName
      })
      .from(classrooms)
      .where(and(eq(classrooms.isActive, true), eq(classrooms.cityName, cityName)));
    
    for (const classroom of cityClassrooms) {
      // 精确匹配
      if (classroom.classroomName?.toLowerCase().trim() === roomName.toLowerCase().trim()) {
        return {
          matched: true,
          originalName: roomName,
          standardName: classroom.classroomName,
          classroomId: classroom.id,
          similarity: 1,
          confidence: 'high'
        };
      }
    }
  }
  
  // 查询所有教室
  const allClassrooms = await db
    .select({
      id: classrooms.id,
      classroomName: classrooms.name,
      cityName: classrooms.cityName
    })
    .from(classrooms)
    .where(eq(classrooms.isActive, true));
  
  let bestMatch: { name: string; id: number; similarity: number } | null = null;
  
  for (const classroom of allClassrooms) {
    // 精确匹配
    if (classroom.classroomName?.toLowerCase().trim() === roomName.toLowerCase().trim()) {
      return {
        matched: true,
        originalName: roomName,
        standardName: classroom.classroomName,
        classroomId: classroom.id,
        similarity: 1,
        confidence: 'high'
      };
    }
    
    // 计算相似度
    const similarity = calculateSimilarity(roomName, classroom.classroomName || '');
    if (!bestMatch || similarity > bestMatch.similarity) {
      bestMatch = { name: classroom.classroomName, id: classroom.id, similarity };
    }
  }
  
  // 根据相似度判断匹配结果
  if (bestMatch) {
    if (bestMatch.similarity >= 0.8) {
      return {
        matched: true,
        originalName: roomName,
        standardName: bestMatch.name,
        classroomId: bestMatch.id,
        similarity: bestMatch.similarity,
        confidence: 'high'
      };
    } else if (bestMatch.similarity >= 0.6) {
      return {
        matched: true,
        originalName: roomName,
        standardName: bestMatch.name,
        classroomId: bestMatch.id,
        similarity: bestMatch.similarity,
        confidence: 'medium'
      };
    } else {
      return {
        matched: false,
        originalName: roomName,
        standardName: bestMatch.name,
        classroomId: bestMatch.id,
        similarity: bestMatch.similarity,
        confidence: 'low'
      };
    }
  }
  
  return {
    matched: false,
    originalName: roomName,
    standardName: null,
    classroomId: null,
    similarity: 0,
    confidence: 'low'
  };
}
