import { View, Text } from "react-native";
import { cn } from "@/lib/utils";

interface Step {
  id: number;
  title: string;
}

interface StepIndicatorProps {
  steps: Step[];
  currentStep: number;
  className?: string;
}

export function StepIndicator({ steps, currentStep, className }: StepIndicatorProps) {
  return (
    <View className={cn("flex-row items-center justify-center", className)}>
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
    </View>
  );
}
