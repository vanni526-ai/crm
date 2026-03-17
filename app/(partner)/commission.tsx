import { useState, useEffect, useMemo } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from "react-native";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { Ionicons } from "@expo/vector-icons";
import { trpc } from "@/lib/trpc";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@/lib/auth-context";

/**
 * 分红明细页面
 * 
 * 展示合伙人的月度分红账单
 * 按月份筛选，每个月份显示对应的账单数据
 */
export default function CommissionDetailScreen() {
  const colors = useColors();
  const { state: authState } = useAuth();
  const user = authState.user;
  const [userId, setUserId] = useState<number | null>(null);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const [partnerId, setPartnerId] = useState<number | null>(null);
  const [partnerCities, setPartnerCities] = useState<any[]>([]);

  // 从 AsyncStorage 读取用户ID
  useEffect(() => {
    AsyncStorage.getItem('auth_user_info').then(userInfoStr => {
      if (userInfoStr) {
        try {
          const userInfo = JSON.parse(userInfoStr);
          console.log('[Commission] User info from AsyncStorage:', userInfo);
          setUserId(userInfo.id);
        } catch (e) {
          console.error('[Commission] Failed to parse user info:', e);
        }
      }
    });
  }, []);

  // 使用tRPC查询账单数据
  const { data: bills = [], isLoading, error, refetch } = trpc.cityExpense.list.useQuery({
    month: selectedMonth,
  });

  // 通过 userId 获取 partnerId
  const { data: partnerData } = trpc.partnerManagement.getPartnerIdByUserId.useQuery(
    { userId: userId || 0 },
    { enabled: !!userId }
  );

  useEffect(() => {
    if (partnerData?.partnerId) {
      setPartnerId(partnerData.partnerId);
      console.log('[Commission] Got partnerId:', partnerData.partnerId);
    }
  }, [partnerData]);

  // 使用 tRPC 客户端调用本地后端的 getPartnerCities API
  const { data: partnerCitiesData, isLoading: citiesQueryLoadingState } = trpc.partnerManagement.getPartnerCities.useQuery(
    { partnerId: partnerId || 0 },
    { enabled: !!partnerId }
  );

  useEffect(() => {
    if (partnerCitiesData) {
      console.log('[Commission] Got partner cities from tRPC:', partnerCitiesData);
      setPartnerCities(partnerCitiesData);
    }
    setCitiesLoading(citiesQueryLoadingState);
  }, [partnerCitiesData, citiesQueryLoadingState]);



  // 根据合伙人的城市权限过滤账单
  const allowedCities = useMemo(() => {
    if (!partnerCities || partnerCities.length === 0) {
      console.log('[Commission] No partner cities, returning empty array');
      return [];
    }
    const cityNames = partnerCities.map((city: any) => city.cityName || city);
    console.log('[Commission] Allowed cities from partner:', cityNames);
    return cityNames;
  }, [partnerCities]);

  // 城市合伙人只能看到他们有账单的城市
  // 这比依赖 userManagement.getById 更可靠
  const filteredBills = useMemo(() => {
    if (allowedCities.length === 0) {
      console.log('[Commission] No allowed cities found');
      return [];
    }
    
    const filtered = bills.filter((bill: any) => allowedCities.includes(bill.cityName));
    console.log('[Commission] Filtered bills:', filtered.length, '/', bills.length);
    return filtered;
  }, [bills, allowedCities]);

  // 调试：监控查询状态
  useEffect(() => {
    console.log('[Commission] ===== DEBUG INFO =====');
    console.log('[Commission] Query state:', { isLoading, error: error?.message, billsCount: bills.length });
    console.log('[Commission] Partner ID:', partnerId);
    console.log('[Commission] Cities Loading:', citiesLoading);
    console.log('[Commission] Partner cities count:', partnerCities.length);
    console.log('[Commission] Partner cities:', partnerCities);
    console.log('[Commission] Allowed cities:', allowedCities);
    console.log('[Commission] Filtered bills count:', filteredBills.length);
    console.log('[Commission] ===== END DEBUG =====');
  }, [isLoading, error, bills, partnerId, citiesLoading, partnerCities, allowedCities, filteredBills]);

  // 调试：检查Token和用户信息
  useEffect(() => {
    AsyncStorage.getItem('auth_token').then(token => {
      console.log('[Commission] Token in AsyncStorage:', token ? token.substring(0, 20) + '...' : 'null');
    });
    console.log('[Commission] User info:', JSON.stringify(user, null, 2));
    console.log('[Commission] UserId:', userId);
    console.log('[Commission] PartnerId:', partnerId);
    console.log('[Commission] Cities Loading:', citiesLoading);
  }, [user, userId, partnerId, citiesLoading]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  };

  const handlePress = async (route: string) => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {
      console.warn('[Commission] Haptics error:', e);
    }
    router.push(route as any);
  };

  const handleMonthChange = (month: string) => {
    setSelectedMonth(month);
  };

  // 格式化金额显示
  const formatAmount = (amount: string | number) => {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return num.toFixed(2);
  };

  // 格式化月份显示
  const formatMonth = (month: string) => {
    const [year, monthNum] = month.split("-");
    return `${year}年${parseInt(monthNum)}月`;
  };

  // 生成月份选择器（最近12个月）
  const generateMonths = () => {
    const months = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      months.push(`${year}-${month}`);
    }
    return months;
  };

  const months = generateMonths();

  // 根据城市权限判断是否正在加载
  const isLoadingCities = citiesLoading || (!partnerCities || partnerCities.length === 0);
  const isLoadingAll = isLoading || isLoadingCities;

  // 计算总计数据（使用过滤后的账单）
  const totalStats = filteredBills.reduce(
    (acc: any, bill: any) => ({
      salesAmount: acc.salesAmount + parseFloat(bill.salesAmount || '0'),
      orderCount: acc.orderCount + bill.orderCount,
      totalExpense: acc.totalExpense + parseFloat(bill.totalExpense || '0'),
      partnerShare: acc.partnerShare + parseFloat(bill.partnerShare || '0'),
      partnerDividend: acc.partnerDividend + parseFloat(bill.partnerDividend || '0'),
    }),
    {
      salesAmount: 0,
      orderCount: 0,
      totalExpense: 0,
      partnerShare: 0,
      partnerDividend: 0,
    }
  );

  return (
    <ScreenContainer className="bg-background">
      {/* 顶部导航栏 */}
      <View className="px-6 pt-6 pb-4">

        <View className="flex-row items-center mb-4">
          <TouchableOpacity
            onPress={() => router.back()}
            className="mr-3 active:opacity-70"
          >
            <Ionicons name="arrow-back" size={24} color={colors.foreground} />
          </TouchableOpacity>
          <Text className="text-2xl font-bold text-foreground">分红明细</Text>
        </View>

        {/* 月份选择器 */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="flex-row gap-2"
        >
          {months.map((month) => (
            <TouchableOpacity
              key={month}
              onPress={() => handleMonthChange(month)}
              className={`px-4 py-2 rounded-full ${
                selectedMonth === month
                  ? "bg-primary"
                  : "bg-surface border border-border"
              }`}
            >
              <Text
                className={`text-sm font-medium ${
                  selectedMonth === month ? "text-white" : "text-foreground"
                }`}
              >
                {formatMonth(month)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* 账单列表 */}
      <ScrollView
        className="flex-1 px-6"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {isLoadingAll ? (
          <View className="items-center justify-center py-20">
            <ActivityIndicator size="large" color={colors.primary} />
            <Text className="text-sm text-muted mt-4">加载中...</Text>
          </View>
        ) : error || (partnerCities && partnerCities.length === 0 && partnerId) ? (
          <View className="items-center justify-center py-20">
            <Ionicons name="alert-circle-outline" size={64} color={colors.error} />
            <Text className="text-base text-destructive mt-4">加载失败</Text>
            {error && <Text className="text-sm text-muted mt-2">{error.message}</Text>}
            {partnerCities && partnerCities.length === 0 && partnerId && (
              <Text className="text-sm text-muted mt-2">没有获取到城市权限信息</Text>
            )}
            <TouchableOpacity
              onPress={() => refetch()}
              className="mt-4 px-6 py-3 bg-primary rounded-full"
            >
              <Text className="text-white font-medium">重试</Text>
            </TouchableOpacity>
          </View>
        ) : filteredBills.length === 0 ? (
          <View className="items-center justify-center py-20">
            <Ionicons name="document-text-outline" size={64} color={colors.muted} />
            <Text className="text-base text-muted mt-4">暂无分红记录</Text>
            <Text className="text-sm text-muted mt-2">{formatMonth(selectedMonth)}</Text>
          </View>
        ) : (
          <View className="gap-4 pb-6">
            {/* 月度总计卡片 */}
            <View className="bg-surface rounded-2xl p-5">
              <Text className="text-lg font-bold text-foreground mb-4">
                {formatMonth(selectedMonth)} 总计
              </Text>

              {/* 分红总额（突出显示） */}
              <View className="bg-background rounded-xl p-4 mb-3">
                <Text className="text-sm text-muted mb-1">合伙人分红总额</Text>
                <Text
                  className="text-3xl font-bold"
                  style={{ color: colors.warning }}
                >
                  ￥{formatAmount(totalStats.partnerDividend)}
                </Text>
              </View>

              {/* 总计数据 */}
              <View className="gap-2">
                <View className="flex-row justify-between">
                  <Text className="text-sm text-muted">销售额总计</Text>
                  <Text className="text-sm font-medium text-foreground">
                    ￥{formatAmount(totalStats.salesAmount)}
                  </Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-sm text-muted">订单总数</Text>
                  <Text className="text-sm font-medium text-foreground">
                    {totalStats.orderCount}
                  </Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-sm text-muted">总费用</Text>
                  <Text className="text-sm font-medium text-foreground">
                    ￥{formatAmount(totalStats.totalExpense)}
                  </Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-sm text-muted">合伙人承担总计</Text>
                  <Text className="text-sm font-medium text-foreground">
                    ￥{formatAmount(totalStats.partnerShare)}
                  </Text>
                </View>
              </View>
            </View>

            {/* 各城市账单卡片 */}
            <Text className="text-base font-semibold text-foreground mt-2 mb-1">
              各城市明细
            </Text>
            {filteredBills.map((bill: any) => (
              <TouchableOpacity
                key={bill.id}
                onPress={() => handlePress(`/(partner)/commission/${bill.id}`)}
                className="bg-surface rounded-2xl p-5 active:opacity-70"
              >
                {/* 城市名称 */}
                <View className="flex-row items-center justify-between mb-4">
                  <View>
                    <Text className="text-lg font-bold text-foreground">
                      {bill.cityName}
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={colors.muted}
                  />
                </View>

                {/* 分红金额（突出显示） */}
                <View className="bg-background rounded-xl p-4 mb-3">
                  <Text className="text-sm text-muted mb-1">合伙人分红</Text>
                  <Text
                    className="text-3xl font-bold"
                    style={{ color: colors.warning }}
                  >
                    ￥{formatAmount(bill.partnerDividend)}
                  </Text>
                </View>

                {/* 详细数据 */}
                <View className="gap-2">
                  <View className="flex-row justify-between">
                    <Text className="text-sm text-muted">销售额</Text>
                    <Text className="text-sm font-medium text-foreground">
                      ￥{formatAmount(bill.salesAmount)}
                    </Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-sm text-muted">订单数</Text>
                    <Text className="text-sm font-medium text-foreground">
                      {bill.orderCount}
                    </Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-sm text-muted">总费用</Text>
                    <Text className="text-sm font-medium text-foreground">
                      ￥{formatAmount(bill.totalExpense)}
                    </Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-sm text-muted">合伙人承担</Text>
                    <Text className="text-sm font-medium text-foreground">
                      ￥{formatAmount(bill.partnerShare)}
                    </Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-sm text-muted">费用分摊比例</Text>
                    <Text className="text-sm font-medium text-foreground">
                      {bill.costShareRatio}%
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
