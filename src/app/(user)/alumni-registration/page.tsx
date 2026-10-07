"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { Check, X, Loader2 } from "lucide-react";

interface AlumniFormState {
  department: string;
  passedOutYear: string;
  contact: string;
}

interface ExistingAlumniReg {
  id: string;
  name: string;
  department?: string;
  passedOutYear: number | string;
  batch?: string;
  contact: string;
  email: string;
  status?: string;
  emailStatus?: string;
  createdAt?: { seconds: number } | null;
}

const departmentOptions = [
  "Civil Engineering",
  "Computer Engineering",
  "Mechanical Engineering",
  "Electrical Engineering",
];

// Passout year options from 2018 to 2025
const yearOptions = ["2025", "2024", "2023", "2022", "2021", "2020", "2019", "2018"];

export default function AlumniRegistrationPage() {
  const { user, loading: authLoading, login } = useAuth();
  const [form, setForm] = useState<AlumniFormState>({
    department: "",
    passedOutYear: "",
    contact: "",
  });
  const [existingReg, setExistingReg] = useState<ExistingAlumniReg | null>(null);
  const [checkingExisting, setCheckingExisting] = useState<boolean>(true);
  const [registrationOpen, setRegistrationOpen] = useState<boolean>(true);
  const [totalCapacity, setTotalCapacity] = useState<number>(200);
  const [activeCount, setActiveCount] = useState<number>(0);
  const [isFull, setIsFull] = useState<boolean>(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; emailSent?: boolean; id?: string } | null>(null);

  // Check registration status & check if current user is already registered as alumni
  useEffect(() => {
    // 1. Fetch registration open / closed status and capacity limits
    fetch("/api/alumni-registration/toggle-status")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          if (typeof data.registrationOpen === "boolean") {
            setRegistrationOpen(data.registrationOpen);
          }
          if (typeof data.totalCapacity === "number") {
            setTotalCapacity(data.totalCapacity);
          }
          if (typeof data.activeCount === "number") {
            setActiveCount(data.activeCount);
          }
          if (typeof data.isFull === "boolean") {
            setIsFull(data.isFull);
          }
        }
      })
      .catch((err) => console.warn("Failed to check alumni registration status:", err));

    if (!user) {
      setCheckingExisting(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const token = await user.getIdToken(true);
        const response = await fetch("/api/alumni-registration/check", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        const data = await response.json().catch(() => ({}));
        if (cancelled) return;
        if (data.success && data.registered && data.registration) {
          setExistingReg(data.registration);
        }
      } catch (err) {
        if (!cancelled) console.warn("Failed to check existing alumni registration:", err);
      } finally {
        if (!cancelled) setCheckingExisting(false);
      }
    })();
    return () => { cancelled = true; };

  }, [user]);

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.department.trim()) e.department = "Department is required.";
    if (!form.passedOutYear || isNaN(Number(form.passedOutYear))) e.passedOutYear = "Passed out year is required.";
    if (!/^\d{10}$/.test(form.contact.trim())) e.contact = "Enter a valid 10-digit contact number.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    if (!user) {
      setErrors({ submit: "Please log in with Google to register." });
      return;
    }
    if (!user.providerData.some((provider) => provider.providerId === "google.com")) {
      setErrors({ submit: "Only Google authentication is allowed for alumni registration." });
      return;
    }

    setSubmitting(true);
    try {
      let token = "";
      try {
        token = await user.getIdToken();
      } catch (tokenErr) {
        console.warn("Failed to retrieve ID token:", tokenErr);
      }

      if (!token) {
        throw new Error("Unable to authenticate with Google. Please log in again.");
      }

      const res = await fetch("/api/alumni-registration/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          department: form.department,
          passedOutYear: form.passedOutYear,
          contact: form.contact.trim(),
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
          body: JSON.stringify({
            registrationId,
            name: data.name || user.email,
            email: user.email,
            department: form.department,
            passedOutYear: form.passedOutYear,
            contact: form.contact.trim(),
          }),
        });
        emailSent = (await emailRes.json()).success === true;
      } catch {
        console.warn("Alumni email failed");
      }

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

  if (authLoading || checkingExisting) {
    return (
      <div className="min-h-screen bg-[#0B0B0E] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#F3C87A] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── 1. Require Google Login if not logged in ────────────────────────────────
  if (!user) {
    return (
      <div className="min-h-screen bg-[#0B0B0E] py-16 px-4 flex items-center justify-center">
        <div className="pointer-events-none fixed left-[-10%] top-[20%] h-96 w-96 rounded-full bg-[#3A270D]/45 blur-[140px]" />
        <div className="pointer-events-none fixed right-[-5%] top-[30%] h-96 w-96 rounded-full bg-[#3A270D]/35 blur-[150px]" />

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 max-w-md w-full bg-[#131318] border border-[rgba(212,163,89,0.3)] rounded-2xl p-8 text-center space-y-6 shadow-2xl"
        >
          <div className="w-20 h-20 bg-[#F3C87A]/10 border border-[#F3C87A]/30 rounded-full flex items-center justify-center mx-auto text-4xl shadow-inner">
            🎓
          </div>

          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(212,163,89,0.3)] bg-[#181824] px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-[#F3C87A] mb-3">
              Sparkz 2K26
            </div>
            <h1 className="text-3xl font-black text-white">Alumni Registration</h1>
            <p className="text-gray-400 text-sm mt-3 leading-relaxed">
              To register as an alumnus, please log in with your Google account. Only verified Google accounts can register.
            </p>
          </div>

          <button
            onClick={() => login()}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-100 text-gray-900 font-bold py-3.5 px-4 rounded-xl transition-all shadow-md text-sm"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            Sign in with Google
          </button>

          <div className="pt-2">
            <Link href="/" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
              ← Back to Home
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── 1.5 Require Google authentication, not another Firebase provider ──────
  if (user && !user.providerData.some((provider) => provider.providerId === "google.com")) {
    return (
      <div className="min-h-screen bg-[#0B0B0E] py-16 px-4 flex items-center justify-center">
        <div className="relative z-10 max-w-md w-full bg-[#131318] border border-red-500/30 rounded-2xl p-8 text-center space-y-5 shadow-2xl">
          <div className="text-4xl">🔐</div>
          <h1 className="text-2xl font-black text-white">Google Sign-in Required</h1>
          <p className="text-gray-400 text-sm">Please sign out and sign in with Google before registering as an alumnus.</p>
          <button onClick={() => login()} className="w-full bg-[#F3C87A] text-[#0B0B0E] font-bold py-3 rounded-xl">Continue with Google</button>
        </div>
      </div>
    );
  }

  // ── 2. Show Registration Closed screen if turned off and user has no record ──
  if (!registrationOpen && (!existingReg || existingReg.status === "deregistered")) {
    return (
      <div className="min-h-screen bg-[#0B0B0E] py-16 px-4 flex items-center justify-center">
        <div className="pointer-events-none fixed left-[-10%] top-[20%] h-96 w-96 rounded-full bg-[#3A270D]/45 blur-[140px]" />
        <div className="pointer-events-none fixed right-[-5%] top-[30%] h-96 w-96 rounded-full bg-[#3A270D]/35 blur-[150px]" />

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 max-w-lg w-full bg-[#131318] border border-[rgba(212,163,89,0.3)] rounded-2xl p-8 text-center space-y-6 shadow-2xl"
        >
          <div className="w-20 h-20 bg-amber-500/10 border border-amber-500/30 rounded-full flex items-center justify-center mx-auto text-4xl shadow-inner">
            ⏸️
          </div>

          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-red-500/40 bg-red-500/15 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-red-400 mb-3">
              <span className="w-2 h-2 rounded-full bg-red-400" />
              Registrations Closed
            </div>
            <h1 className="text-3xl font-black text-white">Alumni Registration is Currently Closed</h1>
            <p className="text-gray-400 text-sm mt-3 leading-relaxed">
              Online alumni registration for <strong className="text-[#F3C87A]">Sparkz 2K26</strong> has been closed by the event administration. Please contact the alumni desk or visit the campus during the fest for assistance.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <Link
              href="/"
              className="inline-flex items-center justify-center flex-1 bg-[#F3C87A] text-[#0B0B0E] font-bold py-3 rounded-xl hover:bg-[#e6b960] transition-colors text-sm"
            >
              Back to Home
            </Link>
            <Link
              href="/events"
              className="inline-flex items-center justify-center flex-1 bg-[#1f1f2c] border border-gray-700 text-white font-semibold py-3 rounded-xl hover:bg-gray-800 transition-colors text-sm"
            >
              Explore Events
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── 2.5 Show Registration Full screen if capacity limit is reached ─────────
  if (isFull && (!existingReg || existingReg.status === "deregistered")) {
    return (
      <div className="min-h-screen bg-[#0B0B0E] py-16 px-4 flex items-center justify-center">
        <div className="pointer-events-none fixed left-[-10%] top-[20%] h-96 w-96 rounded-full bg-[#3A270D]/45 blur-[140px]" />
        <div className="pointer-events-none fixed right-[-5%] top-[30%] h-96 w-96 rounded-full bg-[#3A270D]/35 blur-[150px]" />

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 max-w-lg w-full bg-[#131318] border border-amber-500/30 rounded-2xl p-8 text-center space-y-6 shadow-2xl"
        >
          <div className="w-20 h-20 bg-amber-500/10 border border-amber-500/30 rounded-full flex items-center justify-center mx-auto text-4xl shadow-inner">
            🎟️
          </div>

          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/15 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-amber-400 mb-3">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              Registration Limit Reached
            </div>
            <h1 className="text-3xl font-black text-white">Alumni Registrations Full</h1>
            <p className="text-gray-400 text-sm mt-3 leading-relaxed">
              All <strong className="text-[#F3C87A]">{totalCapacity}</strong> alumni registration spots for <strong className="text-white">Sparkz 2K26</strong> have been filled. Online registrations are now closed.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <Link
              href="/"
              className="inline-flex items-center justify-center flex-1 bg-[#F3C87A] text-[#0B0B0E] font-bold py-3 rounded-xl hover:bg-[#e6b960] transition-colors text-sm"
            >
              Back to Home
            </Link>
            <Link
              href="/events"
              className="inline-flex items-center justify-center flex-1 bg-[#1f1f2c] border border-gray-700 text-white font-semibold py-3 rounded-xl hover:bg-gray-800 transition-colors text-sm"
            >
              Explore Events
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── 3. Show already registered pass screen ──────────────────────────────────
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
              <span className="text-gray-400 text-xs">Registered Account</span>
              <span className="text-white font-mono text-xs">{existingReg.name}</span>
            </div>
            {existingReg.department && (
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-xs">Department</span>
                <span className="text-white">{existingReg.department}</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-xs">Passed Out Year</span>
              <span className="text-white">{existingReg.passedOutYear}</span>
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

  // ── 4. Success Screen ───────────────────────────────────────────────────────
  if (result?.success) {
    return (
      <div className="min-h-screen bg-[#0B0B0E] flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-[#131318] border border-[rgba(212,163,89,0.3)] rounded-2xl p-8 text-center">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">&#x1F393;</div>
          <h2 className="text-2xl font-bold text-white mb-2">Registration Successful!</h2>
          <p className="text-gray-400 mb-4">Your alumni registration for Sparkz 2K26 has been submitted. Welcome back!</p>
          {result.emailSent ? (
            <p className="text-sm text-green-400 mb-6">A confirmation email has been sent to your Google account ({user.email}).</p>
          ) : (
            <p className="text-sm text-yellow-400 mb-6">Registration saved securely with account {user.email}.</p>
          )}
          <Link href="/" className="inline-flex items-center gap-2 bg-[#F3C87A] text-[#0B0B0E] font-bold px-6 py-3 rounded-full hover:bg-[#e6b960] transition-colors">
            Back to Home
          </Link>
        </motion.div>
      </div>
    );
  }

  // ── 5. Main Registration Form (Google Logged-in Candidates) ─────────────────
  return (
    <div className="min-h-screen bg-[#0B0B0E] py-12 px-4">
      <div className="pointer-events-none fixed left-[-10%] top-[20%] h-96 w-96 rounded-full bg-[#3A270D]/45 blur-[140px]" />
      <div className="pointer-events-none fixed right-[-5%] top-[30%] h-96 w-96 rounded-full bg-[#3A270D]/35 blur-[150px]" />
      <div className="relative z-10 max-w-lg mx-auto">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-[#F3C87A] text-sm mb-6 hover:underline">Back to Home</Link>
          <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(212,163,89,0.25)] bg-[#131318]/80 px-4 py-2 text-[13px] font-bold uppercase tracking-widest text-[#F3C87A] backdrop-blur mb-4">
            <span className="h-2 w-2 rounded-full bg-[#F3C87A] animate-pulse" />Sparkz 2K26
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white mb-2">Alumni Registration</h1>
          <p className="text-gray-400 text-sm">Register as a passed-out alumnus of Carmel College</p>
          {totalCapacity > 0 && (
            <p className="text-xs text-[#F3C87A] mt-2 font-medium">
              Limited to {totalCapacity} attendees &bull; {Math.max(0, totalCapacity - activeCount)} spots left
            </p>
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-[#131318] border border-[rgba(212,163,89,0.2)] rounded-2xl p-6 md:p-8">

          {/* ── Verified Google Account Identity Card ────────────────────── */}
          <div className="bg-[#181824] border border-[rgba(212,163,89,0.25)] rounded-xl p-3.5 mb-6 flex items-center justify-between gap-3 shadow-inner">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-full bg-[#F3C87A]/20 border border-[#F3C87A]/40 flex items-center justify-center text-[#F3C87A] font-bold text-sm flex-shrink-0">
                {user.email?.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-white text-xs font-semibold truncate">{user.email}</p>
                <p className="text-gray-400 text-[11px] truncate">Google Account (Registered Identity)</p>
              </div>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 rounded-full flex-shrink-0">
              Verified
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <h3 className="text-[#F3C87A] font-bold text-xs uppercase tracking-widest mb-4 border-b border-[rgba(212,163,89,0.15)] pb-2">
                Alumni Details
              </h3>

              <div className="space-y-4">
                {/* Department Dropdown */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Department *</label>
                  <select
                    value={form.department}
                    onChange={(e) => setForm({ ...form, department: e.target.value })}
                    className={inputClass("department")}
                  >
                    <option value="">Select department</option>
                    {departmentOptions.map((dept) => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                  {errors.department && <p className="text-red-400 text-xs mt-1">{errors.department}</p>}
                </div>

                {/* Passed Out Year Dropdown */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Passed Out Year *</label>
                  <select
                    value={form.passedOutYear}
                    onChange={(e) => setForm({ ...form, passedOutYear: e.target.value })}
                    className={inputClass("passedOutYear")}
                  >
                    <option value="">Select year</option>
                    {yearOptions.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                  {errors.passedOutYear && <p className="text-red-400 text-xs mt-1">{errors.passedOutYear}</p>}
                </div>

                {/* Contact Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Contact Number *</label>
                  <input
                    type="tel"
                    placeholder="10-digit mobile number"
                    value={form.contact}
                    onChange={(e) => setForm({ ...form, contact: e.target.value })}
                    className={inputClass("contact")}
                    maxLength={10}
                  />
                  {errors.contact && <p className="text-red-400 text-xs mt-1">{errors.contact}</p>}
                </div>
              </div>
            </div>

            {errors.submit && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm">
                {errors.submit}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-[#F3C87A] hover:bg-[#e6b960] disabled:opacity-60 disabled:cursor-not-allowed text-[#0B0B0E] font-bold py-3.5 rounded-xl transition-all duration-200 transform hover:-translate-y-0.5 text-sm uppercase tracking-widest shadow-lg"
            >
              {submitting ? "Submitting Registration..." : "Complete Alumni Registration"}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
