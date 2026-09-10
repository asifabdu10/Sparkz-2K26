"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";

const partners = [
  {
    name: "GrabUrPass",
    category: "Ticketing Partner",
    logo: "/graburpass_brand.png",
    website: "https://www.graburpass.com",
    // description:
    //   "Your trusted platform for seamless event ticketing and registration.",
  },
];

export default function Partners() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  return (
    <section
      id="partners"
      className="relative isolate overflow-hidden bg-[#0B0B0E] py-16 sm:py-24 text-white"
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

      {/* Content */}
      <div className="relative z-10">
        <div className="px-[5vw]">
          {/* Section Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12 sm:mb-16"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(212,163,89,0.25)] bg-[#131318]/80 px-4 py-2 text-[13px] font-bold uppercase tracking-widest text-[#F3C87A] backdrop-blur mb-6">
              <span className="h-2 w-2 rounded-full bg-[#F3C87A] animate-pulse" />
              Our Partners
            </div>

            <h2 className="text-4xl font-black leading-tight sm:text-5xl lg:text-6xl text-white">
              Powered by{" "}
              <span className="gold-gradient-text">
                Excellence
              </span>
            </h2>

            <p className="mt-4 text-lg text-[#A1A1AA] leading-relaxed max-w-2xl mx-auto">
              We collaborate with industry leaders to bring you the best
              experience.
            </p>
          </motion.div>

          {/* Partners Grid */}
          <div className="flex flex-col items-center gap-6 max-w-3xl mx-auto">
            {partners.map((partner, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="w-full text-center"
              >
                {/* Category Title */}
                <p className="text-sm font-semibold text-[#F3C87A]/70 uppercase tracking-widest mb-6">
                  {partner.category}
                </p>

                {/* Logo Link */}
                <Link
                  href={partner.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block group"
                >
                  <div className="relative w-full max-w-md mx-auto h-24 sm:h-32 flex items-center justify-center p-4 rounded-2xl border border-[rgba(212,163,89,0.25)] bg-[#131318] transition-all duration-300 group-hover:scale-105 group-hover:border-[#F3C87A] shadow-xl">
                    <img
                      src={partner.logo}
                      alt={partner.name}
                      className="max-w-full max-h-full object-contain opacity-90 group-hover:opacity-100 transition-opacity duration-300"
                    />
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
