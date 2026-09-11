"use client";

import { useState } from "react";

import LocationAutocomplete
  from "@/components/LocationAutocomplete";

import {
  isChainCafe,
  calculateCafeQualityPenalty,
  calculateWalkingPenalty,
  calculatePreferencePenalty,
  calculateCafeScore,
} from "@/lib/ranking";


type Location = {
  name: string;
  address: string;
  lat: number;
  lng: number;
};


type Midpoint = {
  lat: number;
  lng: number;
};


type Cafe = {
  id: string;

  displayName?: {
    text?: string;
  };

  formattedAddress?: string;

  rating?: number;

  userRatingCount?: number;

  location?: {
    latitude: number;
    longitude: number;
  };

  timeA?: number;
  timeB?: number;

  averageTravelTime?: number;

  fairnessDifference?: number;

  cafeQualityPenalty?: number;

  walkingPenalty?: number;

  preferencePenalty?: number;

  score?: number;

  isChain?: boolean;
};


function durationToMinutes(
  duration?: string
) {
  if (!duration) return null;

  const seconds = parseFloat(
    duration.replace("s", "")
  );

  return Math.round(seconds / 60);
}


export default function Home() {

  const [
    yourLocation,
    setYourLocation,
  ] =
    useState<Location | null>(null);


  const [
    theirLocation,
    setTheirLocation,
  ] =
    useState<Location | null>(null);


  const [
    travelMode,
    setTravelMode,
  ] =
    useState("Public transport");


  const [
    message,
    setMessage,
  ] =
    useState("");


  const [
    midpoint,
    setMidpoint,
  ] =
    useState<Midpoint | null>(null);


  const [
    cafes,
    setCafes,
  ] =
    useState<Cafe[]>([]);



  async function handleSearch() {
  if (!yourLocation || !theirLocation) {
    setMessage("Please select both locations.");
    return;
  }

  const midpointLat =
    (yourLocation.lat + theirLocation.lat) / 2;

  const midpointLng =
    (yourLocation.lng + theirLocation.lng) / 2;

  setMidpoint({
    lat: midpointLat,
    lng: midpointLng,
  });

  setMessage("Finding independent coffee shops...");
  setCafes([]);

  try {
    // 1. Find cafes near the midpoint
    const cafeResponse = await fetch("/api/cafes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        lat: midpointLat,
        lng: midpointLng,
      }),
    });

    const cafeData = await cafeResponse.json();

    if (!cafeResponse.ok) {
      setMessage(
        cafeData.details ||
          cafeData.error ||
          "Cafe search failed."
      );
      return;
    }

    const allCafes: Cafe[] =
      cafeData.places || [];

    // 2. Remove known chains
    const independentCafes =
      allCafes.filter((cafe) => {
        const name =
          cafe.displayName?.text;

        return !isChainCafe(name);
      });

    if (independentCafes.length === 0) {
      setMessage(
        "No independent cafes were found near the midpoint."
      );
      return;
    }

    setMessage("Calculating journey times...");

    // 3. Calculate normal journey times
    const routeResponse = await fetch(
      "/api/routes",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personA: {
            lat: yourLocation.lat,
            lng: yourLocation.lng,
          },

          personB: {
            lat: theirLocation.lat,
            lng: theirLocation.lng,
          },

          cafes: independentCafes,
          travelMode,
        }),
      }
    );

    const routeData =
      await routeResponse.json();

    if (!routeResponse.ok) {
      setMessage(
        routeData.details ||
          routeData.error ||
          "Journey calculation failed."
      );
      return;
    }

    // 4. Calculate walking times
    const walkingResponse = await fetch(
      "/api/walking",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personA: {
            lat: yourLocation.lat,
            lng: yourLocation.lng,
          },

          personB: {
            lat: theirLocation.lat,
            lng: theirLocation.lng,
          },

          cafes: independentCafes,
        }),
      }
    );

    const walkingData =
      await walkingResponse.json();

    if (!walkingResponse.ok) {
      setMessage(
        walkingData.details ||
          walkingData.error ||
          "Walking calculation failed."
      );
      return;
    }

    // 5. Score each cafe
    const scoredCafes =
      independentCafes.map(
        (cafe, cafeIndex) => {
          const routeA =
            routeData.routes.find(
              (route: any) =>
                route.originIndex === 0 &&
                route.destinationIndex ===
                  cafeIndex
            );

          const routeB =
            routeData.routes.find(
              (route: any) =>
                route.originIndex === 1 &&
                route.destinationIndex ===
                  cafeIndex
            );

          const walkRouteA =
            walkingData.routes?.find(
              (route: any) =>
                route.originIndex === 0 &&
                route.destinationIndex ===
                  cafeIndex
            );

          const walkRouteB =
            walkingData.routes?.find(
              (route: any) =>
                route.originIndex === 1 &&
                route.destinationIndex ===
                  cafeIndex
            );

          const timeA =
            durationToMinutes(
              routeA?.duration
            );

          const timeB =
            durationToMinutes(
              routeB?.duration
            );

          const walkA =
            durationToMinutes(
              walkRouteA?.duration
            );

          const walkB =
            durationToMinutes(
              walkRouteB?.duration
            );

          if (
            timeA === null ||
            timeB === null
          ) {
            return {
              ...cafe,
              score: undefined,
            };
          }

          const averageTravelTime =
            (timeA + timeB) / 2;

          const fairnessDifference =
            Math.abs(timeA - timeB);

          const cafeQualityPenalty =
            calculateCafeQualityPenalty(
              cafe.rating,
              cafe.userRatingCount
            );

          const walkingPenalty =
            calculateWalkingPenalty(
              walkA ?? undefined,
              walkB ?? undefined
            );

          const chain =
            isChainCafe(
              cafe.displayName?.text
            );

          const preferencePenalty =
            calculatePreferencePenalty(
              chain
            );

          const score =
            calculateCafeScore({
              averageTravelTime,
              fairnessDifference,
              cafeQualityPenalty,
              walkingPenalty,
              preferencePenalty,
            });

          return {
            ...cafe,
            timeA,
            timeB,
            averageTravelTime,
            fairnessDifference,
            cafeQualityPenalty,
            walkingPenalty,
            preferencePenalty,
            score,
            isChain: chain,
          };
        }
      );

    // 6. Remove invalid routes and sort
    const validCafes =
      scoredCafes
        .filter(
          (cafe) =>
            cafe.score !== undefined
        )
        .sort(
          (a, b) =>
            (a.score ?? 9999) -
            (b.score ?? 9999)
        );

    setCafes(validCafes);

    if (validCafes.length === 0) {
      setMessage(
        "Cafes were found, but no valid journeys could be calculated."
      );
    } else {
      setMessage("");
    }
  } catch (error) {
    console.error(error);

    setMessage(
      "Something went wrong during the search."
    );
  }


    setMessage(
      "Finding independent coffee shops..."
    );

    setCafes([]);


    try {

      /*
      ==========================
      STEP 1
      Find cafes
      ==========================
      */

      const cafeResponse =
        await fetch(
          "/api/cafes",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              lat: midpointLat,
              lng: midpointLng,
            }),
          }
        );


      const cafeData =
        await cafeResponse.json();


      if (!cafeResponse.ok) {

        setMessage(
          cafeData.details ||
          cafeData.error ||
          "Cafe search failed."
        );

        return;
      }


      const allCafes: Cafe[] =
        cafeData.places || [];


      /*
      ==========================
      STEP 2
      Remove known chains
      ==========================
      */

      const independentCafes =
        allCafes.filter(
          (cafe) => {

            const name =
              cafe.displayName
                ?.text;

            return !isChainCafe(
              name
            );
          }
        );


      if (
        independentCafes.length === 0
      ) {

        setMessage(
          "No independent cafes were found near the midpoint."
        );

        return;
      }


      setMessage(
        "Calculating journey times..."
      );


      /*
      ==========================
      STEP 3
      Calculate routes
      ==========================
      */

      const routeResponse =
        await fetch(
          "/api/routes",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({

              personA: {
                lat:
                  yourLocation.lat,

                lng:
                  yourLocation.lng,
              },


              personB: {
                lat:
                  theirLocation.lat,

                lng:
                  theirLocation.lng,
              },


              cafes:
                independentCafes,


              travelMode,

            }),
          }
        );


      const routeData =
        await routeResponse.json();


      if (!routeResponse.ok) {

        console.error(
          routeData
        );

        setMessage(
          routeData.details ||
          routeData.error ||
          "Journey calculation failed."
        );

        return;
      }


      /*
      ==========================
      STEP 4
      Score every cafe
      ==========================
      */

      const scoredCafes =
        independentCafes.map(
          (
            cafe,
            cafeIndex
          ) => {


            const routeA =
              routeData.routes.find(
                (route: any) =>
                  route.originIndex ===
                    0 &&
                  route.destinationIndex ===
                    cafeIndex
              );


            const routeB =
              routeData.routes.find(
                (route: any) =>
                  route.originIndex ===
                    1 &&
                  route.destinationIndex ===
                    cafeIndex
              );


            const timeA =
              durationToMinutes(
                routeA?.duration
              );


            const timeB =
              durationToMinutes(
                routeB?.duration
              );


            if (
              timeA === null ||
              timeB === null
            ) {

              return {
                ...cafe,
                score: undefined,
              };

            }


            /*
            Average journey
            */

            const averageTravelTime =
              (
                timeA +
                timeB
              ) / 2;


            /*
            Difference between
            people's journeys
            */

            const fairnessDifference =
              Math.abs(
                timeA -
                timeB
              );


            /*
            Cafe quality
            */

            const cafeQualityPenalty =
              calculateCafeQualityPenalty(
                cafe.rating,
                cafe.userRatingCount
              );


            /*
            Walking penalty

            Currently zero.

            We'll replace this with
            real walking data next.
            */

            const walkingPenalty =
              calculateWalkingPenalty();


            /*
            Independent preference
            */

            const chain =
              isChainCafe(
                cafe.displayName
                  ?.text
              );


            const preferencePenalty =
              calculatePreferencePenalty(
                chain
              );


            /*
            FINAL SCORE
            */

            const score =
              calculateCafeScore({

                averageTravelTime,

                fairnessDifference,

                cafeQualityPenalty,

                walkingPenalty,

                preferencePenalty,

              });


            return {

              ...cafe,

              timeA,

              timeB,

              averageTravelTime,

              fairnessDifference,

              cafeQualityPenalty,

              walkingPenalty,

              preferencePenalty,

              score,

              isChain: chain,

            };

          }
        );


      /*
      ==========================
      STEP 5
      Remove invalid routes
      ==========================
      */

      const validCafes =
        scoredCafes
          .filter(
            (cafe) =>
              cafe.score !==
              undefined
          )
          .sort(
            (a, b) =>
              (a.score ?? 9999) -
              (b.score ?? 9999)
          );


      setCafes(
        validCafes
      );


      if (
        validCafes.length === 0
      ) {

        setMessage(
          "Cafes were found, but no valid journeys could be calculated."
        );

      } else {

        setMessage("");

      }


    } catch (error) {

      console.error(
        error
      );

      setMessage(
        "Something went wrong during the search."
      );

    }
  }



  return (

    <main
      className="
        min-h-screen
        bg-gray-50
        p-6
      "
    >

      <div
        className="
          w-full
          max-w-2xl
          mx-auto
          bg-white
          rounded-2xl
          shadow-sm
          p-8
        "
      >


        <h1
          className="
            text-4xl
            font-bold
            text-gray-900
          "
        >
          Middle Ground
        </h1>


        <p
          className="
            mt-3
            text-gray-600
          "
        >
          Find an independent coffee
          shop that works for both of you.
        </p>



        {/* YOUR LOCATION */}

        <div className="mt-8">

          <label
            className="
              block
              text-sm
              font-medium
              text-gray-700
              mb-2
            "
          >
            Your location
          </label>


          <LocationAutocomplete
            placeholder="
              e.g. London Bridge
            "
            onPlaceSelected={
              setYourLocation
            }
          />

        </div>



        {/* THEIR LOCATION */}

        <div className="mt-5">

          <label
            className="
              block
              text-sm
              font-medium
              text-gray-700
              mb-2
            "
          >
            Their location
          </label>


          <LocationAutocomplete
            placeholder="
              e.g. Notting Hill
            "
            onPlaceSelected={
              setTheirLocation
            }
          />

        </div>



        {/* TRAVEL MODE */}

        <div className="mt-5">

          <label
            className="
              block
              text-sm
              font-medium
              text-gray-700
              mb-2
            "
          >
            Travel mode
          </label>


          <select
            value={
              travelMode
            }

            onChange={
              (e) =>
                setTravelMode(
                  e.target.value
                )
            }

            className="
              w-full
              border
              border-gray-300
              rounded-lg
              px-4
              py-3
            "
          >

            <option>
              Public transport
            </option>

            <option>
              Walking
            </option>

            <option>
              Driving
            </option>

            <option>
              Cycling
            </option>

          </select>

        </div>



        {/* SEARCH BUTTON */}

        <button
          onClick={
            handleSearch
          }

          className="
            mt-8
            w-full
            bg-black
            text-white
            rounded-lg
            py-3
            font-medium
          "
        >
          Find Middle Ground
        </button>



        {/* STATUS */}

        {message && (

          <p
            className="
              mt-5
              text-sm
              text-gray-600
            "
          >
            {message}
          </p>

        )}



        {/* MIDPOINT */}

        {midpoint && (

          <div
            className="
              mt-5
              rounded-lg
              bg-gray-100
              p-4
            "
          >

            <p className="font-medium">
              Approximate midpoint
            </p>

            <p
              className="
                text-sm
                text-gray-600
                mt-1
              "
            >
              Latitude:{" "}
              {
                midpoint.lat.toFixed(
                  5
                )
              }
            </p>

            <p
              className="
                text-sm
                text-gray-600
              "
            >
              Longitude:{" "}
              {
                midpoint.lng.toFixed(
                  5
                )
              }
            </p>

          </div>

        )}



        {/* RESULTS */}

        {cafes.length > 0 && (

          <div className="mt-10">

            <h2
              className="
                text-2xl
                font-semibold
              "
            >
              Best independent cafes
            </h2>


            <p
              className="
                mt-2
                text-sm
                text-gray-500
              "
            >
              Ranked by travel time,
              fairness and cafe quality.
            </p>



            <div
              className="
                mt-5
                space-y-5
              "
            >

              {cafes.map(
                (
                  cafe,
                  index
                ) => (

                  <div
                    key={
                      cafe.id
                    }

                    className="
                      border
                      border-gray-200
                      rounded-xl
                      p-5
                    "
                  >


                    {/* HEADER */}

                    <div
                      className="
                        flex
                        justify-between
                        items-start
                        gap-4
                      "
                    >

                      <div>

                        <p
                          className="
                            text-xs
                            text-gray-500
                          "
                        >
                          #{index + 1}
                        </p>


                        <h3
                          className="
                            text-lg
                            font-semibold
                            mt-1
                          "
                        >
                          {
                            cafe
                              .displayName
                              ?.text ||
                            "Unnamed cafe"
                          }
                        </h3>


                        {
                          cafe
                            .formattedAddress &&
                          (

                            <p
                              className="
                                text-sm
                                text-gray-600
                                mt-1
                              "
                            >
                              {
                                cafe
                                  .formattedAddress
                              }
                            </p>

                          )
                        }

                      </div>



                      {
                        index === 0 &&
                        (

                          <span
                            className="
                              bg-black
                              text-white
                              text-xs
                              rounded-full
                              px-3
                              py-1
                              whitespace-nowrap
                            "
                          >
                            Best match
                          </span>

                        )
                      }

                    </div>



                    {/* RATING */}

                    <div
                      className="
                        mt-3
                        text-sm
                      "
                    >

                      ⭐{" "}
                      {
                        cafe.rating ??
                        "No rating"
                      }

                      {
                        cafe
                          .userRatingCount
                          ? (

                            <span
                              className="
                                text-gray-500
                                ml-2
                              "
                            >
                              (
                              {
                                cafe
                                  .userRatingCount
                              }{" "}
                              reviews)
                            </span>

                          )
                          : null
                      }

                    </div>



                    {/* JOURNEYS */}

                    <div
                      className="
                        mt-4
                        bg-gray-50
                        rounded-lg
                        p-4
                      "
                    >

                      <div
                        className="
                          flex
                          justify-between
                        "
                      >

                        <div>

                          <p
                            className="
                              text-xs
                              text-gray-500
                            "
                          >
                            You
                          </p>

                          <p
                            className="
                              text-lg
                              font-semibold
                            "
                          >
                            {
                              cafe.timeA
                            }{" "}
                            min
                          </p>

                        </div>


                        <div
                          className="
                            text-right
                          "
                        >

                          <p
                            className="
                              text-xs
                              text-gray-500
                            "
                          >
                            Them
                          </p>

                          <p
                            className="
                              text-lg
                              font-semibold
                            "
                          >
                            {
                              cafe.timeB
                            }{" "}
                            min
                          </p>

                        </div>

                      </div>

                    </div>



                    {/* SCORECARD */}

                    <div
                      className="
                        mt-4
                        border-t
                        border-gray-200
                        pt-4
                      "
                    >

                      <div
                        className="
                          flex
                          justify-between
                          items-center
                        "
                      >

                        <p
                          className="
                            font-medium
                          "
                        >
                          Middle Ground score
                        </p>


                        <p
                          className="
                            text-xl
                            font-bold
                          "
                        >
                          {
                            cafe.score
                          }
                        </p>

                      </div>



                      <div
                        className="
                          mt-3
                          space-y-2
                          text-sm
                        "
                      >


                        <div
                          className="
                            flex
                            justify-between
                          "
                        >

                          <span
                            className="
                              text-gray-500
                            "
                          >
                            Avg travel time
                            × 40%
                          </span>

                          <span>
                            {
                              cafe
                                .averageTravelTime
                            }{" "}
                            min
                          </span>

                        </div>



                        <div
                          className="
                            flex
                            justify-between
                          "
                        >

                          <span
                            className="
                              text-gray-500
                            "
                          >
                            Fairness difference
                            × 30%
                          </span>

                          <span>
                            {
                              cafe
                                .fairnessDifference
                            }{" "}
                            min
                          </span>

                        </div>



                        <div
                          className="
                            flex
                            justify-between
                          "
                        >

                          <span
                            className="
                              text-gray-500
                            "
                          >
                            Cafe quality penalty
                            × 15%
                          </span>

                          <span>
                            {
                              cafe
                                .cafeQualityPenalty
                            }
                          </span>

                        </div>



                        <div
                          className="
                            flex
                            justify-between
                          "
                        >

                          <span
                            className="
                              text-gray-500
                            "
                          >
                            Walking penalty
                            × 10%
                          </span>

                          <span>
                            {
                              cafe
                                .walkingPenalty
                            }
                          </span>

                        </div>



                        <div
                          className="
                            flex
                            justify-between
                          "
                        >

                          <span
                            className="
                              text-gray-500
                            "
                          >
                            Preference penalty
                            × 5%
                          </span>

                          <span>
                            {
                              cafe
                                .preferencePenalty
                            }
                          </span>

                        </div>


                      </div>

                    </div>

                  </div>

                )
              )}

            </div>

          </div>

        )}

      </div>

    </main>

  );
}