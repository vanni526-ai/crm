import { useState, useMemo } from "react";
import MobileLayout from "../components/MobileLayout";
import { PageHeader, GlassCard, LoadingSpinner, EmptyState } from "../components/GlassCard";
import { trpc } from "@/lib/trpc";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";

export default function TeacherSchedule() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);

  const schedulesQuery = trpc.schedules.list.useQuery(undefined, { retry: false });
  const schedules = schedulesQuery.data || [];

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // 生成日历数据
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPad = firstDay.getDay();
    const days: Array<{ date: string; day: number; isCurrentMonth: boolean; count: number }> = [];

    // 上月填充
    for (let i = startPad - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      const dateStr = d.toISOString().split("T")[0];
      days.push({
        date: dateStr,
        day: d.getDate(),
        isCurrentMonth: false,
        count: schedules.filter((s: any) => (s.date || "").startsWith(dateStr)).length,
      });
    }

    // 当月
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const d = new Date(year, month, i);
      const dateStr = d.toISOString().split("T")[0];
      days.push({
        date: dateStr,
        day: i,
        isCurrentMonth: true,
        count: schedules.filter((s: any) => (s.date || "").startsWith(dateStr)).length,
      });
    }

    // 下月填充
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      const dateStr = d.toISOString().split("T")[0];
      days.push({
        date: dateStr,
        day: i,
        isCurrentMonth: false,
        count: schedules.filter((s: any) => (s.date || "").startsWith(dateStr)).length,
      });
    }

    return days;
  }, [year, month, schedules]);

  const todayStr = new Date().toISOString().split("T")[0];

  // 选中日期的课程
  const selectedCourses = schedules.filter((s: any) => (s.date || "").startsWith(selectedDate));

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  return (
    <MobileLayout>
      <PageHeader title="我的排课" />

      <div className="px-4 pb-6 space-y-4">
        {/* 月份导航 */}
        <div className="flex items-center justify-between">
          <button onClick={prevMonth} className="p-2 text-slate-400 active:text-white">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-white font-bold text-lg">
            {year}年{month + 1}月
          </h2>
          <button onClick={nextMonth} className="p-2 text-slate-400 active:text-white">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* 日历 */}
        <GlassCard className="p-3">
          {/* 星期头 */}
          <div className="grid grid-cols-7 mb-2">
            {["日", "一", "二", "三", "四", "五", "六"].map((d) => (
              <div key={d} className="text-center text-xs text-slate-500 py-1">
                {d}
              </div>
            ))}
          </div>

          {/* 日期格子 */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, idx) => {
              const isToday = day.date === todayStr;
              const isSelected = day.date === selectedDate;
              return (
                <button
                  key={idx}
                  onClick={() => setSelectedDate(day.date)}
                  className={`relative aspect-square flex flex-col items-center justify-center rounded-xl text-sm transition-all ${
                    !day.isCurrentMonth
                      ? "text-slate-700"
                      : isSelected
                      ? "bg-amber-500 text-black font-bold"
                      : isToday
                      ? "bg-amber-500/20 text-amber-400 font-bold"
                      : "text-white hover:bg-white/5"
                  }`}
                >
                  {day.day}
                  {day.count > 0 && !isSelected && (
                    <div className="absolute bottom-1 w-1 h-1 rounded-full bg-blue-400" />
                  )}
                  {day.count > 0 && isSelected && (
                    <div className="absolute bottom-1 w-1 h-1 rounded-full bg-black" />
                  )}
                </button>
              );
            })}
          </div>
        </GlassCard>

        {/* 选中日期的课程 */}
        <div>
          <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-amber-400" />
            {selectedDate} 课程
          </h3>
          {schedulesQuery.isLoading ? (
            <LoadingSpinner />
          ) : selectedCourses.length === 0 ? (
            <EmptyState message="该日无课程安排" />
          ) : (
            <div className="space-y-2">
              {selectedCourses.map((course: any) => (
                <GlassCard key={course.id} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-medium text-sm">
                      {course.courseName || course.deliveryCourse || "课程"}
                    </span>
                    <span className="text-amber-400 text-sm font-medium">
                      {course.startTime || course.classTime || "—"}
                    </span>
                  </div>
                  <div className="space-y-1 text-xs text-slate-500">
                    {course.customerName && (
                      <div>学员: <span className="text-slate-300">{course.customerName}</span></div>
                    )}
                    {course.cityName && (
                      <div>城市: <span className="text-slate-300">{course.cityName}</span></div>
                    )}
                    {course.room && (
                      <div>教室: <span className="text-slate-300">{course.room}</span></div>
                    )}
                  </div>
                </GlassCard>
              ))}
            </div>
          )}
        </div>
      </div>
    </MobileLayout>
  );
}
