"use client";

import { useEffect, useRef } from "react";

type Location = {
  name: string;
  address: string;
  lat: number;
  lng: number;
};

type Props = {
  placeholder: string;
  onPlaceSelected: (location: Location) => void;
};

export default function LocationAutocomplete({
  placeholder,
  onPlaceSelected,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function initialiseAutocomplete() {
      const { setOptions, importLibrary } = await import(
        "@googlemaps/js-api-loader"
      );

      setOptions({
        key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
        v: "weekly",
      });

      const placesLibrary = await importLibrary("places");

      const { PlaceAutocompleteElement } =
        placesLibrary as google.maps.PlacesLibrary;

      const autocomplete = new PlaceAutocompleteElement();

      autocomplete.placeholder = placeholder;
      autocomplete.style.width = "100%";

      autocomplete.addEventListener(
        "gmp-select",
        async (event: any) => {
          const place = event.placePrediction.toPlace();

          await place.fetchFields({
            fields: [
              "displayName",
              "formattedAddress",
              "location",
            ],
          });

          if (!place.location) return;

          onPlaceSelected({
            name: place.displayName || "",
            address: place.formattedAddress || "",
            lat: place.location.lat(),
            lng: place.location.lng(),
          });
        }
      );

      if (containerRef.current) {
        containerRef.current.innerHTML = "";
        containerRef.current.appendChild(autocomplete);
      }
    }

    initialiseAutocomplete();
  }, [placeholder, onPlaceSelected]);

  return <div ref={containerRef} />;
}