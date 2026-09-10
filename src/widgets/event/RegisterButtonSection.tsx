"use client";

import React from "react";
import Link from "next/link";
import { FaArrowRight, FaExternalLinkAlt } from "react-icons/fa";
import { Event } from "@/utils/types/event";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { toastError } from "@/utils/common/Toast";
import dynamic from "next/dynamic";

// Lazy-load so Razorpay checkout.js is never bundled server-side
const RazorpayButton = dynamic(
  () => import("@/components/ui/RazorpayButton"),
  { ssr: false }
);

interface Props {
  event: Event;
}

const RegisterButtonSection: React.FC<Props> = ({ event }) => {
  const { user } = useAuth();
  const router = useRouter();

  // Parse fee — strip "₹", commas, whitespace and cast to number
  const feeNumber = event.registrationFee
    ? Number(event.registrationFee.toString().replace(/[^0-9.]/g, ""))
    : 0;

  const hasRazorpay =
    !event.regLink &&                // no external link
    feeNumber > 0 &&                 // non-zero fee
    !isNaN(feeNumber);               // valid number

  // Guard: require login before opening payment modal
  const handleGuestClick = () => {
    toastError("Please login to register for this event.");
    router.push("/login");
  };

  // ── 1. External registration link ────────────────────────────────────────
  if (event.regLink) {
    return (
      <div className="relative">
        <div className="space-y-4">
          <Link
            href={event.regLink}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-gold group relative flex items-center justify-center gap-3 w-full rounded-full p-4 transition-all duration-300 hover:scale-[1.02] cursor-pointer"
          >
            <span className="text-lg font-bold text-[#0B0B0E]">
              Register Now
            </span>
            <FaExternalLinkAlt className="text-[#0B0B0E] text-sm transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    );
  }

  // ── 2. Razorpay inline payment ────────────────────────────────────────────
  if (hasRazorpay) {
    if (!user) {
      // Show a login prompt button instead of the payment button
      return (
        <div className="relative">
          <div className="space-y-4">
            <button
              onClick={handleGuestClick}
              className="btn-gold group relative flex items-center justify-center gap-3 w-full rounded-full p-4 transition-all duration-300 hover:scale-[1.02] cursor-pointer"
            >
              <span className="text-lg font-bold text-[#0B0B0E]">
                Login to Register
              </span>
              <FaArrowRight className="text-[#0B0B0E] transition-transform duration-300 group-hover:translate-x-1" />
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="relative">
        <div className="space-y-4">
          <RazorpayButton
            amountRupees={feeNumber}
            eventTitle={event.title}
            eventId={event.id}
            userId={user.uid}
            userName={user.displayName || undefined}
            userEmail={user.email || undefined}
            onSuccess={(paymentId, orderId) => {
              console.log("Payment success:", paymentId, orderId);
            }}
            metadata={{
              eventTitle: event.title,
              department: event.department,
            }}
          />
          <p className="text-center text-xs text-[#A1A1AA]">
            Secured by{" "}
            <span className="text-[#F3C87A] font-semibold">Razorpay</span>{" "}
            · UPI, Cards, Net Banking accepted
          </p>
        </div>
      </div>
    );
  }

  // ── 3. Internal registration page (no fee / custom flow) ─────────────────
  return (
    <div className="relative">
      <div className="space-y-4">
        <Link
          href={`./${event.id}/register`}
          className="btn-gold group relative flex items-center justify-center gap-3 w-full rounded-full p-4 transition-all duration-300 hover:scale-[1.02] cursor-pointer"
        >
          <span className="text-lg font-bold text-[#0B0B0E]">
            Register Now
          </span>
          <FaArrowRight className="text-[#0B0B0E] transition-transform duration-300 group-hover:translate-x-1" />
        </Link>
      </div>
    </div>
  );
};

export default RegisterButtonSection;
