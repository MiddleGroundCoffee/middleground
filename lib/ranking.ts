export type RankedCafe = {
  id: string;

  name?: string;

  googleRating?: number;
  googleReviewCount?: number;

  coffeeQuality?: number;
  seating?: number;
  quiet?: number;
  meetingSuitability?: number;

  timeA?: number;
  timeB?: number;

  averageTravelTime?: number;
  fairnessDifference?: number;

  cafeQualityPenalty?: number;
  walkingPenalty?: number;
  preferencePenalty?: number;

  score?: number;
};


function clamp(
  value: number,
  min: number,
  max: number
) {
  return Math.min(
    Math.max(value, min),
    max
  );
}


function googleRatingToTen(
  googleRating?: number
) {
  if (
    googleRating === undefined ||
    googleRating === null
  ) {
    return undefined;
  }

  return clamp(
    googleRating * 2,
    0,
    10
  );
}


/*
  Cafe quality score:

  coffee quality       50%
  seating              20%
  meeting suitability  20%
  Google rating        10%

  If some curated fields are blank,
  the function automatically reweights
  the fields that are available.
*/
export function calculateCafeQualityScore({
  coffeeQuality,
  seating,
  meetingSuitability,
  googleRating,
}: {
  coffeeQuality?: number;
  seating?: number;
  meetingSuitability?: number;
  googleRating?: number;
}) {
  const googleScore =
    googleRatingToTen(
      googleRating
    );

  const components = [
    {
      value: coffeeQuality,
      weight: 0.5,
    },
    {
      value: seating,
      weight: 0.2,
    },
    {
      value: meetingSuitability,
      weight: 0.2,
    },
    {
      value: googleScore,
      weight: 0.1,
    },
  ];

  let weightedTotal = 0;
  let availableWeight = 0;

  for (const component of components) {
    if (
      component.value !== undefined &&
      component.value !== null &&
      Number.isFinite(
        component.value
      )
    ) {
      weightedTotal +=
        clamp(
          component.value,
          0,
          10
        ) *
        component.weight;

      availableWeight +=
        component.weight;
    }
  }

  /*
    If none of the quality data exists,
    use a neutral score.
  */
  if (availableWeight === 0) {
    return 5;
  }

  const score =
    weightedTotal /
    availableWeight;

  return Number(
    score.toFixed(2)
  );
}


/*
  Lower penalty = better cafe.

  Example:
  quality score 9
  becomes penalty 1.
*/
export function calculateCafeQualityPenalty({
  coffeeQuality,
  seating,
  meetingSuitability,
  googleRating,
}: {
  coffeeQuality?: number;
  seating?: number;
  meetingSuitability?: number;
  googleRating?: number;
}) {
  const qualityScore =
    calculateCafeQualityScore({
      coffeeQuality,
      seating,
      meetingSuitability,
      googleRating,
    });

  const penalty =
    10 - qualityScore;

  return Number(
    penalty.toFixed(2)
  );
}


export function calculateWalkingPenalty(
  walkingMinutes?: number
) {
  if (
    walkingMinutes === undefined ||
    walkingMinutes === null
  ) {
    return 0;
  }

  if (walkingMinutes <= 5) {
    return 0;
  }

  if (walkingMinutes <= 10) {
    return 2;
  }

  if (walkingMinutes <= 15) {
    return 5;
  }

  return 10;
}


/*
  For now, curated cafes get no
  preference penalty.

  Later we can use:
  quiet
  outdoor seating
  laptop friendliness
  etc.
*/
export function calculatePreferencePenalty() {
  return 0;
}


/*
  Main Middle Ground formula.

  Lower score = better.
*/
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

  return Number(
    score.toFixed(2)
  );
}