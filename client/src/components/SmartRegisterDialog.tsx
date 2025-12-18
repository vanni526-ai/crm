import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

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
    onOpenChange(false);
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
              <h3 className="font-medium mb-3">解析结果预览 ({parsedData.length} 条)</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {parsedData.map((item, index) => (
                  <div key={index} className="border-b pb-2 text-sm">
                    <div className="grid grid-cols-2 gap-2">
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
                      {item.notes && (
                        <div className="col-span-2"><span className="text-muted-foreground">备注:</span> {item.notes}</div>
                      )}
                    </div>
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
