import { Star } from "lucide-react";

export function RatingStars({ rating }: { rating: number }) {
  return (
    <span className="review-stars" aria-label={`${rating} stars`}>
      {[1, 2, 3, 4, 5].map((starValue) => (
        <Star
          key={starValue}
          size={15}
          fill={starValue <= rating ? "currentColor" : "none"}
        />
      ))}
    </span>
  );
}
