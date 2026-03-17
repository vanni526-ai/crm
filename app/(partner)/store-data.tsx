import { View, Text, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";

/**
 * 门店数据页面（待开发）
 */
export default function StoreDataScreen() {
  const colors = useColors();

  return (
    <ScreenContainer className="bg-background">
      <View className="p-6">
        {/* 返回按钮 */}
        <TouchableOpacity
          onPress={() => router.back()}
          className="flex-row items-center mb-6"
        >
          <IconSymbol name="chevron.left" size={24} color={colors.foreground} />
          <Text className="text-lg font-semibold text-foreground ml-2">返回</Text>
        </TouchableOpacity>

        <View className="flex-1 items-center justify-center">
          <Text className="text-6xl mb-4">🏢</Text>
          <Text className="text-xl font-semibold text-foreground mb-2">
            门店数据
          </Text>
          <Text className="text-base text-muted">
            功能开发中，敬请期待
          </Text>
        </View>
      </View>
    </ScreenContainer>
  );
}
