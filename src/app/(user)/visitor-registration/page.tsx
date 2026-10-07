"use client";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Script from "next/script";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/utils/firebase";
import { collection, query, where, getDocs, doc, getDoc, DocumentSnapshot } from "firebase/firestore";

// ─── Types ────────────────────────────────────────────────────────────────────
type ReferringType = "student" | "faculty" | "";

interface FormState {
  name: string;
  phone: string;
  college: string;
  department: string;
  yearOfStudy: string; // Visitor's own year of study
  referringType: ReferringType;
  referringName: string;
  referringCollegeId: string; // text field for referring person's college ID info
  referringYear: string;      // year of study of referring student (only for student)
  referringDepartment: string; // department of referring person
}

// Dynamic Rules generator
const getRulesText = (fee: number) => [
  "You must be referred by a current student or faculty member of Carmel College of Engineering & Technology.",
  "You must be registered in at least onne Sparkz 2K26 departmental event.",
  "You must upload and carry your valid College ID card for entry verification.",
  `Your visitor pass is valid for 08 & 09 Oct, granting access to Abheri & Proshow. The registration fee is ₹${fee}.`,
  "Visitor passes are non-transferable. Your details will be verified at the gate.",
];
const RULES_COUNT = 5;
// Last rule rendered separately so we can embed a hyperlink
const LAST_RULE_TEXT = "Any violation of rules or misconduct will result in immediate removal from the premises.";

const YEAR_OPTIONS = ["1st Year", "2nd Year", "3rd Year", "4th Year", "Other"];

// ─── FileInput component ──────────────────────────────────────────────────────
function FileInput({
  label, hint, file, setFile, inputRef, errorKey, errors,
}: {
  label: string; hint: string; file: File | null;
  setFile: (f: File | null) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  errorKey: string; errors: Record<string, string>;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-1">{label}</label>
      <p className="text-xs text-gray-500 mb-2">{hint}</p>
      <div
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer border-2 border-dashed ${errors[errorKey] ? "border-red-500" : "border-[rgba(212,163,89,0.3)]"
          } rounded-xl p-4 text-center hover:border-[#F3C87A] transition-colors`}
      >
        {file ? (
          <div className="flex items-center justify-center gap-2 text-green-400">
            <span>&#x2713;</span>
            <span className="text-sm truncate max-w-[200px]">{file.name}</span>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setFile(null); if (inputRef.current) inputRef.current.value = ""; }}
              className="text-red-400 hover:text-red-300 ml-2 text-xs"
            >&#x2715;</button>
          </div>
        ) : (
          <p className="text-sm text-gray-400">Click to upload <span className="text-[#F3C87A]">{label}</span></p>
        )}
        <input ref={inputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf" className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] || null)} />
      </div>
      {errors[errorKey] && <p className="text-red-400 text-xs mt-1">{errors[errorKey]}</p>}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function VisitorRegistrationPage() {
  const { user, userData, loading, login } = useAuth();

  // Step state: "rules" → user reads & checks rules; "form" → fill form; "done"
  const [step, setStep] = useState<"rules" | "form" | "done">("rules");

  // Rules checklist
  const [checkedRules, setCheckedRules] = useState<boolean[]>(Array(RULES_COUNT + 1).fill(false));
  const allChecked = checkedRules.every(Boolean);

  // Paid-event verification
  const [checkingPaidEvent, setCheckingPaidEvent] = useState(false);
  const [hasPaidEvent, setHasPaidEvent] = useState<boolean | null>(null);
  const [paidEventName, setPaidEventName] = useState("");
  const [existingVisitorReg, setExistingVisitorReg] = useState<{
    id: string;
    approvalStatus?: string;
    revokedReason?: string;
    name?: string;
    college?: string;
    yearOfStudy?: string;
  } | null>(null);

  const [form, setForm] = useState<FormState>({
    name: "", phone: "", college: "", department: "",
    yearOfStudy: "",
    referringType: "", referringName: "", referringCollegeId: "",
    referringYear: "", referringDepartment: "",
  });

  const [collegeIdFile, setCollegeIdFile] = useState<File | null>(null);
  const collegeIdRef = useRef<HTMLInputElement>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submittingStatus, setSubmittingStatus] = useState<string>("");
  const [result, setResult] = useState<{ success: boolean; emailSent?: boolean; regId?: string; paymentId?: string } | null>(null);

  // Visitor Pass Fee, Registration Status & Vacancy
  const [passFee, setPassFee] = useState<number>(250);
  const [registrationOpen, setRegistrationOpen] = useState<boolean>(true);
  const [totalCapacity, setTotalCapacity] = useState<number>(300);
  const [remainingTickets, setRemainingTickets] = useState<number>(300);
  const [isSoldOut, setIsSoldOut] = useState<boolean>(false);
  const [statusLoaded, setStatusLoaded] = useState<boolean>(false);

  // Fetch dynamic status & fee
  useEffect(() => {
    fetch("/api/visitor-registration/status")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          if (typeof data.fee === "number") setPassFee(data.fee);
          if (typeof data.registrationOpen === "boolean") setRegistrationOpen(data.registrationOpen);
          if (typeof data.totalCapacity === "number") setTotalCapacity(data.totalCapacity);
          if (typeof data.remainingTickets === "number") setRemainingTickets(data.remainingTickets);
          if (typeof data.isSoldOut === "boolean") setIsSoldOut(data.isSoldOut);
        }
      })
      .catch((e: unknown) => console.warn("Failed to fetch visitor fee/status:", e))
      .finally(() => setStatusLoaded(true));
  }, []);

  // Pre-fill name from user profile
  useEffect(() => {
    if (userData?.name) setForm((f) => ({ ...f, name: userData.name }));
  }, [userData]);

  // Admin roles bypass the paid-event requirement and payment fee
  const isAdmin = ["superAdmin", "admin", "abheriAdmin", "basicScienceAdmin"].includes(userData?.role || "");
  const canRegister = !statusLoaded || (registrationOpen && !isSoldOut) || isAdmin;

  // Check paid event registration and existing visitor pass whenever user logs in
  useEffect(() => {
    if (!user) { setHasPaidEvent(null); setExistingVisitorReg(null); return; }
    (async () => {
      setCheckingPaidEvent(true);
      try {
        // 1. Check paid departmental event
        const q = query(
          collection(db, "registrations"),
          where("userId", "==", user.uid)
        );
        const snap = await getDocs(q);
        const paidDoc = snap.docs.find((d) => {
          const data = d.data();
          const pStatus = String(data.paymentStatus || "").toLowerCase().trim();
          const rStatus = String(data.status || "").toLowerCase().trim();
          return (
            (pStatus === "paid" || rStatus === "paid") &&
            pStatus !== "pending" &&
            rStatus !== "pending" &&
            pStatus !== "free"
          );
        });

        if (paidDoc) {
          setHasPaidEvent(true);
          const first = paidDoc.data();
          setPaidEventName(first.eventTitle || first.eventName || "Sparkz Departmental Event");
        } else if (isAdmin) {
          // Allow admins to access the registration form for testing
          setHasPaidEvent(true);
          setPaidEventName("Sparkz Departmental Event");
        } else {
          setHasPaidEvent(false);
          setPaidEventName("");
        }

        // 2. Check existing visitor registration
        try {
          const vQ = query(
            collection(db, "visitor_registrations"),
            where("userId", "==", user.uid)
          );
          const vSnap = await getDocs(vQ);
          if (!vSnap.empty) {
            const list = vSnap.docs.map((d) => ({
              id: d.id,
              approvalStatus: d.data().approvalStatus,
              revokedReason: d.data().revokedReason,
              name: d.data().name,
              college: d.data().college,
              yearOfStudy: d.data().yearOfStudy,
            }));
            const active = list.find((d) => d.approvalStatus !== "revoked");
            if (active) {
              setExistingVisitorReg(active);
            } else {
              setExistingVisitorReg(list[0]);
            }
          } else {
            setExistingVisitorReg(null);
          }
        } catch (vErr) {
          console.warn("Could not check visitor pass status", vErr);
        }
      } catch (e) {
        console.error("Error checking paid events", e);
        setHasPaidEvent(false);
      } finally {
        setCheckingPaidEvent(false);
      }
    })();
  }, [user, isAdmin]);

  const inputClass = (field: string) =>
    `w-full bg-[#131318] border ${errors[field] ? "border-red-500" : "border-[rgba(212,163,89,0.2)]"} text-white placeholder-gray-500 px-4 py-3 rounded-xl focus:outline-none focus:border-[#F3C87A] transition-colors`;

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Full name is required.";
    if (!/^\d{10}$/.test(form.phone.trim())) e.phone = "Enter a valid 10-digit phone number.";
    if (!form.college.trim()) e.college = "College name is required.";
    if (!form.department.trim()) e.department = "Department is required.";
    if (!form.yearOfStudy) e.yearOfStudy = "Your year of study is required.";
    if (!form.referringType) e.referringType = "Please select who is referring you.";
    if (!form.referringName.trim()) e.referringName = "Referring person's name is required.";
    if (!form.referringDepartment.trim()) e.referringDepartment = "Referring person's department is required.";
    if (form.referringType === "student" && !form.referringYear) e.referringYear = "Year of study is required.";
    if (!collegeIdFile) e.collegeId = "Your College ID photo/scan is required.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const ensureRazorpayLoaded = async (): Promise<boolean> => {
    if (typeof window !== "undefined" && (window as unknown as { Razorpay?: unknown }).Razorpay) return true;
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const uploadFile = async (file: File, proofType: string): Promise<{ fileId: string; fileUrl: string }> => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("proofType", proofType);
    if (user?.uid) fd.append("userId", user.uid);
    if (form.name) fd.append("userName", form.name);
    if (form.phone) fd.append("userPhone", form.phone);
    if (paidEventName) fd.append("qualifyingEvent", paidEventName);
    const res = await fetch("/api/visitor-registration/upload-proof", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok || !data.fileId) throw new Error(data.error || "File upload failed.");
    const fileId: string = data.fileId;
    const fileUrl: string = data.fileUrl || data.url || `https://drive.google.com/file/d/${fileId}/view`;
    return { fileId, fileUrl };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    if (!user) { setErrors({ submit: "You must be logged in to register." }); return; }
    if (!hasPaidEvent) { setErrors({ submit: "You must have at least one confirmed paid departmental event registration." }); return; }

    setSubmitting(true);
    setSubmittingStatus("Uploading ID proof document...");

    try {
      const idToken = await user.getIdToken(true);
      const { fileId: collegeIdFileId, fileUrl: collegeIdFileUrl } = await uploadFile(collegeIdFile!, "college_id");

      // ── Razorpay Payment ─────────────────────────────────────────────────
      setSubmittingStatus(`Initializing payment gateway (₹${passFee})...`);
      const isLoaded = await ensureRazorpayLoaded();
      if (!isLoaded) {
        throw new Error("Payment gateway could not be loaded. Please check your internet connection.");
      }

      // Create order via API
      const orderRes = await fetch("/api/razorpay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: passFee,
          notes: {
            type: "visitor_registration",
            userId: user.uid,
            name: form.name,
            phone: form.phone,
          },
        }),
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok || !orderData.order_id) {
        throw new Error(orderData.error || "Failed to create payment order. Please try again.");
      }

      const rzpKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
      if (!rzpKey) {
        throw new Error("Razorpay key is not configured.");
      }

      // Open Razorpay Checkout modal
      const options = {
        key: rzpKey,
        amount: Math.round(passFee * 100),
        currency: "INR",
        name: "Sparkz 2K26",
        description: `Visitor Pass (Abheri & Proshow - Valid for 08 & 09 Oct - ₹${passFee})`,
        order_id: orderData.order_id,
        prefill: {
          name: form.name,
          email: user.email || "",
          contact: form.phone,
        },
        theme: {
          color: "#F3C87A",
        },
        handler: async function (paymentResponse: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) {
          setSubmitting(true);
          setSubmittingStatus("Payment verified! Finalizing registration...");

          try {
            const submitPayload = {
              ...form,
              collegeIdFileId,
              collegeIdFileUrl,
              userId: user.uid,
              userEmail: user.email,
              razorpayPaymentId: paymentResponse.razorpay_payment_id,
              razorpayOrderId: paymentResponse.razorpay_order_id,
              razorpaySignature: paymentResponse.razorpay_signature,
            };

            const subRes = await fetch("/api/visitor-registration/submit", {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
              body: JSON.stringify(submitPayload),
            });
            const subData = await subRes.json();
            if (!subData.success) {
              throw new Error(subData.error || "Failed to finalize visitor registration after payment.");
            }

            const registrationId: string = subData.id;
            let emailSent = false;

            // ONLY AFTER SUCCESSFUL REGISTRATION: Send confirmation email
            setSubmittingStatus("Sending confirmation email...");
            try {
              const emailRes = await fetch("/api/visitor-registration/send-confirmation-email", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  email: user.email,
                  name: form.name,
                  college: form.college,
                  department: form.department,
                  yearOfStudy: form.yearOfStudy,
                  referringType: form.referringType,
                  referringName: form.referringName,
                  registrationId,
                  amountPaid: `₹${passFee}`,
                  paymentId: paymentResponse.razorpay_payment_id,
                  passValidity: "08 & 09 Oct",
                  collegeIdFileUrl: collegeIdFileUrl || `https://drive.google.com/file/d/${collegeIdFileId}/view`,
                }),
              });
              emailSent = (await emailRes.json()).success === true;
            } catch (emErr) {
              console.warn("Email sending failed (non-fatal):", emErr);
            }

            setResult({
              success: true,
              emailSent,
              regId: registrationId,
              paymentId: paymentResponse.razorpay_payment_id,
            });
            setStep("done");
          } catch (finalErr: unknown) {
            const fErr = finalErr as { message?: string };
            setErrors({
              submit:
                fErr?.message ||
                "Registration failed. If payment was deducted, please save your Payment ID (" +
                paymentResponse.razorpay_payment_id +
                ") and contact the helpdesk.",
            });
          } finally {
            setSubmitting(false);
            setSubmittingStatus("");
          }
        },
        modal: {
          ondismiss: function () {
            setSubmitting(false);
            setSubmittingStatus("");
          },
        },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rzp = new (window as any).Razorpay(options);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      rzp.on("payment.failed", function (failRes: any) {
        setErrors({ submit: failRes?.error?.description || "Payment failed or was cancelled. Please try again." });
        setSubmitting(false);
        setSubmittingStatus("");
      });
      rzp.open();
    } catch (err: unknown) {
      const e = err as { message?: string };
      setErrors({ submit: e?.message || "Registration failed. Please try again." });
      setSubmitting(false);
      setSubmittingStatus("");
    }
  };

  // ── Loading skeleton ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0B0E] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#F3C87A] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── Success screen ──────────────────────────────────────────────────────────
  if (step === "done" && result?.success) {
    return (
      <div className="min-h-screen bg-[#0B0B0E] flex items-center justify-center px-4 py-12">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-[#131318] border border-[rgba(212,163,89,0.3)] rounded-2xl p-8 text-center space-y-4 shadow-2xl">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto text-3xl">&#x2705;</div>
          <h2 className="text-2xl font-bold text-white">Visitor Pass Confirmed!</h2>
          <p className="text-gray-400 text-sm">
            Your pass for <strong className="text-[#F3C87A]">Abheri &amp; Proshow</strong> at Sparkz 2K26 has been issued.
          </p>

          {/* Pass Validity Box */}
          <div className="bg-[#181824] border border-green-500/40 rounded-xl p-4 text-center space-y-1">
            <span className="text-[11px] font-bold text-green-400 uppercase tracking-widest">Official Pass Validity</span>
            <div className="text-xl font-extrabold text-white">Valid for 08 &amp; 09 Oct</div>
            <p className="text-xs text-green-300">Day 1: Abheri &bull; Day 2: Proshow</p>
          </div>

          <div className="bg-[#1a1a24] rounded-xl p-4 text-left text-xs space-y-2 border border-gray-800">
            <div className="flex justify-between">
              <span className="text-gray-400">Pass ID:</span>
              <span className="text-[#F3C87A] font-mono font-bold">{result.regId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Visitor Name:</span>
              <span className="text-white font-medium">{form.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Year of Study:</span>
              <span className="text-white font-medium">{form.yearOfStudy}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Fee Paid:</span>
              <span className="text-green-400 font-bold">₹250 (Confirmed)</span>
            </div>
            {result.paymentId && (
              <div className="flex justify-between">
                <span className="text-gray-400">Payment ID:</span>
                <span className="text-gray-300 font-mono text-[11px]">{result.paymentId}</span>
              </div>
            )}
          </div>

          {result.emailSent ? (
            <p className="text-xs text-green-400 flex items-center justify-center gap-1">
              <span>✉️</span> Confirmation email with ticket validity for 08 &amp; 09 Oct sent to {user?.email}
            </p>
          ) : (
            <p className="text-xs text-yellow-400">
              Registration saved. Please take a screenshot of your Pass ID for entry.
            </p>
          )}

          <div className="pt-2">
            <Link href="/" className="inline-flex items-center justify-center w-full bg-[#F3C87A] text-[#0B0B0E] font-bold py-3 rounded-xl hover:bg-[#e6b960] transition-colors text-sm">
              Back to Home
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0B0E] py-12 px-4">
      {/* Razorpay script */}
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />

      <div className="pointer-events-none fixed left-[-10%] top-[20%] h-96 w-96 rounded-full bg-[#3A270D]/45 blur-[140px]" />
      <div className="pointer-events-none fixed right-[-5%] top-[30%] h-96 w-96 rounded-full bg-[#3A270D]/35 blur-[150px]" />

      <div className="relative z-10 max-w-2xl mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <Link href="/" className="inline-flex items-center gap-2 text-[#F3C87A] text-sm mb-6 hover:underline">&#8592; Back to Home</Link>
          <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(212,163,89,0.25)] bg-[#131318]/80 px-4 py-2 text-[13px] font-bold uppercase tracking-widest text-[#F3C87A] backdrop-blur mb-4">
            <span className="h-2 w-2 rounded-full bg-[#F3C87A] animate-pulse" />Sparkz 2K26
          </div>
          <h1 className="text-4xl font-black text-white mb-2">Grab Your Ticket</h1>
          <p className="text-gray-400">Visitor Pass for <span className="text-[#F3C87A] font-semibold">Abheri &amp; Proshow</span> &bull; <span className="text-emerald-400 font-medium">Valid for 08 &amp; 09 Oct</span></p>
        </motion.div>

        {/* Ticket Count Indicator */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 bg-[#131318] border border-[rgba(212,163,89,0.25)] rounded-2xl p-4 shadow-lg">
          <div className="flex items-center gap-3">
            <span className={`w-3 h-3 rounded-full ${!registrationOpen || isSoldOut ? "bg-red-400" : "bg-emerald-400 animate-pulse"}`} />
            <div>
              <span className="text-xs text-gray-400 block font-medium">Ticket Count</span>
              <span className={`text-sm font-bold ${!registrationOpen || isSoldOut ? "text-red-400" : "text-white"}`}>
                {!registrationOpen
                  ? "Registrations Closed by Admin"
                  : isSoldOut
                  ? `All ${totalCapacity} Passes Sold Out`
                  : `${remainingTickets} of ${totalCapacity} Tickets Remaining`}
              </span>
            </div>
          </div>
          {registrationOpen && !isSoldOut ? (
            <div className="text-right">
              <span className="text-xs text-gray-400 block font-medium">Ticket Fee</span>
              <span className="text-sm font-bold text-[#F3C87A]">₹{passFee}</span>
            </div>
          ) : (
            <span className="text-xs px-2.5 py-1 rounded-full bg-red-500/20 text-red-300 font-semibold border border-red-500/30">
              Closed
            </span>
          )}
        </div>

        {/* Closed or Sold Out Notice for non-admins */}
        {statusLoaded && !registrationOpen && !isAdmin && (!existingVisitorReg || existingVisitorReg.approvalStatus === "revoked") ? (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
            className="bg-[#131318] border border-red-500/30 rounded-2xl p-8 text-center space-y-4 shadow-xl">
            <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-3xl mx-auto">
              🚫
            </div>
            <h2 className="text-2xl font-black text-white">Visitor Registrations Closed</h2>
            <p className="text-gray-400 text-sm max-w-md mx-auto leading-relaxed">
              Registrations for external visitor passes are currently closed by the event administration.
              Please check back later or contact the helpdesk for more information.
            </p>
            <div className="pt-2">
              <Link href="/" className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-white font-semibold text-sm transition-colors">
                ← Back to Homepage
              </Link>
            </div>
          </motion.div>
        ) : statusLoaded && isSoldOut && !isAdmin && (!existingVisitorReg || existingVisitorReg.approvalStatus === "revoked") ? (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
            className="bg-[#131318] border border-amber-500/30 rounded-2xl p-8 text-center space-y-4 shadow-xl">
            <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-3xl mx-auto">
              🎟️
            </div>
            <h2 className="text-2xl font-black text-white">All {totalCapacity} Visitor Passes Sold Out!</h2>
            <p className="text-gray-400 text-sm max-w-md mx-auto leading-relaxed">
              We have reached maximum capacity of {totalCapacity} visitor tickets for Abheri & Proshow.
              Thank you for the tremendous interest!
            </p>
            <div className="pt-2">
              <Link href="/" className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-white font-semibold text-sm transition-colors">
                ← Back to Homepage
              </Link>
            </div>
          </motion.div>
        ) : null}

        {/* ── STEP 1: Not logged in ─────────────────────────────────────────── */}
        {canRegister && !user && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="bg-[#131318] border border-[rgba(212,163,89,0.2)] rounded-2xl p-8 text-center space-y-5">
            <div className="w-16 h-16 bg-[rgba(212,163,89,0.1)] rounded-full flex items-center justify-center mx-auto text-3xl">&#128274;</div>
            <h2 className="text-xl font-bold text-white">Sign in to Continue</h2>
            <p className="text-gray-400 text-sm">Google Sign-in is required to register as a visitor. This lets us verify your identity and link your registration.</p>
            <button onClick={login}
              className="inline-flex items-center gap-3 bg-white text-gray-900 font-bold px-6 py-3 rounded-xl hover:bg-gray-100 transition-all mx-auto">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </button>
          </motion.div>
        )}

        {/* ── STEP: Checking paid event registration ────────────────────────── */}
        {user && checkingPaidEvent && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="bg-[#131318] border border-[rgba(212,163,89,0.2)] rounded-2xl p-8 text-center">
            <div className="w-10 h-10 border-4 border-[#F3C87A] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-400">Verifying your event registration&hellip;</p>
          </motion.div>
        )}

        {/* ── STEP: Existing Active Visitor Pass ───────────────────────────── */}
        {user && !checkingPaidEvent && existingVisitorReg && existingVisitorReg.approvalStatus !== "revoked" && step !== "done" && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="bg-[#131318] border border-green-500/30 rounded-2xl p-8 text-center space-y-5">
            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto text-3xl">🎟️</div>
            <h2 className="text-xl font-bold text-white">Your Visitor Pass is Active</h2>
            <p className="text-gray-300 text-sm leading-relaxed">
              You already have a confirmed visitor pass for <strong className="text-[#F3C87A]">Abheri &amp; Proshow</strong> at Sparkz 2K26.
            </p>
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-sm text-green-300 space-y-1">
              <p><strong>Pass Validity:</strong> Valid for 08 &amp; 09 Oct</p>
              <p><strong>Status:</strong> Active &amp; Confirmed</p>
              <p className="text-xs text-gray-400 font-mono">ID: {existingVisitorReg.id}</p>
            </div>
            <Link href="/" className="inline-flex items-center gap-2 bg-[#F3C87A] text-[#0B0B0E] font-bold px-6 py-3 rounded-xl hover:bg-[#e6b960] transition-all">
              Back to Home
            </Link>
          </motion.div>
        )}

        {/* ── STEP: Previously Revoked Visitor Pass ────────────────────────── */}
        {user && !checkingPaidEvent && existingVisitorReg && existingVisitorReg.approvalStatus === "revoked" && hasPaidEvent === false && canRegister && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="bg-[#131318] border border-red-500/40 rounded-2xl p-8 text-center space-y-5">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto text-3xl">⚠️</div>
            <h2 className="text-xl font-bold text-red-400">Visitor Pass Eligibility Revoked</h2>
            <p className="text-gray-300 text-sm leading-relaxed">
              Your previous visitor pass for <strong className="text-white">Abheri &amp; Proshow</strong> was revoked because you no longer have a confirmed paid registration for a departmental event.
            </p>
            {existingVisitorReg.revokedReason && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-xs text-red-300">
                <strong>Reason:</strong> {existingVisitorReg.revokedReason}
              </div>
            )}
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-sm text-amber-300">
              Please register for any of the departmental events in Sparkz 2K26.
            </div>
            <Link href="/events"
              className="inline-flex items-center gap-2 bg-[#F3C87A] text-[#0B0B0E] font-bold px-6 py-3 rounded-xl hover:bg-[#e6b960] transition-all">
              Browse &amp; Register for Events &#8594;
            </Link>
          </motion.div>
        )}

        {/* ── STEP: No paid event (and not already shown as revoked) ────────── */}
        {user && !checkingPaidEvent && (!existingVisitorReg || existingVisitorReg.approvalStatus !== "revoked") && hasPaidEvent === false && canRegister && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="bg-[#131318] border border-red-500/30 rounded-2xl p-8 text-center space-y-5">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto text-3xl">&#128683;</div>
            <h2 className="text-xl font-bold text-white">Paid Event Registration Required</h2>
            <p className="text-gray-300 text-sm leading-relaxed">
              To receive a visitor pass for Abheri &amp; Proshow, you must first register and <strong className="text-[#F3C87A]">complete payment</strong> for one Departmental event at Sparkz 2K26.
            </p>
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-sm text-amber-300">
              Please register for any of the departmental events in Sparkz 2K26.
            </div>
            <Link href="/events"
              className="inline-flex items-center gap-2 bg-[#F3C87A] text-[#0B0B0E] font-bold px-6 py-3 rounded-xl hover:bg-[#e6b960] transition-all">
              Browse &amp; Register for Events &#8594;
            </Link>
          </motion.div>
        )}

        {/* ── STEP 1: Rules ─────────────────────────────────────────────────── */}
        {user && !checkingPaidEvent && hasPaidEvent === true && (!existingVisitorReg || existingVisitorReg.approvalStatus === "revoked") && step === "rules" && canRegister && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="bg-[#131318] border border-[rgba(212,163,89,0.2)] rounded-2xl p-6 md:p-8 space-y-6">

            {existingVisitorReg?.approvalStatus === "revoked" && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-xs text-amber-300">
                <strong>Notice:</strong> Your previous visitor pass was revoked. Since you now have a confirmed paid departmental event ({paidEventName}), you may re-register for a new pass below.
              </div>
            )}

            {/* Eligibility badge */}
            <div className="flex items-center gap-3 bg-green-500/10 border border-green-500/30 rounded-xl p-4">
              <span className="text-green-400 text-xl">&#10003;</span>
              <div>
                <p className="text-green-400 font-semibold text-sm">Eligibility Verified</p>
                <p className="text-gray-400 text-xs">
                  {paidEventName ? `Confirmed event: ${paidEventName}` : "Sparkz Departmental Event"}
                </p>
              </div>
            </div>

            {/* Pass Validity Highlight Banner */}
            <div className="bg-[#181824] border border-[#F3C87A]/30 rounded-xl p-4 flex items-center justify-between">
              <div>
                <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Pass Validity</span>
                <div className="text-lg font-bold text-white">08 &amp; 09 Oct (Day 1 - Abheri &amp; Day 2 - Proshow)</div>
              </div>
              <div className="text-right">
                <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Registration Fee</span>
                <div className="text-lg font-bold text-[#F3C87A]">₹{passFee}</div>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-bold text-white mb-1">Rules &amp; Guidelines</h2>
              <p className="text-gray-400 text-xs">Please read and acknowledge all rules before continuing.</p>
            </div>

            <div className="space-y-3">
              {getRulesText(passFee).map((rule, idx) => (
                <label key={idx}
                  className="flex items-start gap-3 p-3 rounded-xl bg-[#0B0B0E]/60 border border-[rgba(212,163,89,0.15)] cursor-pointer hover:border-[rgba(212,163,89,0.4)] transition-colors">
                  <input type="checkbox" checked={checkedRules[idx]}
                    onChange={(e) => {
                      const updated = [...checkedRules];
                      updated[idx] = e.target.checked;
                      setCheckedRules(updated);
                    }}
                    className="mt-1 h-4 w-4 rounded accent-[#F3C87A] cursor-pointer" />
                  <span className="text-gray-300 text-sm leading-relaxed">{rule}</span>
                </label>
              ))}

              {/* Last rule with View Rules hyperlink */}
              <label
                className="flex items-start gap-3 p-3 rounded-xl bg-[#0B0B0E]/60 border border-[rgba(212,163,89,0.15)] cursor-pointer hover:border-[rgba(212,163,89,0.4)] transition-colors">
                <input type="checkbox" checked={checkedRules[RULES_COUNT]}
                  onChange={(e) => {
                    const updated = [...checkedRules];
                    updated[RULES_COUNT] = e.target.checked;
                    setCheckedRules(updated);
                  }}
                  className="mt-1 h-4 w-4 rounded accent-[#F3C87A] cursor-pointer" />
                <span className="text-gray-300 text-sm leading-relaxed">
                  {LAST_RULE_TEXT}{" "}
                  <Link href="/#rules" target="_blank"
                    className="text-[#F3C87A] hover:underline font-semibold ml-1 inline-flex items-center gap-0.5">
                    View Rules &#8599;
                  </Link>
                </span>
              </label>
            </div>

            <button type="button" disabled={!allChecked} onClick={() => setStep("form")}
              className="w-full bg-[#F3C87A] hover:bg-[#e6b960] disabled:opacity-40 disabled:cursor-not-allowed text-[#0B0B0E] font-bold py-4 rounded-xl transition-all duration-200 transform hover:-translate-y-0.5 text-sm uppercase tracking-widest">
              Continue to Registration &#8594;
            </button>
          </motion.div>
        )}

        {/* ── STEP 2: Registration Form ─────────────────────────────────────── */}
        {user && hasPaidEvent === true && step === "form" && canRegister && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="bg-[#131318] border border-[rgba(212,163,89,0.2)] rounded-2xl p-6 md:p-8 space-y-6">

            <div className="flex items-center justify-between border-b border-[rgba(212,163,89,0.15)] pb-4">
              <div>
                <h2 className="text-xl font-bold text-white">Visitor Pass Registration</h2>
                <p className="text-gray-400 text-xs">Fill in your information accurately. Details will be checked at the entrance gate.</p>
              </div>
              <button type="button" onClick={() => setStep("rules")} className="text-xs text-[#F3C87A] hover:underline">&#8592; Back to Rules</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Personal Details */}
              <div>
                <h3 className="text-[#F3C87A] font-bold text-sm uppercase tracking-widest mb-4 border-b border-[rgba(212,163,89,0.15)] pb-2">Your Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Full Name *</label>
                    <input type="text" placeholder="Your full name" value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass("name")} />
                    {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Phone Number *</label>
                    <input type="tel" placeholder="10-digit mobile" value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputClass("phone")} maxLength={10} />
                    {errors.phone && <p className="text-red-400 text-xs mt-1">{errors.phone}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Your College *</label>
                    <input type="text" placeholder="College name" value={form.college}
                      onChange={(e) => setForm({ ...form, college: e.target.value })} className={inputClass("college")} />
                    {errors.college && <p className="text-red-400 text-xs mt-1">{errors.college}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Your Department *</label>
                    <input type="text" placeholder="e.g. Computer Science" value={form.department}
                      onChange={(e) => setForm({ ...form, department: e.target.value })} className={inputClass("department")} />
                    {errors.department && <p className="text-red-400 text-xs mt-1">{errors.department}</p>}
                  </div>

                  {/* Visitor's Year of Study */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-1">Your Year of Study *</label>
                    <select
                      value={form.yearOfStudy}
                      onChange={(e) => setForm({ ...form, yearOfStudy: e.target.value })}
                      className={inputClass("yearOfStudy")}
                    >
                      <option value="">Select your year of study</option>
                      {YEAR_OPTIONS.map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                    {errors.yearOfStudy && <p className="text-red-400 text-xs mt-1">{errors.yearOfStudy}</p>}
                  </div>
                </div>

                {/* Visitor College ID upload */}
                <div className="mt-4">
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-sm text-amber-300 mb-3">
                    <strong>Required:</strong> Upload your College ID card (photo or scanned copy).
                  </div>
                  <FileInput
                    label="Your College ID *"
                    hint="JPG, PNG, WEBP or PDF — max 5 MB"
                    file={collegeIdFile} setFile={setCollegeIdFile}
                    inputRef={collegeIdRef} errorKey="collegeId" errors={errors}
                  />
                </div>
              </div>

              {/* Referring Person */}
              <div>
                <h3 className="text-[#F3C87A] font-bold text-sm uppercase tracking-widest mb-4 border-b border-[rgba(212,163,89,0.15)] pb-2">
                  Who is Referring You? *
                </h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  {(["student", "faculty"] as const).map((type) => (
                    <button key={type} type="button" onClick={() => setForm({ ...form, referringType: type, referringYear: "" })}
                      className={`py-3 px-4 rounded-xl border font-semibold capitalize transition-all ${form.referringType === type
                          ? "bg-[#F3C87A] border-[#F3C87A] text-[#0B0B0E]"
                          : "border-[rgba(212,163,89,0.3)] text-gray-300 hover:border-[#F3C87A] hover:text-[#F3C87A]"
                        }`}>
                      {type === "student" ? "🎓 Student" : "👨‍🏫 Faculty"}
                    </button>
                  ))}
                </div>
                {errors.referringType && <p className="text-red-400 text-xs mb-3">{errors.referringType}</p>}

                <AnimatePresence>
                  {form.referringType && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                      className="space-y-4 bg-[#0B0B0E]/50 border border-[rgba(212,163,89,0.15)] rounded-xl p-4">

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">
                            {form.referringType === "student" ? "Student" : "Faculty"} Full Name *
                          </label>
                          <input type="text" placeholder="Their full name" value={form.referringName}
                            onChange={(e) => setForm({ ...form, referringName: e.target.value })} className={inputClass("referringName")} />
                          {errors.referringName && <p className="text-red-400 text-xs mt-1">{errors.referringName}</p>}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">
                            {form.referringType === "student" ? "Student" : "Faculty"} Department *
                          </label>
                          <input type="text" placeholder="e.g. Mechanical Engineering" value={form.referringDepartment}
                            onChange={(e) => setForm({ ...form, referringDepartment: e.target.value })} className={inputClass("referringDepartment")} />
                          {errors.referringDepartment && <p className="text-red-400 text-xs mt-1">{errors.referringDepartment}</p>}
                        </div>

                        {/* Year of study — only for student */}
                        {form.referringType === "student" && (
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-300 mb-1">Student&apos;s Year of Study *</label>
                            <select value={form.referringYear} onChange={(e) => setForm({ ...form, referringYear: e.target.value })} className={inputClass("referringYear")}>
                              <option value="">Select year</option>
                              {YEAR_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
                            </select>
                            {errors.referringYear && <p className="text-red-400 text-xs mt-1">{errors.referringYear}</p>}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Pricing & Validity Card */}
              <div className="bg-[#181824] border border-[#F3C87A]/30 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-bold text-sm">Visitor Pass Registration Fee:</span>
                    <span className="text-[#F3C87A] font-extrabold text-xl">₹{passFee}</span>
                  </div>
                  <p className="text-xs text-emerald-400 font-semibold mt-1">
                    ✓ Valid for 08 &amp; 09 Oct (Day 1: Abheri &bull; Day 2: Proshow)
                  </p>
                </div>
                <div className="text-xs text-gray-400 font-mono sm:text-right">
                  Secure Online Payment
                </div>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-xs text-blue-300">
                ID documents are stored securely and are only accessible to authorized administrators. After successful payment &amp; registration, your confirmation email will be sent automatically.
              </div>

              {errors.submit && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm">{errors.submit}</div>
              )}

              <button type="submit" disabled={submitting}
                className="w-full bg-[#F3C87A] hover:bg-[#e6b960] disabled:opacity-60 disabled:cursor-not-allowed text-[#0B0B0E] font-bold py-4 rounded-xl transition-all duration-200 transform hover:-translate-y-0.5 text-sm uppercase tracking-widest shadow-lg">
                {submitting
                  ? (submittingStatus || "Processing... Please wait")
                  : `Pay ₹${passFee} & Grab Your Ticket`}
              </button>
            </form>
          </motion.div>
        )}
      </div>
    </div>
  );
}
