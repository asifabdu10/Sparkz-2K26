"use client";

import React, { useState } from "react";
import Link from "next/link";
import { FiTool, FiRefreshCw, FiLock, FiClock, FiShield } from "react-icons/fi";
import { motion } from "framer-motion";

interface MaintenanceScreenProps {
  message?: string;
  onRefresh?: () => void;
}

export default function MaintenanceScreen({
  message,
  onRefresh,
}: MaintenanceScreenProps) {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    if (onRefresh) {
      await onRefresh();
    } else {
      window.location.reload();
    }
    setTimeout(() => setRefreshing(false), 800);
  };

  return (
    <div className="min-h-screen bg-[#0B0B0E] text-white flex items-center justify-center px-4 py-16 relative overflow-hidden font-sans select-none">
      {/* Background ambient lighting */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/4 top-1/6 h-96 w-96 rounded-full bg-[#3A270D]/50 blur-[150px]" />
        <div className="absolute right-1/4 bottom-1/6 h-96 w-96 rounded-full bg-[#3A270D]/40 blur-[150px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(58,39,13,0.35),transparent_70%)]" />
      </div>

      <div className="relative z-10 max-w-2xl w-full text-center">
        {/* Animated Badge & Gear Emblem */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center mb-8"
        >
          {/* Status pill */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#1C160E] border border-[#D4A359]/30 text-[#F3C87A] text-xs font-semibold uppercase tracking-widest shadow-lg shadow-[#D4A359]/5 mb-6">
            <span className="w-2 h-2 rounded-full bg-[#F3C87A] animate-ping" />
            <span className="w-2 h-2 rounded-full bg-[#F3C87A] -ml-4" />
            System Maintenance Mode
          </div>

          {/* Icon container with glowing pulse ring */}
          <div className="relative group">
            <div className="absolute -inset-2 bg-gradient-to-r from-[#D4A359] to-[#F3C87A] rounded-3xl blur-xl opacity-30 group-hover:opacity-60 transition duration-1000 animate-pulse" />
            <div className="relative w-24 h-24 rounded-3xl bg-[#131318] border border-[rgba(212,163,89,0.35)] flex items-center justify-center text-[#F3C87A] shadow-2xl">
              <motion.div
                animate={{ rotate: [0, 15, -15, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              >
                <FiTool className="w-12 h-12" />
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Content Box */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="rounded-3xl border border-[rgba(212,163,89,0.25)] bg-[#131318]/90 backdrop-blur-xl p-8 md:p-12 shadow-2xl"
        >
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-500 bg-clip-text text-transparent font-sans">
            Sparkz 2K26 is Under Maintenance
          </h1>

          <div className="mt-6 space-y-4 text-[#A1A1AA] text-base md:text-lg leading-relaxed">
            <p>
              {message && message.trim() ? (
                <span className="text-[#FDE6B0] font-medium block p-4 rounded-2xl bg-[#0B0B0E] border border-[rgba(212,163,89,0.2)]">
                  {message}
                </span>
              ) : (
                "We are currently performing scheduled maintenance and server upgrades to ensure the smoothest fest experience."
              )}
            </p>
            <p className="text-sm text-[#71717A] flex items-center justify-center gap-2">
              <FiClock className="w-4 h-4 text-[#F3C87A]" /> Normal registration and festival services will resume shortly.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="w-full sm:w-auto px-6 py-3.5 rounded-full bg-gradient-to-r from-[#D4A359] to-[#F3C87A] text-[#0B0B0E] font-bold text-sm tracking-wide hover:brightness-110 transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#D4A359]/20 cursor-pointer disabled:opacity-60"
            >
              <FiRefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
              {refreshing ? "Checking Status…" : "Check If Back Online"}
            </button>
          </div>
        </motion.div>

        {/* Footer info & Admin Login option */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#71717A] px-4"
        >
          <div className="flex items-center gap-2">
            <FiShield className="text-[#F3C87A]" />
            <span>Carmel College of Engineering and Technology</span>
          </div>

          <Link
            href="/login"
            className="text-[#A1A1AA] hover:text-[#F3C87A] flex items-center gap-1.5 transition-colors underline underline-offset-4"
          >
            <FiLock className="w-3.5 h-3.5" />
            <span>Admin & Staff Access</span>
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
