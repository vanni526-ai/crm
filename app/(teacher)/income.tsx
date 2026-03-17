import { View, Text, ScrollView, RefreshControl, ActivityIndicator } from "react-native";
import { useState, useEffect, useCallback } from "react";
import { ScreenContainer } from "@/components/screen-container";
import { router } from "expo-router";
import { TouchableOpacity } from "react-native";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { api, type TeacherPaymentRecord } from "@/lib/api-client";

/**
 * 老师端收入流水页面
 * 
 * 显示：
 * - 本月收入统计
 * - 历史收入统计
 * - 收入流水明细（日期、课程、金额）
 */
export default function TeacherIncomeScreen() {
  const colors = useColors();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [totalIncome, setTotalIncome] = useState(0);
  const [incomeRecords, setIncomeRecords] = useState<TeacherPaymentRecord[]>([]);

  const fetchData = useCallback(async () => {
    try {
      const [statsResult, paymentsResult] = await Promise.all([
        api.teacherPayments.getMyStats(),
        api.teacherPayments.getMyPayments(),
      ]);

      setMonthlyIncome(statsResult?.monthlyIncome || 0);
      setTotalIncome(statsResult?.totalIncome || 0);
      setIncomeRecords(paymentsResult?.data || []);
    } catch (e) {
      console.error("[TeacherIncome] fetchData error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  return (
    <ScreenContainer className="bg-background">
      {/* 顶部导航栏 */}
      <View 
        className="flex-row items-center justify-between px-4 py-3"
        style={{ 
          backgroundColor: colors.background,
          borderBottomWidth: 0.5,
          borderBottomColor: colors.border,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          className="flex-row items-center active:opacity-70"
        >
          <IconSymbol name="chevron.left" size={24} color={colors.foreground} />
          <Text className="text-base text-foreground ml-1">返回</Text>
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-foreground">收入统计</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View className="p-6 gap-6">
          {/* 收入统计卡片 */}
          <View className="flex-row gap-3">
            {/* 本月收入 */}
            <View className="flex-1 bg-surface rounded-2xl p-4">
              <Text className="text-sm text-muted mb-2">本月收入</Text>
              {loading ? (
                <ActivityIndicator size="small" />
              ) : (
                <Text className="text-3xl font-bold text-success">{monthlyIncome}</Text>
              )}
              <Text className="text-xs text-muted mt-1">元</Text>
            </View>

            {/* 历史总收入 */}
            <View className="flex-1 bg-surface rounded-2xl p-4">
              <Text className="text-sm text-muted mb-2">历史总收入</Text>
              {loading ? (
                <ActivityIndicator size="small" />
              ) : (
                <Text className="text-3xl font-bold text-foreground">{totalIncome}</Text>
              )}
              <Text className="text-xs text-muted mt-1">元</Text>
            </View>
          </View>

          {/* 收入流水 */}
          <View>
            <Text className="text-lg font-semibold text-foreground mb-3">
              收入流水
            </Text>

            {loading ? (
              <View className="bg-surface rounded-2xl p-8 items-center justify-center">
                <ActivityIndicator size="large" />
                <Text className="text-sm text-muted mt-2">加载中...</Text>
              </View>
            ) : incomeRecords.length === 0 ? (
              <View className="bg-surface rounded-2xl p-8 items-center justify-center">
                <Text className="text-base text-muted">暂无收入记录</Text>
                <Text className="text-sm text-muted mt-2">
                  完成课程后会显示结算记录
                </Text>
              </View>
            ) : (
              <View className="gap-3">
                {incomeRecords.map((record, index) => (
                  <View
                    key={record.id || index}
                    className="bg-surface rounded-2xl p-4 border border-border"
                  >
                    <View className="flex-row items-center justify-between mb-2">
                      <Text className="text-base font-semibold text-foreground">
                        {record.courseName || record.orderNo || "课程收入"}
                      </Text>
                      <Text className="text-lg font-bold text-success">
                        +¥{record.amount}
                      </Text>
                    </View>
                    
                    <View className="gap-1">
                      {record.settlementDate && (
                        <Text className="text-sm text-muted">
                          结算日期：{record.settlementDate}
                        </Text>
                      )}
                      {record.courseDate && (
                        <Text className="text-sm text-muted">
                          课程日期：{record.courseDate}
                        </Text>
                      )}
                      {record.studentName && (
                        <Text className="text-sm text-muted">
                          学员：{record.studentName}
                        </Text>
                      )}
                      {record.status && (
                        <Text className="text-sm text-muted">
                          状态：{record.status}
                        </Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* 说明文字 */}
          <View className="bg-primary/10 rounded-2xl p-4">
            <Text className="text-sm text-muted leading-relaxed">
              💡 收入说明：{"\n"}
              • 课程完成后，系统会自动结算收入{"\n"}
              • 收入将在课程完成后3个工作日内到账{"\n"}
              • 如有疑问，请联系管理员
            </Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
