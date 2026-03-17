import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { api, type TeacherCourse } from '@/lib/api-client';
import * as Haptics from 'expo-haptics';
import { IconSymbol } from '@/components/ui/icon-symbol';

/**
 * 课程详情页面
 * 
 * 显示课程完整信息，支持接单操作
 */
export default function CourseDetailScreen() {
  const colors = useColors();
  const params = useLocalSearchParams<{ id: string }>();
  const courseId = parseInt(params.id);

  const [course, setCourse] = useState<TeacherCourse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);

  useEffect(() => {
    if (!isNaN(courseId)) {
      loadCourse();
    }
  }, [courseId]);

  const loadCourse = async () => {
    setIsLoading(true);
    try {
      const data = await api.teacher.courseDetail({ id: courseId });
      setCourse(data);
    } catch (e) {
      console.error("[CourseDetail] load error:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = async () => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.back();
  };

  const handleAcceptCourse = async () => {
    Alert.alert(
      '确认接单',
      '确定要接受这个课程吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确定',
          onPress: async () => {
            setIsAccepting(true);
            try {
              await api.teacher.acceptCourse({ courseId });
              if (Platform.OS !== 'web') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }
              Alert.alert('成功', '接单成功！', [
                {
                  text: '确定',
                  onPress: () => router.back(),
                },
              ]);
            } catch (error: any) {
              if (Platform.OS !== 'web') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              }
              Alert.alert('失败', error.message || '接单失败，请重试');
            } finally {
              setIsAccepting(false);
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <ScreenContainer>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ fontSize: 16, color: colors.muted, marginTop: 16 }}>加载中...</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (!course) {
    return (
      <ScreenContainer>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ fontSize: 16, color: colors.muted }}>课程不存在</Text>
          <TouchableOpacity
            onPress={handleBack}
            style={{
              marginTop: 16,
              backgroundColor: colors.primary,
              paddingHorizontal: 24,
              paddingVertical: 12,
              borderRadius: 20,
            }}
            activeOpacity={0.8}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '600' }}>
              返回
            </Text>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    );
  }

  const isPending = course.status === 'pending';
  const isAccepted = course.status === 'accepted';
  const isCompleted = course.status === 'completed';

  return (
    <ScreenContainer>
      {/* 顶部导航栏 */}
      <View 
        style={{ 
          flexDirection: 'row', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          paddingHorizontal: 16, 
          paddingVertical: 12,
          backgroundColor: colors.background,
          borderBottomWidth: 0.5,
          borderBottomColor: colors.border,
        }}
      >
        <TouchableOpacity
          onPress={handleBack}
          style={{ flexDirection: 'row', alignItems: 'center' }}
          activeOpacity={0.7}
        >
          <IconSymbol name="chevron.left" size={24} color={colors.foreground} />
          <Text style={{ fontSize: 16, color: colors.foreground, marginLeft: 4 }}>返回</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: '600', color: colors.foreground }}>
          课程详情
        </Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {/* 状态标签 */}
        <View style={{ marginBottom: 16 }}>
          {isPending && (
            <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, alignSelf: 'flex-start' }}>
              <Text style={{ fontSize: 14, color: '#92400E', fontWeight: '600' }}>待接单</Text>
            </View>
          )}
          {isAccepted && (
            <View style={{ backgroundColor: '#DBEAFE', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, alignSelf: 'flex-start' }}>
              <Text style={{ fontSize: 14, color: '#1E40AF', fontWeight: '600' }}>已接单</Text>
            </View>
          )}
          {isCompleted && (
            <View style={{ backgroundColor: '#D1FAE5', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, alignSelf: 'flex-start' }}>
              <Text style={{ fontSize: 14, color: '#065F46', fontWeight: '600' }}>已完成</Text>
            </View>
          )}
        </View>

        {/* 课程基本信息 */}
        <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <Text style={{ fontSize: 18, fontWeight: '600', color: colors.foreground, marginBottom: 16 }}>
            课程信息
          </Text>
          
          <View style={{ gap: 12 }}>
            <View>
              <Text style={{ fontSize: 14, color: colors.muted, marginBottom: 4 }}>课程名称</Text>
              <Text style={{ fontSize: 16, color: colors.foreground, fontWeight: '500' }}>
                {course.courseName}
              </Text>
            </View>

            <View>
              <Text style={{ fontSize: 14, color: colors.muted, marginBottom: 4 }}>课程类型</Text>
              <Text style={{ fontSize: 16, color: colors.foreground }}>
                {course.courseType || '-'}
              </Text>
            </View>

            <View>
              <Text style={{ fontSize: 14, color: colors.muted, marginBottom: 4 }}>上课时间</Text>
              <Text style={{ fontSize: 16, color: colors.foreground }}>
                {String(course.classDate)} {course.classTime}
              </Text>
            </View>

            <View>
              <Text style={{ fontSize: 14, color: colors.muted, marginBottom: 4 }}>课程时长</Text>
              <Text style={{ fontSize: 16, color: colors.foreground }}>
                {course.duration} 分钟
              </Text>
            </View>

            <View>
              <Text style={{ fontSize: 14, color: colors.muted, marginBottom: 4 }}>课程费用</Text>
              <Text style={{ fontSize: 20, color: colors.primary, fontWeight: '600' }}>
                ¥{course.fee}
              </Text>
            </View>
          </View>
        </View>

        {/* 教室信息 */}
        <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <Text style={{ fontSize: 18, fontWeight: '600', color: colors.foreground, marginBottom: 16 }}>
            教室信息
          </Text>
          
          <View style={{ gap: 12 }}>
            <View>
              <Text style={{ fontSize: 14, color: colors.muted, marginBottom: 4 }}>教室名称</Text>
              <Text style={{ fontSize: 16, color: colors.foreground }}>
                {course.classroomName || '-'}
              </Text>
            </View>

            <View>
              <Text style={{ fontSize: 14, color: colors.muted, marginBottom: 4 }}>教室地址</Text>
              <Text style={{ fontSize: 16, color: colors.foreground }}>
                {course.classroomAddress || '-'}
              </Text>
            </View>
          </View>
        </View>

        {/* 学员信息 */}
        <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <Text style={{ fontSize: 18, fontWeight: '600', color: colors.foreground, marginBottom: 16 }}>
            学员信息
          </Text>
          
          <View style={{ gap: 12 }}>
            <View>
              <Text style={{ fontSize: 14, color: colors.muted, marginBottom: 4 }}>学员姓名</Text>
              <Text style={{ fontSize: 16, color: colors.foreground }}>
                {course.studentName || '-'}
              </Text>
            </View>

            <View>
              <Text style={{ fontSize: 14, color: colors.muted, marginBottom: 4 }}>联系电话</Text>
              <Text style={{ fontSize: 16, color: colors.foreground }}>
                {course.studentPhone || '-'}
              </Text>
            </View>
          </View>
        </View>

        {/* 备注信息 */}
        {course.notes && (
          <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 16, marginBottom: 16 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: colors.foreground, marginBottom: 16 }}>
              备注信息
            </Text>
            <Text style={{ fontSize: 16, color: colors.foreground, lineHeight: 24 }}>
              {course.notes}
            </Text>
          </View>
        )}

        {/* 接单按钮（仅待接单状态显示） */}
        {isPending && (
          <TouchableOpacity
            onPress={handleAcceptCourse}
            style={{
              backgroundColor: colors.primary,
              paddingVertical: 16,
              borderRadius: 12,
              alignItems: 'center',
              marginBottom: 16,
            }}
            activeOpacity={0.8}
            disabled={isAccepting}
          >
            {isAccepting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600' }}>
                接单
              </Text>
            )}
          </TouchableOpacity>
        )}

        {/* 已接单提示 */}
        {isAccepted && (
          <View style={{ backgroundColor: '#DBEAFE', borderRadius: 12, padding: 16, marginBottom: 16 }}>
            <Text style={{ fontSize: 14, color: '#1E40AF', textAlign: 'center' }}>
              您已接受此课程，请按时到达教室上课
            </Text>
          </View>
        )}

        {/* 已完成提示 */}
        {isCompleted && (
          <View style={{ backgroundColor: '#D1FAE5', borderRadius: 12, padding: 16, marginBottom: 16 }}>
            <Text style={{ fontSize: 14, color: '#065F46', textAlign: 'center' }}>
              此课程已完成
            </Text>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
