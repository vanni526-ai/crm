/**
 * 简易柱状图组件
 * 
 * 纯 React Native 实现，无需第三方图表库
 * 适用于业绩统计、财务管理等页面的数据可视化
 */
import React, { memo, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColors } from '@/hooks/use-colors';

export interface BarChartDataItem {
  label: string;
  value: number;
  color?: string;
}

interface SimpleBarChartProps {
  data: BarChartDataItem[];
  title?: string;
  height?: number;
  showValues?: boolean;
  formatValue?: (value: number) => string;
  barColor?: string;
}

export const SimpleBarChart = memo(function SimpleBarChart({
  data,
  title,
  height = 160,
  showValues = true,
  formatValue = (v) => v.toFixed(0),
  barColor,
}: SimpleBarChartProps) {
  const colors = useColors();
  const defaultColor = barColor || colors.primary;

  const maxValue = useMemo(() => {
    const max = Math.max(...data.map(d => d.value), 1);
    return max;
  }, [data]);

  if (data.length === 0) {
    return (
      <View style={[styles.container, { height }]}>
        <Text style={[styles.emptyText, { color: colors.muted }]}>暂无数据</Text>
      </View>
    );
  }

  const barWidth = Math.max(20, Math.min(40, (300 - data.length * 4) / data.length));

  return (
    <View style={styles.wrapper}>
      {title && (
        <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
      )}
      <View style={[styles.container, { height }]}>
        {/* Y轴刻度 */}
        <View style={styles.yAxis}>
          <Text style={[styles.axisLabel, { color: colors.muted }]}>{formatValue(maxValue)}</Text>
          <Text style={[styles.axisLabel, { color: colors.muted }]}>{formatValue(maxValue / 2)}</Text>
          <Text style={[styles.axisLabel, { color: colors.muted }]}>0</Text>
        </View>
        {/* 柱状图区域 */}
        <View style={styles.chartArea}>
          {/* 网格线 */}
          <View style={[styles.gridLine, { top: 0, borderColor: colors.border }]} />
          <View style={[styles.gridLine, { top: '50%', borderColor: colors.border }]} />
          <View style={[styles.gridLine, { bottom: 0, borderColor: colors.border }]} />
          {/* 柱子 */}
          <View style={styles.barsContainer}>
            {data.map((item, index) => {
              const barHeight = maxValue > 0 ? (item.value / maxValue) * (height - 40) : 0;
              const color = item.color || defaultColor;
              return (
                <View key={index} style={styles.barWrapper}>
                  <View style={styles.barColumn}>
                    {showValues && item.value > 0 && (
                      <Text style={[styles.barValue, { color: colors.foreground }]} numberOfLines={1}>
                        {formatValue(item.value)}
                      </Text>
                    )}
                    <View
                      style={[
                        styles.bar,
                        {
                          height: Math.max(barHeight, 2),
                          width: barWidth,
                          backgroundColor: color,
                          borderTopLeftRadius: 4,
                          borderTopRightRadius: 4,
                        },
                      ]}
                    />
                  </View>
                  <Text
                    style={[styles.barLabel, { color: colors.muted }]}
                    numberOfLines={1}
                  >
                    {item.label}
                  </Text>
                </View>
              );
            })}
          </View>
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
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  emptyText: {
    flex: 1,
    textAlign: 'center',
    textAlignVertical: 'center',
    fontSize: 13,
  },
  yAxis: {
    width: 40,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingRight: 4,
    paddingBottom: 20,
  },
  axisLabel: {
    fontSize: 10,
  },
  chartArea: {
    flex: 1,
    position: 'relative',
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderStyle: 'dashed',
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    flex: 1,
    paddingBottom: 20,
  },
  barWrapper: {
    alignItems: 'center',
    flex: 1,
  },
  barColumn: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  bar: {
    minHeight: 2,
  },
  barValue: {
    fontSize: 9,
    fontWeight: '600',
    marginBottom: 2,
  },
  barLabel: {
    fontSize: 10,
    marginTop: 4,
    textAlign: 'center',
  },
});
