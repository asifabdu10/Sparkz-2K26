"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { exhibitionsList } from "@/utils/constants/exhibitionsData";

export default function ExhibitionsSection() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <section
      id="exhibitions"
      className="relative isolate overflow-hidden bg-[#07080D] py-16 sm:py-24 text-white scroll-mt-20"
    >
      {/* Anchor for backward compatibility with #expo links */}
      <span id="expo" className="absolute -top-24" />

      {/* Background glow effects */}
      {mounted && (
        <>
          <div className="pointer-events-none absolute left-[-15%] top-[10%] h-[500px] w-[500px] rounded-full bg-[#D4A359]/15 blur-[160px]" />
          <div className="pointer-events-none absolute right-[-10%] top-[40%] h-[500px] w-[500px] rounded-full bg-blue-600/15 blur-[170px]" />
          <div className="pointer-events-none absolute left-[30%] bottom-[5%] h-[400px] w-[400px] rounded-full bg-amber-500/10 blur-[150px]" />

          {/* Grid pattern overlay */}
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:80px_80px] opacity-40" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_20%,#07080D_80%)]" />
        </>
      )}

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-3xl text-center mb-10 sm:mb-14">
          {/* <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full border border-[rgba(212,163,89,0.35)] bg-[rgba(212,163,89,0.08)] px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-[#F3C87A] backdrop-blur-md mb-4 shadow-[0_0_20px_rgba(212,163,89,0.15)]"
          >
            <Sparkles className="h-3.5 w-3.5 text-[#F3C87A]" />
            <span>Mega Attractions • Sparkz 2K26</span>
          </motion.div> */}

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-3xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl text-white"
          >
            <span className="bg-gradient-to-r from-[#F3C87A] via-[#E8BE74] to-[#C99846] bg-clip-text text-transparent drop-shadow-[0_0_25px_rgba(212,163,89,0.3)]">
              Exhibitions
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-4 text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl mx-auto"
          >
            Discover cutting-edge innovations across energy, aviation, safety, construction, and security through hands-on exhibits and live demonstrations from leading industry partners.          </motion.p>
        </div>

        {/* Logo Navigation Hub */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="rounded-3xl border border-[rgba(212,163,89,0.2)] bg-[#0C0E17]/85 p-5 sm:p-7 backdrop-blur-xl shadow-2xl"
        >
          <div className="pb-5 border-b border-white/10 text-center sm:text-left">
            <span className="text-xs font-bold tracking-widest text-[#F3C87A] uppercase">
              Official Expo Partners & Showcases
            </span>

          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4 pt-5">
            {exhibitionsList.map((expo) => (
              <Link
                key={expo.id}
                href={`/exhibitions/${expo.slug}`}
                className="group relative flex flex-col items-center justify-center p-4 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.08] hover:border-[#F3C87A]/40 transition-all duration-300 hover:scale-[1.04] hover:shadow-[0_0_25px_rgba(212,163,89,0.2)]"
              >
                <div className="relative h-20 w-20 sm:h-24 sm:w-24 mb-3 flex items-center justify-center rounded-2xl bg-white/5 p-2 ring-1 ring-white/10 group-hover:ring-[#F3C87A]/50 transition-all duration-300 shadow-md">
                  <Image
                    src={expo.logo}
                    alt={`${expo.title} Logo`}
                    width={96}
                    height={96}
                    className="object-contain max-h-full max-w-full group-hover:scale-110 transition-transform duration-300 drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]"
                  />
                  {/* Subtle hover pulse */}
                  <span className="absolute inset-0 rounded-2xl bg-[#F3C87A]/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                </div>

                <span className="text-xs font-bold text-white text-center line-clamp-1 group-hover:text-[#F3C87A] transition-colors">
                  {expo.shortTitle}
                </span>
                <span className="text-[10px] text-slate-400 text-center line-clamp-1 mt-0.5">
                  {expo.organizerTag}
                </span>

                <div className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-[#F3C87A] opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200">
                  <span>View Expo</span>
                  <ArrowUpRight className="h-3 w-3" />
                </div>
              </Link>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
