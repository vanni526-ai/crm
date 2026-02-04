/**
 * 报表导出页面
 * 提供多种专业Excel报表的导出功能
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { 
  FileSpreadsheet, 
  BarChart3, 
  Building2, 
  Users, 
  Download,
  Loader2,
  Calendar
} from "lucide-react";

// 图标映射
const iconMap: Record<string, React.ReactNode> = {
  FileSpreadsheet: <FileSpreadsheet className="h-6 w-6" />,
  BarChart3: <BarChart3 className="h-6 w-6" />,
  Building2: <Building2 className="h-6 w-6" />,
  Users: <Users className="h-6 w-6" />,
};

export default function ReportExport() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [exportingId, setExportingId] = useState<string | null>(null);

  // 获取可用报表列表
  const { data: reports, isLoading } = trpc.excelReport.getAvailableReports.useQuery();

  // 导出mutations
  const exportFinancial = trpc.excelReport.exportFinancialReport.useMutation();
  const exportCity = trpc.excelReport.exportCityReport.useMutation();
  const exportTeacher = trpc.excelReport.exportTeacherSettlementReport.useMutation();
  const exportOrder = trpc.excelReport.exportOrderData.useMutation();

  // 下载文件
  const downloadFile = (base64Data: string, filename: string) => {
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { 
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" 
    });
    
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  // 处理导出
  const handleExport = async (reportId: string) => {
    setExportingId(reportId);
    
    try {
      let result;
      const params = {
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      };

      switch (reportId) {
        case "financial":
          result = await exportFinancial.mutateAsync(params);
          break;
        case "city":
          result = await exportCity.mutateAsync(params);
          break;
        case "teacher":
          result = await exportTeacher.mutateAsync(params);
          break;
        case "order":
          result = await exportOrder.mutateAsync(params);
          break;
        default:
          throw new Error("未知的报表类型");
      }

      if (result.success) {
        downloadFile(result.data, result.filename);
        toast.success("导出成功", {
          description: `${result.filename} 已下载`,
        });
      }
    } catch (error: any) {
      toast.error("导出失败", {
        description: error.message || "请稍后重试",
      });
    } finally {
      setExportingId(null);
    }
  };

  // 快捷日期设置
  const setQuickDate = (type: "thisMonth" | "lastMonth" | "thisYear") => {
    const now = new Date();
    let start: Date;
    let end: Date;

    switch (type) {
      case "thisMonth":
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case "lastMonth":
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case "thisYear":
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear(), 11, 31);
        break;
    }

    setStartDate(start.toISOString().split("T")[0]);
    setEndDate(end.toISOString().split("T")[0]);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">报表导出</h1>
        <p className="text-muted-foreground">
          导出专业的Excel报表,支持多种维度的数据分析
        </p>
      </div>

      {/* 日期筛选 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            日期范围
          </CardTitle>
          <CardDescription>
            选择要导出的数据日期范围,留空则导出全部数据
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <Label htmlFor="startDate">开始日期</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">结束日期</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setQuickDate("thisMonth")}
              >
                本月
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setQuickDate("lastMonth")}
              >
                上月
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setQuickDate("thisYear")}
              >
                今年
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                }}
              >
                清除
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 报表列表 */}
      <div className="grid gap-4 md:grid-cols-2">
        {reports?.map((report) => (
          <Card key={report.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg text-primary">
                    {iconMap[report.icon] || <FileSpreadsheet className="h-6 w-6" />}
                  </div>
                  <div>
                    <CardTitle className="text-lg">{report.name}</CardTitle>
                    <CardDescription className="mt-1">
                      {report.description}
                    </CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => handleExport(report.id)}
                disabled={exportingId === report.id || !report.available}
                className="w-full"
              >
                {exportingId === report.id ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    正在生成...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    导出Excel
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 使用说明 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">使用说明</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            1. 综合财务报表: 包含概览、城市统计、销售业绩、老师结算、收支明细等多个工作表,适合全面了解业务状况。
          </p>
          <p>
            2. 城市业绩报表: 按城市维度分析业绩,包含月度趋势,适合区域业务分析。
          </p>
          <p>
            3. 老师结算报表: 汇总老师的课时费和车费,适合财务结算使用。
          </p>
          <p>
            4. 订单数据导出: 导出完整的订单明细数据,支持在Excel中进一步分析。
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
