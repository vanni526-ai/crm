import React from "react";
import { View, Text, TouchableOpacity, Platform, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { useUserRoles } from "@/src/hooks/use-user-roles";
import { ROLE_LABELS, ROLE_HOME_ROUTES, type UserRole } from "@/src/constants/roles";
import { useAuth } from "@/lib/auth-context";

/**
 * 身份选择页面
 * 
 * 多角色用户登录后显示此页面，让用户选择要使用的身份
 * 单角色用户不会看到此页面，直接进入对应的首页
 */
export default function RoleSelectionScreen() {
  const { roles, setCurrentRole, hasMultipleRoles } = useUserRoles();
  const { reLoginWithRole } = useAuth();
  const [isLoading, setIsLoading] = React.useState(false);

  // 如果是单角色用户，自动设置角色
  React.useEffect(() => {
    if (roles.length === 1) {
      const role = roles[0];
      setCurrentRole(role);
      // 不需要手动跳转，路由守卫会自动检测 currentRole 变化并跳转
    }
  }, [roles, setCurrentRole]);

  const handleSelectRole = async (role: UserRole) => {
    // 触觉反馈
    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    setIsLoading(true);
    
    // 使用重新登录机制切换角色
    const success = await reLoginWithRole(role);
    
    if (success) {
      // 重新登录成功，手动跳转到对应的首页
      console.log('[RoleSelection] Role switched successfully:', role);
      const homeRoute = ROLE_HOME_ROUTES[role];
      router.replace(homeRoute as any);
    } else {
      // 重新登录失败，显示错误提示
      console.error('[RoleSelection] Failed to switch role:', role);
      setIsLoading(false);
    }
  };

  return (
    <ScreenContainer className="p-6">
      <View className="flex-1 justify-center">
        {/* 标题 */}
        <View className="mb-8">
          <Text className="text-3xl font-bold text-foreground text-center mb-2">
            选择您的身份
          </Text>
          <Text className="text-base text-muted text-center">
            请选择您要使用的身份进入系统
          </Text>
        </View>

        {/* 角色选项 */}
        {roles.length === 0 || isLoading ? (
          <View className="items-center">
            <ActivityIndicator size="large" />
            <Text className="text-sm text-muted mt-4">{isLoading ? '正在切换身份...' : '加载中...'}</Text>
          </View>
        ) : (
          <View className="gap-4">
            {roles.map((role) => (
              <TouchableOpacity
                key={role}
                onPress={() => handleSelectRole(role)}
                className="bg-surface rounded-2xl p-6 border border-border active:opacity-70"
              >
                <Text className="text-xl font-semibold text-foreground text-center">
                  {ROLE_LABELS[role]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* 提示信息 */}
        <View className="mt-8">
          <Text className="text-sm text-muted text-center">
            您可以在"我的"页面随时切换身份
          </Text>
        </View>
      </View>
    </ScreenContainer>
  );
}
