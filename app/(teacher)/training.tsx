import { ScrollView, Text, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";

/**
 * 培训中心页面
 * 
 * 提供教学培训和学习资料
 */
export default function TrainingScreen() {
  return (
    <ScreenContainer className="p-6">
      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="gap-6">
          {/* 页面标题 */}
          <View>
            <Text className="text-2xl font-bold text-foreground">培训中心</Text>
            <Text className="text-sm text-muted mt-2">提升教学技能，学习专业知识</Text>
          </View>

          {/* 培训课程列表 */}
          <View className="gap-4">
            <Text className="text-lg font-semibold text-foreground">培训课程</Text>
            
            {/* 课程卡片示例 */}
            <View className="bg-surface rounded-xl p-4 border border-border">
              <Text className="text-base font-semibold text-foreground mb-2">
                教学方法培训
              </Text>
              <Text className="text-sm text-muted mb-3">
                学习有效的教学方法和技巧，提升课堂教学质量
              </Text>
              <View className="flex-row justify-between items-center">
                <Text className="text-xs text-muted">时长: 2小时</Text>
                <Text className="text-sm text-primary font-medium">开始学习</Text>
              </View>
            </View>

            <View className="bg-surface rounded-xl p-4 border border-border">
              <Text className="text-base font-semibold text-foreground mb-2">
                课程设计与规划
              </Text>
              <Text className="text-sm text-muted mb-3">
                掌握课程设计的核心要素，制定有效的教学计划
              </Text>
              <View className="flex-row justify-between items-center">
                <Text className="text-xs text-muted">时长: 1.5小时</Text>
                <Text className="text-sm text-primary font-medium">开始学习</Text>
              </View>
            </View>

            <View className="bg-surface rounded-xl p-4 border border-border">
              <Text className="text-base font-semibold text-foreground mb-2">
                学员管理技巧
              </Text>
              <Text className="text-sm text-muted mb-3">
                学习如何有效管理课堂，提升学员参与度和满意度
              </Text>
              <View className="flex-row justify-between items-center">
                <Text className="text-xs text-muted">时长: 1小时</Text>
                <Text className="text-sm text-primary font-medium">开始学习</Text>
              </View>
            </View>
          </View>

          {/* 学习资料 */}
          <View className="gap-4">
            <Text className="text-lg font-semibold text-foreground">学习资料</Text>
            
            <View className="bg-surface rounded-xl p-4 border border-border">
              <Text className="text-base font-semibold text-foreground mb-2">
                📚 教学手册
              </Text>
              <Text className="text-sm text-muted">
                查看完整的教学指南和最佳实践
              </Text>
            </View>

            <View className="bg-surface rounded-xl p-4 border border-border">
              <Text className="text-base font-semibold text-foreground mb-2">
                📝 课程模板
              </Text>
              <Text className="text-sm text-muted">
                下载标准化的课程设计模板
              </Text>
            </View>

            <View className="bg-surface rounded-xl p-4 border border-border">
              <Text className="text-base font-semibold text-foreground mb-2">
                🎥 教学视频
              </Text>
              <Text className="text-sm text-muted">
                观看优秀教师的示范课程
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
