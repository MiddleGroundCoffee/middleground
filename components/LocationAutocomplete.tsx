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

    let scrollTimeout1:
      | ReturnType<typeof setTimeout>
      | undefined;

    let scrollTimeout2:
      | ReturnType<typeof setTimeout>
      | undefined;

    let scrollTimeout3:
      | ReturnType<typeof setTimeout>
      | undefined;

    /*
      Keeps the active autocomplete field visible
      when the iPhone keyboard opens.

      We position the field around 90px from the
      top of the visible viewport so the user can
      still see what they are typing.
    */
    function keepInputVisible() {
      if (
        typeof window === "undefined" ||
        window.innerWidth > 640
      ) {
        return;
      }

      const container =
        containerRef.current;

      if (!container) {
        return;
      }

      const rect =
        container.getBoundingClientRect();

      const visualViewport =
        window.visualViewport;

      const viewportOffsetTop =
        visualViewport?.offsetTop ?? 0;

      const desiredTop =
        viewportOffsetTop + 90;

      const difference =
        rect.top - desiredTop;

      /*
        Only move the page when the field
        is noticeably away from where we
        want it.
      */
      if (Math.abs(difference) < 10) {
        return;
      }

      window.scrollBy({
        top: difference,
        left: 0,
        behavior: "auto",
      });
    }

    function handlePointerDown() {
      if (window.innerWidth > 640) {
        return;
      }

      /*
        Position the field before Safari
        starts opening the keyboard.
      */
      keepInputVisible();

      scrollTimeout1 =
        setTimeout(
          keepInputVisible,
          50
        );
    }

    function handleFocusIn() {
      if (window.innerWidth > 640) {
        return;
      }

      /*
        Safari changes the visual viewport
        several times while the keyboard
        animates in.

        Re-check the position at each stage.
      */
      keepInputVisible();

      scrollTimeout1 =
        setTimeout(
          keepInputVisible,
          100
        );

      scrollTimeout2 =
        setTimeout(
          keepInputVisible,
          350
        );

      scrollTimeout3 =
        setTimeout(
          keepInputVisible,
          700
        );
    }

    function handleViewportChange() {
      if (window.innerWidth > 640) {
        return;
      }

      /*
        Only adjust if this autocomplete
        currently contains the focused item.
      */
      const container =
        containerRef.current;

      if (!container) {
        return;
      }

      /*
        Give Safari a moment to complete
        its viewport resize before adjusting.
      */
      window.requestAnimationFrame(
        keepInputVisible
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

        /*
          Prevent Google's web component
          from overflowing its flex parent
          on mobile.
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

        /*
          Mobile focus handling.
        */
        autocompleteElement.addEventListener(
          "pointerdown",
          handlePointerDown
        );

        autocompleteElement.addEventListener(
          "focusin",
          handleFocusIn
        );

        /*
          Reposition again whenever the
          iPhone keyboard changes the size
          of the visible viewport.
        */
        window.visualViewport?.addEventListener(
          "resize",
          handleViewportChange
        );

        /*
          Handle selected Google place.
        */
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

            if (!place.location) {
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

      if (scrollTimeout1) {
        clearTimeout(
          scrollTimeout1
        );
      }

      if (scrollTimeout2) {
        clearTimeout(
          scrollTimeout2
        );
      }

      if (scrollTimeout3) {
        clearTimeout(
          scrollTimeout3
        );
      }

      window.visualViewport?.removeEventListener(
        "resize",
        handleViewportChange
      );

      if (
        autocompleteElement
      ) {
        autocompleteElement.removeEventListener(
          "pointerdown",
          handlePointerDown
        );

        autocompleteElement.removeEventListener(
          "focusin",
          handleFocusIn
        );
      }

      if (
        containerRef.current
      ) {
        containerRef.current.innerHTML =
          "";
      }

      autocompleteElement = null;
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