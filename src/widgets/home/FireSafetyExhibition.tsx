"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";

import {
  Flame,
  ShieldAlert,
  LifeBuoy,
  Siren,
  ShieldCheck,
} from "lucide-react";

const exhibitionHighlights = [
  {
    title: "Live Fire Demonstrations",
    description:
      "Witness practical demonstrations of firefighting techniques and emergency response procedures.",
    icon: <Flame className="w-8 h-8 text-orange-500" />,
  },
  {
    title: "Rescue Operations",
    description:
      "Explore professional rescue methods used during emergency and disaster situations.",
    icon: <LifeBuoy className="w-8 h-8 text-blue-500" />,
  },
  {
    title: "Firefighting Equipment",
    description:
      "Get introduced to modern firefighting tools, protective equipment, and safety systems.",
    icon: <ShieldAlert className="w-8 h-8 text-red-500" />,
  },
  {
    title: "Emergency Preparedness",
    description:
      "Learn essential practices for preparing for and responding to emergency situations.",
    icon: <Siren className="w-8 h-8 text-emerald-500" />,
  },
  {
    title: "Disaster Management",
    description:
      "Understand coordinated response strategies used to manage fires and other emergencies.",
    icon: <ShieldCheck className="w-8 h-8 text-purple-500" />,
  },
];

export default function FireSafetyExhibition() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <section
      id="fire-safety-expo"
      className="relative isolate overflow-hidden bg-[#04050b] py-16 sm:py-24 text-white"
    >
      {mounted && (
        <>
          <div className="pointer-events-none absolute left-[-10%] top-[20%] h-96 w-96 rounded-full bg-red-600/20 blur-[140px]" />

          <div className="hidden sm:block pointer-events-none absolute right-[-5%] top-[30%] h-96 w-96 rounded-full bg-orange-500/20 blur-[150px]" />

          <div className="hidden sm:block pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-size-[100px_100px] opacity-30" />

          <div className="hidden sm:block pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_40%_40%,rgba(220,38,38,0.1),transparent_50%),radial-gradient(circle_at_60%_60%,rgba(249,115,22,0.08),transparent_45%)]" />
        </>
      )}

      <div className="mx-auto max-w-348 px-6">
        <div className="mx-auto grid max-w-2xl grid-cols-1 gap-x-12 gap-y-16 lg:max-w-none lg:grid-cols-2 lg:items-center mb-20">

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
                  src="/fire_safety_logo.png"
                  alt="Fire and Safety Logo"
                  width={80}
                  height={80}
                  className="object-contain h-full w-full"
                />
              </div>

              <div className="flex flex-col">
                <span className="text-xs font-bold tracking-widest text-red-400 uppercase mb-2">
                  Safety Exhibition
                </span>

                <span className="text-xl font-bold tracking-tight text-white uppercase leading-none">
                  Fire & Safety <br />
                  Emergency Response
                </span>
              </div>
            </div>

            <h2 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Fire & Safety Expo
            </h2>

            <p className="mt-6 text-lg leading-8 text-slate-300">
              A vital live demonstration featuring rescue techniques, modern
              firefighting equipment, and workplace safety systems. Learn about
              emergency preparedness, fire prevention, and advanced disaster
              management operations.
            </p>

            <div className="mt-8 space-y-6">
              <div className="border-l-2 border-red-500 pl-6">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2">
                  Featured Experience
                </h3>

                <p className="text-slate-400 text-sm leading-relaxed">
                  Live Demonstrations • Rescue Techniques • Safety Equipment
                </p>
              </div>

              <div className="border-l-2 border-orange-500 pl-6">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2">
                  Who Can Attend
                </h3>

                <p className="text-slate-400 text-sm leading-relaxed">
                  Students • Faculty • Safety Professionals • Industry
                  Representatives • General Public
                </p>
              </div>
            </div>
          </motion.div>

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
                  src="/fire_safety_expo.jpeg"
                  alt="Fire and Safety Expo"
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

            <div className="absolute -top-4 -right-4 -z-10 h-72 w-72 rounded-full bg-red-500/10 blur-3xl" />

            <div className="absolute -bottom-4 -left-4 -z-10 h-72 w-72 rounded-full bg-orange-500/10 blur-3xl" />
          </motion.div>
        </div>

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
                <div className="absolute top-0 right-0 p-4 opacity-10 font-bold text-6xl text-red-500/20 select-none group-hover:scale-110 transition-transform">
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