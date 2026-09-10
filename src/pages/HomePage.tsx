"use client";
import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import About from "@/widgets/home/About";
import Hero from "@/widgets/home/Hero";
import Featured from "@/widgets/home/Featured";

import BandCompetition from "@/widgets/home/BandCompetition";
import ITBPExhibition from "@/widgets/home/ITBPExhibition";
import ISROExhibition from "@/widgets/home/ISROExhibition";
import Preloader from "@/widgets/home/Preloader";

export default function HomePage() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div>
      <AnimatePresence mode="wait">
        {isLoading && <Preloader key="preloader" />}
      </AnimatePresence>
      <Hero />
      <Featured />
      <About />
      <ISROExhibition />
      <ITBPExhibition />
      <BandCompetition />
    </div>
  );
}
