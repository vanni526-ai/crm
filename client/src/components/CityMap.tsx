import { useEffect, useRef, useState } from "react";
import * as echarts from "echarts";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

// 城市坐标映射(主要城市)
const cityCoordinates: Record<string, [number, number]> = {
  北京: [116.4074, 39.9042],
  上海: [121.4737, 31.2304],
  广州: [113.2644, 23.1291],
  深圳: [114.0579, 22.5431],
  成都: [104.0665, 30.5723],
  杭州: [120.1551, 30.2741],
  重庆: [106.5516, 29.5630],
  武汉: [114.3055, 30.5931],
  西安: [108.9398, 34.3416],
  天津: [117.2010, 39.0842],
  南京: [118.7969, 32.0603],
  长沙: [112.9388, 28.2282],
  郑州: [113.6254, 34.7466],
  沈阳: [123.4328, 41.8045],
  青岛: [120.3826, 36.0671],
  大连: [121.6147, 38.9140],
  厦门: [118.0894, 24.4798],
  宁波: [121.5440, 29.8683],
  苏州: [120.5954, 31.2989],
  无锡: [120.3019, 31.5747],
};

interface CityMapProps {
  onCityClick?: (cityName: string) => void;
}

export function CityMap({ onCityClick }: CityMapProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  const { data: citiesData, isLoading } = trpc.analytics.getAllCitiesWithStats.useQuery();

  useEffect(() => {
    if (!chartRef.current || !citiesData) return;

    // 初始化图表
    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }

    const chart = chartInstance.current;

    // 准备地图数据
    const mapData = citiesData
      .filter((city) => cityCoordinates[city.city])
      .map((city) => ({
        name: city.city,
        value: [
          ...cityCoordinates[city.city],
          city.orderCount,
          city.totalSales,
          city.profit,
        ],
      }));

    // 计算最大值用于气泡大小缩放
    const maxOrderCount = Math.max(...citiesData.map((c) => c.orderCount), 1);

    const option: echarts.EChartsOption = {
      backgroundColor: "transparent",
      title: {
        text: "全国城市业务分布",
        left: "center",
        top: 20,
        textStyle: {
          color: "#333",
          fontSize: 18,
          fontWeight: "bold",
        },
      },
      tooltip: {
        trigger: "item",
        formatter: (params: any) => {
          if (params.componentType === "series") {
            const [lng, lat, orderCount, sales, profit] = params.value;
            return `
              <div style="padding: 8px;">
                <div style="font-weight: bold; margin-bottom: 4px;">${params.name}</div>
                <div>订单数: ${orderCount}</div>
                <div>销售额: ¥${sales.toFixed(2)}</div>
                <div>利润: ¥${profit.toFixed(2)}</div>
              </div>
            `;
          }
          return params.name;
        },
      },
      geo: {
        map: "china",
        roam: true,
        zoom: 1.2,
        center: [105, 36],
        itemStyle: {
          areaColor: "#f3f4f6",
          borderColor: "#d1d5db",
          borderWidth: 1,
        },
        emphasis: {
          itemStyle: {
            areaColor: "#e5e7eb",
          },
          label: {
            show: false,
          },
        },
        select: {
          itemStyle: {
            areaColor: "#e5e7eb",
          },
          label: {
            show: false,
          },
        },
      },
      series: [
        {
          name: "城市业务",
          type: "scatter",
          coordinateSystem: "geo",
          data: mapData,
          symbolSize: (val: number[]) => {
            const orderCount = val[2];
            return Math.max(10, Math.min(50, (orderCount / maxOrderCount) * 50));
          },
          itemStyle: {
            color: (params: any) => {
              const profit = params.value[4];
              return profit >= 0 ? "#10b981" : "#ef4444";
            },
            shadowBlur: 10,
            shadowColor: "rgba(0, 0, 0, 0.3)",
          },
          emphasis: {
            scale: true,
            itemStyle: {
              borderColor: "#fff",
              borderWidth: 2,
            },
          },
        },
        {
          name: "城市标注",
          type: "effectScatter",
          coordinateSystem: "geo",
          data: mapData.slice(0, 5), // 只显示前5个城市的动画效果
          symbolSize: (val: number[]) => {
            const orderCount = val[2];
            return Math.max(15, Math.min(60, (orderCount / maxOrderCount) * 60));
          },
          showEffectOn: "render",
          rippleEffect: {
            brushType: "stroke",
            scale: 2.5,
            period: 4,
          },
          itemStyle: {
            color: (params: any) => {
              const profit = params.value[4];
              return profit >= 0 ? "#10b981" : "#ef4444";
            },
            shadowBlur: 10,
            shadowColor: "rgba(0, 0, 0, 0.5)",
          },
          zlevel: 1,
        },
      ],
    };

    // 注册中国地图(简化版)
    if (!echarts.getMap("china")) {
      // 使用简化的中国地图GeoJSON
      fetch("https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json")
        .then((response) => response.json())
        .then((geoJson) => {
          echarts.registerMap("china", geoJson);
          chart.setOption(option);
        })
        .catch((error) => {
          console.error("加载地图数据失败:", error);
        });
    } else {
      chart.setOption(option);
    }

    // 点击事件
    chart.on("click", (params: any) => {
      if (params.componentType === "series" && params.name && onCityClick) {
        onCityClick(params.name);
      }
    });

    // 响应式
    const handleResize = () => {
      chart.resize();
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.off("click");
    };
  }, [citiesData, onCityClick]);

  // 清理
  useEffect(() => {
    return () => {
      if (chartInstance.current) {
        chartInstance.current.dispose();
        chartInstance.current = null;
      }
    };
  }, []);

  if (isLoading) {
    return (
      <Card className="p-8 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div ref={chartRef} style={{ width: "100%", height: "600px" }} />
      <div className="mt-4 flex items-center justify-center gap-6 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span>盈利城市</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span>亏损城市</span>
        </div>
        <div className="flex items-center gap-2">
          <span>气泡大小代表订单数量</span>
        </div>
      </div>
    </Card>
  );
}
