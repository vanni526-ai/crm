import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import api from "@/lib/sdk/api";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const colors = useColors();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // 发送验证码
  const handleSendCode = () => {
    // 验证手机号
    if (!phone) {
      if (Platform.OS === "web") {
        alert("请输入手机号");
      } else {
        Alert.alert("提示", "请输入手机号");
      }
      return;
    }

    if (!/^1[3-9]\d{9}$/.test(phone)) {
      if (Platform.OS === "web") {
        alert("请输入正确的手机号格式");
      } else {
        Alert.alert("提示", "请输入正确的手机号格式");
      }
      return;
    }

    // 模拟发送验证码
    if (Platform.OS === "web") {
      alert("测试验证码：123456");
    } else {
      Alert.alert("验证码已发送", "测试验证码：123456");
    }
    
    setCodeSent(true);
    setCountdown(60);

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

  // 重置密码
  const handleResetPassword = async () => {
    // 表单验证
    if (!phone) {
      if (Platform.OS === "web") {
        alert("请输入手机号");
      } else {
        Alert.alert("提示", "请输入手机号");
      }
      return;
    }

    if (!/^1[3-9]\d{9}$/.test(phone)) {
      if (Platform.OS === "web") {
        alert("请输入正确的手机号格式");
      } else {
        Alert.alert("提示", "请输入正确的手机号格式");
      }
      return;
    }

    if (!code) {
      if (Platform.OS === "web") {
        alert("请输入验证码");
      } else {
        Alert.alert("提示", "请输入验证码");
      }
      return;
    }

    if (code !== "123456") {
      if (Platform.OS === "web") {
        alert("验证码错误");
      } else {
        Alert.alert("提示", "验证码错误");
      }
      return;
    }

    if (!newPassword) {
      if (Platform.OS === "web") {
        alert("请输入新密码");
      } else {
        Alert.alert("提示", "请输入新密码");
      }
      return;
    }

    if (newPassword.length < 6) {
      if (Platform.OS === "web") {
        alert("密码长度至少6位");
      } else {
        Alert.alert("提示", "密码长度至少6位");
      }
      return;
    }

    if (newPassword !== confirmPassword) {
      if (Platform.OS === "web") {
        alert("两次输入的密码不一致");
      } else {
        Alert.alert("提示", "两次输入的密码不一致");
      }
      return;
    }

    setLoading(true);

    try {
      const result = await api.auth.resetPassword({
        phone,
        code,
        newPassword,
      });

      if (result.success) {
        if (Platform.OS === "web") {
          alert("密码重置成功，请使用新密码登录");
          router.replace("/login");
        } else {
          Alert.alert("成功", "密码重置成功，请使用新密码登录", [
            {
              text: "确定",
              onPress: () => {
                router.replace("/login");
              },
            },
          ]);
        }
      } else {
        if (Platform.OS === "web") {
          alert(result.error || "密码重置失败");
        } else {
          Alert.alert("失败", result.error || "密码重置失败");
        }
      }
    } catch (error) {
      if (Platform.OS === "web") {
        alert((error as Error).message || "密码重置失败");
      } else {
        Alert.alert("错误", (error as Error).message || "密码重置失败");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer edges={["top", "left", "right", "bottom"]}>
      <View style={styles.container}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Image
            source={require("@/assets/images/icon.png")}
            style={styles.logo}
            contentFit="contain"
            cachePolicy="memory-disk"
            priority="high"
            transition={200}
          />
          <Text style={[styles.title, { color: colors.foreground }]}>
            重置密码
          </Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            通过手机验证码重置您的密码
          </Text>
        </View>

        {/* 表单 */}
        <View style={styles.form}>
          {/* 手机号 */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.foreground }]}>
              手机号
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.surface,
                  color: colors.foreground,
                  borderColor: colors.border,
                },
              ]}
              placeholder="请输入手机号"
              placeholderTextColor={colors.muted}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              autoCapitalize="none"
              autoComplete="tel"
            />
          </View>

          {/* 验证码 */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.foreground }]}>
              验证码
            </Text>
            <View style={styles.codeInputContainer}>
              <TextInput
                style={[
                  styles.input,
                  styles.codeInput,
                  {
                    backgroundColor: colors.surface,
                    color: colors.foreground,
                    borderColor: colors.border,
                  },
                ]}
                placeholder="请输入验证码"
                placeholderTextColor={colors.muted}
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                autoCapitalize="none"
                maxLength={6}
              />
              <TouchableOpacity
                style={[
                  styles.codeButton,
                  {
                    backgroundColor: countdown > 0 ? colors.surface : colors.primary,
                  },
                ]}
                onPress={handleSendCode}
                disabled={countdown > 0}
              >
                <Text
                  style={[
                    styles.codeButtonText,
                    {
                      color: countdown > 0 ? colors.muted : "#FFFFFF",
                    },
                  ]}
                >
                  {countdown > 0 ? `${countdown}秒后重试` : "发送验证码"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 新密码 */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.foreground }]}>
              新密码
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.surface,
                  color: colors.foreground,
                  borderColor: colors.border,
                },
              ]}
              placeholder="请输入新密码（至少6位）"
              placeholderTextColor={colors.muted}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="password-new"
            />
          </View>

          {/* 确认密码 */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.foreground }]}>
              确认密码
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.surface,
                  color: colors.foreground,
                  borderColor: colors.border,
                },
              ]}
              placeholder="请再次输入新密码"
              placeholderTextColor={colors.muted}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="password-new"
            />
          </View>

          {/* 重置按钮 */}
          <TouchableOpacity
            style={[
              styles.resetButton,
              { backgroundColor: colors.primary },
              loading && styles.resetButtonDisabled,
            ]}
            onPress={handleResetPassword}
            disabled={loading}
          >
            <Text style={styles.resetButtonText}>
              {loading ? "重置中..." : "重置密码"}
            </Text>
          </TouchableOpacity>

          {/* 返回登录 */}
          <View style={styles.footer}>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={[styles.backToLogin, { color: colors.primary }]}>
                返回登录
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 48,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
  },
  form: {
    width: "100%",
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  codeInputContainer: {
    flexDirection: "row",
    gap: 12,
  },
  codeInput: {
    flex: 1,
  },
  codeButton: {
    height: 48,
    paddingHorizontal: 16,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 120,
  },
  codeButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  resetButton: {
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  resetButtonDisabled: {
    opacity: 0.6,
  },
  resetButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  footer: {
    marginTop: 24,
    alignItems: "center",
  },
  backToLogin: {
    fontSize: 14,
    fontWeight: "500",
  },
});
