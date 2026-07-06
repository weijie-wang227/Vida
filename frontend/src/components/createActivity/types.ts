import type { vidaCategory } from "../../lib/types";

export type CreateActivityModalProps = {
  open: boolean;
  onClose: () => void;
};

export type CreateActivityFormState = {
  title: string;
  date: string;
  time: string;
  location: string;
  durationMinutes: string;
  spots: string;
  credits: string;
  categories: vidaCategory[];
  linkedGroupId: string;
};

export type PhotonFeature = {
  bbox?: [number, number, number, number];
  geometry: {
    coordinates: [number, number];
  };
  properties: {
    city?: string;
    country?: string;
    district?: string;
    housenumber?: string;
    name?: string;
    postcode?: string;
    state?: string;
    street?: string;
  };
};

export type PhotonResponse = {
  features: PhotonFeature[];
};

export type PhotonSearchResult = {
  bounds: [[number, number], [number, number]] | null;
  label: string;
  raw: PhotonFeature;
  x: number;
  y: number;
};

export const singaporeCenter: [number, number] = [1.335, 103.86];

export const initialFormState: CreateActivityFormState = {
  title: "",
  date: "",
  time: "",
  location: "",
  durationMinutes: "60",
  spots: "8",
  credits: "0",
  categories: ["social"],
  linkedGroupId: "",
};
