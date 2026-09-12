"use client";

import { motion } from "framer-motion";
import { Span } from "next/dist/trace";
import Image from "next/image";
import Link from "next/link";
import { FaInstagram, FaLinkedin } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";

export default function Footer() {
  return (
    <footer className="relative overflow-hidden bg-[#0B0B0E] border-t border-[rgba(212,163,89,0.25)]">
      {/* Decorative ambient glows */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute left-6 top-12 h-64 w-64 rounded-full bg-[#3A270D]/40 blur-[120px]" />
        <div className="absolute right-6 bottom-12 h-64 w-64 rounded-full bg-[#3A270D]/30 blur-[120px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(58,39,13,0.35),transparent_50%)]" />
      </div>

      {/* Subtle grid overlay for the circuit feel */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-20"
      >
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(212,163,89,0.04)_1px,transparent_1px),linear-gradient(rgba(212,163,89,0.03)_1px,transparent_1px)] bg-[size:120px_120px]" />
      </div>

      <div className="relative px-[5vw] py-12 md:py-16">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-4 lg:gap-16">
          {/* Logo & quick details */}
          <div className="space-y-4">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="flex items-center gap-3"
            >
              <div className="relative h-12 w-12 flex-shrink-0">
                <Image
                  src="/sparkz.svg"
                  alt="Sparkz logo"
                  fill
                  className="object-contain drop-shadow-[0_0_15px_rgba(212,163,89,0.4)]"
                  priority
                />
              </div>

              <div>
                <h4 className="text-lg font-extrabold gold-gradient-text">
                  Sparkz 2K26
                </h4>
                <p className="mt-1 text-xs text-[#A1A1AA]">
                  October 08–09 • Campus Arena
                </p>
              </div>
            </motion.div>

            <p className="max-w-sm text-sm text-[#A1A1AA]">
              A vibrant tech fest for students — challenges, workshops, and
              prizes for tomorrow&apos;s makers.
            </p>
          </div>

          {/* Quick links */}
          <nav aria-label="Quick links">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white">
              Quick Links
            </h3>

            <ul className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-1 md:grid-cols-1">
              {[
                ["Home", "/"],
                ["Events", "/events"],
                ["ABHERI", "/abheri"],
                ["Contact", "/contact"],
              ].map(([label, href]) => (
                <li key={label}>
                  <Link
                    href={href as string}
                    className="text-[#A1A1AA] hover:text-[#F3C87A] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F3C87A]/40 rounded-sm px-1 py-0.5"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Socials */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white">
              Join the Circuit
            </h3>

            <div className="flex items-center gap-4">
              {/* Instagram */}
              <Link
                href="#"
                className="group inline-flex items-center justify-center h-10 w-10 rounded-full border border-[rgba(212,163,89,0.25)] bg-[#131318] text-[#F3C87A] transition-all hover:border-[#F3C87A] hover:scale-110"
                aria-label="Instagram"
              >
                <FaInstagram
                  className="h-5 w-5 transition-colors"
                  aria-hidden
                />
                <span className="sr-only">Instagram</span>
              </Link>

              {/* LinkedIn */}
              <Link
                href="#"
                className="group inline-flex items-center justify-center h-10 w-10 rounded-full border border-[rgba(212,163,89,0.25)] bg-[#131318] text-[#F3C87A] transition-all hover:border-[#F3C87A] hover:scale-110"
                aria-label="LinkedIn"
              >
                <FaLinkedin className="h-5 w-5 transition-colors" aria-hidden />
                <span className="sr-only">LinkedIn</span>
              </Link>

              {/* X / Twitter */}
              <Link
                href="#"
                className="group inline-flex items-center justify-center h-10 w-10 rounded-full border border-[rgba(212,163,89,0.25)] bg-[#131318] text-[#F3C87A] transition-all hover:border-[#F3C87A] hover:scale-110"
                aria-label="Twitter"
              >
                <FaXTwitter className="h-5 w-5 transition-colors" aria-hidden />
                <span className="sr-only">X</span>
              </Link>
            </div>

            <p className="mt-4 text-sm text-[#A1A1AA] max-w-xs">
              Follow us for event updates, behind-the-scenes, and shoutouts.
            </p>
          </div>

          {/* Call to action */}
          <div className="md:flex md:flex-col md:items-end">
            <div>
              <p className="mb-4 text-sm text-[#A1A1AA]">
                Ready to do something that sparks?
              </p>
              <motion.div
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                <Link
                  href="/events"
                  className="btn-gold inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-bold text-[#0B0B0E]"
                >
                  Join Now →
                </Link>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Bottom tiny legal bar */}
        <div className="mt-10 border-t border-[rgba(212,163,89,0.2)] pt-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xs text-[#A1A1AA]">
              Terms • Privacy • Code of Conduct
            </p>
            <div className="text-xs text-[#A1A1AA] text-center md:text-right">
              <p>© 2026 Sparkz.</p>
              <p className="mt-1">
                Crafted with ♥ by the <span className="text-[#F3C87A] font-semibold">Tech Team</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
