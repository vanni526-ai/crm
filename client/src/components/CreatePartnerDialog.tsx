import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface CreatePartnerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function CreatePartnerDialog({ open, onOpenChange, onSuccess }: CreatePartnerDialogProps) {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    cityId: "", // 选中的城市ID
  });

  // 获取城市列表
  const { data: cities, isLoading: citiesLoading } = trpc.city.getAll.useQuery();

  const utils = trpc.useUtils();

  const createMutation = trpc.partnerManagement.create.useMutation({
    onSuccess: (data) => {
      toast.success(`合伙人创建成功！已自动创建登录账号（默认密码：123456）`);
      utils.partnerManagement.list.invalidate();
      onSuccess();
      onOpenChange(false);
      // 重置表单
      setFormData({
        name: "",
        phone: "",
        cityId: "",
      });
    },
    onError: (error) => {
      toast.error(`创建失败: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // 验证必填字段
    if (!formData.name.trim()) {
      toast.error("请输入合伙人姓名");
      return;
    }

    if (!formData.phone.trim()) {
      toast.error("请输入手机号");
      return;
    }

    // 验证手机号格式
    if (!/^1[3-9]\d{9}$/.test(formData.phone)) {
      toast.error("请输入正确的手机号格式");
      return;
    }

    // 验证城市选择
    if (!formData.cityId) {
      toast.error("请选择城市");
      return;
    }

    createMutation.mutate({
      name: formData.name,
      phone: formData.phone,
      cityIds: [parseInt(formData.cityId)], // 将城市ID转换为数组
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>新增合伙人</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              姓名 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="请输入合伙人姓名"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">
              手机号 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="请输入手机号（用于登录）"
            />
            <p className="text-xs text-muted-foreground">
              手机号将用于登录前端App系统，默认密码为123456
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cityId">
              城市 <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.cityId}
              onValueChange={(value) => setFormData({ ...formData, cityId: value })}
              disabled={citiesLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="请选择城市" />
              </SelectTrigger>
              <SelectContent>
                {cities?.map((city) => (
                  <SelectItem key={city.id} value={city.id.toString()}>
                    {city.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              选择合伙人负责管理的城市
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createMutation.isPending}
            >
              取消
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "创建中..." : "创建合伙人"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
