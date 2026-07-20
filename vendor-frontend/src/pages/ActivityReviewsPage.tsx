import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { ArrowLeft, CalendarDays, Loader2, MapPin, Star } from "lucide-react";
import { fetchActivityReviews } from "../api/activities";
import type { ActivityReviewsResponse } from "../api/types";
import { Card } from "../components/Card";
import { ReviewCard } from "../components/reviews";

function formatActivityDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not scheduled";
  }

  return new Intl.DateTimeFormat("en-SG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function ActivityReviewsPage() {
  const navigate = useNavigate();
  const { activityId } = useParams();
  const [reviewsData, setReviewsData] =
    useState<ActivityReviewsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activityId) {
      setIsLoading(false);
      setError("Activity not found.");
      return;
    }

    let isActive = true;

    setIsLoading(true);
    setError(null);

    fetchActivityReviews(activityId)
      .then((response) => {
        if (isActive) {
          setReviewsData(response);
        }
      })
      .catch((fetchError) => {
        if (isActive) {
          setError(
            fetchError instanceof Error
              ? fetchError.message
              : "Unable to load reviews.",
          );
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [activityId]);

  const activity = reviewsData?.session;
  const reviews = reviewsData?.reviews ?? [];

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

      <Card title="Past Reviews">
        {isLoading ? (
          <div className="empty-state">
            <Loader2 size={28} className="spin" />
            <strong>Loading reviews</strong>
            <span>Fetching attendee feedback for this activity.</span>
          </div>
        ) : error ? (
          <div className="empty-state">
            <Star size={28} />
            <strong>Unable to load reviews</strong>
            <span>{error}</span>
          </div>
        ) : (
          <div className="reviews-panel">
            {activity && (
              <div className="reviews-summary">
                <div>
                  <span>Activity</span>
                  <strong>{activity.title}</strong>
                </div>
                <div>
                  <span><CalendarDays size={15} />Date</span>
                  <strong>{formatActivityDate(activity.startsAt)}</strong>
                </div>
                <div>
                  <span><MapPin size={15} />Location</span>
                  <strong>{activity.location}</strong>
                </div>
                <div>
                  <span><Star size={15} />Average Rating</span>
                  <strong>{activity.rating.toFixed(1)}</strong>
                </div>
              </div>
            )}

            <div className="reviews-list">
              <h3>{reviews.length} review{reviews.length === 1 ? "" : "s"}</h3>
              {reviews.length > 0 ? (
                reviews.map((review) => (
                  <ReviewCard key={review.id} review={review} />
                ))
              ) : (
                <div className="empty-state empty-state--compact">
                  <strong>No review yet</strong>
                  <span>This past activity does not have attendee reviews.</span>
                </div>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
