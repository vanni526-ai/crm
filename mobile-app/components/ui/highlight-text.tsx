/**
 * 搜索高亮文本组件
 * 
 * 将搜索关键词在文本中高亮显示
 */
import React, { memo, useMemo } from 'react';
import { Text, TextStyle } from 'react-native';
import { useColors } from '@/hooks/use-colors';

interface HighlightTextProps {
  text: string;
  highlight: string;
  style?: TextStyle;
  highlightStyle?: TextStyle;
  numberOfLines?: number;
}

export const HighlightText = memo(function HighlightText({
  text,
  highlight,
  style,
  highlightStyle,
  numberOfLines,
}: HighlightTextProps) {
  const colors = useColors();

  const parts = useMemo(() => {
    if (!highlight || !highlight.trim()) {
      return [{ text, isHighlight: false }];
    }

    const regex = new RegExp(`(${escapeRegExp(highlight)})`, 'gi');
    const splits = text.split(regex);

    return splits.map((part) => ({
      text: part,
      isHighlight: part.toLowerCase() === highlight.toLowerCase(),
    }));
  }, [text, highlight]);

  const defaultHighlightStyle: TextStyle = {
    backgroundColor: colors.warning + '30',
    color: colors.warning,
    fontWeight: '600',
    ...highlightStyle,
  };

  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {parts.map((part, index) =>
        part.isHighlight ? (
          <Text key={index} style={defaultHighlightStyle}>
            {part.text}
          </Text>
        ) : (
          <Text key={index}>{part.text}</Text>
        )
      )}
    </Text>
  );
});

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
