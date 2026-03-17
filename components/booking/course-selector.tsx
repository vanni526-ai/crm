import { View, Text, ScrollView, ActivityIndicator, Pressable, StyleSheet, Platform, Dimensions } from "react-native";
import { useEffect, useState, useCallback, useMemo } from "react";
import * as Haptics from "expo-haptics";
import { CourseLevelTag } from "@/components/ui/tag";
import { useBooking } from "@/lib/booking-context";
import { api } from "@/lib/api-client";
import type { Course } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { useRouter } from "expo-router";

interface CourseSelectorProps {
  className?: string;
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_GAP = 12;
const HORIZONTAL_PADDING = 16;

// 筛选排序类型
type SortType = "default" | "price_asc" | "price_desc" | "duration_asc" | "duration_desc";
type LevelFilter = "all" | "入门" | "深度" | "剧本" | "订制";

// 课程程度顺序（用于排序）
const LEVEL_ORDER: Record<string, number> = {
  "入门": 1,
  "深度": 2,
  "剧本": 3,
  "订制": 4,
};

export function CourseSelector({ className }: CourseSelectorProps) {
  const router = useRouter();
  const { state, selectCourse } = useBooking();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // 筛选排序状态
  const [sortType, setSortType] = useState<SortType>("default");
  const [levelFilter, setLevelFilter] = useState<LevelFilter>("all");

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
      default:
        // 默认按程度排序
        result.sort((a, b) => (LEVEL_ORDER[a.level || "入门"] || 0) - (LEVEL_ORDER[b.level || "入门"] || 0));
    }
    
    return result;
  }, [courses, sortType, levelFilter]);

  const handleSelectCourse = (course: Course) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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

  const handleSortChange = (type: SortType) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSortType(type);
  };

  const handleLevelFilterChange = (level: LevelFilter) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setLevelFilter(level);
  };

  // 格式化已选信息
  const formatSelectedInfo = () => {
    const parts = [];
    if (state.selectedCity) {
      parts.push(state.selectedCity.city);
    }
    if (state.selectedDate && state.selectedTimeSlot) {
      const date = state.selectedDate;
      parts.push(`${date.getMonth() + 1}/${date.getDate()} ${state.selectedTimeSlot}`);
    }
    if (state.selectedTeacher) {
      parts.push(state.selectedTeacher.name);
    }
    return parts.join(" · ");
  };

  // 格式化价格显示
  const formatPrice = (price: number | null): string => {
    if (price === null || price === undefined) return "面议";
    return `¥${price.toFixed(0)}`;
  };

  // 格式化时长显示
  const formatDuration = (duration: number | null): string => {
    if (duration === null || duration === undefined) return "";
    if (duration === 1) return "1小时";
    return `${duration}小时`;
  };

  // 将课程分成两列（瀑布流效果）
  const leftColumn: Course[] = [];
  const rightColumn: Course[] = [];
  filteredAndSortedCourses.forEach((course, index) => {
    if (index % 2 === 0) {
      leftColumn.push(course);
    } else {
      rightColumn.push(course);
    }
  });

  // 渲染筛选排序栏
  const renderFilterBar = () => {
    const levelOptions: { label: string; value: LevelFilter }[] = [
      { label: "全部", value: "all" },
      { label: "入门", value: "入门" },
      { label: "深度", value: "深度" },
      { label: "剧本", value: "剧本" },
      { label: "订制", value: "订制" },
    ];

    const sortOptions: { label: string; value: SortType }[] = [
      { label: "默认", value: "default" },
      { label: "价格↑", value: "price_asc" },
      { label: "价格↓", value: "price_desc" },
      { label: "时长↑", value: "duration_asc" },
      { label: "时长↓", value: "duration_desc" },
    ];

    return (
      <View className="mb-4">
        {/* 程度筛选 */}
        <View className="mb-3">
          <Text className="text-xs text-muted mb-2">按程度筛选</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row gap-2">
              {levelOptions.map((option) => (
                <Pressable
                  key={option.value}
                  onPress={() => handleLevelFilterChange(option.value)}
                  style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                >
                  <View
                    className={cn(
                      "px-3 py-1.5 rounded-full border",
                      levelFilter === option.value
                        ? "bg-primary border-primary"
                        : "bg-surface border-border"
                    )}
                  >
                    <Text
                      className={cn(
                        "text-sm font-medium",
                        levelFilter === option.value ? "text-white" : "text-foreground"
                      )}
                    >
                      {option.label}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* 排序选项 */}
        <View>
          <Text className="text-xs text-muted mb-2">排序方式</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row gap-2">
              {sortOptions.map((option) => (
                <Pressable
                  key={option.value}
                  onPress={() => handleSortChange(option.value)}
                  style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                >
                  <View
                    className={cn(
                      "px-3 py-1.5 rounded-full border",
                      sortType === option.value
                        ? "bg-primary border-primary"
                        : "bg-surface border-border"
                    )}
                  >
                    <Text
                      className={cn(
                        "text-sm font-medium",
                        sortType === option.value ? "text-white" : "text-foreground"
                      )}
                    >
                      {option.label}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
    );
  };

  const renderCourseCard = (course: Course) => {
    const isSelected = state.selectedCourse?.id === course.id;

    return (
      <Pressable
        key={course.id}
        onPress={() => handleSelectCourse(course)}
        style={({ pressed }) => [
          styles.cardWrapper,
          pressed && styles.pressed,
        ]}
      >
        <View
          className={cn(
            "bg-surface rounded-2xl p-4 border-2",
            isSelected ? "border-primary" : "border-border"
          )}
          style={styles.cardInner}
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
            numberOfLines={2}
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
          <View className="flex-row items-center justify-between mt-auto">
            <Text className="text-primary font-bold text-lg">
              {formatPrice(course.price)}
            </Text>
            <Pressable
              onPress={() => handleBookCourse(course)}
              style={({ pressed }) => [
                styles.bookButton,
                pressed && styles.bookButtonPressed,
              ]}
            >
              <View className="bg-primary px-3 py-1.5 rounded-lg">
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
          style={({ pressed }) => [
            { opacity: pressed ? 0.7 : 1 },
          ]}
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
          style={({ pressed }) => [
            { opacity: pressed ? 0.7 : 1 },
          ]}
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
      <Text className="text-xl font-semibold text-foreground mb-4">
        选择课程
      </Text>

      {/* 已选信息提示 */}
      <View className="bg-primary/10 rounded-xl p-3 mb-4">
        <Text className="text-primary font-medium text-sm">
          {formatSelectedInfo()}
        </Text>
      </View>

      {/* 筛选排序栏 */}
      {renderFilterBar()}

      {/* 筛选结果统计 */}
      <Text className="text-xs text-muted mb-2">
        共 {filteredAndSortedCourses.length} 个课程
        {levelFilter !== "all" && ` · ${levelFilter}程度`}
      </Text>

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
        /* 瀑布流课程列表 */
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          <View style={styles.gridContainer}>
            {/* 左列 */}
            <View style={styles.column}>
              {leftColumn.map((course) => renderCourseCard(course))}
            </View>
            {/* 右列 */}
            <View style={[styles.column, { marginLeft: CARD_GAP }]}>
              {rightColumn.map((course) => renderCourseCard(course))}
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  gridContainer: {
    flexDirection: "row",
  },
  column: {
    flex: 1,
  },
  cardWrapper: {
    marginBottom: CARD_GAP,
  },
  cardInner: {
    minHeight: 180,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  bookButton: {},
  bookButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.95 }],
  },
});
