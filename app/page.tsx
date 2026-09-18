"use client";

import { useCallback, useMemo, useState } from "react";

import LocationAutocomplete from "@/components/LocationAutocomplete";
import ResultsMap from "@/components/ResultsMap";
import CafePhoto from "@/components/CafePhoto";

type SelectedLocation = {
  name: string;
  address: string;
  lat: number;
  lng: number;
};

type Cafe = {
  id: string;
  name: string;
  googlePlaceId: string;
  address: string;

  latitude: number;
  longitude: number;

  independent?: boolean | null;

  coffeeQuality?: number | null;
  seating?: number | null;
  quiet?: number | null;
  outdoorSeating?: boolean | null;
  laptopFriendly?: boolean | null;
  meetingSuitability?: number | null;

  googleRating?: number | null;
  googleReviewCount?: number | null;

  distanceKm?: number;

  yourTravelMinutes?: number;
  theirTravelMinutes?: number;

  averageTravelMinutes?: number;
  fairnessDifference?: number;

  cafeQualityScore?: number;
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

type RouteResult = {
  originIndex?: number;
  destinationIndex?: number;

  durationMinutes?: number;
  durationSeconds?: number;

  duration?: number | string;

  condition?: string;
};

const FILTERS: {
  key: keyof Preferences;
  label: string;
}[] = [
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
];

const INITIAL_PREFERENCES: Preferences = {
  goodCoffee: true,
  adequateSeating: false,
  independent: true,
  outdoorSeating: false,
  quiet: true,
  laptopFriendly: false,
};

function clamp(
  value: number,
  minimum: number,
  maximum: number
) {
  return Math.min(
    maximum,
    Math.max(minimum, value)
  );
}

function normaliseNumber(
  value: unknown
): number | undefined {
  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(
      value.replace(/[^\d.-]/g, "")
    );

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return undefined;
}

function calculateCafeQualityScore(
  cafe: Cafe
) {
  const weightedValues: {
    value: number;
    weight: number;
  }[] = [];

  if (
    typeof cafe.coffeeQuality ===
    "number"
  ) {
    weightedValues.push({
      value: cafe.coffeeQuality,
      weight: 0.5,
    });
  }

  if (
    typeof cafe.seating ===
    "number"
  ) {
    weightedValues.push({
      value: cafe.seating,
      weight: 0.2,
    });
  }

  if (
    typeof cafe.meetingSuitability ===
    "number"
  ) {
    weightedValues.push({
      value:
        cafe.meetingSuitability,
      weight: 0.2,
    });
  }

  if (
    typeof cafe.googleRating ===
    "number"
  ) {
    weightedValues.push({
      value:
        cafe.googleRating * 2,
      weight: 0.1,
    });
  }

  if (
    weightedValues.length === 0
  ) {
    return 5;
  }

  const totalWeight =
    weightedValues.reduce(
      (sum, item) =>
        sum + item.weight,
      0
    );

  const weightedScore =
    weightedValues.reduce(
      (sum, item) =>
        sum +
        item.value * item.weight,
      0
    );

  return clamp(
    weightedScore / totalWeight,
    0,
    10
  );
}

function calculatePreferencePenalty(
  cafe: Cafe,
  preferences: Preferences
) {
  const penalties: number[] = [];

  if (
    preferences.goodCoffee &&
    typeof cafe.coffeeQuality ===
      "number"
  ) {
    penalties.push(
      10 - cafe.coffeeQuality
    );
  }

  if (
    preferences.adequateSeating &&
    typeof cafe.seating ===
      "number"
  ) {
    penalties.push(
      10 - cafe.seating
    );
  }

  if (
    preferences.independent &&
    typeof cafe.independent ===
      "boolean"
  ) {
    penalties.push(
      cafe.independent ? 0 : 10
    );
  }

  if (
    preferences.outdoorSeating &&
    typeof cafe.outdoorSeating ===
      "boolean"
  ) {
    penalties.push(
      cafe.outdoorSeating ? 0 : 10
    );
  }

  if (
    preferences.quiet &&
    typeof cafe.quiet ===
      "number"
  ) {
    penalties.push(
      10 - cafe.quiet
    );
  }

  if (
    preferences.laptopFriendly &&
    typeof cafe.laptopFriendly ===
      "boolean"
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

  return (
    penalties.reduce(
      (sum, value) =>
        sum + value,
      0
    ) / penalties.length
  );
}

function scoreCafe(
  cafe: Cafe,
  preferences: Preferences
): Cafe {
  const yourTravelMinutes =
    cafe.yourTravelMinutes ?? 0;

  const theirTravelMinutes =
    cafe.theirTravelMinutes ?? 0;

  const averageTravelMinutes =
    (yourTravelMinutes +
      theirTravelMinutes) /
    2;

  const fairnessDifference =
    Math.abs(
      yourTravelMinutes -
        theirTravelMinutes
    );

  const cafeQualityScore =
    calculateCafeQualityScore(
      cafe
    );

  const cafeQualityPenalty =
    10 - cafeQualityScore;

  /*
    Walking penalty is deliberately
    neutral for now.

    Later we can calculate this from
    the walking legs of transit routes.
  */
  const walkingPenalty = 0;

  const preferencePenalty =
    calculatePreferencePenalty(
      cafe,
      preferences
    );

  const score =
    averageTravelMinutes * 0.4 +
    fairnessDifference * 0.3 +
    cafeQualityPenalty * 0.15 +
    walkingPenalty * 0.1 +
    preferencePenalty * 0.05;

  return {
    ...cafe,

    averageTravelMinutes,
    fairnessDifference,

    cafeQualityScore,
    cafeQualityPenalty,
    walkingPenalty,
    preferencePenalty,

    score,
  };
}

function durationToMinutes(
  value: unknown
) {
  if (
    typeof value === "number"
  ) {
    /*
      If Google returned seconds,
      numbers above a few hundred
      are almost certainly seconds.
    */
    if (value > 300) {
      return value / 60;
    }

    return value;
  }

  if (typeof value === "string") {
    /*
      Google Routes often returns
      durations such as "1234s".
    */
    if (value.endsWith("s")) {
      const seconds =
        Number.parseFloat(
          value.slice(0, -1)
        );

      if (
        Number.isFinite(seconds)
      ) {
        return seconds / 60;
      }
    }

    const numeric =
      Number.parseFloat(value);

    if (
      Number.isFinite(numeric)
    ) {
      return numeric;
    }
  }

  return undefined;
}

function extractRouteResults(
  payload: unknown
): RouteResult[] {
  if (Array.isArray(payload)) {
    return payload as RouteResult[];
  }

  if (
    payload &&
    typeof payload === "object"
  ) {
    const object =
      payload as Record<
        string,
        unknown
      >;

    const candidates = [
      object.routes,
      object.results,
      object.matrix,
      object.routeMatrix,
    ];

    for (
      const candidate of candidates
    ) {
      if (
        Array.isArray(candidate)
      ) {
        return candidate as RouteResult[];
      }
    }
  }

  return [];
}

function getDurationMinutes(
  route: RouteResult
) {
  if (
    typeof route.durationMinutes ===
    "number"
  ) {
    return route.durationMinutes;
  }

  if (
    typeof route.durationSeconds ===
    "number"
  ) {
    return (
      route.durationSeconds / 60
    );
  }

  return durationToMinutes(
    route.duration
  );
}

function preferenceTags(
  cafe: Cafe
) {
  const tags: string[] = [];

  if (
    typeof cafe.coffeeQuality ===
      "number" &&
    cafe.coffeeQuality >= 7
  ) {
    tags.push("Good coffee");
  }

  if (
    typeof cafe.seating ===
      "number" &&
    cafe.seating >= 7
  ) {
    tags.push("Good seating");
  }

  if (cafe.independent) {
    tags.push("Independent");
  }

  if (cafe.outdoorSeating) {
    tags.push("Outdoor seating");
  }

  if (
    typeof cafe.quiet ===
      "number" &&
    cafe.quiet >= 7
  ) {
    tags.push("Quiet");
  }

  if (cafe.laptopFriendly) {
    tags.push("Laptop-friendly");
  }

  return tags;
}

function whyItWorks(
  cafe: Cafe
) {
  const average =
    cafe.averageTravelMinutes ??
    0;

  const difference =
    cafe.fairnessDifference ??
    0;

  if (
    difference <= 3
  ) {
    return `A very even meeting point, with only around ${Math.round(
      difference
    )} minutes between your journeys.`;
  }

  if (
    difference <= 7
  ) {
    return `A well-balanced option with an average journey of around ${Math.round(
      average
    )} minutes each.`;
  }

  return `A convenient shared option with an average journey of around ${Math.round(
    average
  )} minutes.`;
}

export default function Home() {
  const [
    yourLocation,
    setYourLocation,
  ] =
    useState<SelectedLocation | null>(
      null
    );

  const [
    theirLocation,
    setTheirLocation,
  ] =
    useState<SelectedLocation | null>(
      null
    );

  const [
    travelMode,
    setTravelMode,
  ] =
    useState("TRANSIT");

  const [
    preferences,
    setPreferences,
  ] =
    useState<Preferences>(
      INITIAL_PREFERENCES
    );

  const [
    message,
    setMessage,
  ] =
    useState("");

  const [
    searching,
    setSearching,
  ] =
    useState(false);

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
    useMemo(() => {
      return (
        cafes.find(
          (cafe) =>
            cafe.id ===
            selectedCafeId
        ) ??
        cafes[0] ??
        null
      );
    }, [
      cafes,
      selectedCafeId,
    ]);

  const rerankCafes =
    useCallback(
      (
        baseCafes: Cafe[],
        nextPreferences: Preferences
      ) => {
        const ranked =
          baseCafes
            .map((cafe) =>
              scoreCafe(
                cafe,
                nextPreferences
              )
            )
            .sort(
              (a, b) =>
                (a.score ??
                  Infinity) -
                (b.score ??
                  Infinity)
            );

        setAllScoredCafes(
          ranked
        );

        const topThree =
          ranked.slice(0, 3);

        setCafes(topThree);

        setSelectedCafeId(
          (current) => {
            if (
              current &&
              topThree.some(
                (cafe) =>
                  cafe.id ===
                  current
              )
            ) {
              return current;
            }

            return (
              topThree[0]?.id ??
              null
            );
          }
        );
      },
      []
    );

  function togglePreference(
    key: keyof Preferences
  ) {
    const nextPreferences = {
      ...preferences,
      [key]: !preferences[key],
    };

    setPreferences(
      nextPreferences
    );

    if (
      allScoredCafes.length >
      0
    ) {
      rerankCafes(
        allScoredCafes,
        nextPreferences
      );
    }
  }

  async function handleSearch(
    mode = travelMode
  ) {
    if (
      !yourLocation ||
      !theirLocation
    ) {
      setMessage(
        "Please choose both starting points."
      );

      return;
    }

    setSearching(true);
    setMessage("");

    try {
      const midpoint = {
        lat:
          (yourLocation.lat +
            theirLocation.lat) /
          2,

        lng:
          (yourLocation.lng +
            theirLocation.lng) /
          2,
      };

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
              latitude:
                midpoint.lat,
              longitude:
                midpoint.lng,

              lat: midpoint.lat,
              lng: midpoint.lng,

              midpoint,
            }),
          }
        );

      if (
        !cafeResponse.ok
      ) {
        const text =
          await cafeResponse.text();

        throw new Error(
          text ||
            "Could not load cafes."
        );
      }

      const cafePayload =
        await cafeResponse.json();

      const candidates: Cafe[] =
        Array.isArray(
          cafePayload
        )
          ? cafePayload
          : cafePayload.places ??
            cafePayload.cafes ??
            [];

      if (
        candidates.length ===
        0
      ) {
        throw new Error(
          "No cafes were found near the midpoint."
        );
      }

      const routesResponse =
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
          lat: yourLocation.lat,
          lng: yourLocation.lng,
        },

        personB: {
          lat: theirLocation.lat,
          lng: theirLocation.lng,
        },

        cafes: candidates,

        travelMode: mode,
      }),
    }
  );

      if (
        !routesResponse.ok
      ) {
        const text =
          await routesResponse.text();

        throw new Error(
          text ||
            "Could not calculate journeys."
        );
      }

      const routePayload =
        await routesResponse.json();

      const routeResults =
        extractRouteResults(
          routePayload
        );

      const cafesWithTravel =
        candidates.map(
          (
            cafe,
            cafeIndex
          ) => {
            const yourRoute =
              routeResults.find(
                (route) =>
                  route.originIndex ===
                    0 &&
                  route.destinationIndex ===
                    cafeIndex
              );

            const theirRoute =
              routeResults.find(
                (route) =>
                  route.originIndex ===
                    1 &&
                  route.destinationIndex ===
                    cafeIndex
              );

            let yourMinutes =
              yourRoute
                ? getDurationMinutes(
                    yourRoute
                  )
                : undefined;

            let theirMinutes =
              theirRoute
                ? getDurationMinutes(
                    theirRoute
                  )
                : undefined;

            /*
              Some route implementations
              return one object per cafe
              with explicit values instead.
            */
            const rawCafeRoute =
              routeResults[
                cafeIndex
              ] as
                | (RouteResult & {
                    yourTravelMinutes?: number;
                    theirTravelMinutes?: number;
                    yourMinutes?: number;
                    theirMinutes?: number;
                  })
                | undefined;

            if (
              yourMinutes ===
                undefined &&
              rawCafeRoute
            ) {
              yourMinutes =
                normaliseNumber(
                  rawCafeRoute.yourTravelMinutes ??
                    rawCafeRoute.yourMinutes
                );
            }

            if (
              theirMinutes ===
                undefined &&
              rawCafeRoute
            ) {
              theirMinutes =
                normaliseNumber(
                  rawCafeRoute.theirTravelMinutes ??
                    rawCafeRoute.theirMinutes
                );
            }

            return {
              ...cafe,

              yourTravelMinutes:
                yourMinutes,

              theirTravelMinutes:
                theirMinutes,
            };
          }
        );

      const usableCafes =
        cafesWithTravel.filter(
          (cafe) =>
            typeof cafe.yourTravelMinutes ===
              "number" &&
            typeof cafe.theirTravelMinutes ===
              "number"
        );

      if (
        usableCafes.length ===
        0
      ) {
        throw new Error(
          "Google could not calculate journeys to the nearby cafes."
        );
      }

      rerankCafes(
        usableCafes,
        preferences
      );
    } catch (error) {
      console.error(error);

      setMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setSearching(false);
    }
  }

  function changeTravelMode(
    nextMode: string
  ) {
    setTravelMode(
      nextMode
    );

    if (
      yourLocation &&
      theirLocation &&
      allScoredCafes.length >
        0
    ) {
      void handleSearch(
        nextMode
      );
    }
  }

  const hasResults =
    cafes.length > 0;

  return (
    <main className="min-h-screen bg-[#f6f3ee] text-[#26241f]">
      {/* Header */}
      <header className="border-b border-black/10">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between px-5 py-6 sm:px-8 md:py-8">
          <div className="flex items-baseline gap-4">
            <div className="font-display text-[31px] leading-none sm:text-[38px] md:text-[42px]">
              Middle Ground
            </div>

            <div className="font-mono-brand text-[10px] tracking-[0.22em] text-black/45 sm:text-[11px]">
              LONDON
            </div>
          </div>

          <nav className="hidden items-center gap-7 text-[13px] text-black/60 md:flex">
            <button
              type="button"
              className="transition hover:text-black"
            >
              How it works
            </button>

            <button
              type="button"
              className="transition hover:text-black"
            >
              Saved spots
            </button>

            <button
              type="button"
              className="transition hover:text-black"
            >
              Sign in
            </button>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-3xl px-5 pb-5 pt-8 text-center sm:px-6 sm:pb-8 sm:pt-12 md:pt-20">
        <h1 className="font-display text-[40px] font-normal leading-[0.98] tracking-[-0.025em] sm:text-[48px] md:text-[60px]">
          <span className="block">
            Find the fairest coffee
          </span>

          <em className="mt-2 block whitespace-nowrap text-[38px] font-normal sm:text-[46px] md:text-[60px]">
            between you two.
          </em>
        </h1>

        <p className="mx-auto mt-6 max-w-md text-[14px] leading-7 text-black/50 sm:text-[15px]">
          Two starting points,
          one cafe.
          <br />
          Convenient for you
          both.
        </p>
      </section>

      {/* Search */}
      <section className="mx-auto max-w-[660px] px-5 pb-14 sm:px-6">
        <div className="overflow-visible rounded-md border border-black/15 bg-[#fffdfa]">
          {/* YOU */}
          <div className="relative z-30 flex items-center gap-4 px-5 py-5">
            <div className="flex w-5 flex-none justify-center">
              <span className="h-[10px] w-[10px] rounded-full bg-[#26241f]" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="font-mono-brand mb-2 text-[10px] tracking-[0.22em] text-black/40">
                YOU
              </div>

              <LocationAutocomplete
                placeholder="Postcode, station or address"
                onPlaceSelected={
                  setYourLocation
                }
              />
            </div>
          </div>

          <div className="mx-5 border-t border-black/10" />

          {/* THEM */}
          <div className="relative z-10 flex items-center gap-4 px-5 py-5">
            <div className="flex w-5 flex-none justify-center">
              <span className="h-[10px] w-[10px] rounded-full border-2 border-[#26241f]" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="font-mono-brand mb-2 text-[10px] tracking-[0.22em] text-black/40">
                THEM
              </div>

              <LocationAutocomplete
                placeholder="Postcode, station or address"
                onPlaceSelected={
                  setTheirLocation
                }
              />
            </div>
          </div>
        </div>

        <div className="mt-7">
          <label
            htmlFor="travel-mode"
            className="font-mono-brand mb-3 block text-[10px] tracking-[0.2em] text-black/40"
          >
            TRAVEL MODE
          </label>

          <select
            id="travel-mode"
            value={travelMode}
            onChange={(event) =>
              changeTravelMode(
                event.target.value
              )
            }
            className="w-full rounded-md border border-black/15 bg-[#fffdfa] px-4 py-3 text-[15px] outline-none"
          >
            <option value="TRANSIT">
              Public transport
            </option>

            <option value="WALK">
              Walking
            </option>

            <option value="DRIVE">
              Driving
            </option>

            <option value="BICYCLE">
              Cycling
            </option>
          </select>
        </div>

        <div className="mt-7">
          <div className="font-mono-brand mb-3 text-[10px] tracking-[0.2em] text-black/40">
            WHAT MATTERS
          </div>

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
                    className={[
                      "rounded-full border px-4 py-2 text-[13px] transition",
                      active
                        ? "border-[#8a5a41] bg-[#8a5a41] text-white"
                        : "border-black/15 bg-[#fffdfa] text-black/65 hover:border-black/30",
                    ].join(" ")}
                  >
                    {filter.label}
                  </button>
                );
              }
            )}
          </div>
        </div>

        {message && (
          <p className="mt-5 text-center text-[13px] text-[#8a5a41]">
            {message}
          </p>
        )}

        <button
          type="button"
          disabled={
            searching
          }
          onClick={() =>
            void handleSearch()
          }
          className="mt-7 w-full rounded-md bg-[#26241f] px-5 py-4 text-[14px] font-medium text-white transition hover:bg-black disabled:cursor-wait disabled:opacity-60"
        >
          {searching
            ? "Finding your middle ground…"
            : "Find our middle ground"}
        </button>
      </section>

      {/* Results */}
      {hasResults &&
        yourLocation &&
        theirLocation && (
          <section className="border-t border-black/10 bg-[#f2efe8]">
            <div className="mx-auto grid w-full max-w-[1500px] grid-cols-1 items-stretch lg:grid-cols-[220px_460px_minmax(0,1fr)]">
              {/* Filters */}
              <aside className="hidden border-r border-black/10 px-6 py-8 lg:block">
                <div className="font-mono-brand text-[10px] tracking-[0.2em] text-black/40">
                  FILTERS
                </div>

                <div className="mt-5 space-y-3">
                  {FILTERS.map(
                    (filter) => (
                      <label
                        key={
                          filter.key
                        }
                        className="flex cursor-pointer items-center gap-3 text-[13px]"
                      >
                        <input
                          type="checkbox"
                          checked={
                            preferences[
                              filter
                                .key
                            ]
                          }
                          onChange={() =>
                            togglePreference(
                              filter.key
                            )
                          }
                        />

                        {
                          filter.label
                        }
                      </label>
                    )
                  )}
                </div>
              </aside>

              {/* Top picks */}
              <div className="border-r border-black/10 px-5 py-7 sm:px-7">
                <div className="font-mono-brand mb-5 text-[10px] tracking-[0.2em] text-black/40">
                  YOUR PICKS
                </div>

                <div className="space-y-3">
                  {cafes.map(
                    (
                      cafe,
                      index
                    ) => {
                      const selected =
                        selectedCafe?.id ===
                        cafe.id;

                      return (
                        <button
                          type="button"
                          key={
                            cafe.id
                          }
                          onClick={() =>
                            setSelectedCafeId(
                              cafe.id
                            )
                          }
                          className={[
                            "w-full overflow-hidden rounded-md border bg-[#fffdfa] text-left transition",
                            selected
                              ? "border-[#8a5a41] shadow-sm"
                              : "border-black/10 hover:border-black/25",
                          ].join(
                            " "
                          )}
                        >
                          <div className="flex gap-4 p-4">
                            <CafePhoto
                              placeId={
                                cafe.googlePlaceId
                              }
                              name={
                                cafe.name
                              }
                              className="h-[92px] w-[92px] flex-none rounded object-cover"
                            />

                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <div className="font-mono-brand text-[9px] tracking-[0.18em] text-[#8a5a41]">
                                    #
                                    {index +
                                      1}
                                  </div>

                                  <h2 className="font-display mt-1 text-[24px] leading-[1.05]">
                                    {
                                      cafe.name
                                    }
                                  </h2>
                                </div>
                              </div>

                              <p className="mt-2 line-clamp-2 text-[12px] leading-5 text-black/45">
                                {
                                  cafe.address
                                }
                              </p>

                              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-black/55">
                                <span>
                                  You{" "}
                                  <strong className="font-medium text-black/75">
                                    {Math.round(
                                      cafe.yourTravelMinutes ??
                                        0
                                    )}
                                    m
                                  </strong>
                                </span>

                                <span>
                                  Them{" "}
                                  <strong className="font-medium text-black/75">
                                    {Math.round(
                                      cafe.theirTravelMinutes ??
                                        0
                                    )}
                                    m
                                  </strong>
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="border-t border-black/10 px-4 py-3">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-mono-brand tracking-[0.12em] text-black/35">
                                FAIRNESS
                              </span>

                              <span>
                                {Math.round(
                                  cafe.fairnessDifference ??
                                    0
                                )}
                                {" "}min difference
                              </span>
                            </div>
                          </div>
                        </button>
                      );
                    }
                  )}
                </div>
              </div>

              {/* Map and selected cafe */}
              <div className="hidden min-w-0 flex-col lg:flex">
                <ResultsMap
                  yourLocation={
                    yourLocation
                  }
                  theirLocation={
                    theirLocation
                  }
                  cafes={cafes}
                  selectedCafeId={
                    selectedCafeId
                  }
                />

                {selectedCafe && (
                  <div className="min-h-0 flex-1 overflow-y-auto border-t border-black/10 bg-[#fffdfa] px-7 py-6">
                    <div className="font-mono-brand text-[10px] tracking-[0.2em] text-[#8a5a41]">
                      SELECTED SPOT
                    </div>

                    <div className="mt-3 flex items-start justify-between gap-6">
                      <div>
                        <h2 className="font-display text-[32px] leading-none">
                          {
                            selectedCafe.name
                          }
                        </h2>

                        <p className="mt-2 max-w-xl text-[12px] leading-5 text-black/45">
                          {
                            selectedCafe.address
                          }
                        </p>
                      </div>

                      {typeof selectedCafe.googleRating ===
                        "number" && (
                        <div className="text-right">
                          <div className="text-[16px]">
                            ★{" "}
                            {
                              selectedCafe.googleRating
                            }
                          </div>

                          {typeof selectedCafe.googleReviewCount ===
                            "number" && (
                            <div className="mt-1 text-[10px] text-black/40">
                              {
                                selectedCafe.googleReviewCount
                              }{" "}
                              reviews
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="mt-6 grid grid-cols-2 gap-3">
                      <div className="border border-black/10 p-4">
                        <div className="font-mono-brand text-[9px] tracking-[0.16em] text-black/35">
                          YOU
                        </div>

                        <div className="font-display mt-2 text-[27px]">
                          {Math.round(
                            selectedCafe.yourTravelMinutes ??
                              0
                          )}{" "}
                          min
                        </div>
                      </div>

                      <div className="border border-black/10 p-4">
                        <div className="font-mono-brand text-[9px] tracking-[0.16em] text-black/35">
                          THEM
                        </div>

                        <div className="font-display mt-2 text-[27px]">
                          {Math.round(
                            selectedCafe.theirTravelMinutes ??
                              0
                          )}{" "}
                          min
                        </div>
                      </div>
                    </div>

                    <div className="mt-6">
                      <div className="font-mono-brand text-[9px] tracking-[0.16em] text-black/35">
                        WHY IT WORKS
                      </div>

                      <p className="mt-2 max-w-xl text-[13px] leading-6 text-black/60">
                        {whyItWorks(
                          selectedCafe
                        )}
                      </p>
                    </div>

                    {preferenceTags(
                      selectedCafe
                    ).length >
                      0 && (
                      <div className="mt-5 flex flex-wrap gap-2">
                        {preferenceTags(
                          selectedCafe
                        ).map(
                          (tag) => (
                            <span
                              key={
                                tag
                              }
                              className="rounded-full border border-black/10 px-3 py-1.5 text-[11px] text-black/55"
                            >
                              {
                                tag
                              }
                            </span>
                          )
                        )}
                      </div>
                    )}

                    <div className="mt-6 border-t border-black/10 pt-5">
                      <div className="flex items-end justify-between">
                        <div>
                          <div className="font-mono-brand text-[9px] tracking-[0.16em] text-black/35">
                            MIDDLE
                            GROUND SCORE
                          </div>

                          <div className="mt-1 text-[10px] text-black/35">
                            Lower is
                            better
                          </div>
                        </div>

                        <div className="font-display text-[32px]">
                          {(
                            selectedCafe.score ??
                            0
                          ).toFixed(
                            1
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile selected cafe */}
            {selectedCafe && (
              <div className="border-t border-black/10 bg-[#fffdfa] px-5 py-7 lg:hidden">
                <div className="font-mono-brand text-[9px] tracking-[0.18em] text-[#8a5a41]">
                  SELECTED SPOT
                </div>

                <h2 className="font-display mt-2 text-[30px]">
                  {
                    selectedCafe.name
                  }
                </h2>

                <p className="mt-2 text-[12px] leading-5 text-black/45">
                  {
                    selectedCafe.address
                  }
                </p>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="border border-black/10 p-4">
                    <div className="font-mono-brand text-[9px] tracking-[0.16em] text-black/35">
                      YOU
                    </div>

                    <div className="font-display mt-1 text-[25px]">
                      {Math.round(
                        selectedCafe.yourTravelMinutes ??
                          0
                      )}{" "}
                      min
                    </div>
                  </div>

                  <div className="border border-black/10 p-4">
                    <div className="font-mono-brand text-[9px] tracking-[0.16em] text-black/35">
                      THEM
                    </div>

                    <div className="font-display mt-1 text-[25px]">
                      {Math.round(
                        selectedCafe.theirTravelMinutes ??
                          0
                      )}{" "}
                      min
                    </div>
                  </div>
                </div>

                <div className="mt-5">
                  <div className="font-mono-brand text-[9px] tracking-[0.16em] text-black/35">
                    WHY IT WORKS
                  </div>

                  <p className="mt-2 text-[13px] leading-6 text-black/60">
                    {whyItWorks(
                      selectedCafe
                    )}
                  </p>
                </div>
              </div>
            )}
          </section>
        )}

      <footer className="border-t border-black/10 px-5 py-8 text-center text-[11px] text-black/35">
        Middle Ground · London
      </footer>
    </main>
  );
}