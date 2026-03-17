import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, Alert, Platform } from 'react-native';
import { router } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { api, type TeacherCourse } from '@/lib/api-client';
import * as Haptics from 'expo-haptics';

type TabType = 'pending' | 'accepted' | 'completed';

const TABS: { key: TabType; label: string }[] = [
  { key: 'pending', label: '待接单' },
  { key: 'accepted', label: '已接单' },
  { key: 'completed', label: '已完成' },
];

export default function TeacherCoursesScreen() {
  const colors = useColors();
  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [courses, setCourses] = useState<TeacherCourse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [acceptingId, setAcceptingId] = useState<number | null>(null);

  const fetchCourses = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.teacher.courses({ status: activeTab });
      setCourses(data);
    } catch (e) {
      console.error("[TeacherCourses] fetch error:", e);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchCourses();
    const timer = setInterval(fetchCourses, 30000);
    return () => clearInterval(timer);
  }, [fetchCourses]);

  const onRefresh = async () => {
    await fetchCourses();
  };

  const handleAcceptCourse = async (courseId: number) => {
    Alert.alert(
      '确认接单',
      '确定要接受这个课程吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确定',
          onPress: async () => {
            setAcceptingId(courseId);
            try {
              await api.teacher.acceptCourse({ courseId });
              if (Platform.OS !== 'web') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }
              Alert.alert('成功', '接单成功！');
              fetchCourses();
            } catch (error: any) {
              if (Platform.OS !== 'web') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              }
              Alert.alert('失败', error.message || '接单失败，请重试');
            } finally {
              setAcceptingId(null);
            }
          },
        },
      ]
    );
  };

  const handleViewDetail = (courseId: number) => {
    router.push(`/(teacher)/${courseId}` as any);
  };

  const renderCourseCard = ({ item }: { item: TeacherCourse }) => (
    <TouchableOpacity
      onPress={() => handleViewDetail(item.id)}
      style={{
        backgroundColor: colors.surface,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: colors.border,
      }}
      activeOpacity={0.7}
    >
      {/* 课程名称和状态 */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Text style={{ fontSize: 18, fontWeight: '600', color: colors.foreground, flex: 1 }}>
          {item.courseName}
        </Text>
        {item.status === 'pending' && (
          <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 }}>
            <Text style={{ fontSize: 12, color: '#92400E', fontWeight: '500' }}>待接单</Text>
          </View>
        )}
        {item.status === 'accepted' && (
          <View style={{ backgroundColor: '#DBEAFE', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 }}>
            <Text style={{ fontSize: 12, color: '#1E40AF', fontWeight: '500' }}>已接单</Text>
          </View>
        )}
      </View>

      {/* 时间信息 */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
        <Text style={{ fontSize: 24, marginRight: 4 }}>📅</Text>
        <Text style={{ fontSize: 14, color: colors.foreground }}>
          {String(item.classDate)} {item.classTime}
        </Text>
        <Text style={{ fontSize: 14, color: colors.muted, marginLeft: 8 }}>
          ({item.duration}分钟)
        </Text>
      </View>

      {/* 地点信息 */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
        <Text style={{ fontSize: 24, marginRight: 4 }}>📍</Text>
        <Text style={{ fontSize: 14, color: colors.foreground, flex: 1 }}>
          {item.classroomName} - {item.classroomAddress}
        </Text>
      </View>

      {/* 学员信息 */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
        <Text style={{ fontSize: 24, marginRight: 4 }}>👤</Text>
        <Text style={{ fontSize: 14, color: colors.foreground }}>
          {item.studentName}
        </Text>
        <Text style={{ fontSize: 14, color: colors.muted, marginLeft: 8 }}>
          {item.studentPhone}
        </Text>
      </View>

      {/* 费用和操作按钮 */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontSize: 18, fontWeight: '600', color: colors.primary }}>
          ¥{item.fee}
        </Text>
        {item.status === 'pending' && (
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              handleAcceptCourse(item.id);
            }}
            style={{
              backgroundColor: colors.primary,
              paddingHorizontal: 24,
              paddingVertical: 8,
              borderRadius: 20,
            }}
            activeOpacity={0.8}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '600' }}>
              接单
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={{ alignItems: 'center', justifyContent: 'center', paddingTop: 60 }}>
      <Text style={{ fontSize: 48, marginBottom: 16 }}>📚</Text>
      <Text style={{ fontSize: 16, color: colors.muted }}>
        {activeTab === 'pending' && '暂无待接单课程'}
        {activeTab === 'accepted' && '暂无已接单课程'}
        {activeTab === 'completed' && '暂无已完成课程'}
      </Text>
    </View>
  );

  return (
    <ScreenContainer>
      {/* 标题栏 */}
      <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 }}>
        <Text style={{ fontSize: 28, fontWeight: 'bold', color: colors.foreground }}>
          我的课程
        </Text>
      </View>

      {/* Tab切换 */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 16, marginBottom: 16 }}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            style={{
              flex: 1,
              paddingVertical: 12,
              alignItems: 'center',
              borderBottomWidth: 2,
              borderBottomColor: activeTab === tab.key ? colors.primary : 'transparent',
            }}
            activeOpacity={0.7}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: activeTab === tab.key ? '600' : '400',
                color: activeTab === tab.key ? colors.primary : colors.muted,
              }}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 课程列表 */}
      <FlatList
        data={courses}
        renderItem={renderCourseCard}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16, flexGrow: 1 }}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={isLoading ? (
          <View style={{ alignItems: 'center', paddingTop: 60 }}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : renderEmptyState()}
      />
    </ScreenContainer>
  );
}
