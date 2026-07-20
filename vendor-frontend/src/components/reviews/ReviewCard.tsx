import type { ActivityReview } from "../../api/types";
import { RatingStars } from "./RatingStars";

export function ReviewCard({ review }: { review: ActivityReview }) {
  const senderName = review.sender?.name ?? "Anonymous attendee";
  const senderHandle = review.sender?.handle ? `@${review.sender.handle}` : "";

  return (
    <article className="review-card">
      {review.sender?.avatar ? (
        <img src={review.sender.avatar} alt={senderName} />
      ) : (
        <div className="review-card__avatar">
          {senderName.slice(0, 1).toUpperCase()}
        </div>
      )}

      <div>
        <div className="review-card__header">
          <div>
            <strong>{senderName}</strong>
            {senderHandle && <span>{senderHandle}</span>}
          </div>
          <RatingStars rating={review.rating} />
        </div>

        <p className={review.review ? "" : "review-card__empty"}>
          {review.review || "No written review."}
        </p>
      </div>
    </article>
  );
}
