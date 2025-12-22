import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Plus, Trash2, Save, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface TrafficSourceAlias {
  pattern: string;
  standardName: string;
}

/**
 * 流量来源配置管理页面
 */
export default function TrafficSourceConfig() {
  const [aliases, setAliases] = useState<TrafficSourceAlias[]>([]);
  const [newPattern, setNewPattern] = useState("");
  const [newStandardName, setNewStandardName] = useState("");
  const [previewText, setPreviewText] = useState("");

  // 查询别名配置
  const { data: aliasConfig, isLoading, refetch } = trpc.trafficSourceConfig.getAliasConfig.useQuery();

  // 当数据加载完成后更新aliases
  useEffect(() => {
    if (aliasConfig) {
      setAliases(aliasConfig);
    }
  }, [aliasConfig]);

  // 更新别名配置
  const updateMutation = trpc.trafficSourceConfig.updateAliasConfig.useMutation({
    onSuccess: () => {
      toast.success("配置保存成功");
      refetch();
    },
    onError: (error) => {
      toast.error(`保存失败: ${error.message}`);
    },
  });

  const handleAddAlias = () => {
    if (!newPattern.trim() || !newStandardName.trim()) {
      toast.error("请填写别名模式和标准名称");
      return;
    }

    setAliases([...aliases, { pattern: newPattern.trim(), standardName: newStandardName.trim() }]);
    setNewPattern("");
    setNewStandardName("");
  };

  const handleRemoveAlias = (index: number) => {
    setAliases(aliases.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    updateMutation.mutate({ aliases });
  };

  // 实时预览标准化效果
  const previewStandardized = () => {
    if (!previewText.trim()) return previewText;

    let result = previewText.trim();
    for (const alias of aliases) {
      const regex = new RegExp(alias.pattern, 'gi');
      if (regex.test(result)) {
        result = alias.standardName;
        break;
      }
    }
    return result;
  };

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">流量来源配置管理</h1>
        <p className="text-muted-foreground mt-2">
          配置流量来源的别名映射规则,实现数据标准化
        </p>
      </div>

      {/* 添加新别名 */}
      <Card>
        <CardHeader>
          <CardTitle>添加别名规则</CardTitle>
          <CardDescription>
            定义别名模式和对应的标准名称
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label>别名模式</Label>
              <Input
                value={newPattern}
                onChange={(e) => setNewPattern(e.target.value)}
                placeholder="例如: 瀛姬.*"
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                支持正则表达式
              </p>
            </div>
            <div>
              <Label>标准名称</Label>
              <Input
                value={newStandardName}
                onChange={(e) => setNewStandardName(e.target.value)}
                placeholder="例如: 瀛姬体验馆"
                className="mt-1"
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleAddAlias} className="w-full">
                <Plus className="mr-2 h-4 w-4" />
                添加规则
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 别名列表 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>当前别名规则</CardTitle>
              <CardDescription>
                共 {aliases.length} 条规则
              </CardDescription>
            </div>
            <Button
              onClick={handleSave}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  保存中...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  保存配置
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {aliases.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                暂无别名规则。添加规则后,系统会自动将匹配的流量来源标准化。
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-2">
              {aliases.map((alias, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1 grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm text-muted-foreground">模式:</span>
                      <code className="ml-2 px-2 py-1 bg-muted rounded text-sm">
                        {alias.pattern}
                      </code>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">标准名称:</span>
                      <Badge variant="outline" className="ml-2">
                        {alias.standardName}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveAlias(index)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 实时预览 */}
      <Card>
        <CardHeader>
          <CardTitle>实时预览</CardTitle>
          <CardDescription>
            输入流量来源名称,查看标准化后的效果
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label>原始名称</Label>
              <Input
                value={previewText}
                onChange={(e) => setPreviewText(e.target.value)}
                placeholder="例如: 瀛姬沐沐（11-20点 周天周一休息）"
                className="mt-1"
              />
            </div>
            <div>
              <Label>标准化后</Label>
              <div className="mt-1 p-3 border rounded-lg bg-muted">
                {previewText.trim() ? (
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-base">
                      {previewStandardized()}
                    </Badge>
                    {previewStandardized() !== previewText.trim() && (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    )}
                  </div>
                ) : (
                  <span className="text-muted-foreground">请输入原始名称</span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 使用说明 */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <div className="space-y-2">
            <p className="font-medium">使用说明:</p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>别名模式支持正则表达式,例如 "瀛姬.*" 可以匹配所有以"瀛姬"开头的名称</li>
              <li>匹配规则按顺序执行,找到第一个匹配的规则后停止</li>
              <li>配置保存后,会自动应用到Gmail导入和智能登记流程</li>
              <li>建议定期检查流量来源数据,及时添加新的别名规则</li>
            </ul>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}
