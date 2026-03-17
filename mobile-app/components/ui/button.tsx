import { Text, Pressable, ActivityIndicator, StyleSheet, Platform, View } from "react-native";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/use-colors";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps {
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  onPress?: () => void;
  fullWidth?: boolean;
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  onPress,
  fullWidth = false,
}: ButtonProps) {
  const colors = useColors();

  const handlePress = () => {
    if (disabled || loading) return;
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress?.();
  };

  // 根据variant获取背景色
  const getBackgroundColor = () => {
    switch (variant) {
      case "primary":
        return colors.primary;
      case "secondary":
        return colors.surface;
      case "outline":
        return "transparent";
      case "ghost":
        return "transparent";
      default:
        return colors.primary;
    }
  };

  // 根据variant获取文字颜色
  const getTextColor = () => {
    switch (variant) {
      case "primary":
        return "#FFFFFF";
      case "secondary":
        return colors.foreground;
      case "outline":
        return colors.primary;
      case "ghost":
        return colors.primary;
      default:
        return "#FFFFFF";
    }
  };

  // 根据variant获取边框颜色
  const getBorderColor = () => {
    switch (variant) {
      case "secondary":
        return colors.border;
      case "outline":
        return colors.primary;
      default:
        return "transparent";
    }
  };

  // 根据size获取padding
  const getPadding = () => {
    switch (size) {
      case "sm":
        return { paddingHorizontal: 12, paddingVertical: 8 };
      case "md":
        return { paddingHorizontal: 16, paddingVertical: 12 };
      case "lg":
        return { paddingHorizontal: 24, paddingVertical: 16 };
      default:
        return { paddingHorizontal: 16, paddingVertical: 12 };
    }
  };

  // 根据size获取字体大小
  const getFontSize = () => {
    switch (size) {
      case "sm":
        return 14;
      case "md":
        return 16;
      case "lg":
        return 18;
      default:
        return 16;
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: getBackgroundColor(),
          borderColor: getBorderColor(),
          borderWidth: variant === "outline" || variant === "secondary" ? 1 : 0,
          ...getPadding(),
        },
        fullWidth && styles.fullWidth,
        pressed && styles.pressed,
        (disabled || loading) && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === "primary" ? "#FFFFFF" : colors.primary}
        />
      ) : (
        <Text
          style={[
            styles.text,
            {
              color: getTextColor(),
              fontSize: getFontSize(),
            },
          ]}
        >
          {children}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
  },
  fullWidth: {
    width: "100%",
  },
  text: {
    fontWeight: "600",
  },
  pressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.9,
  },
  disabled: {
    opacity: 0.5,
  },
});
