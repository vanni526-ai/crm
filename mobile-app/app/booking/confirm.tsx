import { View, Text, ScrollView, Platform } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScreenContainer } from "@/components/screen-container";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { TeacherTypeTag, CourseLevelTag } from "@/components/ui/tag";
import { useBooking } from "@/lib/booking-context";

export default function BookingConfirmScreen() {
  const router = useRouter();
  const { state } = useBooking();
  const insets = useSafeAreaInsets();

  // 格式化日期
  const formatDate = () => {
    if (!state.selectedDate) return "";
    const date = state.selectedDate;
    const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${weekdays[date.getDay()]}`;
  };

  // 格式化时间段
  const formatTimeSlot = () => {
    if (!state.selectedTimeSlot) return "";
    const startHour = parseInt(state.selectedTimeSlot.split(":")[0]);
    return `${state.selectedTimeSlot} - ${startHour + 1}:00`;
  };

  const handleConfirmAndPay = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    // 跳转到支付页面
    router.push("/booking/payment" as any);
  };

  const handleGoBack = () => {
    router.back();
  };

  // 检查是否所有信息都已选择
  const isComplete = state.selectedCity && state.selectedDate && 
                     state.selectedTimeSlot && state.selectedTeacher && 
                     state.selectedCourse;

  if (!isComplete) {
    return (
      <ScreenContainer className="p-4">
        <View className="flex-1 items-center justify-center">
          <Text className="text-lg text-muted text-center mb-4">
            请先完成所有选择
          </Text>
          <Button onPress={handleGoBack}>返回选择</Button>
        </View>
      </ScreenContainer>
    );
  }

  // 课程价格
  const coursePrice = Number(state.selectedCourse?.price ?? 0);

  return (
    <ScreenContainer edges={["top", "left", "right"]}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ 
          paddingHorizontal: 16, 
          paddingTop: 16, 
          paddingBottom: Math.max(insets.bottom, 16) + 16
        }}
      >
        {/* 标题 */}
        <Text className="text-2xl font-bold text-foreground mb-6">
          确认预约信息
        </Text>

        {/* 预约信息卡片 */}
        <Card className="mb-4">
          <Text className="text-lg font-semibold text-foreground mb-4">
            预约详情
          </Text>

          {/* 城市 */}
          <View className="flex-row items-center justify-between py-3 border-b border-border">
            <Text className="text-muted">上课城市</Text>
            <Text className="text-foreground font-medium">
              {state.selectedCity?.city}
            </Text>
          </View>

          {/* 日期 */}
          <View className="flex-row items-center justify-between py-3 border-b border-border">
            <Text className="text-muted">上课日期</Text>
            <Text className="text-foreground font-medium">
              {formatDate()}
            </Text>
          </View>

          {/* 时间 */}
          <View className="flex-row items-center justify-between py-3">
            <Text className="text-muted">上课时间</Text>
            <Text className="text-foreground font-medium">
              {formatTimeSlot()}
            </Text>
          </View>
        </Card>

        {/* 老师信息卡片 */}
        <Card className="mb-4">
          <Text className="text-lg font-semibold text-foreground mb-4">
            授课老师
          </Text>
          <View className="flex-row items-center">
            <Avatar
              src={state.selectedTeacher?.avatarUrl}
              name={state.selectedTeacher?.name}
              size="lg"
            />
            <View className="ml-4 flex-1">
              <View className="flex-row items-center mb-1">
                <Text className="text-lg font-semibold text-foreground mr-2">
                  {state.selectedTeacher?.name}
                </Text>
                {state.selectedTeacher?.customerType && (
                  <TeacherTypeTag type={state.selectedTeacher.customerType} />
                )}
              </View>
              <Text className="text-sm text-muted" numberOfLines={2}>
                {state.selectedTeacher?.notes || "暂无介绍"}
              </Text>
            </View>
          </View>
        </Card>

        {/* 课程信息卡片 */}
        <Card className="mb-4">
          <Text className="text-lg font-semibold text-foreground mb-4">
            课程信息
          </Text>
          <View className="flex-row items-start justify-between mb-2">
            <View className="flex-1">
              <View className="flex-row items-center mb-2">
                <Text className="text-base font-medium text-foreground mr-2">
                  {state.selectedCourse?.name}
                </Text>
                {state.selectedCourse?.level && (
                  <CourseLevelTag level={state.selectedCourse.level} />
                )}
              </View>
              <Text className="text-sm text-muted">
                {state.selectedCourse?.description || "暂无介绍"}
              </Text>
            </View>
          </View>
          <View className="flex-row items-center justify-between pt-3 border-t border-border mt-3">
            <Text className="text-muted">课程费用</Text>
            <Text className="text-primary font-bold text-xl">
              ¥{state.selectedCourse?.price}
            </Text>
          </View>
        </Card>

        {/* 费用汇总 */}
        <Card className="mb-6 bg-primary/5">
          <View className="flex-row items-center justify-between">
            <Text className="text-foreground font-semibold text-lg">应付金额</Text>
            <Text className="text-primary font-bold text-2xl">
              ¥{coursePrice.toFixed(2)}
            </Text>
          </View>
        </Card>

        {/* 操作按钮 - 放在ScrollView内部 */}
        <View className="mb-6">
          <Button
            onPress={handleConfirmAndPay}
            fullWidth
            size="lg"
          >
            确认并支付
          </Button>
        </View>

        <View className="mb-6">
          <Button
            onPress={handleGoBack}
            variant="outline"
            fullWidth
            size="lg"
          >
            返回修改
          </Button>
        </View>

        {/* 提示信息 */}
        <View className="bg-surface/30 rounded-xl p-4">
          <Text className="text-muted text-xs leading-5">
            温馨提示：{"\n"}
            • 请确认预约信息无误后再进行支付{"\n"}
            • 支付成功后，预约将自动生效{"\n"}
            • 如需修改预约，请在"我的预约"中操作
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
