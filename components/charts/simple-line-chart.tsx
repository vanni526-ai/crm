/**
 * 简易趋势线图组件
 * 
 * 纯 React Native 实现，使用折线连接数据点
 * 适用于收入趋势、订单趋势等
 */
import React, { memo, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColors } from '@/hooks/use-colors';

export interface LineChartDataItem {
  label: string;
  value: number;
}

interface SimpleLineChartProps {
  data: LineChartDataItem[];
  title?: string;
  height?: number;
  lineColor?: string;
  showDots?: boolean;
  showValues?: boolean;
  formatValue?: (value: number) => string;
}

export const SimpleLineChart = memo(function SimpleLineChart({
  data,
  title,
  height = 140,
  lineColor,
  showDots = true,
  showValues = true,
  formatValue = (v) => v >= 10000 ? `${(v / 10000).toFixed(1)}w` : v.toFixed(0),
}: SimpleLineChartProps) {
  const colors = useColors();
  const color = lineColor || colors.primary;

  const { maxValue, minValue, points } = useMemo(() => {
    if (data.length === 0) return { maxValue: 0, minValue: 0, points: [] };
    const values = data.map(d => d.value);
    const max = Math.max(...values, 1);
    const min = Math.min(...values, 0);
    const range = max - min || 1;
    const chartHeight = height - 50; // 留出标签空间

    const pts = data.map((item, index) => {
      const x = data.length > 1 ? index / (data.length - 1) : 0.5;
      const y = 1 - (item.value - min) / range;
      return {
        ...item,
        x,
        y: y * chartHeight + 10,
        rawX: x,
        rawY: y,
      };
    });

    return { maxValue: max, minValue: min, points: pts };
  }, [data, height]);

  if (data.length === 0) {
    return (
      <View style={styles.wrapper}>
        {title && <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>}
        <View style={[styles.emptyContainer, { height }]}>
          <Text style={[styles.emptyText, { color: colors.muted }]}>暂无数据</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      {title && <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>}
      
      {/* Y轴标签 */}
      <View style={styles.yLabels}>
        <Text style={[styles.yLabel, { color: colors.muted }]}>{formatValue(maxValue)}</Text>
        <Text style={[styles.yLabel, { color: colors.muted }]}>{formatValue(minValue)}</Text>
      </View>

      {/* 图表区域 - 使用柱状图模拟趋势 */}
      <View style={[styles.chartArea, { height }]}>
        {/* 网格线 */}
        <View style={[styles.gridLine, { top: 10, borderColor: colors.border }]} />
        <View style={[styles.gridLine, { top: '50%', borderColor: colors.border }]} />
        <View style={[styles.gridLine, { bottom: 20, borderColor: colors.border }]} />

        {/* 数据点和连接 */}
        <View style={styles.pointsContainer}>
          {points.map((point, index) => (
            <View key={index} style={styles.pointColumn}>
              {showValues && (
                <Text style={[styles.pointValue, { color: colors.foreground, bottom: height - point.y + 5 }]} numberOfLines={1}>
                  {formatValue(point.value)}
                </Text>
              )}
              {/* 数据点 */}
              {showDots && (
                <View
                  style={[
                    styles.dot,
                    {
                      backgroundColor: color,
                      bottom: height - point.y - 4,
                    },
                  ]}
                />
              )}
              {/* 垂直线到底部 */}
              <View
                style={[
                  styles.verticalLine,
                  {
                    backgroundColor: color + '30',
                    height: height - point.y - 20,
                    bottom: 20,
                  },
                ]}
              />
              {/* X轴标签 */}
              <Text style={[styles.xLabel, { color: colors.muted }]} numberOfLines={1}>
                {point.label}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    marginVertical: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 13,
  },
  yLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  yLabel: {
    fontSize: 10,
  },
  chartArea: {
    position: 'relative',
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderStyle: 'dashed',
  },
  pointsContainer: {
    flexDirection: 'row',
    flex: 1,
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    paddingBottom: 20,
  },
  pointColumn: {
    alignItems: 'center',
    flex: 1,
    position: 'relative',
    height: '100%',
  },
  pointValue: {
    position: 'absolute',
    fontSize: 9,
    fontWeight: '600',
  },
  dot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    zIndex: 2,
  },
  verticalLine: {
    position: 'absolute',
    width: 2,
    borderRadius: 1,
  },
  xLabel: {
    position: 'absolute',
    bottom: 0,
    fontSize: 9,
    textAlign: 'center',
  },
});
