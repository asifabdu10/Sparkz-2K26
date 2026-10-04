"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";

const LEFT_RULES = [
  "All external participants must maintain proper discipline, decorum, and respectful behaviour throughout the Tech Fest.",
  "Participants must follow the instructions of the Organizing Committee, faculty coordinators, event coordinators, volunteers, and security personnel.",
  "Ragging, bullying, harassment, intimidation, abusive language, fighting, or any form of misconduct is strictly prohibited.",
  "Participants must not engage in behaviour that causes inconvenience, disturbance, or discomfort to other participants, students, staff, or visitors.",
  "Smoking, alcohol, drugs, and other intoxicating substances are strictly prohibited on the campus.",
  "Participants must not enter restricted areas or interfere with ongoing academic or administrative activities.",
];

const RIGHT_RULES = [
  "College property, equipment, furniture, and other facilities must be handled responsibly. Any damage caused may result in disqualification and recovery of the cost of damage.",
  "Participants must keep the campus clean and use the designated waste-disposal facilities.",
  "Weapons or other prohibited items are not permitted on the campus.",
  "Any participant found violating the disciplinary guidelines may be disqualified and asked to leave the campus.",
  "The Organizing Committee reserves the right to take appropriate action against participants involved in serious misconduct.",
  "The decision of the Tech Fest Organizing Committee on disciplinary matters shall be final. External participants attending the Pro Show must remain within their designated/allocated spaces throughout the event.",
];

export default function EventGuidelines() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <section
      id="guidelines"
      className="relative isolate overflow-hidden bg-[#0B0B0E] py-20 text-white scroll-mt-20"
    >
      <span id="rules" className="absolute -top-24 pointer-events-none" />
      {mounted && (
        <>
          <div className="pointer-events-none absolute left-[-10%] top-[5%] h-[420px] w-[420px] rounded-full bg-[#3A270D]/45 blur-[150px]" />
          <div className="pointer-events-none absolute right-[-8%] bottom-[5%] h-[380px] w-[380px] rounded-full bg-[#3A270D]/35 blur-[130px]" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(212,163,89,0.07),transparent_60%)]" />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(212,163,89,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(212,163,89,0.025)_1px,transparent_1px)] bg-[size:80px_80px]" />
        </>
      )}

      <div className="relative z-10 mx-auto max-w-5xl px-4 sm:px-8 lg:px-[4vw]">

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex flex-col items-center gap-5 text-center mb-14"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(212,163,89,0.3)] bg-[#131318]/90 px-4 py-2 text-[13px] font-bold uppercase tracking-widest text-[#F3C87A] backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-[#F3C87A] animate-pulse" />
            Event Rules &amp; Guidelines
          </div>

          <h2 className="text-4xl font-black leading-tight sm:text-5xl lg:text-6xl text-white">
            The{" "}
            <span className="gold-gradient-text">Guidelines</span>
          </h2>
          <p className="max-w-lg text-[#A1A1AA] text-base sm:text-lg leading-relaxed">
            Read through these guidelines carefully before participating in any Sparkz 2K26 event.
          </p>

          <div className="flex items-center gap-3 w-full max-w-xs">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[rgba(212,163,89,0.45)] to-transparent" />
            <span className="text-[#D4A359] text-lg">&#10022;</span>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[rgba(212,163,89,0.45)] to-transparent" />
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <RuleColumn title="Discipline & Conduct" icon="GENERAL" rules={LEFT_RULES} delay={0} />
          <RuleColumn title="Campus Rules" icon="CONDUCT" rules={RIGHT_RULES} delay={0.1} />
        </div>

      </div>

    </section>
  );
}

function RuleColumn({
  title,
  icon,
  rules,
  delay,
}: {
  title: string;
  icon: string;
  rules: string[];
  delay: number;
}) {
  const emoji = icon === "GENERAL" ? "⚡" : "🤝";
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.65, delay }}
      className="group relative rounded-3xl border border-[rgba(212,163,89,0.18)] bg-[#131318]/80 backdrop-blur overflow-hidden"
    >
      <div className="pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full bg-[#D4A359]/10 blur-[60px] group-hover:bg-[#D4A359]/18 transition-all duration-700" />

      <div className="flex items-center gap-3 border-b border-[rgba(212,163,89,0.12)] px-6 py-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#D4A359] to-[#F3C87A] text-base shadow-[0_4px_14px_rgba(212,163,89,0.35)]">
          {emoji}
        </span>
        <h3 className="text-sm font-black uppercase tracking-widest gold-gradient-text">
          {title}
        </h3>
      </div>

      <ul className="divide-y divide-[rgba(212,163,89,0.07)]">
        {rules.map((rule, idx) => (
          <motion.li
            key={idx}
            initial={{ opacity: 0, x: -10 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-30px" }}
            transition={{ duration: 0.4, delay: delay + idx * 0.06 }}
            className="group/row flex items-start gap-4 px-6 py-4 hover:bg-[rgba(212,163,89,0.04)] transition-colors duration-200"
          >
            {/* Glowing bullet */}
            <div className="relative mt-0.5 shrink-0">
              {/* Soft breathing glow ring */}
              <motion.span
                className="absolute inset-[-3px] rounded-full bg-[#D4A359]/30 blur-[5px]"
                animate={{
                  opacity: [0.3, 0.7, 0.3],
                  scale: [1, 1.25, 1],
                }}
                transition={{
                  duration: 2.8,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: idx * 0.18,
                }}
              />
              {/* Number badge */}
              <span className="relative flex h-[22px] w-[22px] items-center justify-center rounded-full bg-gradient-to-br from-[#D4A359] to-[#F3C87A] text-[10px] font-black text-[#0B0B0E] shadow-[0_0_6px_rgba(212,163,89,0.45)]">
                {idx + 1}
              </span>
            </div>
            <p className="text-[#A1A1AA] text-sm leading-relaxed group-hover/row:text-white transition-colors duration-200">
              {rule}
            </p>
          </motion.li>
        ))}
      </ul>
    </motion.div>
  );
}
