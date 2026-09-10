"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ParticleImage from "@/widgets/common/ParticleImage";
import OrbBurst from "@/components/ui/OrbBurst";

export default function Preloader() {
  const [showOrb, setShowOrb] = useState(false);

  useEffect(() => {
    // 1. Trigger OrbBurst shortly after logo appears
    const orbTimer = setTimeout(() => {
      setShowOrb(true);
    }, 150);

    // 2. Vanish OrbBurst earlier after initial surge
    const vanishTimer = setTimeout(() => {
      setShowOrb(false);
    }, 1100);

    return () => {
      clearTimeout(orbTimer);
      clearTimeout(vanishTimer);
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B0B0E] overflow-hidden"
    >
      {/* Background Ambient Glow */}
      <div className="pointer-events-none absolute h-96 w-96 rounded-full bg-[#3A270D]/50 blur-[130px]" />

      {/* Particle Surge & Particle Logo Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative flex items-center justify-center w-full max-w-3xl sm:max-w-4xl h-[26rem] sm:h-[32rem] px-4 py-2"
      >
        {/* 3D OrbBurst Particle Surge — appears after logo, then vanishes early */}
        <AnimatePresence>
          {showOrb && (
            <motion.div
              key="orb-burst-effect"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.4 }}
              transition={{ duration: 0.45, ease: "easeOut" }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 translate-x-5 sm:translate-x-8 md:translate-x-10"
            >
              <OrbBurst
                dotColor="#F3C87A"
                accentColor="#D4A359"
                density={250}
                dotSize={150}
                speed={50}
                spinTurns={1}
                ball={{ spread: 100, turn: 0, tilt: 0 }}
                pointer={{ drag: 100, damping: 20 }}
                width={500}
                height={500}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Large Logo rendered directly as interactive Particles */}
        <div className="relative z-10 w-full h-full flex items-center justify-center translate-x-5 sm:translate-x-8 md:translate-x-10">
          <ParticleImage
            imageConfig={{
              image: "/extracted_sparkz.png",
              mode: "fit",
              scale: 11,
            }}
            particleColor="original"
            particleShape="circle"
            particleCount={200}
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
            cycleInterval={3500}
            holdDuration={1800}
            width="100%"
            height="100%"
            className="w-full h-full"
          />
        </div>
      </motion.div>
    </motion.div>
  );
}
