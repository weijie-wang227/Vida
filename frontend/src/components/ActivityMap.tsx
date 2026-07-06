import { ChevronDown } from "lucide-react";
import type { LatLngExpression } from "leaflet";
import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";
import {
  categoryIcon,
  primaryActivityCategory,
  vidaCategories,
  vidaCategoryColor,
  vidaCategoryLabel,
} from "../lib/activityPresentation";
import type { MapPin } from "../lib/types";
import { useAppState } from "../state";

const singaporeCenter: LatLngExpression = [1.335, 103.86];
const userLocation: LatLngExpression = [1.321, 103.845];

function getPinPosition(pin: MapPin): LatLngExpression {
  return [pin.latitude, pin.longitude];
}

export function ActivityMap({ onClose }: { onClose: () => void }) {
  const { mapPins, openActivity } = useAppState();

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            Nearby Activities
          </h2>
          <p className="text-[11px] text-muted-foreground">
            Singapore / {mapPins.length} activities near you
          </p>
        </div>
        <button
          onClick={onClose}
          className="flex items-center gap-1 text-accent text-xs font-medium"
        >
          <ChevronDown size={14} />
          List
        </button>
      </div>

      <div className="flex-1 relative overflow-hidden bg-secondary mx-3 rounded-2xl">
        <MapContainer
          center={singaporeCenter}
          zoom={12}
          minZoom={11}
          maxZoom={16}
          scrollWheelZoom
          className="h-full w-full"
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <CircleMarker
            center={userLocation}
            pathOptions={{
              color: "#ffffff",
              fillColor: "#3b82f6",
              fillOpacity: 1,
              weight: 2,
            }}
            radius={8}
          >
            <Popup>You are here</Popup>
          </CircleMarker>

          {mapPins.map((pin) => {
            const primaryCategory = primaryActivityCategory(pin.categories);
            const color = vidaCategoryColor[primaryCategory];

            return (
              <CircleMarker
                key={pin.id}
                center={getPinPosition(pin)}
                eventHandlers={{
                  click: () => openActivity(pin.activityId),
                }}
                pathOptions={{
                  color,
                  fillColor: pin.premium ? color : "#302c40",
                  fillOpacity: 0.95,
                  weight: 2,
                }}
                radius={pin.premium ? 10 : 8}
              >
                <Popup>
                  <div className="min-w-36">
                    <p className="mb-1 text-xs font-semibold text-zinc-900">
                      {pin.label}
                    </p>
                    <button
                      onClick={() => openActivity(pin.activityId)}
                      className="rounded-md bg-zinc-900 px-2 py-1 text-[11px] font-semibold text-white"
                    >
                      View activity
                    </button>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>

      <div className="px-4 py-3 flex gap-3 overflow-x-auto scrollbar-minimal">
        {vidaCategories.map((category) => (
          <div
            key={category}
            className="flex items-center gap-1.5 flex-shrink-0"
          >
            <div
              className="w-4 h-4 rounded-full flex items-center justify-center"
              style={{
                backgroundColor: `${vidaCategoryColor[category]}22`,
                color: vidaCategoryColor[category],
              }}
            >
              {categoryIcon(category, 9)}
            </div>
            <span className="text-[10px] text-muted-foreground capitalize">
              {vidaCategoryLabel[category]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
