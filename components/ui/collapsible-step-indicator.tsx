import { View, Text } from "react-native";
import Animated, { useAnimatedStyle, withTiming, interpolate } from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";
import { cn } from "@/lib/utils";

interface Step {
  id: number;
  title: string;
}

interface CollapsibleStepIndicatorProps {
  steps: Step[];
  currentStep: number;
  /** 0 = 完全展开, 1 = 完全收起 */
  collapsed: SharedValue<number>;
  className?: string;
}

export function CollapsibleStepIndicator({ 
  steps, 
  currentStep, 
  collapsed,
  className 
}: CollapsibleStepIndicatorProps) {
  // 完整步骤指示器的动画样式
  const fullIndicatorStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(collapsed.value, [0, 1], [1, 0]),
      transform: [
        { scale: interpolate(collapsed.value, [0, 1], [1, 0.8]) }
      ],
    };
  });

  // 精简指示器的动画样式
  const compactIndicatorStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(collapsed.value, [0, 1], [0, 1]),
      transform: [
        { scale: interpolate(collapsed.value, [0, 1], [0.8, 1]) }
      ],
    };
  });

  const currentStepInfo = steps.find(s => s.id === currentStep);
  const completedCount = steps.filter(s => s.id < currentStep).length;

  return (
    <View className={cn("relative", className)}>
      {/* 完整步骤指示器 */}
      <Animated.View 
        style={[fullIndicatorStyle]}
        className="flex-row items-center justify-center"
      >
        {steps.map((step, index) => {
          const isActive = step.id === currentStep;
          const isCompleted = step.id < currentStep;
          const isLast = index === steps.length - 1;

          return (
            <View key={step.id} className="flex-row items-center">
              {/* 步骤圆点 */}
              <View className="items-center">
                <View
                  className={cn(
                    "w-8 h-8 rounded-full items-center justify-center",
                    isActive && "bg-primary",
                    isCompleted && "bg-primary",
                    !isActive && !isCompleted && "bg-muted/30"
                  )}
                >
                  {isCompleted ? (
                    <Text className="text-white text-sm font-bold">✓</Text>
                  ) : (
                    <Text
                      className={cn(
                        "text-sm font-bold",
                        isActive ? "text-white" : "text-muted"
                      )}
                    >
                      {step.id}
                    </Text>
                  )}
                </View>
                <Text
                  className={cn(
                    "text-xs mt-1 text-center",
                    isActive ? "text-primary font-medium" : "text-muted"
                  )}
                  numberOfLines={1}
                >
                  {step.title}
                </Text>
              </View>

              {/* 连接线 */}
              {!isLast && (
                <View
                  className={cn(
                    "h-0.5 w-8 mx-1",
                    isCompleted ? "bg-primary" : "bg-muted/30"
                  )}
                />
              )}
            </View>
          );
        })}
      </Animated.View>

      {/* 精简步骤指示器 */}
      <Animated.View 
        style={[compactIndicatorStyle]}
        className="absolute inset-0 items-center justify-center"
      >
        <View className="flex-row items-center gap-2">
          <View className="flex-row items-center gap-1">
            {Array.from({ length: steps.length }).map((_, index) => {
              const stepNum = index + 1;
              const isCompleted = stepNum < currentStep;
              const isActive = stepNum === currentStep;
              
              return (
                <View
                  key={stepNum}
                  className={cn(
                    "w-2 h-2 rounded-full",
                    isActive && "bg-primary",
                    isCompleted && "bg-primary",
                    !isActive && !isCompleted && "bg-muted/30"
                  )}
                />
              );
            })}
          </View>
          <Text className="text-sm font-medium text-foreground">
            步骤 {currentStep}/{steps.length}
          </Text>
          {currentStepInfo && (
            <Text className="text-sm text-muted">
              {currentStepInfo.title}
            </Text>
          )}
        </View>
      </Animated.View>
    </View>
  );
}
