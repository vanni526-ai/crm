import { View, Text, ScrollView, TextInput, Pressable, StyleSheet, Platform, KeyboardAvoidingView, Alert } from "react-native";
import { Image } from "expo-image";
import { useState } from "react";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { Button } from "@/components/ui/button";
import { useColors } from "@/hooks/use-colors";
import { api } from "@/lib/sdk/api-client";
import { useAuth } from "@/lib/auth-context";

export default function RegisterScreen() {
  const router = useRouter();
  const colors = useColors();
  const { checkAuth } = useAuth();
  
  const [phone, setPhone] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // 验证手机号格式
  const validatePhone = (phone: string): boolean => {
    return /^1[3-9]\d{9}$/.test(phone);
  };

  // 发送验证码
  const handleSendCode = () => {
    setError("");
    
    if (!phone.trim()) {
      setError("请输入手机号");
      return;
    }
    
    if (!validatePhone(phone)) {
      setError("请输入正确的手机号");
      return;
    }
    
    // 模拟发送验证码（实际使用固定验证码 123456）
    setCodeSent(true);
    setCountdown(60);
    
    // 显示提示
    if (Platform.OS === "web") {
      alert("验证码已发送！\n\n测试验证码：123456");
    } else {
      Alert.alert("验证码已发送", "测试验证码：123456");
    }
    
    // 倒计时
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // 处理注册
  const handleRegister = async () => {
    setError("");

    // 前端验证
    if (!phone.trim()) {
      setError("请输入手机号");
      return;
    }
    
    if (!validatePhone(phone)) {
      setError("请输入正确的手机号");
      return;
    }
    
    if (!verificationCode.trim()) {
      setError("请输入验证码");
      return;
    }
    
    // 验证验证码（固定为 123456）
    if (verificationCode.trim() !== "123456") {
      setError("验证码错误");
      return;
    }
    
    if (!password) {
      setError("请输入密码");
      return;
    }
    
    if (password.length < 6) {
      setError("密码至少6位");
      return;
    }
    
    if (password.length > 20) {
      setError("密码最多20位");
      return;
    }
    
    if (password !== confirmPassword) {
      setError("两次密码输入不一致");
      return;
    }

    setLoading(true);

    try {
      const result = await api.auth.register({
        phone: phone.trim(),
        password,
      });

      if (result.success) {
        // 注册成功，检查认证状态
        await checkAuth();
        
        // 显示成功提示
        if (Platform.OS === "web") {
          alert("注册成功！");
          // Web端直接跳转
          router.replace("/(tabs)");
        } else {
          Alert.alert("成功", "注册成功！", [
            { 
              text: "确定", 
              onPress: () => {
                // 移除 dismissAll 调用，避免 POP_TO_TOP 错误
                router.replace("/(tabs)");
              }
            }
          ]);
        }
      } else {
        setError(result.error || "注册失败，请重试");
      }
    } catch (err: any) {
      console.error("Register error:", err);
      const errorMessage = err.message || "注册失败，请重试";
      
      // 显示错误提示
      if (Platform.OS === "web") {
        alert(errorMessage);
      } else {
        Alert.alert("注册失败", errorMessage);
      }
      
      setError(errorMessage);
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
              <Text className="text-3xl font-bold text-foreground">注册账号</Text>
              <Text className="text-base text-muted mt-2 text-center">
                创建新账号开始预约课程
              </Text>
            </View>

            {/* 错误提示 */}
            {error && error !== "" && (
              <View className="bg-error/10 rounded-xl p-4 mb-6">
                <Text className="text-error text-center">{error}</Text>
              </View>
            )}

            {/* 注册表单 */}
            <View className="gap-4 mb-6">
              {/* 手机号输入框 */}
              <View>
                <Text className="text-sm font-medium text-foreground mb-2">手机号</Text>
                <TextInput
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="请输入手机号"
                  placeholderTextColor={colors.muted}
                  keyboardType="phone-pad"
                  maxLength={11}
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

              {/* 验证码输入框 */}
              <View>
                <Text className="text-sm font-medium text-foreground mb-2">验证码</Text>
                <View className="flex-row gap-2">
                  <TextInput
                    value={verificationCode}
                    onChangeText={setVerificationCode}
                    placeholder="请输入验证码"
                    placeholderTextColor={colors.muted}
                    keyboardType="number-pad"
                    maxLength={6}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="next"
                    style={[
                      styles.input,
                      { 
                        flex: 1,
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                        color: colors.foreground,
                      }
                    ]}
                  />
                  <Pressable
                    onPress={handleSendCode}
                    disabled={countdown > 0}
                    style={({ pressed }) => [
                      styles.codeButton,
                      {
                        backgroundColor: countdown > 0 ? colors.surface : colors.primary,
                        opacity: pressed ? 0.8 : 1,
                      }
                    ]}
                  >
                    <Text 
                      style={{
                        color: countdown > 0 ? colors.muted : '#FFFFFF',
                        fontSize: 14,
                        fontWeight: '600',
                      }}
                    >
                      {countdown > 0 ? `${countdown}s` : '发送验证码'}
                    </Text>
                  </Pressable>
                </View>
              </View>

              {/* 密码输入框 */}
              <View>
                <Text className="text-sm font-medium text-foreground mb-2">密码</Text>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="请输入密码(6-20位)"
                  placeholderTextColor={colors.muted}
                  secureTextEntry
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

              {/* 确认密码输入框 */}
              <View>
                <Text className="text-sm font-medium text-foreground mb-2">确认密码</Text>
                <TextInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="请再次输入密码"
                  placeholderTextColor={colors.muted}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="done"
                  onSubmitEditing={handleRegister}
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

            {/* 注册按钮 */}
            <Button
              onPress={handleRegister}
              disabled={loading || !phone.trim() || !password || !confirmPassword}
              fullWidth
              size="lg"
            >
              {loading ? "注册中..." : "注 册"}
            </Button>

            {/* 已有账号 */}
            <View className="mt-4 items-center">
              <Pressable
                onPress={() => router.back()}
                style={({ pressed }) => [pressed && { opacity: 0.7 }]}
              >
                <Text className="text-sm text-primary">已有账号？去登录</Text>
              </Pressable>
            </View>

            {/* 底部说明 */}
            <View className="mt-10 items-center">
              <View className="bg-surface rounded-xl p-4 w-full">
                <Text className="text-sm text-muted text-center leading-5">
                  💡 温馨提示{"\n\n"}
                  请使用真实手机号注册，以便接收预约通知。{"\n"}
                  密码长度为6-20位，请妥善保管。
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  input: {
    height: 52,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  codeButton: {
    height: 52,
    paddingHorizontal: 16,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 110,
  },
});
