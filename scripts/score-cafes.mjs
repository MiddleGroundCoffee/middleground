import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import OpenAI from "openai";
import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";

dotenv.config({
  path: ".env.local",
});

const GOOGLE_API_KEY =
  process.env.GOOGLE_MAPS_API_KEY;

const OPENAI_API_KEY =
  process.env.OPENAI_API_KEY;

if (!GOOGLE_API_KEY) {
  console.error(
    "GOOGLE_MAPS_API_KEY is missing from .env.local"
  );

  process.exit(1);
}

if (!OPENAI_API_KEY) {
  console.error(
    "OPENAI_API_KEY is missing from .env.local"
  );

  process.exit(1);
}

const openai =
  new OpenAI({
    apiKey: OPENAI_API_KEY,
  });

/*
  Use cafes_attributes.csv if you created it
  in the previous step.

  Otherwise change this to cafes.csv.
*/
const inputPath =
  path.join(
    process.cwd(),
    "data",
    "cafes_attributes.csv"
  );

const outputPath =
  path.join(
    process.cwd(),
    "data",
    "cafes_scored.csv"
  );

if (!fs.existsSync(inputPath)) {
  console.error(
    `Could not find ${inputPath}`
  );

  console.error(
    "If you did not create cafes_attributes.csv, change inputPath to data/cafes.csv."
  );

  process.exit(1);
}

const csvContents =
  fs.readFileSync(
    inputPath,
    "utf8"
  );

const cafes =
  parse(
    csvContents,
    {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }
  );


function wait(milliseconds) {
  return new Promise(
    (resolve) =>
      setTimeout(
        resolve,
        milliseconds
      )
  );
}


/*
  Fetch Google reviews for a cafe.

  Google currently returns a maximum
  of five reviews in Place Details.
*/
async function getGoogleReviews(
  placeId
) {
  const response =
    await fetch(
      `https://places.googleapis.com/v1/places/${placeId}`,
      {
        headers: {
          "X-Goog-Api-Key":
            GOOGLE_API_KEY,

          "X-Goog-FieldMask": [
            "rating",
            "userRatingCount",
            "reviews",
          ].join(","),
        },
      }
    );

  const text =
    await response.text();

  if (!response.ok) {
    console.error(
      "Google review request failed:",
      text
    );

    return null;
  }

  return JSON.parse(text);
}


function cleanReview(
  review
) {
  return {
    rating:
      review.rating ?? null,

    text:
      review.text?.text ||
      review.originalText?.text ||
      "",

    published:
      review.relativePublishTimeDescription ||
      review.publishTime ||
      "",
  };
}


/*
  Ask OpenAI to assess only what the
  reviews actually support.

  Missing evidence should produce null,
  rather than invented information.
*/
async function scoreCafe({
  cafe,
  reviews,
  googleRating,
  googleReviewCount,
}) {
  const evidence =
    reviews
      .map(
        (review, index) => `
REVIEW ${index + 1}
Rating: ${review.rating ?? "unknown"}
Published: ${review.published || "unknown"}
Text: ${review.text || "No review text"}
`
      )
      .join("\n");

  const response =
    await openai.responses.create({
      /*
        Luna is appropriate here because
        this is a repetitive structured
        classification task.
      */
      model:
        "gpt-5.6-luna",

      store: false,

      instructions: `
You are scoring cafes for a London coffee-meeting recommendation product.

Your job is to assess ONLY the evidence supplied.

Do not use outside knowledge.
Do not invent facts about the cafe.
Do not assume that a high Google star rating means a cafe is quiet, spacious or laptop-friendly.

Scoring system:

coffee_quality:
1-3 = repeated negative evidence about coffee
4-6 = ordinary or mixed
7-8 = clear positive evidence about coffee quality
9-10 = unusually strong and repeated evidence of exceptional coffee

seating:
1-3 = very limited seating, cramped, hard to get a table
4-6 = mixed or adequate
7-8 = clearly good amount of seating
9-10 = unusually spacious / excellent seating availability

quiet:
1-3 = noisy, hectic, crowded
4-6 = mixed or ordinary
7-8 = generally calm / conversation-friendly
9-10 = unusually quiet

laptop_friendly:
true = clear evidence that working on laptops is suitable
false = clear evidence that laptops are discouraged or unsuitable
null = insufficient evidence

meeting_suitability:
1-3 = poor place to sit and talk
4-6 = workable
7-8 = clearly good for meeting someone
9-10 = especially strong meeting environment

IMPORTANT:
If there is not enough evidence for a numeric category, return null.
A missing score is preferable to guessing.

Also return a short evidence_summary explaining the basis of the scores.
`,

      input: `
CAFE:
${cafe.name}

ADDRESS:
${cafe.address || "unknown"}

GOOGLE RATING:
${googleRating ?? "unknown"}

GOOGLE REVIEW COUNT:
${googleReviewCount ?? "unknown"}

REVIEWS:
${evidence || "No usable review text"}
`,

      text: {
        format: {
          type:
            "json_schema",

          name:
            "cafe_score",

          strict: true,

          schema: {
            type: "object",

            properties: {
              coffee_quality: {
                anyOf: [
                  {
                    type:
                      "number",
                    minimum: 1,
                    maximum: 10,
                  },
                  {
                    type:
                      "null",
                  },
                ],
              },

              seating: {
                anyOf: [
                  {
                    type:
                      "number",
                    minimum: 1,
                    maximum: 10,
                  },
                  {
                    type:
                      "null",
                  },
                ],
              },

              quiet: {
                anyOf: [
                  {
                    type:
                      "number",
                    minimum: 1,
                    maximum: 10,
                  },
                  {
                    type:
                      "null",
                  },
                ],
              },

              laptop_friendly: {
                anyOf: [
                  {
                    type:
                      "boolean",
                  },
                  {
                    type:
                      "null",
                  },
                ],
              },

              meeting_suitability: {
                anyOf: [
                  {
                    type:
                      "number",
                    minimum: 1,
                    maximum: 10,
                  },
                  {
                    type:
                      "null",
                  },
                ],
              },

              evidence_summary: {
                type: "string",
              },
            },

            required: [
              "coffee_quality",
              "seating",
              "quiet",
              "laptop_friendly",
              "meeting_suitability",
              "evidence_summary",
            ],

            additionalProperties:
              false,
          },
        },
      },
    });

  return JSON.parse(
    response.output_text
  );
}


function csvNumber(
  value,
  existingValue
) {
  if (
    value === null ||
    value === undefined
  ) {
    return existingValue || "";
  }

  return String(
    Number(
      Number(value).toFixed(1)
    )
  );
}


function csvBoolean(
  value,
  existingValue
) {
  if (
    value === null ||
    value === undefined
  ) {
    return existingValue || "";
  }

  return value
    ? "TRUE"
    : "FALSE";
}


function saveResults(
  rows
) {
  const output =
    stringify(
      rows,
      {
        header: true,

        columns: [
          "id",
          "name",
          "google_place_id",
          "address",
          "latitude",
          "longitude",
          "independent",
          "coffee_quality",
          "seating",
          "quiet",
          "outdoor_seating",
          "laptop_friendly",
          "meeting_suitability",
          "google_rating",
          "google_review_count",
          "scoring_evidence",
        ],
      }
    );

  fs.writeFileSync(
    outputPath,
    output
  );
}


async function main() {
  console.log(
    `Found ${cafes.length} cafes.`
  );

  console.log(
    "Starting review-based scoring..."
  );

  const results = [];

  let scored = 0;
  let noEvidence = 0;
  let skipped = 0;
  let errors = 0;

for (
  let i = 0;
  i < cafes.length;
  i++
) {
    const cafe =
      cafes[i];

    console.log("");
    console.log(
      `[${i + 1}/${cafes.length}] ${cafe.name}`
    );

    if (
      !cafe.google_place_id
    ) {
      console.log(
        "  No Google Place ID - skipping."
      );

      results.push(
        cafe
      );

      skipped++;

      continue;
    }

    try {
      /*
        Step A:
        get review evidence from Google.
      */
      const place =
        await getGoogleReviews(
          cafe.google_place_id
        );

      if (!place) {
        console.log(
          "  No Google data returned."
        );

        results.push(
          cafe
        );

        errors++;

        continue;
      }

      const reviews =
        (
          place.reviews || []
        )
          .map(
            cleanReview
          )
          .filter(
            (review) =>
              review.text
          );

      console.log(
        `  Reviews available: ${reviews.length}`
      );

      if (
        reviews.length === 0
      ) {
        console.log(
          "  No usable review text - leaving subjective scores unchanged."
        );

        results.push({
          ...cafe,

          google_rating:
            place.rating ??
            cafe.google_rating ??
            "",

          google_review_count:
            place.userRatingCount ??
            cafe.google_review_count ??
            "",
        });

        noEvidence++;

        continue;
      }

      /*
        Step B:
        ask OpenAI to turn the evidence
        into structured draft scores.
      */
      const score =
        await scoreCafe({
          cafe,

          reviews,

          googleRating:
            place.rating ??
            cafe.google_rating,

          googleReviewCount:
            place.userRatingCount ??
            cafe.google_review_count,
        });

      const updatedCafe = {
        ...cafe,

        google_rating:
          place.rating ??
          cafe.google_rating ??
          "",

        google_review_count:
          place.userRatingCount ??
          cafe.google_review_count ??
          "",

        coffee_quality:
          csvNumber(
            score.coffee_quality,
            cafe.coffee_quality
          ),

        seating:
          csvNumber(
            score.seating,
            cafe.seating
          ),

        quiet:
          csvNumber(
            score.quiet,
            cafe.quiet
          ),

        laptop_friendly:
          csvBoolean(
            score.laptop_friendly,
            cafe.laptop_friendly
          ),

        meeting_suitability:
          csvNumber(
            score.meeting_suitability,
            cafe.meeting_suitability
          ),

        scoring_evidence:
          score.evidence_summary,
      };

      console.log(
        `  Coffee: ${updatedCafe.coffee_quality || "unknown"}`
      );

      console.log(
        `  Seating: ${updatedCafe.seating || "unknown"}`
      );

      console.log(
        `  Quiet: ${updatedCafe.quiet || "unknown"}`
      );

      console.log(
        `  Laptop-friendly: ${updatedCafe.laptop_friendly || "unknown"}`
      );

      console.log(
        `  Meeting suitability: ${updatedCafe.meeting_suitability || "unknown"}`
      );

      console.log(
        `  Evidence: ${updatedCafe.scoring_evidence}`
      );

      results.push(
        updatedCafe
      );

      scored++;
    } catch (error) {
      console.error(
        "  Error:",
        error
      );

      results.push(
        cafe
      );

      errors++;
    }

    /*
      Save every 10 cafes so a failure
      does not lose all progress.
    */
    if (
      (i + 1) % 10 ===
      0
    ) {
      saveResults(
        results
      );

      console.log(
        "  Progress saved."
      );
    }

    /*
      Small pause between requests.
    */
    await wait(
      250
    );
  }

  saveResults(
    results
  );

  console.log("");
  console.log(
    "-----------------------------"
  );

  console.log(
    "Scoring complete!"
  );

  console.log(
    `Scored: ${scored}`
  );

  console.log(
    `No review evidence: ${noEvidence}`
  );

  console.log(
    `Skipped: ${skipped}`
  );

  console.log(
    `Errors: ${errors}`
  );

  console.log(
    `Saved to: ${outputPath}`
  );

  console.log(
    "-----------------------------"
  );
}


main();