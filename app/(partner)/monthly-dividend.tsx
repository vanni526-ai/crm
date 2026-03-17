import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { useState, useEffect, useMemo } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { Ionicons } from "@expo/vector-icons";

/**
 * 最近分红明细页面
 * 
 * 展示最近一个月的详细分红构成：
 * 1. 销售额 + 订单数（左右对齐）
 * 2. 费用项目明细（标注合伙人承担的项目）
 * 3. 承担比例 + 合伙人承担（左右对齐）
 * 4. 合同后付款（左右对齐）
 * 5. 合伙人分红（最终金额，左右对齐）
 */
export default function MonthlyDividendScreen() {
  const colors = useColors();
  const [userId, setUserId] = useState<number | null>(null);
  const [partnerId, setPartnerId] = useState<number | null>(null);
  const [partnerCities, setPartnerCities] = useState<any[]>([]);
  const [cityId, setCityId] = useState<number | null>(null);

  // 从asyncStorage获取用户信息
  useEffect(() => {
    const loadUserInfo = async () => {
      try {
        // 尝试多个key，兼容不同的存储方式
        let userStr = await AsyncStorage.getItem("user_info");
        if (!userStr) {
          userStr = await AsyncStorage.getItem("auth_user_info");
        }
        
        if (userStr) {
          const user = JSON.parse(userStr);
          setUserId(user.id);
          console.log("[MonthlyDividend] User ID:", user.id);
          console.log("[MonthlyDividend] User data:", user);
        } else {
          console.error("[MonthlyDividend] No user info found in AsyncStorage");
        }
      } catch (error) {
        console.error("[MonthlyDividend] Failed to load user info:", error);
      }
    };
    loadUserInfo();
  }, []);

  // 通过 userId 获取 partnerId
  const { data: partnerData } = trpc.partnerManagement.getPartnerIdByUserId.useQuery(
    { userId: userId || 0 },
    { enabled: !!userId }
  );

  useEffect(() => {
    if (partnerData?.partnerId) {
      setPartnerId(partnerData.partnerId);
      console.log('[MonthlyDividend] Got partnerId:', partnerData.partnerId);
    }
  }, [partnerData]);

  // 使用 tRPC 客户端调用本地后端的 getPartnerCities API
  const { data: partnerCitiesData, isLoading: citiesQueryLoadingState } = trpc.partnerManagement.getPartnerCities.useQuery(
    { partnerId: partnerId || 0 },
    { enabled: !!partnerId }
  );

  useEffect(() => {
    if (partnerCitiesData) {
      console.log('[MonthlyDividend] Got partner cities from tRPC:', partnerCitiesData);
      setPartnerCities(partnerCitiesData);
    }
  }, [partnerCitiesData]);

  // 获取所有账单数据
  const { data: allBills, isLoading: billsLoading } = trpc.cityExpense.list.useQuery({});
  
  // 版本标记：V3 - 使用合伙人城市权限
  console.log('[MonthlyDividend] CODE VERSION: V3 - Using partner cities');

  // 从所有账单中找到最近一个有数据的月份
  const bills = useMemo(() => {
    if (!allBills || allBills.length === 0) return [];
    
    // 按月份降序排序（最新的在前）
    const sorted = [...allBills].sort((a, b) => {
      return b.month.localeCompare(a.month);
    });
    
    // 返回最近一个月份的所有账单
    const latestMonth = sorted[0]?.month;
    console.log('[MonthlyDividend] Latest month:', latestMonth);
    return sorted.filter(b => b.month === latestMonth);
  }, [allBills]);

  // 根据合伙人的城市权限过滤账单
  const allowedCities = useMemo(() => {
    if (!partnerCities || partnerCities.length === 0) {
      console.log('[MonthlyDividend] No partner cities, returning empty array');
      return [];
    }
    const cityNames = partnerCities.map((city: any) => city.cityName || city);
    console.log('[MonthlyDividend] Allowed cities from partner:', cityNames);
    return cityNames;
  }, [partnerCities]);

  // 从账单列表中找到用户有权限的第一个城市的账单
  const currentBill = useMemo(() => {
    console.log('[MonthlyDividend] Looking for bill with cityId:', cityId, 'allowed cities:', allowedCities);
    if (!bills || allowedCities.length === 0) return null;
    
    // 如果有选中的 cityId，优先使用
    if (cityId) {
      const bill = bills.find(b => b.cityId === cityId);
      if (bill) {
        console.log("[MonthlyDividend] Current bill (by cityId):", bill);
        return bill;
      }
    }
    
    // 否则找第一个有权限的城市
    const bill = bills.find(b => allowedCities.includes(b.cityName));
    
    if (bill) {
      console.log("[MonthlyDividend] Current bill (by city name):", bill);
    } else {
      console.log("[MonthlyDividend] No bill found for allowed cities");
    }
    
    return bill;
  }, [bills, allowedCities, cityId]);

  // 从账单中提取cityId
  useEffect(() => {
    if (currentBill) {
      setCityId(currentBill.cityId);
      console.log("[MonthlyDividend] City ID from bill:", currentBill.cityId);
    }
  }, [currentBill]);

  // 获取城市合伙人费用承担配置
  const { data: expenseCoverage } = trpc.partnerManagement.getCityExpenseCoverage.useQuery(
    { partnerId: partnerId || 0, cityId: cityId || 0 },
    { enabled: !!partnerId && !!cityId }
  );
  
  console.log('[MonthlyDividend] expenseCoverage:', expenseCoverage);

  // 注：分红金额从 currentBill 中的 partnerDividend 字段获取
  // 不需要额外的 API 调用

  // 费用项目配置
  const expenseItems = useMemo(() => {
    if (!currentBill) return [];

    const coverage = expenseCoverage || {};
    
    console.log('[MonthlyDividend] currentBill:', currentBill);
    
    return [
      { key: 'rentFee', label: '房租', value: currentBill.rentFee, covered: coverage.rentFee },
      { key: 'propertyFee', label: '物业费', value: currentBill.propertyFee, covered: coverage.propertyFee },
      { key: 'utilityFee', label: '水电费', value: currentBill.utilityFee, covered: coverage.utilityFee },
      { key: 'consumablesFee', label: '道具耗材', value: currentBill.consumablesFee, covered: coverage.consumablesFee },
      { key: 'cleaningFee', label: '保洁费', value: currentBill.cleaningFee, covered: coverage.cleaningFee },
      { key: 'phoneFee', label: '话费', value: currentBill.phoneFee, covered: coverage.phoneFee },
      { key: 'courierFee', label: '快递费', value: currentBill.courierFee || currentBill.expressFee, covered: coverage.courierFee },
      { key: 'promotionFee', label: '推广费', value: currentBill.promotionFee, covered: coverage.promotionFee },
      { key: 'otherFee', label: '其他费用', value: currentBill.otherFee, covered: coverage.otherFee },
      { key: 'teacherFee', label: '老师费用', value: currentBill.teacherFee, covered: coverage.teacherFee },
      { key: 'transportFee', label: '车费', value: currentBill.transportFee, covered: coverage.transportFee },
    ];
  }, [currentBill, expenseCoverage]);

  // 计算勾选项目的总费用
  const coveredExpenseTotal = useMemo(() => {
    return expenseItems.reduce((sum, item) => {
      if (item.covered) {
        const amount = parseFloat(item.value || '0');
        return sum + (isNaN(amount) ? 0 : amount);
      }
      return sum;
    }, 0);
  }, [expenseItems]);

  // 使用 coveredExpenseTotal 代替直接计算（为了不重复计算）

  // 处理城市切换
  const handleCityChange = (cityName: string) => {
    const bill = bills.find(b => b.cityName === cityName);
    if (bill) {
      setCityId(bill.cityId);
    }
  };

  const isLoading = billsLoading || citiesQueryLoadingState;

  if (isLoading) {
    return (
      <ScreenContainer className="bg-background">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primary} />
          <Text className="text-muted mt-4">加载中...</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (!currentBill) {
    return (
      <ScreenContainer className="bg-background">
        <View className="p-6">
          {/* 返回按鑒 */}
          <View className="flex-row items-center mb-6">
            <TouchableOpacity
              onPress={() => router.back()}
              className="mr-3 active:opacity-70"
            >
              <Ionicons name="arrow-back" size={24} color={colors.foreground} />
            </TouchableOpacity>
            <Text className="text-2xl font-bold text-foreground">最近分红明细</Text>
          </View>

          <View className="flex-1 items-center justify-center">
            <Text className="text-lg text-muted">暂无分红数据</Text>
            <Text className="text-sm text-muted mt-2">请联系管理员录入账单数据</Text>
          </View>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="bg-background">
      <ScrollView 
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="p-6 gap-6">
          {/* 返回按鑒和标题 */}
          <View>
            <View className="flex-row items-center mb-4">
              <TouchableOpacity
                onPress={() => router.back()}
                className="mr-3 active:opacity-70"
              >
                <Ionicons name="arrow-back" size={24} color={colors.foreground} />
              </TouchableOpacity>
              <Text className="text-2xl font-bold text-foreground">最近分红明细</Text>
            </View>
            <Text className="text-base text-muted mt-1">
              {currentBill.cityName} · {currentBill.month}
            </Text>
          </View>

          {/* 城市选择器 */}
          {partnerCities.length > 1 && (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              className="mb-6 -mx-6 px-6"
            >
              {partnerCities.map((cityObj) => (
                <TouchableOpacity
                  key={cityObj.cityName}
                  onPress={() => {
                    console.log('[MonthlyDividend] Switching to city:', cityObj.cityName, 'cityId:', cityObj.cityId);
                    setCityId(cityObj.cityId);
                  }}
                  className={`px-4 py-2 rounded-full mr-2 ${
                    currentBill?.cityId === cityObj.cityId 
                      ? 'bg-primary' 
                      : 'bg-surface border border-border'
                  }`}
                >
                  <Text 
                    className={`font-semibold ${
                      currentBill?.cityId === cityObj.cityId 
                        ? 'text-primary-foreground' 
                        : 'text-foreground'
                    }`}
                  >
                    {cityObj.cityName}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* 第一部分：销售额 + 订单数（左右对齐） */}
          <View className="bg-surface rounded-3xl p-4">
            <View className="flex-row items-center justify-between pb-3 border-b border-border">
              <View className="flex-1">
                <Text className="text-sm text-muted mb-0.5">销售额</Text>
                <Text className="text-lg font-bold text-foreground">
                  ¥{parseFloat(currentBill.salesAmount).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
              </View>
              <View className="flex-1 items-end">
                <Text className="text-sm text-muted mb-0.5">订单数</Text>
                <Text className="text-lg font-bold text-foreground">
                  {currentBill.orderCount}
                </Text>
              </View>
            </View>
          </View>

          {/* 第二部分：费用项目明细 */}
          <View className="bg-surface rounded-3xl p-4">
            <Text className="text-base font-semibold text-foreground mb-3">
              费用项目明细
            </Text>
            <View className="gap-2">
              {expenseItems.map((item) => {
                const amount = parseFloat(item.value);
                const isCovered = item.covered;
                
                return (
                  <View 
                    key={item.key}
                    className="py-1 border-b border-border"
                  >
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center gap-1.5 flex-1">
                        <Text 
                          className="text-sm"
                          style={{ 
                            color: isCovered ? colors.warning : '#000000',
                            fontWeight: '600'
                          }}
                        >
                          {item.label}
                        </Text>
                        {isCovered && (
                          <View 
                            className="px-1.5 py-0.5 rounded"
                            style={{ backgroundColor: colors.warning + '20' }}
                          >
                            <Text 
                              className="text-xs"
                              style={{ color: colors.warning }}
                            >
                              合伙承担
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text 
                        className="text-sm"
                        style={{ 
                          color: isCovered ? colors.warning : '#000000',
                          fontWeight: '600'
                        }}
                      >
{amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
            
            {/* 总费用 */}
            <View className="flex-row items-center justify-between pt-2 mt-2 border-t-2 border-border">
              <Text className="text-sm font-semibold text-foreground">
                总费用
              </Text>
              <Text className="text-lg font-bold text-foreground">
                ¥{parseFloat(currentBill.totalExpense).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
            </View>
            
            {/* 勾选项目的总费用 */}
            <View className="flex-row items-center justify-between pt-2 mt-2">
              <Text className="text-sm text-muted">
                勾选项目的总费用
              </Text>
              <Text className="text-lg font-bold text-warning">
                ¥{expenseItems.reduce((sum, item) => {
                  if (item.covered) {
                    const amount = parseFloat(item.value || '0');
                    return sum + (isNaN(amount) ? 0 : amount);
                  }
                  return sum;
                }, 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
            </View>
          </View>

          {/* 第三部分：承担比例 + 合伙人承担（左右对齐） */}
          <View className="bg-surface rounded-3xl p-4">
            <View className="flex-row items-center justify-between pb-3 border-b border-border">
              <View className="flex-1">
                <Text className="text-sm text-muted mb-0.5">承担比例</Text>
                <Text className="text-lg font-bold text-primary">
                  {currentBill.costShareRatio}%
                </Text>
              </View>
              <View className="flex-1 items-end">
                <Text className="text-sm text-muted mb-0.5">合伙人承担</Text>
                <Text className="text-lg font-bold text-foreground">
                  ¥{parseFloat(currentBill.partnerShare).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
              </View>
            </View>
          </View>

          {/* 第四部分：合同后付款（左右对齐） */}
          <View className="bg-surface rounded-3xl p-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm text-muted">合同后付款</Text>
              <Text className="text-lg font-bold text-foreground">
                ¥{parseFloat(expenseCoverage?.postContractPayment || '0').toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
            </View>
          </View>

          {/* 第五部分：合伙人分红（最终金额，左右对齐） */}
          <View 
            className="rounded-3xl p-4"
            style={{ backgroundColor: colors.warning + '15' }}
          >
            <View className="flex-row items-center justify-between">
              <Text className="text-sm text-muted">合伙人分红</Text>
              <Text className="text-2xl font-bold"
                style={{ color: colors.warning }}
              >
                ¥{parseFloat(currentBill?.partnerDividend || '0').toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
            </View>
          </View>

          {/* 计算公式说明 */}
          <View className="bg-surface rounded-2xl p-4">
            <Text className="text-xs text-muted mb-2">
              💡 分红计算公式
            </Text>
            <Text className="text-xs text-muted leading-5">
              合伙人分红 = (销售额 × 承担比例) - 合伙人承担 - 合同后付款
            </Text>
            <Text className="text-xs text-muted leading-5 mt-2">
              = (¥{parseFloat(currentBill.salesAmount).toLocaleString('zh-CN', { minimumFractionDigits: 2 })} × {currentBill.costShareRatio}%) - ¥{parseFloat(currentBill.partnerShare).toLocaleString('zh-CN', { minimumFractionDigits: 2 })} - ¥{parseFloat(currentBill.deferredPayment).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
            </Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
