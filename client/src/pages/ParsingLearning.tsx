import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Loader2, TrendingUp, AlertCircle, CheckCircle2, Play } from "lucide-react";
import { toast } from "sonner";

export default function ParsingLearning() {
  const [isOptimizing, setIsOptimizing] = useState(false);

  // 获取修正统计
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = trpc.parsingLearning.getCorrectionStats.useQuery();

  // 获取未学习的修正记录
  const { data: unlearnedCorrections, isLoading: correctionsLoading, refetch: refetchCorrections} = 
    trpc.parsingLearning.getUnlearnedCorrections.useQuery({ limit: 100 });

  // 获取优化历史
  const { data: optimizationHistory, isLoading: historyLoading, refetch: refetchHistory } = 
    trpc.parsingLearning.getOptimizationHistory.useQuery({ limit: 20 });

  // 分析修正模式
  const { data: patternAnalysis, isLoading: analysisLoading, refetch: refetchAnalysis } = 
    trpc.parsingLearning.analyzePatterns.useQuery();

  // 触发自动优化
  const triggerOptimization = trpc.parsingLearning.triggerAutoOptimization.useMutation({
    onSuccess: (result) => {
      toast.success(`优化完成:已生成${result.newExamples.length}个新示例,优化了${result.correctionCount}条修正记录`);
      refetchStats();
      refetchCorrections();
      refetchHistory();
      refetchAnalysis();
      setIsOptimizing(false);
    },
    onError: (error) => {
      toast.error(`优化失败:${error.message}`);
      setIsOptimizing(false);
    },
  });

  const handleTriggerOptimization = () => {
    setIsOptimizing(true);
    triggerOptimization.mutate({ minCorrections: 1 }); // 最少1条就可以触发优化
  };

  if (statsLoading || correctionsLoading || historyLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  const learningRate = stats && stats.total > 0 
    ? ((stats.total - stats.unlearned) / stats.total * 100).toFixed(1)
    : "0.0";

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">解析规则学习</h1>
          <p className="text-muted-foreground mt-2">
            系统自动收集用户修正数据,分析错误模式,持续优化LLM解析准确率
          </p>
        </div>

        {/* 统计卡片 */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">总修正数</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.total || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                累计收集的修正记录
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">未学习数</CardTitle>
              <AlertCircle className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats?.unlearned || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                等待分析和学习
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">学习成功率</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{learningRate}%</div>
              <p className="text-xs text-muted-foreground mt-1">
                已学习的修正比例
              </p>
            </CardContent>
          </Card>
        </div>

        {/* 错误模式分析 */}
        {!analysisLoading && patternAnalysis && patternAnalysis.corrections > 0 && (
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>错误模式分析</CardTitle>
              <CardDescription>
                基于{patternAnalysis.corrections}条未学习的修正记录分析
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {patternAnalysis.patterns && patternAnalysis.patterns.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">识别到的错误模式:</h3>
                  <ul className="space-y-2">
                    {patternAnalysis.patterns.map((pattern: string, index: number) => (
                      <li key={index} className="flex items-start gap-2">
                        <Badge variant="outline" className="mt-0.5">模式{index + 1}</Badge>
                        <span className="text-sm">{pattern}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {patternAnalysis.recommendations && patternAnalysis.recommendations.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">优化建议:</h3>
                  <ul className="space-y-2">
                    {patternAnalysis.recommendations.map((rec: string, index: number) => (
                      <li key={index} className="flex items-start gap-2">
                        <Badge variant="secondary" className="mt-0.5">建议{index + 1}</Badge>
                        <span className="text-sm">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 触发自动优化按钮 */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>自动优化</CardTitle>
            <CardDescription>
              分析未学习的修正记录,自动生成新的prompt示例来改进解析准确率
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleTriggerOptimization}
              disabled={isOptimizing || !stats || stats.unlearned === 0}
              className="w-full sm:w-auto"
            >
              {isOptimizing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  正在优化...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  触发自动优化
                </>
              )}
            </Button>
            {stats && stats.unlearned === 0 && (
              <p className="text-sm text-muted-foreground mt-2">
                暂无未学习的修正记录,无需优化
              </p>
            )}
          </CardContent>
        </Card>

        {/* 未学习的修正记录列表 */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>未学习的修正记录</CardTitle>
            <CardDescription>
              用户在智能登记中修改的字段,等待系统学习
            </CardDescription>
          </CardHeader>
          <CardContent>
            {unlearnedCorrections && unlearnedCorrections.length > 0 ? (
              <div className="space-y-4">
                {unlearnedCorrections.map((correction: any) => (
                  <div key={correction.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge>{correction.fieldName}</Badge>
                          <Badge variant="outline">{correction.correctionType}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          修正人: {correction.userName} · {new Date(correction.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="font-semibold text-red-600">LLM解析值:</p>
                        <p className="mt-1">{correction.llmValue || "(空)"}</p>
                      </div>
                      <div>
                        <p className="font-semibold text-green-600">用户修正值:</p>
                        <p className="mt-1">{correction.correctedValue}</p>
                      </div>
                    </div>
                    <div>
                      <p className="font-semibold text-sm">原始文本:</p>
                      <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                        {correction.originalText}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                暂无未学习的修正记录
              </p>
            )}
          </CardContent>
        </Card>

        {/* 优化历史记录 */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>优化历史</CardTitle>
            <CardDescription>
              系统自动优化的历史记录
            </CardDescription>
          </CardHeader>
          <CardContent>
            {optimizationHistory && optimizationHistory.length > 0 ? (
              <div className="space-y-4">
                {optimizationHistory.map((history: any) => (
                  <div key={history.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{history.version}</Badge>
                          <Badge>{history.optimizationType}</Badge>
                          {history.isActive && <Badge variant="default">当前版本</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {new Date(history.createdAt).toLocaleString()} · 基于{history.correctionCount}条修正记录
                        </p>
                      </div>
                    </div>
                    <div>
                      <p className="font-semibold text-sm">优化说明:</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {history.changeDescription}
                      </p>
                    </div>
                    {history.newExamples && (
                      <div>
                        <p className="font-semibold text-sm">新增示例:</p>
                        <div className="mt-1 space-y-1">
                          {JSON.parse(history.newExamples).map((example: string, index: number) => (
                            <p key={index} className="text-sm text-muted-foreground pl-4">
                              • {example}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                暂无优化历史记录
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
