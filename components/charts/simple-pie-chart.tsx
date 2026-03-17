/**
 * 简易饼图/环形图组件
 * 
 * 纯 React Native + SVG 实现
 * 用于展示订单状态分布、收入构成等
 */
import React, { memo, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColors } from '@/hooks/use-colors';

export interface PieChartDataItem {
  label: string;
  value: number;
  color: string;
}

interface SimplePieChartProps {
  data: PieChartDataItem[];
  title?: string;
  size?: number;
  showLegend?: boolean;
  formatValue?: (value: number) => string;
  centerLabel?: string;
  centerValue?: string;
}

export const SimplePieChart = memo(function SimplePieChart({
  data,
  title,
  size = 120,
  showLegend = true,
  formatValue = (v) => v.toFixed(0),
  centerLabel,
  centerValue,
}: SimplePieChartProps) {
  const colors = useColors();

  const total = useMemo(() => data.reduce((sum, d) => sum + d.value, 0), [data]);

  const segments = useMemo(() => {
    if (total === 0) return [];
    let startAngle = -90; // 从顶部开始
    return data.map((item) => {
      const angle = (item.value / total) * 360;
      const segment = {
        ...item,
        startAngle,
        endAngle: startAngle + angle,
        percentage: ((item.value / total) * 100).toFixed(1),
      };
      startAngle += angle;
      return segment;
    });
  }, [data, total]);

  if (data.length === 0 || total === 0) {
    return (
      <View style={styles.wrapper}>
        {title && <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>}
        <View style={[styles.emptyContainer, { height: size }]}>
          <Text style={[styles.emptyText, { color: colors.muted }]}>暂无数据</Text>
        </View>
      </View>
    );
  }

  // 使用色块代替SVG圆环
  const radius = size / 2;
  const innerRadius = radius * 0.6;

  return (
    <View style={styles.wrapper}>
      {title && <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>}
      <View style={styles.chartRow}>
        {/* 圆环图（使用堆叠色块模拟） */}
        <View style={[styles.pieContainer, { width: size, height: size }]}>
          {/* 外圆 - 使用分段色块 */}
          <View style={[styles.outerCircle, { width: size, height: size, borderRadius: radius }]}>
            {segments.map((seg, i) => {
              const angle = ((seg.startAngle + seg.endAngle) / 2) * (Math.PI / 180);
              const x = Math.cos(angle) * (radius * 0.35);
              const y = Math.sin(angle) * (radius * 0.35);
              const segAngle = seg.endAngle - seg.startAngle;
              return (
                <View
                  key={i}
                  style={[
                    styles.segment,
                    {
                      backgroundColor: seg.color,
                      width: size,
                      height: size,
                      borderRadius: radius,
                      transform: [
                        { rotate: `${seg.startAngle}deg` },
                      ],
                      opacity: segAngle > 0 ? 1 : 0,
                      // 使用clip模拟扇形
                    },
                  ]}
                />
              );
            })}
            {/* 简化实现：使用进度条式的色块 */}
          </View>
          {/* 内圆（白色遮罩形成环形） */}
          <View
            style={[
              styles.innerCircle,
              {
                width: innerRadius * 2,
                height: innerRadius * 2,
                borderRadius: innerRadius,
                backgroundColor: colors.surface,
              },
            ]}
          >
            {centerValue && (
              <Text style={[styles.centerValue, { color: colors.foreground }]}>{centerValue}</Text>
            )}
            {centerLabel && (
              <Text style={[styles.centerLabel, { color: colors.muted }]}>{centerLabel}</Text>
            )}
          </View>
        </View>

        {/* 图例 */}
        {showLegend && (
          <View style={styles.legend}>
            {segments.map((seg, i) => (
              <View key={i} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: seg.color }]} />
                <Text style={[styles.legendLabel, { color: colors.foreground }]} numberOfLines={1}>
                  {seg.label}
                </Text>
                <Text style={[styles.legendValue, { color: colors.muted }]}>
                  {seg.percentage}%
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* 横向进度条式替代展示 */}
      <View style={styles.progressBars}>
        {segments.map((seg, i) => (
          <View key={i} style={styles.progressRow}>
            <View style={styles.progressLabelRow}>
              <View style={[styles.progressDot, { backgroundColor: seg.color }]} />
              <Text style={[styles.progressLabel, { color: colors.foreground }]} numberOfLines={1}>
                {seg.label}
              </Text>
              <Text style={[styles.progressValue, { color: colors.muted }]}>
                {formatValue(seg.value)} ({seg.percentage}%)
              </Text>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: seg.color,
                    width: `${Math.min(parseFloat(seg.percentage), 100)}%`,
                  },
                ]}
              />
            </View>
          </View>
        ))}
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
  chartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    display: 'none', // 隐藏圆环图，使用进度条替代
  },
  pieContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerCircle: {
    position: 'absolute',
    overflow: 'hidden',
  },
  segment: {
    position: 'absolute',
  },
  innerCircle: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  centerValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  centerLabel: {
    fontSize: 10,
    marginTop: 2,
  },
  legend: {
    flex: 1,
    marginLeft: 16,
    gap: 6,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    fontSize: 12,
    flex: 1,
  },
  legendValue: {
    fontSize: 11,
  },
  // 进度条式展示
  progressBars: {
    gap: 8,
  },
  progressRow: {
    gap: 4,
  },
  progressLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  progressLabel: {
    fontSize: 12,
    flex: 1,
  },
  progressValue: {
    fontSize: 11,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
});
