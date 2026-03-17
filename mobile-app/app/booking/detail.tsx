import { View, Text, ScrollView, ActivityIndicator, Pressable, Image, Platform, StyleSheet, Linking } from "react-native";
import { useState, useEffect } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import api from "@/lib/sdk/api";
import { useColors } from "@/hooks/use-colors";
import { cn } from "@/lib/utils";

// 订单详情数据类型
interface OrderDetail {
  id: number;
  orderNo: string;
  status: string;
  
  // 客户信息
  customerName: string;
  customerId?: number;
  
  // 课程信息
  deliveryCourse: string;
  courseAmount: string;
  paymentAmount: string;
  
  // 时间信息
  classDate: string;
  classTime: string;
  createdAt: string;
  
  // 地点信息
  deliveryCity: string;
  deliveryRoom?: string;
  deliveryClassroomId?: number;
  classroomAddress?: string;
  
  // 老师信息
  deliveryTeacher: string;
  teacherAvatar?: string;
  
  // 支付信息
  paymentChannel?: string;
  channelOrderNo?: string;
  paymentDate?: string;
  paymentTime?: string;
  
  // 备注
  notes?: string;
  specialNotes?: string;
}

export default function OrderDetailScreen() {
  const router = useRouter();
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadOrderDetail(parseInt(id));
    }
  }, [id]);

  const loadOrderDetail = async (orderId: number) => {
    try {
      setLoading(true);
      setError(null);
      
      // 获取订单详情
      const orderData = await api.orders.getById(orderId);
      
      if (!orderData) {
        setError("订单不存在");
        return;
      }

      // 将订单数据转换为 any 类型以访问所有字段
      const order = orderData as any;

      setOrder({
        id: order.id,
        orderNo: order.orderNo || "",
        status: order.status || "pending",
        customerName: order.customerName || "",
        customerId: order.customerId,
        deliveryCourse: order.deliveryCourse || "未知课程",
        courseAmount: order.courseAmount || order.paymentAmount || "0",
        paymentAmount: order.paymentAmount || "0",
        classDate: order.classDate || "",
        classTime: order.classTime || "",
        createdAt: order.createdAt || "",
        deliveryCity: order.deliveryCity || "",
        deliveryRoom: order.deliveryRoom || "",
        deliveryClassroomId: order.deliveryClassroomId,
        classroomAddress: "",
        deliveryTeacher: order.deliveryTeacher || order.teacherName || "未知老师",
        teacherAvatar: undefined,
        paymentChannel: order.paymentChannel,
        channelOrderNo: order.channelOrderNo,
        paymentDate: order.paymentDate,
        paymentTime: order.paymentTime,
        notes: order.notes,
        specialNotes: order.specialNotes,
      });
    } catch (err: any) {
      console.error("[OrderDetail] Load failed:", err);
      setError(err.message || "加载订单详情失败");
    } finally {
      setLoading(false);
    }
  };

  // 返回上一页
  const handleGoBack = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.back();
  };

  // 联系客服
  const handleContactService = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    // 可以跳转到客服页面或拨打电话
    Linking.openURL("tel:400-000-0000");
  };

  // 格式化日期显示
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "待定";
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const day = date.getDate();
      const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
      const weekday = weekdays[date.getDay()];
      return `${year}年${month}月${day}日 ${weekday}`;
    } catch {
      return dateStr;
    }
  };

  // 格式化创建时间
  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return "";
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleString("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  // 格式化价格显示
  const formatPrice = (priceStr: string) => {
    if (!priceStr) return "¥0.00";
    const price = parseFloat(priceStr);
    if (isNaN(price)) return "¥0.00";
    return `¥${price.toFixed(2)}`;
  };

  // 订单状态显示
  const getStatusInfo = (status: string) => {
    const statusMap: Record<string, { text: string; color: string; bgColor: string; icon: string }> = {
      pending: { text: "待支付", color: "text-warning", bgColor: "bg-warning/10", icon: "⏳" },
      paid: { text: "已支付", color: "text-success", bgColor: "bg-success/10", icon: "✅" },
      completed: { text: "已完成", color: "text-muted", bgColor: "bg-surface", icon: "🎉" },
      cancelled: { text: "已取消", color: "text-error", bgColor: "bg-error/10", icon: "❌" },
      refunded: { text: "已退款", color: "text-error", bgColor: "bg-error/10", icon: "💰" },
    };
    return statusMap[status] || { text: status || "未知", color: "text-muted", bgColor: "bg-surface", icon: "❓" };
  };

  if (loading) {
    return (
      <ScreenContainer className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color={colors.primary} />
        <Text className="text-muted mt-4">加载订单详情...</Text>
      </ScreenContainer>
    );
  }

  if (error || !order) {
    return (
      <ScreenContainer className="flex-1">
        {/* 顶部导航栏 */}
        <View className="flex-row items-center px-4 py-3 border-b border-border">
          <Pressable
            onPress={handleGoBack}
            style={({ pressed }) => [pressed && styles.pressed]}
            className="mr-4"
          >
            <Text className="text-primary text-lg">← 返回</Text>
          </Pressable>
          <Text className="text-xl font-bold text-foreground">订单详情</Text>
        </View>
        
        <View className="flex-1 items-center justify-center px-4">
          <Text className="text-6xl mb-4">😕</Text>
          <Text className="text-lg text-muted text-center mb-4">
            {error || "订单不存在"}
          </Text>
          <Button onPress={handleGoBack}>返回预约列表</Button>
        </View>
      </ScreenContainer>
    );
  }

  const statusInfo = getStatusInfo(order.status);

  return (
    <ScreenContainer className="flex-1" edges={["top", "left", "right", "bottom"]}>
      {/* 顶部导航栏 */}
      <View className="flex-row items-center px-4 py-3 border-b border-border">
        <Pressable
          onPress={handleGoBack}
          style={({ pressed }) => [pressed && styles.pressed]}
          className="mr-4"
        >
          <Text className="text-primary text-lg">← 返回</Text>
        </Pressable>
        <Text className="text-xl font-bold text-foreground flex-1">订单详情</Text>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
      >
        {/* 订单状态卡片 */}
        <Card className="mb-4">
          <View className="items-center py-4">
            <Text className="text-4xl mb-2">{statusInfo.icon}</Text>
            <View className={cn("px-4 py-2 rounded-full", statusInfo.bgColor)}>
              <Text className={cn("text-lg font-bold", statusInfo.color)}>
                {statusInfo.text}
              </Text>
            </View>
            <Text className="text-muted text-sm mt-2">
              订单号: {order.orderNo}
            </Text>
          </View>
        </Card>

        {/* 课程信息 */}
        <Card className="mb-4">
          <View>
            <Text className="text-lg font-bold text-foreground mb-4">📚 课程信息</Text>
            
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-muted">课程名称</Text>
              <Text className="text-foreground font-medium flex-1 text-right ml-4" numberOfLines={2}>
                {order.deliveryCourse}
              </Text>
            </View>
            
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-muted">课程金额</Text>
              <Text className="text-primary font-bold text-xl">
                {formatPrice(order.courseAmount)}
              </Text>
            </View>
            
            {order.paymentAmount !== order.courseAmount && (
              <View className="flex-row items-center justify-between">
                <Text className="text-muted">实付金额</Text>
                <Text className="text-foreground font-medium">
                  {formatPrice(order.paymentAmount)}
                </Text>
              </View>
            )}
          </View>
        </Card>

        {/* 上课信息 */}
        <Card className="mb-4">
          <View>
            <Text className="text-lg font-bold text-foreground mb-4">📅 上课信息</Text>
            
            <View className="flex-row items-start mb-3">
              <Text className="text-muted w-20">上课时间</Text>
              <View className="flex-1">
                <Text className="text-foreground font-medium">
                  {formatDate(order.classDate)}
                </Text>
                {order.classTime && (
                  <Text className="text-muted text-sm mt-1">
                    {order.classTime}
                  </Text>
                )}
              </View>
            </View>
            
            <View className="flex-row items-start mb-3">
              <Text className="text-muted w-20">上课地点</Text>
              <View className="flex-1">
                <Text className="text-foreground font-medium">
                  {order.deliveryCity}{order.deliveryRoom ? ` · ${order.deliveryRoom}` : ""}
                </Text>
                {order.classroomAddress && (
                  <Text className="text-muted text-sm mt-1">
                    {order.classroomAddress}
                  </Text>
                )}
              </View>
            </View>
            
            <View className="flex-row items-center">
              <Text className="text-muted w-20">授课老师</Text>
              <View className="flex-1 flex-row items-center">
                {order.teacherAvatar ? (
                  <Image
                    source={{ uri: order.teacherAvatar }}
                    className="w-10 h-10 rounded-full mr-3"
                  />
                ) : (
                  <View className="w-10 h-10 rounded-full bg-primary/20 items-center justify-center mr-3">
                    <Text className="text-primary text-lg font-medium">
                      {order.deliveryTeacher.charAt(0)}
                    </Text>
                  </View>
                )}
                <Text className="text-foreground font-medium">
                  {order.deliveryTeacher}
                </Text>
              </View>
            </View>
          </View>
        </Card>

        {/* 支付信息 */}
        {order.paymentChannel && (
          <Card className="mb-4">
            <View>
              <Text className="text-lg font-bold text-foreground mb-4">💳 支付信息</Text>
              
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-muted">支付方式</Text>
                <Text className="text-foreground font-medium">
                  {order.paymentChannel}
                </Text>
              </View>
              
              {order.channelOrderNo && (
                <View className="flex-row items-center justify-between mb-3">
                  <Text className="text-muted">交易单号</Text>
                  <Text className="text-foreground text-sm" numberOfLines={1}>
                    {order.channelOrderNo}
                  </Text>
                </View>
              )}
              
              {order.paymentDate && (
                <View className="flex-row items-center justify-between">
                  <Text className="text-muted">支付时间</Text>
                  <Text className="text-foreground">
                    {order.paymentDate} {order.paymentTime || ""}
                  </Text>
                </View>
              )}
            </View>
          </Card>
        )}

        {/* 订单信息 */}
        <Card className="mb-4">
          <View>
            <Text className="text-lg font-bold text-foreground mb-4">📋 订单信息</Text>
            
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-muted">订单编号</Text>
              <Text className="text-foreground text-sm">{order.orderNo}</Text>
            </View>
            
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-muted">下单时间</Text>
              <Text className="text-foreground text-sm">
                {formatDateTime(order.createdAt)}
              </Text>
            </View>
            
            {order.customerName && (
              <View className="flex-row items-center justify-between">
                <Text className="text-muted">预约人</Text>
                <Text className="text-foreground">{order.customerName}</Text>
              </View>
            )}
          </View>
        </Card>

        {/* 备注信息 */}
        {(order.notes || order.specialNotes) && (
          <Card className="mb-4">
            <View>
              <Text className="text-lg font-bold text-foreground mb-4">📝 备注信息</Text>
              {order.notes && (
                <Text className="text-foreground mb-2">{order.notes}</Text>
              )}
              {order.specialNotes && (
                <Text className="text-muted text-sm">{order.specialNotes}</Text>
              )}
            </View>
          </Card>
        )}

        {/* 操作按钮 */}
        <View className="gap-3 mt-4">
          <Button
            onPress={handleContactService}
            variant="outline"
            fullWidth
            size="lg"
          >
            联系客服
          </Button>
          
          <Button
            onPress={handleGoBack}
            fullWidth
            size="lg"
          >
            返回预约列表
          </Button>
        </View>

        {/* 温馨提示 */}
        <View className="bg-surface/50 rounded-xl p-4 mt-6">
          <Text className="text-muted text-xs leading-5">
            温馨提示：{"\n"}
            • 请提前10分钟到达上课地点{"\n"}
            • 如需取消或改期，请提前联系客服{"\n"}
            • 临近上课时间30分钟内取消需承担50%空置费
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.7,
  },
});
