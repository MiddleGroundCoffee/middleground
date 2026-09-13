import type { Metadata } from "next";
import {
  Instrument_Serif,
  Hanken_Grotesk,
  IBM_Plex_Mono,
} from "next/font/google";

import "./globals.css";

const instrumentSerif =
  Instrument_Serif({
    variable:
      "--font-instrument-serif",
    subsets: ["latin"],
    weight: ["400"],
  });

const hankenGrotesk =
  Hanken_Grotesk({
    variable:
      "--font-hanken-grotesk",
    subsets: ["latin"],
    weight: [
      "400",
      "500",
      "600",
    ],
  });

const ibmPlexMono =
  IBM_Plex_Mono({
    variable:
      "--font-ibm-plex-mono",
    subsets: ["latin"],
    weight: [
      "400",
      "500",
      "600",
    ],
  });

export const metadata: Metadata = {
  title: "Middle Ground",
  description:
    "Find the fairest coffee shop between you two.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children:
    React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`
          ${instrumentSerif.variable}
          ${hankenGrotesk.variable}
          ${ibmPlexMono.variable}
        `}
      >
        {children}
      </body>
    </html>
  );
}