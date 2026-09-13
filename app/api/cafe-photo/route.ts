import { NextResponse } from "next/server";

export async function POST(
  request: Request
) {
  try {
    const body =
      await request.json();

    const placeId =
      body.placeId;

    if (!placeId) {
      return NextResponse.json(
        {
          error:
            "placeId is required.",
        },
        {
          status: 400,
        }
      );
    }

    const apiKey =
      process.env
        .GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "GOOGLE_MAPS_API_KEY is missing.",
        },
        {
          status: 500,
        }
      );
    }

    /*
      First get the current photo
      resource name from Place Details.
    */

    const detailsResponse =
      await fetch(
        `https://places.googleapis.com/v1/places/${placeId}`,
        {
          headers: {
            "X-Goog-Api-Key":
              apiKey,

            "X-Goog-FieldMask":
              "photos",
          },
        }
      );

    const detailsText =
      await detailsResponse.text();

    if (
      !detailsResponse.ok
    ) {
      console.error(
        "Google Place Details photo error:",
        detailsText
      );

      return NextResponse.json(
        {
          error:
            "Could not retrieve cafe photo information.",
        },
        {
          status:
            detailsResponse.status,
        }
      );
    }

    const details =
      JSON.parse(
        detailsText
      );

    const photo =
      details.photos?.[0];

    if (!photo?.name) {
      return NextResponse.json({
        photoUrl: null,
      });
    }

    /*
      Ask Google for the actual
      image URL.

      skipHttpRedirect=true means
      Google returns JSON containing
      photoUri.
    */

    const photoResponse =
      await fetch(
        `https://places.googleapis.com/v1/${photo.name}/media?maxWidthPx=800&maxHeightPx=600&skipHttpRedirect=true&key=${apiKey}`
      );

    const photoText =
      await photoResponse.text();

    if (
      !photoResponse.ok
    ) {
      console.error(
        "Google Place Photo error:",
        photoText
      );

      return NextResponse.json(
        {
          error:
            "Could not retrieve cafe photo.",
        },
        {
          status:
            photoResponse.status,
        }
      );
    }

    const photoData =
      JSON.parse(
        photoText
      );

    return NextResponse.json({
      photoUrl:
        photoData.photoUri ||
        null,

      attribution:
        photo.authorAttributions ||
        [],
    });
  } catch (error) {
    console.error(
      "Cafe photo API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Something went wrong retrieving the cafe photo.",
      },
      {
        status: 500,
      }
    );
  }
}