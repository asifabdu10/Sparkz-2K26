"use client";
import { useEffect, useState } from "react";
import parseDate from "@/utils/parseDate";
import { motion } from "framer-motion";
import { FaClock, FaRocket, FaFire } from "react-icons/fa";

interface CountdownTimerProps {
  targetDate: string; // expects "DD-MM-YYYY" format
  RegCloseTime:
    | {
        hours: number;
        minutes: number;
      }
    | undefined;
}

export default function CountdownTimer({
  targetDate,
  RegCloseTime,
}: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  } | null>(null);

  const [isExpired, setIsExpired] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (!targetDate) return;

    const endDate = parseDate(
      targetDate,
      RegCloseTime?.hours,
      RegCloseTime?.minutes
    );

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const distance = endDate.getTime() - now;

      if (distance <= 0) {
        clearInterval(interval);
        setTimeLeft(null);
        setIsExpired(true);
        return;
      }

      setTimeLeft({
        days: Math.floor(distance / (1000 * 60 * 60 * 24)),
        hours: Math.floor((distance / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((distance / (1000 * 60)) % 60),
        seconds: Math.floor((distance / 1000) % 60),
      });
      setIsExpired(false);
    }, 1000);

    return () => clearInterval(interval);
  }, [targetDate, RegCloseTime]);

  if (isExpired) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative"
      >
        <div className="absolute -inset-4 bg-linear-to-r from-[rgba(212,163,89,0.2)] to-[#3A270D]/40 rounded-2xl blur-xl opacity-60" />
        <div className="relative rounded-xl border border-[rgba(212,163,89,0.25)] bg-[#131318] p-6 backdrop-blur-sm shadow-sm">
          <div className="flex items-center justify-center gap-3">
            <div className="rounded-full bg-[#3A270D] p-3 border border-[rgba(212,163,89,0.3)]">
              <FaClock className="text-[#F3C87A] text-xl" />
            </div>
            <h3 className="text-lg font-semibold text-white">
              Registration Closed
            </h3>
          </div>
        </div>
      </motion.div>
    );
  }

  if (!timeLeft) return null;

  // Determine urgency level
  const isUrgent = timeLeft.days === 0 && timeLeft.hours < 24;
  const isCritical = timeLeft.days === 0 && timeLeft.hours < 6;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Animated background glow */}
      <div className="absolute -inset-4 rounded-2xl overflow-hidden pointer-events-none">
        <div
          className={`absolute inset-0 bg-linear-to-r ${
            isCritical
              ? "from-red-500/20 via-orange-500/20 to-amber-500/20"
              : isUrgent
              ? "from-amber-500/20 to-[rgba(212,163,89,0.3)]"
              : "from-[rgba(212,163,89,0.2)] via-[#3A270D]/40 to-[rgba(212,163,89,0.2)]"
          } blur-xl transition-all duration-500 ${
            isHovered ? "opacity-80 scale-110" : "opacity-50"
          }`}
        />

        {/* Animated particles */}
        {Array.from({ length: 8 }).map((_, i) => (
          <motion.div
            key={i}
            className={`absolute h-1 w-1 rounded-full ${
              isCritical
                ? "bg-red-400/60"
                : isUrgent
                ? "bg-orange-400/60"
                : "bg-[#D4A359]/50"
            }`}
            initial={{
              x: Math.sin(i * 45) * 50 + "%",
              y: Math.cos(i * 45) * 50 + "%",
              scale: 0,
            }}
            animate={{
              x: [null, Math.sin(i * 45 + 180) * 60 + "%"],
              y: [null, Math.cos(i * 45 + 180) * 60 + "%"],
              scale: [0, 1, 0],
            }}
            transition={{
              duration: 3 + i * 0.5,
              repeat: Infinity,
              delay: i * 0.3,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      {/* Main content */}
      <div className="relative rounded-2xl border border-[rgba(212,163,89,0.25)] bg-[#131318]/90 p-6 backdrop-blur-sm shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <div
            className={`rounded-full p-2.5 ${
              isCritical
                ? "bg-red-100 text-red-600"
                : isUrgent
                ? "bg-amber-100 text-amber-700"
                : "bg-[#3A270D] text-[#F3C87A] border border-[rgba(212,163,89,0.3)]"
            }`}
          >
            {isCritical ? (
              <FaFire className="text-red-500 text-lg animate-pulse" />
            ) : (
              <FaRocket className="text-[#F3C87A] text-lg" />
            )}
          </div>
          <h3
            className={`text-lg font-bold ${
              isCritical
                ? "text-red-600"
                : isUrgent
                ? "text-amber-700"
                : "text-white"
            } uppercase tracking-wider`}
          >
            {isCritical
              ? "Hurry! Registration Closing"
              : "Registration Closes In"}
          </h3>
        </div>

        {/* Time units */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { key: "days", label: "Days", value: timeLeft.days },
            { key: "hours", label: "Hours", value: timeLeft.hours },
            { key: "minutes", label: "Minutes", value: timeLeft.minutes },
            { key: "seconds", label: "Seconds", value: timeLeft.seconds },
          ].map((unit, index) => (
            <motion.div
              key={unit.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              whileHover={{ scale: 1.05 }}
              className="relative"
            >
              {/* Card glow effect */}
              <div
                className={`absolute -inset-1 rounded-xl blur opacity-0 hover:opacity-100 transition-opacity ${
                  isCritical
                    ? "bg-linear-to-r from-red-500/30 to-orange-500/30"
                    : isUrgent
                    ? "bg-linear-to-r from-orange-500/30 to-amber-500/30"
                    : "bg-[rgba(212,163,89,0.25)]"
                }`}
              />

              {/* Time unit card */}
              <div className="relative rounded-xl border border-[rgba(212,163,89,0.25)] bg-[#0B0B0E] p-4 backdrop-blur-sm shadow-xs">
                <motion.p
                  key={unit.value}
                  initial={{ scale: 1.2 }}
                  animate={{ scale: 1 }}
                  className={`text-3xl sm:text-4xl font-extrabold text-center mb-2 ${
                    isCritical
                      ? "text-red-600"
                      : isUrgent
                      ? "text-amber-600"
                      : "gold-gradient-text"
                  }`}
                >
                  {unit.value.toString().padStart(2, "0")}
                </motion.p>
                <p
                  className={`text-xs font-semibold uppercase tracking-wider text-center ${
                    isCritical
                      ? "text-red-600/80"
                      : isUrgent
                      ? "text-amber-600/80"
                      : "text-[#A1A1AA]"
                  }`}
                >
                  {unit.label}
                </p>
              </div>

              {/* Animated separator (except last) */}
              {index < 3 && (
                <div className="hidden sm:block absolute top-1/2 -right-2 transform -translate-y-1/2">
                  <div
                    className={`h-0.5 w-4 ${
                      isCritical
                        ? "bg-linear-to-r from-red-500/50 to-orange-500/50"
                        : isUrgent
                        ? "bg-linear-to-r from-orange-500/50 to-amber-500/50"
                        : "bg-linear-to-r from-[rgba(212,163,89,0.3)] to-[#D4A359]/60"
                    }`}
                  />
                </div>
              )}
            </motion.div>
          ))}
        </div>
        {/* Status indicator */}
        <div className="flex items-center justify-center gap-2 mt-4">
          <div
            className={`h-2 w-2 rounded-full animate-pulse ${
              isCritical
                ? "bg-red-500"
                : isUrgent
                ? "bg-amber-500"
                : "bg-[#D4A359]"
            }`}
          />
          <p
            className={`text-xs font-medium ${
              isCritical
                ? "text-red-600"
                : isUrgent
                ? "text-amber-700"
                : "text-[#A1A1AA]"
            }`}
          >
            {isCritical
              ? "⚠️ Closing soon! Register now"
              : isUrgent
              ? "⏳ Time is running out"
              : "✨ Registration open"}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
