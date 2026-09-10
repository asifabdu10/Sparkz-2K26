"use client";

import { motion } from "framer-motion";
import Image from "next/image";

export default function Loader() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-[#0B0B0E]">
      {/* Ambient glows & circuits */}
      <div className="pointer-events-none absolute -left-40 -top-40 h-96 w-96 animate-pulse rounded-full bg-[#3A270D]/50 blur-[140px]" />
      <div className="pointer-events-none absolute right-0 bottom-0 h-96 w-96 animate-[pulse_8s_ease-in-out_infinite] rounded-full bg-[#3A270D]/40 blur-[150px]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(58,39,13,0.35),transparent_50%),radial-gradient(circle_at_80%_70%,rgba(212,163,89,0.06),transparent_45%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-20 bg-[linear-gradient(rgba(212,163,89,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(212,163,89,0.04)_1px,transparent_1px)] bg-[size:120px_120px]" />

      {/* Floating spark chips */}
      {[
        { x: "-left-10 top-20" },
        { x: "right-20 top-40" },
        { x: "left-1/3 bottom-32" },
        { x: "right-1/3 bottom-10" },
      ].map((pos, i) => (
        <motion.div
          key={i}
          className={`pointer-events-none absolute h-8 w-8 rounded-lg border border-[rgba(212,163,89,0.35)] bg-[#3A270D]/30 blur-sm ${pos.x}`}
          animate={{
            y: [0, -20, 0],
            rotate: [0, 15, -15, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 5 + i,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.5,
          }}
        />
      ))}

      {/* Central loading */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1, ease: "easeOut" }}
        className="relative flex flex-col items-center gap-8"
      >
        {/* Glowing orb spinner with logo */}
        <div className="relative h-64 w-64">
          {/* Pulsing rings */}
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-dashed border-[rgba(212,163,89,0.4)]"
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          />
          <motion.div
            className="absolute inset-4 rounded-full bg-gradient-to-br from-[#3A270D] via-[#3A270D]/40 to-[rgba(212,163,89,0.15)] blur-2xl"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute inset-0 rounded-full border border-[rgba(243,200,122,0.35)]"
            animate={{
              scale: [1, 1.15, 1],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* Logo reveal */}
          <motion.div
            className="absolute inset-0 flex items-center justify-center rounded-full bg-[#0B0B0E]/80 backdrop-blur"
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          >
            <Image
              src="/sparkz.svg"
              alt="Sparkz 2K26"
              width={180}
              height={180}
              className="object-contain drop-shadow-[0_0_35px_rgba(212,163,89,0.5)]"
            />
          </motion.div>
        </div>

        {/* Text */}
        <div className="space-y-4 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="text-5xl font-bold leading-tight sm:text-6xl"
          >
            <span className="gold-gradient-text animate-[pulse_6s_ease-in-out_infinite]">
              Sparkz 2K26
            </span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 0.8 }}
            className="text-xl text-[#A1A1AA]"
          >
            Igniting in...
          </motion.p>

          {/* Gold spinner bars */}
          <div className="flex gap-2">
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                className="h-2 w-10 rounded-full bg-gradient-to-r from-[#D4A359] to-[#F3C87A]"
                animate={{
                  scaleY: [1, 1.8, 1],
                  opacity: [0.6, 1, 0.6],
                }}
                transition={{
                  duration: 1.2,
                  repeat: Infinity,
                  delay: i * 0.15,
                }}
              />
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}