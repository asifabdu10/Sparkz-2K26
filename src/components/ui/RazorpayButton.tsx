"use client";

import { useState, useEffect, useCallback } from "react";
import Script from "next/script";
import { toastSuccess, toastError } from "@/utils/common/Toast";
import { auth } from "@/utils/firebase";

// ─── Razorpay window type ──────────────────────────────────────────────────
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Razorpay: any;
  }
}

// ─── Props ─────────────────────────────────────────────────────────────────
interface RazorpayButtonProps {
  /** Fee in rupees — e.g. 200 for ₹200 */
  amountRupees: number;
  /** Display label of the event */
  eventTitle: string;
  /** Firestore event document ID */
  eventId: string;
  /** Logged-in user's Firebase UID */
  userId: string;
  /** User's display name (pre-fills Razorpay modal) */
  userName?: string;
  /** User's email (pre-fills Razorpay modal) */
  userEmail?: string;
  /** User's phone (pre-fills Razorpay modal) */
  userPhone?: string;
  /** Called after payment is successfully verified on the server */
  onSuccess?: (paymentId: string, orderId: string) => void | Promise<void>;
  /** Additional metadata to store alongside the payment in Firestore */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: Record<string, any>;
  /** Custom button className override */
  className?: string;
  /** Custom button label */
  label?: string;
}

export default function RazorpayButton({
  amountRupees,
  eventTitle,
  eventId,
  userId,
  userName,
  userEmail,
  userPhone,
  onSuccess,
  metadata,
  className,
  label = "Pay & Register",
}: RazorpayButtonProps) {
  const [loading, setLoading] = useState(false);
  const [scriptReady, setScriptReady] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && window.Razorpay) {
      setScriptReady(true);
    }
  }, []);

  const ensureScriptLoaded = async (): Promise<boolean> => {
    if (typeof window !== "undefined" && window.Razorpay) {
      setScriptReady(true);
      return true;
    }

    return new Promise((resolve) => {
      let resolved = false;

      // 1. Polling interval every 100ms for up to 4s in case checkout.js is already in DOM / executing
      const interval = setInterval(() => {
        if (typeof window !== "undefined" && window.Razorpay) {
          if (!resolved) {
            resolved = true;
            clearInterval(interval);
            setScriptReady(true);
            resolve(true);
          }
        }
      }, 100);

      // 4-second timeout guarantee so the button can never hang indefinitely
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          clearInterval(interval);
          resolve(typeof window !== "undefined" && Boolean(window.Razorpay));
        }
      }, 4000);

      const existingScript = document.querySelector(
        'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
      );
      if (existingScript) {
        existingScript.addEventListener("load", () => {
          if (!resolved) {
            resolved = true;
            clearInterval(interval);
            clearTimeout(timeout);
            setScriptReady(true);
            resolve(true);
          }
        });
        existingScript.addEventListener("error", () => {
          if (!resolved) {
            resolved = true;
            clearInterval(interval);
            clearTimeout(timeout);
            resolve(false);
          }
        });
        return;
      }

      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => {
        if (!resolved) {
          resolved = true;
          clearInterval(interval);
          clearTimeout(timeout);
          setScriptReady(true);
          resolve(true);
        }
      };
      script.onerror = () => {
        if (!resolved) {
          resolved = true;
          clearInterval(interval);
          clearTimeout(timeout);
          resolve(false);
        }
      };
      document.body.appendChild(script);
    });
  };

  const handlePayment = useCallback(async () => {
    setLoading(true);

    const isReady =
      scriptReady ||
      (typeof window !== "undefined" && Boolean(window.Razorpay)) ||
      (await ensureScriptLoaded());

    if (!isReady) {
      toastError(
        "Failed to load payment gateway. Please check your internet connection and try again."
      );
      setLoading(false);
      return;
    }

    try {
      // ── Step 1: create order on our backend ───────────────────────────
      // Do not let a stalled API request leave the payment button in
      // "Processing..." forever. The order endpoint is intentionally kept
      // independent from Firestore writes so Razorpay can open promptly.
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 15000);

      let orderRes: Response;
      try {
        orderRes = await fetch("/api/razorpay/create-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            amount: amountRupees,
            receipt: `evt_${eventId}_${Date.now()}`,
            notes: { eventId, userId, registrationId: metadata?.registrationId || "" },
            registrationId: metadata?.registrationId || "",
            eventId,
            userId,
          }),
        });
      } catch (fetchError: any) {
        if (fetchError?.name === "AbortError") {
          throw new Error("Payment server took too long to respond. Please try again.");
        }
        throw new Error("Unable to connect to the payment server. Please check your internet connection and try again.");
      } finally {
        window.clearTimeout(timeoutId);
      }

      const orderData = await orderRes.json().catch(() => ({}));

      if (!orderRes.ok) {
        throw new Error(orderData.error || "Failed to create order");
      }

      const razorpayKey =
        orderData.key_id ||
        orderData.keyId ||
        process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ||
        "";

      if (!razorpayKey) {
        throw new Error(
          "Payment gateway key is missing. Please verify server environment configuration."
        );
      }

      // ── Step 2: open Razorpay checkout modal ──────────────────────────
      const options = {
        key: razorpayKey,
        amount: orderData.amount,          // paise
        currency: orderData.currency || "INR",
        name: "Sparkz 2K26",
        description: eventTitle,
        order_id: orderData.order_id,
        prefill: {
          name: userName || "",
          email: userEmail || "",
          contact: userPhone || "",
        },
        theme: {
          color: "#D4A359",              // brand gold
          backdrop_color: "#0A0A0A",
        },
        modal: {
          ondismiss() {
            toastError("Payment cancelled.");
            setLoading(false);
          },
        },
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
          // ── Step 3: verify signature on our backend ─────────────────
          setLoading(true);
          try {
            const firebaseIdToken = await auth.currentUser?.getIdToken();
            const verifyRes = await fetch("/api/razorpay/verify-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
                eventId,
                userId,
                metadata,
                registrationId: metadata?.registrationId || "",
                firebaseIdToken: firebaseIdToken || "",
              }),
            });

            const verifyData = await verifyRes.json();

            if (!verifyRes.ok) {
              throw new Error(
                verifyData.error || "Payment verification failed"
              );
            }

            // The parent component records the paid registration in Firestore.
            // This happens only after the server has verified the Razorpay signature.
            await onSuccess?.(
              response.razorpay_payment_id,
              response.razorpay_order_id
            );

            toastSuccess("Payment successful! You are registered 🎉");
          } catch (err: any) {
            toastError(err?.message || "Payment verification failed");
          } finally {
            setLoading(false);
          }
        },
      };

      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      const rzp = new window.Razorpay(options);

      rzp.on("payment.failed", (res: any) => {
        toastError(res?.error?.description || "Payment failed. Please retry.");
        setLoading(false);
      });

      try {
        rzp.open();
        // Modal is now open on screen; reset button state so it is never stuck on Processing
        setLoading(false);
      } catch (openErr: any) {
        console.error("Razorpay open error:", openErr);
        toastError(openErr?.message || "Failed to open payment modal. Please retry.");
        setLoading(false);
      }
    } catch (err: any) {
      console.error("Payment initiation error:", err);
      toastError(err?.message || "Something went wrong. Please try again.");
      setLoading(false);
    }
  }, [
    scriptReady,
    amountRupees,
    eventTitle,
    eventId,
    userId,
    userName,
    userEmail,
    userPhone,
    onSuccess,
    metadata,
  ]);

  return (
    <>
      {/* Load Razorpay checkout.js once */}
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
        onError={() => {
          setScriptReady(false);
          setLoading(false);
          toastError("Failed to load payment gateway. Check your connection.");
        }}
      />

      <button
        id={`razorpay-btn-${eventId}`}
        onClick={handlePayment}
        disabled={loading}
        className={
          className ||
          "btn-gold group relative flex items-center justify-center gap-3 w-full rounded-full p-4 transition-all duration-300 hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 cursor-pointer"
        }
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <svg
              className="animate-spin h-5 w-5 text-[#0B0B0E]"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            <span className="text-lg font-bold text-[#0B0B0E]">
              Processing…
            </span>
          </span>
        ) : (
          <>
            <span className="text-lg font-bold text-[#0B0B0E]">
              {label}
            </span>
            <span className="text-sm font-semibold text-[#0B0B0E]/80">
              ₹{amountRupees}
            </span>
          </>
        )}
      </button>
    </>
  );
}
