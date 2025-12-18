import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Calendar, Search, Filter } from "lucide-react";

const actionLabels: Record<string, string> = {
  order_create: "订单创建",
  order_update: "订单修改",
  order_delete: "订单删除",
  user_role_update: "角色变更",
  user_status_update: "状态变更",
  user_delete: "用户删除",
  data_import: "数据导入",
  customer_create: "客户创建",
  customer_update: "客户修改",
  customer_delete: "客户删除",
  teacher_create: "老师创建",
  teacher_update: "老师修改",
  teacher_delete: "老师删除",
  schedule_create: "排课创建",
  schedule_update: "排课修改",
  schedule_delete: "排课删除",
};

const actionColors: Record<string, string> = {
  order_create: "bg-green-100 text-green-800",
  order_update: "bg-blue-100 text-blue-800",
  order_delete: "bg-red-100 text-red-800",
  user_role_update: "bg-purple-100 text-purple-800",
  user_status_update: "bg-yellow-100 text-yellow-800",
  user_delete: "bg-red-100 text-red-800",
  data_import: "bg-indigo-100 text-indigo-800",
};

export default function AuditLogs() {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [actionFilter, setActionFilter] = useState<string>("");
  const [keyword, setKeyword] = useState("");
  const [searchKeyword, setSearchKeyword] = useState("");

  const { data, isLoading, refetch } = trpc.auditLogs.list.useQuery({
    page,
    pageSize,
    action: actionFilter || undefined,
    keyword: searchKeyword || undefined,
  });

  const handleSearch = () => {
    setSearchKeyword(keyword);
    setPage(1);
  };

  const handleReset = () => {
    setActionFilter("");
    setKeyword("");
    setSearchKeyword("");
    setPage(1);
  };

  return (
    <DashboardLayout>
      <div className="container py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              操作日志审计
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* 筛选栏 */}
            <div className="flex gap-4 mb-6">
              <div className="flex-1">
                <Input
                  placeholder="搜索描述或目标名称..."
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
              </div>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="操作类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">全部类型</SelectItem>
                  {Object.entries(actionLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleSearch} className="gap-2">
                <Search className="w-4 h-4" />
                搜索
              </Button>
              <Button variant="outline" onClick={handleReset} className="gap-2">
                <Filter className="w-4 h-4" />
                重置
              </Button>
            </div>

            {/* 日志列表 */}
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">加载中...</div>
            ) : !data || data.logs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">暂无日志记录</div>
            ) : (
              <>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>时间</TableHead>
                        <TableHead>操作类型</TableHead>
                        <TableHead>操作人</TableHead>
                        <TableHead>描述</TableHead>
                        <TableHead>目标</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.logs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                            {new Date(log.createdAt).toLocaleString('zh-CN')}
                          </TableCell>
                          <TableCell>
                            <Badge className={actionColors[log.action] || "bg-gray-100 text-gray-800"}>
                              {actionLabels[log.action] || log.action}
                            </Badge>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            <div className="flex flex-col">
                              <span className="font-medium">{log.userName || "未知"}</span>
                              <span className="text-xs text-muted-foreground">{log.userRole}</span>
                            </div>
                          </TableCell>
                          <TableCell className="max-w-md">
                            <div className="truncate" title={log.description}>
                              {log.description}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {log.targetName || `${log.targetType}#${log.targetId}`}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* 分页 */}
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    共 {data.total} 条记录,第 {data.page} / {data.totalPages} 页
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage(page - 1)}
                    >
                      上一页
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= (data.totalPages || 1)}
                      onClick={() => setPage(page + 1)}
                    >
                      下一页
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
