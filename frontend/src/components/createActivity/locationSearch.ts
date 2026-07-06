import {
  singaporeCenter,
  type PhotonFeature,
  type PhotonResponse,
  type PhotonSearchResult,
} from "./types";

function getPhotonLabel(feature: PhotonFeature): string {
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

export async function searchPhotonLocations(
  query: string,
): Promise<PhotonSearchResult[]> {
  const params = new URLSearchParams({
    bbox: "103.59,1.16,104.1,1.48",
    lang: "en",
    lat: String(singaporeCenter[0]),
    limit: "5",
    lon: String(singaporeCenter[1]),
    q: query,
  });

  const response = await fetch(`https://photon.komoot.io/api/?${params.toString()}`);
  const data = (await response.json()) as PhotonResponse;

  return data.features.map((feature) => {
    const [longitude, latitude] = feature.geometry.coordinates;
    const [minLongitude, minLatitude, maxLongitude, maxLatitude] =
      feature.bbox || [longitude, latitude, longitude, latitude];

    return {
      bounds: [
        [minLatitude, minLongitude],
        [maxLatitude, maxLongitude],
      ],
      label: getPhotonLabel(feature),
      raw: feature,
      x: longitude,
      y: latitude,
    };
  });
}
