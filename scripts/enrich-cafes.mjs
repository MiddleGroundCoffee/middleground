import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";

dotenv.config({
  path: ".env.local",
});

const API_KEY =
  process.env.GOOGLE_MAPS_API_KEY;

if (!API_KEY) {
  console.error(
    "GOOGLE_MAPS_API_KEY is missing from .env.local"
  );

  process.exit(1);
}

const inputPath =
  path.join(
    process.cwd(),
    "data",
    "cafes.csv"
  );

const outputPath =
  path.join(
    process.cwd(),
    "data",
    "cafes_attributes.csv"
  );

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


async function getPlaceDetails(
  placeId
) {
  const response =
    await fetch(
      `https://places.googleapis.com/v1/places/${placeId}`,
      {
        headers: {
          "X-Goog-Api-Key":
            API_KEY,

          "X-Goog-FieldMask": [
            "id",
            "rating",
            "userRatingCount",
            "outdoorSeating",
          ].join(","),
        },
      }
    );

  const text =
    await response.text();

  if (!response.ok) {
    console.error(
      "Google Place Details error:",
      text
    );

    return null;
  }

  return JSON.parse(text);
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
        ],
      }
    );

  fs.writeFileSync(
    outputPath,
    output
  );
}


function wait(
  milliseconds
) {
  return new Promise(
    (resolve) =>
      setTimeout(
        resolve,
        milliseconds
      )
  );
}


async function main() {
  console.log(
    `Found ${cafes.length} cafes.`
  );

  console.log(
    "Starting attribute enrichment..."
  );

  const results = [];

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (
    let i = 0;
    i < cafes.length;
    i++
  ) {
    const cafe =
      cafes[i];

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
      const place =
        await getPlaceDetails(
          cafe.google_place_id
        );

      if (!place) {
        console.log(
          "  Could not retrieve details."
        );

        results.push(
          cafe
        );

        errors++;

        continue;
      }

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

        outdoor_seating:
          place.outdoorSeating === true
            ? "TRUE"
            : place.outdoorSeating === false
            ? "FALSE"
            : cafe.outdoor_seating || "",
      };

      console.log(
        `  Outdoor seating: ${
          updatedCafe.outdoor_seating ||
          "unknown"
        }`
      );

      results.push(
        updatedCafe
      );

      updated++;
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

    await wait(
      150
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
    "Attribute enrichment complete!"
  );

  console.log(
    `Updated: ${updated}`
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