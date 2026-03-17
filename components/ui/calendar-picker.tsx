import { View, Text, Pressable, ScrollView, StyleSheet, Platform } from "react-native";
import * as Haptics from "expo-haptics";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";

interface CalendarPickerProps {
  selectedDate: Date | null;
  onSelectDate: (date: Date) => void;
  minDate?: Date;
  maxDate?: Date;
  className?: string;
}

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];
const MONTHS = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];

function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

function isDateDisabled(date: Date, minDate?: Date, maxDate?: Date): boolean {
  if (minDate && date < minDate) {
    // 比较日期部分
    const minDateOnly = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate());
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    if (dateOnly < minDateOnly) return true;
  }
  if (maxDate && date > maxDate) {
    const maxDateOnly = new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate());
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    if (dateOnly > maxDateOnly) return true;
  }
  return false;
}

export function CalendarPicker({
  selectedDate,
  onSelectDate,
  minDate,
  maxDate,
  className,
}: CalendarPickerProps) {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  // 生成当月日历数据
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    // 当月第一天
    const firstDay = new Date(year, month, 1);
    // 当月最后一天
    const lastDay = new Date(year, month + 1, 0);
    
    // 第一天是星期几
    const startWeekday = firstDay.getDay();
    
    const days: (Date | null)[] = [];
    
    // 填充前面的空白
    for (let i = 0; i < startWeekday; i++) {
      days.push(null);
    }
    
    // 填充当月日期
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(new Date(year, month, d));
    }
    
    return days;
  }, [currentMonth]);

  const handlePrevMonth = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleSelectDate = (date: Date) => {
    if (isDateDisabled(date, minDate, maxDate)) return;
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onSelectDate(date);
  };

  return (
    <View className={cn("bg-surface rounded-2xl p-4", className)}>
      {/* 月份导航 */}
      <View className="flex-row items-center justify-between mb-4">
        <Pressable
          onPress={handlePrevMonth}
          style={({ pressed }) => [pressed && styles.pressed]}
          className="p-2"
        >
          <Text className="text-primary text-lg font-medium">‹</Text>
        </Pressable>
        <Text className="text-lg font-semibold text-foreground">
          {currentMonth.getFullYear()}年{MONTHS[currentMonth.getMonth()]}
        </Text>
        <Pressable
          onPress={handleNextMonth}
          style={({ pressed }) => [pressed && styles.pressed]}
          className="p-2"
        >
          <Text className="text-primary text-lg font-medium">›</Text>
        </Pressable>
      </View>

      {/* 星期标题 */}
      <View className="flex-row mb-2">
        {WEEKDAYS.map((day, index) => (
          <View key={index} className="flex-1 items-center">
            <Text className={cn(
              "text-sm font-medium",
              index === 0 || index === 6 ? "text-error" : "text-muted"
            )}>
              {day}
            </Text>
          </View>
        ))}
      </View>

      {/* 日期网格 */}
      <View className="flex-row flex-wrap">
        {calendarDays.map((date, index) => {
          if (!date) {
            return <View key={`empty-${index}`} className="w-[14.28%] h-10" />;
          }

          const isSelected = selectedDate && isSameDay(date, selectedDate);
          const isToday = isSameDay(date, today);
          const disabled = isDateDisabled(date, minDate, maxDate);
          const isWeekend = date.getDay() === 0 || date.getDay() === 6;

          return (
            <Pressable
              key={date.toISOString()}
              onPress={() => handleSelectDate(date)}
              disabled={disabled}
              style={({ pressed }) => [pressed && !disabled && styles.pressed]}
              className={cn(
                "w-[14.28%] h-10 items-center justify-center",
              )}
            >
              <View
                className={cn(
                  "w-9 h-9 items-center justify-center rounded-full",
                  // 选中状态：满色背景
                  isSelected && "bg-primary"
                )}
              >
                <Text
                  className={cn(
                    "text-base",
                    // 选中：白色粗体
                    isSelected && "text-white font-bold",
                    // 今天（未选中）：primary色粗体
                    !isSelected && isToday && "text-primary font-bold",
                    // 可选周末：红色
                    !isSelected && !isToday && !disabled && isWeekend && "text-error",
                    // 可选工作日：深色
                    !isSelected && !isToday && !disabled && !isWeekend && "text-foreground",
                    // 不可选：浅灰色 + 删除线
                    disabled && "text-[#CCCCCC] line-through"
                  )}
                >
                  {date.getDate()}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.7,
  },
});
