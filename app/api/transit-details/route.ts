import { NextResponse } from "next/server";

type Point = {
  lat: number;
  lng: number;
};

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      origin,
      destination,
    }: {
      origin: Point;
      destination: Point;
    } = body;

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "GOOGLE_MAPS_API_KEY is missing." },
        { status: 500 }
      );
    }

    const response = await fetch(
      "https://routes.googleapis.com/directions/v2:computeRoutes",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask":
            "routes.duration,routes.legs.steps.duration,routes.legs.steps.travelMode",
        },
        body: JSON.stringify({
          origin: {
            location: {
              latLng: {
                latitude: origin.lat,
                longitude: origin.lng,
              },
            },
          },

          destination: {
            location: {
              latLng: {
                latitude: destination.lat,
                longitude: destination.lng,
              },
            },
          },

          travelMode: "TRANSIT",
        }),
      }
    );

    const text = await response.text();

    if (!response.ok) {
      return NextResponse.json(
        {
          error: "Transit detail request failed.",
          details: text,
        },
        { status: response.status }
      );
    }

    const data = JSON.parse(text);

    const route = data.routes?.[0];

    if (!route) {
      return NextResponse.json(
        { error: "No transit route found." },
        { status: 404 }
      );
    }

    let walkingSeconds = 0;

    for (const leg of route.legs || []) {
      for (const step of leg.steps || []) {
        if (
          step.travelMode === "WALK" &&
          step.duration
        ) {
          walkingSeconds += parseFloat(
            step.duration.replace("s", "")
          );
        }
      }
    }

    return NextResponse.json({
      walkingMinutes: Math.round(
        walkingSeconds / 60
      ),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          "Something went wrong calculating transit details.",
        details:
          error instanceof Error
            ? error.message
            : String(error),
      },
      { status: 500 }
    );
  }
}