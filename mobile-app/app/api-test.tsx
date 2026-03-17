import { View, Text, TouchableOpacity, ScrollView, Platform } from "react-native";
import { useState } from "react";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";

export default function ApiTestScreen() {
  const colors = useColors();
  const [result, setResult] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const testApi = async () => {
    setLoading(true);
    setResult("Testing...\n");
    
    try {
      // 测试环境信息
      const envInfo = `Platform: ${Platform.OS}\nNavigator: ${typeof navigator !== 'undefined' ? navigator.product : 'undefined'}\n\n`;
      setResult(prev => prev + envInfo);

      // 测试 API 调用
      const url = "https://crm.bdsm.com.cn/api/trpc/auth.loginWithUserAccount";
      const body = {
        json: {
          username: "test",
          password: "123456"
        }
      };

      setResult(prev => prev + `Calling: ${url}\n\n`);

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      setResult(prev => prev + `Status: ${response.status}\n`);
      setResult(prev => prev + `Headers: ${JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2)}\n\n`);

      const text = await response.text();
      setResult(prev => prev + `Response (first 500 chars):\n${text.substring(0, 500)}\n`);

    } catch (error: any) {
      setResult(prev => prev + `\nError: ${error.message}\n${error.stack || ''}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer className="p-4">
      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="gap-4">
          <Text className="text-2xl font-bold text-foreground">API 测试</Text>
          
          <TouchableOpacity
            onPress={testApi}
            disabled={loading}
            style={{
              backgroundColor: loading ? colors.muted : colors.primary,
              padding: 16,
              borderRadius: 12,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>
              {loading ? "测试中..." : "测试后端 API"}
            </Text>
          </TouchableOpacity>

          {result && (
            <View
              style={{
                backgroundColor: colors.surface,
                padding: 16,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Text
                style={{
                  fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
                  fontSize: 12,
                  color: colors.foreground,
                }}
              >
                {result}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
