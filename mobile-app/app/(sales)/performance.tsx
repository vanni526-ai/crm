import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from "react-native";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useState, useCallback, useEffect, useMemo, memo } from "react";
import sdkApi from "@/lib/sdk/api";
import { Ionicons } from "@expo/vector-icons";
import { SimpleBarChart } from "@/components/charts/simple-bar-chart";
import { SimpleLineChart } from "@/components/charts/simple-line-chart";
import enhancedCache, { ENHANCED_CACHE_KEYS } from "@/lib/enhanced-cache";
import errorLogger from "@/lib/error-logger";

// 优化9: 月度明细行组件 - React.memo
const MonthlyDetailRow = memo(function MonthlyDetailRow({
  month, revenue, orders, customers, isLast, borderColor, primaryColor, formatMoney,
}: {
  month: string; revenue: number; orders: number; customers: number;
  isLast: boolean; borderColor: string; primaryColor: string;
  formatMoney: (v: number) => string;
}) {
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingVertical: 10,
      borderBottomWidth: isLast ? 0 : 0.5,
      borderBottomColor: borderColor,
    }}>
      <Text className="text-sm text-foreground font-medium" style={{ width: 80 }}>{month}</Text>
      <Text className="text-sm" style={{ color: primaryColor, flex: 1, textAlign: 'right' }}>
        ¥{formatMoney(revenue)}
      </Text>
      <Text className="text-xs text-muted" style={{ width: 50, textAlign: 'right' }}>
        {orders}单
      </Text>
      <Text className="text-xs text-muted" style={{ width: 50, textAlign: 'right' }}>
        {customers}客
      </Text>
    </View>
  );
});

export default function SalesPerformanceScreen() {
  const colors = useColors();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => { loadData(); }, []);

  const loadData = useCallback(async () => {
    try {
      if (!refreshing) setLoading(true);
      
      // 优化7: 缓存
      const cached = await enhancedCache.get<any[]>(ENHANCED_CACHE_KEYS.SALES_PERFORMANCE);
      if (cached && !refreshing) {
        setOrders(cached);
        setLoading(false);
      }
      
      const result = await sdkApi.orders.list().catch(() => []);
      const orderList = Array.isArray(result) ? result : [];
      setOrders(orderList);
      await enhancedCache.set(ENHANCED_CACHE_KEYS.SALES_PERFORMANCE, orderList);
    } catch (error) {
      errorLogger.error('SalesPerformance', 'Load failed', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshing]);

  // 按月份统计
  const monthlyStats = useMemo(() => {
    const monthMap = new Map<string, { revenue: number; orders: number; customers: Set<string> }>();
    
    orders.forEach((o: any) => {
      const date = o.classDate || o.createdAt || '';
      const month = date.substring(0, 7);
      if (!month) return;
      
      if (!monthMap.has(month)) {
        monthMap.set(month, { revenue: 0, orders: 0, customers: new Set() });
      }
      const stat = monthMap.get(month)!;
      stat.revenue += parseFloat(o.courseAmount || o.paymentAmount || '0');
      stat.orders += 1;
      if (o.customerName) stat.customers.add(o.customerName);
    });

    return Array.from(monthMap.entries())
      .map(([month, stat]) => ({
        month,
        revenue: Math.round(stat.revenue),
        orders: stat.orders,
        customers: stat.customers.size,
      }))
      .sort((a, b) => b.month.localeCompare(a.month));
  }, [orders]);

  // 总计
  const totals = useMemo(() => {
    const totalRevenue = orders.reduce((s: number, o: any) => s + parseFloat(o.courseAmount || '0'), 0);
    const customerSet = new Set(orders.map((o: any) => o.customerName).filter(Boolean));
    return {
      revenue: Math.round(totalRevenue),
      orders: orders.length,
      customers: customerSet.size,
    };
  }, [orders]);

  // 优化4: 图表数据
  const chartData = useMemo(() => {
    const reversed = [...monthlyStats].reverse().slice(-6);
    const barData = reversed.map(s => ({
      label: s.month.substring(5),
      value: s.revenue,
    }));
    const lineData = reversed.map(s => ({
      label: s.month.substring(5),
      value: s.orders,
    }));
    return { barData, lineData };
  }, [monthlyStats]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const formatMoney = useCallback((v: number) => v >= 10000 ? `${(v / 10000).toFixed(1)}万` : `${v}`, []);

  return (
    <ScreenContainer className="bg-background">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <View className="p-6 gap-4">
          <View className="flex-row items-center mb-2">
            <TouchableOpacity onPress={() => router.back()} className="mr-3 active:opacity-70">
              <Ionicons name="arrow-back" size={24} color={colors.foreground} />
            </TouchableOpacity>
            <Text className="text-2xl font-bold text-foreground">业绩统计</Text>
          </View>

          {loading ? (
            <View className="items-center justify-center py-20">
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <>
              {/* 总计 */}
              <View className="flex-row gap-3">
                <View className="flex-1 bg-surface rounded-2xl p-4 items-center">
                  <Text className="text-2xl font-bold" style={{ color: colors.primary }}>¥{formatMoney(totals.revenue)}</Text>
                  <Text className="text-xs text-muted mt-1">总业绩</Text>
                </View>
                <View className="flex-1 bg-surface rounded-2xl p-4 items-center">
                  <Text className="text-2xl font-bold text-foreground">{totals.orders}</Text>
                  <Text className="text-xs text-muted mt-1">总订单</Text>
                </View>
                <View className="flex-1 bg-surface rounded-2xl p-4 items-center">
                  <Text className="text-2xl font-bold text-success">{totals.customers}</Text>
                  <Text className="text-xs text-muted mt-1">总客户</Text>
                </View>
              </View>

              {/* 优化4: 月度业绩柱状图 */}
              {chartData.barData.length > 0 && (
                <View className="bg-surface rounded-2xl p-4">
                  <SimpleBarChart
                    data={chartData.barData}
                    title="月度业绩趋势"
                    height={180}
                    barColor={colors.primary}
                    formatValue={(v) => v >= 10000 ? `${(v / 10000).toFixed(1)}w` : `${v}`}
                  />
                </View>
              )}

              {/* 优化4: 月度订单量趋势 */}
              {chartData.lineData.length > 0 && (
                <View className="bg-surface rounded-2xl p-4">
                  <SimpleLineChart
                    data={chartData.lineData}
                    title="月度订单量趋势"
                    height={140}
                    lineColor={colors.success}
                    formatValue={(v) => `${v}单`}
                  />
                </View>
              )}

              {/* 月度明细 */}
              <View className="bg-surface rounded-2xl p-4">
                <Text className="text-base font-semibold text-foreground mb-3">月度明细</Text>
                {monthlyStats.map((stat, index) => (
                  <MonthlyDetailRow
                    key={stat.month}
                    month={stat.month}
                    revenue={stat.revenue}
                    orders={stat.orders}
                    customers={stat.customers}
                    isLast={index === monthlyStats.length - 1}
                    borderColor={colors.border}
                    primaryColor={colors.primary}
                    formatMoney={formatMoney}
                  />
                ))}
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
