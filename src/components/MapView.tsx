"use client";

import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { useEffect } from "react";
import "leaflet/dist/leaflet.css";

type MarkerData = {
  id: number | string;
  lat: number;
  lng: number;
  label?: string;
  sublabel?: string;
  selected?: boolean;
};

type Props = {
  center: { lat: number; lng: number };
  markers: MarkerData[];
  height?: number;
  onSelect?: (id: number | string) => void;
};

// Fix de íconos (evita bundling de PNGs locales)
const iconUrl =
  "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png";
const iconRetinaUrl =
  "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png";
const shadowUrl =
  "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png";
L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl });

function FlyTo({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], Math.max(map.getZoom(), 12), { duration: 0.6 });
  }, [lat, lng, map]);
  return null;
}

export default function MapView({
  center,
  markers,
  height = 360,
  onSelect,
}: Props) {
  const selected = markers.find((m) => m.selected);

  return (
    <div style={{ height }}>
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={12}
        scrollWheelZoom
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {selected && <FlyTo lat={selected.lat} lng={selected.lng} />}

        {markers.map((m) => (
          <Marker
            key={String(m.id)}
            position={[m.lat, m.lng]}
            eventHandlers={{ click: () => onSelect?.(m.id) }}
          >
            <Popup>
              <div className="text-sm">
                <div className="font-medium">{m.label ?? "Proveedor"}</div>
                {m.sublabel && (
                  <div className="text-gray-600">{m.sublabel}</div>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
