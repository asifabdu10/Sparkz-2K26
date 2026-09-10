"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Linkedin, Code, Coffee, Heart } from "lucide-react";
import Head from "next/head";
import Link from "next/link";

const techTeam = [
  {
    name: "Abhishek Santhosh",
    role: "Full Stack Developer",
    linkedin: "https://www.linkedin.com/in/abhishek-santhosh",
  },
  {
    name: "Joel Joy",
    role: "Full Stack Developer",
    linkedin: "https://www.linkedin.com/in/joeljoy123/",
  },
];

export default function CreditsPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <>
      <Head>
        <title>Credits - Tech Team | Sparkz &apos;26</title>
        <meta
          name="description"
          content="Meet the talented developers behind Sparkz 2K26 platform. Built with passion by Abhishek Santhosh and Joel Joy."
        />
        <meta name="robots" content="index, follow" />
      </Head>

      <div className="min-h-screen bg-[#0B0B0E] text-white">
        {/* Background Effects */}
        {mounted && (
          <>
            <div className="pointer-events-none fixed inset-0">
              <div className="absolute left-[-10%] top-[10%] h-96 w-96 rounded-full bg-[#3A270D]/40 blur-[140px]" />
              <div className="absolute right-[-5%] top-[30%] h-96 w-96 rounded-full bg-[#3A270D]/30 blur-[150px]" />
              <div className="absolute left-[20%] bottom-[10%] h-96 w-96 rounded-full bg-[#3A270D]/20 blur-[140px]" />
            </div>

            {/* Grid Pattern */}
            <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(212,163,89,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(212,163,89,0.03)_1px,transparent_1px)] bg-[size:100px_100px] opacity-30" />

            {/* Floating Code Symbols */}
            {[
              { className: "right-[15%] top-[15%] h-8 w-8", delay: 0 },
              { className: "left-[10%] top-[60%] h-10 w-10", delay: 0.5 },
              { className: "right-[20%] bottom-[20%] h-6 w-6", delay: 1 },
            ].map((item, i) => (
              <motion.div
                key={i}
                className={`pointer-events-none absolute ${item.className} rounded-lg border border-[rgba(212,163,89,0.3)] bg-[#3A270D]/40 blur-[1px]`}
                animate={{ y: [-10, 15, -10], rotate: [-5, 5, -5] }}
                transition={{
                  duration: 8 + i,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: item.delay,
                }}
              >
                <Code className="w-full h-full p-1 text-[#F3C87A]/50" />
              </motion.div>
            ))}
          </>
        )}

        {/* Content */}
        <div className="relative z-10 px-[5vw] py-20 sm:py-32">
          <div className="mx-auto max-w-6xl">
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center mb-16"
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(212,163,89,0.3)] bg-[#3A270D]/60 px-4 py-2 text-[13px] font-bold uppercase tracking-widest text-[#F3C87A] backdrop-blur mb-6">
                <span className="h-2 w-2 rounded-full bg-[#F3C87A] animate-pulse" />
                Crafted With Passion
              </div>

              <h1 className="text-5xl font-black leading-tight sm:text-6xl lg:text-7xl">
                Meet the{" "}
                <span className="gold-gradient-text">
                  Tech Team
                </span>
              </h1>

              <p className="mt-6 text-lg text-[#A1A1AA] leading-relaxed max-w-2xl mx-auto">
                The brilliant minds who transformed ideas into reality, one line
                of code at a time.
              </p>

              {/* Fun Stats */}
              <div className="mt-12 grid grid-cols-3 gap-6 max-w-2xl mx-auto">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="text-center p-4 rounded-2xl bg-[#131318] border border-[rgba(212,163,89,0.2)]"
                >
                  <Coffee className="w-8 h-8 mx-auto mb-2 text-[#F3C87A]" />
                  <p className="text-2xl font-black text-white">∞</p>
                  <p className="text-xs text-[#A1A1AA] uppercase tracking-wider">
                    Cups of Coffee
                  </p>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                  className="text-center p-4 rounded-2xl bg-[#131318] border border-[rgba(212,163,89,0.2)]"
                >
                  <Code className="w-8 h-8 mx-auto mb-2 text-[#D4A359]" />
                  <p className="text-2xl font-black text-white">10K+</p>
                  <p className="text-xs text-[#A1A1AA] uppercase tracking-wider">
                    Lines of Code
                  </p>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                  className="text-center p-4 rounded-2xl bg-[#131318] border border-[rgba(212,163,89,0.2)]"
                >
                  <Heart className="w-8 h-8 mx-auto mb-2 text-[#F3C87A]" />
                  <p className="text-2xl font-black text-white">100%</p>
                  <p className="text-xs text-[#A1A1AA] uppercase tracking-wider">
                    Made with Love
                  </p>
                </motion.div>
              </div>
            </motion.div>

            {/* Team Members */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
              {techTeam.map((member, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.5 + index * 0.1 }}
                  className="group"
                >
                  <div className="relative rounded-3xl border border-[rgba(212,163,89,0.25)] bg-[#131318] backdrop-blur overflow-hidden hover:border-[rgba(212,163,89,0.5)] transition-all duration-500 hover:shadow-2xl hover:shadow-black hover:-translate-y-2">
                    <div className="relative p-8 sm:p-10">
                      {/* Role Badge */}
                      <div className="inline-block px-4 py-2 mb-6 rounded-lg bg-[#3A270D] border border-[rgba(212,163,89,0.3)] backdrop-blur-md">
                        <span className="text-[#FDE6B0] text-xs font-bold tracking-widest uppercase">
                          {member.role}
                        </span>
                      </div>

                      {/* Name */}
                      <h2 className="text-3xl font-black text-white mb-6 tracking-tight">
                        {member.name}
                      </h2>

                      {/* LinkedIn Link */}
                      <a
                        href={member.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-[#0B0B0E] border border-[rgba(212,163,89,0.25)] text-white hover:text-[#F3C87A] hover:border-[#F3C87A] transition-all duration-300 group/link"
                      >
                        <Linkedin className="w-5 h-5 text-[#D4A359] group-hover/link:scale-110 transition-transform" />
                        <span className="font-semibold">
                          Connect on LinkedIn
                        </span>
                        <svg
                          className="w-4 h-4 transition-transform duration-300 group-hover/link:translate-x-1"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17 8l4 4m0 0l-4 4m4-4H3"
                          />
                        </svg>
                      </a>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Tech Stack Section */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
              className="relative rounded-3xl border border-[rgba(212,163,89,0.25)] bg-[#131318] backdrop-blur overflow-hidden mb-16"
            >
              <div className="relative p-8 sm:p-10 text-center">
                <h2 className="text-2xl font-black gold-gradient-text mb-4 tracking-tight">
                  Built With Modern Tech
                </h2>
                <p className="text-[#A1A1AA] mb-6">
                  Next.js • React • TypeScript • Firebase • Tailwind CSS • Framer Motion
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                  {[
                    "Next.js",
                    "React",
                    "TypeScript",
                    "Firebase",
                    "Tailwind",
                    "Framer Motion",
                  ].map((tech, i) => (
                    <span
                      key={i}
                      className="px-4 py-2 rounded-full bg-[#0B0B0E] border border-[rgba(212,163,89,0.2)] text-sm text-[#FDE6B0] font-medium"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Back to Home */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1 }}
              className="text-center"
            >
              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 rounded-full btn-gold px-8 py-3.5 text-sm font-bold uppercase tracking-widest text-[#0B0B0E] shadow-[0_0_20px_rgba(212,163,89,0.35)] hover:scale-105 transition-all duration-300 transform"
              >
                <span className="text-xs">←</span>
                Back to Home
              </Link>
            </motion.div>
          </div>
        </div>
      </div>
    </>
  );
}
