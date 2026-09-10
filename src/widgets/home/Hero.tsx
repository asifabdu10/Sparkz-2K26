"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import ParticleImage from "@/widgets/common/ParticleImage";

export default function Hero() {

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const particleCount =
    typeof window !== "undefined" && window.innerWidth < 400 ? 0 : 8;

  const particles = useMemo(() => {
    // if not mounted, return an empty array (keeps server markup deterministic).
    if (typeof window === "undefined") return [];
    // deterministic pseudo-random generator based on index
    const seeded = (i: number) => {
      // deterministic but varied values
      const s = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
      return s - Math.floor(s);
    };

    return Array.from({ length: particleCount }).map((_, i) => {
      const angle = (i / 12) * 360;
      const delay = i * 0.2;
      const duration = 12 + seeded(i) * 8;
      const radius = 140 + seeded(i + 7) * 60; // distance from center
      return { i, angle, delay, duration, radius };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [particleCount]);

  return (
    <section className="relative isolate overflow-hidden bg-[#0B0B0E] text-white">
      {/* Ambient + grid */}
      {mounted && (
        <>
          <div className="pointer-events-none absolute -left-32 -top-24 h-80 w-80 animate-pulse rounded-full bg-[#3A270D]/50 blur-[140px]" />
          <div className="pointer-events-none absolute right-0 top-10 h-96 w-96 animate-[pulse_7s_ease-in-out_infinite] rounded-full bg-[#3A270D]/40 blur-[150px]" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(212,163,89,0.06),transparent_40%),radial-gradient(circle_at_80%_10%,rgba(58,39,13,0.35),transparent_38%)]" />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(212,163,89,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(212,163,89,0.03)_1px,transparent_1px)] bg-[size:140px_140px] opacity-25" />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(58,39,13,0.2),transparent_40%),linear-gradient(240deg,rgba(212,163,89,0.05),transparent_35%)] opacity-70" />

          {/* Geometric lines overlay */}
          <div className="pointer-events-none absolute inset-0 opacity-20">
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(212,163,89,0.08)_1px,transparent_1px),linear-gradient(0deg,rgba(212,163,89,0.06)_1px,transparent_1px)] bg-[size:180px_180px]" />
          </div>

          {/* Floating chips */}
          {[
            {
              className:
                "left-[8%] top-[18%] h-7 w-7 rounded-lg border border-[rgba(212,163,89,0.35)] bg-[#3A270D]/30 blur-[1px]",
              y: -12,
              rot: 8,
              dur: 6,
              scale: 1.04,
            },
            {
              className:
                "right-[10%] top-[26%] h-9 w-9 rounded-xl border border-[rgba(243,200,122,0.35)] bg-[#3A270D]/25 blur-[1px]",
              y: 14,
              rot: -10,
              dur: 7,
              scale: 1.05,
            },
            {
              className:
                "left-1/2 bottom-[18%] h-11 w-11 -translate-x-1/2 rounded-2xl border border-[rgba(212,163,89,0.35)] bg-[#3A270D]/20 blur-[1px]",
              y: -10,
              rot: 12,
              dur: 8,
              scale: 1.06,
            },
            {
              className:
                "left-[18%] bottom-[26%] h-6 w-6 rounded-md border border-[rgba(253,230,176,0.3)] bg-[#3A270D]/25 blur-[1px]",
              y: 10,
              rot: -6,
              dur: 6.5,
              scale: 1.03,
            },
          ]
            .slice(0, particleCount + 2)
            .map((chip, idx) => (
              <motion.div
                key={idx}
                className={`pointer-events-none absolute ${chip.className}`}
                animate={{
                  y: [0, chip.y, 0],
                  rotate: [0, chip.rot, -chip.rot, 0],
                  scale: [1, chip.scale, 1],
                }}
                transition={{
                  duration: chip.dur,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            ))}
        </>
      )}

      <div className="relative mx-auto max-w-[94rem] flex min-h-[92vh] px-[5vw] flex-col gap-12 pt-10 pb-15 sm:pb-24 md:flex-row md:items-center md:gap-10">
        {/* Left content */}
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 0.75, ease: "easeOut" }}
          className="order-2 w-full sm:max-w-3xl space-y-6 text-center md:order-1 md:w-1/2 md:text-left"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, amount: 0.6 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="inline-flex items-center text-center gap-2 rounded-full border border-[rgba(212,163,89,0.25)] bg-[#131318]/80 px-3.5 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#FDE6B0] backdrop-blur"
          >
            Carmel College of Engineering and Technology presents
          </motion.div>

          {/* Date badge */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="mx-auto md:mx-0 inline-flex items-center gap-3 rounded-full border border-[rgba(212,163,89,0.35)] bg-[#131318]/90 px-5 py-2.5 text-xs font-bold text-[#F3C87A] backdrop-blur-sm"
          >
            <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-[#F3C87A] animate-ping" />
            <span>October 8 - 9, 2026</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="text-3xl font-bold leading-tight text-white sm:text-3xl lg:text-3xl"
          >
            <span className="relative block mt-2 text-6xl sm:text-4xl lg:text-7xl font-extrabold gold-gradient-text">
              Sparkz 2K26
            </span>
            <span className="text-white font-bold text-2xl sm:text-3xl block mt-1 tracking-wide">
              Innovation Unleashed
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.65, ease: "easeOut" }}
            className="max-w-lg text-[17px] text-[#A1A1AA] sm:text-[17px] leading-relaxed"
          >
            The fest where students compete, create, and spark something big.
          </motion.p>

          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-start">
            <Link
              href="/events"
              className="btn-gold group text-[15px] inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 font-bold text-[#0B0B0E] transition hover:scale-[1.02]"
            >
              Join Now
              <span className="transition group-hover:translate-x-1">→</span>
            </Link>
          </div>
        </motion.div>

        {/* Right visual */}
        <motion.div
          initial={{ opacity: 0, x: 24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 0.75, ease: "easeOut" }}
          className="order-1 relative flex w-full items-center justify-center md:order-2 md:w-1/2 md:-mt-6"
        >
          <div className="relative pl-5 h-80 w-64 sm:h-[28rem] sm:w-96">
            {mounted &&
              particles.map((p) => {
                const angleRad = (p.angle * Math.PI) / 180;
                const initX = Math.cos(angleRad) * p.radius;
                const initY = Math.sin(angleRad) * p.radius;

                return (
                  <motion.div
                    key={`particle-${p.i}`}
                    className="pointer-events-none absolute left-1/2 top-1/2"
                    initial={{
                      x: initX,
                      y: initY,
                      scale: 0,
                      opacity: 0.2,
                    }}
                    animate={{
                      x: initX,
                      y: initY,
                      scale: [0.3, 1.2, 0.6, 0.3],
                      opacity: [0.2, 0.8, 0.6, 0.2],
                    }}
                    transition={{
                      duration: p.duration,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: p.delay,
                    }}
                  >
                    {p.i % 3 === 0 && (
                      <div className="h-3 w-3 rounded-full bg-[#F3C87A] shadow-[0_0_16px_#D4A359] blur-[1px]" />
                    )}
                    {p.i % 3 === 1 && (
                      <div className="h-2 w-2 rotate-45 border border-[#FDE6B0] shadow-[0_0_12px_#F3C87A]" />
                    )}
                    {p.i % 3 === 2 && (
                      <div className="h-4 w-4 rounded-sm bg-gradient-to-br from-[#D4A359] to-[#F3C87A] shadow-[0_0_20px_#D4A359] blur-[2px]" />
                    )}
                  </motion.div>
                );
              })}

            {/* Ambient golden backlight behind logo */}
            <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_50%,rgba(212,163,89,0.3),rgba(58,39,13,0.2)_50%,transparent_70%)] blur-2xl" />

            {/* Particle Logo */}
            <ParticleImage
              imageConfig={{
                image: "/extracted_sparkz.png",
                mode: "fit",
                scale: 11,
              }}
              particleColor="original"
              particleShape="circle"
              particleCount={150}
              particleSize={6}
              hoverEnabled
              hoverConfig={{
                hoverType: "roam",
                transition: { duration: 0.8, ease: "easeInOut" },
                roamOpacity: 0.85,
                roamShape: "oval",
              }}
              repulsionEnabled
              repulsionConfig={{
                repulsionMode: "outside",
                repulsionForce: 8,
                repulsionRadius: 65,
              }}
              autoCycle
              cycleInterval={4500}
              holdDuration={2200}
              width="100%"
              height="100%"
              className="absolute inset-0"
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// function Stat({ label, value }: { label: string; value: string }) {
//   return (
//     <div className="flex flex-col gap-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left backdrop-blur">
//       <span className="text-[11px] uppercase tracking-[0.18em] text-white/60">
//         {label}
//       </span>
//       <span className="text-base font-semibold text-white">{value}</span>
//     </div>
//   );
// }
