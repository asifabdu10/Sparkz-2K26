export interface ExhibitionItem {
  id: string;
  slug: string;
  title: string;
  shortTitle: string;
  category: string;
  organizer: string;
  organizerTag: string;
  logo: string;
  image: string;
  summary: string;
  location: string;
  entry: string;
  accentColor: string;
  borderGlow: string;
  tags: string[];
}

export const exhibitionsList: ExhibitionItem[] = [
  {
    id: "kseb",
    slug: "kseb",
    title: "KSEB Power & Energy Expo",
    shortTitle: "KSEB Expo",
    category: "Power & Renewable Energy",
    organizer: "Kerala State Electricity Board (KSEB)",
    organizerTag: "Organised By KSEB",
    logo: "/Kseb_logo.png",
    image: "/Kseb_expo.jpeg",
    summary:
      "An interactive showcase highlighting modern power distribution, renewable energy solutions, smart grid automation, and electrical safety through live demonstrations.",
    location: "Main Exhibition Ground",
    entry: "Free & Open to All",
    accentColor: "from-amber-500/20 via-yellow-500/10 to-transparent",
    borderGlow: "group-hover:border-yellow-500/50 hover:shadow-[0_0_25px_rgba(234,179,8,0.25)]",
    tags: ["Modern Grid", "Renewable Energy", "Safety Systems"],
  },
  {
    id: "drone",
    slug: "drone",
    title: "Drone Arena",
    shortTitle: "Drone Tech Expo",
    category: "Robotics & Aerial Tech",
    organizer: "Drone Technology & Aerial Systems",
    organizerTag: "Technology Expo",
    logo: "/drone_logo.png",
    image: "/drone_expo.jpeg",
    summary:
      "A high-tech exhibition featuring cutting-edge unmanned aerial vehicles, flight automation, realistic flight simulations, and hands-on exposure to drone operations.",
    location: "Main Exhibition Ground",
    entry: "Free & Open to All",
    accentColor: "from-orange-500/20 via-cyan-500/10 to-transparent",
    borderGlow: "group-hover:border-orange-500/50 hover:shadow-[0_0_25px_rgba(249,115,22,0.25)]",
    tags: ["UAV Technology", "Flight Systems", "Autonomous Flight"],
  },
  {
    id: "fire-safety",
    slug: "fire-safety",
    title: "Fire & Safety Expo",
    shortTitle: "Fire & Safety Expo",
    category: "Emergency & Disaster Response",
    organizer: "Kerala Fire & Rescue Services",
    organizerTag: "Safety Exhibition",
    logo: "/fire_safety_logo.png",
    image: "/fire_safety_expo.jpeg",
    summary:
      "Live rescue demonstrations, modern firefighting apparatus, emergency preparedness drills, and disaster management systems presented by fire personnel.",
    location: "Main Exhibition Ground",
    entry: "Free & Open to All",
    accentColor: "from-red-500/20 via-orange-500/10 to-transparent",
    borderGlow: "group-hover:border-red-500/50 hover:shadow-[0_0_25px_rgba(239,68,68,0.25)]",
    tags: ["Live Rescue Drills", "Firefighting Tech", "Disaster Mgmt"],
  },
  {
    id: "kalliyath-tmt",
    slug: "kalliyath-tmt",
    title: "Kalliyath TMT Expo",
    shortTitle: "Kalliyath TMT Expo",
    category: "Structural & Civil Engineering",
    organizer: "Kalliyath TMT Steel & Structures",
    organizerTag: "Industry Partner",
    logo: "/kalliyath_logo.png",
    image: "/kalliyath_tmt.jpeg",
    summary:
      "An engaging industry showcase focusing on modern structural engineering, high-strength steel manufacturing techniques, and resilient construction practices.",
    location: "Main Exhibition Ground",
    entry: "Free & Open to All",
    accentColor: "from-amber-600/20 via-yellow-600/10 to-transparent",
    borderGlow: "group-hover:border-amber-500/50 hover:shadow-[0_0_25px_rgba(217,119,6,0.25)]",
    tags: ["Structural Steel", "Engineering Durability", "Modern Testing"],
  },
  {
    id: "police-force",
    slug: "police-force",
    title: "Police Force & Security Expo",
    shortTitle: "Police & Security Expo",
    category: "Law Enforcement & Security",
    organizer: "Kerala Police Force & Security Tech",
    organizerTag: "Security Exhibition",
    logo: "/police_logo.png",
    image: "/policeexpo.jpeg",
    summary:
      "An exclusive law-enforcement exhibition showcasing police equipment, tactical gear, modern surveillance technologies, and public safety operations.",
    location: "Main Exhibition Ground",
    entry: "Free & Open to All",
    accentColor: "from-blue-600/20 via-cyan-500/10 to-transparent",
    borderGlow: "group-hover:border-blue-500/50 hover:shadow-[0_0_25px_rgba(37,99,235,0.25)]",
    tags: ["Tactical Equipment", "Security Systems", "Public Safety"],
  },
];

export function getExhibitionBySlug(slug: string): ExhibitionItem | undefined {
  const normalized = slug?.toLowerCase().trim();
  return exhibitionsList.find(
    (item) =>
      item.slug === normalized ||
      item.id === normalized ||
      `${item.slug}-expo` === normalized ||
      (normalized === "police" && item.slug === "police-force") ||
      (normalized === "kalliyath" && item.slug === "kalliyath-tmt")
  );
}
