import { Text, View } from "react-native";
import { cn } from "@/lib/utils";

type TagVariant = "default" | "s" | "m" | "sw" | "beginner" | "advanced" | "custom" | "script";

interface TagProps {
  children: React.ReactNode;
  variant?: TagVariant;
  className?: string;
}

const variantStyles: Record<TagVariant, string> = {
  default: "bg-muted/20",
  s: "bg-tagS/20",
  m: "bg-tagM/20",
  sw: "bg-tagSW/20",
  beginner: "bg-levelBeginner/20",
  advanced: "bg-levelAdvanced/20",
  custom: "bg-levelCustom/20",
  script: "bg-levelScript/20",
};

const variantTextStyles: Record<TagVariant, string> = {
  default: "text-muted",
  s: "text-tagS",
  m: "text-tagM",
  sw: "text-tagSW",
  beginner: "text-levelBeginner",
  advanced: "text-levelAdvanced",
  custom: "text-levelCustom",
  script: "text-levelScript",
};

export function Tag({ children, variant = "default", className }: TagProps) {
  return (
    <View
      className={cn(
        "px-2 py-1 rounded-md self-start",
        variantStyles[variant],
        className
      )}
    >
      <Text
        className={cn(
          "text-xs font-medium",
          variantTextStyles[variant]
        )}
      >
        {children}
      </Text>
    </View>
  );
}

// 老师属性标签
export function TeacherTypeTag({ type }: { type: string }) {
  const normalizedType = type.toLowerCase();
  let variant: TagVariant = "default";
  let label = type;

  if (normalizedType === "s") {
    variant = "s";
    label = "S";
  } else if (normalizedType === "m") {
    variant = "m";
    label = "M";
  } else if (normalizedType === "sw") {
    variant = "sw";
    label = "SW";
  }

  return <Tag variant={variant}>{label}</Tag>;
}

// 课程程度标签
export function CourseLevelTag({ level }: { level: string }) {
  let variant: TagVariant = "default";
  let label = level;

  if (level === "入门" || level === "beginner") {
    variant = "beginner";
    label = "入门";
  } else if (level === "深度" || level === "advanced") {
    variant = "advanced";
    label = "深度";
  } else if (level === "订制" || level === "custom") {
    variant = "custom";
    label = "订制";
  } else if (level === "剧本" || level === "script") {
    variant = "script";
    label = "剧本";
  }

  return <Tag variant={variant}>{label}</Tag>;
}
