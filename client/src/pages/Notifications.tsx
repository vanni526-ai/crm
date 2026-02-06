import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Bell, Eye, MessageSquareReply, Archive, Trash2, CheckCheck, Search, RefreshCw, ChevronLeft, ChevronRight, Inbox } from "lucide-react";
import { useState, useMemo } from "react";

const TYPE_MAP: Record<string, { label: string; color: string }> = {
  general: { label: "一般留言", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
  complaint: { label: "投诉", color: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" },
  suggestion: { label: "建议", color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" },
  consultation: { label: "咨询", color: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" },
  application: { label: "申请", color: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300" },
};

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  unread: { label: "未读", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300" },
  read: { label: "已读", color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" },
  replied: { label: "已回复", color: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" },
  archived: { label: "已归档", color: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400" },
};

export default function Notifications() {
  const utils = trpc.useUtils();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selectedNotification, setSelectedNotification] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isReplyOpen, setIsReplyOpen] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const pageSize = 20;

  const { data, isLoading, refetch } = trpc.notifications.list.useQuery({
    status: statusFilter !== "all" ? statusFilter as any : undefined,
    type: typeFilter !== "all" ? typeFilter as any : undefined,
    page,
    pageSize,
  });

  const { data: unreadData } = trpc.notifications.unreadCount.useQuery();

  const markReadMutation = trpc.notifications.markRead.useMutation({
    onSuccess: () => {
      toast.success("已标记为已读");
      utils.notifications.list.invalidate();
      utils.notifications.unreadCount.invalidate();
    },
    onError: (err) => toast.error(err.message || "操作失败"),
  });

  const batchMarkReadMutation = trpc.notifications.batchMarkRead.useMutation({
    onSuccess: (data) => {
      toast.success(`已批量标记 ${data.count} 条为已读`);
      setSelectedIds([]);
      utils.notifications.list.invalidate();
      utils.notifications.unreadCount.invalidate();
    },
    onError: (err) => toast.error(err.message || "操作失败"),
  });

  const replyMutation = trpc.notifications.reply.useMutation({
    onSuccess: () => {
      toast.success("回复成功");
      setIsReplyOpen(false);
      setReplyContent("");
      utils.notifications.list.invalidate();
      utils.notifications.unreadCount.invalidate();
    },
    onError: (err) => toast.error(err.message || "回复失败"),
  });

  const archiveMutation = trpc.notifications.archive.useMutation({
    onSuccess: () => {
      toast.success("已归档");
      setIsDetailOpen(false);
      utils.notifications.list.invalidate();
      utils.notifications.unreadCount.invalidate();
    },
    onError: (err) => toast.error(err.message || "归档失败"),
  });

  const deleteMutation = trpc.notifications.delete.useMutation({
    onSuccess: () => {
      toast.success("已删除");
      setIsDetailOpen(false);
      utils.notifications.list.invalidate();
      utils.notifications.unreadCount.invalidate();
    },
    onError: (err) => toast.error(err.message || "删除失败"),
  });

  const notifications = data?.items || [];
  const totalCount = data?.total || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  const handleViewDetail = (notification: any) => {
    setSelectedNotification(notification);
    setIsDetailOpen(true);
    // 如果是未读状态，自动标记为已读
    if (notification.status === "unread") {
      markReadMutation.mutate({ id: notification.id });
    }
  };

  const handleReply = (notification: any) => {
    setSelectedNotification(notification);
    setReplyContent(notification.adminReply || "");
    setIsReplyOpen(true);
  };

  const handleSubmitReply = () => {
    if (!replyContent.trim()) {
      toast.error("请输入回复内容");
      return;
    }
    replyMutation.mutate({
      id: selectedNotification.id,
      adminReply: replyContent.trim(),
    });
  };

  const handleBatchMarkRead = () => {
    if (selectedIds.length === 0) {
      toast.error("请先选择要标记的通知");
      return;
    }
    batchMarkReadMutation.mutate({ ids: selectedIds });
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === notifications.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(notifications.map((n: any) => n.id));
    }
  };

  const formatDate = (date: string | Date | null) => {
    if (!date) return "-";
    const d = new Date(date);
    return d.toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Bell className="h-8 w-8" />
              申请通知
            </h1>
            <p className="text-muted-foreground mt-1">
              查看和管理来自前端App用户的留言和申请通知
            </p>
          </div>
          {unreadData && unreadData.count > 0 && (
            <Badge variant="destructive" className="text-lg px-4 py-2">
              {unreadData.count} 条未读
            </Badge>
          )}
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="backdrop-blur-sm bg-white/80 dark:bg-gray-900/80 border-white/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">全部通知</p>
                  <p className="text-2xl font-bold">{totalCount}</p>
                </div>
                <Inbox className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card className="backdrop-blur-sm bg-yellow-50/80 dark:bg-yellow-900/20 border-yellow-200/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">未读</p>
                  <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">{unreadData?.count || 0}</p>
                </div>
                <Bell className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="backdrop-blur-sm bg-green-50/80 dark:bg-green-900/20 border-green-200/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-700 dark:text-green-300">已回复</p>
                  <p className="text-2xl font-bold text-green-700 dark:text-green-300">-</p>
                </div>
                <MessageSquareReply className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="backdrop-blur-sm bg-gray-50/80 dark:bg-gray-800/80 border-gray-200/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">已归档</p>
                  <p className="text-2xl font-bold">-</p>
                </div>
                <Archive className="h-8 w-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 筛选和操作栏 */}
        <Card className="backdrop-blur-sm bg-white/80 dark:bg-gray-900/80 border-white/20">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-3">
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="状态筛选" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="unread">未读</SelectItem>
                  <SelectItem value="read">已读</SelectItem>
                  <SelectItem value="replied">已回复</SelectItem>
                  <SelectItem value="archived">已归档</SelectItem>
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1); }}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="类型筛选" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部类型</SelectItem>
                  <SelectItem value="general">一般留言</SelectItem>
                  <SelectItem value="complaint">投诉</SelectItem>
                  <SelectItem value="suggestion">建议</SelectItem>
                  <SelectItem value="consultation">咨询</SelectItem>
                  <SelectItem value="application">申请</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex-1" />

              {selectedIds.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBatchMarkRead}
                  disabled={batchMarkReadMutation.isPending}
                >
                  <CheckCheck className="h-4 w-4 mr-1" />
                  批量标记已读 ({selectedIds.length})
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? "animate-spin" : ""}`} />
                刷新
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 通知列表 */}
        <Card className="backdrop-blur-sm bg-white/80 dark:bg-gray-900/80 border-white/20">
          <CardHeader>
            <CardTitle>通知列表</CardTitle>
            <CardDescription>
              共 {totalCount} 条通知{statusFilter !== "all" ? `（${STATUS_MAP[statusFilter]?.label || statusFilter}）` : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">加载中...</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Inbox className="h-12 w-12 mb-4" />
                <p className="text-lg">暂无通知</p>
                <p className="text-sm mt-1">当App用户提交留言后，将在此处显示</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[40px]">
                          <input
                            type="checkbox"
                            checked={selectedIds.length === notifications.length && notifications.length > 0}
                            onChange={toggleSelectAll}
                            className="rounded border-gray-300"
                          />
                        </TableHead>
                        <TableHead className="w-[60px]">ID</TableHead>
                        <TableHead className="w-[100px]">用户</TableHead>
                        <TableHead className="w-[100px]">手机号</TableHead>
                        <TableHead className="w-[80px]">类型</TableHead>
                        <TableHead className="w-[150px]">标题</TableHead>
                        <TableHead className="min-w-[200px]">内容摘要</TableHead>
                        <TableHead className="w-[80px]">状态</TableHead>
                        <TableHead className="w-[150px]">提交时间</TableHead>
                        <TableHead className="w-[120px]">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {notifications.map((n: any) => (
                        <TableRow
                          key={n.id}
                          className={`cursor-pointer hover:bg-accent/50 ${n.status === "unread" ? "bg-yellow-50/50 dark:bg-yellow-900/10 font-medium" : ""}`}
                          onClick={() => handleViewDetail(n)}
                        >
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(n.id)}
                              onChange={() => toggleSelect(n.id)}
                              className="rounded border-gray-300"
                            />
                          </TableCell>
                          <TableCell className="font-mono text-xs">{n.id}</TableCell>
                          <TableCell>{n.userName || `用户${n.userId}`}</TableCell>
                          <TableCell className="font-mono text-xs">{n.userPhone || "-"}</TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_MAP[n.type]?.color || "bg-gray-100 text-gray-700"}`}>
                              {TYPE_MAP[n.type]?.label || n.type}
                            </span>
                          </TableCell>
                          <TableCell className="max-w-[150px] truncate">{n.title || "-"}</TableCell>
                          <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                            {n.content?.substring(0, 60)}{n.content?.length > 60 ? "..." : ""}
                          </TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_MAP[n.status]?.color || "bg-gray-100 text-gray-700"}`}>
                              {STATUS_MAP[n.status]?.label || n.status}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {formatDate(n.createdAt)}
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                title="查看详情"
                                onClick={() => handleViewDetail(n)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                title="回复"
                                onClick={() => handleReply(n)}
                              >
                                <MessageSquareReply className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                title="归档"
                                onClick={() => archiveMutation.mutate({ id: n.id })}
                              >
                                <Archive className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* 分页 */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      第 {page} 页，共 {totalPages} 页（{totalCount} 条记录）
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page <= 1}
                        onClick={() => setPage((p) => p - 1)}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        上一页
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page >= totalPages}
                        onClick={() => setPage((p) => p + 1)}
                      >
                        下一页
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* 详情弹窗 */}
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                通知详情 #{selectedNotification?.id}
              </DialogTitle>
              <DialogDescription>
                提交时间：{formatDate(selectedNotification?.createdAt)}
              </DialogDescription>
            </DialogHeader>
            {selectedNotification && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">用户</p>
                    <p className="font-medium">{selectedNotification.userName || `用户${selectedNotification.userId}`}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">手机号</p>
                    <p className="font-medium">{selectedNotification.userPhone || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">类型</p>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_MAP[selectedNotification.type]?.color || ""}`}>
                      {TYPE_MAP[selectedNotification.type]?.label || selectedNotification.type}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">状态</p>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_MAP[selectedNotification.status]?.color || ""}`}>
                      {STATUS_MAP[selectedNotification.status]?.label || selectedNotification.status}
                    </span>
                  </div>
                </div>

                {selectedNotification.title && (
                  <div>
                    <p className="text-sm text-muted-foreground">标题</p>
                    <p className="font-medium">{selectedNotification.title}</p>
                  </div>
                )}

                <div>
                  <p className="text-sm text-muted-foreground mb-1">留言内容</p>
                  <div className="p-4 bg-muted/50 rounded-lg whitespace-pre-wrap text-sm">
                    {selectedNotification.content}
                  </div>
                </div>

                {selectedNotification.adminReply && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">管理员回复</p>
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg whitespace-pre-wrap text-sm border border-green-200 dark:border-green-800">
                      {selectedNotification.adminReply}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      回复时间：{formatDate(selectedNotification.repliedAt)}
                    </p>
                  </div>
                )}

                <DialogFooter className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => handleReply(selectedNotification)}
                  >
                    <MessageSquareReply className="h-4 w-4 mr-1" />
                    {selectedNotification.adminReply ? "修改回复" : "回复"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => archiveMutation.mutate({ id: selectedNotification.id })}
                    disabled={archiveMutation.isPending}
                  >
                    <Archive className="h-4 w-4 mr-1" />
                    归档
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      if (confirm("确定要删除这条通知吗？")) {
                        deleteMutation.mutate({ id: selectedNotification.id });
                      }
                    }}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    删除
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* 回复弹窗 */}
        <Dialog open={isReplyOpen} onOpenChange={setIsReplyOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>回复留言</DialogTitle>
              <DialogDescription>
                回复用户 {selectedNotification?.userName || `用户${selectedNotification?.userId}`} 的留言
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">原始留言</p>
                <div className="p-3 bg-muted/50 rounded-lg text-sm max-h-[120px] overflow-y-auto">
                  {selectedNotification?.content}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium mb-1">回复内容</p>
                <Textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="请输入回复内容..."
                  rows={5}
                  className="resize-none"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsReplyOpen(false)}>
                取消
              </Button>
              <Button
                onClick={handleSubmitReply}
                disabled={replyMutation.isPending || !replyContent.trim()}
              >
                {replyMutation.isPending ? "提交中..." : "提交回复"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
