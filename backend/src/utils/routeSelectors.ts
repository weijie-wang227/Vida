import { Types } from "mongoose";

export function getMockOrObjectIdSelector(id: string) {
  const selector: Record<string, any>[] = [];
  const mockId = Number(id);

  if (Number.isInteger(mockId)) {
    selector.push({ mockId });
  }

  if (Types.ObjectId.isValid(id)) {
    selector.push({ _id: id });
  }

  return selector;
}

export function getActivitySelector(activityId: string) {
  return getMockOrObjectIdSelector(activityId);
}

export function getSessionSelector(sessionId: string) {
  return getMockOrObjectIdSelector(sessionId);
}
