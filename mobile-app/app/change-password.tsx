import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Platform,
  Alert,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { createApiClient } from "@/lib/sdk/api-client";

export default function ChangePasswordScreen() {
  const router = useRouter();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChangePassword = async () => {
    try {
      // 表单验证
      if (!oldPassword || !newPassword || !confirmPassword) {
        setError("请填写所有字段");
        return;
      }

      if (newPassword.length < 6) {
        setError("新密码长度不能少于6位");
        return;
      }

      if (newPassword !== confirmPassword) {
        setError("两次输入的新密码不一致");
        return;
      }

      if (oldPassword === newPassword) {
        setError("新密码不能与旧密码相同");
        return;
      }

      setLoading(true);
      setError("");

      const api = createApiClient();
      
      // 调用修改密码API
      const result = await api.auth.changePassword({
        oldPassword,
        newPassword,
      });

      if (!result.success) {
        throw new Error(result.error || "修改密码失败");
      }

      // 成功提示
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      
      if (Platform.OS === "web") {
        alert("密码修改成功，请重新登录");
        router.replace("/login");
      } else {
        Alert.alert("成功", "密码修改成功，请重新登录", [
          {
            text: "确定",
            onPress: () => router.replace("/login"),
          },
        ]);
      }
    } catch (err: any) {
      console.error("[ChangePassword] Error:", err);
      setError(err.message || "修改密码失败");
      
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer className="p-6">
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* 返回按钮 */}
        <TouchableOpacity
          onPress={() => {
            if (Platform.OS !== "web") {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
            router.back();
          }}
          className="mb-6"
          activeOpacity={0.6}
        >
          <Text className="text-primary text-base">← 返回</Text>
        </TouchableOpacity>

        {/* 页面标题 */}
        <Text className="text-2xl font-bold text-foreground mb-2">
          修改密码
        </Text>
        <Text className="text-sm text-muted mb-8">
          为了您的账户安全，请定期修改密码
        </Text>

        {/* 错误提示 */}
        {error ? (
          <View className="bg-error/10 border border-error rounded-lg p-4 mb-6">
            <Text className="text-error text-sm">{error}</Text>
          </View>
        ) : null}

        {/* 旧密码输入框 */}
        <View className="mb-4">
          <Text className="text-sm font-medium text-foreground mb-2">
            旧密码
          </Text>
          <TextInput
            value={oldPassword}
            onChangeText={setOldPassword}
            placeholder="请输入旧密码"
            placeholderTextColor="#9BA1A6"
            secureTextEntry
            autoCapitalize="none"
            className="bg-surface border border-border rounded-lg px-4 py-3 text-foreground"
          />
        </View>

        {/* 新密码输入框 */}
        <View className="mb-4">
          <Text className="text-sm font-medium text-foreground mb-2">
            新密码
          </Text>
          <TextInput
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="请输入新密码（至少6位）"
            placeholderTextColor="#9BA1A6"
            secureTextEntry
            autoCapitalize="none"
            className="bg-surface border border-border rounded-lg px-4 py-3 text-foreground"
          />
        </View>

        {/* 确认新密码输入框 */}
        <View className="mb-6">
          <Text className="text-sm font-medium text-foreground mb-2">
            确认新密码
          </Text>
          <TextInput
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="请再次输入新密码"
            placeholderTextColor="#9BA1A6"
            secureTextEntry
            autoCapitalize="none"
            className="bg-surface border border-border rounded-lg px-4 py-3 text-foreground"
          />
        </View>

        {/* 密码强度提示 */}
        <View className="bg-surface rounded-lg p-4 mb-6">
          <Text className="text-sm font-medium text-foreground mb-2">
            密码要求：
          </Text>
          <Text className="text-sm text-muted">• 长度至少6位</Text>
          <Text className="text-sm text-muted">• 建议包含字母、数字和特殊字符</Text>
          <Text className="text-sm text-muted">• 不要使用过于简单的密码</Text>
        </View>

        {/* 提交按钮 */}
        <TouchableOpacity
          onPress={handleChangePassword}
          disabled={loading}
          className="bg-primary rounded-lg py-4 items-center"
          activeOpacity={0.7}
          style={{ opacity: loading ? 0.7 : 1 }}
        >
          <Text className="text-white text-base font-semibold">
            {loading ? "修改中..." : "确认修改"}
          </Text>
        </TouchableOpacity>

        {/* 安全提示 */}
        <View className="mt-6 p-4 bg-surface rounded-lg">
          <Text className="text-sm text-muted">
            💡 温馨提示：修改密码后需要重新登录
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
