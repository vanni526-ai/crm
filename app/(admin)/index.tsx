import { View, Text, ScrollView, TouchableOpacity, Platform, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { useState, useEffect, useCallback } from "react";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { useUserRoles } from "@/src/hooks/use-user-roles";
import { ROLE_LABELS } from "@/src/constants/roles";
import { api } from "@/lib/api-client";

/**
 * 管理员首页
 * 
 * 显示系统概览和管理功能入口
 */
export default function AdminHomeScreen() {
  const { user, currentRole } = useUserRoles();

  const [totalUsers, setTotalUsers] = useState(0);
  const [todayOrders, setTodayOrders] = useState(0);
  const [todayRevenue, setTodayRevenue] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      // 尝试获取管理员仪表盘数据
      const [dashboardResult, ordersResult] = await Promise.all([
        api.analytics.getDashboard().catch(() => null),
        api.orders.list().catch(() => ({ data: [], total: 0 })),
      ]);

      if (dashboardResult) {
        setTotalUsers(dashboardResult.totalUsers || dashboardResult.userCount || 0);
        setTodayOrders(dashboardResult.todayOrders || dashboardResult.todayOrderCount || 0);
        setTodayRevenue(dashboardResult.todayRevenue || dashboardResult.todayIncome || 0);
      } else {
        // 从订单数据中计算
        const today = new Date().toISOString().slice(0, 10);
        const todayOrdersList = (ordersResult.data || []).filter((o: any) => {
          const orderDate = o.createdAt || o.classDate || "";
          return String(orderDate).startsWith(today);
        });
        setTodayOrders(todayOrdersList.length);
        const revenue = todayOrdersList.reduce((sum: number, o: any) => {
          return sum + (Number(o.paymentAmount) || 0);
        }, 0);
        setTodayRevenue(revenue);
        setTotalUsers(ordersResult.total || 0);
      }
    } catch (e) {
      console.error("[AdminHome] fetchStats error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handlePress = async (route: string) => {
    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push(route as any);
  };

  return (
    <ScreenContainer className="bg-background">
      <ScrollView 
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="p-6 gap-6">
          {/* 头部欢迎 */}
          <View>
            <Text className="text-2xl font-bold text-foreground">
              {currentRole ? ROLE_LABELS[currentRole] : "管理员"}控制台
            </Text>
            <Text className="text-base text-muted mt-1">
              {user?.name || "管理员"}，欢迎使用<Text className="text-primary font-semibold">{currentRole ? ROLE_LABELS[currentRole] : "管理员"}</Text>端
            </Text>
          </View>

          {/* 统计卡片 */}
          <View className="flex-row gap-3">
            {/* 总用户数 */}
            <View className="flex-1 bg-surface rounded-2xl p-4">
              <Text className="text-sm text-muted mb-2">总用户</Text>
              {loading ? (
                <ActivityIndicator size="small" />
              ) : (
                <Text className="text-3xl font-bold text-foreground">{totalUsers}</Text>
              )}
              <Text className="text-xs text-muted mt-1">人</Text>
            </View>

            {/* 今日订单 */}
            <View className="flex-1 bg-surface rounded-2xl p-4">
              <Text className="text-sm text-muted mb-2">今日订单</Text>
              {loading ? (
                <ActivityIndicator size="small" />
              ) : (
                <Text className="text-3xl font-bold text-primary">{todayOrders}</Text>
              )}
              <Text className="text-xs text-muted mt-1">单</Text>
            </View>

            {/* 今日收入 */}
            <View className="flex-1 bg-surface rounded-2xl p-4">
              <Text className="text-sm text-muted mb-2">今日收入</Text>
              {loading ? (
                <ActivityIndicator size="small" />
              ) : (
                <Text className="text-3xl font-bold text-success">{todayRevenue}</Text>
              )}
              <Text className="text-xs text-muted mt-1">元</Text>
            </View>
          </View>

          {/* 管理功能 */}
          <View>
            <Text className="text-lg font-semibold text-foreground mb-3">
              系统管理
            </Text>
            <View className="gap-3">
              {/* 用户管理 */}
              <TouchableOpacity
                onPress={() => handlePress("/(admin)/users")}
                className="bg-surface rounded-2xl p-4 flex-row items-center justify-between active:opacity-70"
              >
                <View>
                  <Text className="text-base font-semibold text-foreground">
                    用户管理
                  </Text>
                  <Text className="text-sm text-muted mt-1">
                    管理用户账号和权限
                  </Text>
                </View>
                <Text className="text-2xl">👥</Text>
              </TouchableOpacity>

              {/* 订单管理 */}
              <TouchableOpacity
                onPress={() => handlePress("/(admin)/orders")}
                className="bg-surface rounded-2xl p-4 flex-row items-center justify-between active:opacity-70"
              >
                <View>
                  <Text className="text-base font-semibold text-foreground">
                    订单管理
                  </Text>
                  <Text className="text-sm text-muted mt-1">
                    查看和管理所有订单
                  </Text>
                </View>
                <Text className="text-2xl">📦</Text>
              </TouchableOpacity>

              {/* 课程管理 */}
              <TouchableOpacity
                onPress={() => handlePress("/(admin)/courses")}
                className="bg-surface rounded-2xl p-4 flex-row items-center justify-between active:opacity-70"
              >
                <View>
                  <Text className="text-base font-semibold text-foreground">
                    课程管理
                  </Text>
                  <Text className="text-sm text-muted mt-1">
                    管理课程信息和价格
                  </Text>
                </View>
                <Text className="text-2xl">📚</Text>
              </TouchableOpacity>

              {/* 老师管理 */}
              <TouchableOpacity
                onPress={() => handlePress("/(admin)/teachers")}
                className="bg-surface rounded-2xl p-4 flex-row items-center justify-between active:opacity-70"
              >
                <View>
                  <Text className="text-base font-semibold text-foreground">
                    老师管理
                  </Text>
                  <Text className="text-sm text-muted mt-1">
                    管理老师信息和排班
                  </Text>
                </View>
                <Text className="text-2xl">👨‍🏫</Text>
              </TouchableOpacity>

              {/* 财务管理 */}
              <TouchableOpacity
                onPress={() => handlePress("/(admin)/finance")}
                className="bg-surface rounded-2xl p-4 flex-row items-center justify-between active:opacity-70"
              >
                <View>
                  <Text className="text-base font-semibold text-foreground">
                    财务管理
                  </Text>
                  <Text className="text-sm text-muted mt-1">
                    查看财务报表和统计
                  </Text>
                </View>
                <Text className="text-2xl">💰</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
