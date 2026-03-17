import { View, Text } from "react-native";
import { Image } from "expo-image";
import { cn } from "@/lib/utils";

type AvatarSize = "sm" | "md" | "lg" | "xl";

interface AvatarProps {
  src?: string | null;
  name?: string;
  size?: AvatarSize;
  className?: string;
}

const sizeStyles: Record<AvatarSize, { container: string; text: string; dimension: number }> = {
  sm: { container: "w-8 h-8", text: "text-xs", dimension: 32 },
  md: { container: "w-12 h-12", text: "text-base", dimension: 48 },
  lg: { container: "w-16 h-16", text: "text-xl", dimension: 64 },
  xl: { container: "w-24 h-24", text: "text-3xl", dimension: 96 },
};

// 默认头像占位符
function AvatarPlaceholder({ name, size }: { name?: string; size: AvatarSize }) {
  const initial = name ? name.charAt(0).toUpperCase() : "?";
  const styles = sizeStyles[size];

  return (
    <View
      className={cn(
        "rounded-full bg-primary/20 items-center justify-center",
        styles.container
      )}
    >
      <Text className={cn("font-semibold text-primary", styles.text)}>
        {initial}
      </Text>
    </View>
  );
}

export function Avatar({ src, name, size = "md", className }: AvatarProps) {
  const styles = sizeStyles[size];

  // 调试日志：输出头像信息
  console.log(`[Avatar] name=${name}, src=${src}, size=${size}`);

  if (!src) {
    console.log(`[Avatar] 使用占位符: ${name}`);
    return (
      <View className={className}>
        <AvatarPlaceholder name={name} size={size} />
      </View>
    );
  }

  return (
    <View className={className}>
      <Image
        source={{ uri: src }}
        style={{
          width: styles.dimension,
          height: styles.dimension,
          borderRadius: styles.dimension / 2,
        }}
        contentFit="cover"
        // 启用磁盘缓存，优先使用缓存
        cachePolicy="memory-disk"
        // 加载时显示占位符
        placeholder={{ blurhash: "L5H2EC=PM+yV+~WBVZRi},Rj}+WB" }}
        // 渐变过渡效果
        transition={200}
        // 错误时显示占位符
        onError={(error) => {
          console.error(`[Avatar] 头像加载失败: ${src}`, error);
        }}
        onLoad={() => {
          console.log(`[Avatar] 头像加载成功: ${src}`);
        }}
      />
    </View>
  );
}
