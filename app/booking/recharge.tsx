import { View, Text, ScrollView, Alert, Platform, Pressable, StyleSheet, TextInput, Modal } from "react-native";
import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import api from "@/lib/sdk/api";
import { cn } from "@/lib/utils";

// 预设充值金额
const PRESET_AMOUNTS = [1000, 2000, 5000, 10000, 20000, 50000];

export default function RechargeScreen() {
  const router = useRouter();
  const [currentBalance, setCurrentBalance] = useState<number>(0);
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(true);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [processing, setProcessing] = useState(false);
  
  // 自定义弹窗状态
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    buttons: Array<{
      text: string;
      style?: "cancel" | "default" | "destructive";
      onPress?: () => void;
    }>;
  }>({
    visible: false,
    title: "",
    message: "",
    buttons: [],
  });

  // 显示弹窗（兼容Web和Native）
  const showAlert = (
    title: string,
    message: string,
    buttons: Array<{
      text: string;
      style?: "cancel" | "default" | "destructive";
      onPress?: () => void;
    }>
  ) => {
    if (Platform.OS === "web") {
      // Web端使用自定义Modal
      setAlertConfig({
        visible: true,
        title,
        message,
        buttons,
      });
    } else {
      // Native端使用原生Alert
      Alert.alert(title, message, buttons);
    }
  };

  const closeAlert = () => {
    setAlertConfig((prev) => ({ ...prev, visible: false }));
  };

  // 加载当前余额
  useEffect(() => {
    loadBalance();
  }, []);

  const loadBalance = async () => {
    try {
      setBalanceLoading(true);
      const result = await api.account.getMyBalance();
      if (result.success) {
        setCurrentBalance(parseFloat(result.data.balance));
        setCustomerId(result.data.customerId);
      }
    } catch (error) {
      console.error('[Recharge] Failed to load balance:', error);
    } finally {
      setBalanceLoading(false);
    }
  };

  // 获取实际充值金额
  const getRechargeAmount = () => {
    if (customAmount) {
      const amount = parseFloat(customAmount);
      return isNaN(amount) ? 0 : amount;
    }
    return selectedAmount || 0;
  };

  const handleSelectAmount = (amount: number) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedAmount(amount);
    setCustomAmount("");
  };

  const handleCustomAmountChange = (text: string) => {
    // 只允许输入数字和小数点
    const filtered = text.replace(/[^0-9.]/g, "");
    setCustomAmount(filtered);
    setSelectedAmount(null);
  };

  const handleRecharge = async () => {
    const amount = getRechargeAmount();

    if (amount <= 0) {
      showAlert("提示", "请选择或输入充值金额", [{ text: "确定" }]);
      return;
    }

    if (amount > 100000) {
      showAlert("提示", "单次充值金额不能超过10万元", [{ text: "确定" }]);
      return;
    }

    if (!customerId) {
      showAlert("错误", "无法获取客户信息，请重新登录", [{ text: "确定" }]);
      return;
    }

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    // 显示支付方式选择弹窗
    showAlert(
      "选择支付方式",
      `充值金额：￥${amount.toFixed(2)}\n请选择支付方式完成充值`,
      [
        { text: "取消", style: "cancel" },
        { 
          text: "微信支付", 
          onPress: () => performRecharge(amount, 'wechat')
        },
        { 
          text: "支付宝支付", 
          onPress: () => performRecharge(amount, 'alipay')
        },
      ]
    );
  };

  const performRecharge = async (amount: number, paymentMethod: 'wechat' | 'alipay') => {
    try {
      setProcessing(true);

      // 模拟支付流程（实际应该调用微信/支付宝SDK）
      const paymentMethodName = paymentMethod === 'wechat' ? '微信支付' : '支付宝支付';
      console.log(`[充值] 使用${paymentMethodName}充值 ￥${amount.toFixed(2)}`);
      
      // 模拟支付等待时间
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 调用后端充值接口
      const result = await api.account.recharge(customerId!, amount, `用户自助充值（${paymentMethodName}）`);

      if (result.success) {
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }

        // 刷新余额
        await loadBalance();

        // 显示成功提示
        showAlert(
          "充值成功",
          `已成功充值 ¥${amount.toFixed(2)}\n\n当前余额：¥${result.data.balanceAfter}`,
          [
            { 
              text: "好的", 
              onPress: () => router.back()
            },
          ]
        );

        // 清空输入
        setSelectedAmount(null);
        setCustomAmount("");
      } else {
        throw new Error(result.error || "充值失败");
      }
    } catch (error: any) {
      console.error('[Recharge] Failed:', error);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      showAlert("充值失败", error.message || "请稍后重试", [{ text: "确定" }]);
    } finally {
      setProcessing(false);
    }
  };



  const handleGoBack = () => {
    router.back();
  };

  const rechargeAmount = getRechargeAmount();

  return (
    <ScreenContainer className="p-4" edges={["top", "left", "right", "bottom"]}>
      {/* 自定义弹窗（Web兼容） */}
      {Platform.OS === "web" && (
        <Modal
          visible={alertConfig.visible}
          transparent
          animationType="fade"
          onRequestClose={closeAlert}
        >
          <View className="flex-1 items-center justify-center bg-black/50">
            <View className="bg-background rounded-2xl p-6 mx-8 max-w-sm w-full shadow-lg">
              <Text className="text-xl font-bold text-foreground text-center mb-2">
                {alertConfig.title}
              </Text>
              <Text className="text-muted text-center mb-6 leading-6">
                {alertConfig.message}
              </Text>
              <View className="gap-3">
                {alertConfig.buttons.map((button, index) => (
                  <Pressable
                    key={index}
                    onPress={() => {
                      closeAlert();
                      button.onPress?.();
                    }}
                    style={({ pressed }) => [
                      pressed && styles.pressed,
                    ]}
                  >
                    <View
                      className={cn(
                        "py-3 px-6 rounded-xl items-center",
                        button.style === "cancel" ? "bg-surface" : "bg-primary"
                      )}
                    >
                      <Text
                        className={cn(
                          "font-semibold text-base",
                          button.style === "cancel" ? "text-muted" : "text-white"
                        )}
                      >
                        {button.text}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        </Modal>
      )}
      
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* 标题 */}
        <Text className="text-2xl font-bold text-foreground mb-6">
          账户充值
        </Text>

        {/* 当前余额 */}
        <Card className="mb-6">
          <View>
            <Text className="text-muted text-sm mb-2">当前余额</Text>
            <Text className="text-primary font-bold text-3xl">
              {balanceLoading ? "加载中..." : `¥${currentBalance.toFixed(2)}`}
            </Text>
          </View>
        </Card>

        {/* 选择充值金额 */}
        <Text className="text-foreground font-semibold mb-4">选择充值金额</Text>
        
        <View className="flex-row flex-wrap gap-3 mb-6">
          {PRESET_AMOUNTS.map((amount) => {
            const isSelected = selectedAmount === amount && !customAmount;
            return (
              <Pressable
                key={amount}
                onPress={() => handleSelectAmount(amount)}
                style={({ pressed }) => [
                  styles.amountButton,
                  pressed && styles.pressed,
                ]}
              >
                <View
                  className={cn(
                    "py-4 px-6 rounded-xl border-2 items-center",
                    isSelected 
                      ? "bg-primary/10 border-primary" 
                      : "bg-surface border-border"
                  )}
                >
                  <Text className={cn(
                    "text-lg font-bold",
                    isSelected ? "text-primary" : "text-foreground"
                  )}>
                    ¥{amount}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* 自定义金额 */}
        <Text className="text-foreground font-semibold mb-4">自定义金额</Text>
        
        <View className="bg-surface rounded-xl border-2 border-border flex-row items-center px-4 mb-6">
          <Text className="text-foreground text-lg font-bold mr-2">¥</Text>
          <TextInput
            className="flex-1 py-4 text-lg text-foreground"
            placeholder="输入充值金额"
            placeholderTextColor="#9BA1A6"
            keyboardType="decimal-pad"
            value={customAmount}
            onChangeText={handleCustomAmountChange}
            returnKeyType="done"
          />
        </View>

        {/* 充值说明 */}
        <View className="bg-surface/30 rounded-xl p-4 mb-6">
          <Text className="text-muted text-xs leading-5">
            充值说明：{"{\n}"}
            • 充值金额将实时到账{"{\n}"}
            • 充值后可用于课程支付{"{\n}"}
            • 单次充值金额不超过10万元{"{\n}"}
            • 如有疑问请联系客服
          </Text>
        </View>

        {/* 操作按钮 */}
        <View className="gap-3 mb-8">
          <Button
            onPress={handleRecharge}
            loading={processing}
            fullWidth
            size="lg"
            disabled={rechargeAmount <= 0}
          >
            {rechargeAmount > 0 
              ? `充值 ¥${rechargeAmount.toFixed(2)}` 
              : "请选择充倽金额"}
          </Button>
          <Button
            onPress={handleGoBack}
            variant="outline"
            fullWidth
            size="lg"
            disabled={processing}
          >
            好的
          </Button>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  amountButton: {
    width: "30%",
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
});
