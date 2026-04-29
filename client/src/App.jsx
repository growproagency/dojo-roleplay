import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import CallHistory from "./pages/CallHistory";
import ScorecardDetail from "./pages/ScorecardDetail";
import Settings from "./pages/Settings";
import Leaderboard from "./pages/Leaderboard";
import Usage from "./pages/Usage";
import Members from "./pages/Members";
import InviteAccept from "./pages/InviteAccept";
import Profile from "./pages/Profile";
import AdminSchools from "./pages/AdminSchools";
import AdminSchoolDetail from "./pages/AdminSchoolDetail";
import CustomScenarios from "./pages/CustomScenarios";
import PlatformSettings from "./pages/PlatformSettings";
import ResetPassword from "./pages/ResetPassword";
import CallWidget from "./components/CallWidget";
import NameRequiredDialog from "./components/NameRequiredDialog";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/calls" component={CallHistory} />
      <Route path="/calls/:id" component={ScorecardDetail} />
      <Route path="/settings" component={Settings} />
      <Route path="/leaderboard" component={Leaderboard} />
      <Route path="/usage" component={Usage} />
      <Route path="/members" component={Members} />
      <Route path="/profile" component={Profile} />
      <Route path="/admin/schools" component={AdminSchools} />
      <Route path="/admin/schools/:id" component={AdminSchoolDetail} />
      <Route path="/admin/scenarios" component={CustomScenarios} />
      <Route path="/admin/platform-settings" component={PlatformSettings} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/invite/:token" component={InviteAccept} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" switchable>
        <TooltipProvider>
          <Toaster />
          <Router />
          {/* Mounted once at the app root so they survive route changes
              (otherwise an active call would lose its UI handle on navigation). */}
          <CallWidget />
          <NameRequiredDialog />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
