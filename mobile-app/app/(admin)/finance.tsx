import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from "react-native";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useState, useCallback, useEffect, useMemo, memo } from "react";
import sdkApi from "@/lib/sdk/api";
import { Ionicons } from "@expo/vector-icons";
import { SimpleBarChart } from "@/components/charts/simple-bar-chart";
import { SimplePieChart } from "@/components/charts/simple-pie-chart";
import enhancedCache, { ENHANCED_CACHE_KEYS } from "@/lib/enhanced-cache";
import errorLogger from "@/lib/error-logger";

// 统计卡片组件 - React.memo优化
const StatCard = memo(function StatCard({ 
  value, label, color 
}: { 
  value: string; label: string; color: string 
}) {
  return (
    <View className="flex-1 bg-surface rounded-2xl p-4 items-center">
      <Text className="text-xl font-bold" style={{ color }}>{value}</Text>
      <Text className="text-xs text-muted mt-1">{label}</Text>
    </View>
  );
});

// 城市收入行组件 - React.memo优化
const CityRevenueRow = memo(function CityRevenueRow({
  index, city, revenue, maxRevenue, primaryColor, borderColor, formatMoney,
}: {
  index: number; city: string; revenue: number; maxRevenue: number;
  primaryColor: string; borderColor: string; formatMoney: (v: number) => string;
}) {
  return (
    <View style={{ marginBottom: 10 }}>
      <View className="flex-row items-center justify-between mb-1">
        <Text className="text-sm text-foreground">{index + 1}. {city}</Text>
        <Text className="text-sm font-medium" style={{ color: primaryColor }}>¥{formatMoney(revenue)}</Text>
      </View>
      <View style={{ height: 16, backgroundColor: borderColor, borderRadius: 8, overflow: 'hidden' }}>
        <View style={{
          height: '100%',
          width: `${Math.max((revenue / maxRevenue) * 100, 2)}%`,
          backgroundColor: primaryColor,
          borderRadius: 8,
        }} />
      </View>
    </View>
  );
});

export default function AdminFinanceScreen() {
  const colors = useColors();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => { loadData(); }, []);

  const loadData = useCallback(async () => {
    try {
      if (!refreshing) setLoading(true);
      
      // 优化7: 使用缓存
      const cached = await enhancedCache.get<any[]>(ENHANCED_CACHE_KEYS.FINANCE_STATS);
      if (cached && !refreshing) {
        setOrders(cached);
        setLoading(false);
      }
      
      const result = await sdkApi.orders.list().catch(() => []);
      const orderList = Array.isArray(result) ? result : [];
      setOrders(orderList);
      
      // 缓存结果
      await enhancedCache.set(ENHANCED_CACHE_KEYS.FINANCE_STATS, orderList);
    } catch (error) {
      errorLogger.error('AdminFinance', 'Load failed', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshing]);

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const currentMonth = today.substring(0, 7);
    
    const totalRevenue = orders.reduce((s, o) => s + parseFloat(o.courseAmount || '0'), 0);
    const monthOrders = orders.filter(o => (o.createdAt || o.classDate || '').startsWith(currentMonth));
    const monthRevenue = monthOrders.reduce((s, o) => s + parseFloat(o.courseAmount || '0'), 0);
    const todayOrders = orders.filter(o => (o.createdAt || o.classDate || '').startsWith(today));
    const todayRevenue = todayOrders.reduce((s, o) => s + parseFloat(o.courseAmount || '0'), 0);
    
    // 按城市统计
    const cityMap = new Map<string, number>();
    orders.forEach(o => {
      const city = o.deliveryCity || '未知';
      cityMap.set(city, (cityMap.get(city) || 0) + parseFloat(o.courseAmount || '0'));
    });
    const cityStats = Array.from(cityMap.entries())
      .map(([city, revenue]) => ({ city, revenue: Math.round(revenue) }))
      .sort((a, b) => b.revenue - a.revenue);

    // 按月份统计（用于图表）
    const monthMap = new Map<string, number>();
    orders.forEach(o => {
      const month = (o.createdAt || o.classDate || '').substring(0, 7);
      if (month) {
        monthMap.set(month, (monthMap.get(month) || 0) + parseFloat(o.courseAmount || '0'));
      }
    });
    const monthlyStats = Array.from(monthMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-6)
      .map(([month, revenue]) => ({
        label: month.substring(5),
        value: Math.round(revenue),
      }));

    // 按状态统计（用于饼图）
    const statusMap = new Map<string, number>();
    orders.forEach(o => {
      const status = o.status || '未知';
      statusMap.set(status, (statusMap.get(status) || 0) + 1);
    });
    const statusColors: Record<string, string> = {
      'paid': '#10B981',
      'completed': '#3B82F6',
      'pending': '#F59E0B',
      'cancelled': '#EF4444',
      'refunded': '#8B5CF6',
    };
    const statusLabels: Record<string, string> = {
      'paid': '已支付',
      'completed': '已完成',
      'pending': '待支付',
      'cancelled': '已取消',
      'refunded': '已退款',
    };
    const statusStats = Array.from(statusMap.entries()).map(([status, count]) => ({
      label: statusLabels[status] || status,
      value: count,
      color: statusColors[status] || '#9CA3AF',
    }));

    return {
      totalRevenue: Math.round(totalRevenue),
      monthRevenue: Math.round(monthRevenue),
      todayRevenue: Math.round(todayRevenue),
      totalOrders: orders.length,
      monthOrders: monthOrders.length,
      todayOrders: todayOrders.length,
      cityStats,
      monthlyStats,
      statusStats,
    };
  }, [orders]);

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
            <Text className="text-2xl font-bold text-foreground">财务管理</Text>
          </View>

          {loading ? (
            <View className="items-center justify-center py-20">
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <>
              {/* 收入概览 */}
              <View className="flex-row gap-3">
                <StatCard value={`¥${formatMoney(stats.totalRevenue)}`} label="总收入" color={colors.primary} />
                <StatCard value={`¥${formatMoney(stats.monthRevenue)}`} label="本月收入" color={colors.foreground} />
                <StatCard value={`¥${formatMoney(stats.todayRevenue)}`} label="今日收入" color={colors.success} />
              </View>

              {/* 订单统计 */}
              <View className="bg-surface rounded-2xl p-4">
                <Text className="text-base font-semibold text-foreground mb-3">订单统计</Text>
                <View className="flex-row justify-between">
                  <View className="items-center flex-1">
                    <Text className="text-xl font-bold text-foreground">{stats.totalOrders}</Text>
                    <Text className="text-xs text-muted mt-1">总订单</Text>
                  </View>
                  <View className="items-center flex-1">
                    <Text className="text-xl font-bold" style={{ color: colors.primary }}>{stats.monthOrders}</Text>
                    <Text className="text-xs text-muted mt-1">本月订单</Text>
                  </View>
                  <View className="items-center flex-1">
                    <Text className="text-xl font-bold text-success">{stats.todayOrders}</Text>
                    <Text className="text-xs text-muted mt-1">今日订单</Text>
                  </View>
                </View>
              </View>

              {/* 优化4: 月度收入趋势图表 */}
              {stats.monthlyStats.length > 0 && (
                <View className="bg-surface rounded-2xl p-4">
                  <SimpleBarChart
                    data={stats.monthlyStats}
                    title="月度收入趋势"
                    height={180}
                    barColor={colors.primary}
                    formatValue={(v) => v >= 10000 ? `${(v / 10000).toFixed(1)}w` : `${v}`}
                  />
                </View>
              )}

              {/* 优化4: 订单状态分布图表 */}
              {stats.statusStats.length > 0 && (
                <View className="bg-surface rounded-2xl p-4">
                  <SimplePieChart
                    data={stats.statusStats}
                    title="订单状态分布"
                    formatValue={(v) => `${v}单`}
                  />
                </View>
              )}

              {/* 城市收入排行 */}
              {stats.cityStats.length > 0 && (
                <View className="bg-surface rounded-2xl p-4">
                  <Text className="text-base font-semibold text-foreground mb-3">城市收入排行</Text>
                  {stats.cityStats.map((city, index) => {
                    const maxCityRevenue = Math.max(...stats.cityStats.map(c => c.revenue), 1);
                    return (
                      <CityRevenueRow
                        key={city.city}
                        index={index}
                        city={city.city}
                        revenue={city.revenue}
                        maxRevenue={maxCityRevenue}
                        primaryColor={colors.primary}
                        borderColor={colors.border}
                        formatMoney={formatMoney}
                      />
                    );
                  })}
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
