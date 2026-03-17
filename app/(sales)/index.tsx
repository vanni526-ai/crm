import { View, Text, ScrollView, TouchableOpacity, Platform, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { useState, useEffect, useCallback } from "react";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { useUserRoles } from "@/src/hooks/use-user-roles";
import { ROLE_LABELS } from "@/src/constants/roles";
import { api } from "@/lib/api-client";

/**
 * 销售端首页
 * 
 * 显示销售业绩和客户统计
 */
export default function SalesHomeScreen() {
  const { user, currentRole } = useUserRoles();

  const [monthlyRevenue, setMonthlyRevenue] = useState(0);
  const [customerCount, setCustomerCount] = useState(0);
  const [monthlyOrders, setMonthlyOrders] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const [customersResult, statsResult, ordersResult] = await Promise.all([
        api.customers.myCustomers().catch(() => ({ data: [], total: 0 })),
        api.salespersons.getMyStats().catch(() => null),
        api.orders.myOrders().catch(() => []),
      ]);

      setCustomerCount(customersResult.total || customersResult.data.length);

      if (statsResult) {
        setMonthlyRevenue(statsResult.monthlyRevenue || statsResult.monthlyAmount || 0);
        setMonthlyOrders(statsResult.monthlyOrders || statsResult.monthlyCount || 0);
      } else {
        // 从订单数据中计算本月统计
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        const monthOrders = (ordersResult || []).filter((o: any) => {
          const orderDate = o.createdAt || o.classDate || "";
          return String(orderDate).startsWith(currentMonth);
        });
        setMonthlyOrders(monthOrders.length);
        const revenue = monthOrders.reduce((sum: number, o: any) => {
          return sum + (Number(o.paymentAmount) || 0);
        }, 0);
        setMonthlyRevenue(revenue);
      }
    } catch (e) {
      console.error("[SalesHome] fetchStats error:", e);
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
              {currentRole ? ROLE_LABELS[currentRole] : "销售"}中心
            </Text>
            <Text className="text-base text-muted mt-1">
              {user?.name || "销售"}，欢迎使用<Text className="text-primary font-semibold">{currentRole ? ROLE_LABELS[currentRole] : "销售"}</Text>端
            </Text>
          </View>

          {/* 统计卡片 */}
          <View className="flex-row gap-3">
            {/* 本月业绩 */}
            <View className="flex-1 bg-surface rounded-2xl p-4">
              <Text className="text-sm text-muted mb-2">本月业绩</Text>
              {loading ? (
                <ActivityIndicator size="small" />
              ) : (
                <Text className="text-3xl font-bold text-foreground">{monthlyRevenue}</Text>
              )}
              <Text className="text-xs text-muted mt-1">元</Text>
            </View>

            {/* 客户数量 */}
            <View className="flex-1 bg-surface rounded-2xl p-4">
              <Text className="text-sm text-muted mb-2">客户数量</Text>
              {loading ? (
                <ActivityIndicator size="small" />
              ) : (
                <Text className="text-3xl font-bold text-primary">{customerCount}</Text>
              )}
              <Text className="text-xs text-muted mt-1">人</Text>
            </View>

            {/* 本月订单 */}
            <View className="flex-1 bg-surface rounded-2xl p-4">
              <Text className="text-sm text-muted mb-2">本月订单</Text>
              {loading ? (
                <ActivityIndicator size="small" />
              ) : (
                <Text className="text-3xl font-bold text-success">{monthlyOrders}</Text>
              )}
              <Text className="text-xs text-muted mt-1">单</Text>
            </View>
          </View>

          {/* 功能入口 */}
          <View>
            <Text className="text-lg font-semibold text-foreground mb-3">
              业务管理
            </Text>
            <View className="gap-3">
              {/* 客户管理 */}
              <TouchableOpacity
                onPress={() => handlePress("/(sales)/customers")}
                className="bg-surface rounded-2xl p-4 flex-row items-center justify-between active:opacity-70"
              >
                <View>
                  <Text className="text-base font-semibold text-foreground">
                    客户管理
                  </Text>
                  <Text className="text-sm text-muted mt-1">
                    查看和管理客户信息
                  </Text>
                </View>
                <Text className="text-2xl">👥</Text>
              </TouchableOpacity>

              {/* 销售业绩 */}
              <TouchableOpacity
                onPress={() => handlePress("/(sales)/performance")}
                className="bg-surface rounded-2xl p-4 flex-row items-center justify-between active:opacity-70"
              >
                <View>
                  <Text className="text-base font-semibold text-foreground">
                    销售业绩
                  </Text>
                  <Text className="text-sm text-muted mt-1">
                    查看业绩数据和排名
                  </Text>
                </View>
                <Text className="text-2xl">📊</Text>
              </TouchableOpacity>

              {/* 订单跟踪 */}
              <TouchableOpacity
                onPress={() => handlePress("/(sales)/orders")}
                className="bg-surface rounded-2xl p-4 flex-row items-center justify-between active:opacity-70"
              >
                <View>
                  <Text className="text-base font-semibold text-foreground">
                    订单跟踪
                  </Text>
                  <Text className="text-sm text-muted mt-1">
                    跟踪订单状态和进度
                  </Text>
                </View>
                <Text className="text-2xl">📦</Text>
              </TouchableOpacity>

              {/* 销售工具 */}
              <TouchableOpacity
                onPress={() => handlePress("/(sales)/tools")}
                className="bg-surface rounded-2xl p-4 flex-row items-center justify-between active:opacity-70"
              >
                <View>
                  <Text className="text-base font-semibold text-foreground">
                    销售工具
                  </Text>
                  <Text className="text-sm text-muted mt-1">
                    使用销售辅助工具
                  </Text>
                </View>
                <Text className="text-2xl">🛠️</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
