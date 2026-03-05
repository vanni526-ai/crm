# 给 CRM 团队 Manus 沙盒的交接说明

> **目标**：指导 CRM 团队的 Manus 沙盒如何与 `vanni526-ai/crm` GitHub 仓库对齐代码，确保本次修复的架构约定（内部令牌、防护注释）被正确同步。

---

## 一、背景

前端 App 沙盒在排查重置密码、登录跳转等问题时，对 CRM 后端代码进行了若干修改。这些修改涉及**架构层面的约定**，必须同步到 CRM 团队的 GitHub 主仓库 `vanni526-ai/crm`，否则会在下次迭代时被覆盖，导致问题复现。

**所有修改的详细说明，请见附件《CRM 后端修改对齐文档 v2.md》。**

## 二、需要 CRM 团队做什么？

CRM 团队的 Manus 沙盒需要执行一次**从 GitHub `vanni526-ai/crm` 仓库拉取最新代码**的操作，以确保沙盒内的代码与主仓库完全一致。

## 三、操作步骤（在 CRM 团队的 Manus 沙盒中执行）

以下指令将指导你的 Manus 沙盒完成代码同步。

**第一步：克隆最新的 `vanni526-ai/crm` 仓库**

如果你的沙盒里已经有 `crm` 仓库，可以先删掉或重命名，确保从一个干净的状态开始。

```bash
# 确保在 /home/ubuntu 目录下
cd /home/ubuntu

# 如果已存在旧的 crm 仓库，先备份
mv crm crm_backup_$(date +%s)

# 克隆最新的代码
gh repo clone vanni526-ai/crm crm
```

**第二步：进入仓库目录，确认最新提交**

```bash
cd /home/ubuntu/crm
git log -1
```

你应该能看到最新的 commit 是关于"内部令牌"和"防护注释"的修改。这说明你的沙盒已经拿到了包含所有架构约定的最新代码。

**第三步：安装依赖并构建**

```bash
pnpm install
pnpm run build
```

**第四步：将 `.env` 文件与最新约定对齐**

确保你的 `.env` 文件中包含了 `INTERNAL_RESET_TOKEN` 环境变量。可以从主仓库的 `.env.example` 或对齐文档中复制。

```env
# .env 文件中必须包含
INTERNAL_RESET_TOKEN=INTERNAL_RESET_151566d87fb4b4d525e48cd0a05e5f4fa8161b971d6f78781b640b30af0c38a9
```

---

## 四、交接完成

完成以上步骤后，CRM 团队的 Manus 沙盒就与 `vanni526-ai/crm` 主仓库完全对齐了。今后的所有开发都将基于这个包含了新架构约定的版本，不会再发生代码覆盖问题。

*此文档由前端 App 沙盒自动生成。*
