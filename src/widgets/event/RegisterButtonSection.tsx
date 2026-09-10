"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FaArrowRight, FaExternalLinkAlt } from "react-icons/fa";
import { Event } from "@/utils/types/event";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { toastError } from "@/utils/common/Toast";
import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { db } from "@/utils/firebase";

interface Props {
  event: Event;
}

function getDeadline(event: Event): Date | null {
  if (!event.regFinalDate) return null;
  const [day, month, year] = event.regFinalDate.split("-").map(Number);
  if (!day || !month || !year) return null;

  const deadline = new Date(year, month - 1, day);
  if (event.RegCloseTime) {
    deadline.setHours(event.RegCloseTime.hours, event.RegCloseTime.minutes, 59, 999);
  } else {
    deadline.setHours(23, 59, 59, 999);
  }
  return deadline;
}

export default function RegisterButtonSection({ event }: Props) {
  const { user } = useAuth();
  const router = useRouter();
  const [registered, setRegistered] = useState(false);
  const [checking, setChecking] = useState(true);

  const feeNumber = event.isFree
    ? 0
    : Number(String(event.registrationFee || "0").replace(/[^0-9.]/g, ""));
  const isFree = event.isFree === true || !feeNumber || Number.isNaN(feeNumber);
  const deadline = useMemo(() => getDeadline(event), [event]);
  const registrationClosed = event.registrationOpen === false || Boolean(deadline && new Date() > deadline);

  useEffect(() => {
    let cancelled = false;

    const checkRegistration = async () => {
      if (!user) {
        if (!cancelled) {
          setRegistered(false);
          setChecking(false);
        }
        return;
      }

      try {
        const q = query(
          collection(db, "registrations"),
          where("eventId", "==", event.id),
          where("userId", "==", user.uid),
          limit(1)
        );
        const snapshot = await getDocs(q);
        if (!cancelled) {
          const registration = snapshot.empty ? null : snapshot.docs[0].data();
          setRegistered(
            registration?.status === "paid" ||
            registration?.status === "registered"
          );
        }
      } catch (error) {
        console.error("Registration status check failed:", error);
      } finally {
        if (!cancelled) setChecking(false);
      }
    };

    setChecking(true);
    checkRegistration();
    return () => {
      cancelled = true;
    };
  }, [event.id, user]);

  if (checking) {
    return (
      <button disabled className="btn-gold w-full rounded-full p-4 opacity-60 cursor-not-allowed">
        Checking registration...
      </button>
    );
  }

  if (registered) {
    return (
      <button disabled className="w-full rounded-full p-4 bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 font-bold cursor-default">
        ✓ Registered
      </button>
    );
  }

  if (registrationClosed) {
    return (
      <button disabled className="w-full rounded-full p-4 bg-red-950/40 border border-red-500/30 text-red-300 font-bold cursor-not-allowed">
        Registration Closed
      </button>
    );
  }

  if (!user) {
    return (
      <button
        onClick={() => {
          toastError("Please login to register for this event.");
          router.push("/login");
        }}
        className="btn-gold group relative flex items-center justify-center gap-3 w-full rounded-full p-4 transition-all duration-300 hover:scale-[1.02] cursor-pointer"
      >
        <span className="text-lg font-bold text-[#0B0B0E]">Login to Register</span>
        <FaArrowRight className="text-[#0B0B0E]" />
      </button>
    );
  }

  // External registrations remain external. Internal events always go through
  // the Sparkz registration form so team/member details can be collected first.
  if (event.regLink && event.eveType !== "team") {
    return (
      <Link
        href={event.regLink}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-gold group relative flex items-center justify-center gap-3 w-full rounded-full p-4 transition-all duration-300 hover:scale-[1.02] cursor-pointer"
      >
        <span className="text-lg font-bold text-[#0B0B0E]">Register Now</span>
        <FaExternalLinkAlt className="text-[#0B0B0E] text-sm" />
      </Link>
    );
  }

  return (
    <Link
      href={`/events/${event.id}/register`}
      className="btn-gold group relative flex items-center justify-center gap-3 w-full rounded-full p-4 transition-all duration-300 hover:scale-[1.02] cursor-pointer"
    >
      <span className="text-lg font-bold text-[#0B0B0E]">
        {isFree ? "Register Free" : "Register Now"}
      </span>
      <FaArrowRight className="text-[#0B0B0E]" />
    </Link>
  );
}
