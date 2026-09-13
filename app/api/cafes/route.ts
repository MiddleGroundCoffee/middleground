import { NextResponse } from "next/server";
import { getCafes } from "@/lib/cafes";
import { calculateDistanceKm } from "@/lib/distance";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { lat, lng } = body;

    if (
      lat === undefined ||
      lng === undefined
    ) {
      return NextResponse.json(
        {
          error:
            "Latitude and longitude are required.",
        },
        {
          status: 400,
        }
      );
    }

    const cafes = getCafes();

    const midpoint = {
      latitude: Number(lat),
      longitude: Number(lng),
    };

    const cafesWithDistance =
      cafes.map((cafe) => {
        const distanceKm =
          calculateDistanceKm(
            midpoint,
            {
              latitude:
                cafe.latitude,

              longitude:
                cafe.longitude,
            }
          );

        return {
          ...cafe,
          distanceKm,
        };
      });

    const nearestCafes =
      cafesWithDistance
        .sort(
          (a, b) =>
            a.distanceKm -
            b.distanceKm
        )
        .slice(0, 25);

    return NextResponse.json({
      totalCuratedCafes:
        cafes.length,

      candidateCount:
        nearestCafes.length,

      places:
        nearestCafes,
    });

  } catch (error) {
    console.error(
      "Curated cafe search error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Could not search curated cafes.",

        details:
          error instanceof Error
            ? error.message
            : String(error),
      },
      {
        status: 500,
      }
    );
  }
}