import AbheriPage from "@/widgets/Abheri/Landing";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Abheri 2K26 - Inter-Collegiate Band Competition | Sparkz",
  description:
    "Join Abheri 2K26, the premier inter-collegiate band competition at Carmel Engineering College, Alappuzha on 8 Oct 2026. Chief Guest: Ouseppachan (Film Composer & Violinist), Judge: Roshan NC (Musician & Guitarist). Prize pool ₹60,000. Register your band now!",

  keywords: [
    // Event name
    "Abheri",
    "Abheri 2K26",
    "Abheri band competition",
    "Abheri Sparkz",

    // Event type
    "band competition",
    "inter-collegiate band competition",
    "college band competition",
    "music competition",
    "rock band competition",
    "live band competition",
    "band fest",
    "music fest",
    "battle of bands",

    // Chief Guest - Ouseppachan
    "Ouseppachan",
    "Ouseppachan Film Composer",
    "Ouseppachan Music Director",
    "Ouseppachan Producer",
    "Ouseppachan live performance",
    "Ouseppachan Violinist",
    "Ouseppachan Singer",

    // Judge - Roshan NC
    "Roshan NC",
    "Roshan NC singer",
    "Roshan NC playback singer",
    "Roshan NC judge",
    "Roshan NC Guitarist",
    "Roshan NC Musician",

    // Location
    "Carmel College band competition",
    "Alappuzha band competition",
    "Punnapra band competition",
    "Kerala band competition",
    "band competition Alappuzha",
    "band competition Kerala",

    // Event details
    "October 2026 band competition",
    "8 Oct 2026",
    "band competition 2026",
    "college fest band competition",
    "techfest band competition",

    // Prize and registration
    "60000 prize band competition",
    "band competition prize money",
    "1000 registration fee",
    "band competition registration",

    // Music genres and instruments
    "rock music competition",
    "live music competition",
    "band performance",
    "music performance",
    "college music event",

    // General
    "Sparkz band competition",
    "CCET band competition",
    "engineering college band competition",
    "student band competition",
    "youth band competition",
  ],

  openGraph: {
    title:
      "Abheri 2K26 - Inter-Collegiate Band Competition ft. Ouseppachan | Sparkz",
    description:
      "Join Abheri 2K26 at Carmel Engineering College, Alappuzha on 8 Oct 2026. Chief Guest: Ouseppachan (Film Composer & Violinist), Judge: Roshan NC (Musician & Guitarist). Prize pool ₹60,000. Teams of 5-10 members. Register now!",
    type: "website",
    locale: "en_IN",
    url: "https://sparkz2k26.carmelcet.in/abheri",
    siteName: "Sparkz 2K26",
    images: [
      {
        url: "/ouseppachan.png",
        width: 1200,
        height: 630,
        alt: "Abheri 2K26 - Chief Guest Ouseppachan (Film Composer & Violinist)",
      },
      {
        url: "/roshan_nc.png",
        width: 1200,
        height: 630,
        alt: "Abheri 2K26 - Judge Roshan NC (Musician & Guitarist)",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "Abheri 2K26 - Band Competition ft. Ouseppachan & Roshan NC",
    description:
      "Inter-collegiate band competition at Carmel College, Alappuzha. 8 Oct 2026. Prize pool ₹60,000. Register your band now!",
    images: ["/ouseppachan.png", "/roshan_nc.png"],
  },

  alternates: {
    canonical: "https://sparkz2k26.carmelcet.in/abheri",
  },
};

export default function page() {
  return <AbheriPage />;
}
