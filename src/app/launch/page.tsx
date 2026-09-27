'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';

export default function LaunchPage() {
  const router = useRouter();
  const [isUnwrapping, setIsUnwrapping] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !isUnwrapping) {
        e.preventDefault();
        setIsUnwrapping(true);
        // Delay navigation to allow animation to play
        setTimeout(() => {
          router.push('/');
        }, 1500);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isUnwrapping, router]);

  // Generate random particles
  const particles = Array.from({ length: 30 }).map((_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 4 + 2,
    duration: Math.random() * 2 + 3,
  }));

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black perspective-[1500px]">
      <AnimatePresence>
        {!isUnwrapping && (
          <motion.div
            className="absolute inset-0 z-20 flex flex-col items-center justify-center -translate-z-px" // Push back slightly to avoid clipping during rotation
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.3 } }}
          >
             {/* Background Gradient & Pattern */}
             <div className="absolute inset-0 bg-gradient-to-br from-[#1a0b2e] via-[#2d1b4e] to-[#000000] z-[-1]" />
             
             {/* Particles */}
             {particles.map((p) => (
                <motion.div
                  key={p.id}
                  className="absolute rounded-full bg-[#DFFF1A] opacity-60"
                  style={{
                    left: `${p.x}%`,
                    top: `${p.y}%`,
                    width: p.size,
                    height: p.size,
                  }}
                  animate={{
                    y: [0, -20, 0],
                    opacity: [0.2, 0.8, 0.2],
                    scale: [1, 1.2, 1],
                  }}
                  transition={{
                    duration: p.duration,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
             ))}

            {/* Logo */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="relative w-64 h-64 md:w-96 md:h-96"
            >
              <Image
                src="/sparkz.svg"
                alt="Sparkz Logo"
                fill
                unoptimized
                className="object-contain drop-shadow-[0_0_15px_rgba(223,255,26,0.5)]"
                priority
              />
            </motion.div>

          </motion.div>
        )}
      </AnimatePresence>

      {/* Unwrapping Animation Layers - 3D Gates */}
      <AnimatePresence>
        {isUnwrapping && (
          <>
            {/* Flash Effect */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 0.6, times: [0, 0.1, 1] }} 
                className="absolute inset-0 z-50 bg-white pointer-events-none"
            />

            {/* Left Gate */}
            <motion.div
              initial={{ rotateY: 0, x: 0, opacity: 1 }}
              animate={{ rotateY: -100, x: '-20%', opacity: 0 }}
              transition={{ duration: 1.5, ease: "easeInOut" }}
              style={{ transformOrigin: "left center" }}
              className="absolute left-0 top-0 w-1/2 h-full bg-[#1a0b2e] z-30 border-r border-[#DFFF1A]/20 backface-visible"
            >
               {/* Optional Texture */}
               <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,var(--tw-gradient-stops))] from-white/20 to-transparent pointer-events-none"></div>
            </motion.div>

            {/* Right Gate */}
            <motion.div
              initial={{ rotateY: 0, x: 0, opacity: 1 }}
              animate={{ rotateY: 100, x: '20%', opacity: 0 }}
              transition={{ duration: 1.5, ease: "easeInOut" }}
              style={{ transformOrigin: "right center" }}
              className="absolute right-0 top-0 w-1/2 h-full bg-[#1a0b2e] z-30 border-l border-[#DFFF1A]/20 backface-visible"
            >
              <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,var(--tw-gradient-stops))] from-white/20 to-transparent pointer-events-none"></div>
            </motion.div>
            
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
