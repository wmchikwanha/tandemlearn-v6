import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { OfflineBanner } from "@/components/OfflineBanner";
import { DataSaverBanner } from "@/components/DataSaverBanner";
import { AccessibilityProvider } from "@/contexts/AccessibilityContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import RoleSelection from "./pages/RoleSelection";
import Teacher from "./pages/Teacher";
import TeacherDashboard from "./pages/teacher/Dashboard";
import TeacherBroadcast from "./pages/teacher/Broadcast";
import TeacherLessons from "./pages/teacher/Lessons";
import Student from "./pages/Student";
import StudentTimetable from "./pages/student/Timetable";
import StudentDashboard from "./pages/student/Dashboard";
import VocabularyBank from "./components/student/VocabularyBank";
import StudentLiveSession from "./pages/student/LiveSession";
import Transcripts from "./pages/Transcripts";
import Help from "./pages/Help";
import Install from "./pages/Install";
import NotFound from "./pages/NotFound";
import AdminDashboard from "./pages/admin/Dashboard";
import Profile from "./pages/Profile";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Safeguarding from "./pages/Safeguarding";
import Accessibility from "./pages/Accessibility";
import GuardianDashboard from "./pages/GuardianDashboard";
import StudentFingerspell from "./pages/student/Fingerspell";
import ZSLLab from "./pages/ZSLLab";
import DialectBridge from "./pages/DialectBridge";
import DialectRouter from "./pages/DialectRouter";
import DialectValidator from "./pages/DialectValidator";
import DialectValidatorAdmin from "./pages/DialectValidatorAdmin";
import TeacherToday from "./pages/teacher/Today";
import TeacherPolicies from "./pages/teacher/Policies";
import ActionCenter from "./pages/teacher/ActionCenter";
import Harmonization from "./pages/admin/Harmonization";

const queryClient = new QueryClient();

const App = () => (
  <LanguageProvider>
  <AccessibilityProvider>
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <OfflineBanner />
      <DataSaverBanner />
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/role-selection" element={<RoleSelection />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/teacher" element={<TeacherDashboard />} />
          <Route path="/teacher/broadcast/:lessonId" element={<TeacherBroadcast />} />
          <Route path="/teacher/lessons" element={<TeacherLessons />} />
          <Route path="/teacher/legacy" element={<Teacher />} />
          <Route path="/student" element={<Student />} />
          <Route path="/student/timetable" element={<StudentTimetable />} />
          <Route path="/student/dashboard" element={<StudentDashboard />} />
          <Route path="/student/vocabulary" element={<VocabularyBank />} />
          <Route path="/student/fingerspell" element={<StudentFingerspell />} />
          <Route path="/student/live/:sessionName" element={<StudentLiveSession />} />
          <Route path="/transcripts" element={<Transcripts />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/help" element={<Help />} />
          <Route path="/install" element={<Install />} />
          {/* Legal Pages */}
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/safeguarding" element={<Safeguarding />} />
          <Route path="/accessibility" element={<Accessibility />} />
          <Route path="/guardian" element={<GuardianDashboard />} />
          <Route path="/zsl-lab" element={<ZSLLab />} />
          <Route path="/dialect-bridge" element={<DialectBridge />} />
          <Route path="/dialect-bridge/router" element={<DialectRouter />} />
          <Route path="/dialect-bridge/validator" element={<DialectValidator />} />
          <Route path="/dialect-bridge/admin" element={<DialectValidatorAdmin />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </AccessibilityProvider>
  </LanguageProvider>
);

export default App;
