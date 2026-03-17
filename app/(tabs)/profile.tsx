import { View, Text, ScrollView, TouchableOpacity, Platform, Alert, Pressable } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth-context";
import api from "@/lib/sdk/api";
import { useEffect, useState, useCallback } from "react";
import { useUserRoles } from "@/src/hooks/use-user-roles";
import { ROLE_LABELS } from "@/src/constants/roles";

export default function ProfileScreen() {
  const router = useRouter();
  const { state, logout } = useAuth();
  const { roles, currentRole, hasMultipleRoles } = useUserRoles();
  
  
  // 统计数据状态
  const [stats, setStats] = useState({
    pending: 0,      // 待上课
    completed: 0,    // 已完成
    balance: 0,      // 余额
  });
  const [loading, setLoading] = useState(true);
  
  // 初始加载统计数据
  useEffect(() => {
    loadStats();
  }, []);
  
  // 页面获得焦点时刷新余额（从充值页面返回后）
  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [])
  );
  
  const loadStats = async () => {
    try {
      setLoading(true);
      
      // 并发请求订单数据和余额信息
      const [ordersResult, balanceResult] = await Promise.all([
        api.orders.myOrders({ status: 'all' }),
        api.account.getMyBalance(),
      ]);
      
      // 统计订单数据
      const orders = (ordersResult as any)?.orders || (Array.isArray(ordersResult) ? ordersResult : []);
      const pendingCount = orders.filter((order: any) => 
        order.status === 'paid' || order.status === 'pending'
      ).length;
      const completedCount = orders.filter((order: any) => 
        order.status === 'completed'
      ).length;
      
      // 从后端实时获取余额
      const balance = balanceResult.success 
        ? parseFloat(balanceResult.data.balance) 
        : 0;
      
      setStats({
        pending: pendingCount,
        completed: completedCount,
        balance,
      });
    } catch (error) {
      console.error('[Profile] Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    if (Platform.OS === "web") {
      // Web 环境使用 confirm
      if (confirm("确定要退出登录吗？")) {
        performLogout();
      }
    } else {
      // 移动端使用 Alert
      Alert.alert(
        "退出登录",
        "确定要退出登录吗？",
        [
          { text: "取消", style: "cancel" },
          {
            text: "确定",
            style: "destructive",
            onPress: performLogout,
          },
        ]
      );
    }
  };

  const performLogout = async () => {
    try {
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      
      // 先跳转到登录页面
      router.replace("/login");
      
      // 然后执行退出登录逻辑
      await logout();
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  // 检查是否为管理员或普通用户（不是老师、销售、合伙人）
  const userRoles = state.user?.roles || state.user?.role || '';
  const isAdminOrUser = currentRole === 'admin' || currentRole === 'user' || userRoles.includes('admin') || (!currentRole && !userRoles.includes('teacher') && !userRoles.includes('sales') && !userRoles.includes('cityPartner'));

  // 菜单项
  const menuItems = [
    { id: "account", title: "账户信息", icon: "👤", onPress: () => {} },
    // 只有管理员和普通用户才显示流水记录
    ...(isAdminOrUser ? [{ id: "history", title: "流水记录", icon: "📝", onPress: () => {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      router.push("/consumption-records");
    }}] : []),
    { id: "change-password", title: "修改密码", icon: "🔑", onPress: () => {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      router.push("/change-password");
    }},
    { id: "join-us", title: "加入我们", icon: "👥", onPress: () => {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      router.push("/join-us" as any);
    }},
    { id: "help", title: "帮助中心", icon: "❓", onPress: () => {} },
    { id: "agreement", title: "用户协议", icon: "📜", onPress: () => {} },
  ];

  return (
    <ScreenContainer className="p-4">
      <ScrollView showsVerticalScrollIndicator={false}>
        
        {/* 用户信息卡片 */}
        <Card className="mb-6">
          <View className="flex-row items-center">
            <Avatar
              name={state.user?.name}
              size="xl"
            />
            <View className="ml-4 flex-1">
              <Text className="text-xl font-bold text-foreground">
                {state.user?.name || "未登录"}
              </Text>
              <Text className="text-sm text-muted mt-1">
                {currentRole ? ROLE_LABELS[currentRole] : (state.user?.role || "欢迎使用课程预约")}
              </Text>
            </View>
            {/* 多角色用户显示切换身份按钮 */}
            {hasMultipleRoles && (
              <Pressable
                onPress={() => {
                  if (Platform.OS !== "web") {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                  router.push("/role-selection");
                }}
                style={({ pressed }) => [{
                  opacity: pressed ? 0.7 : 1,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  backgroundColor: '#f0f0f0',
                  borderRadius: 8,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                }]}
              >
                <Text style={{ fontSize: 16 }}>🎭</Text>
                <Text className="text-sm text-foreground">切换身份</Text>
              </Pressable>
            )}
          </View>
        </Card>

        {/* 快捷统计 */}
        <View className="flex-row mb-6 gap-2">
          {/* 待上课 */}
          <View className="bg-surface rounded-xl p-4 items-center justify-center" style={{ flex: 1, height: 88 }}>
            <Text className="text-2xl font-bold text-primary">
              {loading ? '-' : stats.pending}
            </Text>
            <Text className="text-sm text-muted mt-1">待上课</Text>
          </View>
          
          {/* 已完成 */}
          <View className="bg-surface rounded-xl p-4 items-center justify-center" style={{ flex: 1, height: 88 }}>
            <Text className="text-2xl font-bold text-success">
              {loading ? '-' : stats.completed}
            </Text>
            <Text className="text-sm text-muted mt-1">已完成</Text>
          </View>
          
          {/* 余额 - 只有管理员和普通用户才显示 */}
          {isAdminOrUser && (
            <View className="bg-surface rounded-xl" style={{ flex: 1, height: 88 }}>
              <Pressable
                onPress={() => {
                  if (Platform.OS !== "web") {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                  router.push("/booking/recharge" as any);
                }}
                style={({ pressed }) => [
                  { opacity: pressed ? 0.7 : 1 }
                ]}
                className="flex-1 p-4 items-center justify-center"
              >
                <Text 
                  className="text-lg font-bold text-foreground" 
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.5}
                >
                  {loading ? '-' : `￥${Math.floor(stats.balance)}`}
                </Text>
                <View className="flex-row items-center mt-1">
                  <Text className="text-sm text-muted">余额</Text>
                  <Text className="text-xs text-primary ml-1">• 充值</Text>
                </View>
              </Pressable>
            </View>
          )}
        </View>

        {/* 菜单列表 */}
        <Card className="mb-6 p-0 overflow-hidden">
          {menuItems.map((item, index) => (
            <View key={item.id}>
              <Card
                onPress={item.onPress}
                className="rounded-none border-0 flex-row items-center justify-between"
              >
                <View className="flex-row items-center flex-1">
                  <Text className="text-xl mr-3">{item.icon}</Text>
                  <View className="flex-1">
                    <Text className="text-base text-foreground">{item.title}</Text>
                    {(item as any).subtitle && (
                      <Text className="text-sm text-primary mt-0.5">
                        {(item as any).subtitle}
                      </Text>
                    )}
                  </View>
                </View>
                <Text className="text-muted">›</Text>
              </Card>
              {index < menuItems.length - 1 && (
                <View className="h-px bg-border mx-4" />
              )}
            </View>
          ))}
        </Card>

        {/* 退出登录按钮 */}
        <View className="mb-8">
          <Button
            variant="outline"
            fullWidth
            onPress={handleLogout}
          >
            退出登录
          </Button>
        </View>

        {/* 版本信息 */}
        <Text className="text-center text-sm text-muted mb-4">
          版本 1.0.0
        </Text>
      </ScrollView>
    </ScreenContainer>
  );
}
