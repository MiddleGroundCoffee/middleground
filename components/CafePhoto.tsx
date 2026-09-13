"use client";

import {
  useEffect,
  useState,
} from "react";

type CafePhotoProps = {
  placeId?: string;
  name: string;
  className?: string;
};

export default function CafePhoto({
  placeId,
  name,
  className = "",
}: CafePhotoProps) {
  const [
    photoUrl,
    setPhotoUrl,
  ] =
    useState<string | null>(
      null
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadPhoto() {
      if (!placeId) {
        setLoading(false);
        return;
      }

      try {
        const response =
          await fetch(
            "/api/cafe-photo",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({
                placeId,
              }),
            }
          );

        const data =
          await response.json();

        if (
          !cancelled &&
          data.photoUrl
        ) {
          setPhotoUrl(
            data.photoUrl
          );
        }
      } catch (error) {
        console.error(
          "Cafe photo load error:",
          error
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadPhoto();

    return () => {
      cancelled = true;
    };
  }, [placeId]);

  if (
    loading ||
    !photoUrl
  ) {
    return (
      <div
        className={`bg-[#e8e4da] flex items-end p-2 ${className}`}
      >
        <span className="text-[8px] text-black/25">
          {loading
            ? "loading photo..."
            : "cafe photo"}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`overflow-hidden bg-[#e8e4da] ${className}`}
    >
      <img
        src={photoUrl}
        alt={name}
        className="w-full h-full object-cover"
      />
    </div>
  );
}