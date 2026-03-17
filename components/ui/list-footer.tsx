/**
 * 列表底部加载更多组件
 * 
 * 用于 FlatList / ScrollView 底部，显示加载更多状态
 */
import React, { memo } from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity, StyleSheet } from 'react-native';
import { useColors } from '@/hooks/use-colors';

interface ListFooterProps {
  loading: boolean;
  hasMore: boolean;
  onLoadMore?: () => void;
  emptyText?: string;
}

export const ListFooter = memo(function ListFooter({
  loading,
  hasMore,
  onLoadMore,
  emptyText = '没有更多数据了',
}: ListFooterProps) {
  const colors = useColors();

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={[styles.text, { color: colors.muted }]}>加载中...</Text>
      </View>
    );
  }

  if (!hasMore) {
    return (
      <View style={styles.container}>
        <View style={[styles.line, { backgroundColor: colors.border }]} />
        <Text style={[styles.text, { color: colors.muted }]}>{emptyText}</Text>
        <View style={[styles.line, { backgroundColor: colors.border }]} />
      </View>
    );
  }

  if (onLoadMore) {
    return (
      <TouchableOpacity style={styles.container} onPress={onLoadMore} activeOpacity={0.7}>
        <Text style={[styles.loadMoreText, { color: colors.primary }]}>点击加载更多</Text>
      </TouchableOpacity>
    );
  }

  return null;
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  text: {
    fontSize: 12,
  },
  line: {
    height: StyleSheet.hairlineWidth,
    width: 40,
  },
  loadMoreText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
