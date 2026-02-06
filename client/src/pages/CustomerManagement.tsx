import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DashboardLayout from "@/components/DashboardLayout";
import UserManagementContent from "./UserManagementContent";
import CustomersContent from "./CustomersContent";

export default function CustomerManagement() {
  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">用户管理</h1>
          <p className="text-muted-foreground mt-1">
            管理系统用户账号和业务客户信息
          </p>
        </div>

        <Tabs defaultValue="users" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="users">用户账号</TabsTrigger>
            <TabsTrigger value="customers">业务客户</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="mt-6">
            <UserManagementContent />
          </TabsContent>

          <TabsContent value="customers" className="mt-6">
            <CustomersContent />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
