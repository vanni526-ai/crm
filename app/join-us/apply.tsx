import { useState, useEffect } from "react";
import { View, Text, TextInput, ScrollView, Alert, Platform } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ScreenContainer } from "@/components/screen-container";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { createApiClient } from "@/lib/sdk/api-client";

const api = createApiClient();

// 申请类型映射
const TYPE_LABELS: Record<string, string> = {
  teacher: "成为老师",
  partner: "成为合伙人",
  employee: "成为员工",
};

// 提交限制的AsyncStorage key前缀
const LAST_SUBMIT_KEY_PREFIX = "join_us_last_submit_";

/**
 * 申请信息填写页面
 * 收集：姓名、手机号、所在城市、申请理由
 */
export default function ApplyScreen() {
  const router = useRouter();
  const { type } = useLocalSearchParams<{ type: string }>();
  const { user } = useAuth();
  
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [city, setCity] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    // 预填用户信息
    if (user) {
      setName(user.name || "");
      // 手机号需要用户手动输入
    }
  }, [user]);

  // 倒计时效果
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // 发送验证码
  const handleSendCode = async () => {
    if (!phone.trim()) {
      Alert.alert("提示", "请先输入手机号");
      return;
    }

    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(phone.trim())) {
      Alert.alert("提示", "请输入有效的手机号");
      return;
    }

    setSendingCode(true);
    try {
      // 模拟发送验证码（实际应该调用后端API）
      // 测试验证码固定为 123456
      await new Promise(resolve => setTimeout(resolve, 1000));
      setCountdown(60);
      Alert.alert("提示", "验证码已发送，测试验证码为：123456");
    } catch (error: any) {
      Alert.alert("发送失败", error.message || "网络错误，请稍后重试");
    } finally {
      setSendingCode(false);
    }
  };

  // 检查是否在24小时内提交过（基于手机号）
  const checkSubmitLimit = async (phoneNumber: string): Promise<boolean> => {
    try {
      const key = `${LAST_SUBMIT_KEY_PREFIX}${phoneNumber}`;
      const lastSubmitTime = await AsyncStorage.getItem(key);
      if (!lastSubmitTime) return true;

      const lastTime = parseInt(lastSubmitTime, 10);
      const now = Date.now();
      const hoursPassed = (now - lastTime) / (1000 * 60 * 60);

      if (hoursPassed < 24) {
        const hoursRemaining = Math.ceil(24 - hoursPassed);
        Alert.alert(
          "提交限制",
          `该手机号在24小时内已提交过申请，请${hoursRemaining}小时后再试。`,
          [{ text: "好的" }]
        );
        return false;
      }

      return true;
    } catch (error) {
      console.error("检查提交限制失败:", error);
      return true; // 出错时允许提交
    }
  };

  // 表单验证
  const validateForm = (): boolean => {
    if (!name.trim()) {
      Alert.alert("提示", "请输入姓名");
      return false;
    }

    if (!phone.trim()) {
      Alert.alert("提示", "请输入手机号");
      return false;
    }

    // 简单的手机号验证
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(phone.trim())) {
      Alert.alert("提示", "请输入有效的手机号");
      return false;
    }

    if (!city.trim()) {
      Alert.alert("提示", "请输入所在城市");
      return false;
    }

    if (!reason.trim()) {
      Alert.alert("提示", "请输入申请理由");
      return false;
    }
    if (reason.trim().length < 10) {
      Alert.alert("提示", "申请理由至少需要10个字");
      return false;
    }

    if (!verificationCode.trim()) {
      Alert.alert("提示", "请输入验证码");
      return false;
    }

    // 验证码校验（测试环境固定为123456）
    if (verificationCode.trim() !== "123456") {
      Alert.alert("提示", "验证码错误");
      return false;
    }

    return true;
  };

  // 提交申请
  const handleSubmit = async () => {
    console.log("[Apply] handleSubmit called");
    
    if (!validateForm()) {
      console.log("[Apply] Form validation failed");
      return;
    }

    // 检查提交限制（基于手机号）
    const canSubmit = await checkSubmitLimit(phone.trim());
    if (!canSubmit) {
      console.log("[Apply] Submit limit reached");
      return;
    }

    console.log("[Apply] Starting submission...");
    setSubmitting(true);

    try {
      const typeLabel = TYPE_LABELS[type || ""] || "加入我们";
      const content = `姓名：${name.trim()}\n手机号：${phone.trim()}\n所在城市：${city.trim()}\n申请理由：${reason.trim()}`;

      console.log("[Apply] Calling API with data:", {
        userId: user?.id || 0,
        userName: name.trim(),
        userPhone: phone.trim(),
        type: "application",
        title: typeLabel,
        content: content,
      });

      const result = await api.notifications.submit({
        userId: user?.id || 0,
        userName: name.trim(),
        userPhone: phone.trim(),
        type: "application",
        title: typeLabel,
        content: content,
      });

      console.log("[Apply] API result:", result);

      if (result.success) {
        // 记录提交时间（基于手机号）
        const key = `${LAST_SUBMIT_KEY_PREFIX}${phone.trim()}`;
        await AsyncStorage.setItem(key, Date.now().toString());

        // 显示成功提示
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        Alert.alert(
          "提交成功",
          "请保持手机畅通，我们会尽快与您联系",
          [
            {
              text: "好的",
              onPress: () => {
                // 返回"我的"页面
                router.replace("/(tabs)/profile");
              },
            },
          ]
        );
      }
    } catch (error: any) {
      console.error("提交申请失败:", error);
      Alert.alert("提交失败", error.message || "网络错误，请稍后重试");
    } finally {
      setSubmitting(false);
    }
  };

  const typeLabel = TYPE_LABELS[type || ""] || "加入我们";

  return (
    <ScreenContainer className="flex-1">
      <ScrollView 
        className="flex-1 p-4"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* 标题 */}
        <View className="mb-6">
          <Text className="text-2xl font-bold text-foreground">{typeLabel}</Text>
          <Text className="text-sm text-muted mt-2">
            请填写以下信息，我们会尽快与您联系
          </Text>
        </View>

        {/* 表单 */}
        <View className="gap-4">
          {/* 姓名 */}
          <View>
            <Text className="text-sm text-foreground font-medium mb-2">
              姓名 <Text className="text-error">*</Text>
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="请输入您的姓名"
              className="bg-surface border border-border rounded-xl px-4 py-3 text-foreground"
              placeholderTextColor="#9BA1A6"
              maxLength={50}
            />
          </View>

          {/* 手机号 */}
          <View>
            <Text className="text-sm text-foreground font-medium mb-2">
              手机号 <Text className="text-error">*</Text>
            </Text>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder="请输入您的手机号"
              keyboardType="phone-pad"
              className="bg-surface border border-border rounded-xl px-4 py-3 text-foreground"
              placeholderTextColor="#9BA1A6"
              maxLength={11}
            />
          </View>

          {/* 验证码 */}
          <View>
            <Text className="text-sm text-foreground font-medium mb-2">
              验证码 <Text className="text-error">*</Text>
            </Text>
            <View className="flex-row gap-2">
              <TextInput
                value={verificationCode}
                onChangeText={setVerificationCode}
                placeholder="请输入验证码"
                keyboardType="number-pad"
                className="flex-1 bg-surface border border-border rounded-xl px-4 py-3 text-foreground"
                placeholderTextColor="#9BA1A6"
                maxLength={6}
              />
              <View style={{ minWidth: 100 }}>
                <Button
                  onPress={handleSendCode}
                  disabled={sendingCode || countdown > 0}
                  variant="outline"
                >
                  {countdown > 0 ? `${countdown}秒` : sendingCode ? "发送中..." : "发送验证码"}
                </Button>
              </View>
            </View>
          </View>

          {/* 所在城市 */}
          <View>
            <Text className="text-sm text-foreground font-medium mb-2">
              所在城市 <Text className="text-error">*</Text>
            </Text>
            <TextInput
              value={city}
              onChangeText={setCity}
              placeholder="请输入您所在的城市"
              className="bg-surface border border-border rounded-xl px-4 py-3 text-foreground"
              placeholderTextColor="#9BA1A6"
              maxLength={50}
            />
          </View>

          {/* 申请理由 */}
          <View>
            <Text className="text-sm text-foreground font-medium mb-2">
              申请理由 <Text className="text-error">*</Text>
            </Text>
            <TextInput
              value={reason}
              onChangeText={setReason}
              placeholder="请简要说明您的申请理由（至少10个字）"
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              className="bg-surface border border-border rounded-xl px-4 py-3 text-foreground"
              placeholderTextColor="#9BA1A6"
              maxLength={500}
              style={{ minHeight: 120 }}
            />
            <Text className="text-xs text-muted mt-1">
              {reason.length}/500
            </Text>
          </View>
        </View>



        {/* 提交按钮 */}
        <View className="mt-6 mb-8">
          <Button
            onPress={handleSubmit}
            disabled={submitting}
            fullWidth
          >
            {submitting ? "提交中..." : "提交申请"}
          </Button>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
