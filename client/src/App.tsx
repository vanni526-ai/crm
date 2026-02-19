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
import GmailImport from "./pages/GmailImport";
// import GmailImportConfig from "./pages/GmailImportConfig";
import ChannelOrderNoManagement from "./pages/ChannelOrderNoManagement";
import ReconciliationExport from "./pages/ReconciliationExport";
import TransportFeeFixTool from "./pages/TransportFeeFixTool";
import TrafficSourceConfig from "./pages/TrafficSourceConfig";
import TrafficSourceDashboard from "./pages/TrafficSourceDashboard";
import ParsingLearning from "./pages/ParsingLearning";
import CityPartnerConfig from "./pages/CityPartnerConfig";
import Cities from "./pages/Cities";
import ReconciliationMatch from "./pages/ReconciliationMatch";
import ReconciliationReport from "./pages/ReconciliationReport";

import LocalLogin from "./pages/LocalLogin";

import CustomerManagement from "./pages/CustomerManagement";
import Courses from "./pages/Courses";
import Notifications from "./pages/Notifications";
import SalesCityPerformance from "./pages/SalesCityPerformance";
import TeacherPaymentApproval from "./pages/TeacherPaymentApproval";
import PartnerManagement from "./pages/PartnerManagement";
import CityExpenseManagement from "@/pages/CityExpenseManagement";
import DataCleaning from "@/pages/DataCleaning";


function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/orders"} component={Orders} />
      <Route path={"/customer-management"} component={CustomerManagement} />
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
      <Route path={"/gmail-import"} component={GmailImport} />
      {/* <Route path={"/gmail-import/config"} component={GmailImportConfig} /> */}
      <Route path={"/channel-orderno-management"} component={ChannelOrderNoManagement} />
      <Route path={"/reconciliation-export"} component={ReconciliationExport} />
      <Route path={"/transport-fee-fix"} component={TransportFeeFixTool} />
      <Route path={"/traffic-source-config"} component={TrafficSourceConfig} />
      <Route path={"/traffic-source-dashboard"} component={TrafficSourceDashboard} />
      <Route path={"/parsing-learning"} component={ParsingLearning} />
      <Route path={"/city-partner-config"} component={CityPartnerConfig} />
      <Route path={"/cities"} component={Cities} />
      <Route path={"/reconciliation-match"} component={ReconciliationMatch} />
      <Route path={"/reconciliation-report"} component={ReconciliationReport} />

      <Route path={"/login"} component={LocalLogin} />

      <Route path={"/courses"} component={Courses} />
      <Route path={"/notifications"} component={Notifications} />
      <Route path={"/sales-city-performance"} component={SalesCityPerformance} />
      <Route path={"/teacher-payment-approval"} component={TeacherPaymentApproval} />
      <Route path={"/partner-management"} component={PartnerManagement} />
      <Route path={"/city-expense-management"} component={CityExpenseManagement} />
      <Route path={"/data-cleaning"} component={DataCleaning} />

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
