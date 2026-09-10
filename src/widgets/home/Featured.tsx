"use client";

import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useInView } from "framer-motion";
import { db } from "@/utils/firebase";
import { collection, getDocs, query, where, limit } from "firebase/firestore";
import { Event } from "@/utils/types/event";

const SWIPE_THRESHOLD = 30;

export default function FeaturedEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [mounted, setMounted] = useState(false);
  const sectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const fetchFeaturedEvents = async () => {
      try {
        let fetchedEvents: Event[] = [];

        // 1. First, fetch the rc-car-racing event specifically
        const rcCarQuery = query(
          collection(db, "events"),
          where("__name__", "==", "rc-car-racing"),
          limit(1)
        );
        const rcCarSnapshot = await getDocs(rcCarQuery);

        if (!rcCarSnapshot.empty) {
          const rcCarEvent = {
            id: rcCarSnapshot.docs[0].id,
            ...rcCarSnapshot.docs[0].data(),
          } as Event;
          fetchedEvents.push(rcCarEvent);
        }

        // 2. Fetch featured events
        const featuredQuery = query(
          collection(db, "events"),
          where("featured", "==", true),
          limit(5)
        );
        const featuredSnapshot = await getDocs(featuredQuery);

        featuredSnapshot.docs.forEach((doc) => {
          const event = { id: doc.id, ...doc.data() } as Event;
          // Avoid duplicates
          if (!fetchedEvents.some((e) => e.id === event.id)) {
            fetchedEvents.push(event);
          }
        });

        // 3. If we still need more events, fetch some recent ones
        if (fetchedEvents.length < 5) {
          const recentQuery = query(
            collection(db, "events"),
            limit(8) // Fetch more to ensure we have enough after filtering
          );
          const recentSnapshot = await getDocs(recentQuery);

          recentSnapshot.docs.forEach((doc) => {
            const event = { id: doc.id, ...doc.data() } as Event;
            // Avoid duplicates and limit total to 6-7 events
            if (
              !fetchedEvents.some((e) => e.id === event.id) &&
              fetchedEvents.length < 7
            ) {
              fetchedEvents.push(event);
            }
          });
        }

        setEvents(fetchedEvents);
      } catch (err) {
        console.error("Failed to fetch featured events", err);
      }
    };
    fetchFeaturedEvents();
  }, []);

  const total = events.length;
  const getIndex = useCallback(
    (i: number) => {
      if (total === 0) return 0;
      return (i + total) % total;
    },
    [total]
  );

  const isInView = useInView(sectionRef, {
    amount: 0.1, // at least 10% visible
    margin: "-80px",
  });

  const shouldPause = paused || !isInView || total === 0;

  useEffect(() => {
    if (shouldPause) return;

    const interval = setInterval(() => {
      setActive((i) => getIndex(i + 1));
    }, 3250);

    return () => clearInterval(interval);
  }, [getIndex, shouldPause, total]);

  if (total === 0) return null; // Or render skeleton

  const visibleEvents = [
    events[getIndex(active - 1)],
    events[getIndex(active)],
    events[getIndex(active + 1)],
  ];

  const handleSwipe = (offsetX: number) => {
    if (offsetX > SWIPE_THRESHOLD) {
      setActive((i) => getIndex(i - 1)); // swipe right
    } else if (offsetX < -SWIPE_THRESHOLD) {
      setActive((i) => getIndex(i + 1)); // swipe left
    }
  };

  return (
    <section
      className="relative isolate overflow-hidden bg-[#0B0B0E] py-10 sm:py-15"
      ref={sectionRef}
    >
      {/* Background Effects */}
      {mounted && (
        <>
          {/* Warm Dark Bronze Glows */}
          <div className="pointer-events-none absolute left-[-10%] top-[20%] h-96 w-96 rounded-full bg-[#3A270D]/45 blur-[140px]" />
          <div className="hidden sm:block pointer-events-none absolute right-[-5%] top-[30%] h-96 w-96 rounded-full bg-[#3A270D]/35 blur-[150px]" />

          {/* Subtle Grid Pattern */}
          <div className="hidden sm:block pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(212,163,89,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(212,163,89,0.03)_1px,transparent_1px)] bg-size-[100px_100px] opacity-25" />

          {/* Radial Gradients */}
          <div className="hidden sm:block pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_40%_40%,rgba(58,39,13,0.3),transparent_50%),radial-gradient(circle_at_60%_60%,rgba(212,163,89,0.05),transparent_45%)]" />
        </>
      )}

      <div className="relative px-[5vw]">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-20 sm:mb-28 text-center text-white text-4xl font-bold leading-tight sm:text-5xl"
        >
          Featured{" "}
          <span className="gold-gradient-text">
            Events
          </span>
        </motion.h2>

        <div className="relative flex items-center justify-center gap-4 sm:gap-12">
          <AnimatePresence initial={false}>
            {visibleEvents.map((event, idx) => {
              const isCenter = idx === 1;
              return (
                <motion.div
                  key={event.id}
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={1}
                  onDragEnd={(_, info) => {
                    handleSwipe(info.offset.x);
                    setPaused(true);
                    setTimeout(() => setPaused(false), 100);
                  }}
                  whileTap={{ scale: 0.97 }}
                  layout
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{
                    opacity: isCenter ? 1 : 0.5,
                    scale: isCenter ? 1.05 : 0.85,
                    y: isCenter ? -35 : 0,
                    rotate: isCenter ? 0 : idx === 0 ? -8 : 8,
                  }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className={`relative ${
                    isCenter
                      ? "z-30 w-[70vw] sm:w-72"
                      : "z-10 hidden sm:block w-64"
                  } flex-shrink-0`}
                  whileHover={isCenter ? { scale: 1.08, y: -30 } : {}}
                  onMouseEnter={() => isCenter && setPaused(true)}
                  onMouseLeave={() => isCenter && setPaused(false)}
                  onFocus={() => isCenter && setPaused(true)}
                  onBlur={() => isCenter && setPaused(false)}
                >
                  <Link
                    href={`/events/${event.id}`}
                    className="group block w-full"
                  >
                    <div
                      className={`relative aspect-4/5 w-full overflow-hidden rounded-3xl border bg-[#131318]
                        ${
                          isCenter
                            ? "border-[#F3C87A] group-hover:scale-105 shadow-2xl shadow-[rgba(212,163,89,0.3)]"
                            : "border-[rgba(212,163,89,0.2)]"
                        }
                         transition-all duration-500`}
                    >
                      {/* Inner glow */}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#131318]/80 via-transparent to-transparent pointer-events-none" />
                      <Image
                        src={event.imageUrl || "/event.png"}
                        alt={event.title}
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        priority={idx < 3}
                        fill
                        className="object-contain transition-transform duration-700"
                      />
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Glowing nav buttons */}
          <button
            onClick={() => setActive((i) => getIndex(i - 1))}
            className="absolute left-2 sm:left-4 z-40 rounded-full bg-[#131318]/80 border border-[rgba(212,163,89,0.25)] p-2 sm:p-4 backdrop-blur hover:bg-[#1a1a22] hover:border-[#F3C87A] hover:scale-110 transition"
          >
            <span className="text-2xl sm:text-4xl text-[#F3C87A]">‹</span>
          </button>
          <button
            onClick={() => setActive((i) => getIndex(i + 1))}
            className="absolute right-2 sm:right-4 z-40 rounded-full bg-[#131318]/80 border border-[rgba(212,163,89,0.25)] p-2 sm:p-4 backdrop-blur hover:bg-[#1a1a22] hover:border-[#F3C87A] hover:scale-110 transition"
          >
            <span className="text-2xl sm:text-4xl text-[#F3C87A]">›</span>
          </button>
        </div>
      </div>
    </section>
  );
}
