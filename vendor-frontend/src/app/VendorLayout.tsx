import { useLocation, useNavigate } from "react-router";
import type { ReactNode } from "react";
import { CalendarPlus, Megaphone } from "lucide-react";
import { useVendorState } from "../state";
import { Sidebar, type VendorTab } from "./Sidebar";
import { TopBar } from "./TopBar";

function getActiveTab(pathname: string): VendorTab {
  if (pathname.startsWith("/activities") || pathname.startsWith("/sessions")) {
    return "upcoming";
  }

  if (pathname.startsWith("/create-session")) {
    return "create-session";
  }

  if (pathname.startsWith("/create-activity")) {
    return "create-activity";
  }

  if (pathname.startsWith("/volunteers")) {
    return "volunteer-management";
  }

  if (pathname.startsWith("/finances")) {
    return "finances";
  }

  if (pathname.startsWith("/users")) {
    return "users";
  }

  if (pathname.startsWith("/announcements")) {
    return "announcements";
  }

  return "dashboard";
}

function getPageHeading(pathname: string, activeTab: VendorTab, vendorName: string) {
  const isCalendarPage = pathname === "/activities/calendar";
  const isAttendancePage = /^\/sessions\/[^/]+\/attendance$/.test(pathname);
  const isReviewsPage = /^\/activities\/[^/]+\/reviews$/.test(pathname);
  const isSessionDetailsPage = /^\/activities\/[^/]+\/sessions\/[^/]+$/.test(
    pathname,
  );
  const isDetailsPage = /^\/activities\/[^/]+$/.test(pathname);

  if (activeTab === "dashboard") {
    return { label: "My Dashboard", title: vendorName };
  }

  if (activeTab === "create-session") {
    return { label: "Create Session", title: "Create Session" };
  }

  if (activeTab === "create-activity") {
    return { label: "Create Activity", title: "Create Activity" };
  }

  if (activeTab === "volunteer-management") {
    return { label: "Volunteer Management", title: "Volunteer Management" };
  }

  if (activeTab === "finances") {
    return { label: "Finances", title: "Finances" };
  }

  if (activeTab === "users") {
    return { label: "Users", title: "Users" };
  }

  if (activeTab === "announcements") {
    return { label: "Announcements", title: "Session announcements" };
  }

  if (isCalendarPage) {
    return { label: "Activities", title: "Sessions Calendar" };
  }

  if (isAttendancePage) {
    return { label: "Attendance", title: "Attendance" };
  }

  if (isReviewsPage) {
    return { label: "Reviews", title: "Past Reviews" };
  }

  if (isSessionDetailsPage) {
    return { label: "Session Details", title: "Session Details" };
  }

  if (isDetailsPage) {
    return { label: "Activity Details", title: "Activity Details" };
  }

  return { label: "View All Activities", title: "View All Activities" };
}

export function VendorLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user, vendor, updateVendorProfile, signOut } = useVendorState();
  const activeTab = getActiveTab(pathname);
  const heading = getPageHeading(
    pathname,
    activeTab,
    vendor?.name ?? "Vendor Dashboard",
  );
  const handleTabChange = (tab: VendorTab) => {
    if (tab === "dashboard") {
      navigate("/dashboard");
      return;
    }

    if (tab === "create-activity") {
      navigate("/create-activity");
      return;
    }

    if (tab === "create-session") {
      navigate("/create-session");
      return;
    }

    if (tab === "finances") {
      navigate("/finances");
      return;
    }

    if (tab === "volunteer-management") {
      navigate("/volunteers");
      return;
    }

    if (tab === "users") {
      navigate("/users");
      return;
    }

    if (tab === "announcements") {
      navigate("/announcements");
      return;
    }

    navigate("/activities");
  };

  return (
    <div className="vendor-app">
      <Sidebar activeTab={activeTab} onTabChange={handleTabChange} />

      <div className="workspace">
        <TopBar
          accountName={vendor?.name || user?.handle || user?.name || "Vendor"}
          vendor={vendor}
          onUpdateVendorProfile={updateVendorProfile}
          onSignOut={signOut}
        />

        <main className="dashboard">
          <div className="dashboard-heading">
            <div>
              <span>{heading.label}</span>
              <h1>{heading.title}</h1>
            </div>
            {activeTab === "dashboard" && (
              <button
                type="button"
                className="primary-action dashboard-create-action"
                onClick={() => handleTabChange("create-activity")}
              >
                <CalendarPlus size={17} />
                Create Activity
              </button>
            )}
          </div>

          {children}
        </main>
      </div>

      <button
        type="button"
        className="chat-fab"
        aria-label="Open announcements"
        onClick={() => handleTabChange("announcements")}
      >
        <Megaphone size={21} />
      </button>
    </div>
  );
}
