import { useNavigate, useSearchParams } from "react-router";
import { ArrowLeft } from "lucide-react";
import type {
  Activity,
  CreateSessionInput,
  CreateVendorSessionResponse,
  Vendor,
} from "../api/types";
import { SessionCreatePanel } from "../components/sessions";

export function CreateSessionPage({
  vendor,
  activities,
  error,
  isSubmitting,
  onCreateSession,
}: {
  vendor: Vendor | null;
  activities: Activity[];
  error: string | null;
  isSubmitting: boolean;
  onCreateSession: (
    input: CreateSessionInput,
  ) => Promise<CreateVendorSessionResponse>;
}) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const selectedDate = searchParams.get("date") ?? "";
  const activityId = searchParams.get("activityId") ?? undefined;
  const activity =
    activities.find(
      (row) =>
        String(row.mockId) === activityId || String(row.id) === activityId,
    ) ?? null;

  return (
    <div className="dashboard__main dashboard__main--full">
      <button
        type="button"
        className="back-button"
        onClick={() => navigate("/activities")}
      >
        <ArrowLeft size={16} />
        Back to activities
      </button>

      <SessionCreatePanel
        activity={activity}
        activityId={activityId}
        vendor={vendor}
        selectedDate={selectedDate}
        error={error}
        isSubmitting={isSubmitting}
        onCreateSession={onCreateSession}
        onCreated={(response) => {
          const createdSessionId = response.session?.id;
          const createdActivityId =
            response.session?.activityId ?? activityId;

          if (createdSessionId) {
            navigate(
              `/activities/${createdActivityId}/sessions/${createdSessionId}`,
            );
          }
        }}
      />
    </div>
  );
}
