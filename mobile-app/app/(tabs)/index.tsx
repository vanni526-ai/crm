import { View, Text, Pressable, StyleSheet, Platform, ScrollView, ActivityIndicator } from "react-native";
import Animated, { useSharedValue, useAnimatedScrollHandler, withTiming } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useEffect } from "react";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { CollapsibleStepIndicator } from "@/components/ui/collapsible-step-indicator";
import { CitySelector } from "@/components/booking/city-selector";
import { TimeSelector } from "@/components/booking/time-selector";
import { TeacherSelector } from "@/components/booking/teacher-selector";
import { CourseSelector } from "@/components/booking/course-selector";
import { CourseSelectorOptimized } from "@/components/booking/course-selector-optimized";
import { useBooking, BOOKING_STEPS } from "@/lib/booking-context";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { useColors } from "@/hooks/use-colors";

export default function HomeScreen() {
  const router = useRouter();
  const { state, goBack, reset } = useBooking();
  const { state: authState } = useAuth();
  const colors = useColors();
  
  // 步骤指示器收起状态 (0 = 展开, 1 = 收起)
  const stepIndicatorCollapsed = useSharedValue(0);
  
  // 处理滚动事件，根据滚动位置收起/展开步骤指示器
  const handleScroll = (scrollY: number) => {
    if (scrollY > 50) {
      stepIndicatorCollapsed.value = withTiming(1, { duration: 200 });
    } else {
      stepIndicatorCollapsed.value = withTiming(0, { duration: 200 });
    }
  };

  // 检查登录状态，未登录则跳转到登录页
  useEffect(() => {
    if (!authState.isLoading && !authState.isAuthenticated) {
      router.replace("/login");
    }
  }, [authState.isLoading, authState.isAuthenticated]);

  const handleGoBack = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    goBack();
  };

  const handleReset = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    reset();
  };

  // 加载中状态
  if (authState.isLoading) {
    return (
      <ScreenContainer className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color={colors.primary} />
        <Text className="text-muted mt-4">正在检查登录状态...</Text>
      </ScreenContainer>
    );
  }

  // 未登录状态（等待跳转）
  if (!authState.isAuthenticated) {
    return (
      <ScreenContainer className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color={colors.primary} />
        <Text className="text-muted mt-4">正在跳转到登录页...</Text>
      </ScreenContainer>
    );
  }

  // 渲染当前步骤的内容
  const renderStepContent = () => {
    switch (state.currentStep) {
      case 1:
        return <CitySelector />;
      case 2:
        return <TimeSelector />;
      case 3:
        return <TeacherSelector />;
      case 4:
        return <CourseSelectorOptimized />;
      default:
        return <CitySelector />;
    }
  };

  return (
    <ScreenContainer className="flex-1">
      {/* 顶部导航栏 */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-border">
        {state.currentStep > 1 ? (
          <Pressable
            onPress={handleGoBack}
            style={({ pressed }) => [pressed && styles.pressed]}
            className="p-2 -ml-2"
          >
            <Text className="text-primary text-base font-medium">‹ 返回</Text>
          </Pressable>
        ) : (
          <View className="w-16" />
        )}
        
        <Text className="text-lg font-semibold text-foreground">预约课程</Text>
        
        {state.currentStep > 1 ? (
          <Pressable
            onPress={handleReset}
            style={({ pressed }) => [pressed && styles.pressed]}
            className="p-2 -mr-2"
          >
            <Text className="text-muted text-sm">重新选择</Text>
          </Pressable>
        ) : (
          <View className="w-16" />
        )}
      </View>

      {/* 步骤指示器 */}
      <Animated.View className="px-4 bg-surface/50" style={{ paddingVertical: 16 }}>
        <CollapsibleStepIndicator
          steps={BOOKING_STEPS.map(s => ({ id: s.id, title: s.title }))}
          currentStep={state.currentStep}
          collapsed={stepIndicatorCollapsed}
        />
      </Animated.View>

      {/* 步骤内容 */}
      <View className="flex-1">
        {renderStepContent()}
        
        {/* 当选择了课程后显示下一步按钮 */}
        {state.currentStep === 4 && state.selectedCourse && (
          <View className="py-4 mt-4 border-t border-border">
            <Button
              onPress={() => {
                if (Platform.OS !== "web") {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                }
                router.push("/booking/confirm");
              }}
              fullWidth
              size="lg"
            >
              下一步：确认预约
            </Button>
          </View>
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.7,
  },
});
