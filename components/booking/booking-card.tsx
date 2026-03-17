import { View, Text, Image, Pressable, StyleSheet, Platform, TouchableOpacity, Alert } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import { cn } from "@/lib/utils";
import { CourseLevelTag } from "@/components/ui/tag";

/**
 * 预约订单详情接口
 * 基于后端 orders.getById 返回的数据结构
 */
export interface BookingDetail {
  // 订单基础信息
  id: number;
  orderNo: string;
  status: string;              // pending/paid/completed/cancelled/refunded
  deliveryStatus?: 'undelivered' | 'delivered';  // 交付状态：undelivered=未交付/待上课, delivered=已交付/已完成
  
  // 课程信息
  deliveryCourse: string;      // 课程名称
  courseAmount: string;        // 课程价格 (decimal字符串)
  courseDuration?: number;     // 课程时长(分钟) - 需要从courses表关联
  courseLevel?: string;        // 课程程度 - 需要从courses表关联
  
  // 时间信息
  classDate: string;           // 上课日期 YYYY-MM-DD
  classTime: string;           // 上课时间 HH:MM-HH:MM
  
  // 地点信息
  deliveryCity: string;        // 城市名称
  deliveryRoom: string;        // 教室名称
  classroomAddress?: string;   // 详细地址(需要通过classroomId查询)
  deliveryClassroomId?: number;// 教室ID
  
  // 老师信息
  deliveryTeacher: string;     // 老师姓名
  teacherAvatar?: string;      // 老师头像(需要从teachers表关联)
  
  // 客户信息
  customerName: string;
  
  // 时间戳
  createdAt: string;           // 订单创建时间
}

interface BookingCardProps {
  booking: BookingDetail;
  className?: string;
}

/**
 * 预约订单卡片组件
 * 展示完整的预约信息:课程、时间、地址、老师
 * 点击可跳转到订单详情页
 */
export function BookingCard({ booking, className }: BookingCardProps) {
  const router = useRouter();
  
  // 格式化日期显示
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "待定";
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      const month = date.getMonth() + 1;
      const day = date.getDate();
      const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
      const weekday = weekdays[date.getDay()];
      return `${month}月${day}日 ${weekday}`;
    } catch {
      return dateStr;
    }
  };

  // 格式化价格显示
  const formatPrice = (priceStr: string) => {
    if (!priceStr) return "¥0";
    const price = parseFloat(priceStr);
    if (isNaN(price)) return "¥0";
    return `¥${price.toFixed(0)}`;
  };

  // 格式化时长显示
  const formatDuration = (minutes?: number) => {
    if (!minutes) return "";
    if (minutes < 60) return `${minutes}分钟`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}小时${mins}分钟` : `${hours}小时`;
  };

  // 订单状态显示（根据deliveryStatus字段）
  const getStatusInfo = (deliveryStatus?: 'undelivered' | 'delivered') => {
    if (deliveryStatus === 'delivered') {
      return { text: "已完成", color: "text-muted", bgColor: "bg-surface" };
    }
    // undelivered 或未设置时显示“待上课”，用突出颜色
    return { text: "待上课", color: "text-primary", bgColor: "bg-primary/10" };
  };

  const statusInfo = getStatusInfo(booking.deliveryStatus);

  // 处理卡片点击 - 跳转到订单详情
  const handlePress = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push(`/booking/detail?id=${booking.id}` as any);
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [pressed && styles.pressed]}
    >
      <View className={cn("bg-surface rounded-2xl p-4 border border-border", className)}>
        {/* 顶部:订单号和状态 */}
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-xs text-muted" numberOfLines={1}>
            订单号: {booking.orderNo || "生成中..."}
          </Text>
          <View className={cn("px-2 py-1 rounded-md", statusInfo.bgColor)}>
            <Text className={cn("text-xs font-medium", statusInfo.color)}>
              {statusInfo.text}
            </Text>
          </View>
        </View>

        {/* 课程信息 */}
        <View className="mb-3">
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-1 mr-2">
              <Text className="text-lg font-semibold text-foreground mb-1" numberOfLines={2}>
                {booking.deliveryCourse || "未知课程"}
              </Text>
              {booking.courseLevel && (
                <CourseLevelTag level={booking.courseLevel} />
              )}
            </View>
            <Text className="text-muted font-medium text-base">
              {formatPrice(booking.courseAmount)}
            </Text>
          </View>
          {booking.courseDuration && (
            <Text className="text-xs text-muted">
              ⏱️ {formatDuration(booking.courseDuration)}
            </Text>
          )}
        </View>

        {/* 分割线 */}
        <View className="h-px bg-border my-3" />

        {/* 上课时间 */}
        <View className="flex-row items-start mb-2">
          <Text className="text-muted text-sm w-16">📅 时间</Text>
          <View className="flex-1">
            <Text className="text-foreground text-sm font-medium">
              {formatDate(booking.classDate)}
            </Text>
            {booking.classTime && (
              <Text className="text-muted text-xs mt-0.5">
                {booking.classTime}
              </Text>
            )}
          </View>
        </View>

        {/* 上课地址 */}
        <View className="flex-row items-start mb-2">
          <Text className="text-muted text-sm w-16">📍 地点</Text>
          <View className="flex-1 flex-row items-start justify-between">
            <Text className="text-foreground text-sm font-medium flex-1 mr-2" numberOfLines={2}>
              {booking.classroomAddress || `${booking.deliveryCity || "待定"}${booking.deliveryRoom ? ` · ${booking.deliveryRoom}` : ""}`}
            </Text>
            {booking.classroomAddress && (
              <TouchableOpacity
                onPress={async () => {
                  try {
                    await Clipboard.setStringAsync(booking.classroomAddress || "");
                    Alert.alert("复制成功", "地址已复制到剪贴板");
                  } catch (error) {
                    Alert.alert("复制失败", "请重试");
                  }
                }}
                className="bg-primary/10 px-2 py-1 rounded"
                style={{ opacity: 0.8 }}
              >
                <Text className="text-primary text-xs font-medium">复制</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* 上课老师 */}
        <View className="flex-row items-center">
          <Text className="text-muted text-sm w-16">👤 老师</Text>
          <View className="flex-1 flex-row items-center">
            {booking.teacherAvatar ? (
              <Image
                source={{ uri: booking.teacherAvatar }}
                className="w-8 h-8 rounded-full mr-2"
              />
            ) : (
              <View className="w-8 h-8 rounded-full bg-primary/20 items-center justify-center mr-2">
                <Text className="text-primary text-sm font-medium">
                  {(booking.deliveryTeacher || "?").charAt(0)}
                </Text>
              </View>
            )}
            <Text className="text-foreground text-sm font-medium">
              {booking.deliveryTeacher || "待定"}
            </Text>
          </View>
        </View>

        {/* 点击提示 */}
        <View className="flex-row items-center justify-end mt-3 pt-2 border-t border-border/50">
          <Text className="text-xs text-muted">点击查看详情 →</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});
