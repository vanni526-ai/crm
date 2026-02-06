import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Calendar, Clock, Search } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { formatDateBJ, formatDateTimeBJ, formatTimeBJ } from "@/lib/timezone";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const scheduleSchema = z.object({
  // 客户信息
  customerName: z.string().min(1, "请输入客户姓名"),
  wechatId: z.string().optional(),
  
  // 销售信息
  salesName: z.string().optional(),
  trafficSource: z.string().optional(),
  
  // 支付信息
  paymentAmount: z.string().optional(),
  courseAmount: z.string().optional(),
  accountBalance: z.string().optional(),
  paymentCity: z.string().optional(),
  channelOrderNo: z.string().optional(),
  overflowOrderNo: z.string().optional(),
  refundNo: z.string().optional(),
  paymentDate: z.string().optional(),
  paymentTime: z.string().optional(),
  
  // 费用信息
  teacherFee: z.string().optional(),
  transportFee: z.string().optional(),
  otherFee: z.string().optional(),
  partnerFee: z.string().optional(),
  receivedAmount: z.string().optional(),
  
  // 交付信息
  deliveryCity: z.string().optional(),
  deliveryClassroom: z.string().optional(),
  deliveryTeacher: z.string().optional(),
  deliveryCourse: z.string().optional(),
  
  // 课程信息
  teacherName: z.string().optional(),
  courseType: z.string().min(1, "请输入课程类型"),
  classDate: z.string().optional(),
  classTime: z.string().optional(),
  startTime: z.string().min(1, "请选择开始时间"),
  endTime: z.string().min(1, "请选择结束时间"),
  location: z.string().optional(),
  notes: z.string().optional(),
});

type ScheduleFormData = z.infer<typeof scheduleSchema>;

export default function Schedules() {
  const utils = trpc.useUtils();
  const { data: schedules, isLoading } = trpc.schedules.listWithOrderInfo.useQuery();

  const createSchedule = trpc.schedules.create.useMutation({
    onSuccess: () => {
      utils.schedules.list.invalidate();
      toast.success("排课创建成功");
      setCreateOpen(false);
      reset();
    },
    onError: (error: any) => {
      toast.error(error.message || "创建失败");
    },
  });

  const deleteSchedule = trpc.schedules.delete.useMutation({
    onSuccess: () => {
      utils.schedules.list.invalidate();
      toast.success("排课删除成功");
    },
    onError: (error: any) => {
      toast.error(error.message || "删除失败");
    },
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ScheduleFormData>({
    resolver: zodResolver(scheduleSchema),
  });

  const onCreateSubmit = (data: ScheduleFormData) => {
    createSchedule.mutate({
      customerName: data.customerName,
      wechatId: data.wechatId,
      salesName: data.salesName,
      trafficSource: data.trafficSource,
      paymentAmount: data.paymentAmount,
      courseAmount: data.courseAmount,
      accountBalance: data.accountBalance,
      paymentCity: data.paymentCity,
      channelOrderNo: data.channelOrderNo,
      overflowOrderNo: data.overflowOrderNo,
      refundNo: data.refundNo,
      paymentDate: data.paymentDate ? new Date(data.paymentDate) : undefined,
      paymentTime: data.paymentTime,
      teacherFee: data.teacherFee,
      transportFee: data.transportFee,
      otherFee: data.otherFee,
      partnerFee: data.partnerFee,
      receivedAmount: data.receivedAmount,
      deliveryCity: data.deliveryCity,
      deliveryClassroom: data.deliveryClassroom,
      deliveryTeacher: data.deliveryTeacher,
      deliveryCourse: data.deliveryCourse,
      teacherName: data.teacherName,
      courseType: data.courseType,
      classDate: data.classDate ? new Date(data.classDate) : undefined,
      classTime: data.classTime,
      startTime: new Date(data.startTime),
      endTime: new Date(data.endTime),
      location: data.location,
      notes: data.notes,
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("确定要删除这条排课记录吗?")) {
      deleteSchedule.mutate({ id });
    }
  };

  // 过滤排课数据
  const filteredSchedules = useMemo(() => {
    if (!schedules) return [];

    return schedules.filter((schedule) => {
      const matchSearch =
        schedule.courseType.toLowerCase().includes(searchTerm.toLowerCase()) ||
        schedule.teacherName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        schedule.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        schedule.location?.toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchSearch;
    });
  }, [schedules, searchTerm]);

  // 按日期分组
  const groupedSchedules = useMemo(() => {
    const grouped = new Map<string, typeof filteredSchedules>();
    
    filteredSchedules.forEach((schedule) => {
      const date = formatDateBJ(schedule.startTime);
      if (!grouped.has(date)) {
        grouped.set(date, []);
      }
      grouped.get(date)!.push(schedule);
    });

    return Array.from(grouped.entries()).sort((a, b) => {
      return new Date(a[0]).getTime() - new Date(b[0]).getTime();
    });
  }, [filteredSchedules]);

  // 即将到来的排课
  const upcomingSchedules = useMemo(() => {
    const now = new Date();
    return filteredSchedules
      .filter((s) => new Date(s.startTime) > now)
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
      .slice(0, 10);
  }, [filteredSchedules]);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">课程排课</h1>
            <p className="text-muted-foreground mt-1">管理课程安排和时间表</p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            新增排课
          </Button>
        </div>

        {/* 统计卡片 */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">总排课数</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{schedules?.length || 0}</div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">即将到来</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{upcomingSchedules.length}</div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">活跃老师</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Set(schedules?.map((s) => s.teacherName).filter(Boolean)).size}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 排课列表 */}
        <Card className="glass-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>排课列表</CardTitle>
              <div className="flex items-center space-x-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜索课程、老师、客户、地点..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-[250px]"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="grouped">
              <TabsList>
                <TabsTrigger value="grouped">按日期分组</TabsTrigger>
                <TabsTrigger value="upcoming">即将到来</TabsTrigger>
                <TabsTrigger value="all">全部列表</TabsTrigger>
              </TabsList>

              <TabsContent value="grouped" className="mt-4">
                {groupedSchedules.length > 0 ? (
                  <div className="space-y-6">
                    {groupedSchedules.map(([date, dateSchedules]) => (
                      <div key={date}>
                        <h3 className="text-lg font-semibold mb-3 flex items-center">
                          <Calendar className="mr-2 h-5 w-5" />
                          {date}
                        </h3>
                        <div className="space-y-2">
                          {dateSchedules.map((schedule) => (
                            <Card key={schedule.id}>
                              <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1 space-y-2">
                                    <div className="flex items-center space-x-2">
                                      <Badge>{schedule.courseType}</Badge>
                                      <span className="text-sm text-muted-foreground">
                                        {formatTimeBJ(schedule.startTime)}{" "}
                                        -{" "}
                                        {formatTimeBJ(schedule.endTime)}
                                      </span>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-muted-foreground">
                                      {schedule.customerName && (
                                        <div>客户: {schedule.customerName}</div>
                                      )}
                                      {schedule.teacherName && (
                                        <div>老师: {schedule.teacherName}</div>
                                      )}
                                      {schedule.matchedOrder?.deliveryCity && (
                                        <div>城市: {schedule.matchedOrder.deliveryCity}</div>
                                      )}
                                      {schedule.matchedOrder?.deliveryRoom && (
                                        <div>教室: {schedule.matchedOrder.deliveryRoom}</div>
                                      )}
                                      {schedule.salesName && (
                                        <div>销售: {schedule.salesName}</div>
                                      )}
                                    </div>
                                    {schedule.channelOrderNo && (
                                      <div className="mt-2 p-2 bg-muted rounded-md">
                                        <div className="text-sm font-medium mb-1">渠道订单号: {schedule.channelOrderNo}</div>
                                        {schedule.matchedOrder ? (
                                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-muted-foreground">
                                            <div>课程金额: ￥{schedule.matchedOrder.courseAmount || '0.00'}</div>
                                            <div>老师费用: ￥{schedule.matchedOrder.teacherFee || '0.00'}</div>
                                            <div>车费: ￥{schedule.matchedOrder.transportFee || '0.00'}</div>
                                            <div>合伙人费: ￥{schedule.matchedOrder.partnerFee || '0.00'}</div>
                                          </div>
                                        ) : (
                                          <Badge variant="destructive" className="text-xs">未匹配订单</Badge>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDelete(schedule.id)}
                                  >
                                    删除
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">暂无排课记录</div>
                )}
              </TabsContent>

              <TabsContent value="upcoming" className="mt-4">
                <ScheduleTable schedules={upcomingSchedules} onDelete={handleDelete} />
              </TabsContent>

              <TabsContent value="all" className="mt-4">
                <ScheduleTable schedules={filteredSchedules} onDelete={handleDelete} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* 新增排课对话框 */}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>新增排课</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onCreateSubmit)} className="space-y-6">
              {/* 客户信息 */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">客户信息</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="customerName">客户名(微信号) *</Label>
                    <Input id="customerName" {...register("customerName")} placeholder="输入客户姓名" />
                    {errors.customerName && (
                      <p className="text-sm text-destructive mt-1">{errors.customerName.message}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="wechatId">微信号</Label>
                    <Input id="wechatId" {...register("wechatId")} placeholder="输入微信号" />
                  </div>
                </div>
              </div>

              {/* 销售信息 */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">销售信息</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="salesName">销售人(花名)</Label>
                    <Input id="salesName" {...register("salesName")} placeholder="输入销售人员花名" />
                  </div>
                  <div>
                    <Label htmlFor="trafficSource">流量来源(花名)</Label>
                    <Input id="trafficSource" {...register("trafficSource")} placeholder="输入流量来源" />
                  </div>
                </div>
              </div>

              {/* 支付信息 */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">支付信息</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="paymentAmount">支付金额</Label>
                    <Input id="paymentAmount" type="number" step="0.01" {...register("paymentAmount")} placeholder="0.00" />
                  </div>
                  <div>
                    <Label htmlFor="courseAmount">课程金额</Label>
                    <Input id="courseAmount" type="number" step="0.01" {...register("courseAmount")} placeholder="0.00" />
                  </div>
                  <div>
                    <Label htmlFor="accountBalance">账户余额</Label>
                    <Input id="accountBalance" type="number" step="0.01" {...register("accountBalance")} placeholder="0.00" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="paymentCity">支付城市</Label>
                    <Input id="paymentCity" {...register("paymentCity")} placeholder="输入支付城市" />
                  </div>
                  <div>
                    <Label htmlFor="paymentDate">支付日期</Label>
                    <Input id="paymentDate" type="date" {...register("paymentDate")} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="channelOrderNo">城道订单号</Label>
                    <Input id="channelOrderNo" {...register("channelOrderNo")} placeholder="输入城道订单号" />
                  </div>
                  <div>
                    <Label htmlFor="overflowOrderNo">溢户订单号</Label>
                    <Input id="overflowOrderNo" {...register("overflowOrderNo")} placeholder="输入溢户订单号" />
                  </div>
                  <div>
                    <Label htmlFor="refundNo">退款单号</Label>
                    <Input id="refundNo" {...register("refundNo")} placeholder="输入退款单号" />
                  </div>
                </div>
              </div>

              {/* 费用信息 */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">费用信息</h3>
                <div className="grid grid-cols-5 gap-4">
                  <div>
                    <Label htmlFor="teacherFee">老师费用</Label>
                    <Input id="teacherFee" type="number" step="0.01" {...register("teacherFee")} placeholder="0.00" />
                  </div>
                  <div>
                    <Label htmlFor="transportFee">车费</Label>
                    <Input id="transportFee" type="number" step="0.01" {...register("transportFee")} placeholder="0.00" />
                  </div>
                  <div>
                    <Label htmlFor="otherFee">其他费用</Label>
                    <Input id="otherFee" type="number" step="0.01" {...register("otherFee")} placeholder="0.00" />
                  </div>
                  <div>
                    <Label htmlFor="partnerFee">合伙人费</Label>
                    <Input id="partnerFee" type="number" step="0.01" {...register("partnerFee")} placeholder="0.00" />
                  </div>
                  <div>
                    <Label htmlFor="receivedAmount">金串到账金额</Label>
                    <Input id="receivedAmount" type="number" step="0.01" {...register("receivedAmount")} placeholder="0.00" />
                  </div>
                </div>
              </div>

              {/* 交付信息 */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">交付信息</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="deliveryCity">交付城市</Label>
                    <Input id="deliveryCity" {...register("deliveryCity")} placeholder="输入交付城市" />
                  </div>
                  <div>
                    <Label htmlFor="deliveryClassroom">交付教室</Label>
                    <Input id="deliveryClassroom" {...register("deliveryClassroom")} placeholder="输入交付教室" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="deliveryTeacher">交付老师</Label>
                    <Input id="deliveryTeacher" {...register("deliveryTeacher")} placeholder="输入交付老师" />
                  </div>
                  <div>
                    <Label htmlFor="deliveryCourse">交付课程</Label>
                    <Input id="deliveryCourse" {...register("deliveryCourse")} placeholder="输入交付课程" />
                  </div>
                </div>
              </div>

              {/* 课程信息 */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">课程信息</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="teacherName">老师</Label>
                    <Input id="teacherName" {...register("teacherName")} placeholder="输入老师姓名" />
                  </div>
                  <div>
                    <Label htmlFor="courseType">课程类型 *</Label>
                    <Input id="courseType" {...register("courseType")} placeholder="如:瑜伽、舞蹈等" />
                    {errors.courseType && (
                      <p className="text-sm text-destructive mt-1">{errors.courseType.message}</p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="classDate">上课日期</Label>
                    <Input id="classDate" type="date" {...register("classDate")} />
                  </div>
                  <div>
                    <Label htmlFor="classTime">上课时间</Label>
                    <Input id="classTime" {...register("classTime")} placeholder="如:14:00-16:00" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startTime">开始时间 *</Label>
                    <Input id="startTime" type="datetime-local" {...register("startTime")} />
                    {errors.startTime && (
                      <p className="text-sm text-destructive mt-1">{errors.startTime.message}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="endTime">结束时间 *</Label>
                    <Input id="endTime" type="datetime-local" {...register("endTime")} />
                    {errors.endTime && (
                      <p className="text-sm text-destructive mt-1">{errors.endTime.message}</p>
                    )}
                  </div>
                </div>
                <div>
                  <Label htmlFor="location">上课地点</Label>
                  <Input id="location" {...register("location")} placeholder="如:A教室、B馆等" />
                </div>
              </div>

              {/* 备注 */}
              <div>
                <Label htmlFor="notes">备注</Label>
                <Input id="notes" {...register("notes")} placeholder="输入备注信息" />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                  取消
                </Button>
                <Button type="submit" disabled={createSchedule.isPending}>
                  {createSchedule.isPending ? "创建中..." : "创建"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

// 排课表格组件
function ScheduleTable({
  schedules,
  onDelete,
}: {
  schedules: any[];
  onDelete: (id: number) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>课程类型</TableHead>
            <TableHead>客户</TableHead>
            <TableHead>老师</TableHead>
            <TableHead>交付城市</TableHead>
            <TableHead>交付教室</TableHead>
            <TableHead>开始时间</TableHead>
            <TableHead>结束时间</TableHead>
            <TableHead>渠道订单号</TableHead>
            <TableHead>订单信息</TableHead>
            <TableHead>操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {schedules.length > 0 ? (
            schedules.map((schedule) => (
              <TableRow key={schedule.id}>
                <TableCell>
                  <Badge>{schedule.courseType}</Badge>
                </TableCell>
                <TableCell>{schedule.customerName || "-"}</TableCell>
                <TableCell>{schedule.teacherName || "-"}</TableCell>
                <TableCell>{schedule.matchedOrder?.deliveryCity || "-"}</TableCell>
                <TableCell>{schedule.matchedOrder?.deliveryRoom || "-"}</TableCell>
                <TableCell>{formatDateTimeBJ(schedule.startTime)}</TableCell>
                <TableCell>{formatDateTimeBJ(schedule.endTime)}</TableCell>
                <TableCell>
                  {schedule.channelOrderNo ? (
                    <span className="text-sm">{schedule.channelOrderNo}</span>
                  ) : (
                    <span className="text-muted-foreground text-sm">-</span>
                  )}
                </TableCell>
                <TableCell>
                  {schedule.matchedOrder ? (
                    <div className="text-sm space-y-1">
                      <div>课程金额: ￥{schedule.matchedOrder.courseAmount || '0.00'}</div>
                      <div>老师费用: ￥{schedule.matchedOrder.teacherFee || '0.00'}</div>
                      <div>车费: ￥{schedule.matchedOrder.transportFee || '0.00'}</div>
                      <div>合伙人费: ￥{schedule.matchedOrder.partnerFee || '0.00'}</div>
                    </div>
                  ) : schedule.channelOrderNo ? (
                    <Badge variant="destructive">未匹配订单</Badge>
                  ) : (
                    <span className="text-muted-foreground text-sm">无渠道订单号</span>
                  )}
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" onClick={() => onDelete(schedule.id)}>
                    删除
                  </Button>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                暂无排课记录
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
