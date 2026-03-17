import { View, Text, Pressable, Platform } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";

/**
 * 加入我们 - 选择页面
 * 提供三个选项：成为老师、成为合伙人、成为员工
 */
export default function JoinUsScreen() {
  const router = useRouter();
  const colors = useColors();

  const options = [
    {
      id: "teacher",
      title: "成为老师",
      icon: "👨‍🏫",
      description: "分享您的专业知识，帮助学员成长",
      route: "/join-us/apply?type=teacher",
    },
    {
      id: "partner",
      title: "成为合伙人",
      icon: "🤝",
      description: "共同开拓市场，分享事业成功",
      route: "/join-us/apply?type=partner",
    },
    {
      id: "employee",
      title: "成为员工",
      icon: "💼",
      description: "加入我们的团队，共创美好未来",
      route: "/join-us/apply?type=employee",
    },
  ];

  const handleOptionPress = (route: string) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push(route as any);
  };

  return (
    <ScreenContainer className="flex-1 p-4">
      {/* 标题 */}
      <View className="mb-6">
        <Text className="text-2xl font-bold text-foreground">加入我们</Text>
        <Text className="text-sm text-muted mt-2">
          选择您感兴趣的方式，开启新的旅程
        </Text>
      </View>

      {/* 选项列表 */}
      <View className="gap-4">
        {options.map((option) => (
          <Pressable
            key={option.id}
            onPress={() => handleOptionPress(option.route)}
            style={({ pressed }) => [
              {
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <View className="bg-surface rounded-xl p-6 border border-border">
              <View className="flex-row items-center mb-3">
                <Text className="text-4xl mr-3">{option.icon}</Text>
                <Text className="text-xl font-bold text-foreground">
                  {option.title}
                </Text>
              </View>
              <Text className="text-sm text-muted leading-relaxed">
                {option.description}
              </Text>
              <View className="mt-4 flex-row items-center">
                <Text className="text-sm text-primary font-medium">
                  立即申请
                </Text>
                <Text className="text-primary ml-1">›</Text>
              </View>
            </View>
          </Pressable>
        ))}
      </View>

      {/* 提示信息 */}
      <View className="mt-8 bg-primary/10 rounded-xl p-4">
        <Text className="text-sm text-foreground leading-relaxed">
          💡 提示：提交申请后，我们会在1-3个工作日内与您联系，请保持手机畅通。
        </Text>
      </View>
    </ScreenContainer>
  );
}
