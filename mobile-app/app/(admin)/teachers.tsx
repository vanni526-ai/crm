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

// 优化9: 老师卡片组件 - React.memo
const TeacherCard = memo(function TeacherCard({
  teacher, searchText, primaryColor, successColor, errorColor, warningColor,
}: {
  teacher: any; searchText: string;
  primaryColor: string; successColor: string; errorColor: string; warningColor: string;
}) {
  return (
    <View className="bg-surface rounded-xl p-4">
      <View className="flex-row items-center">
        <View style={{
          width: 48, height: 48, borderRadius: 24,
          backgroundColor: primaryColor + '20',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Text style={{ color: primaryColor, fontWeight: '700', fontSize: 18 }}>
            {(teacher.name || teacher.teacherName || '?').charAt(0)}
          </Text>
        </View>
        <View className="ml-3 flex-1">
          <HighlightText
            text={teacher.name || teacher.teacherName || '未知'}
            highlight={searchText}
            style={{ fontSize: 16, fontWeight: '600' }}
          />
          <HighlightText
            text={`${teacher.phone || ''} ${teacher.city ? `· ${teacher.city}` : ''}`}
            highlight={searchText}
            style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}
          />
        </View>
        <View className="items-end">
          {teacher.status && (
            <View style={{
              paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10,
              backgroundColor: teacher.status === 'active' ? successColor + '15' : errorColor + '15',
            }}>
              <Text style={{ fontSize: 11, color: teacher.status === 'active' ? successColor : errorColor }}>
                {teacher.status === 'active' ? '在职' : '离职'}
              </Text>
            </View>
          )}
        </View>
      </View>
      {(teacher.specialties || teacher.courses) && (
        <View className="flex-row flex-wrap gap-1 mt-2">
          {(teacher.specialties || teacher.courses || []).slice(0, 3).map((s: any, i: number) => (
            <View key={i} style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, backgroundColor: warningColor + '15' }}>
              <Text style={{ fontSize: 11, color: warningColor }}>{typeof s === 'string' ? s : s.name}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
});

export default function AdminTeachersScreen() {
  const colors = useColors();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [searchText, setSearchText] = useState('');
  const debouncedSearch = useDebouncedValue(searchText, 300);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 30;

  useEffect(() => { loadData(); }, []);

  const loadData = useCallback(async () => {
    try {
      if (!refreshing) setLoading(true);
      
      // 优化7: 缓存
      const cached = await enhancedCache.get<any[]>(ENHANCED_CACHE_KEYS.ADMIN_TEACHERS);
      if (cached && !refreshing) {
        setTeachers(cached);
        setLoading(false);
      }
      
      const result = await sdkApi.teachers.list().catch(() => []);
      const list = Array.isArray(result) ? result : [];
      setTeachers(list);
      await enhancedCache.set(ENHANCED_CACHE_KEYS.ADMIN_TEACHERS, list);
    } catch (error) {
      errorLogger.error('AdminTeachers', 'Load failed', error);
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

  // 优化6: 搜索过滤
  const filteredTeachers = useMemo(() => {
    if (!debouncedSearch.trim()) return teachers;
    const keyword = debouncedSearch.toLowerCase();
    return teachers.filter(t =>
      (t.name || t.teacherName || '').toLowerCase().includes(keyword) ||
      (t.phone || '').toLowerCase().includes(keyword) ||
      (t.city || '').toLowerCase().includes(keyword)
    );
  }, [teachers, debouncedSearch]);

  // 优化5: 分页
  const paginatedTeachers = useMemo(() => filteredTeachers.slice(0, page * PAGE_SIZE), [filteredTeachers, page]);
  const hasMore = paginatedTeachers.length < filteredTeachers.length;
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
            <Text className="text-2xl font-bold text-foreground">老师管理</Text>
            <Text className="text-sm text-muted ml-2">({filteredTeachers.length}人)</Text>
          </View>

          {/* 优化6: 搜索框 */}
          <View className="bg-surface rounded-xl flex-row items-center px-3" style={{ height: 44 }}>
            <Ionicons name="search" size={18} color={colors.muted} />
            <TextInput
              value={searchText}
              onChangeText={(text) => { setSearchText(text); setPage(1); }}
              placeholder="搜索老师姓名、手机号、城市..."
              placeholderTextColor={colors.muted}
              style={{ flex: 1, marginLeft: 8, fontSize: 14, color: colors.foreground }}
            />
            {searchText.length > 0 && (
              <TouchableOpacity onPress={() => { setSearchText(''); setPage(1); }}>
                <Ionicons name="close-circle" size={18} color={colors.muted} />
              </TouchableOpacity>
            )}
          </View>

          {loading ? (
            <View className="items-center justify-center py-20">
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : paginatedTeachers.length === 0 ? (
            <View className="items-center justify-center py-20">
              <Ionicons name="school-outline" size={48} color={colors.muted} />
              <Text className="text-muted mt-4">{debouncedSearch ? '未找到匹配老师' : '暂无老师数据'}</Text>
            </View>
          ) : (
            <View className="gap-3">
              {paginatedTeachers.map((teacher: any, index: number) => (
                <TeacherCard
                  key={teacher.id || index}
                  teacher={teacher}
                  searchText={debouncedSearch}
                  primaryColor={colors.primary}
                  successColor={colors.success}
                  errorColor={colors.error}
                  warningColor={colors.warning}
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
