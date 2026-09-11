export type RankedCafe = {
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


// Known chains we want to exclude
const CHAIN_NAMES = [
  "costa",
  "costa coffee",
  "starbucks",
  "pret",
  "pret a manger",
  "caffè nero",
  "caffe nero",
  "blank street",
  "greggs",
  "paul",
  "gail's",
  "gails",
  "joe & the juice",
  "joe and the juice",
  "black sheep coffee",
  "grind",
];


export function isChainCafe(name?: string) {
  if (!name) return false;

  const normalisedName = name
    .toLowerCase()
    .trim();

  return CHAIN_NAMES.some((chain) =>
    normalisedName.includes(chain)
  );
}


// Produces a 0–10 penalty.
//
// Excellent cafe = close to 0.
// Weak / uncertain cafe = closer to 10.
export function calculateCafeQualityPenalty(
  rating?: number,
  reviewCount?: number
) {
  if (!rating) {
    return 7;
  }

  // Convert Google 1–5 rating into
  // a penalty from approximately 0–10.
  const ratingPenalty =
    Math.max(0, 5 - rating) * 2;

  // Penalise cafes with very little
  // review evidence.
  let reviewPenalty = 0;

  if (!reviewCount) {
    reviewPenalty = 3;
  } else if (reviewCount < 20) {
    reviewPenalty = 2.5;
  } else if (reviewCount < 50) {
    reviewPenalty = 2;
  } else if (reviewCount < 100) {
    reviewPenalty = 1.5;
  } else if (reviewCount < 250) {
    reviewPenalty = 1;
  } else if (reviewCount < 500) {
    reviewPenalty = 0.5;
  }

  return Number(
    Math.min(
      10,
      ratingPenalty + reviewPenalty
    ).toFixed(2)
  );
}


// For now this is zero.
//
// Later we will replace this with actual
// walking time associated with the journey.
export function calculateWalkingPenalty(
  walkA?: number,
  walkB?: number
) {
  if (walkA === undefined || walkB === undefined) {
    return 0;
  }

  const averageWalk = (walkA + walkB) / 2;

  if (averageWalk <= 5) return 0;
  if (averageWalk <= 10) return 2;
  if (averageWalk <= 15) return 5;

  return 10;
}


// Preference penalty:
//
// Independent cafe = 0.
//
// We are already removing known chains,
// but this leaves the field available for
// other preferences later:
// quiet, outdoor seating, laptop friendly etc.
export function calculatePreferencePenalty(
  isChain: boolean
) {
  return isChain ? 10 : 0;
}


export function calculateCafeScore({
  averageTravelTime,
  fairnessDifference,
  cafeQualityPenalty,
  walkingPenalty,
  preferencePenalty,
}: {
  averageTravelTime: number;
  fairnessDifference: number;
  cafeQualityPenalty: number;
  walkingPenalty: number;
  preferencePenalty: number;
}) {
  const score =
    averageTravelTime * 0.4 +
    fairnessDifference * 0.3 +
    cafeQualityPenalty * 0.15 +
    walkingPenalty * 0.1 +
    preferencePenalty * 0.05;

  return Number(score.toFixed(2));
}