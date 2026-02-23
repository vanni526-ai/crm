import DashboardLayout from "@/components/DashboardLayout";
import CustomersContent from "./CustomersContent";

export default function Customers() {
  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">客户管理</h1>
          <p className="text-muted-foreground mt-1">
            管理业务客户信息和消费记录
          </p>
        </div>

        <CustomersContent />
      </div>
    </DashboardLayout>
  );
}
