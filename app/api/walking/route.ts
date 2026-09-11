import { NextResponse } from "next/server";

type Point = {
  lat: number;
  lng: number;
};

type Cafe = {
  id: string;
  location?: {
    latitude: number;
    longitude: number;
  };
};

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      personA,
      personB,
      cafes,
    }: {
      personA: Point;
      personB: Point;
      cafes: Cafe[];
    } = body;

    if (!personA || !personB || !cafes?.length) {
      return NextResponse.json(
        { error: "Missing walking route information." },
        { status: 400 }
      );
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "GOOGLE_MAPS_API_KEY is missing." },
        { status: 500 }
      );
    }

    const origins = [
      {
        waypoint: {
          location: {
            latLng: {
              latitude: personA.lat,
              longitude: personA.lng,
            },
          },
        },
      },
      {
        waypoint: {
          location: {
            latLng: {
              latitude: personB.lat,
              longitude: personB.lng,
            },
          },
        },
      },
    ];

    const destinations = cafes
      .filter((cafe) => cafe.location)
      .map((cafe) => ({
        waypoint: {
          location: {
            latLng: {
              latitude: cafe.location!.latitude,
              longitude: cafe.location!.longitude,
            },
          },
        },
      }));

    const response = await fetch(
      "https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask":
            "originIndex,destinationIndex,status,condition,distanceMeters,duration",
        },
        body: JSON.stringify({
          origins,
          destinations,
          travelMode: "WALK",
        }),
      }
    );

    const text = await response.text();

    if (!response.ok) {
      return NextResponse.json(
        {
          error: "Walking route request failed.",
          details: text,
        },
        { status: response.status }
      );
    }

    const data = JSON.parse(text);

    return NextResponse.json({
      routes: data,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Something went wrong calculating walking routes.",
        details:
          error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}