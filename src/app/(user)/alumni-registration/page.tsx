"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

interface FormState {
  name: string;
  passedOutYear: string;
  batch: string;
  contact: string;
  email: string;
}

interface ExistingAlumniReg {
  id: string;
  name: string;
  passedOutYear: number | string;
  batch: string;
  contact: string;
  email: string;
  status?: string;
  emailStatus?: string;
  createdAt?: { seconds: number } | null;
}

const currentYear = new Date().getFullYear();
const yearOptions = Array.from({ length: 20 }, (_, i) => String(currentYear - i));

export default function AlumniRegistrationPage() {
  const { user, userData } = useAuth();
  const [form, setForm] = useState<FormState>({
    name: "", passedOutYear: "", batch: "", contact: "", email: "",
  });
  const [existingReg, setExistingReg] = useState<ExistingAlumniReg | null>(null);
  const [checkingExisting, setCheckingExisting] = useState<boolean>(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; emailSent?: boolean; id?: string } | null>(null);

  // Check if current user is already registered as alumni
  useEffect(() => {
    if (userData?.name || user?.displayName) {
      setForm((f) => ({ ...f, name: f.name || userData?.name || user?.displayName || "" }));
    }
    if (user?.email) {
      setForm((f) => ({ ...f, email: f.email || user.email || "" }));
    }

    if (!user) {
      setCheckingExisting(false);
      return;
    }

    const checkParams = new URLSearchParams();
    if (user.uid) checkParams.set("userId", user.uid);
    if (user.email) checkParams.set("email", user.email);

    fetch(`/api/alumni-registration/check?${checkParams.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.registered && data.registration) {
          setExistingReg(data.registration);
        }
      })
      .catch((err) => console.warn("Failed to check existing alumni registration:", err))
      .finally(() => setCheckingExisting(false));
  }, [user, userData]);

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Full name is required.";
    if (!form.passedOutYear || isNaN(Number(form.passedOutYear))) e.passedOutYear = "Passed out year is required.";
    if (!form.batch.trim()) e.batch = "Batch is required (e.g. 2021-2025).";
    if (!/^\d{10}$/.test(form.contact.trim())) e.contact = "Enter a valid 10-digit contact number.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = "Enter a valid email address.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/alumni-registration/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          userId: user?.uid || null,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Registration failed.");

      const registrationId: string = data.id;
      let emailSent = false;
      try {
        const emailRes = await fetch("/api/alumni-registration/send-confirmation-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, registrationId }),
        });
        emailSent = (await emailRes.json()).success === true;
      } catch { console.warn("Alumni email failed"); }

      setResult({ success: true, emailSent, id: registrationId });
    } catch (err: unknown) {
      const e = err as { message?: string };
      setErrors({ submit: e?.message || "Registration failed. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = (field: string) =>
    `w-full bg-[#131318] border ${errors[field] ? "border-red-500" : "border-[rgba(212,163,89,0.2)]"} text-white placeholder-gray-500 px-4 py-3 rounded-xl focus:outline-none focus:border-[#F3C87A] transition-colors`;

  if (checkingExisting) {
    return (
      <div className="min-h-screen bg-[#0B0B0E] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#F3C87A] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── Show already registered screen ──────────────────────────────────────────
  if (existingReg && existingReg.status !== "deregistered") {
    return (
      <div className="min-h-screen bg-[#0B0B0E] py-12 px-4 flex items-center justify-center">
        <div className="pointer-events-none fixed left-[-10%] top-[20%] h-96 w-96 rounded-full bg-[#3A270D]/45 blur-[140px]" />
        <div className="pointer-events-none fixed right-[-5%] top-[30%] h-96 w-96 rounded-full bg-[#3A270D]/35 blur-[150px]" />

        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 max-w-lg w-full bg-[#131318] border border-[rgba(212,163,89,0.3)] rounded-2xl p-8 text-center space-y-6 shadow-2xl">
          <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto text-4xl shadow-inner">
            🎓
          </div>

          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-emerald-400 mb-3">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Already Registered
            </div>
            <h1 className="text-3xl font-black text-white">Welcome Back, Alumnus!</h1>
            <p className="text-gray-400 text-sm mt-2">
              Your alumni registration for <strong className="text-[#F3C87A]">Sparkz 2K26</strong> is confirmed and on record.
            </p>
          </div>

          {/* Details Card */}
          <div className="bg-[#181824] border border-gray-800 rounded-xl p-5 text-left text-sm space-y-2.5 shadow-inner">
            <div className="flex justify-between items-center border-b border-gray-800 pb-2">
              <span className="text-gray-400 text-xs font-medium">Registration ID</span>
              <span className="text-[#F3C87A] font-mono font-bold text-xs">{existingReg.id}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-xs">Name</span>
              <span className="text-white font-semibold">{existingReg.name}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-xs">Batch</span>
              <span className="text-white">{existingReg.batch}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-xs">Passed Out Year</span>
              <span className="text-white">{existingReg.passedOutYear}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-xs">Email</span>
              <span className="text-white font-mono text-xs">{existingReg.email}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-xs">Contact</span>
              <span className="text-white font-mono text-xs">{existingReg.contact}</span>
            </div>
            <div className="flex justify-between items-center pt-1 border-t border-gray-800/80">
              <span className="text-gray-400 text-xs">Email Confirmation</span>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                existingReg.emailStatus === "sent"
                  ? "bg-green-500/20 text-green-300 border border-green-500/30"
                  : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
              }`}>
                {existingReg.emailStatus === "sent" ? "Delivered" : "Pending"}
              </span>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <Link href="/" className="inline-flex items-center justify-center flex-1 bg-[#F3C87A] text-[#0B0B0E] font-bold py-3 rounded-xl hover:bg-[#e6b960] transition-colors text-sm">
              Back to Home
            </Link>
            <Link href="/events" className="inline-flex items-center justify-center flex-1 bg-[#1f1f2c] border border-gray-700 text-white font-semibold py-3 rounded-xl hover:bg-gray-800 transition-colors text-sm">
              Explore Events
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  if (result?.success) {
    return (
      <div className="min-h-screen bg-[#0B0B0E] flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-[#131318] border border-[rgba(212,163,89,0.3)] rounded-2xl p-8 text-center">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">&#x1F393;</div>
          <h2 className="text-2xl font-bold text-white mb-2">Registration Successful!</h2>
          <p className="text-gray-400 mb-4">Your alumni registration for Sparkz 2K26 has been submitted. Welcome back!</p>
          {result.emailSent ? (
            <p className="text-sm text-green-400 mb-6">A confirmation email has been sent to your email address.</p>
          ) : (
            <p className="text-sm text-yellow-400 mb-6">Registration saved. Confirmation email could not be sent at this time.</p>
          )}
          <Link href="/" className="inline-flex items-center gap-2 bg-[#F3C87A] text-[#0B0B0E] font-bold px-6 py-3 rounded-full hover:bg-[#e6b960] transition-colors">
            Back to Home
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0B0E] py-12 px-4">
      <div className="pointer-events-none fixed left-[-10%] top-[20%] h-96 w-96 rounded-full bg-[#3A270D]/45 blur-[140px]" />
      <div className="pointer-events-none fixed right-[-5%] top-[30%] h-96 w-96 rounded-full bg-[#3A270D]/35 blur-[150px]" />
      <div className="relative z-10 max-w-xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <Link href="/" className="inline-flex items-center gap-2 text-[#F3C87A] text-sm mb-6 hover:underline">Back to Home</Link>
          <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(212,163,89,0.25)] bg-[#131318]/80 px-4 py-2 text-[13px] font-bold uppercase tracking-widest text-[#F3C87A] backdrop-blur mb-4">
            <span className="h-2 w-2 rounded-full bg-[#F3C87A] animate-pulse" />Sparkz 2K26
          </div>
          <h1 className="text-4xl font-black text-white mb-2">Alumni Registration</h1>
          <p className="text-gray-400">Register as a passed-out alumnus of our college</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-[#131318] border border-[rgba(212,163,89,0.2)] rounded-2xl p-6 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <h3 className="text-[#F3C87A] font-bold text-sm uppercase tracking-widest mb-4 border-b border-[rgba(212,163,89,0.15)] pb-2">Alumni Details</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Full Name *</label>
                  <input type="text" placeholder="Your full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass("name")} />
                  {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Passed Out Year *</label>
                    <select value={form.passedOutYear} onChange={(e) => setForm({ ...form, passedOutYear: e.target.value })} className={inputClass("passedOutYear")}>
                      <option value="">Select year</option>
                      {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
                    </select>
                    {errors.passedOutYear && <p className="text-red-400 text-xs mt-1">{errors.passedOutYear}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Batch *</label>
                    <input type="text" placeholder="e.g. 2021-2025" value={form.batch} onChange={(e) => setForm({ ...form, batch: e.target.value })} className={inputClass("batch")} />
                    {errors.batch && <p className="text-red-400 text-xs mt-1">{errors.batch}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Contact Number *</label>
                    <input type="tel" placeholder="10-digit number" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} className={inputClass("contact")} maxLength={10} />
                    {errors.contact && <p className="text-red-400 text-xs mt-1">{errors.contact}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Email Address *</label>
                    <input type="email" placeholder="your@email.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputClass("email")} />
                    {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
                  </div>
                </div>
              </div>
            </div>

            {errors.submit && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm">{errors.submit}</div>
            )}

            <button type="submit" disabled={submitting}
              className="w-full bg-[#F3C87A] hover:bg-[#e6b960] disabled:opacity-60 disabled:cursor-not-allowed text-[#0B0B0E] font-bold py-4 rounded-xl transition-all duration-200 transform hover:-translate-y-0.5 text-sm uppercase tracking-widest">
              {submitting ? "Submitting... Please wait" : "Submit Alumni Registration"}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
