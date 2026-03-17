import { View, Text, TextInput, KeyboardAvoidingView, Platform, ScrollView, Pressable, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { useState } from "react";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ScreenContainer } from "@/components/screen-container";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { useColors } from "@/hooks/use-colors";
import { parseRoles, ROLE_HOME_ROUTES } from "@/src/constants/roles";
export default function LoginScreen() {
  const router = useRouter();
  const { login, state, clearError } = useAuth();
  const colors = useColors();
  
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      return;
    }
    
    setLoading(true);
    clearError();

    try {
      const success = await login(username.trim(), password);
      if (success) {
        // 移除 dismissAll 调用，避免 POP_TO_TOP 错误
        
        // 从 AsyncStorage 读取用户信息（确保获取最新数据）
        const userInfoStr = await AsyncStorage.getItem("auth_user_info");
        if (userInfoStr) {
          const user = JSON.parse(userInfoStr);
          const rolesStr = user.roles || user.role || "user";
          const roles = parseRoles(rolesStr);
          
          console.log('[Login] User roles:', rolesStr);
          console.log('[Login] Parsed roles:', roles);
          console.log('[Login] Roles count:', roles.length);
          
          if (roles.length === 1) {
            // 单角色用户，直接进入对应首页
            const homeRoute = ROLE_HOME_ROUTES[roles[0]];
            console.log('[Login] Single role, navigating to:', homeRoute);
            router.replace(homeRoute as any);
          } else if (roles.length > 1) {
            // 多角色用户，跳转到身份选择页面
            console.log('[Login] Multiple roles, navigating to role selection');
            router.replace("/role-selection");
          } else {
            // 没有角色，默认跳转到学员首页
            console.log('[Login] No roles, navigating to default home');
            router.replace("/(tabs)");
          }
        } else {
          // 没有用户信息，默认跳转到学员首页
          console.log('[Login] No user info, navigating to default home');
          router.replace("/(tabs)");
        }
      }
    } catch (error) {
      console.error("Login error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer edges={["top", "left", "right", "bottom"]}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="flex-1 justify-center p-6">
            {/* Logo和标题 */}
            <View className="items-center mb-10">
              <View className="w-32 h-32 items-center justify-center mb-6">
                <Image
                  source={require("@/assets/images/icon.png")}
                  style={{ width: 128, height: 128 }}
                  contentFit="contain"
                  transition={200}
                  priority="high"
                  cachePolicy="memory-disk"
                />
              </View>
              <Text className="text-3xl font-bold text-foreground">课程预约</Text>
              <Text className="text-base text-muted mt-2 text-center">
                登录您的账号开始预约课程
              </Text>
            </View>

            {/* 错误提示 */}
            {state.error && state.error !== "" && (
              <View className="bg-error/10 rounded-xl p-4 mb-6">
                <Text className="text-error text-center">{state.error}</Text>
              </View>
            )}

            {/* 登录表单 */}
            <View className="gap-4 mb-6">
              {/* 用户名输入框 */}
              <View>
                <Text className="text-sm font-medium text-foreground mb-2">手机号/用户名</Text>
                <TextInput
                  value={username}
                  onChangeText={setUsername}
                  placeholder="请输入手机号或用户名"
                  placeholderTextColor={colors.muted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  style={[
                    styles.input,
                    { 
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      color: colors.foreground,
                    }
                  ]}
                />
              </View>

              {/* 密码输入框 */}
              <View>
                <Text className="text-sm font-medium text-foreground mb-2">密码</Text>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="请输入密码"
                  placeholderTextColor={colors.muted}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                  style={[
                    styles.input,
                    { 
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      color: colors.foreground,
                    }
                  ]}
                />
              </View>
            </View>

            {/* 登录按钮 */}
            <Button
              onPress={handleLogin}
              disabled={loading || !username.trim() || !password.trim()}
              fullWidth
              size="lg"
            >
              {loading ? "登录中..." : "登 录"}
            </Button>

            {/* 忘记密码 & 注册 */}
            <View className="mt-4 flex-row justify-center items-center gap-6">
              <Pressable
                onPress={() => router.push("/forgot-password")}
                style={({ pressed }) => [pressed && { opacity: 0.7 }]}
              >
                <Text className="text-sm text-primary">忘记密码？</Text>
              </Pressable>
              <Text className="text-sm text-muted">|</Text>
              <Pressable
                onPress={() => router.push("/register")}
                style={({ pressed }) => [pressed && { opacity: 0.7 }]}
              >
                <Text className="text-sm text-primary">注册账号</Text>
              </Pressable>
            </View>


          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  logoShadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
  },
});
