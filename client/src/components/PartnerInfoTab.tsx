import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Upload, Eye, RefreshCw } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface PartnerInfoTabProps {
  partnerId: number;
}

export default function PartnerInfoTab({ partnerId }: PartnerInfoTabProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadingSide, setUploadingSide] = useState<"front" | "back" | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  
  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);

  // 查询合伙人信息
  const { data: partner, refetch } = trpc.partnerManagement.getById.useQuery(
    { id: partnerId },
    { enabled: !!partnerId }
  );

  // 更新合伙人信息
  const updateMutation = trpc.partnerManagement.update.useMutation({
    onSuccess: () => {
      toast.success("保存成功");
      refetch();
    },
    onError: (error) => {
      toast.error(`保存失败: ${error.message}`);
    },
  });

  // 上传身份证并识别
  const uploadIDCardMutation = trpc.upload.uploadAndRecognizeIDCard.useMutation({
    onSuccess: (data, variables) => {
      setUploading(false);
      setUploadingSide(null);
      
      if ((data as any).ocr) {
        const ocrData = (data as any).ocr;
        // 正面识别成功，自动填充姓名和身份证号
        if (ocrData.success) {
          toast.success("身份证识别成功");
          // 自动保存识别结果
          updateMutation.mutate({
            id: partnerId,
            name: ocrData.name,
            idCardNumber: ocrData.idCardNumber,
            idCardFrontUrl: variables.side === "front" ? data.url : partner?.idCardFrontUrl || undefined,
            idCardBackUrl: variables.side === "back" ? data.url : partner?.idCardBackUrl || undefined,
          });
        } else {
          toast.warning(`识别失败: ${ocrData.error}，请手动填写`);
          // 只保存照片URL
          updateMutation.mutate({
            id: partnerId,
            idCardFrontUrl: variables.side === "front" ? data.url : undefined,
            idCardBackUrl: variables.side === "back" ? data.url : undefined,
          });
        }
      } else {
        // 反面，只保存照片URL
        toast.success("身份证反面上传成功");
        updateMutation.mutate({
          id: partnerId,
          idCardBackUrl: data.url,
        });
      }
    },
    onError: (error) => {
      setUploading(false);
      setUploadingSide(null);
      toast.error(`上传失败: ${error.message}`);
    },
  });

  // 处理身份证照片上传
  const handleIDCardUpload = async (e: React.ChangeEvent<HTMLInputElement>, side: "front" | "back") => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 检查文件类型
    if (!file.type.startsWith("image/")) {
      toast.error("只支持图片格式");
      return;
    }

    // 检查文件大小（限制2MB）
    if (file.size > 2 * 1024 * 1024) {
      toast.error("图片大小不能超过2MB");
      return;
    }

    setUploading(true);
    setUploadingSide(side);

    // 读取文件为base64
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64Data = e.target?.result as string;
      
      // 调用上传接口
      uploadIDCardMutation.mutate({
        base64Data,
        side,
      });
    };
    reader.readAsDataURL(file);
  };

  // 处理手机号修改
  const handlePhoneUpdate = (phone: string) => {
    updateMutation.mutate({
      id: partnerId,
      phone,
    });
  };

  // 处理收款账户信息修改
  const handleAccountUpdate = (field: 'accountName' | 'bankName' | 'accountNumber', value: string) => {
    updateMutation.mutate({
      id: partnerId,
      [field]: value,
    });
  };

  // 查看照片
  const handleViewImage = (url: string) => {
    setPreviewImage(url);
    setPreviewOpen(true);
  };

  if (!partner) {
    return <div className="text-center text-muted-foreground py-8">加载中...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">基本信息</h3>
      </div>

      <div className="grid gap-6">
        {/* 姓名 */}
        <div className="space-y-2">
          <Label>姓名</Label>
          <Input
            value={partner.name}
            disabled
            className="bg-muted"
          />
          <p className="text-xs text-muted-foreground">
            姓名由身份证识别自动填充，不可手动修改
          </p>
        </div>

        {/* 手机号 */}
        <div className="space-y-2">
          <Label>实名手机号</Label>
          <div className="flex gap-2">
            <Input
              value={partner.phone || ""}
              onChange={(e) => {
                // 只在失去焦点时保存
              }}
              onBlur={(e) => handlePhoneUpdate(e.target.value)}
              placeholder="请输入手机号"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            手机号用于登录前端App系统，可随时修改
          </p>
        </div>

        {/* 身份证号 */}
        <div className="space-y-2">
          <Label>身份证号码</Label>
          <Input
            value={partner.idCardNumber || ""}
            disabled
            className="bg-muted"
            placeholder="上传身份证正面后自动识别"
          />
          <p className="text-xs text-muted-foreground">
            身份证号由身份证识别自动填充，不可手动修改。如需修改，请重新上传身份证照片
          </p>
        </div>

        {/* 收款账户信息 */}
        <div className="border-t pt-6 mt-6">
          <h3 className="text-lg font-semibold mb-4">收款账户信息</h3>
          
          {/* 开户名 */}
          <div className="space-y-2 mb-4">
            <Label>开户名</Label>
            <Input
              value={partner.accountName || ""}
              onChange={(e) => {
                // 只在失去焦点时保存
              }}
              onBlur={(e) => handleAccountUpdate('accountName', e.target.value)}
              placeholder="请输入开户名"
            />
            <p className="text-xs text-muted-foreground">
              请填写银行账户的开户名称
            </p>
          </div>

          {/* 开户行 */}
          <div className="space-y-2 mb-4">
            <Label>开户行</Label>
            <Input
              value={partner.bankName || ""}
              onChange={(e) => {
                // 只在失去焦点时保存
              }}
              onBlur={(e) => handleAccountUpdate('bankName', e.target.value)}
              placeholder="请输入开户行全称"
            />
            <p className="text-xs text-muted-foreground">
              例如：招商银行股份有限公司苏州干将路支行
            </p>
          </div>

          {/* 账号 */}
          <div className="space-y-2 mb-4">
            <Label>银行账号</Label>
            <Input
              value={partner.accountNumber || ""}
              onChange={(e) => {
                // 只在失去焦点时保存
              }}
              onBlur={(e) => handleAccountUpdate('accountNumber', e.target.value)}
              placeholder="请输入银行账号"
            />
            <p className="text-xs text-muted-foreground">
              请填写用于接收分红的银行账号
            </p>
          </div>
        </div>

        {/* 身份证正面 */}
        <div className="space-y-2">
          <Label>身份证正面</Label>
          <Card className="p-4">
            {partner.idCardFrontUrl ? (
              <div className="space-y-2">
                <img
                  src={partner.idCardFrontUrl}
                  alt="身份证正面"
                  className="w-full max-w-md rounded-lg border"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleViewImage(partner.idCardFrontUrl!)}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    查看大图
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => frontInputRef.current?.click()}
                    disabled={uploading}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    {uploading && uploadingSide === "front" ? "上传中..." : "重新上传"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Button
                  variant="outline"
                  onClick={() => frontInputRef.current?.click()}
                  disabled={uploading}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {uploading && uploadingSide === "front" ? "上传中..." : "上传身份证正面"}
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  上传后将自动识别姓名和身份证号码
                </p>
              </div>
            )}
            <input
              ref={frontInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleIDCardUpload(e, "front")}
            />
          </Card>
        </div>

        {/* 身份证反面 */}
        <div className="space-y-2">
          <Label>身份证反面</Label>
          <Card className="p-4">
            {partner.idCardBackUrl ? (
              <div className="space-y-2">
                <img
                  src={partner.idCardBackUrl}
                  alt="身份证反面"
                  className="w-full max-w-md rounded-lg border"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleViewImage(partner.idCardBackUrl!)}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    查看大图
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => backInputRef.current?.click()}
                    disabled={uploading}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    {uploading && uploadingSide === "back" ? "上传中..." : "重新上传"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Button
                  variant="outline"
                  onClick={() => backInputRef.current?.click()}
                  disabled={uploading}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {uploading && uploadingSide === "back" ? "上传中..." : "上传身份证反面"}
                </Button>
              </div>
            )}
            <input
              ref={backInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleIDCardUpload(e, "back")}
            />
          </Card>
        </div>
      </div>

      {/* 图片预览对话框 */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>身份证照片</DialogTitle>
          </DialogHeader>
          {previewImage && (
            <img
              src={previewImage}
              alt="身份证"
              className="w-full rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
