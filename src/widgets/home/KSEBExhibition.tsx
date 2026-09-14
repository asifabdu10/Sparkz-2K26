"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";

import {
  Zap,
  Sun,
  Network,
  ShieldCheck,
  Gauge,
} from "lucide-react";

const exhibitionHighlights = [
  {
    title: "Modern Power Distribution",
    description:
      "Explore modern systems used for efficient electricity transmission and distribution.",
    icon: <Zap className="w-8 h-8 text-yellow-500" />,
  },
  {
    title: "Renewable Energy",
    description:
      "Discover sustainable energy solutions and technologies shaping the future of power.",
    icon: <Sun className="w-8 h-8 text-orange-500" />,
  },
  {
    title: "Smart Grid Technology",
    description:
      "Learn about intelligent monitoring, automation, and modern electrical grid management.",
    icon: <Network className="w-8 h-8 text-blue-500" />,
  },
  {
    title: "Electrical Safety",
    description:
      "Understand essential electrical safety practices through informative demonstrations.",
    icon: <ShieldCheck className="w-8 h-8 text-emerald-500" />,
  },
  {
    title: "Energy Efficiency",
    description:
      "Explore practical methods for reducing energy consumption and improving power management.",
    icon: <Gauge className="w-8 h-8 text-purple-500" />,
  },
];

export default function KSEBExhibition() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <section
      id="kseb-expo"
      className="relative isolate overflow-hidden bg-[#04050b] py-16 sm:py-24 text-white"
    >
      {/* Background Effects */}
      {mounted && (
        <>
          <div className="pointer-events-none absolute left-[-10%] top-[20%] h-96 w-96 rounded-full bg-yellow-600/20 blur-[140px]" />

          <div className="hidden sm:block pointer-events-none absolute right-[-5%] top-[30%] h-96 w-96 rounded-full bg-blue-500/20 blur-[150px]" />

          <div className="hidden sm:block pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-size-[100px_100px] opacity-30" />

          <div className="hidden sm:block pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_40%_40%,rgba(234,179,8,0.1),transparent_50%),radial-gradient(circle_at_60%_60%,rgba(59,130,246,0.08),transparent_45%)]" />
        </>
      )}

      <div className="mx-auto max-w-348 px-6">
        {/* Top Section */}
        <div className="mx-auto grid max-w-2xl grid-cols-1 gap-x-12 gap-y-16 lg:max-w-none lg:grid-cols-2 lg:items-center mb-20">

          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="lg:pr-8 relative"
          >
            <div className="mb-8 flex items-center gap-6">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-white/5 p-2 ring-1 ring-white/10 backdrop-blur-sm shadow-2xl">
                <Image
                  src="/Kseb_logo.png"
                  alt="KSEB Logo"
                  width={80}
                  height={80}
                  className="object-contain h-full w-full"
                />
              </div>

              <div className="flex flex-col">
                <span className="text-xs font-bold tracking-widest text-yellow-400 uppercase mb-2">
                  Organised By
                </span>

                <span className="text-xl font-bold tracking-tight text-white uppercase leading-none">
                  Kerala State Electricity <br />
                  Board (KSEB)
                </span>
              </div>
            </div>

            <h2 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
              KSEB Power & Energy Expo
            </h2>

            <p className="mt-6 text-lg leading-8 text-slate-300">
              An interactive showcase highlighting modern power distribution,
              renewable energy solutions, and electrical grid innovations.
              Explore energy efficiency, electrical safety, and smart power
              management through demonstrations and expert insights.
            </p>

            <div className="mt-8 space-y-6">
              <div className="border-l-2 border-yellow-500 pl-6">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2">
                  In Association With
                </h3>

                <p className="text-slate-400 text-sm leading-relaxed">
                  Kerala State Electricity Board (KSEB)
                </p>
              </div>

              <div className="border-l-2 border-blue-500 pl-6">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2">
                  Who Can Attend
                </h3>

                <p className="text-slate-400 text-sm leading-relaxed">
                  Engineering Students • Science Students • Faculty &
                  Researchers • Energy Enthusiasts • School Students
                </p>
              </div>
            </div>
          </motion.div>

          {/* Right Image */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="relative"
          >
            <div className="relative overflow-hidden rounded-3xl bg-slate-900 shadow-2xl ring-1 ring-white/10 max-w-md ml-auto">
              <div className="aspect-4/5 sm:aspect-3/4 lg:aspect-4/5 w-full relative bg-slate-800">
                <Image
                  src="/Kseb_expo.jpeg"
                  alt="KSEB Expo"
                  fill
                  className="object-cover"
                />

                <div className="absolute inset-0 bg-linear-to-t from-slate-950/90 via-slate-950/20 to-transparent" />
              </div>

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
                    <p className="text-sm font-medium text-slate-400">
                      Entry
                    </p>

                    <p className="text-base font-semibold text-white whitespace-nowrap">
                      Free & Open to All
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="absolute -top-4 -right-4 -z-10 h-72 w-72 rounded-full bg-yellow-500/10 blur-3xl" />

            <div className="absolute -bottom-4 -left-4 -z-10 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />
          </motion.div>
        </div>

        {/* Highlights */}
        <div className="mx-auto max-w-8xl">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {exhibitionHighlights.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{
                  duration: 0.5,
                  delay: index * 0.1,
                }}
                className="relative overflow-hidden rounded-2xl border border-white/5 bg-white/5 p-8 hover:bg-white/10 transition-colors group cursor-default"
              >
                <div className="absolute top-0 right-0 p-4 opacity-10 font-bold text-6xl text-yellow-500/20 select-none group-hover:scale-110 transition-transform">
                  {index + 1}
                </div>

                <div className="mb-4">
                  {item.icon}
                </div>

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