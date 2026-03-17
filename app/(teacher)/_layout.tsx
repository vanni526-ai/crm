import { Tabs } from "expo-router";
import { Platform } from "react-native";
import { useState, useEffect, useCallback } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/use-colors";
import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { api } from "@/lib/api-client";

/**
 * 老师端布局
 * 
 * 包含底部导航栏：首页、我的课程、培训中心、我的
 */
export default function TeacherLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === "web" ? 12 : Math.max(insets.bottom, 8);
  const tabBarHeight = 56 + bottomPadding;

  const [pendingCount, setPendingCount] = useState(0);

  const fetchCounts = useCallback(async () => {
    try {
      const [pending, accepted] = await Promise.all([
        api.teacher.courses({ status: "pending" }),
        api.teacher.courses({ status: "accepted" }),
      ]);
      setPendingCount((pending?.length || 0) + (accepted?.length || 0));
    } catch (e) {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchCounts();
    const timer = setInterval(fetchCounts, 30000);
    return () => clearInterval(timer);
  }, [fetchCounts]);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          paddingTop: 8,
          paddingBottom: bottomPadding,
          height: tabBarHeight,
          backgroundColor: '#FFFFFF',
          borderTopColor: colors.border,
          borderTopWidth: 0.5,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "首页",
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="courses"
        options={{
          title: "我的课程",
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="paperplane.fill" color={color} />,
          tabBarBadge: pendingCount > 0 ? pendingCount : undefined,
        }}
      />
      <Tabs.Screen
        name="training"
        options={{
          title: "培训中心",
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="book.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="[id]"
        options={{
          href: null, // 隐藏该页面，不在导航栏显示
        }}
      />
      <Tabs.Screen
        name="income"
        options={{
          href: null, // 隐藏该页面，不在导航栏显示
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "我的",
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="person.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}
