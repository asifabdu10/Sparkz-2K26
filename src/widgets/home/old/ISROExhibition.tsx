"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";

import { Rocket, Satellite, Globe, Radio, User } from "lucide-react";

const exhibitionHighlights = [
  {
    title: "Launch Vehicles",
    description: "Models of ISRO launch vehicles and satellites.",
    icon: <Rocket className="w-8 h-8 text-orange-500" />,
  },
  {
    title: "Major Missions",
    description:
      "Displays on Chandrayaan, Mangalyaan, Gaganyaan, and Aditya-L1.",
    icon: <Satellite className="w-8 h-8 text-blue-500" />,
  },
  {
    title: "Space Applications",
    description:
      "Tech for communication, navigation, weather, and disaster management.",
    icon: <Globe className="w-8 h-8 text-cyan-500" />,
  },
  {
    title: "Interactive Panels",
    description: "Interactive and informative display panels.",
    icon: <Radio className="w-8 h-8 text-emerald-500" />,
  },
  {
    title: "Career & Research",
    description:
      "Insights into career opportunities and research avenues at ISRO.",
    icon: <User className="w-8 h-8 text-purple-500" />,
  },
];

export default function ISROExhibition() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (

    <section
      id="isro-exhibition"
      className="relative isolate overflow-hidden bg-[#04050b] py-16 sm:py-24 text-white"
    >
      {/* Background Effects */}
      {mounted && (
        <>
          {/* Gradient Glows */}
          <div className="pointer-events-none absolute left-[-10%] top-[20%] h-96 w-96 rounded-full bg-orange-600/20 blur-[140px]" />
          <div className="hidden sm:block pointer-events-none absolute right-[-5%] top-[30%] h-96 w-96 rounded-full bg-blue-500/20 blur-[150px]" />

          {/* Subtle Grid Pattern */}
          <div className="hidden sm:block pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-size-[100px_100px] opacity-30" />

          {/* Radial Gradients */}
          <div className="hidden sm:block pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_40%_40%,rgba(234,88,12,0.1),transparent_50%),radial-gradient(circle_at_60%_60%,rgba(59,130,246,0.08),transparent_45%)]" />
        </>
      )}

      <div className="mx-auto max-w-348 px-6">
        {/* Top Section: Split Layout (Intro + Image) */}
        <div className="mx-auto grid max-w-2xl grid-cols-1 gap-x-12 gap-y-16 lg:max-w-none lg:grid-cols-2 lg:items-center mb-20">
          {/* Left Content Column */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="lg:pr-8 relative"
          >
            <div className="mb-8 flex items-center gap-6">
              {/* Placeholder for ISRO Logo if available, or just keeping structure */}
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-white/5 p-2 ring-1 ring-white/10 backdrop-blur-sm shadow-2xl">
                <Image
                  src="/ISRO_logo.png"
                  alt="ISRO Logo"
                  width={80}
                  height={80}
                  className="object-contain h-full w-full"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold tracking-widest text-orange-400 uppercase mb-2">
                  Organised By
                </span>
                <span className="text-xl font-bold tracking-tight text-white uppercase leading-none">
                  Indian Space Research <br /> Organisation (ISRO)
                </span>
              </div>
            </div>

            <h2 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
              ISRO Field Exhibition
            </h2>
            <p className="mt-6 text-lg leading-8 text-slate-300">
              A Special Attraction of Techfest “Sparkz”. Explore India’s space
              missions, technological achievements, and the role of space
              technology in national development.
            </p>

            <div className="mt-8 space-y-6">
              <div className="border-l-2 border-orange-500 pl-6">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2">
                  In Association With
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Carmel College of Engineering
                </p>
              </div>
              <div className="border-l-2 border-blue-500 pl-6">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2">
                  Who Can Attend
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Engineering & Science Students • Faculty & Researchers •
                  School Students • Space Science Enthusiasts
                </p>
              </div>
            </div>
          </motion.div>

          {/* Right Image/Visual Column */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="relative"
          >
            <div className="relative overflow-hidden rounded-3xl bg-slate-900 shadow-2xl ring-1 ring-white/10 max-w-md ml-auto">
              {/* Main Image */}
              <div className="aspect-4/5 sm:aspect-3/4 lg:aspect-4/5 w-full relative bg-slate-800">
                <Image
                  src="/isro_img.jpeg"
                  alt="ISRO Exhibition"
                  fill
                  className="object-cover"
                />
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-linear-to-t from-slate-950/90 via-slate-950/20 to-transparent" />
              </div>

              {/* Overlay Content */}
              <div className="absolute bottom-0 left-0 right-0 p-8">
                <div className="flex items-center justify-between border-t border-white/10 pt-6">
                  <div>
                    <p className="text-sm font-medium text-slate-400">
                      Location
                    </p>
                    <p className="text-base font-semibold text-white">
                      Main Exhibition Ground
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-slate-400">Entry</p>
                    <p className="text-base font-semibold text-white whitespace-nowrap">
                      Free & Open to All
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Decorative Elements */}
            <div className="absolute -top-4 -right-4 -z-10 h-72 w-72 rounded-full bg-orange-500/10 blur-3xl" />
            <div className="absolute -bottom-4 -left-4 -z-10 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />
          </motion.div>
        </div>

        {/* Bottom Section: Full Width Grid */}
        <div className="mx-auto max-w-8xl">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {exhibitionHighlights.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="relative overflow-hidden rounded-2xl border border-white/5 bg-white/5 p-8 hover:bg-white/10 transition-colors group cursor-default"
              >
                <div className="absolute top-0 right-0 p-4 opacity-10 font-bold text-6xl text-orange-500/20 select-none group-hover:scale-110 transition-transform">
                  {index + 1}
                </div>
                <div className="mb-4">{item.icon}</div>
                <dt className="text-lg font-bold leading-7 text-white mb-2">
                  {item.title}
                </dt>
                <dd className="text-base leading-relaxed text-slate-400">
                  {item.description}
                </dd>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
