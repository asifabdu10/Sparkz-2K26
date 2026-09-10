"use client";

import { motion } from "framer-motion";
import Image from "next/image";

export default function Preloader() {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B0B0E]"
    >
      <div className="relative flex flex-col items-center justify-center w-full max-w-lg">
        {/* Background Glow */}
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 0.5, scale: 1.2 }}
          transition={{
            duration: 1.5,
            ease: "easeOut",
          }}
          className="absolute h-64 w-64 rounded-full bg-[#3A270D]/60 blur-[100px]"
        />

        {/* Logo Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ 
            opacity: 1, 
            scale: [1, 1.05, 1], // Pulse effect
          }}
          transition={{ 
            opacity: { duration: 0.8, ease: "easeOut" },
            scale: { 
              duration: 1.5, 
              ease: "easeInOut",
              times: [0, 0.5, 1],
              repeat: Infinity,
              repeatDelay: 0.2
            }
          }}
          className="relative z-10"
        >
          <Image
            src="/sparkz.svg"
            alt="Sparkz Loader"
            width={280}
            height={100}
            className="object-contain"
            priority
          />
        </motion.div>
      </div>
    </motion.div>
  );
}
