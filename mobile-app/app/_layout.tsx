import "@/global.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import React from "react";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import { Platform } from "react-native";
import "@/lib/_core/nativewind-pressable";
import { ThemeProvider } from "@/lib/theme-provider";
import {
  SafeAreaFrameContext,
  SafeAreaInsetsContext,
  SafeAreaProvider,
  initialWindowMetrics,
} from "react-native-safe-area-context";
import type { EdgeInsets, Metrics, Rect } from "react-native-safe-area-context";

import { trpc, createTRPCClient } from "@/lib/trpc";
import { initManusRuntime, subscribeSafeAreaInsets } from "@/lib/_core/manus-runtime";
import { AuthProvider } from "@/lib/auth-context";
import { useAuth } from "@/lib/auth-context";
import { useUserRoles } from "@/src/hooks/use-user-roles";
import { BookingProvider } from "@/lib/booking-context";
import { useRouter, useSegments } from "expo-router";
import { View, ActivityIndicator, Text, Alert } from "react-native";
import { useColors } from "@/hooks/use-colors";

const DEFAULT_WEB_INSETS: EdgeInsets = { top: 0, right: 0, bottom: 0, left: 0 };
const DEFAULT_WEB_FRAME: Rect = { x: 0, y: 0, width: 0, height: 0 };

export const unstable_settings = {
  anchor: "(tabs)",
};

/**
 * 路由守卫组件
 * 根据登录状态和用户角色进行路由控制
 */
function RootNavigator() {
  const { state } = useAuth();
  const { currentRole } = useUserRoles();
  const router = useRouter();
  const segments = useSegments();
  const colors = useColors();

  useEffect(() => {
    if (state.isLoading) return;

    const inAuthGroup = segments[0] === "(tabs)" || segments[0] === "(admin)" || segments[0] === "(teacher)" || segments[0] === "(partner)" || segments[0] === "(sales)";
    const inLoginGroup = segments[0] === "login" || segments[0] === "register" || segments[0] === "forgot-password";
    const inRoleSelection = segments[0] === "role-selection";

    if (!state.isAuthenticated && !inLoginGroup) {
      // 未登录，跳转到登录页
      router.replace("/login" as any);
    } else if (state.isAuthenticated && state.user) {
      // 已登录，根据当前选择的角色跳转
      // 优先使用 currentRole（用户当前选择的角色），其次使用 roles（用户拥有的所有角色）
      const roles = state.user.roles || state.user.role || "";
      
      // 确定用户应该访问的首页
      let targetRoute = "/(tabs)";
      if (currentRole) {
        // 如果用户已经选择了角色，使用当前角色
        if (currentRole === "admin") {
          targetRoute = "/(admin)";
        } else if (currentRole === "teacher") {
          targetRoute = "/(teacher)";
        } else if (currentRole === "cityPartner") {
          targetRoute = "/(partner)";
        } else if (currentRole === "sales") {
          targetRoute = "/(sales)";
        } else if (currentRole === "user") {
          targetRoute = "/(tabs)";
        }
      } else {
        // 如果用户还没有选择角色，使用默认角色（优先级：admin > teacher > cityPartner > sales > user）
        if (roles.includes("admin")) {
          targetRoute = "/(admin)";
        } else if (roles.includes("teacher")) {
          targetRoute = "/(teacher)";
        } else if (roles.includes("cityPartner")) {
          targetRoute = "/(partner)";
        } else if (roles.includes("sales")) {
          targetRoute = "/(sales)";
        }
      }
      
      // 如果在登录页面，跳转到对应首页
      if (inLoginGroup) {
        router.replace(targetRoute as any);
      }
      // 如果在角色选择页面，不要干扰
      else if (inRoleSelection) {
        // 不做任何操作，让用户选择角色
      }
      // 如果在错误的首页，跳转到正确的首页
      else if (inAuthGroup && segments[0] !== targetRoute.replace("/", "")) {
        router.replace(targetRoute as any);
      }
    }
  }, [state.isAuthenticated, state.isLoading, state.user, currentRole, segments, router]);

  // 显示加载页面
  if (state.isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 16, fontSize: 16, color: colors.muted }}>加载中...</Text>
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(admin)" />
      <Stack.Screen name="(teacher)" />
      <Stack.Screen name="(partner)" />
      <Stack.Screen name="(sales)" />
      <Stack.Screen name="login" options={{ presentation: "fullScreenModal" }} />
      <Stack.Screen name="register" options={{ presentation: "fullScreenModal" }} />
      <Stack.Screen name="forgot-password" options={{ presentation: "fullScreenModal" }} />
      <Stack.Screen name="booking/confirm" options={{ presentation: "card" }} />
      <Stack.Screen name="oauth/callback" />
    </Stack>
  );
}

export default function RootLayout() {
  const initialInsets = initialWindowMetrics?.insets ?? DEFAULT_WEB_INSETS;
  const initialFrame = initialWindowMetrics?.frame ?? DEFAULT_WEB_FRAME;

  const [insets, setInsets] = useState<EdgeInsets>(initialInsets);
  const [frame, setFrame] = useState<Rect>(initialFrame);

  // Initialize Manus runtime for cookie injection from parent container
  useEffect(() => {
    initManusRuntime();
  }, []);

  const handleSafeAreaUpdate = useCallback((metrics: Metrics) => {
    setInsets(metrics.insets);
    setFrame(metrics.frame);
  }, []);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const unsubscribe = subscribeSafeAreaInsets(handleSafeAreaUpdate);
    return () => unsubscribe();
  }, [handleSafeAreaUpdate]);

  // Create clients once and reuse them
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Disable automatic refetching on window focus for mobile
            refetchOnWindowFocus: false,
            // Retry failed requests once
            retry: 1,
          },
        },
      }),
  );
  const [trpcClient] = useState(() => createTRPCClient());

  // Ensure minimum 8px padding for top and bottom on mobile
  const providerInitialMetrics = useMemo(() => {
    const metrics = initialWindowMetrics ?? { insets: initialInsets, frame: initialFrame };
    return {
      ...metrics,
      insets: {
        ...metrics.insets,
        top: Math.max(metrics.insets.top, 16),
        bottom: Math.max(metrics.insets.bottom, 12),
      },
    };
  }, [initialInsets, initialFrame]);

  const content = (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <BookingProvider>
          <trpc.Provider client={trpcClient} queryClient={queryClient}>
            <QueryClientProvider client={queryClient}>
              <RootNavigator />
              <StatusBar style="light" />
            </QueryClientProvider>
          </trpc.Provider>
        </BookingProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );

  const shouldOverrideSafeArea = Platform.OS === "web";

  if (shouldOverrideSafeArea) {
    return (
      <ThemeProvider>
        <SafeAreaProvider initialMetrics={providerInitialMetrics}>
          <SafeAreaFrameContext.Provider value={frame}>
            <SafeAreaInsetsContext.Provider value={insets}>
              {content}
            </SafeAreaInsetsContext.Provider>
          </SafeAreaFrameContext.Provider>
        </SafeAreaProvider>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <SafeAreaProvider initialMetrics={providerInitialMetrics}>{content}</SafeAreaProvider>
    </ThemeProvider>
  );
}
