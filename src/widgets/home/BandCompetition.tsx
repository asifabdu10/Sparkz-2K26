"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

const accentGradient =
  "bg-gradient-to-r from-indigo-500/30 via-fuchsia-500/25 to-amber-400/25";

const eventPoints = [
  {
    title: "Epic Performances",
    body: "Showcase your band's talent in a high-energy competition with live audiences and professional judging.",
  },
  {
    title: "Lucrative Prizes",
    body: "Compete for ₹30,000 (1st), ₹20,000 (2nd), and ₹10,000 (3rd) – plus certificates and glory!",
  },
  {
    title: "Easy Registration",
    body: "Teams of 5-10 members: Just ₹1,200 fee. Date: 8 October 2026. Register now!",
  },
];

const guests = [
  {
    name: "Ouseppachan",
    role: "Playback Singer | Music Director",
    image: "/ouseppachan.png",
    tag: "Chief Guest & Judge",
  },
  {
    name: "Roshan NC",
    role: "Guitarist | Musician",
    image: "/roshan_nc.png",
    tag: "Competition Judge",
  },
];

export default function BandCompetition() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  return (
    <section
      id="band-competition"
      className="relative isolate overflow-hidden bg-[#0B0B0E] pt-10 pb-20 text-white sm:py-24"
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

      {/* CONTENT */}
      <div className="relative z-10">
        <div className="mx-auto max-w-336">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left Column: Content + Highlights */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="space-y-8"
            >
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(212,163,89,0.25)] bg-[#131318]/80 px-4 py-2 text-[13px] font-bold uppercase tracking-widest text-[#F3C87A] backdrop-blur">
                  <span className="h-2 w-2 rounded-full bg-[#F3C87A] animate-pulse" />
                  ABHERI -{" "}
                  <span className="text-[9px]">Music Band Competition</span>
                </div>

                <h2 className="mt-6 text-4xl font-black leading-tight sm:text-5xl lg:text-6xl text-white">
                  Rock the Stage
                  <br />
                  <span className="gold-gradient-text">
                    with ABHERI
                  </span>
                </h2>

                <p className="mt-4 text-lg text-[#A1A1AA] leading-relaxed max-w-xl">
                  Unleash your rhythm, captivate the crowd, and battle for glory
                  in the ultimate inter-college band showdown.
                </p>
              </div>

              {/* Highlights Grid (Now on Left) */}
              <div className="grid sm:grid-cols-2 gap-4">
                {eventPoints.map((point, i) => (
                  <div
                    key={i}
                    className={`p-4 rounded-xl border border-[rgba(212,163,89,0.25)] bg-[#131318] hover:border-[#F3C87A] transition-colors duration-300 ${i === 2 ? "sm:col-span-2" : ""
                      }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#3A270D] text-[#F3C87A] border border-[rgba(212,163,89,0.3)] text-xs font-bold">
                        {i + 1}
                      </div>
                      <h3 className="font-bold text-white">
                        {point.title}
                      </h3>
                    </div>
                    <p className="text-sm text-[#A1A1AA] leading-relaxed pl-9">
                      {point.body}
                    </p>
                  </div>
                ))}
              </div>

              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="pt-2"
              >
                <Link
                  href="/abheri"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-gold inline-flex items-center justify-center gap-2 rounded-full px-8 py-3 text-sm font-bold uppercase tracking-widest text-[#0B0B0E] transition-all duration-300 transform hover:-translate-y-1 w-full sm:w-auto"
                >
                  View More & Register
                  <span className="text-xs">→</span>
                </Link>
              </motion.div>
            </motion.div>

            {/* Right Column: Guest Spotlights (Grid/Stacked) */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="relative ml-auto w-full grid gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 items-start"
            >
              {guests.map((guest, index) => (
                <div
                  key={index}
                  className="relative rounded-3xl border border-[rgba(212,163,89,0.25)] bg-[#131318] backdrop-blur overflow-hidden group shadow-xl"
                >
                  {/* Decorative background */}
                  <div className="absolute inset-0 bg-linear-to-br from-[#3A270D]/20 via-transparent to-[rgba(212,163,89,0.05)] opacity-50" />

                  <div className="relative p-2 sm:p-4">
                    <div className="relative w-full aspect-4/5 overflow-hidden rounded-2xl bg-[#0B0B0E]">
                      <Image
                        src={guest.image}
                        alt={guest.name}
                        fill
                        className="object-cover object-top transition-transform duration-700 group-hover:scale-105"
                      />
                      {/* Stronger gradient overlay to create space for text */}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B0E] via-[#0B0B0E]/80 to-transparent" />

                      <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6">
                        <div className="inline-block px-3 py-1 mb-2 rounded-lg bg-[#3A270D] border border-[rgba(212,163,89,0.35)] backdrop-blur-md">
                          <span className="text-[#F3C87A] text-[10px] font-bold tracking-widest uppercase">
                            {guest.tag}
                          </span>
                        </div>
                        <h3 className="text-xl sm:text-2xl font-black text-white mb-1 tracking-tight">
                          {guest.name}
                        </h3>
                        <p className="text-xs sm:text-[13px] text-[#A1A1AA] font-normal">
                          {guest.role}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
