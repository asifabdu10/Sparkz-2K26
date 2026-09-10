"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FaArrowRight, FaExternalLinkAlt } from "react-icons/fa";
import { Event } from "@/utils/types/event";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { toastError, toastSuccess } from "@/utils/common/Toast";
import dynamic from "next/dynamic";
import {
  arrayUnion,
  collection,
  doc,
  getDocs,
  limit,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/utils/firebase";

const RazorpayButton = dynamic(
  () => import("@/components/ui/RazorpayButton"),
  { ssr: false }
);

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

const RegisterButtonSection: React.FC<Props> = ({ event }) => {
  const { user, userData, refetchUserProfile } = useAuth();
  const router = useRouter();
  const [registered, setRegistered] = useState(false);
  const [checking, setChecking] = useState(true);
  const [registeringFree, setRegisteringFree] = useState(false);

  const feeNumber = event.isFree
    ? 0
    : event.registrationFee
      ? Number(event.registrationFee.toString().replace(/[^0-9.]/g, ""))
      : 0;

  const isFree = Boolean(event.isFree) || !feeNumber || Number.isNaN(feeNumber);
  const deadline = useMemo(() => getDeadline(event), [event]);
  const deadlineClosed = Boolean(deadline && new Date() > deadline);
  const manuallyClosed = event.registrationOpen === false;
  const registrationClosed = manuallyClosed || deadlineClosed;

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
          const status = registration?.status;
          setRegistered(
            isFree
              ? status === "registered" || status === "paid"
              : status === "paid"
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
  }, [event.id, user, isFree]);

  const handleGuestClick = () => {
    toastError("Please login to register for this event.");
    router.push("/login");
  };

  const completePaidRegistration = async (paymentId: string, orderId: string) => {
    if (!user) {
      throw new Error("Please login again before completing registration.");
    }

    const registrationData = {
      eventId: event.id,
      eventTitle: event.title,
      userId: user.uid,
      userEmail: user.email || "",
      userName: user.displayName || userData?.name || "",
      leaderName: user.displayName || userData?.name || "",
      leaderEmail: user.email || "",
      leaderCollege: userData?.college || "",
      status: "paid",
      paymentStatus: "paid",
      razorpayPaymentId: paymentId,
      razorpayOrderId: orderId,
      registrationFee: feeNumber,
      department: event.department || "",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const existingQuery = query(
      collection(db, "registrations"),
      where("eventId", "==", event.id),
      where("userId", "==", user.uid),
      limit(1)
    );
    const existingSnapshot = await getDocs(existingQuery);

    if (!existingSnapshot.empty) {
      await updateDoc(existingSnapshot.docs[0].ref, {
        ...registrationData,
        createdAt: existingSnapshot.docs[0].data().createdAt || new Date(),
      });
    } else {
      const registrationId = `${user.uid}_${event.id}`;
      await setDoc(doc(db, "registrations", registrationId), registrationData);
    }

    await updateDoc(doc(db, "users", user.uid), {
      registeredEvents: arrayUnion(event.title),
    });

    await refetchUserProfile();
    setRegistered(true);
  };

  const handleFreeRegistration = async () => {
    if (!user) {
      handleGuestClick();
      return;
    }

    if (registrationClosed) {
      toastError("Registration for this event is closed.");
      return;
    }

    setRegisteringFree(true);

    try {
      const registrationData = {
        eventId: event.id,
        eventTitle: event.title,
        userId: user.uid,
        userEmail: user.email || "",
        userName: user.displayName || userData?.name || "",
        leaderName: user.displayName || userData?.name || "",
        leaderEmail: user.email || "",
        leaderCollege: userData?.college || "",
        status: "registered",
        paymentStatus: "free",
        registrationFee: 0,
        department: event.department || "",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const existingQuery = query(
        collection(db, "registrations"),
        where("eventId", "==", event.id),
        where("userId", "==", user.uid),
        limit(1)
      );
      const existingSnapshot = await getDocs(existingQuery);

      if (!existingSnapshot.empty) {
        await updateDoc(existingSnapshot.docs[0].ref, {
          ...registrationData,
          createdAt: existingSnapshot.docs[0].data().createdAt || new Date(),
        });
      } else {
        await setDoc(doc(db, "registrations", `${user.uid}_${event.id}`), registrationData);
      }

      await updateDoc(doc(db, "users", user.uid), {
        registeredEvents: arrayUnion(event.title),
      });
      await refetchUserProfile();
      setRegistered(true);
      toastSuccess("Registered successfully! 🎉");
    } catch (error) {
      console.error("Free registration failed:", error);
      toastError("Registration failed. Please try again.");
    } finally {
      setRegisteringFree(false);
    }
  };

  if (checking) {
    return (
      <button disabled className="btn-gold w-full rounded-full p-4 opacity-60 cursor-not-allowed">
        Checking registration...
      </button>
    );
  }

  if (registered) {
    return (
      <button
        disabled
        className="w-full rounded-full p-4 bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 font-bold cursor-default"
      >
        ✓ Registered
      </button>
    );
  }

  if (registrationClosed) {
    return (
      <button
        disabled
        className="w-full rounded-full p-4 bg-red-950/40 border border-red-500/30 text-red-300 font-bold cursor-not-allowed"
      >
        Registration Closed
      </button>
    );
  }

  if (event.regLink) {
    if (!user) {
      return (
        <button
          onClick={handleGuestClick}
          className="btn-gold group relative flex items-center justify-center gap-3 w-full rounded-full p-4 transition-all duration-300 hover:scale-[1.02] cursor-pointer"
        >
          <span className="text-lg font-bold text-[#0B0B0E]">Login to Register</span>
          <FaArrowRight className="text-[#0B0B0E]" />
        </button>
      );
    }

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

  if (isFree) {
    return (
      <button
        onClick={handleFreeRegistration}
        disabled={registeringFree}
        className="btn-gold group relative flex items-center justify-center gap-3 w-full rounded-full p-4 transition-all duration-300 hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <span className="text-lg font-bold text-[#0B0B0E]">
          {registeringFree ? "Registering..." : "Register Free"}
        </span>
        {!registeringFree && <FaArrowRight className="text-[#0B0B0E]" />}
      </button>
    );
  }

  if (!user) {
    return (
      <button
        onClick={handleGuestClick}
        className="btn-gold group relative flex items-center justify-center gap-3 w-full rounded-full p-4 transition-all duration-300 hover:scale-[1.02] cursor-pointer"
      >
        <span className="text-lg font-bold text-[#0B0B0E]">Login to Register</span>
        <FaArrowRight className="text-[#0B0B0E]" />
      </button>
    );
  }

  return (
    <div className="space-y-4">
      <RazorpayButton
        amountRupees={feeNumber}
        eventTitle={event.title}
        eventId={event.id}
        userId={user.uid}
        userName={user.displayName || userData?.name || undefined}
        userEmail={user.email || undefined}
        onSuccess={completePaidRegistration}
        metadata={{
          eventTitle: event.title,
          department: event.department,
        }}
      />
      <p className="text-center text-xs text-[#A1A1AA]">
        Secured by <span className="text-[#F3C87A] font-semibold">Razorpay</span> · UPI, Cards, Net Banking accepted
      </p>
    </div>
  );
};

export default RegisterButtonSection;
