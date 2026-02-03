import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { ImageCropDialog } from "./ImageCropDialog";

const DEFAULT_AVATAR_URL = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663214896586/HXEdLrUBRLbZoGqS.png";

interface AvatarEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teacher: {
    id: number;
    name: string;
    avatarUrl?: string | null;
  } | null;
  onSuccess?: () => void;
}

export default function AvatarEditDialog({ open, onOpenChange, teacher, onSuccess }: AvatarEditDialogProps) {
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string>("");
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const utils = trpc.useUtils();

  const uploadAvatarMutation = trpc.upload.uploadAvatar.useMutation({
    onSuccess: (data) => {
      setAvatarPreview(data.url);
      toast.success("头像上传成功");
      setUploadingAvatar(false);
      setAvatarFile(null);
    },
    onError: (error) => {
      toast.error(`头像上传失败: ${error.message}`);
      setUploadingAvatar(false);
    },
  });

  const updateTeacherMutation = trpc.teachers.update.useMutation({
    onSuccess: () => {
      toast.success("头像更新成功");
      utils.teachers.list.invalidate();
      onSuccess?.();
      onOpenChange(false);
      // 重置状态
      setAvatarFile(null);
      setAvatarPreview("");
    },
    onError: (error) => {
      toast.error(`头像更新失败: ${error.message}`);
    },
  });

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 检查文件大小(2MB = 2 * 1024 * 1024 bytes)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("图片大小不能超过2MB");
      return;
    }

    // 检查文件类型
    if (!file.type.startsWith("image/")) {
      toast.error("请选择图片文件");
      return;
    }

    setAvatarFile(file);

    // 显示裁剪对话框
    const reader = new FileReader();
    reader.onload = () => {
      setImageToCrop(reader.result as string);
      setCropDialogOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = (croppedBlob: Blob) => {
    // 将Blob转换为File
    const croppedFile = new File([croppedBlob], avatarFile?.name || "avatar.png", {
      type: croppedBlob.type,
    });
    setAvatarFile(croppedFile);
    const reader = new FileReader();
    reader.onload = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(croppedFile);
    setCropDialogOpen(false);
  };

  const handleUploadAvatar = async (fileToUpload?: File) => {
    const file = fileToUpload || avatarFile;
    if (!file) {
      toast.error("请先选择图片");
      return;
    }

    setUploadingAvatar(true);

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      uploadAvatarMutation.mutate({
        base64Data: base64,
        fileName: file.name,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!teacher) return;

    // 如果有新选择的文件但还没上传,先上传到S3
    if (avatarFile && !avatarPreview) {
      toast.error("请先上传头像到服务器");
      return;
    }

    // 如果avatarPreview是base64数据,说明还没上传到S3
    if (avatarPreview && avatarPreview.startsWith('data:')) {
      toast.error("请先上传头像到服务器");
      return;
    }

    // avatarPreview应该是S3的URL
    if (!avatarPreview) {
      toast.error("请先选择并上传头像");
      return;
    }

    updateTeacherMutation.mutate({
      id: teacher.id,
      data: {
        avatarUrl: avatarPreview,
      },
    });
  };

  const currentAvatarUrl = avatarPreview || teacher?.avatarUrl || DEFAULT_AVATAR_URL;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>编辑老师头像</DialogTitle>
          </DialogHeader>
          
          <div className="flex flex-col items-center gap-6 py-4">
            {/* 头像预览 */}
            <Avatar className="h-40 w-40">
              <AvatarImage src={currentAvatarUrl} />
              <AvatarFallback className="text-4xl">{teacher?.name?.[0]}</AvatarFallback>
            </Avatar>

            {/* 老师信息 */}
            <div className="text-center">
              <p className="font-medium text-lg">{teacher?.name}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {avatarPreview ? "新头像(未保存)" : "当前头像"}
              </p>
            </div>

            {/* 操作按钮 */}
            <div className="flex flex-col gap-3 w-full">
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
              
              <Button
                type="button"
                variant="outline"
                onClick={() => avatarInputRef.current?.click()}
                className="w-full"
              >
                选择新头像
              </Button>

              {avatarFile && !avatarPreview && (
                <Button
                  type="button"
                  onClick={() => handleUploadAvatar()}
                  disabled={uploadingAvatar}
                  className="w-full"
                >
                  {uploadingAvatar ? "上传中..." : "上传到服务器"}
                </Button>
              )}

              <p className="text-sm text-muted-foreground text-center">
                支持 JPG、PNG 格式，大小不超过2MB
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button 
              type="button" 
              onClick={handleSave}
              disabled={!avatarPreview || updateTeacherMutation.isPending}
            >
              {updateTeacherMutation.isPending ? "保存中..." : "保存头像"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 图片裁剪对话框 */}
      <ImageCropDialog
        open={cropDialogOpen}
        onOpenChange={setCropDialogOpen}
        imageSrc={imageToCrop}
        onCropComplete={handleCropComplete}
      />
    </>
  );
}
