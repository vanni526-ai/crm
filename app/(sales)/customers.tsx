import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, TextInput } from "react-native";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useState, useCallback, useEffect, useMemo, memo } from "react";
import sdkApi from "@/lib/sdk/api";
import { Ionicons } from "@expo/vector-icons";
import { HighlightText } from "@/components/ui/highlight-text";
import { ListFooter } from "@/components/ui/list-footer";
import { useDebouncedValue } from "@/hooks/use-debounce";
import errorLogger from "@/lib/error-logger";

const CustomerCard = memo(function CustomerCard({
  customer, searchText, primaryColor,
}: {
  customer: any; searchText: string; primaryColor: string;
}) {
  return (
    <View className="bg-surface rounded-xl p-4">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center flex-1">
          <View style={{
            width: 40, height: 40, borderRadius: 20,
            backgroundColor: primaryColor + '20',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Text style={{ color: primaryColor, fontWeight: '700', fontSize: 16 }}>
              {(customer.name || customer.customerName || '?').charAt(0)}
            </Text>
          </View>
          <View className="ml-3 flex-1">
            <HighlightText text={customer.name || customer.customerName || '未知'} highlight={searchText} style={{ fontSize: 16, fontWeight: '600' }} />
            <HighlightText text={customer.phone || customer.customerPhone || ''} highlight={searchText} style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }} />
          </View>
        </View>
        <View className="items-end">
          {customer.city && <Text className="text-xs text-muted">{customer.city}</Text>}
          {(customer.balance || customer.totalAmount) && (
            <Text className="text-sm font-semibold" style={{ color: primaryColor }}>
              ¥{parseFloat(customer.balance || customer.totalAmount || '0').toFixed(0)}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
});

export default function SalesCustomersScreen() {
  const colors = useColors();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 30;
  const debouncedSearch = useDebouncedValue(search, 300);

  useEffect(() => { loadData(); }, []);
  useEffect(() => { loadData(debouncedSearch); }, [debouncedSearch]);

  const loadData = useCallback(async (searchText?: string) => {
    try {
      if (!refreshing) setLoading(true);
      const result = await sdkApi.customers.list({
        search: searchText || undefined, limit: 200, offset: 0,
      }).catch(() => ({ customers: [], total: 0 }));
      const list = result?.customers || result?.data || [];
      setCustomers(Array.isArray(list) ? list : []);
      setTotal(result?.total || list.length || 0);
    } catch (error) {
      errorLogger.error('SalesCustomers', 'Load failed', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshing]);

  const onRefresh = useCallback(() => { setRefreshing(true); setPage(1); loadData(search); }, [search, loadData]);
  const paginatedCustomers = useMemo(() => customers.slice(0, page * PAGE_SIZE), [customers, page]);
  const hasMore = paginatedCustomers.length < customers.length;
  const onLoadMore = useCallback(() => { if (hasMore) setPage(p => p + 1); }, [hasMore]);

  return (
    <ScreenContainer className="bg-background">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        onScroll={({ nativeEvent }) => {
          const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
          if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 200) onLoadMore();
        }}
        scrollEventThrottle={400}
      >
        <View className="p-6 gap-4">
          <View className="flex-row items-center mb-2">
            <TouchableOpacity onPress={() => router.back()} className="mr-3 active:opacity-70">
              <Ionicons name="arrow-back" size={24} color={colors.foreground} />
            </TouchableOpacity>
            <Text className="text-2xl font-bold text-foreground">客户管理</Text>
            <Text className="text-sm text-muted ml-2">({total}人)</Text>
          </View>
          <View className="flex-row items-center bg-surface rounded-xl px-3 py-2">
            <Ionicons name="search" size={18} color={colors.muted} />
            <TextInput value={search} onChangeText={(t) => { setSearch(t); setPage(1); }} placeholder="搜索客户姓名/手机号" placeholderTextColor={colors.muted} style={{ flex: 1, marginLeft: 8, fontSize: 14, color: colors.foreground }} returnKeyType="search" />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => { setSearch(''); setPage(1); }}>
                <Ionicons name="close-circle" size={18} color={colors.muted} />
              </TouchableOpacity>
            )}
          </View>
          {loading ? (
            <View className="items-center justify-center py-20">
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : paginatedCustomers.length === 0 ? (
            <View className="items-center justify-center py-20">
              <Ionicons name="people-outline" size={48} color={colors.muted} />
              <Text className="text-muted mt-4">{debouncedSearch ? '未找到匹配客户' : '暂无客户数据'}</Text>
            </View>
          ) : (
            <View className="gap-2">
              {paginatedCustomers.map((customer: any, index: number) => (
                <CustomerCard key={customer.id || index} customer={customer} searchText={debouncedSearch} primaryColor={colors.primary} />
              ))}
              <ListFooter loading={false} hasMore={hasMore} onLoadMore={onLoadMore} />
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
