"use client";

import { useEffect, useRef } from "react";
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
};

export default function LocationAutocomplete({
  placeholder,
  onPlaceSelected,
}: LocationAutocompleteProps) {
  const containerRef =
    useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    let autocompleteElement:
      | google.maps.places.PlaceAutocompleteElement
      | null = null;

    let firstScrollTimeout:
      | ReturnType<typeof setTimeout>
      | undefined;

    let secondScrollTimeout:
      | ReturnType<typeof setTimeout>
      | undefined;


      }

      const container =
        containerRef.current;

      if (!container) {
        return;
      }

      const scrollToInput = () => {
        const element =
          containerRef.current;

        if (!element) {
          return;
        }

        const rect =
          element.getBoundingClientRect();

        /*
          Place the active location field
          roughly 120px below the top
          of the visible page.
        */
        const targetPosition =
          window.scrollY +
          rect.top -
          120;

        window.scrollTo({
          top: Math.max(
            0,
            targetPosition
          ),
          behavior: "smooth",
        });
      };

      /*
        Scroll once immediately...
      */
      requestAnimationFrame(
        scrollToInput
      );

      /*
        ...then again after the iPhone
        keyboard has started opening.
      */
      firstScrollTimeout =
        setTimeout(
          scrollToInput,
          300
        );

      /*
        One final adjustment after
        Safari has resized the viewport.
      */
      secondScrollTimeout =
        setTimeout(
          scrollToInput,
          650
        );
    }

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

        /*
          Explicitly reposition the page
          whenever Google autocomplete
          receives focus.
        */
const bringInputIntoView = () => {
  if (window.innerWidth > 640) return;

  const element = containerRef.current;
  if (!element) return;

  const rect = element.getBoundingClientRect();

  const targetY =
    window.scrollY +
    rect.top -
    80;

  window.scrollTo({
    top: Math.max(0, targetY),
    behavior: "auto",
  });
};

autocompleteElement.addEventListener(
  "pointerdown",
  bringInputIntoView
);

autocompleteElement.addEventListener(
  "focusin",
  () => {
    setTimeout(
      bringInputIntoView,
      50
    );

    setTimeout(
      bringInputIntoView,
      350
    );
  }
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
              console.error(
                "Selected place has no location."
              );

              return;
            }

            const selectedLocation:
              SelectedLocation = {
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
            };

            onPlaceSelected(
              selectedLocation
            );
          }
        );
      } catch (error) {
        console.error(
          "Google autocomplete failed to initialise:",
          error
        );
      }
    }

    initialiseAutocomplete();

    return () => {
      cancelled = true;

      if (
        firstScrollTimeout
      ) {
        clearTimeout(
          firstScrollTimeout
        );
      }

      if (
        secondScrollTimeout
      ) {
        clearTimeout(
          secondScrollTimeout
        );
      }

      if (
        autocompleteElement
      ) {
        autocompleteElement.removeEventListener(
          "focusin",
          positionInputOnMobile
        );

        autocompleteElement.removeEventListener(
          "pointerdown",
          positionInputOnMobile
        );
      }

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

  return (
    <div
      ref={containerRef}
      className="relative z-50 w-full min-w-0 max-w-full"
      style={{
        width: "100%",
        maxWidth: "100%",
        minWidth: 0,
      }}
    />
  );
}