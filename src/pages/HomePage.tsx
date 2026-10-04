"use client";
import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import About from "@/widgets/home/About";
import EventGuidelines from "@/widgets/home/EventGuidelines";
import Hero from "@/widgets/home/Hero";
import Featured from "@/widgets/home/Featured";

import BandCompetition from "@/widgets/home/BandCompetition";
import ExhibitionsSection from "@/widgets/home/ExhibitionsSection";
import Preloader from "@/widgets/home/Preloader";
import RegistrationsSection from "@/widgets/home/RegistrationsSection";

export default function HomePage() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // If arriving with a hash anchor (e.g. #rules or #guidelines), bypass preloader to show section immediately
    const hasHash = typeof window !== "undefined" && Boolean(window.location.hash);
    if (hasHash) {
      setIsLoading(false);
    } else {
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    const scrollToHash = () => {
      if (typeof window === "undefined") return;
      const hash = window.location.hash;
      if (!hash) return;
      const targetId = hash.replace("#", "");
      const element = document.getElementById(targetId);
      if (element) {
        const headerOffset = 90;
        const elementPosition = element.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
        window.scrollTo({
          top: offsetPosition,
          behavior: "smooth",
        });
      }
    };

    // Staggered attempts to account for DOM rendering
    const t1 = setTimeout(scrollToHash, 100);
    const t2 = setTimeout(scrollToHash, 500);
    const t3 = setTimeout(scrollToHash, 1000);

    window.addEventListener("hashchange", scrollToHash);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      window.removeEventListener("hashchange", scrollToHash);
    };
  }, [isLoading]);

  return (
    <div>
      <AnimatePresence mode="wait">
        {isLoading && <Preloader key="preloader" />}
      </AnimatePresence>
      <Hero />
      <Featured />
      <About />
      <EventGuidelines />
      <ExhibitionsSection />
      <RegistrationsSection />
      <BandCompetition />
    </div>
  );
}
