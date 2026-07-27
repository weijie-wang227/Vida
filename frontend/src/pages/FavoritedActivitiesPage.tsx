import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { fetchFavoriteActivities } from "../api";
import { BaseActivityListPage } from "../components/BaseActivityListPage";
import type { Activity } from "../lib/types";

export function FavoritedActivitiesPage() {
  const navigate = useNavigate();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadFavorites = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      setActivities(await fetchFavoriteActivities());
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to load favorited activities.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadFavorites();
  }, [loadFavorites]);

  return (
    <BaseActivityListPage
      title="Favorited Activities"
      activities={activities}
      isLoading={isLoading}
      errorMessage={errorMessage}
      emptyMessage="Activities you favorite will appear here."
      onBack={() => navigate("/activities")}
      onRetry={() => void loadFavorites()}
      onFavoriteChanged={(activity, favorited) => {
        if (!favorited) {
          setActivities((current) =>
            current.filter((item) => item.id !== activity.id),
          );
        }
      }}
    />
  );
}
