import { useEffect } from "react";
import { Loader2, LocateFixed, MapPin } from "lucide-react";
import {
  CircleMarker,
  MapContainer,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import { BaseSearchBar } from "../BaseSearchBar";
import { singaporeCenter, type PhotonSearchResult } from "./types";

function ResizeMap() {
  const map = useMap();

  useEffect(() => {
    window.setTimeout(() => map.invalidateSize(), 80);
  }, [map]);

  return null;
}

function CenterSelectedLocation({
  selectedPosition,
}: {
  selectedPosition: [number, number] | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (selectedPosition) {
      map.setView(selectedPosition, Math.max(map.getZoom(), 14), {
        animate: true,
      });
    }
  }, [map, selectedPosition]);

  return null;
}

function LocationPicker({
  selectedPosition,
  onSelectPosition,
}: {
  selectedPosition: [number, number] | null;
  onSelectPosition: (position: [number, number]) => void;
}) {
  useMapEvents({
    click(event) {
      onSelectPosition([event.latlng.lat, event.latlng.lng]);
    },
  });

  if (!selectedPosition) {
    return null;
  }

  return (
    <CircleMarker
      center={selectedPosition}
      pathOptions={{
        color: "#ffffff",
        fillColor: "var(--accent)",
        fillOpacity: 1,
        weight: 2,
      }}
      radius={9}
    />
  );
}

export function LocationSection({
  selectedPosition,
  locationQuery,
  locationSuggestions,
  isSearchingLocation,
  locationSearchError,
  onClearLocationQuery,
  onDebouncedLocationQueryChange,
  onLocationQueryChange,
  onSelectMapPosition,
  onSelectSearchLocation,
}: {
  selectedPosition: [number, number] | null;
  locationQuery: string;
  locationSuggestions: PhotonSearchResult[];
  isSearchingLocation: boolean;
  locationSearchError: string | null;
  onClearLocationQuery: () => void;
  onDebouncedLocationQueryChange: (query: string) => void;
  onLocationQueryChange: (query: string) => void;
  onSelectMapPosition: (position: [number, number]) => void;
  onSelectSearchLocation: (result: PhotonSearchResult) => void;
}) {
  return (
    <div className="mb-4 overflow-hidden rounded-2xl border border-border bg-secondary">
      <div className="border-b border-border bg-card p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-muted-foreground">
            Location Search
          </span>
          {locationQuery && (
            <button
              type="button"
              onClick={onClearLocationQuery}
              className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
            >
              Clear
            </button>
          )}
        </div>
        <BaseSearchBar
          value={locationQuery}
          onValueChange={onLocationQueryChange}
          onDebouncedQueryChange={onDebouncedLocationQueryChange}
          placeholder="Search a place in Singapore"
          ariaLabel="Search a place in Singapore"
          className="flex h-11 items-center gap-2 rounded-xl border border-border bg-input-background px-3"
          iconSize={18}
          endAdornment={
            isSearchingLocation ? (
              <Loader2
                size={15}
                className="flex-shrink-0 animate-spin text-accent"
              />
            ) : null
          }
        />

        {locationSearchError && (
          <p className="mt-2 text-[11px] text-destructive-foreground">
            {locationSearchError}
          </p>
        )}

        {locationSuggestions.length > 0 && (
          <div className="mt-2 max-h-40 overflow-y-auto rounded-xl border border-border bg-background scrollbar-minimal">
            {locationSuggestions.map((result) => (
              <button
                key={`${result.x}-${result.y}-${result.label}`}
                type="button"
                onClick={() => onSelectSearchLocation(result)}
                className="flex w-full items-center gap-2 border-b border-border px-3 py-2 text-left last:border-b-0 active:bg-secondary"
              >
                <MapPin size={13} className="flex-shrink-0 text-accent" />
                <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">
                  {result.label}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="h-52">
        <MapContainer
          center={singaporeCenter}
          zoom={12}
          minZoom={11}
          maxZoom={16}
          scrollWheelZoom
          className="h-full w-full"
          zoomControl={false}
        >
          <ResizeMap />
          <CenterSelectedLocation selectedPosition={selectedPosition} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <LocationPicker
            selectedPosition={selectedPosition}
            onSelectPosition={onSelectMapPosition}
          />
        </MapContainer>
      </div>
      <div className="flex items-center gap-2 px-3 py-2">
        <LocateFixed size={14} className="text-accent" />
        <p className="min-w-0 flex-1 text-[11px] text-muted-foreground">
          {selectedPosition
            ? `${selectedPosition[0].toFixed(5)}, ${selectedPosition[1].toFixed(5)}`
            : "Search for a place or tap the map to pin the activity location"}
        </p>
      </div>
    </div>
  );
}
