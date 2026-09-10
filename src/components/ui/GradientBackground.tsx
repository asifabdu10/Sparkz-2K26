import React from "react";

export default function GradientBackground() {
  return (
    <div
      className="fixed inset-0 overflow-hidden pointer-events-none -z-50"
      aria-hidden="true"
    >
      {/* Primary Background: #0B0B0E (Near-Black Obsidian) */}
      <div className="absolute inset-0 bg-[#0B0B0E]" />

      {/* Warm Dark Bronze Glow & Radial Overlays: #3A270D */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[55%] h-[55%] bg-[#3A270D]/40 rounded-full blur-[140px]" />
        <div className="absolute top-[35%] right-[-15%] w-[50%] h-[50%] bg-[#3A270D]/35 rounded-full blur-[150px]" />
        <div className="absolute bottom-[-15%] left-[20%] w-[50%] h-[50%] bg-[#3A270D]/30 rounded-full blur-[160px]" />
        {/* Subtle metallic gold highlight glow */}
        <div className="absolute top-[15%] right-[25%] w-[25%] h-[25%] bg-[#D4A359]/5 rounded-full blur-[100px]" />
      </div>

      {/* Elegant Geometric Gold Lines & Rings Overlay */}
      <svg
        className="absolute inset-0 w-full h-full opacity-35"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="goldStrokeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#D4A359" stopOpacity="0.35" />
            <stop offset="50%" stopColor="#F3C87A" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#3A270D" stopOpacity="0.05" />
          </linearGradient>
        </defs>

        {/* Upper Right Geometric Accents */}
        <g stroke="url(#goldStrokeGrad)" fill="none" strokeWidth="1">
          <circle cx="85%" cy="22%" r="180" strokeDasharray="6 8" opacity="0.4" />
          <circle cx="85%" cy="22%" r="260" opacity="0.3" />
          <circle cx="85%" cy="22%" r="340" strokeDasharray="3 6" opacity="0.2" />
          <polygon
            points="1100,80 1280,240 1180,440 940,400 880,180"
            opacity="0.25"
          />
        </g>

        {/* Lower Left Flowing Geometric Rings */}
        <g stroke="url(#goldStrokeGrad)" fill="none" strokeWidth="1">
          <circle cx="15%" cy="75%" r="220" opacity="0.35" />
          <circle cx="15%" cy="75%" r="320" strokeDasharray="4 6" opacity="0.25" />
          <circle cx="15%" cy="75%" r="420" opacity="0.18" />
          <polygon
            points="80,950 260,820 420,960 340,1160 140,1120"
            opacity="0.2"
          />
        </g>
      </svg>

      {/* Subtle Geometric Grid Pattern */}
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: `linear-gradient(rgba(212, 163, 89, 0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(212, 163, 89, 0.4) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />
    </div>
  );
}
