"use client";
import { notFound } from "next/navigation";
import React, { Suspense, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  LuMapPin,
  LuUsers,
  LuIndianRupee,
  LuTrophy,
  LuAward,
  LuBookOpen,
} from "react-icons/lu";
import RegisterButtonSection from "@/widgets/event/RegisterButtonSection";
import {
  FaWhatsapp,
  FaCalendarDay,
} from "react-icons/fa";
import { motion } from "framer-motion";
import { shimmer, toBase64 } from "@/utils/imageUtils";
import GradientBackground from "@/components/ui/GradientBackground";
import { db } from "@/utils/firebase";
import { doc, getDoc } from "firebase/firestore";
import { Event } from "@/utils/types/event";

// Loading component for suspense
function EventDetailsSkeleton() {
  return (
    <div className="relative min-h-screen bg-[#0B0B0E] text-white overflow-hidden">
      <div className="flex flex-col lg:flex-row max-w-7xl mx-auto">
        <div className="w-full lg:w-5/12 p-6 lg:h-screen lg:sticky lg:top-0">
          <div className="h-full w-full bg-[#131318] border border-[rgba(212,163,89,0.2)] rounded-3xl animate-pulse" />
        </div>
        <div className="w-full lg:w-7/12 p-6 space-y-8">
           <div className="h-20 w-3/4 bg-[#131318] border border-[rgba(212,163,89,0.2)] rounded-2xl animate-pulse" />
           <div className="h-40 w-full bg-[#131318] border border-[rgba(212,163,89,0.2)] rounded-2xl animate-pulse" />
           <div className="grid grid-cols-2 gap-4">
             <div className="h-32 bg-[#131318] border border-[rgba(212,163,89,0.2)] rounded-2xl animate-pulse" />
             <div className="h-32 bg-[#131318] border border-[rgba(212,163,89,0.2)] rounded-2xl animate-pulse" />
           </div>
        </div>
      </div>
    </div>
  );
}

// InfoCard component (Bento Style)
interface InfoCardProps {
  icon: React.ReactNode;
  title: string;
  value: string | React.ReactNode;
  variant?: "default" | "highlight";
  delay?: number;
}

function InfoCard({
  icon,
  title,
  value,
  variant = "default",
  delay = 0,
}: InfoCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className={`relative overflow-hidden rounded-2xl p-5 border transition-all duration-300 group
        ${
          variant === "highlight"
            ? "bg-[#131318] border-[rgba(212,163,89,0.4)] shadow-[0_0_20px_rgba(212,163,89,0.12)] hover:border-[#F3C87A]"
            : "bg-[#131318] border-[rgba(212,163,89,0.25)] hover:border-[rgba(212,163,89,0.45)] hover:shadow-[0_4px_20px_rgba(212,163,89,0.08)]"
        }
      `}
    >
      <div className="flex items-start gap-4">
        <div
          className={`p-3 rounded-xl shrink-0 ${
            variant === "highlight"
              ? "bg-[#3A270D] text-[#F3C87A] border border-[rgba(212,163,89,0.35)]"
              : "bg-[#3A270D]/60 text-[#D4A359] border border-[rgba(212,163,89,0.2)]"
          }`}
        >
          {icon}
        </div>
        <div>
          <p className="text-sm font-medium text-[#A1A1AA] mb-1">{title}</p>
          <div className="text-lg font-semibold text-white tracking-wide">{value}</div>
        </div>
      </div>
    </motion.div>
  );
}

// Coordinator Card (Compact)
function CoordinatorCard({
  coordinator,
  eventTitle,
}: {
  coordinator: { name: string; phone: string };
  eventTitle: string;
}) {
  const whatsappMessage = encodeURIComponent(
    `Hello ${coordinator.name}, I have a question regarding "${eventTitle}" on Sparkz 2K26. Could you please help me with more details?`
  );

  return (
    <Link
      href={`https://wa.me/${coordinator.phone}?text=${whatsappMessage}`}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="flex items-center gap-3 p-3 rounded-xl border border-[rgba(212,163,89,0.25)] bg-[#131318] hover:border-[#F3C87A] hover:bg-[#1a1a22] transition-colors group"
    >
      <div className="h-10 w-10 rounded-full bg-[#3A270D] flex items-center justify-center text-[#F3C87A] border border-[rgba(212,163,89,0.35)] text-sm font-bold">
        {coordinator.name.charAt(0)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate group-hover:text-[#F3C87A] transition-colors">
          {coordinator.name}
        </p>
        <p className="text-xs text-[#A1A1AA]">Coordinator</p>
      </div>
      <FaWhatsapp className="text-[#A1A1AA] group-hover:text-[#25D366] transition-colors" />
    </Link>
  );
}

// Prize Card Component
function PrizeCard({
  prize,
  title,
  color,
  icon,
}: {
  prize: string;
  title: string;
  color: "gold" | "silver" | "bronze";
  icon: React.ReactNode;
}) {
  const styles = {
    gold: "from-[#3A270D]/80 to-[#131318] border-[rgba(212,163,89,0.45)] text-[#F3C87A] shadow-[0_0_15px_rgba(212,163,89,0.1)]",
    silver: "from-white/10 to-[#131318] border-white/20 text-[#A1A1AA]",
    bronze:
      "from-[#3A270D]/40 to-[#131318] border-[rgba(212,163,89,0.25)] text-[#D4A359]",
  };

  return (
    <div
      className={`relative rounded-xl border bg-gradient-to-b p-4 ${styles[color]}`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`p-2 rounded-lg bg-[#0B0B0E]/60 border border-[rgba(212,163,89,0.2)] ${styles[color]
            .split(" ")
            .filter((c) => c.startsWith("text-"))
            .pop()}`}
        >
          {icon}
        </div>
        <div>
          <p className="text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider">
            {title}
          </p>
          <p className="text-lg font-bold text-white">{prize}</p>
        </div>
      </div>
    </div>
  );
}

export default function EventPage({ eventId }: { eventId: string }) {
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const docRef = doc(db, "events", eventId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setEvent({ id: docSnap.id, ...docSnap.data() } as Event);
        } else {
          setEvent(null);
        }
      } catch (error) {
        console.error("Error fetching event:", error);
        setEvent(null);
      } finally {
        setLoading(false);
      }
    };
    fetchEvent();
  }, [eventId]);

  if (loading) return <EventDetailsSkeleton />;

  if (!event) {
    notFound();
  }

  return (
    <Suspense fallback={<EventDetailsSkeleton />}>
      <div className="min-h-screen bg-[#0B0B0E] text-white selection:bg-[#3A270D] selection:text-[#F3C87A]">
        <GradientBackground />

        {/* 
            Desktop Layout: Split Screen 
            Mobile Layout: Stacked
        */}
        <main className="relative z-10 lg:flex max-w-7xl mx-auto">
          {/* LEFT PANEL - Sticky on Desktop */}
          <section className="w-full lg:w-[45%] xl:w-[45%] lg:h-screen lg:sticky mb-7.5 lg:top-0 pt-4 sm:p-6 flex flex-col gap-5 overflow-y-auto no-scrollbar">
            {/* Poster Image */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="relative aspect-4/5 w-full mt-12 max-w-lg mx-auto lg:max-w-none rounded-2xl overflow-hidden border border-[rgba(212,163,89,0.3)] shadow-2xl shadow-black group"
            >
              <Image
                src={event.imageUrl}
                alt={`${event.title} poster`}
                fill
                quality={50}
                className="object-cover transition-transform duration-700 group-hover:scale-105"
                placeholder="blur"
                blurDataURL={`data:image/svg+xml;base64,${toBase64(
                  shimmer(700, 933)
                )}`}
                priority
                sizes="(max-width: 768px) 100vw, (max-width: 1280px) 45vw, 600px"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B0E]/90 via-transparent to-transparent opacity-70" />

              {/* Category Tag on Image */}
              <div className="absolute top-4 right-4 flex gap-2">
                {/* Department Tag */}
                {event.department && (
                  <div className="px-3 py-1 rounded-full bg-[#0B0B0E]/80 backdrop-blur-md border border-[rgba(212,163,89,0.3)] text-xs font-medium text-[#FDE6B0] uppercase">
                    {event.department}
                  </div>
                )}
                {/* Category Tag */}
                <div className="px-3 py-1 rounded-full bg-[#0B0B0E]/80 backdrop-blur-md border border-[rgba(212,163,89,0.3)] text-xs font-medium text-[#F3C87A] uppercase">
                  {event.type}
                </div>
              </div>

              {/* Online Banner if applicable */}
              {event.isOnline && (
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="w-full py-2 btn-gold text-center text-sm font-bold tracking-wide uppercase rounded-xl shadow-[0_0_15px_rgba(212,163,89,0.35)]">
                    Online Event
                  </div>
                </div>
              )}
            </motion.div>

            {/* Desktop: Coordinators Below Image (Mobile: moved to bottom) */}
            <div className="hidden lg:grid gap-4 mt-auto">
              {event.coordinators && event.coordinators.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-[#A1A1AA] font-medium uppercase tracking-wider">
                    Event Coordinators
                  </p>
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-2">
                    {event.coordinators.map((c, i) => (
                      <CoordinatorCard
                        key={i}
                        coordinator={c}
                        eventTitle={event.title}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* RIGHT PANEL - Scrollable Content */}
          <section className="w-full lg:w-[55%] xl:w-[55%] p-4 sm:p-6 lg:pt-16 pb-24 space-y-8">
            {/* Header Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-4"
            >
              <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold tracking-tight">
                <span className="gold-gradient-text">
                  {event.title}
                </span>
              </h1>

              <div className="flex flex-wrap gap-3">
                {/* Event Type / Subtype Tags */}
                {event.eveType && (
                  <span className="px-2.5 py-1 rounded-md text-xs font-medium border border-[rgba(212,163,89,0.25)] bg-[#131318] text-[#F3C87A] uppercase">
                    {event.eveType === "ind" ? "Individual" : "Team Event"}
                  </span>
                )}
              </div>

              <div className="max-w-3xl border-l-2 border-[#D4A359] pl-4">
                <p className="text-base md:text-lg text-[#A1A1AA] leading-relaxed inline">
                  {isExpanded || !event.description || event.description.length <= 150
                    ? event.description
                    : `${event.description.slice(0, 150)}...`}
                </p>
                {event.description && event.description.length > 150 && (
                  <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="ml-2 text-[#F3C87A] hover:text-[#FDE6B0] font-medium text-sm transition-colors cursor-pointer focus:outline-hidden"
                  >
                    {isExpanded ? "Read Less" : "Read More"}
                  </button>
                )}
              </div>
            </motion.div>

            {/* Info Grid (Bento) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <InfoCard
                icon={<FaCalendarDay size={18} />}
                title="Date"
                value={event.date || "TBA"}
                delay={0.3}
                variant="highlight"
              />
              <InfoCard
                icon={<LuMapPin size={18} />}
                title="Venue"
                value={event.isOnline ? "Online" : event.venue || "TBA"}
                delay={0.35}
              />
              <InfoCard
                icon={<LuIndianRupee size={18} />}
                title="Registration Fee"
                value={event.registrationFee || "Free"}
                delay={0.4}
              />
              {(event.maxParticipation || event.memberMaxCount > 0) && (
                <InfoCard
                  icon={<LuUsers size={18} />}
                  title="Participation"
                  value={
                    event.maxParticipation
                      ? event.maxParticipation
                      : event.memberMaxCount > 1
                      ? `${event.memberMinCount}-${event.memberMaxCount} Members`
                      : "Individual"
                  }
                  delay={0.45}
                />
              )}
            </div>

            {/* Prize Pool */}
            {(event.firstPrize || event.secondPrize || event.thirdPrize) && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="space-y-4"
              >
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold text-white">Prize Pool</h2>
                  <div className="h-px flex-1 bg-[rgba(212,163,89,0.2)]" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {event.firstPrize && (
                    <PrizeCard
                      prize={event.firstPrize}
                      title="1st Place"
                      color="gold"
                      icon={<LuTrophy />}
                    />
                  )}
                  {event.secondPrize && (
                    <PrizeCard
                      prize={event.secondPrize}
                      title="2nd Place"
                      color="silver"
                      icon={<LuAward />}
                    />
                  )}
                  {event.thirdPrize && (
                    <PrizeCard
                      prize={event.thirdPrize}
                      title="3rd Place"
                      color="bronze"
                      icon={<LuAward />}
                    />
                  )}
                </div>
              </motion.div>
            )}

            {/* Rules & Details Split */}
            <div className="grid md:grid-cols-1 gap-6">
              {/* Rules */}
              {event.rules && event.rules.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="relative overflow-hidden rounded-2xl p-6 border border-[rgba(212,163,89,0.25)] bg-[#131318]"
                >
                  {/* Decorative Flash */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#3A270D]/40 blur-3xl rounded-full pointer-events-none" />

                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-[#FDE6B0]">
                    <LuBookOpen className="text-[#F3C87A]" />
                    Rules & Requirements
                  </h3>
                  <ul className="space-y-3">
                    {Array.isArray(event.rules) ? (
                      (event.rules as string[]).map((rule, i: number) => (
                        <li
                          key={i}
                          className="flex gap-3 text-[#A1A1AA] text-sm leading-relaxed"
                        >
                          <span className="text-[#D4A359] font-bold mt-1">
                            •
                          </span>
                          <span>{rule}</span>
                        </li>
                      ))
                    ) : (
                      <li className="flex gap-3 text-[#A1A1AA] text-sm leading-relaxed">
                        <span className="text-[#D4A359] font-bold mt-1">
                          •
                        </span>
                        <span>{event.rules}</span>
                      </li>
                    )}
                  </ul>
                </motion.div>
              )}

              {/* Extra Fields Notice */}
              {event.extraFields && event.extraFields.length > 0 && (
                <div className="p-4 rounded-xl border border-[rgba(212,163,89,0.25)] bg-[#131318]">
                  <p className="text-[#FDE6B0] text-sm font-medium mb-2">
                    Registration Information Required:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {event.extraFields.map((f, i) => (
                      <span
                        key={i}
                        className="px-2 py-1 text-xs rounded bg-[#3A270D] text-[#F3C87A] border border-[rgba(212,163,89,0.3)]"
                      >
                        {f.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Primary CTA Section - Centered or Prominent */}
              {event.regLink && (
                <div className="pt-2">
                  <RegisterButtonSection event={event} />
                </div>
              )}
            </div>

            {/* Mobile Only: Coordinators at bottom */}
            <div className="lg:hidden space-y-4 pt-8 border-t border-[rgba(212,163,89,0.2)]">
              {event.coordinators && event.coordinators.length > 0 && (
                <>
                  <p className="text-sm text-[#A1A1AA] font-medium uppercase tracking-wider">
                    Event Coordinators
                  </p>
                  <div className="grid grid-cols-1 gap-3">
                    {event.coordinators.map((c, i) => (
                      <CoordinatorCard
                        key={i}
                        coordinator={c}
                        eventTitle={event.title}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          </section>
        </main>
      </div>
    </Suspense>
  );
}
