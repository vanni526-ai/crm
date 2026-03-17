import { View, Text, ScrollView, TouchableOpacity, Platform, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { useState, useEffect, useCallback } from "react";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { useUserRoles } from "@/src/hooks/use-user-roles";
import { ROLE_LABELS } from "@/src/constants/roles";
import { api, type TeacherCourse } from "@/lib/api-client";

/**
 * 老师端首页
 * 
 * 显示：
 * - 课程提醒卡片（新订单或即将上课）
 * - 统计卡片（今日课程、待上课程、本月收入）
 * - 快捷功能入口
 */
export default function TeacherHomeScreen() {
  const { user, currentRole } = useUserRoles();

  const [pendingCourses, setPendingCourses] = useState<TeacherCourse[]>([]);
  const [acceptedCourses, setAcceptedCourses] = useState<TeacherCourse[]>([]);
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [pending, accepted, stats] = await Promise.all([
        api.teacher.courses({ status: "pending" }),
        api.teacher.courses({ status: "accepted" }),
        api.teacherPayments.getMyStats(),
      ]);
      setPendingCourses(pending);
      setAcceptedCourses(accepted);
      setMonthlyIncome(stats?.monthlyIncome || 0);
    } catch (e) {
      console.error("[TeacherHome] fetchData error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const timer = setInterval(fetchData, 30000);
    return () => clearInterval(timer);
  }, [fetchData]);

  const handlePress = async (route: string) => {
    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push(route as any);
  };

  // 找到最近的待接单课程或即将上课的课程
  const getTopCourse = () => {
    if (pendingCourses && pendingCourses.length > 0) {
      return { course: pendingCourses[0], type: "pending" as const };
    }
    if (acceptedCourses && acceptedCourses.length > 0) {
      const now = new Date();
      const upcomingCourse = acceptedCourses.find((course) => {
        const courseDateTime = new Date(`${course.classDate} ${course.classTime}`);
        const timeDiff = courseDateTime.getTime() - now.getTime();
        const hoursDiff = timeDiff / (1000 * 60 * 60);
        return hoursDiff > 0 && hoursDiff <= 24;
      });
      if (upcomingCourse) {
        return { course: upcomingCourse, type: "upcoming" as const };
      }
    }
    return null;
  };

  const topCourse = getTopCourse();
  const todayCoursesCount = 0;
  const pendingCount = (pendingCourses?.length || 0) + (acceptedCourses?.length || 0);

  return (
    <ScreenContainer className="bg-background">
      <ScrollView 
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="p-6 gap-6">
          {/* 头部欢迎 */}
          <View>
            <Text className="text-2xl font-bold text-foreground">
              你好，{user?.name || "老师"}
            </Text>
            <Text className="text-base text-muted mt-1">
              欢迎使用<Text className="text-primary font-semibold">{currentRole ? ROLE_LABELS[currentRole] : "课程预约"}</Text>端
            </Text>
          </View>

          {/* 课程提醒卡片 */}
          {loading ? (
            <View className="bg-primary/10 rounded-2xl p-4 items-center justify-center" style={{ minHeight: 100 }}>
              <ActivityIndicator size="small" color="#007AFF" />
              <Text className="text-sm text-muted mt-2">加载课程信息...</Text>
            </View>
          ) : topCourse ? (
            <TouchableOpacity
              onPress={() => handlePress(`/(teacher)/${topCourse.course.id}`)}
              className="bg-primary/10 border-2 border-primary rounded-2xl p-4 active:opacity-70"
            >
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-base font-bold text-primary">
                  {topCourse.type === "pending" ? "🔔 新订单提醒" : "⏰ 即将上课"}
                </Text>
                <Text className="text-xs text-primary">点击查看详情</Text>
              </View>
              
              <View className="gap-1">
                <Text className="text-sm text-foreground font-semibold">
                  {topCourse.course.courseName}
                </Text>
                <Text className="text-sm text-muted">
                  时间：{String(topCourse.course.classDate)} {topCourse.course.classTime}
                </Text>
                <Text className="text-sm text-muted">
                  地点：{topCourse.course.classroomAddress}
                </Text>
                <Text className="text-sm text-muted">
                  学员：{topCourse.course.studentName}
                </Text>
                {topCourse.type === "pending" && (
                  <Text className="text-sm text-primary font-semibold mt-1">
                    待接单
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          ) : (
            <View className="bg-surface rounded-2xl p-4 items-center justify-center" style={{ minHeight: 100 }}>
              <Text className="text-base text-muted">暂无新订单或即将上课的课程</Text>
            </View>
          )}

          {/* 统计卡片 */}
          <View className="flex-row gap-3">
            <View className="flex-1 bg-surface rounded-2xl p-4">
              <Text className="text-sm text-muted mb-2">今日课程</Text>
              <Text className="text-3xl font-bold text-foreground">{todayCoursesCount}</Text>
              <Text className="text-xs text-muted mt-1">节</Text>
            </View>

            <View className="flex-1 bg-surface rounded-2xl p-4">
              <Text className="text-sm text-muted mb-2">待上课程</Text>
              <Text className="text-3xl font-bold text-primary">{pendingCount}</Text>
              <Text className="text-xs text-muted mt-1">节</Text>
            </View>

            <TouchableOpacity
              onPress={() => handlePress("/(teacher)/income")}
              className="flex-1 bg-surface rounded-2xl p-4 active:opacity-70"
            >
              <Text className="text-sm text-muted mb-2">本月收入</Text>
              <Text className="text-3xl font-bold text-success">{monthlyIncome}</Text>
              <Text className="text-xs text-muted mt-1">元</Text>
            </TouchableOpacity>
          </View>

          {/* 快捷功能 */}
          <View>
            <Text className="text-lg font-semibold text-foreground mb-3">
              快捷功能
            </Text>
            <View className="gap-3">
              <TouchableOpacity
                onPress={() => handlePress("/(teacher)/courses")}
                className="bg-surface rounded-2xl p-4 flex-row items-center justify-between active:opacity-70"
              >
                <View>
                  <Text className="text-base font-semibold text-foreground">
                    我的课程
                  </Text>
                  <Text className="text-sm text-muted mt-1">
                    查看课程安排和学员信息
                  </Text>
                </View>
                <Text className="text-2xl">📚</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handlePress("/(teacher)/income")}
                className="bg-surface rounded-2xl p-4 flex-row items-center justify-between active:opacity-70"
              >
                <View>
                  <Text className="text-base font-semibold text-foreground">
                    收入统计
                  </Text>
                  <Text className="text-sm text-muted mt-1">
                    查看收入明细和统计
                  </Text>
                </View>
                <Text className="text-2xl">💰</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handlePress("/(teacher)/training")}
                className="bg-surface rounded-2xl p-4 flex-row items-center justify-between active:opacity-70"
              >
                <View>
                  <Text className="text-base font-semibold text-foreground">
                    培训入口
                  </Text>
                  <Text className="text-sm text-muted mt-1">
                    参加培训和学习资料
                  </Text>
                </View>
                <Text className="text-2xl">🎓</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
