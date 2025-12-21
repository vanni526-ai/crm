import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Edit, Trash2, Save, X, AlertCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { evaluateFieldCompleteness, getCompletenessColor, getCompletenessBgColor, getCompletenessLabel, getImportanceColor } from "@/lib/fieldCompleteness";

interface SmartRegisterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function SmartRegisterDialog({ open, onOpenChange, onSuccess }: SmartRegisterDialogProps) {
  const [rawText, setRawText] = useState("");
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingData, setEditingData] = useState<any>(null);

  const parseTransferNotes = trpc.orders.parseTransferNotes.useMutation({
    onSuccess: (data: any) => {
      setParsedData(data);
      toast.success(`解析成功，共识别 ${data.length} 条订单`);
      setIsParsing(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "解析失败");
      setIsParsing(false);
    },
  });

  const batchCreateOrders = trpc.orders.batchCreate.useMutation({
    onSuccess: () => {
      toast.success("订单创建成功");
      setIsCreating(false);
      onSuccess();
      handleClose();
    },
    onError: (error: any) => {
      toast.error(error.message || "创建订单失败");
      setIsCreating(false);
    },
  });

  const handleParse = () => {
    if (!rawText.trim()) {
      toast.error("请粘贴转账备注数据");
      return;
    }

    setIsParsing(true);
    parseTransferNotes.mutate({ text: rawText });
  };

  const handleCreate = () => {
    if (parsedData.length === 0) {
      toast.error("没有可创建的订单");
      return;
    }

    setIsCreating(true);
    batchCreateOrders.mutate({ template: "custom", orders: parsedData });
  };

  const handleClose = () => {
    setRawText("");
    setParsedData([]);
    setEditingIndex(null);
    setEditingData(null);
    onOpenChange(false);
  };

  const handleEdit = (index: number) => {
    setEditingIndex(index);
    setEditingData({ ...parsedData[index] });
  };

  const handleSaveEdit = () => {
    if (editingIndex !== null && editingData) {
      const newData = [...parsedData];
      newData[editingIndex] = editingData;
      setParsedData(newData);
      setEditingIndex(null);
      setEditingData(null);
      toast.success("修改已保存");
    }
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditingData(null);
  };

  const handleDelete = (index: number) => {
    const newData = parsedData.filter((_, i) => i !== index);
    setParsedData(newData);
    toast.success("已删除");
  };

  const updateEditingField = (field: string, value: string | boolean) => {
    setEditingData({ ...editingData, [field]: value });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>智能登记 - 转账备注解析</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">
              粘贴转账备注数据
            </label>
            <Textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="请粘贴转账备注,每行一条,格式: 销售名 日期 时间 课程 老师 客户 金额 备注 地点 教室"
              rows={8}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground mt-2">
              示例: 山竹 12.16 15:00-18:30 基础局+裸足丝袜 声声上 (北京大兴) 不爱吃汉堡 2500已付 2850未付 给声声报销400车费
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleParse}
              disabled={isParsing || !rawText.trim()}
            >
              {isParsing ? "解析中..." : "开始解析"}
            </Button>
            {parsedData.length > 0 && (
              <Button
                onClick={handleCreate}
                disabled={isCreating}
                variant="default"
              >
                {isCreating ? "创建中..." : `批量创建 ${parsedData.length} 条订单`}
              </Button>
            )}
          </div>

          {parsedData.length > 0 && (
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium">解析结果预览 ({parsedData.length} 条)</h3>
                <div className="text-sm text-muted-foreground">
                  平均完整度: {Math.round(parsedData.reduce((sum, item) => sum + evaluateFieldCompleteness(item).score, 0) / parsedData.length)}%
                </div>
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {parsedData.map((item, index) => (
                  <div key={index} className="border rounded-lg p-3 mb-3">
                    {editingIndex === index ? (
                      // 编辑模式
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs">销售</Label>
                            <Input
                              value={editingData.salesperson || ""}
                              onChange={(e) => updateEditingField("salesperson", e.target.value)}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">客户</Label>
                            <Input
                              value={editingData.customerName || ""}
                              onChange={(e) => updateEditingField("customerName", e.target.value)}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">课程</Label>
                            <Input
                              value={editingData.deliveryCourse || ""}
                              onChange={(e) => updateEditingField("deliveryCourse", e.target.value)}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">老师</Label>
                            <Input
                              value={editingData.deliveryTeacher || ""}
                              onChange={(e) => updateEditingField("deliveryTeacher", e.target.value)}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">日期</Label>
                            <Input
                              value={editingData.classDate || ""}
                              onChange={(e) => updateEditingField("classDate", e.target.value)}
                              className="h-8 text-sm"
                              placeholder="2024-12-25"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">时间</Label>
                            <Input
                              value={editingData.classTime || ""}
                              onChange={(e) => updateEditingField("classTime", e.target.value)}
                              className="h-8 text-sm"
                              placeholder="14:00-16:00"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">支付金额</Label>
                            <Input
                              value={editingData.paymentAmount || ""}
                              onChange={(e) => updateEditingField("paymentAmount", e.target.value)}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">课程金额</Label>
                            <Input
                              value={editingData.courseAmount || ""}
                              onChange={(e) => updateEditingField("courseAmount", e.target.value)}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">地点</Label>
                            <Input
                              value={editingData.deliveryCity || ""}
                              onChange={(e) => updateEditingField("deliveryCity", e.target.value)}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">教室</Label>
                            <Input
                              value={editingData.deliveryRoom || ""}
                              onChange={(e) => updateEditingField("deliveryRoom", e.target.value)}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">支付方式</Label>
                            <Input
                              value={editingData.paymentMethod || ""}
                              onChange={(e) => updateEditingField("paymentMethod", e.target.value)}
                              className="h-8 text-sm"
                              placeholder="微信/支付宝/富掌柜"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">渠道订单号</Label>
                            <Input
                              value={editingData.channelOrderNo || ""}
                              onChange={(e) => updateEditingField("channelOrderNo", e.target.value)}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">老师费用</Label>
                            <Input
                              value={editingData.teacherFee || ""}
                              onChange={(e) => updateEditingField("teacherFee", e.target.value)}
                              className="h-8 text-sm"
                              placeholder="只填数字"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">车费</Label>
                            <Input
                              value={editingData.transportFee || ""}
                              onChange={(e) => updateEditingField("transportFee", e.target.value)}
                              className="h-8 text-sm"
                              placeholder="只填数字"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">其他费用</Label>
                            <Input
                              value={editingData.otherFee || ""}
                              onChange={(e) => updateEditingField("otherFee", e.target.value)}
                              className="h-8 text-sm"
                              placeholder="只填数字"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">合伙人费</Label>
                            <Input
                              value={editingData.partnerFee || ""}
                              onChange={(e) => updateEditingField("partnerFee", e.target.value)}
                              className="h-8 text-sm"
                              placeholder="只填数字"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">流量来源</Label>
                            <Input
                              value={editingData.trafficSource || ""}
                              onChange={(e) => updateEditingField("trafficSource", e.target.value)}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">账户余额</Label>
                            <Input
                              value={editingData.accountBalance || ""}
                              onChange={(e) => updateEditingField("accountBalance", e.target.value)}
                              className="h-8 text-sm"
                              placeholder="只填数字"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">支付城市</Label>
                            <Input
                              value={editingData.paymentCity || ""}
                              onChange={(e) => updateEditingField("paymentCity", e.target.value)}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">支付日期</Label>
                            <Input
                              value={editingData.paymentDate || ""}
                              onChange={(e) => updateEditingField("paymentDate", e.target.value)}
                              className="h-8 text-sm"
                              placeholder="2024-12-25"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">支付时间</Label>
                            <Input
                              value={editingData.paymentTime || ""}
                              onChange={(e) => updateEditingField("paymentTime", e.target.value)}
                              className="h-8 text-sm"
                              placeholder="14:00:00"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">金串到账金额</Label>
                            <Input
                              value={editingData.jinchuanAmount || ""}
                              onChange={(e) => updateEditingField("jinchuanAmount", e.target.value)}
                              className="h-8 text-sm"
                              placeholder="只填数字"
                            />
                          </div>
                          <div className="col-span-2">
                            <Label className="text-xs">备注</Label>
                            <Input
                              value={editingData.notes || ""}
                              onChange={(e) => updateEditingField("notes", e.target.value)}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={editingData.isVoided || false}
                                onChange={(e) => updateEditingField("isVoided", e.target.checked)}
                                className="w-4 h-4 rounded border-gray-300"
                              />
                              <span className="text-sm text-red-600">标记为作废订单</span>
                            </label>
                          </div>
                        </div>
                        <div className="flex gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleCancelEdit}
                          >
                            <X className="w-4 h-4 mr-1" />
                            取消
                          </Button>
                          <Button
                            size="sm"
                            onClick={handleSaveEdit}
                          >
                            <Save className="w-4 h-4 mr-1" />
                            保存
                          </Button>
                        </div>
                      </div>
                    ) : (
                      // 预览模式
                      <div>
                        {(() => {
                          const completeness = evaluateFieldCompleteness(item);
                          return (
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${getCompletenessBgColor(completeness.level)} ${getCompletenessColor(completeness.level)}`}>
                                  完整度: {completeness.score}% ({getCompletenessLabel(completeness.level)})
                                </span>
                                {completeness.missingFields.length > 0 && (
                                  <span className="text-xs text-muted-foreground">
                                    缺失 {completeness.missingFields.length} 个字段
                                  </span>
                                )}
                              </div>
                              {item.isVoided && (
                                <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                                  已作废
                                </span>
                              )}
                            </div>
                          );
                        })()}
                        {(() => {
                          const completeness = evaluateFieldCompleteness(item);
                          return completeness.missingFields.length > 0 && (
                            <div className="mb-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-800">
                              <div className="flex items-start gap-2">
                                <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                                <div className="flex-1">
                                  <div className="text-xs font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                                    建议补充以下字段:
                                  </div>
                                  <div className="flex flex-wrap gap-1">
                                    {completeness.missingFields.map((field, idx) => (
                                      <span
                                        key={idx}
                                        className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs ${getImportanceColor(field.importance)}`}
                                      >
                                        {field.label}
                                        {field.importance === "high" && " *"}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                        {item.isVoided && false && (
                          <div className="mb-2">
                            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                              已作废
                            </span>
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-2 text-sm mb-2">
                          <div><span className="text-muted-foreground">销售:</span> {item.salesperson}</div>
                          <div><span className="text-muted-foreground">客户:</span> {item.customerName}</div>
                          <div><span className="text-muted-foreground">课程:</span> {item.deliveryCourse}</div>
                          <div><span className="text-muted-foreground">老师:</span> {item.deliveryTeacher}</div>
                          <div><span className="text-muted-foreground">日期:</span> {item.classDate}</div>
                          <div><span className="text-muted-foreground">时间:</span> {item.classTime}</div>
                          <div><span className="text-muted-foreground">金额:</span> ¥{item.paymentAmount}</div>
                          <div><span className="text-muted-foreground">地点:</span> {item.deliveryCity}</div>
                          {item.deliveryRoom && (
                            <div><span className="text-muted-foreground">教室:</span> {item.deliveryRoom}</div>
                          )}
                          <div><span className="text-muted-foreground">支付方式:</span> {item.paymentMethod || <span className="text-muted-foreground/50">未填写</span>}</div>
                          <div className="col-span-2"><span className="text-muted-foreground">渠道订单号:</span> {item.channelOrderNo || <span className="text-muted-foreground/50">未填写</span>}</div>
                          <div><span className="text-muted-foreground">老师费用:</span> {item.teacherFee ? `¥${item.teacherFee}` : <span className="text-muted-foreground/50">未填写</span>}</div>
                          <div><span className="text-muted-foreground">车费:</span> {item.transportFee ? `¥${item.transportFee}` : <span className="text-muted-foreground/50">未填写</span>}</div>
                          {item.otherFee && (
                            <div><span className="text-muted-foreground">其他费用:</span> ¥{item.otherFee}</div>
                          )}
                          {item.partnerFee && (
                            <div><span className="text-muted-foreground">合伙人费:</span> ¥{item.partnerFee}</div>
                          )}
                          <div><span className="text-muted-foreground">流量来源:</span> {item.trafficSource || <span className="text-muted-foreground/50">未填写</span>}</div>
                          {item.accountBalance && (
                            <div><span className="text-muted-foreground">账户余额:</span> ¥{item.accountBalance}</div>
                          )}
                          {item.paymentCity && (
                            <div><span className="text-muted-foreground">支付城市:</span> {item.paymentCity}</div>
                          )}
                          {item.paymentDate && (
                            <div><span className="text-muted-foreground">支付日期:</span> {item.paymentDate}</div>
                          )}
                          {item.paymentTime && (
                            <div><span className="text-muted-foreground">支付时间:</span> {item.paymentTime}</div>
                          )}
                          {item.courseAmount && (
                            <div><span className="text-muted-foreground">课程金额:</span> ¥{item.courseAmount}</div>
                          )}
                          {item.jinchuanAmount && (
                            <div><span className="text-muted-foreground">金串到账金额:</span> ¥{item.jinchuanAmount}</div>
                          )}
                          <div className="col-span-2"><span className="text-muted-foreground">备注:</span> {item.notes || <span className="text-muted-foreground/50">无</span>}</div>
                        </div>
                        <div className="flex gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(index)}
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            编辑
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(index)}
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            删除
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
