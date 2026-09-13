"use client";

import {
  useEffect,
  useRef,
} from "react";

import {
  importLibrary,
  setOptions,
} from "@googlemaps/js-api-loader";

let googleLoaderConfigured = false;

type SelectedLocation = {
  name: string;
  address: string;
  lat: number;
  lng: number;
};

type LocationAutocompleteProps = {
  placeholder: string;
  onPlaceSelected: (
    location: SelectedLocation
  ) => void;
  scrollMarginTop?: string;
};

export default function LocationAutocomplete({
  placeholder,
  onPlaceSelected,
  scrollMarginTop = "120px",
}: LocationAutocompleteProps) {
  const containerRef =
    useRef<HTMLDivElement | null>(
      null
    );

  useEffect(() => {
    let cancelled = false;

    let autocompleteElement:
      | google.maps.places.PlaceAutocompleteElement
      | null = null;

    async function initialiseAutocomplete() {
      if (
        typeof window ===
        "undefined"
      ) {
        return;
      }

      if (
        !googleLoaderConfigured
      ) {
        setOptions({
          key:
            process.env
              .NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
          v: "weekly",
        });

        googleLoaderConfigured =
          true;
      }

      if (
        !containerRef.current
      ) {
        return;
      }

      try {
        const {
          PlaceAutocompleteElement,
        } =
          (await importLibrary(
            "places"
          )) as google.maps.PlacesLibrary;

        if (
          cancelled ||
          !containerRef.current
        ) {
          return;
        }

        autocompleteElement =
          new PlaceAutocompleteElement({
            placeholder,
          });

        /*
          Important mobile sizing fixes
        */
        autocompleteElement.style.display =
          "block";

        autocompleteElement.style.width =
          "100%";

        autocompleteElement.style.maxWidth =
          "100%";

        autocompleteElement.style.minWidth =
          "0";

        autocompleteElement.style.boxSizing =
          "border-box";

        autocompleteElement.style.border =
          "none";

        autocompleteElement.style.outline =
          "none";

        autocompleteElement.style.background =
          "transparent";

        containerRef.current.innerHTML =
          "";

        containerRef.current.appendChild(
          autocompleteElement
        );

        autocompleteElement.addEventListener(
          "gmp-select",
          async (
            event: Event
          ) => {
            const placeEvent =
              event as google.maps.places.PlacePredictionSelectEvent;

            const place =
              placeEvent.placePrediction.toPlace();

            await place.fetchFields({
              fields: [
                "displayName",
                "formattedAddress",
                "location",
              ],
            });

            if (
              !place.location
            ) {
              return;
            }

            onPlaceSelected({
              name:
                place.displayName ||
                place.formattedAddress ||
                "Selected location",

              address:
                place.formattedAddress ||
                "",

              lat:
                place.location.lat(),

              lng:
                place.location.lng(),
            });
          }
        );
      } catch (error) {
        console.error(
          "Google autocomplete failed:",
          error
        );
      }
    }

    initialiseAutocomplete();

    return () => {
      cancelled = true;

      if (
        containerRef.current
      ) {
        containerRef.current.innerHTML =
          "";
      }
    };
  }, [
    placeholder,
    onPlaceSelected,
  ]);

<div
  ref={containerRef}
  className="relative z-50 w-full min-w-0 max-w-full"
  style={{
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
scrollMarginTop,  }}
/>
  );
}