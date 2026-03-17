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

const CourseCard = memo(function CourseCard({ course, searchText, primaryColor, warningColor }: {
  course: any; searchText: string; primaryColor: string; warningColor: string;
}) {
  return (
    <View className="bg-surface rounded-xl p-4">
      <View className="flex-row items-center justify-between mb-1">
        <View style={{ flex: 1 }}>
          <HighlightText text={course.name || course.courseName || '课程'} highlight={searchText} style={{ fontSize: 16, fontWeight: '600' }} numberOfLines={1} />
        </View>
        <Text className="text-base font-bold" style={{ color: primaryColor }}>¥{parseFloat(course.price || '0').toFixed(0)}</Text>
      </View>
      <Text className="text-sm text-muted" numberOfLines={2}>{course.description || '暂无描述'}</Text>
      <View className="flex-row items-center mt-2 gap-2">
        {course.duration && (
          <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, backgroundColor: primaryColor + '15' }}>
            <Text style={{ fontSize: 11, color: primaryColor }}>{course.duration}分钟</Text>
          </View>
        )}
        {course.category && (
          <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, backgroundColor: warningColor + '15' }}>
            <Text style={{ fontSize: 11, color: warningColor }}>{course.category}</Text>
          </View>
        )}
      </View>
    </View>
  );
});

export default function AdminCoursesScreen() {
  const colors = useColors();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [courses, setCourses] = useState<any[]>([]);
  const [searchText, setSearchText] = useState('');
  const debouncedSearch = useDebouncedValue(searchText, 300);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 30;

  useEffect(() => { loadData(); }, []);

  const loadData = useCallback(async () => {
    try {
      if (!refreshing) setLoading(true);
      const cached = await enhancedCache.get<any[]>(ENHANCED_CACHE_KEYS.COURSES);
      if (cached && !refreshing) { setCourses(cached); setLoading(false); }
      const result = await sdkApi.courses.list().catch(() => []);
      const list = Array.isArray(result) ? result : [];
      setCourses(list);
      await enhancedCache.set(ENHANCED_CACHE_KEYS.COURSES, list);
    } catch (error) {
      errorLogger.error('AdminCourses', 'Load failed', error);
    } finally { setLoading(false); setRefreshing(false); }
  }, [refreshing]);

  const onRefresh = useCallback(() => { setRefreshing(true); setPage(1); loadData(); }, [loadData]);

  const filteredCourses = useMemo(() => {
    if (!debouncedSearch.trim()) return courses;
    const kw = debouncedSearch.toLowerCase();
    return courses.filter(c => (c.name || c.courseName || '').toLowerCase().includes(kw) || (c.category || '').toLowerCase().includes(kw));
  }, [courses, debouncedSearch]);

  const paginatedCourses = useMemo(() => filteredCourses.slice(0, page * PAGE_SIZE), [filteredCourses, page]);
  const hasMore = paginatedCourses.length < filteredCourses.length;
  const onLoadMore = useCallback(() => { if (hasMore) setPage(p => p + 1); }, [hasMore]);

  return (
    <ScreenContainer className="bg-background">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        onScroll={({ nativeEvent }) => { const { layoutMeasurement, contentOffset, contentSize } = nativeEvent; if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 200) onLoadMore(); }}
        scrollEventThrottle={400}>
        <View className="p-6 gap-4">
          <View className="flex-row items-center mb-2">
            <TouchableOpacity onPress={() => router.back()} className="mr-3 active:opacity-70">
              <Ionicons name="arrow-back" size={24} color={colors.foreground} />
            </TouchableOpacity>
            <Text className="text-2xl font-bold text-foreground">课程管理</Text>
            <Text className="text-sm text-muted ml-2">({filteredCourses.length})</Text>
          </View>
          <View className="bg-surface rounded-xl flex-row items-center px-3" style={{ height: 44 }}>
            <Ionicons name="search" size={18} color={colors.muted} />
            <TextInput value={searchText} onChangeText={(t) => { setSearchText(t); setPage(1); }} placeholder="搜索课程名称、分类..." placeholderTextColor={colors.muted} style={{ flex: 1, marginLeft: 8, fontSize: 14, color: colors.foreground }} />
            {searchText.length > 0 && <TouchableOpacity onPress={() => { setSearchText(''); setPage(1); }}><Ionicons name="close-circle" size={18} color={colors.muted} /></TouchableOpacity>}
          </View>
          {loading ? (
            <View className="items-center justify-center py-20"><ActivityIndicator size="large" color={colors.primary} /></View>
          ) : paginatedCourses.length === 0 ? (
            <View className="items-center justify-center py-20">
              <Ionicons name="book-outline" size={48} color={colors.muted} />
              <Text className="text-muted mt-4">{debouncedSearch ? '未找到匹配课程' : '暂无课程数据'}</Text>
            </View>
          ) : (
            <View className="gap-3">
              {paginatedCourses.map((course: any, index: number) => (
                <CourseCard key={course.id || index} course={course} searchText={debouncedSearch} primaryColor={colors.primary} warningColor={colors.warning} />
              ))}
              <ListFooter loading={false} hasMore={hasMore} onLoadMore={onLoadMore} />
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
