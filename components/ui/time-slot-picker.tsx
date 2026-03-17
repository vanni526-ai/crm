import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
import * as Haptics from "expo-haptics";
import { cn } from "@/lib/utils";

interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
  available: boolean;
}

interface TimeSlotPickerProps {
  selectedSlot: string | null;
  onSelectSlot: (slotId: string) => void;
  selectedDate?: Date | null;
  slots?: TimeSlot[];
  className?: string;
}

// 默认时间段：9:00-23:00，每整点1小时为1节课
const DEFAULT_SLOTS: TimeSlot[] = [
  { id: "09:00", startTime: "09:00", endTime: "10:00", available: true },
  { id: "10:00", startTime: "10:00", endTime: "11:00", available: true },
  { id: "11:00", startTime: "11:00", endTime: "12:00", available: true },
  { id: "12:00", startTime: "12:00", endTime: "13:00", available: true },
  { id: "13:00", startTime: "13:00", endTime: "14:00", available: true },
  { id: "14:00", startTime: "14:00", endTime: "15:00", available: true },
  { id: "15:00", startTime: "15:00", endTime: "16:00", available: true },
  { id: "16:00", startTime: "16:00", endTime: "17:00", available: true },
  { id: "17:00", startTime: "17:00", endTime: "18:00", available: true },
  { id: "18:00", startTime: "18:00", endTime: "19:00", available: true },
  { id: "19:00", startTime: "19:00", endTime: "20:00", available: true },
  { id: "20:00", startTime: "20:00", endTime: "21:00", available: true },
  { id: "21:00", startTime: "21:00", endTime: "22:00", available: true },
  { id: "22:00", startTime: "22:00", endTime: "23:00", available: true },
];

export function TimeSlotPicker({
  selectedSlot,
  onSelectSlot,
  selectedDate,
  slots = DEFAULT_SLOTS,
  className,
}: TimeSlotPickerProps) {
  // 计算每个时间段是否可用（考虑当前时间+2小时的限制）
  const now = new Date();
  const isToday = selectedDate && 
    selectedDate.getFullYear() === now.getFullYear() &&
    selectedDate.getMonth() === now.getMonth() &&
    selectedDate.getDate() === now.getDate();
  
  // 如果是今天，需要禁用当前时间+2小时之前的所有时间段
  // 计算最早可用时间（当前时间 + 2小时）
  const minAvailableTime = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  
  // 更新slots的available状态
  const updatedSlots = slots.map(slot => {
    if (!isToday) {
      return { ...slot, available: true };
    }
    
    // 解析时间段的结束时间
    const [endHour, endMinute] = slot.endTime.split(":").map(Number);
    const slotEndTime = new Date(selectedDate);
    slotEndTime.setHours(endHour, endMinute, 0, 0);
    
    // 如果时间段结束时间小于最早可用时间，则禁用
    const available = slotEndTime > minAvailableTime;
    return { ...slot, available };
  });
  const handleSelectSlot = (slotId: string, available: boolean) => {
    if (!available) return;
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onSelectSlot(slotId);
  };

  // 分成上午、下午、晚上三组
  const morningSlots = updatedSlots.filter(s => {
    const hour = parseInt(s.startTime.split(":")[0]);
    return hour >= 9 && hour < 12;
  });
  const afternoonSlots = updatedSlots.filter(s => {
    const hour = parseInt(s.startTime.split(":")[0]);
    return hour >= 12 && hour < 18;
  });
  const eveningSlots = updatedSlots.filter(s => {
    const hour = parseInt(s.startTime.split(":")[0]);
    return hour >= 18;
  });

  const renderSlotGroup = (title: string, groupSlots: TimeSlot[]) => (
    <View className="mb-4">
      <Text className="text-sm font-medium text-muted mb-2">{title}</Text>
      <View className="flex-row flex-wrap gap-2">
        {groupSlots.map((slot) => {
          const isSelected = selectedSlot === slot.id;
          const isAvailable = slot.available;

          return (
            <Pressable
              key={slot.id}
              onPress={() => handleSelectSlot(slot.id, isAvailable)}
              disabled={!isAvailable}
              style={({ pressed }) => [
                pressed && isAvailable && styles.pressed,
              ]}
              className={cn(
                "px-4 py-3 rounded-xl min-w-[80px] items-center",
                // 选中状态：满色背景
                isSelected && "bg-primary shadow-lg",
                // 可选状态：白色背景
                !isSelected && isAvailable && "bg-white",
                // 不可选状态：浅灰色背景
                !isAvailable && "bg-muted/5"
              )}
            >
              <Text
                className={cn(
                  "text-base",
                  // 选中：白色粗体
                  isSelected && "text-white font-bold",
                  // 可选：黑色
                  !isSelected && isAvailable && "text-foreground",
                  // 不可选：浅灰色 + 删除线
                  !isAvailable && "text-[#CCCCCC] line-through"
                )}
              >
                {slot.startTime}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  return (
    <View className={cn("bg-surface rounded-2xl p-4", className)}>
      <Text className="text-base font-semibold text-foreground mb-4">选择时间段</Text>
      {morningSlots.length > 0 && renderSlotGroup("上午", morningSlots)}
      {afternoonSlots.length > 0 && renderSlotGroup("下午", afternoonSlots)}
      {eveningSlots.length > 0 && renderSlotGroup("晚上", eveningSlots)}
    </View>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.97 }],
  },
});
