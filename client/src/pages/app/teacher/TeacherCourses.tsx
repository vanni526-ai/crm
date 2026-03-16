import { useState } from "react";
import MobileLayout from "../components/MobileLayout";
import { PageHeader, GlassCard, LoadingSpinner, EmptyState } from "../components/GlassCard";
import { trpc } from "@/lib/trpc";
import { BookOpen, MapPin, User, Clock } from "lucide-react";

export default function TeacherCourses() {
  const [filter, setFilter] = useState<"upcoming" | "past">("upcoming");

  const schedulesQuery = trpc.schedules.list.useQuery(undefined, { retry: false });
  const schedules = schedulesQuery.data || [];

  const today = new Date().toISOString().split("T")[0];

  const upcoming = schedules.filter((s: any) => (s.date || "") >= today);
  const past = schedules.filter((s: any) => (s.date || "") < today);

  const displayed = filter === "upcoming" ? upcoming : past;

  return (
    <MobileLayout>
      <PageHeader title="课程详情" />

      <div className="px-4 pb-6">
        {/* 筛选 */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setFilter("upcoming")}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
              filter === "upcoming"
                ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                : "bg-white/5 text-slate-400 border border-white/5"
            }`}
          >
            即将上课 ({upcoming.length})
          </button>
          <button
            onClick={() => setFilter("past")}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
              filter === "past"
                ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                : "bg-white/5 text-slate-400 border border-white/5"
            }`}
          >
            已完成 ({past.length})
          </button>
        </div>

        {schedulesQuery.isLoading ? (
          <LoadingSpinner />
        ) : displayed.length === 0 ? (
          <EmptyState
            message={filter === "upcoming" ? "暂无即将上课的课程" : "暂无已完成的课程"}
            icon={<BookOpen className="w-12 h-12 mb-3 opacity-20 text-slate-500" />}
          />
        ) : (
          <div className="space-y-3">
            {displayed.map((course: any) => (
              <CourseDetailCard key={course.id} course={course} />
            ))}
          </div>
        )}
      </div>
    </MobileLayout>
  );
}

function CourseDetailCard({ course }: { course: any }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <GlassCard className="overflow-hidden" onClick={() => setExpanded(!expanded)}>
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-medium">
            {course.courseName || course.deliveryCourse || "课程"}
          </h3>
          <span className="text-xs text-slate-500">{course.date}</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-2 text-xs">
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-slate-400">
              {course.startTime || course.classTime || "—"}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <User className="w-3.5 h-3.5 text-green-400" />
            <span className="text-slate-400">
              {course.customerName || "—"}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <MapPin className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-slate-400">
              {course.cityName || "—"}
            </span>
          </div>
          {course.room && (
            <div className="flex items-center gap-2 text-xs">
              <BookOpen className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-slate-400">{course.room}</span>
            </div>
          )}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-white/5 px-4 py-3 space-y-2 text-xs">
          {course.address && (
            <div>
              <span className="text-slate-500">地址: </span>
              <span className="text-slate-300">{course.address}</span>
            </div>
          )}
          {course.notes && (
            <div>
              <span className="text-slate-500">备注: </span>
              <span className="text-slate-300">{course.notes}</span>
            </div>
          )}
          {course.teacherFee && (
            <div>
              <span className="text-slate-500">课时费: </span>
              <span className="text-amber-400">¥{Number(course.teacherFee).toFixed(2)}</span>
            </div>
          )}
        </div>
      )}
    </GlassCard>
  );
}
