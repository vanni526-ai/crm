import { View, Text, Pressable, Modal, ScrollView, StyleSheet } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type SortType = "default" | "price_asc" | "price_desc" | "duration_asc" | "duration_desc";
export type LevelFilter = "all" | "入门" | "深度" | "剧本" | "订制";

interface FilterBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  sortType: SortType;
  levelFilter: LevelFilter;
  onSortChange: (sort: SortType) => void;
  onLevelFilterChange: (level: LevelFilter) => void;
}

export function FilterBottomSheet({
  visible,
  onClose,
  sortType,
  levelFilter,
  onSortChange,
  onLevelFilterChange,
}: FilterBottomSheetProps) {
  const colors = useColors();

  const levelOptions: { label: string; value: LevelFilter }[] = [
    { label: "全部", value: "all" },
    { label: "入门", value: "入门" },
    { label: "深度", value: "深度" },
    { label: "剧本", value: "剧本" },
    { label: "订制", value: "订制" },
  ];

  const sortOptions: { label: string; value: SortType }[] = [
    { label: "默认排序", value: "default" },
    { label: "价格从低到高", value: "price_asc" },
    { label: "价格从高到低", value: "price_desc" },
    { label: "时长从短到长", value: "duration_asc" },
    { label: "时长从长到短", value: "duration_desc" },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable 
        style={styles.backdrop} 
        onPress={onClose}
      />

      <View 
        style={[styles.container, { backgroundColor: colors.background }]}
        onStartShouldSetResponder={() => true}
      >
        {/* 顶部把手 */}
        <View className="items-center py-3">
          <View 
            className="w-10 h-1 rounded-full" 
            style={{ backgroundColor: colors.border }}
          />
        </View>

        <ScrollView 
          className="flex-1 px-4"
          showsVerticalScrollIndicator={false}
        >
          {/* 程度筛选 */}
          <View className="mb-6">
            <Text className="text-base font-semibold text-foreground mb-3">
              按程度筛选
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {levelOptions.map((option) => (
                <Pressable
                  key={option.value}
                  onPress={() => onLevelFilterChange(option.value)}
                  style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                >
                  <View
                    className={cn(
                      "px-4 py-2.5 rounded-xl border",
                      levelFilter === option.value
                        ? "bg-primary border-primary"
                        : "bg-surface border-border"
                    )}
                  >
                    <Text
                      className={cn(
                        "text-sm font-medium",
                        levelFilter === option.value ? "text-white" : "text-foreground"
                      )}
                    >
                      {option.label}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>

          {/* 排序方式 */}
          <View className="mb-6">
            <Text className="text-base font-semibold text-foreground mb-3">
              排序方式
            </Text>
            <View className="gap-2">
              {sortOptions.map((option) => (
                <Pressable
                  key={option.value}
                  onPress={() => onSortChange(option.value)}
                  style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                >
                  <View
                    className={cn(
                      "px-4 py-3 rounded-xl border flex-row items-center justify-between",
                      sortType === option.value
                        ? "bg-primary/10 border-primary"
                        : "bg-surface border-border"
                    )}
                  >
                    <Text
                      className={cn(
                        "text-sm font-medium",
                        sortType === option.value ? "text-primary" : "text-foreground"
                      )}
                    >
                      {option.label}
                    </Text>
                    {sortType === option.value && (
                      <Text className="text-primary text-lg">✓</Text>
                    )}
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        </ScrollView>

        {/* 底部按钮 */}
        <View className="px-4 pb-6 pt-4 border-t border-border">
          <Button
            onPress={onClose}
            fullWidth
            size="lg"
          >
            确定
          </Button>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: "80%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
});
