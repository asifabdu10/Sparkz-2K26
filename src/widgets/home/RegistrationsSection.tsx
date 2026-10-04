"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/utils/firebase";

export default function RegistrationsSection() {
  const [visitorFee, setVisitorFee] = useState<number>(250);
  const [registrationOpen, setRegistrationOpen] = useState<boolean>(true);
  const [totalCapacity, setTotalCapacity] = useState<number>(300);
  const [remainingTickets, setRemainingTickets] = useState<number>(300);
  const [isSoldOut, setIsSoldOut] = useState<boolean>(false);

  useEffect(() => {
    fetch("/api/visitor-registration/status")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          if (typeof data.fee === "number") setVisitorFee(data.fee);
          if (typeof data.registrationOpen === "boolean") setRegistrationOpen(data.registrationOpen);
          if (typeof data.totalCapacity === "number") setTotalCapacity(data.totalCapacity);
          if (typeof data.remainingTickets === "number") setRemainingTickets(data.remainingTickets);
          if (typeof data.isSoldOut === "boolean") setIsSoldOut(data.isSoldOut);
        }
      })
      .catch((e) => console.warn("Failed to fetch visitor registration status:", e));
  }, []);
  return (
    <section
      id="registrations"
      className="relative isolate overflow-hidden bg-[#0B0B0E] py-16 sm:py-24 text-white"
    >
      {/* Background Effects */}
      <div className="pointer-events-none absolute left-[-10%] top-[20%] h-96 w-96 rounded-full bg-[#1a1a4e]/40 blur-[140px]" />
      <div className="pointer-events-none absolute right-[-5%] top-[30%] h-96 w-96 rounded-full bg-[#3A270D]/30 blur-[150px]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(212,163,89,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(212,163,89,0.03)_1px,transparent_1px)] bg-[size:100px_100px] opacity-20" />

      <div className="relative z-10 mx-auto max-w-5xl px-[5vw]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(212,163,89,0.25)] bg-[#131318]/80 px-4 py-2 text-[13px] font-bold uppercase tracking-widest text-[#F3C87A] backdrop-blur mb-6">
            <span className="h-2 w-2 rounded-full bg-[#F3C87A] animate-pulse" />
            Open Registrations
          </div>
          <h2 className="text-4xl font-black leading-tight sm:text-5xl text-white">
            Join{" "}
            <span className="gold-gradient-text">SPARKZ 2K26</span>
          </h2>
          <p className="mt-4 text-lg text-[#A1A1AA] max-w-xl mx-auto leading-relaxed">
            Visiting from another college or coming back as an alum? There is a place for you at Sparkz 2K26.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {/* Visitor Registration Card */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="group relative rounded-2xl border border-[rgba(212,163,89,0.2)] bg-[#131318] p-6 sm:p-8 hover:border-[#F3C87A] transition-all duration-300 overflow-hidden flex flex-col"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/5 via-transparent to-[rgba(212,163,89,0.05)] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative z-10 flex flex-col justify-between h-full">
              <div>
                <div className="flex items-center justify-between gap-3 mb-5">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/30 to-indigo-800/30 border border-indigo-500/30 text-2xl">
                      🎟️
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-white">Visitor Ticket</h3>
                      <p className="text-xs text-gray-400 uppercase tracking-wider">Abheri &amp; Proshow Access</p>
                    </div>
                  </div>
                  <div className="text-right bg-[#1a1a24] border border-[#F3C87A]/30 rounded-xl px-3 py-1.5 shadow-sm">
                    <span className="text-[10px] text-gray-400 uppercase tracking-widest block font-semibold">Ticket Fee</span>
                    <span className="text-xl font-black text-[#F3C87A]">₹{visitorFee}</span>
                  </div>
                </div>

                {/* Ticket Count Pill */}
                <div className="mb-4 flex items-center justify-between">
                  {registrationOpen && !isSoldOut ? (
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-xs font-semibold text-emerald-400">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span>Ticket Count: {remainingTickets} / {totalCapacity}</span>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-xs font-semibold text-red-400">
                      <span>{isSoldOut ? "● Tickets Sold Out" : "○ Registration Closed"}</span>
                    </div>
                  )}

                  {registrationOpen && !isSoldOut && remainingTickets <= 50 && (
                    <span className="text-[11px] font-bold text-amber-400 animate-pulse">
                      Filling fast!
                    </span>
                  )}
                </div>

                <p className="text-[#A1A1AA] text-sm leading-relaxed mb-4">
                  Visiting from another college? Grab your ticket for Abheri &amp; Proshow with a referral from a student or faculty member of Carmel College.
                </p>
                <ul className="space-y-2 mb-7 text-sm text-gray-400">
                  {[
                    `Ticket fee: ₹${visitorFee} (Valid for 08 & 09 Oct)`,
                    "Must be referred by a Carmel College student or faculty",
                    "Please register for any of the departmental event to get entry for Abheri and Proshow",
                    "Visitor's College ID card required",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <span className="text-[#F3C87A] text-xs">✦</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              {registrationOpen && !isSoldOut ? (
                <Link
                  href="/visitor-registration"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#F3C87A] px-6 py-3 text-sm font-bold uppercase tracking-widest text-[#0B0B0E] hover:bg-[#e6b960] transition-all duration-300 transform hover:-translate-y-0.5 shadow-lg shadow-[rgba(243,200,122,0.2)]"
                >
                  Grab Your Ticket (₹{visitorFee}) ✦
                </Link>
              ) : (
                <div
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gray-800/80 border border-gray-700/80 px-6 py-3 text-sm font-bold uppercase tracking-widest text-gray-400 cursor-not-allowed text-center"
                >
                  {isSoldOut ? "Tickets Sold Out (300/300)" : "Registration Closed"}
                </div>
              )}
            </div>
          </motion.div>

          {/* Alumni Registration Card */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="group relative rounded-2xl border border-[rgba(212,163,89,0.2)] bg-[#131318] p-6 sm:p-8 hover:border-[#F3C87A] transition-all duration-300 overflow-hidden flex flex-col"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-[rgba(212,163,89,0.08)] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative z-10 flex flex-col justify-between h-full">
              <div>
                <div className="flex items-center gap-4 mb-5">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500/30 to-amber-800/30 border border-amber-500/30 text-2xl">
                    🎓
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white">Alumni Registration</h3>
                    <p className="text-xs text-gray-400 uppercase tracking-wider">For Passed-Out Students</p>
                  </div>
                </div>
                <p className="text-[#A1A1AA] text-sm leading-relaxed mb-6">
                  A proud alum of Carmel College? Come back and relive the memories. Register as an alumnus and be part of Sparkz 2K26.
                </p>
              </div>

              <Link
                href="/alumni-registration"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#F3C87A] px-6 py-3 text-sm font-bold uppercase tracking-widest text-[#0B0B0E] hover:bg-[#e6b960] transition-all duration-300 transform hover:-translate-y-0.5 shadow-lg shadow-[rgba(243,200,122,0.2)]"
              >
                Register as Alumni ✦
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
