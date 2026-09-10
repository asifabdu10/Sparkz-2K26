"use client";

import React, { useEffect } from "react";
import { FcGoogle } from "react-icons/fc";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { toastError, toastSuccess } from "@/utils/common/Toast";
import { useRouter } from "next/navigation";

export default function Page() {
  const { user, login, loading: authLoading } = useAuth();
  const router = useRouter();

  const handleLoginClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      await login();
      toastSuccess("Successfully logged in!");
      router.back();
    } catch (error) {
      toastError("Failed to login.");
    }
  };

  useEffect(() => {
    if (user) {
      router.push("/abheri/register");
    }
  }, [user, authLoading, router]);

  if (user) {
    return (
      <div className="min-h-screen bg-[#0B0B0E] text-white flex items-center justify-center relative overflow-hidden">
        {/* Decorative ambient bronze glows */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute left-6 top-12 h-64 w-64 rounded-full bg-[#3A270D]/50 blur-[120px]" />
          <div className="absolute right-6 bottom-12 h-64 w-64 rounded-full bg-[#3A270D]/40 blur-[120px]" />
        </div>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-lg font-medium text-[#F3C87A]"
        >
          You’re already logged in ✅
        </motion.p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0B0E] text-white px-4 flex items-center justify-center relative overflow-hidden border-t border-[rgba(212,163,89,0.15)]">
      {/* Decorative ambient bronze glows */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute left-6 top-12 h-72 w-72 rounded-full bg-[#3A270D]/60 blur-[120px]" />
        <div className="absolute right-6 bottom-12 h-72 w-72 rounded-full bg-[#3A270D]/40 blur-[120px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(58,39,13,0.3),transparent_70%)]" />
      </div>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="w-full max-w-md bg-[#131318] border border-[rgba(212,163,89,0.25)] rounded-2xl shadow-2xl p-8 md:p-10 relative z-10"
      >
        <motion.h2
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-8 text-2xl font-black gold-gradient-text"
        >
          Login to Sparkz
        </motion.h2>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleLoginClick}
          className="w-full flex items-center justify-center gap-3 py-4 rounded-xl bg-[#0B0B0E] border border-[rgba(212,163,89,0.3)] hover:border-[#F3C87A] hover:bg-[#1a1a22] transition-all font-semibold text-white shadow-[0_0_15px_rgba(212,163,89,0.1)] active:scale-[0.98] focus:outline-none"
        >
          <FcGoogle size={22} />
          Continue with Google
        </motion.button>

        <p className="text-xs text-[#A1A1AA] text-center mt-6">
          We use Google only for authentication. No spam, ever.
        </p>
      </motion.div>
    </div>
  );
}
