import { View, Text, ScrollView, Pressable, ActivityIndicator, Dimensions, StyleSheet, Platform } from "react-native";
import { useEffect, useState, useCallback, useMemo } from "react";
import * as Haptics from "expo-haptics";
import { CourseLevelTag } from "@/components/ui/tag";
import { useBooking } from "@/lib/booking-context";
import { api } from "@/lib/api-client";
import type { Course } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { useRouter } from "expo-router";
import { FilterBottomSheet, SortType, LevelFilter } from "./filter-bottom-sheet";

interface CourseSelectorOptimizedProps {
  className?: string;
}

// 课程程度顺序(用于排序)
const LEVEL_ORDER: Record<string, number> = {
  "入门": 1,
  "深度": 2,
  "剧本": 3,
  "订制": 4,
};

export function CourseSelectorOptimized({ className }: CourseSelectorOptimizedProps) {
  const router = useRouter();
  const { state, selectCourse } = useBooking();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // 筛选排序状态
  const [sortType, setSortType] = useState<SortType>("default");
  const [levelFilter, setLevelFilter] = useState<LevelFilter>("all");
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);

  const loadCourses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.courses.list();
      if (data && data.length > 0) {
        setCourses(data.filter(c => c.isActive));
      } else {
        setCourses([]);
      }
    } catch (err: any) {
      console.log("API加载失败:", err);
      setError(err.message || "加载课程失败");
      setCourses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  // 筛选和排序后的课程列表
  const filteredAndSortedCourses = useMemo(() => {
    let result = [...courses];
    
    // 按程度筛选
    if (levelFilter !== "all") {
      result = result.filter(c => c.level === levelFilter);
    }
    
    // 排序
    switch (sortType) {
      case "price_asc":
        result.sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
        break;
      case "price_desc":
        result.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
        break;
      case "duration_asc":
        result.sort((a, b) => (a.duration ?? 0) - (b.duration ?? 0));
        break;
      case "duration_desc":
        result.sort((a, b) => (b.duration ?? 0) - (a.duration ?? 0));
        break;
      case "default":
      default:
        // 默认按程度排序
        result.sort((a, b) => {
          const orderA = LEVEL_ORDER[a.level || "入门"] || 99;
          const orderB = LEVEL_ORDER[b.level || "入门"] || 99;
          return orderA - orderB;
        });
        break;
    }
    
    return result;
  }, [courses, sortType, levelFilter]);

  const handleSelectCourse = (course: Course) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    selectCourse(course);
  };

  const handleBookCourse = (course: Course) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    selectCourse(course);
    router.push("/booking/confirm");
  };

  const formatPrice = (price?: number) => {
    if (!price) return "免费";
    return `¥${price}`;
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes) return "";
    if (minutes < 60) return `${minutes}分钟`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}小时${mins}分钟` : `${hours}小时`;
  };

  const formatSelectedInfo = () => {
    const parts = [];
    if (state.selectedCity) parts.push(state.selectedCity.city);
    if (state.selectedDate) parts.push(state.selectedDate);
    if (state.selectedTeacher) parts.push(state.selectedTeacher.name);
    return parts.join(" · ");
  };

  const renderCourseCard = (course: Course) => {
    const isSelected = state.selectedCourse?.id === course.id;

    return (
      <Pressable
        key={course.id}
        onPress={() => handleSelectCourse(course)}
        style={({ pressed }) => [
          styles.card,
          pressed && { opacity: 0.7 },
        ]}
      >
        <View
          className={cn(
            "bg-surface rounded-2xl p-4 border-2",
            isSelected ? "border-primary" : "border-border"
          )}
        >
          {/* 课程程度标签 */}
          <View className="mb-2">
            <CourseLevelTag level={course.level || "入门"} />
          </View>

          {/* 课程名称 */}
          <Text
            className={cn(
              "text-base font-semibold mb-2",
              isSelected ? "text-primary" : "text-foreground"
            )}
            numberOfLines={2}
          >
            {course.name}
          </Text>

          {/* 课程介绍 */}
          <Text
            className="text-sm text-muted mb-2"
            numberOfLines={3}
          >
            {course.description || "暂无介绍"}
          </Text>

          {/* 课程时长 */}
          {course.duration && (
            <Text className="text-xs text-muted mb-2">
              ⏱️ {formatDuration(course.duration)}
            </Text>
          )}

          {/* 价格和预约按钮 */}
          <View className="flex-row items-center justify-between mt-2">
            <Text className="text-primary font-bold text-lg">
              {formatPrice(course.price ?? undefined)}
            </Text>
            <Pressable
              onPress={() => handleBookCourse(course)}
              style={({ pressed }) => [
                { opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <View className="bg-primary px-4 py-2 rounded-lg">
                <Text className="text-white text-sm font-medium">预约</Text>
              </View>
            </Pressable>
          </View>
        </View>
      </Pressable>
    );
  };

  // 加载状态
  if (loading) {
    return (
      <View className={cn("flex-1 items-center justify-center", className)}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text className="text-muted mt-4">加载课程中...</Text>
      </View>
    );
  }

  // 错误状态
  if (error && courses.length === 0) {
    return (
      <View className={cn("flex-1 items-center justify-center", className)}>
        <Text className="text-error text-lg mb-4">加载失败</Text>
        <Text className="text-muted mb-4">{error}</Text>
        <Pressable
          onPress={loadCourses}
          style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
        >
          <View className="bg-primary px-6 py-3 rounded-xl">
            <Text className="text-white font-medium">重试</Text>
          </View>
        </Pressable>
      </View>
    );
  }

  // 无课程数据
  if (courses.length === 0) {
    return (
      <View className={cn("flex-1 items-center justify-center", className)}>
        <Text className="text-muted text-lg mb-4">暂无可预约的课程</Text>
        <Pressable
          onPress={loadCourses}
          style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
        >
          <View className="bg-primary px-6 py-3 rounded-xl">
            <Text className="text-white font-medium">刷新</Text>
          </View>
        </Pressable>
      </View>
    );
  }

  return (
    <View className={cn("flex-1", className)}>
      {/* 已选信息提示 */}
      {formatSelectedInfo() && (
        <View className="bg-primary/10 rounded-xl p-3 mb-4 mx-4">
          <Text className="text-primary font-medium text-sm">
            {formatSelectedInfo()}
          </Text>
        </View>
      )}

      {/* 筛选结果统计 */}
      <View className="px-4 mb-2 flex-row items-center justify-between">
        <Text className="text-xs text-muted">
          共 {filteredAndSortedCourses.length} 个课程
          {levelFilter !== "all" && ` · ${levelFilter}程度`}
        </Text>
        {(levelFilter !== "all" || sortType !== "default") && (
          <Pressable
            onPress={() => {
              setLevelFilter("all");
              setSortType("default");
            }}
            style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
          >
            <Text className="text-primary text-xs">重置</Text>
          </Pressable>
        )}
      </View>

      {/* 筛选无结果提示 */}
      {filteredAndSortedCourses.length === 0 ? (
        <View className="flex-1 items-center justify-center py-12">
          <Text className="text-muted text-base mb-4">没有符合条件的课程</Text>
          <Pressable
            onPress={() => {
              setLevelFilter("all");
              setSortType("default");
            }}
            style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
          >
            <View className="bg-primary px-4 py-2 rounded-lg">
              <Text className="text-white text-sm font-medium">重置筛选</Text>
            </View>
          </Pressable>
        </View>
      ) : (
        /* 简单的单列课程列表 - 使用普通ScrollView */
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
        >
          {filteredAndSortedCourses.map((course) => renderCourseCard(course))}
        </ScrollView>
      )}

      {/* 浮动筛选按钮 */}
      <View style={styles.floatingButton}>
        <Pressable
          onPress={() => setFilterSheetVisible(true)}
          style={({ pressed }) => [
            styles.filterButton,
            { opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <Text className="text-white font-medium">筛选排序</Text>
        </Pressable>
      </View>

      {/* 筛选底部弹窗 */}
      <FilterBottomSheet
        visible={filterSheetVisible}
        onClose={() => setFilterSheetVisible(false)}
        sortType={sortType}
        levelFilter={levelFilter}
        onSortChange={setSortType}
        onLevelFilterChange={setLevelFilter}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
  },
  floatingButton: {
    position: "absolute",
    bottom: 80,
    right: 16,
    zIndex: 10,
  },
  filterButton: {
    backgroundColor: "#FF6B35",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
});
