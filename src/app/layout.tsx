import type { Metadata } from "next";
import { Unbounded, Outfit } from "next/font/google";
import "./globals.css";
import Header from "@/widgets/common/Header";
import Footer from "@/widgets/common/Footer";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "@/context/AuthContext";
import { Analytics } from "@vercel/analytics/next";

const unBounded = Unbounded({
  variable: "--font-unbounded",
  subsets: ["latin"],
  display: "swap",
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  display: "swap",
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://sparkz.carmelcet.in/"),

  title: {
    default: "Sparkz 2K26 - Carmel Engineering College Techfest",
    template: "%s | Sparkz 2K26",
  },

  description:
    "Sparkz 2K26 is the premier technical and cultural festival of Carmel College of Engineering and Technology, Alappuzha, Kerala. Join us for hackathons, coding competitions, workshops, cultural events, and more at Punnapra's biggest techfest.",

  keywords: [
    // Event name variations
    "Sparkz",
    "Sparkz 2K26",
    "Sparkz Fest",
    "Sparkz Festival",
    "Sparkz Techfest",

    // College name variations
    "Carmel College of Engineering and Technology",
    "Carmel Engineering College",
    "CCET",
    "Carmel College",
    "Carmel Engineering",
    "Carmel College Alappuzha",
    "Carmel College Punnapra",

    // Location variations
    "Alappuzha",
    "Alappuzha techfest",
    "Alappuzha college fest",
    "Punnapra",
    "Punnapra techfest",
    "Punnapra college fest",
    "Kerala techfest",
    "Kerala college fest",
    "Alappuzha engineering college",
    "Punnapra engineering college",

    // Event type variations
    "technical fest",
    "tech fest",
    "techfest",
    "college fest",
    "college festival",
    "engineering fest",
    "engineering festival",
    "cultural fest",
    "cultural festival",
    "technical and cultural fest",

    // Department variations
    "computer science",
    "computer science fest",
    "CS fest",
    "CSE fest",
    "computer science engineering",
    "IT fest",
    "information technology",
    "ECE fest",
    "electronics fest",
    "mechanical engineering fest",
    "civil engineering fest",

    // Event activities
    "hackathon",
    "coding competition",
    "programming contest",
    "workshop",
    "technical workshop",
    "coding workshop",
    "robotics",
    "robotics competition",
    "project expo",
    "paper presentation",
    "technical quiz",
    "gaming competition",
    "esports",

    // General tech keywords
    "tech events India",
    "engineering events",
    "student fest",
    "college events",
    "technical events",
    "innovation fest",
    "technology festival",
    "coding events",
    "developer events",

    // Location-specific
    "Kerala engineering college events",
    "South India techfest",
    "Alappuzha events",
    "college events Kerala",

    // Year-specific
    "2026 techfest",
    "2026 college fest",
    "techfest 2026",
  ],

  authors: [
    { name: "Sparkz Tech Team - Carmel College of Engineering and Technology" },
  ],
  creator: "Carmel College of Engineering and Technology",
  publisher: "Sparkz - CCET Alappuzha",

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },

  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "https://sparkz.carmelcet.in/",
    siteName: "Sparkz 2K26 - Carmel Engineering College Techfest",
    title: "Sparkz 2K26 | Carmel College of Engineering Alappuzha Techfest",
    description:
      "Join Sparkz 2K26 at Carmel College of Engineering and Technology, Alappuzha (Punnapra) — Kerala's premier technical and cultural festival featuring hackathons, coding competitions, workshops, robotics, and cultural events.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Sparkz 2K26 - Carmel Engineering College Techfest Poster",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "Sparkz 2K26 | Carmel Engineering College Alappuzha Techfest",
    description:
      "Join Sparkz 2K26 at Carmel College of Engineering, Alappuzha — hackathons, coding competitions, workshops, and cultural events.",
    images: ["/og-image.png"],
    creator: "@sparkzfest",
  },

  icons: {
    icon: [
      { url: "/sparkz.svg", type: "image/svg+xml" },
      { url: "/favicon.ico" },
      { url: "/icon.png", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png" }],
    shortcut: [{ url: "/sparkz.svg" }],
  },

  category: "technology",

  alternates: {
    canonical: "https://sparkz.carmelcet.in/",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${unBounded.variable} ${outfit.variable} antialiased font-light bg-[#0B0B0E] text-white`}
      >
        <AuthProvider>
          {children}
          <Toaster position="bottom-center" />
          <Analytics />
        </AuthProvider>
      </body>
    </html>
  );
}
