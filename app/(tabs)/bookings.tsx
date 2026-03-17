import { View, Text, ScrollView, ActivityIndicator, RefreshControl, Pressable } from "react-native";
import { useState, useEffect, useCallback } from "react";
import { useFocusEffect } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { BookingCard, type BookingDetail } from "@/components/booking/booking-card";
import api from "@/lib/sdk/api";
import { useAuth } from "@/lib/auth-context";
import { useColors } from "@/hooks/use-colors";
import { Cache, CACHE_KEYS } from "@/lib/cache";

export default function BookingsScreen() {
  const { state: authState } = useAuth();
  const colors = useColors();
  const [bookings, setBookings] = useState<BookingDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 每次页面获得焦点时重新加载数据
  useFocusEffect(
    useCallback(() => {
      loadBookings();
    }, [])
  );

  const loadBookings = async (forceRefresh: boolean = false) => {
    try {
      setError(null);
      
      // 尝试从缓存加载
      if (!forceRefresh) {
        const cachedData = await Cache.get<{orders: any[], classrooms: any[]}>(CACHE_KEYS.MY_BOOKINGS);
        if (cachedData) {
          console.log('[Bookings] Loaded from cache');
          processBookingsData(cachedData.orders, cachedData.classrooms);
          setLoading(false);
          return;
        }
      }
      
      // 并发请求订单和教室列表
      const [result, classrooms] = await Promise.all([
        api.orders.myOrders({
          status: 'all',
          limit: 50,
          offset: 0,
        }),
        api.classrooms.list(),
      ]);
      
      const orders = (result as any)?.orders || (Array.isArray(result) ? result : []);
      
      // 保存到缓存（1天有效期）
      await Cache.set(CACHE_KEYS.MY_BOOKINGS, { orders, classrooms });
      console.log('[Bookings] Saved to cache');
      
      processBookingsData(orders, classrooms);
    } catch (err: any) {
      console.error("[Bookings] Load failed:", err);
      setError(err.message || "加载预约记录失败");
      setBookings([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  const processBookingsData = (orders: any[], classrooms: any[]) => {
    // 创建教室映射：ID、名称、城市
      const classroomMap = new Map<string, string>();
      const classroomNameMap = new Map<string, string>();
      const classroomCityMap = new Map<string, string>(); // 城市到地址的映射
      
      if (classrooms && Array.isArray(classrooms)) {
        classrooms.forEach((classroom: any) => {
          if (classroom.id && classroom.address) {
            // ID 映射
            classroomMap.set(String(classroom.id), classroom.address);
            classroomMap.set(classroom.id, classroom.address);
            
            // 名称映射
            if (classroom.name) {
              classroomNameMap.set(classroom.name, classroom.address);
            }
            
            // 城市映射（如果一个城市有多个教室，只保存第一个）
            if (classroom.cityName && !classroomCityMap.has(classroom.cityName)) {
              classroomCityMap.set(classroom.cityName, classroom.address);
            }
          }
        });
      }
      
      if (!orders || orders.length === 0) {
        setBookings([]);
        return;
      }

      // 转换订单数据为BookingDetail格式
      const bookingDetails: BookingDetail[] = orders.map((order: any) => {
        // 构建教室地址：多种回退策略
        let classroomAddress = "";
        
        // 1. 尝试通过教室 ID 查询
        if (order.deliveryClassroomId) {
          const idStr = String(order.deliveryClassroomId);
          if (classroomMap.has(idStr)) {
            classroomAddress = classroomMap.get(idStr) || "";
          } else if (classroomMap.has(order.deliveryClassroomId)) {
            classroomAddress = classroomMap.get(order.deliveryClassroomId) || "";
          }
        }
        
        // 2. 尝试通过教室名称查询
        if (!classroomAddress && order.deliveryRoom && classroomNameMap.has(order.deliveryRoom)) {
          classroomAddress = classroomNameMap.get(order.deliveryRoom) || "";
        }
        
        // 3. 尝试通过城市名称查询（当 ID 和名称都为 null 时）
        if (!classroomAddress && order.deliveryCity && classroomCityMap.has(order.deliveryCity)) {
          classroomAddress = classroomCityMap.get(order.deliveryCity) || "";
        }
        
        // 4. 使用 API 返回的地址（但如果只是城市名称则跳过）
        if (!classroomAddress && order.classroomAddress && order.classroomAddress !== order.deliveryCity) {
          classroomAddress = order.classroomAddress;
        }
        
        // 4. 组合城市和教室名称
        if (!classroomAddress && order.deliveryCity && order.deliveryRoom) {
          classroomAddress = `${order.deliveryCity} · ${order.deliveryRoom}`;
        }
        
        // 5. 最后回退
        if (!classroomAddress) {
          classroomAddress = order.deliveryCity || order.deliveryRoom || "待定";
        }
        
        return {
          id: order.id,
          orderNo: order.orderNo || "",
          status: order.status || "pending",
          deliveryStatus: order.deliveryStatus,  // 添加交付状态字段
          deliveryCourse: order.deliveryCourse || "未知课程",
          courseAmount: order.courseAmount || order.paymentAmount || "0",
          courseDuration: undefined,
          courseLevel: undefined,
          classDate: order.classDate || "",
          classTime: order.classTime || "",
          deliveryCity: order.deliveryCity || "",
          deliveryRoom: order.deliveryRoom || "",
          classroomAddress: classroomAddress,
          deliveryClassroomId: order.deliveryClassroomId,
          deliveryTeacher: order.deliveryTeacher || order.teacherName || "未知老师",
          teacherAvatar: undefined,
          customerName: order.customerName || "",
          createdAt: order.createdAt || "",
        };
      });

      // 按上课日期升序排列(距离当前时间越近的越靠前)
      bookingDetails.sort((a, b) => {
        // 组合日期和时间，处理空值
        const dateA = a.classDate || '9999-12-31';
        const timeA = a.classTime || '00:00';
        const dateB = b.classDate || '9999-12-31';
        const timeB = b.classTime || '00:00';
        
        // 简单的字符串比较（YYYY-MM-DD HH:MM 格式可以直接比较）
        const fullDateTimeA = `${dateA} ${timeA}`;
        const fullDateTimeB = `${dateB} ${timeB}`;
        
        // 升序排列：早的在前
        return fullDateTimeA.localeCompare(fullDateTimeB);
      });

      setBookings(bookingDetails);
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadBookings(true); // 强制刷新，不使用缓存
  }, []);

  if (loading) {
    return (
      <ScreenContainer className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color={colors.primary} />
        <Text className="text-muted mt-4">加载预约记录...</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="flex-1">
      {/* 顶部标题 */}
      <View className="px-4 pt-4 pb-2">
        <Text className="text-2xl font-bold text-foreground">我的预约</Text>
        {bookings.length > 0 && (
          <Text className="text-sm text-muted mt-1">
            共 {bookings.length} 个预约订单
          </Text>
        )}
      </View>

      {/* 错误提示 */}
      {error && (
        <View className="mx-4 mb-2 bg-error/10 rounded-xl p-3">
          <Text className="text-error text-sm">{error}</Text>
          <Pressable
            onPress={() => {
              setError(null);
              setLoading(true);
              loadBookings();
            }}
            style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
            className="mt-2"
          >
            <Text className="text-primary text-sm font-medium">点击重试</Text>
          </Pressable>
        </View>
      )}

      {/* 预约列表 */}
      {bookings.length === 0 && !error ? (
        <View className="flex-1 items-center justify-center px-4">
          <Text className="text-6xl mb-4">📅</Text>
          <Text className="text-lg text-muted text-center mb-2">
            暂无预约记录
          </Text>
          <Text className="text-sm text-muted text-center">
            去首页预约您的第一节课吧
          </Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
        >
          {/* 预约订单卡片列表 - 一行一个 */}
          {bookings.map((booking) => (
            <BookingCard key={booking.id} booking={booking} className="mb-4" />
          ))}

          {/* 底部取消政策提示 */}
          <View className="bg-warning/10 rounded-xl p-4 mt-2 mb-4">
            <View className="flex-row items-start mb-2">
              <Text className="text-warning text-lg mr-2">⚠️</Text>
              <Text className="text-warning font-semibold text-base flex-1">
                取消预约须知
              </Text>
            </View>
            <Text className="text-muted text-sm leading-5">
              如需取消预约,请联系客服处理。
            </Text>
            <Text className="text-muted text-sm leading-5 mt-1">
              温馨提示:临近上课时间30分钟内取消,需承担50%的空置费用。请合理安排时间,提前告知变更。
            </Text>
            <Pressable
              style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
              className="mt-3"
            >
              <View className="bg-warning px-4 py-2 rounded-lg self-start">
                <Text className="text-white text-sm font-medium">联系客服</Text>
              </View>
            </Pressable>
          </View>
        </ScrollView>
      )}
    </ScreenContainer>
  );
}
