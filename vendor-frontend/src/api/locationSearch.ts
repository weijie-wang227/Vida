type PhotonFeature = {
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
    state?: string;
    street?: string;
  };
};

type PhotonResponse = {
  features: PhotonFeature[];
};

export type LocationSearchResult = {
  label: string;
  latitude: number;
  longitude: number;
};

const singaporeCenter = {
  latitude: 1.3521,
  longitude: 103.8198,
};

function getPhotonLabel(feature: PhotonFeature) {
  const { properties } = feature;
  const streetAddress = [properties.housenumber, properties.street]
    .filter(Boolean)
    .join(" ");
  const parts = [
    properties.name || streetAddress,
    properties.district,
    properties.city,
    properties.state,
    properties.country,
  ].filter(Boolean);

  return Array.from(new Set(parts)).join(", ");
}

export async function searchLocations(query: string) {
  const params = new URLSearchParams({
    bbox: "103.59,1.16,104.1,1.48",
    lang: "en",
    lat: String(singaporeCenter.latitude),
    limit: "5",
    lon: String(singaporeCenter.longitude),
    q: query,
  });
  const response = await fetch(`https://photon.komoot.io/api/?${params.toString()}`);

  if (!response.ok) {
    throw new Error("Unable to search places right now.");
  }

  const data = (await response.json()) as PhotonResponse;

  return data.features.map((feature) => {
    const [longitude, latitude] = feature.geometry.coordinates;

    return {
      label: getPhotonLabel(feature),
      latitude,
      longitude,
    };
  });
}
