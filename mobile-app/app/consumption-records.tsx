import { useState, useEffect } from "react";
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, RefreshControl } from "react-native";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import api from "@/lib/sdk/api";
import { useColors } from "@/hooks/use-colors";

interface TransactionRecord {
  id: number;
  type: 'recharge' | 'consume' | 'refund';
  amount: string;
  balanceBefore: string;
  balanceAfter: string;
  orderId: number | null;
  orderNo: string | null;
  notes: string | null;
  operatorName: string | null;
  createdAt: string;
}

export default function ConsumptionRecordsScreen() {
  const colors = useColors();
  const [records, setRecords] = useState<TransactionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadRecords();
  }, []);

  const loadRecords = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError("");

      console.log("[ConsumptionRecords] Loading transactions...");
      
      // 使用新的账户流水接口
      const result = await api.account.getMyTransactions({ limit: 100, offset: 0 });
      
      console.log("[ConsumptionRecords] API result:", result);
      console.log("[ConsumptionRecords] Transactions count:", result.data?.transactions?.length || 0);
      
      if (!result.success) {
        throw new Error("获取流水记录失败");
      }

      setRecords(result.data.transactions);
      console.log("[ConsumptionRecords] Records updated:", result.data.transactions);
    } catch (err: any) {
      console.error("[ConsumptionRecords] Load failed:", err);
      setError(err.message || "加载失败");
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  const handleRefresh = () => {
    loadRecords(true);
  };

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return "";
    try {
      const date = new Date(dateStr);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day} ${hours}:${minutes}`;
    } catch {
      return dateStr;
    }
  };

  // 流水类型显示映射
  const getTypeInfo = (type: 'recharge' | 'consume' | 'refund') => {
    switch (type) {
      case 'recharge':
        return { label: '充值', color: '#22c55e', prefix: '+' }; // 绿色
      case 'consume':
        return { label: '消费', color: '#ef4444', prefix: '-' }; // 红色
      case 'refund':
        return { label: '退款', color: '#3b82f6', prefix: '+' }; // 蓝色
      default:
        return { label: '未知', color: '#6b7280', prefix: '' };
    }
  };

  if (loading) {
    return (
      <ScreenContainer className="justify-center items-center">
        <ActivityIndicator size="large" color={colors.primary} />
        <Text className="text-muted mt-4">加载中...</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="bg-background">
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 border-b border-border">
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ opacity: 0.8 }}
        >
          <Text className="text-primary text-base">← 返回</Text>
        </TouchableOpacity>
        <Text className="flex-1 text-center text-xl font-semibold text-foreground">
          流水记录
        </Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView 
        className="flex-1"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {error ? (
          <View className="p-6 items-center">
            <Text className="text-error text-center mb-4">{error}</Text>
            <TouchableOpacity
              onPress={() => loadRecords(false)}
              className="bg-primary px-6 py-2 rounded-full"
            >
              <Text className="text-white font-medium">重试</Text>
            </TouchableOpacity>
          </View>
        ) : records.length === 0 ? (
          <View className="p-6 items-center">
            <Text className="text-muted text-center">暂无流水记录</Text>
          </View>
        ) : (
          <View className="p-4 gap-3">
            {records.map((record) => {
              const typeInfo = getTypeInfo(record.type);
              return (
                <View
                  key={record.id}
                  className="bg-surface rounded-2xl p-4 border border-border"
                >
                  {/* 流水类型和金额 */}
                  <View className="flex-row justify-between items-center mb-3">
                    <View className="flex-row items-center">
                      <View 
                        className="px-3 py-1 rounded-full mr-2"
                        style={{ backgroundColor: typeInfo.color + '20' }}
                      >
                        <Text 
                          className="text-sm font-medium"
                          style={{ color: typeInfo.color }}
                        >
                          {typeInfo.label}
                        </Text>
                      </View>
                      {record.orderNo && (
                        <Text className="text-xs text-muted">
                          {record.orderNo}
                        </Text>
                      )}
                    </View>
                    <Text 
                      className="text-xl font-bold"
                      style={{ color: typeInfo.color }}
                    >
                      {typeInfo.prefix}¥{record.amount}
                    </Text>
                  </View>

                  {/* 详细信息 */}
                  <View className="gap-2">
                    <View className="flex-row items-center">
                      <Text className="text-sm text-muted w-20">交易时间</Text>
                      <Text className="text-sm text-foreground flex-1">
                        {formatDateTime(record.createdAt)}
                      </Text>
                    </View>

                    <View className="flex-row items-center">
                      <Text className="text-sm text-muted w-20">余额变化</Text>
                      <Text className="text-sm text-foreground flex-1">
                        ¥{record.balanceBefore} → ¥{record.balanceAfter}
                      </Text>
                    </View>

                    {record.operatorName && (
                      <View className="flex-row items-center">
                        <Text className="text-sm text-muted w-20">操作人</Text>
                        <Text className="text-sm text-foreground flex-1">
                          {record.operatorName}
                        </Text>
                      </View>
                    )}

                    {record.notes && (
                      <View className="flex-row items-center">
                        <Text className="text-sm text-muted w-20">备注</Text>
                        <Text className="text-sm text-foreground flex-1">
                          {record.notes}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
