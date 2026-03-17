import { View, Text, ScrollView, Alert, Platform, Pressable, StyleSheet, Modal } from "react-native";
import { useState, useEffect } from "react";
import { useRouter, useFocusEffect } from "expo-router";
import { useCallback } from "react";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useBooking } from "@/lib/booking-context";
import { useAuth } from "@/lib/auth-context";
import sdkApi from "@/lib/sdk/api";
import api from "@/lib/api-client";
import { cn } from "@/lib/utils";

// 支付方式类型
type PaymentMethod = "wechat" | "alipay" | "balance" | "recharge";

// 支付方式配置
const PAYMENT_METHODS = [
  {
    id: "wechat" as PaymentMethod,
    name: "微信支付",
    icon: "💚",
    description: "使用微信完成支付",
    color: "#07C160",
  },
  {
    id: "alipay" as PaymentMethod,
    name: "支付宝支付",
    icon: "💙",
    description: "使用支付宝完成支付",
    color: "#1677FF",
  },
  {
    id: "balance" as PaymentMethod,
    name: "账户余额支付",
    icon: "💰",
    description: "使用账户余额支付",
    color: "#FF6B35",
  },
  {
    id: "recharge" as PaymentMethod,
    name: "账户充值",
    icon: "➕",
    description: "充值后使用余额支付",
    color: "#8B5CF6",
  },
];

// 支付渠道映射
const PAYMENT_CHANNEL_MAP: Record<PaymentMethod, string> = {
  wechat: "微信",
  alipay: "支付宝",
  balance: "账户余额",
  recharge: "账户余额",
};

// 自定义弹窗组件（兼容Web）
interface CustomAlertProps {
  visible: boolean;
  title: string;
  message: string;
  buttons: Array<{
    text: string;
    style?: "cancel" | "default" | "destructive";
    onPress?: () => void;
  }>;
  onClose: () => void;
}

function CustomAlert({ visible, title, message, buttons, onClose }: CustomAlertProps) {
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 items-center justify-center bg-black/50">
        <View className="bg-background rounded-2xl p-6 mx-8 max-w-sm w-full shadow-lg">
          <Text className="text-xl font-bold text-foreground text-center mb-2">
            {title}
          </Text>
          <Text className="text-muted text-center mb-6 leading-6">
            {message}
          </Text>
          <View className="gap-3">
            {buttons.map((button, index) => (
              <Pressable
                key={index}
                onPress={() => {
                  onClose();
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
  );
}

export default function PaymentScreen() {
  const router = useRouter();
  const { state, reset } = useBooking();
  const { state: authState } = useAuth();
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [processing, setProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [successOrderNo, setSuccessOrderNo] = useState<string>("");
  
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

  // 账户余额状态
  const [accountBalance, setAccountBalance] = useState<number>(0);
  const [balanceLoading, setBalanceLoading] = useState(true);
  const [customerId, setCustomerId] = useState<number | null>(null);

  // 加载账户余额
  const loadBalance = async () => {
    try {
      setBalanceLoading(true);
      const result = await sdkApi.account.getMyBalance();
      if (result.success) {
        setAccountBalance(parseFloat(result.data.balance));
        setCustomerId(result.data.customerId);
      }
    } catch (error) {
      console.error('[Payment] Failed to load balance:', error);
    } finally {
      setBalanceLoading(false);
    }
  };

  // 页面加载时获取余额
  useEffect(() => {
    loadBalance();
  }, []);

  // 页面获得焦点时刷新余额（从充值页面返回后）
  useFocusEffect(
    useCallback(() => {
      loadBalance();
    }, [])
  );

  // 课程价格
  const coursePrice = Number(state.selectedCourse?.price ?? 0);

  // 余额是否足够
  const isBalanceSufficient = accountBalance >= coursePrice;

  const handleSelectMethod = (method: PaymentMethod) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedMethod(method);
  };

  const handlePayment = async () => {
    if (!selectedMethod) {
      showAlert("提示", "请选择支付方式", [{ text: "确定" }]);
      return;
    }

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    setProcessing(true);

    try {
      switch (selectedMethod) {
        case "wechat":
          // 模拟微信支付
          await handleWechatPay();
          break;
        case "alipay":
          // 模拟支付宝支付
          await handleAlipay();
          break;
        case "balance":
          // 账户余额支付
          await handleBalancePay();
          break;
        case "recharge":
          // 跳转到充值页面
          router.push("/booking/recharge" as any);
          setProcessing(false);
          return;
      }
    } catch (error: any) {
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      showAlert("支付失败", error.message || "请稍后重试", [{ text: "确定" }]);
    } finally {
      setProcessing(false);
    }
  };

  // 微信支付（模拟）
  const handleWechatPay = async () => {
    showAlert(
      "微信支付",
      "微信支付接口待对接，当前为模拟支付",
      [
        { text: "取消", style: "cancel" },
        { 
          text: "模拟支付成功", 
          onPress: () => handlePaymentSuccess("wechat")
        },
      ]
    );
  };

  // 支付宝支付（模拟）
  const handleAlipay = async () => {
    showAlert(
      "支付宝支付",
      "支付宝支付接口待对接，当前为模拟支付",
      [
        { text: "取消", style: "cancel" },
        { 
          text: "模拟支付成功", 
          onPress: () => handlePaymentSuccess("alipay")
        },
      ]
    );
  };

  // 账户余额支付
  const handleBalancePay = async () => {
    if (!isBalanceSufficient) {
      showAlert(
        "余额不足",
        `当前余额 ¥${accountBalance.toFixed(2)}，需要 ¥${coursePrice.toFixed(2)}`,
        [
          { text: "取消", style: "cancel" },
          { 
            text: "去充值", 
            onPress: () => router.push("/booking/recharge" as any)
          },
        ]
      );
      return;
    }

    showAlert(
      "确认支付",
      `将从账户余额扣除 ¥${coursePrice.toFixed(2)}`,
      [
        { text: "取消", style: "cancel" },
        { 
          text: "确认支付", 
          onPress: () => handlePaymentSuccess("balance")
        },
      ]
    );
  };

  // 支付成功处理 - 创建订单并跳转到我的预约页面
  const handlePaymentSuccess = async (method: PaymentMethod) => {
    try {
      setProcessing(true);
      
      // 检查预约信息是否完整
      if (!state.selectedCity || !state.selectedDate || !state.selectedTimeSlot || 
          !state.selectedTeacher || !state.selectedCourse) {
        throw new Error("预约信息不完整");
      }

      // 格式化日期和时间
      const classDate = state.selectedDate.toISOString().split("T")[0];
      const now = new Date();
      const paymentDate = now.toISOString().split("T")[0];
      const paymentTime = now.toTimeString().split(" ")[0];

      // 生成模拟渠道订单号
      const channelOrderNo = `SIM${Date.now()}${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      // 调用后端用户下单API创建订单
      const orderData = {
        // 客户信息
        customerName: authState.user?.name || "未知客户",
        
        // 金额信息（后端要求字符串格式）
        courseAmount: coursePrice.toFixed(2),
        paymentAmount: coursePrice.toFixed(2),
        
        // 支付信息
        paymentChannel: PAYMENT_CHANNEL_MAP[method],
        channelOrderNo: channelOrderNo,
        paymentDate: paymentDate,
        paymentTime: paymentTime,
        
        // 交付信息
        deliveryCity: state.selectedCity.city,
        deliveryTeacher: state.selectedTeacher.name,
        deliveryCourse: state.selectedCourse.name,
        classDate: classDate,
        classTime: state.selectedTimeSlot,
        
        // 备注
        notes: `模拟支付成功 - 支付方式: ${PAYMENT_CHANNEL_MAP[method]}`,
      };

      console.log("[Payment] Creating order with userCreate:", orderData);
      console.log("[Payment] User info:", authState.user);
      console.log("[Payment] API instance:", api);
      console.log("[Payment] API orders:", sdkApi.orders);
      
      // 使用新的用户下单接口（普通用户可用）
      const order = await sdkApi.orders.userCreate(orderData);
      console.log("[Payment] Order created successfully:", order);

      // 重要：更新订单状态为“已支付”
      if (order && order.id) {
        console.log("[Payment] Updating order status to 'paid'...");
        const updateResult = await api.orders.update({
          id: order.id,
          status: "paid",
        });
        console.log("[Payment] Order status updated:", updateResult);
      }

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      // 标记支付成功并保存订单号
      setPaymentSuccess(true);
      setSuccessOrderNo(order?.orderNo || "已生成");
    } catch (error: any) {
      console.error("[Payment] Order creation failed:", error);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      showAlert("预约失败", error.message || "支付成功但预约创建失败，请联系客服", [{ text: "确定" }]);
    } finally {
      setProcessing(false);
    }
  };

  const handleGoBack = () => {
    router.back();
  };

  // 检查预约信息是否完整
  const isBookingComplete = state.selectedCity && state.selectedDate && 
                           state.selectedTimeSlot && state.selectedTeacher && 
                           state.selectedCourse;

  // 如果支付成功，显示成功页面并提供跳转按钮
  if (paymentSuccess) {
    return (
      <ScreenContainer className="p-4" edges={["top", "left", "right", "bottom"]}>
        <View className="flex-1 items-center justify-center">
          <Text className="text-6xl mb-4">🎉</Text>
          <Text className="text-2xl font-bold text-foreground text-center mb-2">
            支付成功
          </Text>
          <Text className="text-base text-muted text-center mb-2">
            您的课程已预约成功！
          </Text>
          <Text className="text-sm text-muted text-center mb-8">
            订单号：{successOrderNo}
          </Text>
          <Button
            onPress={() => {
              reset();
              router.replace("/(tabs)/bookings");
            }}
            fullWidth
            size="lg"
          >
            查看我的预约
          </Button>
          <View className="h-4" />
          <Button
            onPress={() => {
              reset();
              router.replace("/(tabs)");
            }}
            variant="outline"
            fullWidth
            size="lg"
          >
            返回首页
          </Button>
        </View>
      </ScreenContainer>
    );
  }

  if (!isBookingComplete) {
    return (
      <ScreenContainer className="p-4">
        <View className="flex-1 items-center justify-center">
          <Text className="text-lg text-muted text-center mb-4">
            预约信息不完整，请返回重新选择
          </Text>
          <Button onPress={() => router.replace("/(tabs)")}>返回首页</Button>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="p-4" edges={["top", "left", "right", "bottom"]}>
      {/* 自定义弹窗（Web兼容） */}
      <CustomAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        onClose={closeAlert}
      />
      
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* 标题 */}
        <Text className="text-2xl font-bold text-foreground mb-6">
          选择支付方式
        </Text>

        {/* 订单金额 */}
        <Card className="mb-6">
          <View>
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-muted text-sm">订单金额</Text>
              <Text className="text-primary font-bold text-2xl">
                ¥{coursePrice.toFixed(2)}
              </Text>
            </View>
            <Text className="text-foreground font-medium" numberOfLines={2}>
              {state.selectedCourse?.name}
            </Text>
          </View>
        </Card>

        {/* 账户余额提示 */}
        <View className="bg-surface/50 rounded-xl p-4 mb-6 flex-row items-center justify-between">
          <View className="flex-row items-center">
            <Text className="text-lg mr-2">💰</Text>
            <Text className="text-foreground">账户余额</Text>
          </View>
          <Text className={cn(
            "font-bold text-lg",
            isBalanceSufficient ? "text-success" : "text-warning"
          )}>
            ¥{accountBalance.toFixed(2)}
          </Text>
        </View>

        {/* 支付方式列表 */}
        <View className="gap-3 mb-6">
          {PAYMENT_METHODS.map((method) => {
            const isSelected = selectedMethod === method.id;
            const isBalanceMethod = method.id === "balance";
            const isDisabled = isBalanceMethod && !isBalanceSufficient;

            return (
              <Pressable
                key={method.id}
                onPress={() => !isDisabled && handleSelectMethod(method.id)}
                style={({ pressed }) => [
                  pressed && !isDisabled && styles.pressed,
                ]}
              >
                <View
                  className={cn(
                    "bg-surface rounded-2xl p-4 border-2 flex-row items-center",
                    isSelected ? "border-primary" : "border-border",
                    isDisabled && "opacity-50"
                  )}
                >
                  {/* 图标 */}
                  <View 
                    className="w-12 h-12 rounded-xl items-center justify-center mr-4"
                    style={{ backgroundColor: `${method.color}20` }}
                  >
                    <Text className="text-2xl">{method.icon}</Text>
                  </View>

                  {/* 文字 */}
                  <View className="flex-1">
                    <Text className={cn(
                      "text-base font-semibold mb-1",
                      isSelected ? "text-primary" : "text-foreground"
                    )}>
                      {method.name}
                    </Text>
                    <Text className="text-sm text-muted">
                      {isBalanceMethod && !isBalanceSufficient 
                        ? "余额不足，请先充值" 
                        : method.description}
                    </Text>
                  </View>

                  {/* 选中标记 */}
                  <View className={cn(
                    "w-6 h-6 rounded-full border-2 items-center justify-center",
                    isSelected ? "border-primary bg-primary" : "border-border"
                  )}>
                    {isSelected && (
                      <Text className="text-white text-xs">✓</Text>
                    )}
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* 操作按钮 */}
        <View className="gap-3 mb-8">
          <Button
            onPress={handlePayment}
            loading={processing}
            fullWidth
            size="lg"
            disabled={!selectedMethod}
          >
            {selectedMethod === "recharge" ? "去充值" : `确认支付 ¥${coursePrice.toFixed(2)}`}
          </Button>
          <Button
            onPress={handleGoBack}
            variant="outline"
            fullWidth
            size="lg"
            disabled={processing}
          >
            返回修改
          </Button>
        </View>

        {/* 支付说明 */}
        <View className="bg-surface/30 rounded-xl p-4">
          <Text className="text-muted text-xs leading-5">
            支付说明：{"\n"}
            • 微信支付和支付宝支付将跳转至对应App完成支付{"\n"}
            • 账户余额支付将直接从您的账户扣款{"\n"}
            • 如余额不足，可先进行充值{"\n"}
            • 支付成功后，预约将自动生效
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
});
