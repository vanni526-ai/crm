import { View, Pressable, StyleSheet, Platform } from "react-native";
import * as Haptics from "expo-haptics";
import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onPress?: () => void;
  selected?: boolean;
  disabled?: boolean;
}

export function Card({
  children,
  className,
  onPress,
  selected = false,
  disabled = false,
}: CardProps) {
  const handlePress = () => {
    if (disabled) return;
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress?.();
  };

  if (onPress) {
    return (
      <Pressable
        onPress={handlePress}
        disabled={disabled}
        style={({ pressed }) => [
          pressed && styles.pressed,
          disabled && styles.disabled,
        ]}
        className={cn(
          "bg-surface rounded-2xl p-4 border",
          selected ? "border-primary border-2" : "border-border",
          className
        )}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View
      className={cn(
        "bg-surface rounded-2xl p-4 border border-border",
        className
      )}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.5,
  },
});
