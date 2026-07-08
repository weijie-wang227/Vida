import { ChevronLeft, Loader2, Send, Star, X } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router";
import { fetchActivityReview, submitActivityReview } from "../api";
import type { ActivityReviewResponse } from "../lib/types";

function parseActivityId(activityId: string | undefined) {
  const nextActivityId = Number(activityId);

  return Number.isInteger(nextActivityId) ? nextActivityId : null;
}

export function ActivityReviewPage() {
  const navigate = useNavigate();
  const { activityId } = useParams();
  const routeActivityId = parseActivityId(activityId);
  const [reviewData, setReviewData] = useState<ActivityReviewResponse | null>(
    null,
  );
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");
  const [hoveredRating, setHoveredRating] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (routeActivityId === null) {
      setIsLoading(false);
      setError("Activity not found.");
      return;
    }

    let ignore = false;

    setIsLoading(true);
    setError(null);

    fetchActivityReview(routeActivityId)
      .then((response) => {
        if (ignore) {
          return;
        }

        setReviewData(response);
        setRating(response.review?.rating ?? 0);
        setReview(response.review?.review ?? "");
      })
      .catch((fetchError) => {
        if (!ignore) {
          setError(
            fetchError instanceof Error
              ? fetchError.message
              : "Unable to load review.",
          );
        }
      })
      .finally(() => {
        if (!ignore) {
          setIsLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [routeActivityId]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (routeActivityId === null || rating === 0) {
      setError("Choose a rating from 1 to 5 stars.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await submitActivityReview(routeActivityId, {
        rating,
        review,
      });

      navigate("/feed?notifications=1&reviewSubmitted=1");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to save review.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayRating = hoveredRating || rating;
  const hasExistingReview = Boolean(reviewData?.review);

  return (
    <div className="relative flex h-full min-h-0 flex-col bg-background">
      <div className="flex items-center gap-3 px-4 pb-3 pt-5">
        <button
          type="button"
          onClick={() => navigate("/activities")}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary"
          aria-label="Back to activities"
        >
          <ChevronLeft size={17} className="text-foreground" />
        </button>
        <h2 className="min-w-0 flex-1 truncate text-base font-semibold text-foreground">
          Activity review
        </h2>
        <button
          type="button"
          onClick={() => navigate("/activities")}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary"
          aria-label="Close review"
        >
          <X size={16} className="text-muted-foreground" />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto px-4 pb-6 scrollbar-minimal">
        <form
          onSubmit={handleSubmit}
          className="w-full rounded-3xl border border-border bg-card p-5 shadow-2xl shadow-black/10"
        >
          {isLoading ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
              <Loader2 size={20} className="animate-spin text-accent" />
              Loading review
            </div>
          ) : (
            <>
              <div className="text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-accent">
                  <Star size={22} fill="currentColor" stroke="none" />
                </div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Thanks for attending
                </p>
                <h1 className="mt-2 text-xl font-bold leading-tight text-foreground">
                  {reviewData?.activity.title ?? "Review this activity"}
                </h1>
              </div>

              <div className="mt-6">
                <p className="mb-3 text-center text-sm font-semibold text-foreground">
                  How was it?
                </p>
                <div
                  className="flex justify-center gap-2"
                  onMouseLeave={() => setHoveredRating(0)}
                >
                  {[1, 2, 3, 4, 5].map((starValue) => {
                    const active = starValue <= displayRating;

                    return (
                      <button
                        key={starValue}
                        type="button"
                        onClick={() => setRating(starValue)}
                        onMouseEnter={() => setHoveredRating(starValue)}
                        className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary transition-transform active:scale-95"
                        aria-label={`${starValue} star${starValue === 1 ? "" : "s"}`}
                      >
                        <Star
                          size={25}
                          fill={active ? "var(--brand-yellow)" : "none"}
                          stroke={
                            active
                              ? "var(--brand-yellow)"
                              : "var(--muted-foreground)"
                          }
                        />
                      </button>
                    );
                  })}
                </div>
              </div>

              <label className="mt-6 block">
                <span className="mb-2 block text-sm font-semibold text-foreground">
                  Short description
                </span>
                <textarea
                  value={review}
                  onChange={(event) => setReview(event.target.value)}
                  maxLength={500}
                  rows={5}
                  className="w-full resize-none rounded-2xl border border-border bg-input-background px-3 py-3 text-sm leading-relaxed text-foreground outline-none placeholder:text-muted-foreground focus:border-accent"
                  placeholder="Share a quick note about your experience."
                />
                <span className="mt-1 block text-right text-[10px] font-semibold text-muted-foreground">
                  {review.length}/500
                </span>
              </label>

              {error && (
                <p className="mt-3 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive-foreground">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting || rating === 0}
                className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-accent px-4 text-sm font-bold text-accent-foreground transition-transform active:scale-[0.98] disabled:opacity-70"
              >
                {isSubmitting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Send size={16} />
                )}
                {hasExistingReview ? "Edit review" : "Submit review"}
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
