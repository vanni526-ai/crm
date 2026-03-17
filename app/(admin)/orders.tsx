import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Pressable, TextInput, FlatList } from "react-native";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useState, useCallback, useEffect, useMemo, memo } from "react";
import sdkApi from "@/lib/sdk/api";
import { Ionicons } from "@expo/vector-icons";
import { HighlightText } from "@/components/ui/highlight-text";
import { ListFooter } from "@/components/ui/list-footer";
import { useDebouncedValue } from "@/hooks/use-debounce";
import enhancedCache, { ENHANCED_CACHE_KEYS } from "@/lib/enhanced-cache";
import errorLogger from "@/lib/error-logger";

type FilterType = 'all' | 'undelivered' | 'delivered' | 'cancelled';

// 优化9: 订单卡片组件 - React.memo
const OrderCard = memo(function OrderCard({
  order, searchText, getStatusColor, getStatusText, primaryColor,
}: {
  order: any; searchText: string;
  getStatusColor: (o: any) => string; getStatusText: (o: any) => string;
  primaryColor: string;
}) {
  return (
    <View className="bg-surface rounded-xl p-4">
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-xs text-muted" numberOfLines={1} style={{ flex: 1 }}>
          {order.orderNo || `#${order.id}`}
        </Text>
        <Text className="text-xs font-medium" style={{ color: getStatusColor(order) }}>
          {getStatusText(order)}
        </Text>
      </View>
      {/* 优化6: 搜索高亮 */}
      <HighlightText
        text={order.deliveryCourse || '课程'}
        highlight={searchText}
        style={{ fontSize: 16, fontWeight: '600', marginBottom: 4 }}
      />
      <View className="flex-row items-center justify-between">
        <HighlightText
          text={`${order.customerName || '客户'} · ${order.classDate || ''} · ${order.deliveryCity || ''}`}
          highlight={searchText}
          style={{ fontSize: 13, color: '#9CA3AF', flex: 1 }}
          numberOfLines={1}
        />
        <Text className="text-base font-bold" style={{ color: primaryColor }}>
          ¥{parseFloat(order.courseAmount || '0').toFixed(0)}
        </Text>
      </View>
      <View className="flex-row items-center justify-between mt-1">
        <Text className="text-xs text-muted">
          老师: {order.deliveryTeacher || '未分配'} · 销售: {order.salesperson || '未分配'}
        </Text>
      </View>
    </View>
  );
});

export default function AdminOrdersScreen() {
  const colors = useColors();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchText, setSearchText] = useState('');
  
  // 优化6: 搜索防抖
  const debouncedSearch = useDebouncedValue(searchText, 300);
  
  // 优化5: 分页
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 30;

  useEffect(() => { loadData(); }, []);

  const loadData = useCallback(async () => {
    try {
      if (!refreshing) setLoading(true);
      
      // 优化7: 缓存
      const cached = await enhancedCache.get<any[]>(ENHANCED_CACHE_KEYS.ADMIN_ORDERS);
      if (cached && !refreshing) {
        setOrders(cached);
        setLoading(false);
      }
      
      const result = await sdkApi.orders.list().catch(() => []);
      const list = Array.isArray(result) ? result : [];
      const sorted = list.sort((a: any, b: any) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      setOrders(sorted);
      await enhancedCache.set(ENHANCED_CACHE_KEYS.ADMIN_ORDERS, sorted);
    } catch (error) {
      errorLogger.error('AdminOrders', 'Load failed', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshing]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setPage(1);
    loadData();
  }, [loadData]);

  // 优化6: 搜索过滤 + 状态过滤
  const filteredOrders = useMemo(() => {
    let filtered = orders;
    
    // 状态过滤
    if (filter === 'undelivered') filtered = filtered.filter(o => o.deliveryStatus === 'undelivered' && o.status !== 'cancelled');
    else if (filter === 'delivered') filtered = filtered.filter(o => o.deliveryStatus === 'delivered');
    else if (filter === 'cancelled') filtered = filtered.filter(o => o.status === 'cancelled' || o.status === 'refunded');
    
    // 搜索过滤
    if (debouncedSearch.trim()) {
      const keyword = debouncedSearch.toLowerCase();
      filtered = filtered.filter(o =>
        (o.customerName || '').toLowerCase().includes(keyword) ||
        (o.deliveryCourse || '').toLowerCase().includes(keyword) ||
        (o.deliveryCity || '').toLowerCase().includes(keyword) ||
        (o.orderNo || '').toLowerCase().includes(keyword) ||
        (o.deliveryTeacher || '').toLowerCase().includes(keyword)
      );
    }
    
    return filtered;
  }, [orders, filter, debouncedSearch]);

  // 优化5: 分页数据
  const paginatedOrders = useMemo(() => {
    return filteredOrders.slice(0, page * PAGE_SIZE);
  }, [filteredOrders, page]);

  const hasMore = paginatedOrders.length < filteredOrders.length;

  const onLoadMore = useCallback(() => {
    if (hasMore) {
      setPage(p => p + 1);
    }
  }, [hasMore]);

  const getStatusColor = useCallback((order: any) => {
    if (order.status === 'cancelled' || order.status === 'refunded') return colors.error;
    if (order.deliveryStatus === 'delivered') return colors.success;
    return colors.warning;
  }, [colors]);

  const getStatusText = useCallback((order: any) => {
    if (order.status === 'cancelled') return '已取消';
    if (order.status === 'refunded') return '已退款';
    if (order.deliveryStatus === 'delivered') return '已交付';
    return '待交付';
  }, []);

  return (
    <ScreenContainer className="bg-background">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        onScroll={({ nativeEvent }) => {
          const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
          if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 200) {
            onLoadMore();
          }
        }}
        scrollEventThrottle={400}
      >
        <View className="p-6 gap-4">
          <View className="flex-row items-center mb-2">
            <TouchableOpacity onPress={() => router.back()} className="mr-3 active:opacity-70">
              <Ionicons name="arrow-back" size={24} color={colors.foreground} />
            </TouchableOpacity>
            <Text className="text-2xl font-bold text-foreground">订单管理</Text>
            <Text className="text-sm text-muted ml-2">({filteredOrders.length}单)</Text>
          </View>

          {/* 优化6: 搜索框 */}
          <View className="bg-surface rounded-xl flex-row items-center px-3" style={{ height: 44 }}>
            <Ionicons name="search" size={18} color={colors.muted} />
            <TextInput
              value={searchText}
              onChangeText={setSearchText}
              placeholder="搜索客户、课程、城市、订单号..."
              placeholderTextColor={colors.muted}
              style={{ flex: 1, marginLeft: 8, fontSize: 14, color: colors.foreground }}
            />
            {searchText.length > 0 && (
              <TouchableOpacity onPress={() => setSearchText('')}>
                <Ionicons name="close-circle" size={18} color={colors.muted} />
              </TouchableOpacity>
            )}
          </View>

          {/* 筛选 */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row gap-2">
              {([
                { key: 'all' as FilterType, label: '全部' },
                { key: 'undelivered' as FilterType, label: '待交付' },
                { key: 'delivered' as FilterType, label: '已交付' },
                { key: 'cancelled' as FilterType, label: '已取消' },
              ]).map(tab => (
                <Pressable
                  key={tab.key}
                  onPress={() => { setFilter(tab.key); setPage(1); }}
                  style={{
                    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
                    backgroundColor: filter === tab.key ? colors.primary : colors.surface,
                  }}
                >
                  <Text style={{
                    fontSize: 13, fontWeight: '600',
                    color: filter === tab.key ? '#FFFFFF' : colors.muted,
                  }}>{tab.label}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          {loading ? (
            <View className="items-center justify-center py-20">
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : paginatedOrders.length === 0 ? (
            <View className="items-center justify-center py-20">
              <Ionicons name="receipt-outline" size={48} color={colors.muted} />
              <Text className="text-muted mt-4">
                {debouncedSearch ? '未找到匹配的订单' : '暂无订单'}
              </Text>
            </View>
          ) : (
            <View className="gap-3">
              {paginatedOrders.map((order: any, index: number) => (
                <OrderCard
                  key={order.id || index}
                  order={order}
                  searchText={debouncedSearch}
                  getStatusColor={getStatusColor}
                  getStatusText={getStatusText}
                  primaryColor={colors.primary}
                />
              ))}
              {/* 优化5: 加载更多 */}
              <ListFooter loading={false} hasMore={hasMore} onLoadMore={onLoadMore} />
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
