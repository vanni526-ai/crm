import { View, Text, ScrollView } from "react-native";
import { CalendarPicker } from "@/components/ui/calendar-picker";
import { TimeSlotPicker } from "@/components/ui/time-slot-picker";
import { Button } from "@/components/ui/button";
import { useBooking } from "@/lib/booking-context";
import { cn } from "@/lib/utils";

interface TimeSelectorProps {
  className?: string;
}

export function TimeSelector({ className }: TimeSelectorProps) {
  const { state, selectDate, selectTimeSlot, canProceedToTeacher, dispatch } = useBooking();

  // 最小日期为今天
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 最大日期为30天后
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 30);

  const handleContinue = () => {
    if (canProceedToTeacher()) {
      dispatch({ type: "SET_STEP", step: 3 });
    }
  };

  // 格式化选中的日期显示
  const formatSelectedDate = () => {
    if (!state.selectedDate) return "";
    const date = state.selectedDate;
    const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
    return `${date.getMonth() + 1}月${date.getDate()}日 ${weekdays[date.getDay()]}`;
  };

  return (
    <ScrollView
      className={cn("flex-1", className)}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 100 }}
    >
      <Text className="text-xl font-semibold text-foreground mb-4">
        选择上课时间
      </Text>

      {/* 已选城市提示 */}
      {state.selectedCity && (
        <View className="bg-primary/10 rounded-xl p-3 mb-4 flex-row items-center">
          <Text className="text-primary">📍</Text>
          <Text className="text-primary ml-2 font-medium">
            {state.selectedCity.city}
          </Text>
        </View>
      )}

      {/* 日历选择器 */}
      <CalendarPicker
        selectedDate={state.selectedDate}
        onSelectDate={selectDate}
        minDate={today}
        maxDate={maxDate}
        className="mb-4"
      />

      {/* 已选日期显示 */}
      {state.selectedDate && (
        <View className="bg-surface rounded-xl p-3 mb-4 flex-row items-center justify-between">
          <Text className="text-muted">已选日期</Text>
          <Text className="text-foreground font-medium">
            {formatSelectedDate()}
          </Text>
        </View>
      )}

      {/* 时间段选择器 - 只有选择日期后才显示 */}
      {state.selectedDate && (
        <TimeSlotPicker
          selectedSlot={state.selectedTimeSlot}
          onSelectSlot={selectTimeSlot}
          selectedDate={state.selectedDate}
          className="mb-6"
        />
      )}

      {/* 已选时间显示 */}
      {state.selectedTimeSlot && (
        <View className="bg-surface rounded-xl p-3 mb-6 flex-row items-center justify-between">
          <Text className="text-muted">已选时间</Text>
          <Text className="text-foreground font-medium">
            {state.selectedTimeSlot} - {parseInt(state.selectedTimeSlot.split(":")[0]) + 1}:00
          </Text>
        </View>
      )}

      {/* 继续按钮 */}
      {state.selectedDate && state.selectedTimeSlot && (
        <Button
          onPress={handleContinue}
          fullWidth
          size="lg"
        >
          选择老师
        </Button>
      )}
    </ScrollView>
  );
}
