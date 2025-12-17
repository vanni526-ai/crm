import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Calendar, Clock, MapPin, User, Search } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const scheduleSchema = z.object({
  customerId: z.number().min(1, "请选择客户"),
  teacherId: z.number().optional(),
  courseType: z.string().min(1, "请输入课程类型"),
  startTime: z.string().min(1, "请选择开始时间"),
  endTime: z.string().min(1, "请选择结束时间"),
  location: z.string().optional(),
  notes: z.string().optional(),
});

type ScheduleFormData = z.infer<typeof scheduleSchema>;

export default function Schedules() {
  const utils = trpc.useUtils();
  const { data: schedules, isLoading } = trpc.schedules.list.useQuery();
  const { data: customers } = trpc.customers.list.useQuery();
  const { data: teachers } = trpc.teachers.list.useQuery();

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
  const [filterTeacher, setFilterTeacher] = useState<string>("all");
  const [filterCustomer, setFilterCustomer] = useState<string>("all");

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ScheduleFormData>({
    resolver: zodResolver(scheduleSchema),
  });

  const selectedCustomerId = watch("customerId");
  const selectedTeacherId = watch("teacherId");

  const onCreateSubmit = (data: ScheduleFormData) => {
    createSchedule.mutate({
      customerId: data.customerId,
      teacherId: data.teacherId,
      courseType: data.courseType,
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

  // 过滤和分组排课数据
  const filteredSchedules = useMemo(() => {
    if (!schedules) return [];

    return schedules.filter((schedule) => {
      const matchSearch =
        schedule.courseType.toLowerCase().includes(searchTerm.toLowerCase()) ||
        schedule.teacherName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        schedule.location?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchTeacher =
        filterTeacher === "all" || schedule.teacherId?.toString() === filterTeacher;

      const matchCustomer =
        filterCustomer === "all" || schedule.customerId.toString() === filterCustomer;

      return matchSearch && matchTeacher && matchCustomer;
    });
  }, [schedules, searchTerm, filterTeacher, filterCustomer]);

  // 按日期分组
  const groupedSchedules = useMemo(() => {
    const groups: Record<string, typeof filteredSchedules> = {};

    filteredSchedules.forEach((schedule) => {
      const dateKey = new Date(schedule.startTime).toLocaleDateString();
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(schedule);
    });

    // 按日期排序
    return Object.entries(groups).sort(
      ([dateA], [dateB]) => new Date(dateA).getTime() - new Date(dateB).getTime()
    );
  }, [filteredSchedules]);

  // 即将到来的排课
  const upcomingSchedules = useMemo(() => {
    const now = new Date();
    return filteredSchedules
      .filter((schedule) => new Date(schedule.startTime) > now)
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
      .slice(0, 10);
  }, [filteredSchedules]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">课程排课</h1>
            <p className="text-muted-foreground mt-2">管理课程安排和时间表</p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            新增排课
          </Button>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">总排课数</p>
                  <p className="text-2xl font-bold">{schedules?.length || 0}</p>
                </div>
                <Calendar className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">即将到来</p>
                  <p className="text-2xl font-bold">{upcomingSchedules.length}</p>
                </div>
                <Clock className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">活跃老师</p>
                  <p className="text-2xl font-bold">{teachers?.length || 0}</p>
                </div>
                <User className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 筛选工具栏 */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <CardTitle>排课列表</CardTitle>
              <div className="flex flex-col md:flex-row gap-2">
                <div className="flex items-center space-x-2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="搜索课程、老师、地点..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-[200px]"
                  />
                </div>
                <Select value={filterTeacher} onValueChange={setFilterTeacher}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="筛选老师" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部老师</SelectItem>
                    {teachers?.map((teacher) => (
                      <SelectItem key={teacher.id} value={teacher.id.toString()}>
                        {teacher.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterCustomer} onValueChange={setFilterCustomer}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="筛选客户" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部客户</SelectItem>
                    {customers?.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id.toString()}>
                        {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                                  <div className="flex-1">
                                    <div className="flex items-center space-x-2 mb-2">
                                      <Badge>{schedule.courseType}</Badge>
                                      <span className="text-sm text-muted-foreground">
                                        {new Date(schedule.startTime).toLocaleTimeString([], {
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        })}{" "}
                                        -{" "}
                                        {new Date(schedule.endTime).toLocaleTimeString([], {
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        })}
                                      </span>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                                      {schedule.teacherName && (
                                        <div className="flex items-center text-muted-foreground">
                                          <User className="mr-1 h-3 w-3" />
                                          老师: {schedule.teacherName}
                                        </div>
                                      )}
                                      {schedule.location && (
                                        <div className="flex items-center text-muted-foreground">
                                          <MapPin className="mr-1 h-3 w-3" />
                                          {schedule.location}
                                        </div>
                                      )}
                                      {schedule.notes && (
                                        <div className="text-muted-foreground">
                                          备注: {schedule.notes}
                                        </div>
                                      )}
                                    </div>
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
                  <p className="text-center py-8 text-muted-foreground">暂无排课数据</p>
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
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>新增排课</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onCreateSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customerId">客户 *</Label>
                  <Select
                    value={selectedCustomerId?.toString() || ""}
                    onValueChange={(value) => setValue("customerId", parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择客户" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers?.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id.toString()}>
                          {customer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.customerId && (
                    <p className="text-sm text-destructive mt-1">{errors.customerId.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="teacherId">老师</Label>
                  <Select
                    value={selectedTeacherId?.toString() || ""}
                    onValueChange={(value) => setValue("teacherId", parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择老师" />
                    </SelectTrigger>
                    <SelectContent>
                      {teachers?.map((teacher) => (
                        <SelectItem key={teacher.id} value={teacher.id.toString()}>
                          {teacher.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="courseType">课程类型 *</Label>
                <Input id="courseType" {...register("courseType")} placeholder="如:瑜伽、舞蹈等" />
                {errors.courseType && (
                  <p className="text-sm text-destructive mt-1">{errors.courseType.message}</p>
                )}
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

              <div>
                <Label htmlFor="notes">备注</Label>
                <Input id="notes" {...register("notes")} />
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
            <TableHead>开始时间</TableHead>
            <TableHead>结束时间</TableHead>
            <TableHead>老师</TableHead>
            <TableHead>地点</TableHead>
            <TableHead>备注</TableHead>
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
                <TableCell>{new Date(schedule.startTime).toLocaleString()}</TableCell>
                <TableCell>{new Date(schedule.endTime).toLocaleString()}</TableCell>
                <TableCell>{schedule.teacherName || "-"}</TableCell>
                <TableCell>{schedule.location || "-"}</TableCell>
                <TableCell>{schedule.notes || "-"}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" onClick={() => onDelete(schedule.id)}>
                    删除
                  </Button>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                暂无排课记录
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
