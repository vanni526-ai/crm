import React, { useState, useEffect, useMemo } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ScreenContainer } from "@/components/screen-container";
import { useUserRoles } from "@/src/hooks/use-user-roles";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { Ionicons } from "@expo/vector-icons";

/**
 * 合伙人首页
 * 
 * 显示业绩概览和分成统计
 */
export default function PartnerHomeScreen() {
  const { user } = useUserRoles();
  const colors = useColors();
  
  // 用户信息状态
  const [userId, setUserId] = useState<number | null>(null);
  const [partnerId, setPartnerId] = useState<number | null>(null);
  const [partnerCities, setPartnerCities] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // 从 AsyncStorage 获取用户信息
  useEffect(() => {
    const loadUserInfo = async () => {
      try {
        let userStr = await AsyncStorage.getItem("user_info");
        if (!userStr) {
          userStr = await AsyncStorage.getItem("auth_user_info");
        }
        
        if (userStr) {
          const userInfo = JSON.parse(userStr);
          setUserId(userInfo.id);
          console.log("[PartnerHome] User ID:", userInfo.id);
        } else {
          console.error("[PartnerHome] No user info found in AsyncStorage");
        }
      } catch (error) {
        console.error("[PartnerHome] Failed to load user info:", error);
      } finally {
        setIsLoading(false);
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
    console.log('[PartnerHome] partnerData:', partnerData);
    if (partnerData?.partnerId) {
      setPartnerId(partnerData.partnerId);
      console.log('[PartnerHome] Got partnerId:', partnerData.partnerId);
    } else {
      console.log('[PartnerHome] No partnerId in partnerData');
    }
  }, [partnerData]);
  
  // 获取合伙人管理的城市列表
  const { data: partnerCitiesData } = trpc.partnerManagement.getPartnerCities.useQuery(
    { partnerId: partnerId || 0 },
    { enabled: !!partnerId }
  );
  
  useEffect(() => {
    console.log('[PartnerHome] partnerCitiesData:', partnerCitiesData);
    if (partnerCitiesData) {
      console.log('[PartnerHome] Got partner cities:', partnerCitiesData);
      setPartnerCities(partnerCitiesData);
    } else {
      console.log('[PartnerHome] No partner cities data');
    }
  }, [partnerCitiesData]);
  
  // 获取当前月份
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  
  // 使用 tRPC 查询当前月份的账单数据
  // 只查询合伙人管理的城市的数据
  const { data: currentMonthBills = [] } = trpc.cityExpense.list.useQuery(
    { 
      month: currentMonth 
    },
    { enabled: !!partnerId }
  );
  
  // 如果当前月无数据，查询所有账单（不指定月份），然后取最近一份
  const { data: fallbackBills = [] } = trpc.cityExpense.list.useQuery(
    {},
    { enabled: !!partnerId && currentMonthBills.length === 0 }
  );
  
  // 选择要使用的账单数据，并过滤只显示合伙人管理的城市
  const allBills = useMemo(() => {
    let bills = currentMonthBills.length > 0 ? currentMonthBills : fallbackBills;
    
    // 如果使用的是 fallbackBills，需要找到最近的月份
    if (bills === fallbackBills && fallbackBills.length > 0) {
      // 按月份排序，取最新的
      const sortedBills = [...fallbackBills].sort((a, b) => {
        const monthA = a.month || '';
        const monthB = b.month || '';
        return monthB.localeCompare(monthA);
      });
      // 只取最近一个月份的数据
      const latestMonth = sortedBills[0]?.month;
      bills = sortedBills.filter(b => b.month === latestMonth);
      console.log('[PartnerHome] Using latest month:', latestMonth);
    }
    console.log('[PartnerHome] All bills:', bills.length, bills);
    console.log('[PartnerHome] Partner cities:', partnerCities);
    
    if (!partnerId || !partnerCities || partnerCities.length === 0) {
      console.log('[PartnerHome] No partnerId or partnerCities');
      return [];
    }
    // 获取合伙人管理的城市ID列表
    const cityIds = partnerCities.map(c => c.cityId);
    console.log('[PartnerHome] City IDs:', cityIds);
    // 只返回这些城市的账单
    const filtered = bills.filter((bill: any) => {
      console.log('[PartnerHome] Bill cityId:', bill.cityId, 'in cityIds?', cityIds.includes(bill.cityId));
      return cityIds.includes(bill.cityId);
    });
    console.log('[PartnerHome] Filtered bills:', filtered.length);
    return filtered;
  }, [currentMonthBills, fallbackBills, partnerId, partnerCities]);
  
  // 计算统计数据
  const stats = useMemo(() => {
    let monthlyRevenue = 0;
    let orderCount = 0;
    let recentDividend = 0;
    
    if (!allBills || allBills.length === 0) {
      return { monthlyRevenue, orderCount, monthlyCommission: 0, recentDividend };
    }
    
    // 直接累加所有数据（后端已经按权限过滤）
    for (const bill of allBills) {
      monthlyRevenue += parseFloat(bill.salesAmount || '0');
      orderCount += (bill.orderCount || 0);
      recentDividend += parseFloat(bill.partnerDividend || '0');
    }
    
    return {
      monthlyRevenue,
      orderCount,
      monthlyCommission: 0,
      recentDividend,
    };
  }, [allBills]);

  const handlePress = async (route: string) => {
    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push(route as any);
  };

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

  return (
    <ScreenContainer className="bg-background">
      <ScrollView 
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        className="flex-1"
      >
        <View className="p-6 gap-6">
          {/* 标题 */}
          <View>
            <Text className="text-2xl font-bold text-foreground">合伙人中心</Text>
            <Text className="text-sm text-muted-foreground mt-1">
              {user?.name}，欢迎使用<Text className="text-primary font-semibold">合伙人</Text>端
            </Text>
          </View>

          {/* 近期分红卡片 */}
          <View className="bg-white rounded-lg p-6 shadow-sm border border-border">
            <Text className="text-gray-600 text-sm mb-3">近期分红</Text>
            <Text className="text-4xl font-bold text-orange-500 mb-2">
              ¥{stats.recentDividend.toFixed(2)}
            </Text>
            <Text className="text-xs text-gray-500">最近一次分红总额</Text>
          </View>

          {/* 销售额和订单数 */}
          <View className="flex-row gap-4">
            {/* 销售额 */}
            <View className="flex-1 bg-white rounded-lg p-4 shadow-sm border border-border">
              <Text className="text-gray-600 text-sm mb-2">销售额</Text>
              <Text className="text-2xl font-bold text-blue-500 mb-1">
                ¥{stats.monthlyRevenue.toFixed(2)}
              </Text>
              <Text className="text-xs text-gray-500">本月订单</Text>
            </View>

            {/* 订单数 */}
            <View className="flex-1 bg-white rounded-lg p-4 shadow-sm border border-border">
              <Text className="text-gray-600 text-sm mb-2">本月订单</Text>
              <Text className="text-2xl font-bold text-blue-500 mb-1">
                {stats.orderCount}
              </Text>
              <Text className="text-xs text-gray-500">订单数量</Text>
            </View>
          </View>

          {/* 业务管理 */}
          <View>
            <Text className="text-lg font-bold text-foreground mb-4">业务管理</Text>
            
            {/* 最近分红明细 */}
            <TouchableOpacity 
              onPress={() => handlePress("/(partner)/monthly-dividend")}
              className="bg-white rounded-lg p-4 mb-3 shadow-sm border border-border active:opacity-70"
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <Text className="text-base font-semibold text-foreground">最近分红明细</Text>
                  <Text className="text-xs text-gray-500 mt-1">查看最近一个月的详细分红构成</Text>
                </View>
                <Text className="text-2xl ml-4">💰</Text>
              </View>
            </TouchableOpacity>

            {/* 历史分红 */}
            <TouchableOpacity 
              onPress={() => handlePress("/(partner)/commission")}
              className="bg-white rounded-lg p-4 shadow-sm border border-border active:opacity-70"
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <Text className="text-base font-semibold text-foreground">历史分红</Text>
                  <Text className="text-xs text-gray-500 mt-1">查看历史分红记录</Text>
                </View>
                <Text className="text-2xl ml-4">📊</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
