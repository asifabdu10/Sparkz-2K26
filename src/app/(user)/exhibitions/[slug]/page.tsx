import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, Sparkles, MapPin, Ticket } from "lucide-react";
import {
  exhibitionsList,
  getExhibitionBySlug,
} from "@/utils/constants/exhibitionsData";

// Existing full exhibition components
import KSEBExhibition from "@/widgets/home/KSEBExhibition";
import DroneExhibition from "@/widgets/home/DroneExhibition";
import FireSafetyExhibition from "@/widgets/home/FireSafetyExhibition";
import KalliyathTMTExhibition from "@/widgets/home/KalliyathTMTExhibition";
import PoliceForceSecurityExhibition from "@/widgets/home/PoliceForceSecurityExhibition";

export const revalidate = 0;
export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const expo = getExhibitionBySlug(slug);

  if (!expo) {
    return {
      title: "Exhibition Not Found | Sparkz 2K26",
    };
  }

  return {
    title: `${expo.title} | Sparkz 2K26`,
    description: expo.summary,
    openGraph: {
      title: `${expo.title} | Sparkz 2K26 Carmel Tech Fest`,
      description: expo.summary,
      images: [
        {
          url: expo.image,
          width: 1200,
          height: 630,
          alt: expo.title,
        },
      ],
    },
  };
}

export default async function ExhibitionDetailPage({ params }: Props) {
  const { slug } = await params;
  const expo = getExhibitionBySlug(slug);

  if (!expo) {
    notFound();
  }

  const otherExhibitions = exhibitionsList.filter((item) => item.id !== expo.id);

  // Render the matching detailed expo widget
  const renderExpoContent = () => {
    switch (expo.id) {
      case "kseb":
        return <KSEBExhibition />;
      case "drone":
        return <DroneExhibition />;
      case "fire-safety":
        return <FireSafetyExhibition />;
      case "kalliyath-tmt":
        return <KalliyathTMTExhibition />;
      case "police-force":
        return <PoliceForceSecurityExhibition />;
      default:
        return null;
    }
  };

  return (
    <main className="min-h-screen bg-[#04050b] text-white">
      {/* Top Navigation & Breadcrumbs Bar */}
      <div className="sticky top-16 z-20 border-b border-[rgba(212,163,89,0.15)] bg-[#0B0B0E]/90 backdrop-blur-lg">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <Link
            href="/#exhibitions"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs font-semibold text-slate-300 transition-all hover:border-[#F3C87A] hover:bg-[#1b1b22] hover:text-[#F3C87A]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Exhibitions</span>
          </Link>

          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
            <Link href="/" className="hover:text-white transition-colors">
              Home
            </Link>
            <span>/</span>
            <Link href="/#exhibitions" className="hover:text-white transition-colors">
              Exhibitions
            </Link>
            <span>/</span>
            <span className="text-[#F3C87A] font-medium">{expo.shortTitle}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-500/20 px-2.5 py-1 rounded-full">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live Demonstration
            </span>
          </div>
        </div>
      </div>

      {/* Main Exhibition Detailed Content */}
      <div className="relative">{renderExpoContent()}</div>

      {/* Explore Other Exhibitions Bottom Row */}
      <section className="relative border-t border-white/10 bg-[#07080D] py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(212,163,89,0.3)] bg-[rgba(212,163,89,0.08)] px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-[#F3C87A] mb-2">
                <Sparkles className="h-3 w-3" />
                <span>Explore More</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold text-white">
                Other Exhibitions at Sparkz 2K26
              </h3>
            </div>
            <Link
              href="/#exhibitions"
              className="text-xs font-semibold text-[#F3C87A] hover:underline inline-flex items-center gap-1"
            >
              <span>View All Exhibitions</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {otherExhibitions.map((item) => (
              <Link
                key={item.id}
                href={`/exhibitions/${item.slug}`}
                className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-[#0E101A] p-5 transition-all duration-300 hover:border-[#F3C87A]/40 hover:-translate-y-1 hover:shadow-[0_0_20px_rgba(212,163,89,0.15)]"
              >
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/5 p-1.5 ring-1 ring-white/10 group-hover:ring-[#F3C87A]/50 transition-all">
                      <Image
                        src={item.logo}
                        alt={item.title}
                        width={48}
                        height={48}
                        className="object-contain h-full w-full"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#F3C87A] block">
                        {item.organizerTag}
                      </span>
                      <span className="text-xs text-slate-300 font-medium line-clamp-1">
                        {item.category}
                      </span>
                    </div>
                  </div>

                  <h4 className="text-base font-bold text-white group-hover:text-[#F3C87A] transition-colors line-clamp-1 mb-1.5">
                    {item.title}
                  </h4>
                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-4">
                    {item.summary}
                  </p>
                </div>

                <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-[#F3C87A] font-semibold">
                  <span>Explore Expo</span>
                  <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
