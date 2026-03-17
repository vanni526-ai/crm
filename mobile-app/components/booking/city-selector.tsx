import { View, Text, FlatList, ActivityIndicator } from "react-native";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { useBooking } from "@/lib/booking-context";
import { api, City } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { Cache, CACHE_KEYS } from "@/lib/cache";

interface CitySelectorProps {
  className?: string;
}

export function CitySelector({ className }: CitySelectorProps) {
  const { state, selectCity } = useBooking();
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCities();
  }, []);

  const loadCities = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // 尝试从缓存加载
      const cachedCities = await Cache.get<City[]>(CACHE_KEYS.CITY_LIST);
      if (cachedCities) {
        console.log('[CitySelector] Loaded from cache');
        const activeCities = cachedCities.filter(c => c.isActive);
        if (activeCities.length > 0) {
          setCities(activeCities);
          setLoading(false);
          return;
        }
      }
      
      // 使用旧 api-client 的 cities.list() 方法，它包含完整的数据过滤逻辑
      const data = await api.cities.list();
      
      // 保存到缓存（1天有效期）
      await Cache.set(CACHE_KEYS.CITY_LIST, data);
      console.log('[CitySelector] Saved to cache');
      
      // 只显示活跃的城市
      const activeCities = data.filter(c => c.isActive);
      if (activeCities.length > 0) {
        setCities(activeCities);
      } else {
        setError("暂无可用城市，请联系管理员添加城市数据");
      }
    } catch (err: any) {
      console.log("加载城市失败", err);
      setError("加载城市失败，请检查网络连接");
    } finally {
      setLoading(false);
    }
  };

  const renderCity = ({ item }: { item: City }) => {
    const isSelected = state.selectedCity?.id === item.id;

    return (
      <View className="w-1/2 p-2">
        <Card
          onPress={() => selectCity(item)}
          selected={isSelected}
          className="items-center py-6"
        >
          <Text
            className={cn(
              "text-lg font-semibold",
              isSelected ? "text-primary" : "text-foreground"
            )}
          >
            {item.pinyin ? `${item.pinyin} ${item.city}` : item.city}
          </Text>
        </Card>
      </View>
    );
  };

  if (loading) {
    return (
      <View className={cn("flex-1 items-center justify-center", className)}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text className="text-muted mt-4">加载城市中...</Text>
      </View>
    );
  }

  if (error && cities.length === 0) {
    return (
      <View className={cn("flex-1 items-center justify-center p-4", className)}>
        <Text className="text-error text-center">{error}</Text>
        <Text
          className="text-primary mt-4"
          onPress={loadCities}
        >
          点击重试
        </Text>
      </View>
    );
  }

  return (
    <View className={cn("flex-1", className)}>
      <Text className="text-xl font-semibold text-foreground mb-4 px-2">
        选择上课城市
      </Text>
      <FlatList
        data={cities}
        renderItem={renderCity}
        keyExtractor={(item) => item.id.toString()}
        numColumns={2}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </View>
  );
}
