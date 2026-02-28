/**
 * 阿里云 OSS 文件存储工具
 *
 * 迁移说明：
 * - 原 Manus Storage Proxy 已替换为阿里云 OSS Node.js SDK
 * - 需要配置以下环境变量：
 *   OSS_ACCESS_KEY_ID     - 阿里云 AccessKey ID
 *   OSS_ACCESS_KEY_SECRET - 阿里云 AccessKey Secret
 *   OSS_BUCKET            - OSS Bucket 名称
 *   OSS_REGION            - OSS 区域，如 oss-cn-hangzhou
 *   OSS_ENDPOINT          - （可选）自定义 Endpoint，不填则自动根据 region 生成
 *
 * 接口保持与原 Manus Storage 完全兼容：
 *   storagePut(relKey, data, contentType?) → { key, url }
 *   storageGet(relKey, expiresIn?)        → { key, url }
 */

import OSS from "ali-oss";

function getOSSClient(): OSS {
  const accessKeyId = process.env.OSS_ACCESS_KEY_ID;
  const accessKeySecret = process.env.OSS_ACCESS_KEY_SECRET;
  const bucket = process.env.OSS_BUCKET;
  const region = process.env.OSS_REGION;
  const endpoint = process.env.OSS_ENDPOINT;

  if (!accessKeyId || !accessKeySecret || !bucket || !region) {
    throw new Error(
      "阿里云 OSS 配置缺失：请设置 OSS_ACCESS_KEY_ID、OSS_ACCESS_KEY_SECRET、OSS_BUCKET、OSS_REGION 环境变量"
    );
  }

  const config: OSS.Options = {
    accessKeyId,
    accessKeySecret,
    bucket,
    region,
  };

  if (endpoint) {
    config.endpoint = endpoint;
  }

  return new OSS(config);
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

/**
 * 上传文件到 OSS
 * @param relKey  文件路径（相对路径，如 "avatars/user-123.png"）
 * @param data    文件内容（Buffer | Uint8Array | string）
 * @param contentType  MIME 类型，默认 "application/octet-stream"
 * @returns { key: string; url: string } 文件路径和公开访问 URL
 */
export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const client = getOSSClient();
  const key = normalizeKey(relKey);

  const buffer =
    typeof data === "string"
      ? Buffer.from(data, "utf-8")
      : Buffer.from(data as Uint8Array);

  const result = await client.put(key, buffer, {
    headers: {
      "Content-Type": contentType,
    },
  });

  // result.url 是公开访问 URL（Bucket 需设置为公读）
  const url = result.url;

  return { key, url };
}

/**
 * 获取 OSS 文件的访问 URL
 * @param relKey    文件路径（相对路径）
 * @param expiresIn 预签名 URL 有效期（秒），默认 3600 秒
 *                  如果 Bucket 为公读，返回公开 URL；否则返回预签名 URL
 * @returns { key: string; url: string }
 */
export async function storageGet(
  relKey: string,
  expiresIn = 3600
): Promise<{ key: string; url: string }> {
  const client = getOSSClient();
  const key = normalizeKey(relKey);

  // 生成预签名 URL（适用于私有 Bucket）
  // 如果 Bucket 为公读，可直接拼接 URL：
  // const url = `https://${bucket}.${region}.aliyuncs.com/${key}`;
  const url = client.signatureUrl(key, { expires: expiresIn });

  return { key, url };
}
