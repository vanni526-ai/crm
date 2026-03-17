import { View, Text, ScrollView, FlatList, ActivityIndicator, Pressable, StyleSheet, Platform } from "react-native";
import { useEffect, useState, useCallback } from "react";
import * as Haptics from "expo-haptics";
import { Avatar } from "@/components/ui/avatar";
import { TeacherTypeTag } from "@/components/ui/tag";
import { useBooking } from "@/lib/booking-context";
import { api } from "@/lib/api-client";
import type { Teacher } from "@/lib/api-client";
import { cn } from "@/lib/utils";

interface TeacherSelectorProps {
  className?: string;
}

export function TeacherSelector({ className }: TeacherSelectorProps) {
  const { state, selectTeacher } = useBooking();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTeachers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const selectedCityName = state.selectedCity?.city || "";
      
      // 从 API获取该城市的老师
      let data: Teacher[] = [];
      if (selectedCityName) {
        data = await api.teachers.getByCity(selectedCityName);
      } else {
        data = await api.teachers.list();
        data = data.filter(t => t.isActive);
      }
      
      setTeachers(data);
    } catch (err: any) {
      console.log("加载老师失败:", err);
      setError(err.message || "加载老师失败，请稍后重试");
      setTeachers([]);
    } finally {
      setLoading(false);
    }
  }, [state.selectedCity]);

  // 首次加载和城市切换时加载数据
  useEffect(() => {
    loadTeachers();
  }, [state.selectedCity?.city]);

  const handleSelectTeacher = (teacher: Teacher) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    selectTeacher(teacher);
  };

  // 格式化选中的时间显示
  const formatSelectedTime = () => {
    if (!state.selectedDate || !state.selectedTimeSlot) return "";
    
    // 处理 selectedDate 可能是 Date 对象或字符串的情况
    const date = state.selectedDate instanceof Date 
      ? state.selectedDate 
      : new Date(state.selectedDate);
    
    // 防止无效日期
    if (isNaN(date.getTime())) {
      return state.selectedTimeSlot;
    }
    
    return `${date.getMonth() + 1}月${date.getDate()}日 ${state.selectedTimeSlot}`;
  };

  // 加载状态
  if (loading) {
    return (
      <View className={cn("flex-1 items-center justify-center", className)}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text className="text-muted mt-4">加载老师中...</Text>
      </View>
    );
  }

  // 错误状态
  if (error) {
    return (
      <View className={cn("flex-1 items-center justify-center p-4", className)}>
        <Text className="text-error text-center mb-4">{error}</Text>
        <Pressable
          onPress={loadTeachers}
          style={({ pressed }) => [
            styles.retryButton,
            pressed && styles.pressed,
          ]}
        >
          <Text className="text-primary font-medium">点击重试</Text>
        </Pressable>
      </View>
    );
  }

  // 无数据状态
  if (teachers.length === 0) {
    return (
      <View className={cn("flex-1 items-center justify-center p-4", className)}>
        <Text className="text-muted text-center mb-2">
          该城市暂无可预约的老师
        </Text>
        <Text className="text-muted text-sm text-center">
          请选择其他城市或稍后再试
        </Text>
      </View>
    );
  }

  return (
    <View className={cn("flex-1 px-4", className)}>
      <Text className="text-xl font-semibold text-foreground mb-4">
        选择老师
      </Text>

      {/* 已选信息提示 */}
      <View className="bg-primary/10 rounded-xl p-3 mb-4 flex-row flex-wrap items-center">
        {state.selectedCity && (
          <View className="flex-row items-center mr-4">
            <Text className="text-primary">📍</Text>
            <Text className="text-primary ml-1 font-medium">
              {state.selectedCity.city}
            </Text>
          </View>
        )}
        {state.selectedDate && state.selectedTimeSlot && (
          <View className="flex-row items-center">
            <Text className="text-primary">🕐</Text>
            <Text className="text-primary ml-1 font-medium">
              {formatSelectedTime()}
            </Text>
          </View>
        )}
      </View>

      {/* 老师卡片列表 - 横向滚动 */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingRight: 20, paddingVertical: 4 }}
        className="mb-4"
        nestedScrollEnabled
      >
        {teachers.map((teacher) => {
          const isSelected = state.selectedTeacher?.id === teacher.id;

          return (
            <Pressable
              key={teacher.id}
              onPress={() => handleSelectTeacher(teacher)}
              style={({ pressed }) => [
                styles.teacherCard,
                pressed && styles.pressed,
              ]}
            >
              <View
                className={cn(
                  "bg-surface rounded-2xl p-4 border-2",
                  isSelected ? "border-primary" : "border-border"
                )}
              >
                {/* 头像 */}
                <View className="items-center mb-3">
                  <Avatar
                    src={teacher.avatarUrl}
                    name={teacher.name}
                    size="xl"
                  />
                </View>

                {/* 老师名字 */}
                <Text
                  className={cn(
                    "text-lg font-semibold text-center mb-2",
                    isSelected ? "text-primary" : "text-foreground"
                  )}
                >
                  {teacher.name}
                </Text>

                {/* 属性标签 */}
                <View className="items-center mb-2">
                  {teacher.customerType && (
                    <TeacherTypeTag type={teacher.customerType} />
                  )}
                </View>

                {/* 一句话介绍 */}
                <Text
                  className="text-sm text-muted text-center"
                  numberOfLines={2}
                >
                  {teacher.notes || "暂无介绍"}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* 已选老师提示 */}
      {state.selectedTeacher && (
        <View className="bg-success/10 rounded-xl p-4 flex-row items-center">
          <Text className="text-success text-lg mr-2">✓</Text>
          <Text className="text-success font-medium">
            已选择 {state.selectedTeacher.name}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  teacherCard: {
    width: 160,
    marginRight: 12,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
});
