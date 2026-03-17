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
import enhancedCache, { ENHANCED_CACHE_KEYS } from "@/lib/enhanced-cache";
import errorLogger from "@/lib/error-logger";

// 优化9: 用户卡片组件 - React.memo
const UserCard = memo(function UserCard({
  user, searchText, primaryColor, successColor, errorColor,
}: {
  user: any; searchText: string;
  primaryColor: string; successColor: string; errorColor: string;
}) {
  const getRoleLabel = (roles: any) => {
    if (!roles) return '用户';
    if (typeof roles === 'string') {
      try { roles = JSON.parse(roles); } catch { return roles; }
    }
    if (Array.isArray(roles)) return roles.join(', ');
    return '用户';
  };

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
              {(user.name || user.username || '?').charAt(0)}
            </Text>
          </View>
          <View className="ml-3 flex-1">
            <HighlightText
              text={user.name || user.username || '未知'}
              highlight={searchText}
              style={{ fontSize: 16, fontWeight: '600' }}
            />
            <HighlightText
              text={user.phone || user.email || user.username || ''}
              highlight={searchText}
              style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}
            />
          </View>
        </View>
        <View className="items-end">
          <View style={{
            paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10,
            backgroundColor: primaryColor + '15',
          }}>
            <Text style={{ fontSize: 11, color: primaryColor, fontWeight: '600' }}>
              {getRoleLabel(user.roles || user.role)}
            </Text>
          </View>
          {user.status && (
            <Text className="text-xs mt-1" style={{
              color: user.status === 'active' ? successColor : errorColor,
            }}>
              {user.status === 'active' ? '正常' : '禁用'}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
});

export default function AdminUsersScreen() {
  const colors = useColors();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 30;

  // 优化6: 搜索防抖
  const debouncedSearch = useDebouncedValue(search, 300);

  useEffect(() => { loadData(); }, []);

  // 优化6: 防抖搜索自动触发
  useEffect(() => {
    loadData(debouncedSearch);
  }, [debouncedSearch]);

  const loadData = useCallback(async (searchText?: string) => {
    try {
      if (!refreshing) setLoading(true);
      
      // 优化7: 缓存（仅无搜索时）
      if (!searchText) {
        const cached = await enhancedCache.get<{ users: any[]; total: number }>(ENHANCED_CACHE_KEYS.ADMIN_USERS);
        if (cached && !refreshing) {
          setUsers(cached.users);
          setTotal(cached.total);
          setLoading(false);
        }
      }
      
      // 优化2: 统一使用sdkApi
      const result = await sdkApi.userManagement.list({
        search: searchText || undefined,
        limit: 200,
        offset: 0,
      }).catch(() => ({ users: [], total: 0 }));
      
      const list = result?.users || (result as any)?.data || [];
      const userList = Array.isArray(list) ? list : [];
      setUsers(userList);
      setTotal(result?.total || userList.length || 0);
      
      if (!searchText) {
        await enhancedCache.set(ENHANCED_CACHE_KEYS.ADMIN_USERS, { users: userList, total: result?.total || userList.length });
      }
    } catch (error) {
      errorLogger.error('AdminUsers', 'Load failed', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshing]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setPage(1);
    loadData(search);
  }, [search, loadData]);

  // 优化5: 分页
  const paginatedUsers = useMemo(() => users.slice(0, page * PAGE_SIZE), [users, page]);
  const hasMore = paginatedUsers.length < users.length;
  const onLoadMore = useCallback(() => { if (hasMore) setPage(p => p + 1); }, [hasMore]);

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
            <Text className="text-2xl font-bold text-foreground">用户管理</Text>
            <Text className="text-sm text-muted ml-2">({total}人)</Text>
          </View>

          {/* 优化6: 搜索框（防抖自动搜索） */}
          <View className="flex-row items-center bg-surface rounded-xl px-3 py-2">
            <Ionicons name="search" size={18} color={colors.muted} />
            <TextInput
              value={search}
              onChangeText={(text) => { setSearch(text); setPage(1); }}
              placeholder="搜索用户名/手机号"
              placeholderTextColor={colors.muted}
              style={{ flex: 1, marginLeft: 8, fontSize: 14, color: colors.foreground }}
              returnKeyType="search"
            />
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
          ) : paginatedUsers.length === 0 ? (
            <View className="items-center justify-center py-20">
              <Ionicons name="people-outline" size={48} color={colors.muted} />
              <Text className="text-muted mt-4">{debouncedSearch ? '未找到匹配用户' : '暂无用户数据'}</Text>
            </View>
          ) : (
            <View className="gap-2">
              {paginatedUsers.map((user: any, index: number) => (
                <UserCard
                  key={user.id || index}
                  user={user}
                  searchText={debouncedSearch}
                  primaryColor={colors.primary}
                  successColor={colors.success}
                  errorColor={colors.error}
                />
              ))}
              <ListFooter loading={false} hasMore={hasMore} onLoadMore={onLoadMore} />
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
