import { NextResponse } from "next/server";
import { getCafes } from "@/lib/cafes";

export async function GET() {
  try {
    const cafes = getCafes();

    return NextResponse.json({
      count: cafes.length,
      cafes: cafes.slice(0, 5),
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error:
          "Could not read curated cafe data.",
      },
      {
        status: 500,
      }
    );
  }
}