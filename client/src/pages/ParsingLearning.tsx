import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Loader2, TrendingUp, AlertCircle, CheckCircle2, Play, Settings, Tag } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { formatDateTimeBJ } from "@/lib/timezone";

export default function ParsingLearning() {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);
  const [threshold, setThreshold] = useState(10);
  const [selectedCorrections, setSelectedCorrections] = useState<number[]>([]);
  const [isAnnotateDialogOpen, setIsAnnotateDialogOpen] = useState(false);
  const [annotationType, setAnnotationType] = useState<string>("typical_error");
  const [annotationNote, setAnnotationNote] = useState("");

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

  // 获取配置
  const { data: config } = trpc.parsingLearning.getConfig.useQuery(
    { configKey: "auto_optimize_threshold" }
  );

  // 当配置加载完成时更新threshold
  useEffect(() => {
    if (config && config.configValue) {
      setThreshold(config.configValue.threshold || 10);
    }
  }, [config]);

  // 批量标注
  const batchAnnotate = trpc.parsingLearning.batchAnnotate.useMutation({
    onSuccess: (result) => {
      toast.success(`已标注${result.count}条记录`);
      setSelectedCorrections([]);
      setIsAnnotateDialogOpen(false);
      setAnnotationType("typical_error");
      setAnnotationNote("");
      refetchCorrections();
    },
    onError: (error) => {
      toast.error(`标注失败:${error.message}`);
    },
  });

  // 设置配置
  const setConfig = trpc.parsingLearning.setConfig.useMutation({
    onSuccess: () => {
      toast.success("配置保存成功");
      setIsConfigDialogOpen(false);
    },
    onError: (error) => {
      toast.error(`配置保存失败:${error.message}`);
    },
  });

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

  const handleSaveConfig = () => {
    setConfig.mutate({
      configKey: "auto_optimize_threshold",
      configValue: { threshold },
      description: "自动优化触发阈值(未学习修正记录数量)",
    });
  };

  const handleBatchAnnotate = () => {
    batchAnnotate.mutate({
      correctionIds: selectedCorrections,
      annotationType: annotationType as any,
      annotationNote,
    });
  };

  const toggleCorrection = (id: number) => {
    setSelectedCorrections(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleAllCorrections = () => {
    if (selectedCorrections.length === unlearnedCorrections?.length) {
      setSelectedCorrections([]);
    } else {
      setSelectedCorrections(unlearnedCorrections?.map((c: any) => c.id) || []);
    }
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
                    {patternAnalysis.patterns.map((pattern: any, index: number) => (
                      <li key={index} className="flex items-start gap-2">
                        <Badge variant="outline" className="mt-0.5">模式{index + 1}</Badge>
                        <span className="text-sm">{typeof pattern === 'string' ? pattern : pattern.description}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {patternAnalysis.recommendations && patternAnalysis.recommendations.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">优化建议:</h3>
                  <ul className="space-y-2">
                    {patternAnalysis.recommendations.map((rec: any, index: number) => (
                      <li key={index} className="flex items-start gap-2">
                        <Badge variant="secondary" className="mt-0.5">建议{index + 1}</Badge>
                        <span className="text-sm">{typeof rec === 'string' ? rec : rec.description}</span>
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
            <div className="flex flex-col sm:flex-row gap-3">
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

              <Dialog open={isConfigDialogOpen} onOpenChange={setIsConfigDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full sm:w-auto">
                    <Settings className="mr-2 h-4 w-4" />
                    配置阈值
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>配置自动优化阈值</DialogTitle>
                    <DialogDescription>
                      设置触发自动优化的未学习修正记录数量阈值
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="threshold" className="text-right">
                        阈值
                      </Label>
                      <Input
                        id="threshold"
                        type="number"
                        value={threshold}
                        onChange={(e) => setThreshold(parseInt(e.target.value) || 10)}
                        className="col-span-3"
                        min={1}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      当未学习的修正记录达到此数量时,定时任务将自动触发优化。
                    </p>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsConfigDialogOpen(false)}>
                      取消
                    </Button>
                    <Button onClick={handleSaveConfig}>
                      保存
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

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
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>未学习的修正记录</CardTitle>
                <CardDescription>
                  用户在智能登记中修改的字段,等待系统学习
                </CardDescription>
              </div>
              {unlearnedCorrections && unlearnedCorrections.length > 0 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleAllCorrections}
                  >
                    {selectedCorrections.length === unlearnedCorrections.length ? "取消全选" : "全选"}
                  </Button>
                  <Dialog open={isAnnotateDialogOpen} onOpenChange={setIsAnnotateDialogOpen}>
                    <DialogTrigger asChild>
                      <Button
                        variant="default"
                        size="sm"
                        disabled={selectedCorrections.length === 0}
                      >
                        <Tag className="mr-2 h-4 w-4" />
                        批量标注({selectedCorrections.length})
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>批量标注修正记录</DialogTitle>
                        <DialogDescription>
                          为选中的{selectedCorrections.length}条修正记录添加标注,帮助系统更好地学习
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="annotationType" className="text-right">
                            标注类型
                          </Label>
                          <Select value={annotationType} onValueChange={setAnnotationType}>
                            <SelectTrigger className="col-span-3">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="typical_error">典型错误</SelectItem>
                              <SelectItem value="edge_case">边缘案例</SelectItem>
                              <SelectItem value="common_pattern">常见模式</SelectItem>
                              <SelectItem value="none">无标注</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid grid-cols-4 items-start gap-4">
                          <Label htmlFor="annotationNote" className="text-right pt-2">
                            备注
                          </Label>
                          <Textarea
                            id="annotationNote"
                            value={annotationNote}
                            onChange={(e) => setAnnotationNote(e.target.value)}
                            className="col-span-3"
                            placeholder="添加标注备注(可选)"
                            rows={3}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAnnotateDialogOpen(false)}>
                          取消
                        </Button>
                        <Button onClick={handleBatchAnnotate}>
                          确认标注
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {unlearnedCorrections && unlearnedCorrections.length > 0 ? (
              <div className="space-y-4">
                {unlearnedCorrections.map((correction: any) => (
                  <div key={correction.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center gap-2 mb-2">
                      <Checkbox
                        checked={selectedCorrections.includes(correction.id)}
                        onCheckedChange={() => toggleCorrection(correction.id)}
                      />
                      <span className="text-sm text-muted-foreground">选择此记录</span>
                    </div>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge>{correction.fieldName}</Badge>
                          <Badge variant="outline">{correction.correctionType}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          修正人: {correction.userName} · {correction.createdAt ? formatDateTimeBJ(correction.createdAt) : '未知时间'}
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
                          {history.createdAt ? formatDateTimeBJ(history.createdAt) : '未知时间'} · 基于{history.correctionCount}条修正记录
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
                        <div className="mt-1 space-y-2">
                          {JSON.parse(history.newExamples).map((example: any, index: number) => (
                            <div key={index} className="text-sm text-muted-foreground pl-4 border-l-2 border-primary/20">
                              {typeof example === 'string' ? (
                                <p>• {example}</p>
                              ) : (
                                <div className="space-y-1">
                                  <p className="font-medium text-foreground">示例 {index + 1}:</p>
                                  {example.text && <p><span className="font-semibold">文本:</span> {example.text}</p>}
                                  {example.explanation && <p><span className="font-semibold">说明:</span> {example.explanation}</p>}
                                  {example.highlights && <p><span className="font-semibold">重点:</span> {example.highlights}</p>}
                                </div>
                              )}
                            </div>
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
