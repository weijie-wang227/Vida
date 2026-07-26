import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router";
import { useVendorState } from "../state";
import { VendorLayout } from "./VendorLayout";

const DashboardPage = lazy(() =>
  import("../pages/DashboardPage").then((module) => ({
    default: module.DashboardPage,
  })),
);
const CreateActivityPage = lazy(() =>
  import("../pages/CreateActivityPage").then((module) => ({
    default: module.CreateActivityPage,
  })),
);
const CreateSessionPage = lazy(() =>
  import("../pages/CreateSessionPage").then((module) => ({
    default: module.CreateSessionPage,
  })),
);
const ViewActivitiesPage = lazy(() =>
  import("../pages/ViewActivitiesPage").then((module) => ({
    default: module.ViewActivitiesPage,
  })),
);
const SessionsCalendarPage = lazy(() =>
  import("../pages/SessionsCalendarPage").then((module) => ({
    default: module.SessionsCalendarPage,
  })),
);
const ActivityDetailsPage = lazy(() =>
  import("../pages/ActivityDetailsPage").then((module) => ({
    default: module.ActivityDetailsPage,
  })),
);
const SessionDetailsPage = lazy(() =>
  import("../pages/SessionDetailsPage").then((module) => ({
    default: module.SessionDetailsPage,
  })),
);
const AttendancePage = lazy(() =>
  import("../pages/AttendancePage").then((module) => ({
    default: module.AttendancePage,
  })),
);
const ActivityReviewsPage = lazy(() =>
  import("../pages/ActivityReviewsPage").then((module) => ({
    default: module.ActivityReviewsPage,
  })),
);
const FinancesPage = lazy(() =>
  import("../pages/FinancesPage").then((module) => ({
    default: module.FinancesPage,
  })),
);
const FinanceActivityPage = lazy(() =>
  import("../pages/FinanceActivityPage").then((module) => ({
    default: module.FinanceActivityPage,
  })),
);
const UsersPage = lazy(() =>
  import("../pages/UsersPage").then((module) => ({
    default: module.UsersPage,
  })),
);
const VolunteerManagementPage = lazy(() =>
  import("../pages/VolunteerManagementPage").then((module) => ({
    default: module.VolunteerManagementPage,
  })),
);
const AnnouncementsPage = lazy(() =>
  import("../pages/AnnouncementsPage").then((module) => ({
    default: module.AnnouncementsPage,
  })),
);
const AnnouncementDetailsPage = lazy(() =>
  import("../pages/AnnouncementDetailsPage").then((module) => ({
    default: module.AnnouncementDetailsPage,
  })),
);

export function AppShell() {
  const {
    vendor,
    activities,
    sessions,
    activityError,
    isCreatingActivity,
    updatingSessionId,
    deletingSessionId,
    createActivity,
    createSession,
    toggleSessionOpen,
    deleteSession,
  } = useVendorState();

  return (
    <VendorLayout>
      <Suspense fallback={null}>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route
            path="/create-activity"
            element={
              <CreateActivityPage
                vendor={vendor}
                error={activityError}
                isSubmitting={isCreatingActivity}
                onCreateActivity={createActivity}
              />
            }
          />
          <Route
            path="/create-session"
            element={
              <CreateSessionPage
                vendor={vendor}
                error={activityError}
                isSubmitting={isCreatingActivity}
                onCreateSession={createSession}
              />
            }
          />
          <Route
            path="/activities"
            element={
              <ViewActivitiesPage
                activities={activities}
                sessions={sessions}
                error={activityError}
                updatingActivityId={updatingSessionId}
                onToggleActivityOpen={toggleSessionOpen}
              />
            }
          />
          <Route
            path="/activities/calendar"
            element={<SessionsCalendarPage sessions={sessions} />}
          />
          <Route
            path="/activities/:activityId"
            element={
              <ActivityDetailsPage
                vendor={vendor}
                activities={activities}
                sessions={sessions}
                error={activityError}
                isCreatingSession={isCreatingActivity}
                onCreateSession={createSession}
              />
            }
          />
          <Route
            path="/activities/:activityId/sessions/:sessionId"
            element={
              <SessionDetailsPage
                activities={activities}
                sessions={sessions}
                updatingActivityId={updatingSessionId}
                deletingSessionId={deletingSessionId}
                onToggleActivityOpen={toggleSessionOpen}
                onDeleteSession={deleteSession}
              />
            }
          />
          <Route
            path="/sessions/:sessionId/attendance"
            element={<AttendancePage sessions={sessions} />}
          />
          <Route
            path="/activities/:activityId/reviews"
            element={<ActivityReviewsPage />}
          />
          <Route path="/finances" element={<FinancesPage />} />
          <Route
            path="/finances/activities/:activityId"
            element={<FinanceActivityPage />}
          />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/announcements" element={<AnnouncementsPage />} />
          <Route
            path="/announcements/:sessionId"
            element={<AnnouncementDetailsPage />}
          />
          <Route path="/volunteers" element={<VolunteerManagementPage />} />
          <Route path="/upcoming" element={<Navigate to="/activities" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
    </VendorLayout>
  );
}
