import DashboardLayout from "@/components/DashboardLayout";
import UserManagementContent from "./UserManagementContent";

export default function CustomerManagement() {
  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">用户管理</h1>
          <p className="text-muted-foreground mt-1">
            管理系统用户账号和权限
          </p>
        </div>

        <UserManagementContent />
      </div>
    </DashboardLayout>
  );
}
