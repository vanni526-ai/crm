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
import Login from "./pages/Login";
import ProtectedRoute from "./components/ProtectedRoute";

function Router() {
  return (
    <Switch>
      <Route path={"/login"} component={Login} />
      <Route path={"/"}><ProtectedRoute><Home /></ProtectedRoute></Route>
      <Route path={"/orders"}><ProtectedRoute><Orders /></ProtectedRoute></Route>
      <Route path={"/customers"}><ProtectedRoute><Customers /></ProtectedRoute></Route>
      <Route path={"/teachers"}><ProtectedRoute><Teachers /></ProtectedRoute></Route>
      <Route path={"/schedules"}><ProtectedRoute><Schedules /></ProtectedRoute></Route>
      <Route path={"/teacher-payments"}><ProtectedRoute><TeacherPayments /></ProtectedRoute></Route>
      <Route path={"/reconciliations"}><ProtectedRoute><Reconciliations /></ProtectedRoute></Route>
      <Route path={"/finance"}><ProtectedRoute><Finance /></ProtectedRoute></Route>
      <Route path={"/analytics"}><ProtectedRoute><Analytics /></ProtectedRoute></Route>
      <Route path={"/users"}><ProtectedRoute><Users /></ProtectedRoute></Route>
      <Route path={"/import"}><ProtectedRoute><Import /></ProtectedRoute></Route>
      <Route path={"/customer-overview"}><ProtectedRoute><CustomerOverview /></ProtectedRoute></Route>
      <Route path={"/sales"}><ProtectedRoute><Sales /></ProtectedRoute></Route>
      <Route path={"/audit-logs"}><ProtectedRoute><AuditLogs /></ProtectedRoute></Route>
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
