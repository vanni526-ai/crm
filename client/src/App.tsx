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
import AccountManagement from "./pages/AccountManagement";
import LocalLogin from "./pages/LocalLogin";
import UserManagement from "./pages/UserManagement";


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
      <Route path={"/accounts"} component={AccountManagement} />
      <Route path={"/login"} component={LocalLogin} />
      <Route path={"/user-management"} component={UserManagement} />

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
