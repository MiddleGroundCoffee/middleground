"use client";

import { useState } from "react";
import LocationAutocomplete from "@/components/LocationAutocomplete";
import ResultsMap from "@/components/ResultsMap";
import CafePhoto from "@/components/CafePhoto";

import {
  calculateCafeQualityPenalty,
  calculateCafeScore,
} from "@/lib/ranking";

type Location = {
  name: string;
  address: string;
  lat: number;
  lng: number;
};

type Cafe = {
  id: string;
  name: string;

  googlePlaceId?: string;
  address?: string;

  latitude: number;
  longitude: number;

  independent?: boolean;

  coffeeQuality?: number;
  seating?: number;
  quiet?: number;

  outdoorSeating?: boolean;
  laptopFriendly?: boolean;

  meetingSuitability?: number;

  googleRating?: number;
  googleReviewCount?: number;

  distanceKm?: number;

  timeA?: number;
  timeB?: number;

  averageTravelTime?: number;
  fairnessDifference?: number;

  cafeQualityPenalty?: number;
  walkingPenalty?: number;
  preferencePenalty?: number;

  score?: number;
};

type Preferences = {
  goodCoffee: boolean;
  adequateSeating: boolean;
  independent: boolean;
  outdoorSeating: boolean;
  quiet: boolean;
  laptopFriendly: boolean;
};

const FILTERS = [
  {
    key: "goodCoffee",
    label: "Good coffee",
  },
  {
    key: "adequateSeating",
    label: "Adequate seating",
  },
  {
    key: "independent",
    label: "Independent",
  },
  {
    key: "outdoorSeating",
    label: "Outdoor seating",
  },
  {
    key: "quiet",
    label: "Quiet",
  },
  {
    key: "laptopFriendly",
    label: "Laptop-friendly",
  },
] as const;

function durationToMinutes(
  duration?: string
) {
  if (!duration) {
    return null;
  }

  const seconds = parseFloat(
    duration.replace("s", "")
  );

  return Math.round(
    seconds / 60
  );
}

function calculatePreferencePenalty({
  cafe,
  preferences,
}: {
  cafe: Cafe;
  preferences: Preferences;
}) {
  const penalties: number[] = [];

  if (
    preferences.goodCoffee &&
    cafe.coffeeQuality !== undefined
  ) {
    penalties.push(
      10 - cafe.coffeeQuality
    );
  }

  if (
    preferences.adequateSeating &&
    cafe.seating !== undefined
  ) {
    penalties.push(
      10 - cafe.seating
    );
  }

  if (
    preferences.independent &&
    cafe.independent !== undefined
  ) {
    penalties.push(
      cafe.independent ? 0 : 10
    );
  }

  if (
    preferences.outdoorSeating &&
    cafe.outdoorSeating !== undefined
  ) {
    penalties.push(
      cafe.outdoorSeating ? 0 : 10
    );
  }

  if (
    preferences.quiet &&
    cafe.quiet !== undefined
  ) {
    penalties.push(
      10 - cafe.quiet
    );
  }

  if (
    preferences.laptopFriendly &&
    cafe.laptopFriendly !== undefined
  ) {
    penalties.push(
      cafe.laptopFriendly ? 0 : 10
    );
  }

  if (
    penalties.length === 0
  ) {
    return 0;
  }

  const average =
    penalties.reduce(
      (sum, value) =>
        sum + value,
      0
    ) / penalties.length;

  return Number(
    average.toFixed(2)
  );
}

export default function Home() {
  const [
    yourLocation,
    setYourLocation,
  ] =
    useState<Location | null>(
      null
    );

  const [
    theirLocation,
    setTheirLocation,
  ] =
    useState<Location | null>(
      null
    );

  const [
    travelMode,
    setTravelMode,
  ] =
    useState(
      "Public transport"
    );

  const [
    preferences,
    setPreferences,
  ] =
    useState<Preferences>({
      goodCoffee: true,
      adequateSeating: false,
      independent: true,
      outdoorSeating: false,
      quiet: true,
      laptopFriendly: false,
    });

  const [
    message,
    setMessage,
  ] =
    useState("");

  const [
    cafes,
    setCafes,
  ] =
    useState<Cafe[]>([]);

  const [
    allScoredCafes,
    setAllScoredCafes,
  ] =
    useState<Cafe[]>([]);

  const [
    selectedCafeId,
    setSelectedCafeId,
  ] =
    useState<string | null>(
      null
    );

  const selectedCafe =
    cafes.find(
      (cafe) =>
        cafe.id === selectedCafeId
    ) ??
    cafes[0] ??
    null;

  function rerankCafes(
    cafeList: Cafe[],
    currentPreferences: Preferences
  ) {
    return cafeList
      .map((cafe) => {
        if (
          cafe.averageTravelTime ===
            undefined ||
          cafe.fairnessDifference ===
            undefined ||
          cafe.cafeQualityPenalty ===
            undefined ||
          cafe.walkingPenalty ===
            undefined
        ) {
          return cafe;
        }

        const preferencePenalty =
          calculatePreferencePenalty({
            cafe,
            preferences:
              currentPreferences,
          });

        const score =
          calculateCafeScore({
            averageTravelTime:
              cafe.averageTravelTime,

            fairnessDifference:
              cafe.fairnessDifference,

            cafeQualityPenalty:
              cafe.cafeQualityPenalty,

            walkingPenalty:
              cafe.walkingPenalty,

            preferencePenalty,
          });

        return {
          ...cafe,
          preferencePenalty,
          score,
        };
      })
      .filter(
        (cafe) =>
          cafe.score !== undefined
      )
      .sort(
        (a, b) =>
          (a.score ?? 9999) -
          (b.score ?? 9999)
      );
  }

  function togglePreference(
    key: keyof Preferences
  ) {
    setPreferences(
      (current) => {
        const updated = {
          ...current,
          [key]:
            !current[key],
        };

        if (
          allScoredCafes.length >
          0
        ) {
          const reranked =
            rerankCafes(
              allScoredCafes,
              updated
            );

          const newTopThree =
            reranked.slice(
              0,
              3
            );

          setCafes(
            newTopThree
          );

          setSelectedCafeId(
            newTopThree[0]?.id ??
              null
          );
        }

        return updated;
      }
    );
  }

  function changeTravelMode(
    newMode: string
  ) {
    setTravelMode(newMode);

    if (
      yourLocation &&
      theirLocation &&
      cafes.length > 0
    ) {
      handleSearch(newMode);
    }
  }

  async function handleSearch(
    selectedTravelMode =
      travelMode
  ) {
    if (
      !yourLocation ||
      !theirLocation
    ) {
      setMessage(
        "Please select both locations."
      );

      return;
    }

    setMessage(
      "Finding your Middle Ground..."
    );

    setCafes([]);

    const midpointLat =
      (
        yourLocation.lat +
        theirLocation.lat
      ) / 2;

    const midpointLng =
      (
        yourLocation.lng +
        theirLocation.lng
      ) / 2;

    try {
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
              lat:
                midpointLat,

              lng:
                midpointLng,
            }),
          }
        );

      const cafeData =
        await cafeResponse.json();

      if (
        !cafeResponse.ok
      ) {
        setMessage(
          cafeData.details ||
            cafeData.error ||
            "Cafe search failed."
        );

        return;
      }

      const candidateCafes: Cafe[] =
        cafeData.places || [];

      if (
        candidateCafes.length ===
        0
      ) {
        setMessage(
          "No curated cafes were found."
        );

        return;
      }

      setMessage(
        "Calculating journey times..."
      );

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
                candidateCafes,

              travelMode:
                selectedTravelMode,
            }),
          }
        );

      const routeData =
        await routeResponse.json();

      if (
        !routeResponse.ok
      ) {
        setMessage(
          routeData.details ||
            routeData.error ||
            "Journey calculation failed."
        );

        return;
      }

      const scoredCafes =
        candidateCafes.map(
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

            const averageTravelTime =
              (
                timeA +
                timeB
              ) / 2;

            const fairnessDifference =
              Math.abs(
                timeA -
                timeB
              );

            const cafeQualityPenalty =
              calculateCafeQualityPenalty(
                {
                  coffeeQuality:
                    cafe.coffeeQuality,

                  seating:
                    cafe.seating,

                  meetingSuitability:
                    cafe.meetingSuitability,

                  googleRating:
                    cafe.googleRating,
                }
              );

            const walkingPenalty =
              0;

            const preferencePenalty =
              calculatePreferencePenalty({
                cafe,
                preferences,
              });

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
            };
          }
        );

      const ranked =
        scoredCafes
          .filter(
            (cafe) =>
              cafe.score !==
              undefined
          )
          .sort(
            (a, b) =>
              (a.score ??
                9999) -
              (b.score ??
                9999)
          );

      setAllScoredCafes(
        ranked
      );

      const topThree =
        ranked.slice(
          0,
          3
        );

      setCafes(
        topThree
      );

      setSelectedCafeId(
        topThree[0]?.id ??
          null
      );

      if (
        topThree.length ===
        0
      ) {
        setMessage(
          "No valid journeys could be calculated."
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
    <main className="min-h-screen bg-[#f6f3ee] text-[#26241f]">

      {/* HEADER */}

      <header className="border-b border-black/10">

        <div className="max-w-[1500px] mx-auto px-6 md:px-10 py-5 flex items-center justify-between">

          <div className="flex items-baseline gap-3">

<span className="font-display text-[28px] tracking-[-0.01em]">
  Middle Ground
</span>

            <span className="text-[10px] tracking-[0.14em] text-black/40 uppercase">
              London
            </span>

          </div>

          <div className="hidden md:flex gap-7 text-sm text-black/50">

            <span>
              How it works
            </span>

            <span>
              Saved spots
            </span>

            <span className="text-black">
              Sign in
            </span>

          </div>

        </div>

      </header>


      {/* HERO */}

<section className="max-w-3xl mx-auto px-5 sm:px-6 pt-12 sm:pt-16 md:pt-20 pb-8 text-center">
<h1 className="font-display font-normal tracking-[-0.025em] leading-[0.98] text-[40px] sm:text-[48px] md:text-[60px]">

  <span className="block">
    Find the fairest coffee
  </span>

  <em className="block mt-2 font-normal whitespace-nowrap text-[38px] sm:text-[46px] md:text-[60px]">
    between you two.
  </em>

</h1>

<p className="mt-5 text-[14px] sm:text-[15px] text-black/55 leading-relaxed">
          Two starting points,
          one cafe.
          <br />

          Convenient for you both.

        </p>

      </section>


      {/* SEARCH */}

      <section className="max-w-[660px] mx-auto px-6 pb-14">

        <div className="bg-[#fffdfa] border border-black/15 rounded-md overflow-visible">

          {/* YOU */}

<div className="relative z-30 flex items-center gap-4 px-5 py-4">
            <span className="w-2 h-2 rounded-full bg-[#26241f] flex-none" />

<div className="flex-1 min-w-0">
<p className="font-mono-brand text-[10px] tracking-[0.14em] text-black/40 font-medium mb-1">
                YOU
              </p>

              <LocationAutocomplete
                placeholder="Postcode, station or address"
                onPlaceSelected={
                  setYourLocation
                }
              />

            </div>

          </div>


          <div className="h-px bg-black/10 mx-5" />


          {/* THEM */}

<div className="relative z-10 flex items-center gap-4 px-5 py-4">

            <span className="w-2 h-2 rounded-full border-[1.5px] border-[#26241f] flex-none" />

<div className="flex-1 min-w-0">
<p className="font-mono-brand text-[10px] tracking-[0.14em] text-black/40 font-medium mb-1">
                THEM
              </p>

              <LocationAutocomplete
                placeholder="Postcode, station or address"
                onPlaceSelected={
                  setTheirLocation
                }
              />

            </div>

          </div>

        </div>


        {/* TRAVEL MODE */}

        <div className="mt-5">

          <p className="text-[10px] tracking-[0.14em] text-black/40 font-medium mb-2">
            TRAVEL MODE
          </p>

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

            className="w-full bg-transparent border border-black/15 rounded-md px-4 py-3 text-sm"
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


        {/* FILTERS */}

        <div className="mt-6">

          <p className="text-[10px] tracking-[0.14em] text-black/40 font-medium mb-3">
            WHAT MATTERS
          </p>

          <div className="flex flex-wrap gap-2">

            {FILTERS.map(
              (filter) => {
                const active =
                  preferences[
                    filter.key
                  ];

                return (
                  <button
                    key={
                      filter.key
                    }

                    type="button"

                    onClick={() =>
                      togglePreference(
                        filter.key
                      )
                    }

                    className={
                      active
                        ? "px-4 py-2 rounded-full border border-[#26241f] bg-[#26241f] text-[#f6f3ee] text-sm transition"
                        : "px-4 py-2 rounded-full border border-black/15 bg-transparent text-black/65 text-sm transition hover:border-black/30"
                    }
                  >

                    {
                      filter.label
                    }

                  </button>
                );
              }
            )}

          </div>

        </div>


        {/* SEARCH BUTTON */}

        <button
          onClick={() =>
            handleSearch()
          }

          className="mt-7 w-full bg-[#26241f] text-[#f6f3ee] rounded-md py-4 font-medium text-[15px]"
        >

          Find the Middle Ground ☕

        </button>


        {message && (

          <p className="mt-4 text-sm text-black/50">
            {message}
          </p>

        )}

      </section>


      {/* RESULTS */}

      {cafes.length > 0 && (

        <section className="border-t border-black/10">

<div className="w-full max-w-[1500px] mx-auto grid grid-cols-1 lg:grid-cols-[220px_460px_minmax(0,1fr)] items-stretch">

            {/* LEFT FILTER RAIL */}

            <aside className="hidden lg:block min-h-[700px] border-r border-black/10 bg-[#f2efe8] px-5 py-6">

              <p className="text-[10px] tracking-[0.14em] text-black/40 font-medium mb-4">
                FILTERS
              </p>

              <div className="space-y-2">

                {FILTERS.map(
                  (filter) => {
                    const active =
                      preferences[
                        filter.key
                      ];

                    return (
                      <button
                        key={
                          filter.key
                        }

                        type="button"

                        onClick={() =>
                          togglePreference(
                            filter.key
                          )
                        }

                        className={
                          active
                            ? "w-full flex items-center justify-between px-3 py-2.5 bg-[#fffdfa] border border-black/15 rounded text-sm text-left"
                            : "w-full flex items-center justify-between px-3 py-2.5 border border-transparent rounded text-sm text-black/50 text-left hover:text-black/70"
                        }
                      >

                        <span>
                          {
                            filter.label
                          }
                        </span>

                        <span
                          className={
                            active
                              ? "text-[#8a5a41]"
                              : "opacity-0"
                          }
                        >
                          ✓
                        </span>

                      </button>
                    );
                  }
                )}

              </div>


              <div className="mt-8">

                <p className="text-[10px] tracking-[0.14em] text-black/40 font-medium mb-3">
                  TRAVEL MODE
                </p>

                <select
                  value={
                    travelMode
                  }

                  onChange={
                    (e) =>
                      changeTravelMode(
                        e.target.value
                      )
                  }

                  className="w-full bg-[#fffdfa] border border-black/15 rounded px-3 py-2.5 text-sm"
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

            </aside>


            {/* CENTRE RESULTS */}

            <div className="bg-[#f6f3ee] border-r border-black/10 min-w-0">

              <div className="px-6 py-5 border-b border-black/10">

                <p className="text-[10px] tracking-[0.14em] text-black/40 font-medium">
                  YOUR PICKS
                </p>

                <div className="flex items-end justify-between gap-4 mt-1">

                  <h2 className="font-display text-3xl leading-none">
                    Top 3 recommendations
                  </h2>

                  <p className="text-[10px] text-black/40 text-right">
                    Sorted by
                    <br />
                    Middle Ground score
                  </p>

                </div>

              </div>


              {/* CAFE CARDS */}

              {cafes.map(
                (
                  cafe,
                  index
                ) => (

                  <button
                    key={
                      cafe.id
                    }

                    type="button"

                    onClick={() =>
                      setSelectedCafeId(
                        cafe.id
                      )
                    }

                    className={
                      selectedCafeId ===
                      cafe.id
                        ? "w-full text-left px-5 py-5 bg-[#fffdfa] border-b border-black/10 border-l-4 border-l-[#8a5a41]"
                        : "w-full text-left px-5 py-5 border-b border-black/10 hover:bg-[#fffdfa]/60 transition"
                    }
                  >

                    <div className="flex gap-4">

                      {/* PHOTO PLACEHOLDER */}

<CafePhoto
  placeId={
    cafe.googlePlaceId
  }
  name={
    cafe.name
  }
  className="w-[92px] h-[92px] flex-none rounded"
/>


                      {/* CARD CONTENT */}

                      <div className="flex-1 min-w-0">

                        <div className="flex items-start justify-between gap-3">

                          <div className="min-w-0">

                            <div className="flex items-center gap-2 flex-wrap">

                              <h3 className="font-display text-[21px] leading-tight">
                                {
                                  cafe.name
                                }
                              </h3>

                              {index ===
                                0 && (
                                <span className="text-[9px] px-2 py-1 rounded bg-[#8a5a41] text-white">
                                  BEST
                                </span>
                              )}

                            </div>

                            <p className="text-[12px] leading-snug text-black/50 mt-1">
                              {
                                cafe.address
                              }
                            </p>

                          </div>


                          <div className="text-right flex-none">

                            <p className="text-[8px] tracking-wide text-black/35 uppercase">
                              Fairness
                            </p>

                            <p className="text-xs font-medium mt-1">
                              ±
                              {
                                cafe.fairnessDifference
                              }
                              m
                            </p>

                          </div>

                        </div>


                        {/* TAGS */}

                        <div className="flex flex-wrap gap-1.5 mt-3">

                          {cafe.coffeeQuality !==
                            undefined &&
                            cafe.coffeeQuality >=
                              7 && (
                              <span className="text-[10px] px-2.5 py-1 bg-[#efece5] rounded-full">
                                Good coffee
                              </span>
                            )}

                          {cafe.seating !==
                            undefined &&
                            cafe.seating >=
                              7 && (
                              <span className="text-[10px] px-2.5 py-1 bg-[#efece5] rounded-full">
                                Good seating
                              </span>
                            )}

                          {cafe.quiet !==
                            undefined &&
                            cafe.quiet >=
                              7 && (
                              <span className="text-[10px] px-2.5 py-1 bg-[#efece5] rounded-full">
                                Quiet
                              </span>
                            )}

                          {cafe.independent && (
                            <span className="text-[10px] px-2.5 py-1 bg-[#efece5] rounded-full">
                              Independent
                            </span>
                          )}

                          {cafe.outdoorSeating && (
                            <span className="text-[10px] px-2.5 py-1 bg-[#efece5] rounded-full">
                              Outdoor seating
                            </span>
                          )}

                          {cafe.laptopFriendly && (
                            <span className="text-[10px] px-2.5 py-1 bg-[#efece5] rounded-full">
                              Laptop-friendly
                            </span>
                          )}

                        </div>


                        {/* JOURNEY BARS */}

                        <div className="mt-4 space-y-2">

                          <div className="flex items-center gap-2">

                            <span className="text-[10px] text-black/45 w-8">
                              You
                            </span>

                            <div className="flex-1 h-[4px] bg-[#e9e5dc]">

                              <div
                                className="h-[4px] bg-[#26241f]"
                                style={{
                                  width: `${Math.min(
                                    (cafe.timeA ||
                                      0) *
                                      2.2,
                                    100
                                  )}%`,
                                }}
                              />

                            </div>

                            <span className="text-[10px] w-9 text-right">
                              {
                                cafe.timeA
                              }
                              m
                            </span>

                          </div>


                          <div className="flex items-center gap-2">

                            <span className="text-[10px] text-black/45 w-8">
                              Them
                            </span>

                            <div className="flex-1 h-[4px] bg-[#e9e5dc]">

                              <div
                                className="h-[4px] bg-[#8a5a41]"
                                style={{
                                  width: `${Math.min(
                                    (cafe.timeB ||
                                      0) *
                                      2.2,
                                    100
                                  )}%`,
                                }}
                              />

                            </div>

                            <span className="text-[10px] w-9 text-right">
                              {
                                cafe.timeB
                              }
                              m
                            </span>

                          </div>

                        </div>


                        {/* CARD FOOTER */}

                        <div className="mt-4 flex flex-wrap items-center gap-2 text-[10px]">

                          <span>
                            ★{" "}
                            {
                              cafe.googleRating ??
                              "—"
                            }
                          </span>

                          {cafe.googleReviewCount && (
                            <span className="text-black/40">
                              {
                                cafe.googleReviewCount
                              }{" "}
                              reviews
                            </span>
                          )}

                          <span className="text-black/25">
                            ·
                          </span>

                          <span className="text-black/45">
                            Avg journey{" "}
                            {
                              cafe.averageTravelTime
                            }
                            m
                          </span>

                        </div>

                      </div>

                    </div>

                  </button>

                )
              )}

            </div>


            {/* RIGHT COLUMN */}

            {yourLocation &&
              theirLocation && (

<div className="hidden lg:flex min-w-0 h-full flex-col">
                  {/* MAP */}

                  <div className="h-[430px] min-h-[430px]">

                    <ResultsMap
                      yourLocation={
                        yourLocation
                      }

                      theirLocation={
                        theirLocation
                      }

                      cafes={
                        cafes
                      }

                      selectedCafeId={
                        selectedCafeId
                      }
                    />

                  </div>


                  {/* SELECTED CAFE DETAIL */}

                  {selectedCafe && (

<div className="flex-1 min-h-0 bg-[#fffdfa] border-t border-black/10 px-6 py-5 overflow-y-auto">
                      <div className="flex justify-between items-start gap-4">

                        <div>

                          <p className="text-[10px] tracking-[0.14em] text-black/40 font-medium">
                            SELECTED SPOT
                          </p>

                          <h3 className="font-display text-3xl mt-1 leading-tight">
                            {
                              selectedCafe.name
                            }
                          </h3>

                          <p className="text-sm text-black/50 mt-1 max-w-md">
                            {
                              selectedCafe.address
                            }
                          </p>

                        </div>


                        <div className="text-right flex-none">

                          <p className="text-[9px] tracking-wide text-black/35 uppercase">
                            Fairness
                          </p>

                          <p className="text-sm font-medium mt-1 text-[#8a5a41]">
                            ±
                            {
                              selectedCafe.fairnessDifference
                            }{" "}
                            min
                          </p>

                        </div>

                      </div>


                      {/* RATING */}

                      <div className="flex items-center gap-2 mt-4 text-sm">

                        <span className="text-[#8a5a41]">
                          ★
                        </span>

                        <span className="font-medium">
                          {
                            selectedCafe.googleRating ??
                            "—"
                          }
                        </span>

                        {selectedCafe.googleReviewCount && (
                          <span className="text-black/40">
                            ·{" "}
                            {
                              selectedCafe.googleReviewCount
                            }{" "}
                            reviews
                          </span>
                        )}

                      </div>


                      {/* JOURNEY TIMES */}

                      <div className="grid grid-cols-2 gap-px bg-black/10 border border-black/10 mt-5">

                        <div className="bg-[#f6f3ee] p-4">

                          <p className="text-[9px] tracking-[0.12em] text-black/40">
                            YOU
                          </p>

                          <p className="font-display text-2xl mt-1">
                            {
                              selectedCafe.timeA
                            }{" "}
                            min
                          </p>

                        </div>


                        <div className="bg-[#f6f3ee] p-4">

                          <p className="text-[9px] tracking-[0.12em] text-black/40">
                            THEM
                          </p>

                          <p className="font-display text-2xl mt-1">
                            {
                              selectedCafe.timeB
                            }{" "}
                            min
                          </p>

                        </div>

                      </div>


                      {/* WHY IT WORKS */}

                      <div className="mt-5">

                        <p className="text-[10px] tracking-[0.14em] text-black/40 font-medium">
                          WHY IT WORKS
                        </p>

                        <p className="text-sm leading-relaxed text-black/65 mt-2">

                          A balanced meeting point
                          with an average journey of{" "}

                          <span className="text-black font-medium">
                            {
                              selectedCafe.averageTravelTime
                            }{" "}
                            minutes
                          </span>

                          {" "}and only{" "}

                          <span className="text-black font-medium">
                            {
                              selectedCafe.fairnessDifference
                            }{" "}
                            minutes
                          </span>

                          {" "}difference between your journeys.

                        </p>

                      </div>


                      {/* TAGS */}

                      <div className="flex flex-wrap gap-2 mt-5">

                        {selectedCafe.coffeeQuality !==
                          undefined &&
                          selectedCafe.coffeeQuality >=
                            7 && (
                            <span className="text-xs px-3 py-1.5 bg-[#efece5] rounded-full">
                              Good coffee
                            </span>
                          )}

                        {selectedCafe.seating !==
                          undefined &&
                          selectedCafe.seating >=
                            7 && (
                            <span className="text-xs px-3 py-1.5 bg-[#efece5] rounded-full">
                              Good seating
                            </span>
                          )}

                        {selectedCafe.quiet !==
                          undefined &&
                          selectedCafe.quiet >=
                            7 && (
                            <span className="text-xs px-3 py-1.5 bg-[#efece5] rounded-full">
                              Quiet
                            </span>
                          )}

                        {selectedCafe.independent && (
                          <span className="text-xs px-3 py-1.5 bg-[#efece5] rounded-full">
                            Independent
                          </span>
                        )}

                        {selectedCafe.outdoorSeating && (
                          <span className="text-xs px-3 py-1.5 bg-[#efece5] rounded-full">
                            Outdoor seating
                          </span>
                        )}

                        {selectedCafe.laptopFriendly && (
                          <span className="text-xs px-3 py-1.5 bg-[#efece5] rounded-full">
                            Laptop-friendly
                          </span>
                        )}

                      </div>


                      {/* SCORE */}

                      <div className="mt-5 pt-4 border-t border-black/10 flex items-center justify-between">

                        <div>

                          <p className="text-[9px] tracking-[0.12em] text-black/40">
                            MIDDLE GROUND SCORE
                          </p>

                          <p className="text-xs text-black/45 mt-1">
                            Lower is better
                          </p>

                        </div>

                        <p className="font-display text-2xl">
                          {
                            selectedCafe.score
                          }
                        </p>

                      </div>

                    </div>

                  )}

                </div>

              )}

          </div>

        </section>

      )}

    </main>
  );
}