import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { Ionicons } from "@expo/vector-icons";
import errorLogger from "@/lib/error-logger";

export default function SalesToolsScreen() {
  const colors = useColors();

  return (
    <ScreenContainer className="bg-background">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <View className="p-6 gap-4">
          <View className="flex-row items-center mb-2">
            <TouchableOpacity onPress={() => router.back()} className="mr-3 active:opacity-70">
              <Ionicons name="arrow-back" size={24} color={colors.foreground} />
            </TouchableOpacity>
            <Text className="text-2xl font-bold text-foreground">销售工具</Text>
          </View>

          <View className="items-center justify-center py-20">
            <Ionicons name="construct-outline" size={48} color={colors.muted} />
            <Text className="text-lg font-semibold text-foreground mt-4">销售工具箱</Text>
            <Text className="text-sm text-muted mt-2 text-center">更多销售辅助工具正在开发中，敬请期待</Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
