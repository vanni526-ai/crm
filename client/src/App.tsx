import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Orders from "./pages/Orders";
import Customers from "./pages/Customers";
import Teachers from "./pages/Teachers";
import Schedules from "./pages/Schedules";
import TeacherPayments from "./pages/TeacherPayments";
import Reconciliations from "./pages/Reconciliations";
import Finance from "./pages/Finance";
import Analytics from "./pages/Analytics";
import Users from "./pages/Users";
import Import from "./pages/Import";
import CustomerOverview from "./pages/CustomerOverview";
import Sales from "./pages/Sales";
import AuditLogs from "./pages/AuditLogs";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/orders"} component={Orders} />
      <Route path={"/customers"} component={Customers} />
      <Route path={"/teachers"} component={Teachers} />
      <Route path={"/schedules"} component={Schedules} />
      <Route path={"/teacher-payments"} component={TeacherPayments} />
      <Route path={"/reconciliations"} component={Reconciliations} />
      <Route path={"/finance"} component={Finance} />
      <Route path={"/analytics"} component={Analytics} />
      <Route path={"/users"} component={Users} />
      <Route path={"/import"} component={Import} />
      <Route path={"/customer-overview"} component={CustomerOverview} />
      <Route path={"/sales"} component={Sales} />
      <Route path={"/audit-logs"} component={AuditLogs} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
