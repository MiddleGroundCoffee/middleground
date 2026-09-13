import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";

export type CafeRow = {
  id: string;
  name: string;
  google_place_id: string;
  address: string;
  latitude: string;
  longitude: string;
  independent: string;
  coffee_quality: string;
  seating: string;
  quiet: string;
  outdoor_seating: string;
  laptop_friendly: string;
  meeting_suitability: string;
  google_rating: string;
  google_review_count: string;
};

export type Cafe = {
  id: string;
  name: string;
  googlePlaceId: string;
  address: string;
  latitude: number;
  longitude: number;
  independent: boolean;
  coffeeQuality?: number;
  seating?: number;
  quiet?: number;
  outdoorSeating?: boolean;
  laptopFriendly?: boolean;
  meetingSuitability?: number;
  googleRating?: number;
  googleReviewCount?: number;
};

function optionalNumber(
  value: string
): number | undefined {
  if (
    value === undefined ||
    value === null ||
    value.trim() === ""
  ) {
    return undefined;
  }

  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : undefined;
}

function optionalBoolean(
  value: string
): boolean | undefined {
  if (!value) {
    return undefined;
  }

  const normalised =
    value.trim().toLowerCase();

  if (normalised === "true") {
    return true;
  }

  if (normalised === "false") {
    return false;
  }

  return undefined;
}

export function getCafes(): Cafe[] {
  const filePath = path.join(
    process.cwd(),
    "data",
    "cafes.csv"
  );

  const fileContents =
    fs.readFileSync(
      filePath,
      "utf8"
    );

  const rows: CafeRow[] =
    parse(fileContents, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

  return rows
    .filter((row) => {
      return (
        row.latitude &&
        row.longitude
      );
    })
    .map((row) => ({
      id: row.id,

      name: row.name,

      googlePlaceId:
        row.google_place_id,

      address:
        row.address,

      latitude:
        Number(row.latitude),

      longitude:
        Number(row.longitude),

      independent:
        row.independent
          ?.toLowerCase() ===
        "true",

      coffeeQuality:
        optionalNumber(
          row.coffee_quality
        ),

      seating:
        optionalNumber(
          row.seating
        ),

      quiet:
        optionalNumber(
          row.quiet
        ),

      outdoorSeating:
        optionalBoolean(
          row.outdoor_seating
        ),

      laptopFriendly:
        optionalBoolean(
          row.laptop_friendly
        ),

      meetingSuitability:
        optionalNumber(
          row.meeting_suitability
        ),

      googleRating:
        optionalNumber(
          row.google_rating
        ),

      googleReviewCount:
        optionalNumber(
          row.google_review_count
        ),
    }));
}