"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";

const accentGradient =
  "bg-gradient-to-r from-indigo-500/30 via-fuchsia-500/25 to-amber-400/25";

export default function About() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);
  return (
    <section
      id="about"
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
      <div className="relative z-10 lg:px-[4vw]">
        {/* SPARKZ Section - Centered Vertical Layout */}
        <div className="flex flex-col items-center space-y-10">
          {/* Row 1: About Sparkz Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(212,163,89,0.25)] bg-[#131318]/80 px-4 py-2 text-[13px] font-bold uppercase tracking-widest text-[#F3C87A] backdrop-blur">
              <span className="h-2 w-2 rounded-full bg-[#F3C87A] animate-pulse" />
              About Sparkz
            </div>
          </motion.div>

          {/* Row 2: Heading */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-4xl font-black leading-tight sm:text-5xl lg:text-6xl text-center text-white">
              Ignite the{" "}
              <span className="gold-gradient-text">
                spark within{" "}
              </span>
              you
            </h2>
          </motion.div>

          {/* Row 3: Sparkz Logo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex justify-center"
          >
            <motion.div
              className="relative w-40 h-40 sm:w-48 sm:h-48 lg:w-56 lg:h-56"
              animate={{
                scale: [1, 1.05, 1],
                opacity: [1, 0.85, 1],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <Image
                src="/sparkz.svg"
                alt="Sparkz Logo"
                fill
                className="object-contain drop-shadow-[0_0_35px_rgba(212,163,89,0.45)]"
                priority
              />
            </motion.div>
          </motion.div>

          {/* Row 4: Content */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9 }}
            className="w-full"
          >
            <div className="rounded-3xl bg-[#131318] border border-[rgba(212,163,89,0.25)] shadow-xl">
              <div className="p-6 sm:p-8 space-y-5">
                <p className="text-[#A1A1AA] leading-relaxed text-base sm:text-lg text-justify">
                  <strong className="text-white">Sparkz</strong> is the flagship
                  technical fest of{" "}
                  <strong className="text-[#F3C87A]">
                    Carmel College of Engineering and Technology (CCET)
                  </strong>
                  , conducted as an inter-college competition that brings
                  together innovative and passionate students from various
                  institutions.
                </p>
                <p className="text-[#A1A1AA] leading-relaxed text-base sm:text-lg text-justify">
                  It serves as a platform for creative thinking, engineering
                  excellence, and collaborative learning beyond traditional
                  academics. The fest blends technical and non-technical
                  engagements to create an energetic and inclusive environment
                  that promotes critical thinking, teamwork, and healthy
                  competition.
                </p>
                <p className="text-[#A1A1AA] leading-relaxed text-base sm:text-lg text-justify">
                  Sparkz emphasizes experiential learning, enabling participants
                  to apply knowledge in real-world contexts while developing
                  leadership and problem-solving skills. Through Sparkz, CCET
                  reinforces its commitment to{" "}
                  <strong className="text-white">academic excellence</strong>,{" "}
                  <strong className="text-white">
                    innovation-driven education
                  </strong>
                  , and{" "}
                  <strong className="text-white">
                    holistic student development
                  </strong>
                  .
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* CCET Section - Centered Vertical Layout */}
        <div className="flex flex-col items-center mt-24 pt-24 border-t border-[rgba(212,163,89,0.25)] space-y-10">
          {/* Row 1: About CCET Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(212,163,89,0.25)] bg-[#131318]/80 px-4 py-2 text-[13px] font-bold uppercase tracking-widest text-[#F3C87A] backdrop-blur">
              <span className="h-2 w-2 rounded-full bg-[#F3C87A] animate-pulse" />
              About CCET
            </div>
          </motion.div>

          {/* Row 2: Heading */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-4xl font-black leading-tight sm:text-5xl lg:text-6xl text-center text-white">
              Building{" "}
              <span className="gold-gradient-text">
                tomorrow&apos;s engineers
              </span>
            </h2>
          </motion.div>

          {/* Row 3: CCET Logo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex justify-center"
          >
            <motion.div
              className="relative w-40 h-40 sm:w-48 sm:h-48 lg:w-56 lg:h-56"
              animate={{
                scale: [1, 1.05, 1],
                opacity: [1, 0.85, 1],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <Image
                src="/carmel.png"
                alt="CCET Logo"
                fill
                className="object-contain drop-shadow-[0_0_35px_rgba(212,163,89,0.35)]"
                priority
              />
            </motion.div>
          </motion.div>

          {/* Row 4: Content Card */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9 }}
            className="w-full"
          >
            <div className="rounded-3xl bg-[#131318] border border-[rgba(212,163,89,0.25)] shadow-xl">
              <div className="p-6 sm:p-8 space-y-5">
                <p className="text-[#A1A1AA] leading-relaxed text-base sm:text-lg text-justify">
                  <strong className="text-white">
                    Carmel College of Engineering and Technology (CCET)
                  </strong>{" "}
                  is an institution dedicated to shaping capable and responsible
                  engineers through quality education and meaningful learning
                  experiences. Rooted in academic excellence and ethical values,
                  the College works with the aim of creating an environment in
                  which students would be encouraged to learn, grow, and
                  innovate.
                </p>
                <p className="text-[#A1A1AA] leading-relaxed text-base sm:text-lg text-justify">
                  CCET gives a proper academic structure with experienced
                  faculties, modern facilities, and well-equipped labs. The
                  emphasis is laid upon both theoretical knowledge and practical
                  applications. This helps in developing strong technical skills
                  and confident problem-solving behavior among students.
                  Curiosity, critical thinking, and continuous improvement are
                  an integral part of the academic process.
                </p>
                <p className="text-[#A1A1AA] leading-relaxed text-base sm:text-lg text-justify">
                  Besides academics, CCET promotes overall growth through
                  co-curricular activities, technical forums, and events
                  organized within the campus for developing leadership,
                  teamwork, and professional responsibilities. The strong
                  collaboration with industry and community organizations
                  further reinforces in students the knowledge about real-world
                  applications and expectations.
                </p>
                <p className="text-[#A1A1AA] leading-relaxed text-base sm:text-lg text-justify">
                  With its focus on educative drives into innovation and growth
                  for students, Carmel College of Engineering and Technology
                  trains individuals to contribute to society and the
                  ever-changing technological world.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
