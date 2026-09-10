"use client";

import Link from "next/link";
import { ArrowLeft, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0B0B0E] text-white flex flex-col items-center justify-center text-center p-4 relative overflow-hidden font-sans">
      {/* Background Gradients/Glows */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[#3A270D]/40 rounded-full blur-[140px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-[#3A270D]/30 rounded-full blur-[140px]" />
      </div>

      {/* Glassmorphism Card */}
      <div className="bg-[#131318] border border-[rgba(212,163,89,0.25)] p-12 rounded-3xl shadow-2xl max-w-2xl w-full flex flex-col items-center relative z-10">
        {/* glitched 404 text effect */}
        <div className="relative mb-6 group">
          <h1 className="text-9xl md:text-[12rem] font-black gold-gradient-text select-none">
            404
          </h1>
        </div>

        <h2 className="text-3xl md:text-4xl font-bold mb-4 font-unbounded text-white">
          Lost in Hyperspace?
        </h2>

        <p className="text-[#A1A1AA] text-lg mb-10 max-w-md mx-auto leading-relaxed">
          The coordinates you entered led to a black hole. Let&apos;s get you back to
          solid ground.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <Link
            href="/"
            className="flex items-center justify-center gap-2 btn-gold px-8 py-3.5 rounded-xl font-bold text-[#0B0B0E] transition-all transform hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(212,163,89,0.3)]"
          >
            <Home className="w-5 h-5 text-[#0B0B0E]" />
            Go Home
          </Link>

          <button
            onClick={() => window.history.back()}
            className="flex items-center justify-center gap-2 bg-[#0B0B0E] hover:bg-[#1a1a22] text-white border border-[rgba(212,163,89,0.25)] hover:border-[#F3C87A] hover:text-[#F3C87A] px-8 py-3.5 rounded-xl font-medium transition-all cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}
