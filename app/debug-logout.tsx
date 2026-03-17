import { useEffect } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";

/**
 * 调试页面：清除所有登录信息并跳转到登录页
 */
export default function DebugLogoutScreen() {
  useEffect(() => {
    const logout = async () => {
      try {
        // 清除所有相关的存储
        await AsyncStorage.multiRemove([
          "auth_user_info",
          "user",
          "current_role",
          "auth_token",
        ]);
        
        console.log("已清除所有登录信息");
        
        // 延迟1秒后跳转到登录页
        setTimeout(() => {
          router.replace("/login");
        }, 1000);
      } catch (error) {
        console.error("清除登录信息失败:", error);
      }
    };

    logout();
  }, []);

  return (
    <ScreenContainer className="justify-center items-center">
      <ActivityIndicator size="large" />
      <Text className="text-base text-muted mt-4">正在退出登录...</Text>
    </ScreenContainer>
  );
}
