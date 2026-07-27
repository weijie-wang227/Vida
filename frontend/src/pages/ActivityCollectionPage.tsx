import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { fetchActivityCollection } from "../api";
import { BaseActivityListPage } from "../components/BaseActivityListPage";
import {
  getActivityCollection,
  type ActivityCollection,
} from "../lib/activityCollections";
import type { Activity } from "../lib/types";

export function ActivityCollectionPage() {
  const navigate = useNavigate();
  const { collection: collectionId } = useParams();
  const collection = getActivityCollection(collectionId);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadCollection = useCallback(
    async (selectedCollection: ActivityCollection) => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        setActivities(await fetchActivityCollection(selectedCollection.id));
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : `Unable to load ${selectedCollection.title.toLowerCase()}.`,
        );
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (!collection) {
      setIsLoading(false);
      setErrorMessage("Unknown activity collection.");
      return;
    }

    void loadCollection(collection);
  }, [collection, loadCollection]);

  return (
    <BaseActivityListPage
      title={collection?.title ?? "Activity collection"}
      activities={activities}
      isLoading={isLoading}
      errorMessage={errorMessage}
      emptyMessage={
        collection?.emptyMessage ?? "This activity collection is unavailable."
      }
      onBack={() => navigate("/activities")}
      onRetry={() => collection && void loadCollection(collection)}
    />
  );
}
