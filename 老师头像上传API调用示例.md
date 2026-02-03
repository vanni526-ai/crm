# 老师头像上传API调用示例

**版本**: 1.0  
**日期**: 2026-02-03  
**后端API地址**: `https://crm.bdsm.com.cn/api/trpc`

---

## 📋 功能说明

老师头像上传功能允许前端App上传老师的头像图片到S3存储,并将头像URL保存到数据库中。

---

## 🔌 API接口

### 1. 上传头像接口

**接口名称**: `upload.uploadAvatar`  
**请求方法**: POST  
**接口地址**: `https://crm.bdsm.com.cn/api/trpc/upload.uploadAvatar`  
**权限要求**: 需要登录(protectedProcedure)

#### 请求参数

```typescript
{
  base64Data: string;  // base64编码的图片数据(包含data:image/...前缀)
  fileName?: string;   // 原始文件名(可选)
}
```

#### 响应数据

```typescript
{
  success: boolean;  // 是否成功
  url: string;       // 图片的CDN URL
  key: string;       // S3存储的文件key
}
```

---

## 💻 前端调用示例

### React + tRPC 示例

```typescript
import { trpc } from "@/lib/trpc";
import { useState, useRef } from "react";
import { toast } from "sonner";

function TeacherAvatarUpload() {
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // 头像上传mutation
  const uploadAvatarMutation = trpc.upload.uploadAvatar.useMutation({
    onSuccess: (data) => {
      console.log("头像上传成功:", data.url);
      toast.success("头像上传成功");
      // 将URL保存到表单或状态中
      // setValue("avatarUrl", data.url);
    },
    onError: (error) => {
      toast.error(error.message || "头像上传失败");
      setUploadingAvatar(false);
    },
  });

  // 处理头像文件选择
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      toast.error("请选择图片文件");
      return;
    }

    // 验证文件大小(5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("图片大小不能超过5MB");
      return;
    }

    setAvatarFile(file);

    // 预览
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // 上传头像
  const handleUploadAvatar = async () => {
    if (!avatarFile) {
      toast.error("请选择头像文件");
      return;
    }

    setUploadingAvatar(true);

    // 读取文件为base64
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Data = reader.result as string;
      uploadAvatarMutation.mutate({
        base64Data,
        fileName: avatarFile.name,
      });
    };
    reader.readAsDataURL(avatarFile);
  };

  return (
    <div>
      <label>老师头像</label>
      <div className="flex items-center gap-4 mt-2">
        {avatarPreview && (
          <img 
            src={avatarPreview} 
            alt="头像预览" 
            className="w-20 h-20 rounded-full object-cover border-2"
          />
        )}
        <div>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => avatarInputRef.current?.click()}
          >
            选择图片
          </button>
          {avatarFile && (
            <button
              type="button"
              onClick={handleUploadAvatar}
              disabled={uploadingAvatar}
            >
              {uploadingAvatar ? "上传中..." : "上传"}
            </button>
          )}
          <p className="text-sm text-gray-500 mt-1">
            支持 JPG、PNG 格式，大小不超过5MB
          </p>
        </div>
      </div>
    </div>
  );
}
```

### 原生JavaScript + Fetch 示例

```javascript
// 1. 选择图片文件
const fileInput = document.getElementById('avatarInput');
const file = fileInput.files[0];

// 2. 验证文件
if (!file.type.startsWith('image/')) {
  alert("请选择图片文件");
  return;
}

if (file.size > 5 * 1024 * 1024) {
  alert("图片大小不能超过5MB");
  return;
}

// 3. 读取文件为base64
const reader = new FileReader();
reader.onloadend = async () => {
  const base64Data = reader.result; // 包含data:image/...前缀

  // 4. 调用上传接口
  try {
    const response = await fetch('https://crm.bdsm.com.cn/api/trpc/upload.uploadAvatar', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // 如果需要认证,添加token
        // 'Authorization': `Bearer ${token}`,
      },
      credentials: 'include', // 包含cookie
      body: JSON.stringify({
        json: {
          base64Data: base64Data,
          fileName: file.name,
        }
      }),
    });

    const result = await response.json();
    
    if (result.result?.data?.success) {
      const avatarUrl = result.result.data.url;
      console.log("头像上传成功:", avatarUrl);
      // 将URL保存到表单或发送到后端
    } else {
      console.error("上传失败:", result);
    }
  } catch (error) {
    console.error("上传错误:", error);
  }
};

reader.readAsDataURL(file);
```

---

## 🔗 相关接口

### 创建老师(包含头像)

**接口名称**: `teachers.create`  
**请求方法**: POST  
**接口地址**: `https://crm.bdsm.com.cn/api/trpc/teachers.create`

#### 请求参数

```typescript
{
  name: string;              // 姓名(必填)
  phone?: string;            // 电话号码
  city: string;              // 城市(必填,支持分号分隔多个城市)
  avatarUrl?: string;        // 头像URL(从upload.uploadAvatar获取)
  status?: string;           // 活跃状态
  customerType?: string;     // 受众客户类型
  notes?: string;            // 备注
  category?: string;         // 分类
  // ... 其他字段
}
```

#### 调用示例

```typescript
// 1. 先上传头像
const uploadResult = await uploadAvatarMutation.mutateAsync({
  base64Data: base64Data,
  fileName: file.name,
});

// 2. 创建老师,包含头像URL
const createResult = await createTeacherMutation.mutateAsync({
  name: "张老师",
  phone: "13800138000",
  city: "北京",
  avatarUrl: uploadResult.url, // 使用上传后的URL
  customerType: "温柔御姐",
  notes: "经验丰富",
});
```

### 更新老师头像

**接口名称**: `teachers.update`  
**请求方法**: POST  
**接口地址**: `https://crm.bdsm.com.cn/api/trpc/teachers.update`

#### 请求参数

```typescript
{
  id: number;                // 老师ID
  data: {
    avatarUrl?: string;      // 新的头像URL
    // ... 其他要更新的字段
  }
}
```

#### 调用示例

```typescript
// 1. 上传新头像
const uploadResult = await uploadAvatarMutation.mutateAsync({
  base64Data: base64Data,
  fileName: file.name,
});

// 2. 更新老师头像
const updateResult = await updateTeacherMutation.mutateAsync({
  id: teacherId,
  data: {
    avatarUrl: uploadResult.url,
  },
});
```

### 获取老师列表(包含头像)

**接口名称**: `teachers.list`  
**请求方法**: GET  
**接口地址**: `https://crm.bdsm.com.cn/api/trpc/teachers.list`

#### 响应数据

```typescript
[
  {
    id: number;
    name: string;
    phone: string;
    city: string;
    avatarUrl: string;        // 头像URL
    customerType: string;
    notes: string;
    isActive: boolean;
    // ... 其他字段
  },
  // ...
]
```

#### 调用示例

```typescript
// 获取老师列表
const { data: teachers } = trpc.teachers.list.useQuery();

// 显示老师头像
teachers?.map(teacher => (
  <div key={teacher.id}>
    <img 
      src={teacher.avatarUrl || '/default-avatar.png'} 
      alt={teacher.name}
      className="w-12 h-12 rounded-full"
    />
    <span>{teacher.name}</span>
  </div>
));
```

---

## 📝 注意事项

1. **文件大小限制**: 图片大小不能超过5MB
2. **文件格式**: 支持 JPG、PNG、JPEG、GIF 等常见图片格式
3. **认证要求**: 上传接口需要用户登录,请确保请求中包含有效的认证信息(cookie或token)
4. **CORS配置**: 后端已配置允许`*.manus.computer`和`*.manus.space`域名的跨域请求
5. **S3存储**: 上传的图片存储在S3,返回的URL是CDN地址,可以直接在前端使用
6. **默认头像**: 如果老师没有上传头像,建议在前端显示默认头像图片

---

## 🚀 完整流程示例

```typescript
// 完整的创建老师流程(包含头像上传)
async function createTeacherWithAvatar(formData: any, avatarFile: File | null) {
  try {
    let avatarUrl = "";

    // 1. 如果有头像文件,先上传
    if (avatarFile) {
      const reader = new FileReader();
      const base64Data = await new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(avatarFile);
      });

      const uploadResult = await uploadAvatarMutation.mutateAsync({
        base64Data,
        fileName: avatarFile.name,
      });

      avatarUrl = uploadResult.url;
    }

    // 2. 创建老师
    const createResult = await createTeacherMutation.mutateAsync({
      ...formData,
      avatarUrl: avatarUrl || undefined,
    });

    console.log("老师创建成功:", createResult);
    return createResult;
  } catch (error) {
    console.error("创建失败:", error);
    throw error;
  }
}
```

---

## 📞 技术支持

如有问题,请联系技术支持团队或查看完整的API文档。
