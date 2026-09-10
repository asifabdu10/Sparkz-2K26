"use client";

import Image from "next/image";
import { Suspense, useMemo, useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import Particles from "@/widgets/common/Particles";
import GradientBackground from "@/components/ui/GradientBackground";

import { db } from "@/utils/firebase";
import { collection, getDocs } from "firebase/firestore";
import { departments } from "@/utils/constants/Constants";
import { Event } from "@/utils/types/event";
import { convertDriveUrl } from "@/utils/imageUtils";

// Event Card Component with image loading state
function EventCard({ event, idx }: { event: Event; idx: number }) {
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <motion.div
      key={event.id}
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{
        duration: 0.28,
        ease: [0.16, 1, 0.3, 1],
        delay: idx * 0.03,
      }}
      whileHover={{ y: -6 }}
      className="group"
    >
      <Link
        href={`/events/${event.id}`}
        className="block rounded-2xl max-w-90 border border-[rgba(212,163,89,0.25)] bg-[#131318] backdrop-blur transition-all duration-300 hover:border-[#F3C87A] hover:shadow-xl hover:shadow-[rgba(212,163,89,0.2)]"
      >
        {/* Poster frame */}
        <div className="relative aspect-4/5 w-full rounded-2xl overflow-hidden bg-[#0B0B0E]">
          {/* Skeleton loader */}
          {!imageLoaded && (
            <div className="absolute inset-0 bg-[#131318]">
              <div className="absolute inset-0 bg-linear-to-r from-transparent via-[rgba(212,163,89,0.1)] to-transparent skew-x-12 animate-shimmer" />
            </div>
          )}

          <Image
            src={convertDriveUrl(event.imageUrl)}
            alt={event.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            quality={75}
            className={`object-contain rounded-2xl transition-all duration-500 ${
              imageLoaded ? "opacity-100" : "opacity-0"
            }`}
            priority={idx < 3}
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageLoaded(true)}
          />
        </div>
      </Link>
    </motion.div>
  );
}

// ... (rest of imports)

export default function EventsPage() {
  const [selectedDept, setSelectedDept] = useState<string>("All");
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "events"));
        if (!querySnapshot.empty) {
          const eventsList = querySnapshot.docs.map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              title: data.title,
              department: data.department,
              imageUrl: data.imageUrl,
            };
          }) as Event[];
          setEvents(eventsList);
        } else {
          setEvents([]);
        }
      } catch (error) {
        console.error("Error fetching events:", error);
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  const filteredEvents = useMemo(() => {
    let data = events;

    if (selectedDept !== "All") {
      data = data.filter((event) => event.department === selectedDept);
    }
    return data;
  }, [events, selectedDept]);

  return (
    <section className="relative isolate overflow-hidden bg-[#0B0B0E] text-white min-h-screen py-10">
      <GradientBackground />

      <div className="relative mx-auto max-w-348 px-4 sm:px-6">
        <motion.header
          initial={{ opacity: 0, y: 16, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight">
            <span className="gold-gradient-text">
              Sparkz Events
            </span>
          </h1>

          <p className="mt-4 text-lg text-[#A1A1AA] max-w-2xl mx-auto">
            Choose your battlefield, learn something new, and compete for glory
            — curated challenges across all departments.
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {departments.map((dept) => {
              const active = selectedDept === dept;
              return (
                <motion.button
                  key={dept}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedDept(dept)}
                  className={`px-5 py-2.5 rounded-full font-semibold text-sm transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F3C87A]/30 ${
                    active
                      ? "btn-gold shadow-lg"
                      : "border border-[rgba(212,163,89,0.25)] bg-[#131318] text-[#A1A1AA] hover:text-white hover:border-[#F3C87A]"
                  }`}
                >
                  {dept === "All" ? "All Events" : dept}
                </motion.button>
              );
            })}
          </div>
        </motion.header>

        {/* Events grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="rounded-2xl border border-[rgba(212,163,89,0.2)] bg-[#131318] overflow-hidden"
              >
                <div className="aspect-4/5 w-full bg-[#131318] relative overflow-hidden">
                  <div className="absolute inset-0 bg-linear-to-r from-transparent via-[rgba(212,163,89,0.1)] to-transparent skew-x-12 animate-shimmer" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Suspense
            fallback={<div className="h-8 w-full bg-[#131318] rounded-lg"></div>}
          >
            <motion.div
              layout
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8"
            >
              <AnimatePresence>
                {filteredEvents.map((event, idx) => (
                  <EventCard key={event.id} event={event} idx={idx} />
                ))}
              </AnimatePresence>
            </motion.div>
          </Suspense>
        )}

        {/* Decorative particles near header */}
        <Particles />

        {/* small footer of the section */}
        <div className="mt-12 border-t border-[rgba(212,163,89,0.2)] pt-6 text-center text-sm text-[#A1A1AA]">
          <p>
            Can&apos;t find an event? Contact the tech team — we&apos;re happy
            to help.
          </p>
        </div>
      </div>
    </section>
  );
}
