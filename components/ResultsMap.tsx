"use client";

import {
  useEffect,
  useRef,
} from "react";

type Location = {
  name: string;
  lat: number;
  lng: number;
};

type Cafe = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
};

type ResultsMapProps = {
  yourLocation: Location;
  theirLocation: Location;
  cafes: Cafe[];
  selectedCafeId: string | null;
};

export default function ResultsMap({
  yourLocation,
  theirLocation,
  cafes,
  selectedCafeId,
}: ResultsMapProps) {
  const mapRef =
    useRef<HTMLDivElement | null>(
      null
    );

  const mapInstanceRef =
    useRef<google.maps.Map | null>(
      null
    );

  const markersRef =
    useRef<
      google.maps.Marker[]
    >([]);

  useEffect(() => {
    if (!mapRef.current) {
      return;
    }

    if (
      typeof window ===
        "undefined" ||
      !window.google?.maps
    ) {
      return;
    }

    const center = {
      lat:
        (yourLocation.lat +
          theirLocation.lat) /
        2,

      lng:
        (yourLocation.lng +
          theirLocation.lng) /
        2,
    };

    const map =
      new google.maps.Map(
        mapRef.current,
        {
          center,
          zoom: 12,
          zoomControl: true,
          streetViewControl:
            false,
          mapTypeControl:
            false,
          fullscreenControl:
            false,
        }
      );

    mapInstanceRef.current =
      map;

    const bounds =
      new google.maps.LatLngBounds();

    bounds.extend({
      lat: yourLocation.lat,
      lng: yourLocation.lng,
    });

    bounds.extend({
      lat: theirLocation.lat,
      lng: theirLocation.lng,
    });

    new google.maps.Marker({
      map,
      position: {
        lat:
          yourLocation.lat,
        lng:
          yourLocation.lng,
      },
      title: "You",
      label: "Y",
    });

    new google.maps.Marker({
      map,
      position: {
        lat:
          theirLocation.lat,
        lng:
          theirLocation.lng,
      },
      title: "Them",
      label: "T",
    });

    markersRef.current =
      cafes.map(
        (
          cafe,
          index
        ) => {
          const position = {
            lat:
              cafe.latitude,
            lng:
              cafe.longitude,
          };

          bounds.extend(
            position
          );

          return new google.maps.Marker(
            {
              map,
              position,
              title:
                cafe.name,

              label: {
                text:
                  String(
                    index + 1
                  ),

                color:
                  "#ffffff",

                fontWeight:
                  "600",
              },

              icon: {
                path:
                  google.maps
                    .SymbolPath
                    .CIRCLE,

                scale:
                  13,

                fillColor:
                  cafe.id ===
                  selectedCafeId
                    ? "#8a5a41"
                    : "#26241f",

                fillOpacity:
                  1,

                strokeColor:
                  "#f6f3ee",

                strokeWeight:
                  2,
              },

              zIndex:
                cafe.id ===
                selectedCafeId
                  ? 100
                  : 10,
            }
          );
        }
      );

    map.fitBounds(
      bounds,
      50
    );
  }, [
    yourLocation,
    theirLocation,
    cafes,
  ]);

  useEffect(() => {
    if (
      !mapInstanceRef.current ||
      !selectedCafeId
    ) {
      return;
    }

    const selectedIndex =
      cafes.findIndex(
        (cafe) =>
          cafe.id ===
          selectedCafeId
      );

    if (
      selectedIndex === -1
    ) {
      return;
    }

    const selectedCafe =
      cafes[
        selectedIndex
      ];

    mapInstanceRef.current.panTo({
      lat:
        selectedCafe.latitude,
      lng:
        selectedCafe.longitude,
    });

    mapInstanceRef.current.setZoom(
      14
    );

    markersRef.current.forEach(
      (
        marker,
        index
      ) => {
        const isSelected =
          index ===
          selectedIndex;

        marker.setIcon({
          path:
            google.maps
              .SymbolPath
              .CIRCLE,

          scale:
            isSelected
              ? 15
              : 12,

          fillColor:
            isSelected
              ? "#8a5a41"
              : "#26241f",

          fillOpacity: 1,

          strokeColor:
            "#f6f3ee",

          strokeWeight:
            isSelected
              ? 3
              : 2,
        });

        marker.setZIndex(
          isSelected
            ? 100
            : 10
        );
      }
    );
  }, [
    selectedCafeId,
    cafes,
  ]);

  return (
    <div
      ref={mapRef}
      style={{
        width: "100%",
        height: "430px",
        minHeight:
          "430px",
      }}
    />
  );
}