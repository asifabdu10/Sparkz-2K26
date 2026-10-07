"use client";
import { useEffect, useState, useMemo } from "react";
import { collection, getDocs, query, orderBy, doc, getDoc } from "firebase/firestore";
import { db } from "@/utils/firebase";
import {
  Loader2,
  Download,
  Search,
  Mail,
  UserX,
  UserCheck,
  Trash2,
  Pencil,
  ToggleLeft,
  ToggleRight,
  ShieldAlert,
  Check,
  X,
  RefreshCw,
  ExternalLink,
  Eye,
} from "lucide-react";
import * as XLSX from "xlsx";
import {
  getAdminAlumniRegistrations,
  updateCachedAdminAlumni,
  removeCachedAdminAlumni,
} from "@/utils/firestoreCache";
import { toastError, toastSuccess } from "@/utils/common/Toast";
import { useAuth } from "@/context/AuthContext";
import { auth } from "@/utils/firebase";

const DEPARTMENT_OPTIONS = [
  "Civil Engineering",
  "Computer Engineering",
  "Mechanical Engineering",
  "Electrical Engineering",
] as const;

const YEAR_OPTIONS = [2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018];
const REFERRING_YEAR_OPTIONS = ["1st Year", "2nd Year", "3rd Year", "4th Year", "Other"];

interface AlumniRegistration {
  id: string;
  userId?: string;
  name: string;
  department?: string;
  passedOutYear: number;
  batch?: string;
  contact: string;
  email: string;
  status?: "registered" | "deregistered";
  emailStatus?: string;
  alumniIdFileId?: string;
  alumniIdFileUrl?: string;
  idProofUrl?: string;
  referringType?: "student" | "faculty" | string;
  referringName?: string;
  referringDepartment?: string;
  referringYear?: string;
  referringIdFileId?: string;
  referringIdFileUrl?: string;
  createdAt: { seconds: number; nanoseconds: number } | null;
}

export default function AlumniRegistrationsAdmin() {
  const { user, userData } = useAuth();
  const [registrations, setRegistrations] = useState<AlumniRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [proofLoading, setProofLoading] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [deregisteringId, setDeregisteringId] = useState<string | null>(null);
  const [bulkSending, setBulkSending] = useState(false);

  // Registration ON/OFF state (Super Admin only)
  const [registrationOpen, setRegistrationOpen] = useState<boolean>(true);
  const [statusLoading, setStatusLoading] = useState(false);

  // Registration Capacity / Limit state (Super Admin only)
  const [totalCapacity, setTotalCapacity] = useState<number>(200);
  const [capacityInput, setCapacityInput] = useState<string>("200");
  const [isEditingCapacity, setIsEditingCapacity] = useState<boolean>(false);
  const [savingCapacity, setSavingCapacity] = useState<boolean>(false);

  // Edit Modal State
  const [editingReg, setEditingReg] = useState<AlumniRegistration | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editForm, setEditForm] = useState<{
    name: string;
    department: string;
    passedOutYear: number;
    contact: string;
    email: string;
    status: "registered" | "deregistered";
    emailStatus: string;
    batch: string;
    referringType: "student" | "faculty";
    referringName: string;
    referringDepartment: string;
    referringYear: string;
  }>({
    name: "",
    department: "Computer Engineering",
    passedOutYear: 2025,
    contact: "",
    email: "",
    status: "registered",
    emailStatus: "pending",
    batch: "",
    referringType: "student",
    referringName: "",
    referringDepartment: "",
    referringYear: "",
  });

  const defaultSuperAdminEmails = ["asifabdulla1234@gmail.com", "joeljoy1237@gmail.com"];
  const envEmails = (process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const superAdminEmails = Array.from(new Set([...defaultSuperAdminEmails, ...envEmails]));

  const currentEmail = user?.email?.toLowerCase().trim() || "";
  const isSuperAdmin =
    userData?.role === "superAdmin" ||
    (Boolean(currentEmail) && superAdminEmails.includes(currentEmail));

  useEffect(() => {
    fetchRegistrations();
    fetchRegistrationStatus();
  }, []);

  const fetchRegistrations = async (forceRefresh = false) => {
    try {
      setLoading(true);
      const data = (await getAdminAlumniRegistrations(forceRefresh)) as AlumniRegistration[];
      setRegistrations(data);
    } catch (error) {
      console.error("Error fetching alumni registrations:", error);
      toastError("Failed to fetch alumni registrations");
    } finally {
      setLoading(false);
    }
  };

  const fetchRegistrationStatus = async () => {
    try {
      const snap = await getDoc(doc(db, "eventSettings", "alumni"));
      if (snap.exists()) {
        const data = snap.data();
        if (typeof data?.registrationOpen === "boolean") {
          setRegistrationOpen(data.registrationOpen);
        }
        if (typeof data?.totalCapacity === "number" && data.totalCapacity > 0) {
          setTotalCapacity(data.totalCapacity);
          setCapacityInput(String(data.totalCapacity));
        }
      }
    } catch (err) {
      console.warn("Could not fetch alumni registration status:", err);
    }
  };

  const handleToggleRegistration = async () => {
    if (!isSuperAdmin) {
      toastError("Only Super Admin can turn alumni registrations ON or OFF.");
      return;
    }

    const nextState = !registrationOpen;
    const confirmMessage = nextState
      ? "Turn ON Alumni Registration?\n\nPublic alumni candidates will be able to register on the website."
      : "Turn OFF Alumni Registration?\n\nPublic alumni candidates will see a closed notice and will NOT be able to submit new registrations.";

    if (!window.confirm(confirmMessage)) return;

    setStatusLoading(true);
    try {
      let token = "";
      if (user) {
        try {
          token = await user.getIdToken();
        } catch (e) {
          console.warn("Could not get ID token:", e);
        }
      }

      const res = await fetch("/api/alumni-registration/toggle-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ registrationOpen: nextState, firebaseIdToken: token }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to update registration status");

      setRegistrationOpen(nextState);
      toastSuccess(
        nextState ? "Alumni registrations are now OPEN!" : "Alumni registrations are now CLOSED."
      );
    } catch (err: any) {
      console.error("Error toggling registration status:", err);
      toastError(err?.message || "Failed to toggle registration status.");
    } finally {
      setStatusLoading(false);
    }
  };

  const handleSaveCapacity = async () => {
    if (!isSuperAdmin) {
      toastError("Only Super Admin can change the alumni registration limit.");
      return;
    }

    const parsed = Number(capacityInput);
    if (isNaN(parsed) || parsed < 1) {
      toastError("Please enter a valid registration limit (minimum 1).");
      return;
    }

    setSavingCapacity(true);
    try {
      let token = "";
      if (user) {
        try {
          token = await user.getIdToken();
        } catch (e) {
          console.warn("Could not get ID token:", e);
        }
      }

      const res = await fetch("/api/alumni-registration/toggle-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          totalCapacity: parsed,
          firebaseIdToken: token,
          adminEmail: user?.email,
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to update limit");

      setTotalCapacity(parsed);
      setIsEditingCapacity(false);
      toastSuccess(`Alumni registration limit updated to ${parsed}!`);
    } catch (err: any) {
      console.error("Error updating alumni registration limit:", err);
      toastError(err?.message || "Failed to update registration limit.");
    } finally {
      setSavingCapacity(false);
    }
  };

  const activeRegistrationsCount = useMemo(() => {
    return registrations.filter((r) => r.status !== "deregistered").length;
  }, [registrations]);

  const formatDate = (ts: { seconds: number } | null) => {
    if (!ts?.seconds) return "N/A";
    return new Date(ts.seconds * 1000).toLocaleString();
  };

  const handleSendEmail = async (reg: AlumniRegistration) => {
    setResendingId(reg.id);
    try {
      const res = await fetch("/api/alumni-registration/send-confirmation-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: reg.email,
          name: reg.name,
          department: reg.department,
          passedOutYear: reg.passedOutYear,
          contact: reg.contact,
          registrationId: reg.id,
          referringName: reg.referringName,
          referringType: reg.referringType,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to send email");
      toastSuccess(`Confirmation email sent to ${reg.email}`);
      setRegistrations((prev) =>
        prev.map((r) => (r.id === reg.id ? { ...r, emailStatus: "sent" } : r))
      );
    } catch (err: unknown) {
      const e = err as { message?: string };
      toastError(e?.message || "Failed to send email");
      setRegistrations((prev) =>
        prev.map((r) => (r.id === reg.id ? { ...r, emailStatus: "failed" } : r))
      );
    } finally {
      setResendingId(null);
    }
  };

  const handleDeregister = async (
    reg: AlumniRegistration,
    action: "deregister" | "restore" | "delete" = "deregister"
  ) => {
    let confirmMsg = `Are you sure you want to deregister ${reg.name}?`;
    if (action === "delete") confirmMsg = `Permanently delete alumni registration for ${reg.name}? This cannot be undone.`;
    if (action === "restore") confirmMsg = `Restore alumni registration for ${reg.name}?`;

    if (!window.confirm(confirmMsg)) return;

    setDeregisteringId(reg.id);
    try {
      const res = await fetch("/api/alumni-registration/deregister", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          registrationId: reg.id,
          action,
          adminEmail: user?.email || userData?.role || "superAdmin",
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Action failed");

      if (action === "delete") {
        setRegistrations((prev) => prev.filter((r) => r.id !== reg.id));
        removeCachedAdminAlumni(reg.id);
        toastSuccess(`Deleted registration for ${reg.name}`);
      } else if (action === "restore") {
        setRegistrations((prev) =>
          prev.map((r) => (r.id === reg.id ? { ...r, status: "registered" } : r))
        );
        updateCachedAdminAlumni(reg.id, { status: "registered" });
        toastSuccess(`Restored registration for ${reg.name}`);
      } else {
        setRegistrations((prev) =>
          prev.map((r) => (r.id === reg.id ? { ...r, status: "deregistered" } : r))
        );
        updateCachedAdminAlumni(reg.id, { status: "deregistered" });
        toastSuccess(`Deregistered ${reg.name}`);
      }
    } catch (err: unknown) {
      const e = err as { message?: string };
      toastError(e?.message || "Action failed");
    } finally {
      setDeregisteringId(null);
    }
  };

  const handleViewProof = async (fileId?: string, fileUrl?: string, label = "Proof Document") => {
    if (fileUrl) {
      window.open(fileUrl, "_blank");
      return;
    }
    if (!fileId) {
      toastError("No proof document ID available.");
      return;
    }
    setProofLoading(fileId);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        window.open(`https://drive.google.com/file/d/${fileId}/view`, "_blank");
        return;
      }
      const token = await currentUser.getIdToken(true);
      const res = await fetch(
        `/api/alumni-registration/view-proof?fileId=${encodeURIComponent(fileId)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) {
        window.open(`https://drive.google.com/file/d/${fileId}/view`, "_blank");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      toastSuccess(`Opened ${label}`);
    } catch {
      window.open(`https://drive.google.com/file/d/${fileId}/view`, "_blank");
    } finally {
      setProofLoading(null);
    }
  };

  const handleOpenEdit = (reg: AlumniRegistration) => {
    setEditingReg(reg);
    setEditForm({
      name: reg.name || "",
      department: reg.department || "Computer Engineering",
      passedOutYear: Number(reg.passedOutYear) || 2025,
      contact: reg.contact || "",
      email: reg.email || "",
      status: reg.status === "deregistered" ? "deregistered" : "registered",
      emailStatus: reg.emailStatus || "pending",
      batch: reg.batch || "",
      referringType: (reg.referringType === "faculty" ? "faculty" : "student"),
      referringName: reg.referringName || "",
      referringDepartment: reg.referringDepartment || "",
      referringYear: reg.referringYear || "",
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReg) return;

    if (!editForm.name.trim()) {
      toastError("Full name is required.");
      return;
    }
    if (!/^\d{10}$/.test(editForm.contact.trim())) {
      toastError("Contact number must be exactly 10 digits.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editForm.email.trim())) {
      toastError("Enter a valid email address.");
      return;
    }

    setSavingEdit(true);
    try {
      let token = "";
      if (user) {
        try {
          token = await user.getIdToken();
        } catch (tokenErr) {
          console.warn("Could not get ID token for update:", tokenErr);
        }
      }

      const res = await fetch("/api/alumni-registration/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          registrationId: editingReg.id,
          name: editForm.name.trim(),
          department: editForm.department,
          passedOutYear: editForm.passedOutYear,
          contact: editForm.contact.trim(),
          email: editForm.email.trim().toLowerCase(),
          status: editForm.status,
          emailStatus: editForm.emailStatus,
          batch: editForm.batch.trim(),
          referringType: editForm.referringType,
          referringName: editForm.referringName.trim(),
          referringDepartment: editForm.referringDepartment.trim(),
          referringYear: editForm.referringYear.trim(),
          adminEmail: user?.email,
          firebaseIdToken: token,
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to update alumni details");

      // Update state locally
      setRegistrations((prev) =>
        prev.map((r) =>
          r.id === editingReg.id
            ? {
                ...r,
                name: editForm.name.trim(),
                department: editForm.department,
                passedOutYear: editForm.passedOutYear,
                contact: editForm.contact.trim(),
                email: editForm.email.trim().toLowerCase(),
                status: editForm.status,
                emailStatus: editForm.emailStatus,
                batch: editForm.batch.trim(),
                referringType: editForm.referringType,
                referringName: editForm.referringName.trim(),
                referringDepartment: editForm.referringDepartment.trim(),
                referringYear: editForm.referringYear.trim(),
              }
            : r
        )
      );
      updateCachedAdminAlumni(editingReg.id, {
        name: editForm.name.trim(),
        department: editForm.department,
        passedOutYear: editForm.passedOutYear,
        contact: editForm.contact.trim(),
        email: editForm.email.trim().toLowerCase(),
        status: editForm.status,
        emailStatus: editForm.emailStatus,
        batch: editForm.batch.trim(),
        referringType: editForm.referringType,
        referringName: editForm.referringName.trim(),
        referringDepartment: editForm.referringDepartment.trim(),
        referringYear: editForm.referringYear.trim(),
      });

      toastSuccess(`Updated details for ${editForm.name.trim()}`);
      setEditingReg(null);
    } catch (err: any) {
      console.error("Error updating alumni candidate:", err);
      toastError(err?.message || "Failed to save changes.");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleSendAllPending = async () => {
    const pending = registrations.filter(
      (r) => r.status !== "deregistered" && r.emailStatus !== "sent"
    );
    if (pending.length === 0) {
      toastSuccess("No pending emails to send.");
      return;
    }

    if (
      !window.confirm(
        `Send confirmation emails to ${pending.length} alumni candidate(s)?`
      )
    )
      return;

    setBulkSending(true);
    let successCount = 0;
    for (const reg of pending) {
      try {
        const res = await fetch("/api/alumni-registration/send-confirmation-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: reg.email,
            name: reg.name,
            department: reg.department,
            passedOutYear: reg.passedOutYear,
            contact: reg.contact,
            registrationId: reg.id,
          }),
        });
        const data = await res.json();
        if (data.success) {
          successCount++;
          setRegistrations((prev) =>
            prev.map((r) => (r.id === reg.id ? { ...r, emailStatus: "sent" } : r))
          );
        }
      } catch (err) {
        console.error(`Failed to send email to ${reg.email}:`, err);
      }
    }
    setBulkSending(false);
    toastSuccess(`Sent confirmation emails to ${successCount} of ${pending.length} alumni.`);
  };

  const filteredRegistrations = registrations.filter(
    (reg) =>
      reg.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reg.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reg.department?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeCount = registrations.filter((r) => r.status !== "deregistered").length;
  const deregisteredCount = registrations.filter((r) => r.status === "deregistered").length;
  const pendingCount = registrations.filter((r) => r.status !== "deregistered" && r.emailStatus !== "sent").length;

  const handleExport = () => {
    const exportData = filteredRegistrations.map((reg) => ({
      "Name": reg.name,
      "Department": reg.department || "N/A",
      "Passed Out Year": reg.passedOutYear,
      "Contact": reg.contact,
      "Email": reg.email,
      "Referring Type": reg.referringType ? (reg.referringType === "faculty" ? "Faculty" : "Student") : "N/A",
      "Referring Name": reg.referringName || "N/A",
      "Referring Department": reg.referringDepartment || "N/A",
      "Referring Year": reg.referringYear || "N/A",
      "College ID Proof Link": reg.referringIdFileUrl || reg.idProofUrl || (reg.referringIdFileId ? `https://drive.google.com/file/d/${reg.referringIdFileId}/view` : "N/A"),
      "Status": reg.status === "deregistered" ? "Deregistered" : "Registered",
      "Email Status": reg.emailStatus || "N/A",
      "Created At": formatDate(reg.createdAt),
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Alumni Registrations");
    XLSX.writeFile(wb, "Sparkz_Alumni_Registrations.xlsx");
    toastSuccess("Excel exported successfully");
  };

  return (
    <div className="space-y-6">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Alumni Registrations</h1>
          <p className="text-gray-400 mt-1">
            <span className="text-white font-semibold">{activeCount}</span> active registered alumni
            {deregisteredCount > 0 && (
              <span className="text-red-400 ml-2">({deregisteredCount} deregistered)</span>
            )}
            {pendingCount > 0 && (
              <span className="text-amber-400 ml-2 font-medium">({pendingCount} pending confirmation email)</span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {pendingCount > 0 && (
            <button
              onClick={handleSendAllPending}
              disabled={bulkSending}
              className="flex items-center gap-2 bg-[#F3C87A] hover:bg-[#e6b960] disabled:opacity-50 text-[#0B0B0E] font-bold px-4 py-2 rounded-lg transition-colors text-sm shadow-md"
            >
              {bulkSending ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
              {bulkSending ? "Sending..." : `Send Pending Emails (${pendingCount})`}
            </button>
          )}
          <button
            onClick={() => fetchRegistrations(true)}
            disabled={loading}
            className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-300 px-3.5 py-2 rounded-lg border border-gray-700 transition-colors text-sm font-semibold disabled:opacity-50"
            title="Refresh list"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors text-sm font-semibold"
          >
            <Download size={18} /> Export Excel
          </button>
        </div>
      </div>

      {/* ── Super Admin Controls: Status & Registration Limit ───────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Registration ON/OFF Toggle Card */}
        <div className="bg-[#181824] border border-gray-700/80 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
          <div className="flex items-start sm:items-center gap-3.5">
            <div
              className={`w-3.5 h-3.5 rounded-full mt-1 sm:mt-0 flex-shrink-0 ${
                registrationOpen ? "bg-emerald-400 animate-pulse" : "bg-red-500"
              }`}
            />
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-white font-semibold text-sm">Alumni Registration:</span>
                <span
                  className={`px-3 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                    registrationOpen
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : "bg-red-500/20 text-red-300 border border-red-500/30"
                  }`}
                >
                  {registrationOpen ? "Open / Active" : "Closed / Inactive"}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {registrationOpen
                  ? "Public registration is currently accepting submissions on the website."
                  : "Registration is turned off. Candidates cannot submit new forms."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {isSuperAdmin ? (
              <button
                onClick={handleToggleRegistration}
                disabled={statusLoading}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md ${
                  registrationOpen
                    ? "bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/40"
                    : "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/40"
                }`}
              >
                {statusLoading ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : registrationOpen ? (
                  <ToggleRight size={18} />
                ) : (
                  <ToggleLeft size={18} />
                )}
                {registrationOpen ? "Turn OFF" : "Turn ON"}
              </button>
            ) : (
              <span className="text-xs text-gray-400 flex items-center gap-1.5 italic bg-gray-800/80 px-3 py-1.5 rounded-lg border border-gray-700">
                <ShieldAlert size={14} className="text-amber-400" />
                Super Admin Only
              </span>
            )}
          </div>
        </div>

        {/* Registration Limit / Capacity Card */}
        <div className="bg-gradient-to-r from-[#181824] via-[#15151f] to-[#12121a] border border-[#F3C87A]/30 rounded-2xl p-4 sm:p-5 flex flex-col justify-between gap-3 shadow-lg">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#F3C87A]/10 border border-[#F3C87A]/30 flex items-center justify-center text-[#F3C87A] text-lg font-bold shadow-inner">
                🎓
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-white">Registration Limit:</span>
                  <span className="text-lg font-black text-[#F3C87A]">{totalCapacity}</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                      activeRegistrationsCount >= totalCapacity
                        ? "bg-red-500/20 text-red-300 border border-red-500/30"
                        : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    }`}
                  >
                    {activeRegistrationsCount >= totalCapacity ? "Full" : `${Math.max(0, totalCapacity - activeRegistrationsCount)} Spots Left`}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  <strong className="text-white">{activeRegistrationsCount}</strong> / {totalCapacity} registered ({Math.min(100, Math.round((activeRegistrationsCount / (totalCapacity || 1)) * 100))}%)
                </p>
              </div>
            </div>

            {isSuperAdmin && (
              <div className="flex-shrink-0">
                {isEditingCapacity ? (
                  <div className="flex items-center gap-1.5 bg-gray-900/90 border border-[#F3C87A]/40 p-1.5 rounded-xl">
                    <input
                      type="number"
                      min={1}
                      max={10000}
                      value={capacityInput}
                      onChange={(e) => setCapacityInput(e.target.value)}
                      className="w-16 px-2 py-1 bg-gray-800 border border-gray-700 text-white rounded-lg text-xs font-bold focus:outline-none focus:border-[#F3C87A]"
                      autoFocus
                    />
                    <button
                      onClick={handleSaveCapacity}
                      disabled={savingCapacity}
                      className="px-2.5 py-1 bg-[#F3C87A] hover:bg-[#e6b960] text-[#0B0B0E] text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
                    >
                      {savingCapacity ? "..." : "Save"}
                    </button>
                    <button
                      onClick={() => {
                        setIsEditingCapacity(false);
                        setCapacityInput(String(totalCapacity));
                      }}
                      disabled={savingCapacity}
                      className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs font-medium rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setIsEditingCapacity(true);
                      setCapacityInput(String(totalCapacity));
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#F3C87A]/10 hover:bg-[#F3C87A]/20 text-[#F3C87A] border border-[#F3C87A]/40 rounded-xl text-xs font-bold transition-all shadow-sm"
                  >
                    <Pencil size={12} />
                    <span>Edit Limit</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                activeRegistrationsCount >= totalCapacity
                  ? "bg-red-500"
                  : activeRegistrationsCount >= totalCapacity * 0.8
                  ? "bg-amber-400"
                  : "bg-emerald-400"
              }`}
              style={{
                width: `${Math.min(100, Math.round((activeRegistrationsCount / (totalCapacity || 1)) * 100))}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* ── Search Bar ────────────────────────────────────────────────────── */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Search by name, email, or department..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 text-white pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* ── Table ─────────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
      ) : (
        <div className="bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-800 text-gray-300 border-b border-gray-700">
                <tr>
                  <th className="px-4 py-4 font-semibold whitespace-nowrap">#</th>
                  <th className="px-4 py-4 font-semibold whitespace-nowrap">Name</th>
                  <th className="px-4 py-4 font-semibold whitespace-nowrap">Department</th>
                  <th className="px-4 py-4 font-semibold whitespace-nowrap">Passed Out Year</th>
                  <th className="px-4 py-4 font-semibold whitespace-nowrap">Contact</th>
                  <th className="px-4 py-4 font-semibold whitespace-nowrap">Email</th>
                  <th className="px-4 py-4 font-semibold whitespace-nowrap">Referring Person</th>
                  <th className="px-4 py-4 font-semibold whitespace-nowrap">College ID Proof</th>
                  <th className="px-4 py-4 font-semibold whitespace-nowrap">Registration Status</th>
                  <th className="px-4 py-4 font-semibold whitespace-nowrap">Email Status</th>
                  <th className="px-4 py-4 font-semibold whitespace-nowrap">Date</th>
                  <th className="px-4 py-4 font-semibold whitespace-nowrap text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {filteredRegistrations.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="px-6 py-8 text-center text-gray-400">
                      No alumni registrations found.
                    </td>
                  </tr>
                ) : (
                  filteredRegistrations.map((reg, i) => (
                    <tr
                      key={reg.id}
                      className={`hover:bg-gray-700/50 transition-colors ${
                        reg.status === "deregistered" ? "opacity-60 bg-red-950/10" : ""
                      }`}
                    >
                      <td className="px-4 py-4 text-gray-400 text-xs">{i + 1}</td>
                      <td className="px-4 py-4">
                        <div className="font-medium text-white">{reg.name}</div>
                        <div className="text-gray-500 text-xs font-mono">{reg.id.slice(0, 8)}...</div>
                      </td>
                      <td className="px-4 py-4 text-gray-300 font-medium">
                        {reg.department || <span className="text-gray-500 italic">N/A</span>}
                      </td>
                      <td className="px-4 py-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-[#F3C87A]/20 text-[#F3C87A]">
                          {reg.passedOutYear}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-gray-300 font-mono text-xs">{reg.contact}</td>
                      <td className="px-4 py-4 text-gray-300 text-xs">{reg.email}</td>

                      {/* Referring Person */}
                      <td className="px-4 py-4">
                        {reg.referringName ? (
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                                  reg.referringType === "faculty"
                                    ? "bg-purple-500/20 text-purple-300"
                                    : "bg-blue-500/20 text-blue-300"
                                }`}
                              >
                                {reg.referringType === "faculty" ? "Faculty" : "Student"}
                              </span>
                              <span className="text-white text-xs font-semibold">
                                {reg.referringName}
                              </span>
                            </div>
                            {reg.referringDepartment && (
                              <div className="text-gray-400 text-xs mt-0.5">
                                {reg.referringDepartment}
                                {reg.referringYear ? ` • ${reg.referringYear}` : ""}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-500 text-xs italic">N/A</span>
                        )}
                      </td>

                      {/* Referring Person College ID Proof */}
                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-1.5">
                          {reg.referringIdFileUrl || reg.referringIdFileId || reg.idProofUrl ? (
                            <button
                              onClick={() =>
                                handleViewProof(
                                  reg.referringIdFileId,
                                  reg.referringIdFileUrl || reg.idProofUrl,
                                  `College ID (${reg.referringName || "Referring Person"})`
                                )
                              }
                              disabled={proofLoading === (reg.referringIdFileId || "view")}
                              className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded bg-sky-500/10 border border-sky-500/30 text-sky-300 hover:bg-sky-500/20 font-medium transition-colors w-fit"
                              title="View Referring Person's College ID Proof"
                            >
                              {proofLoading === (reg.referringIdFileId || "view") ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : (
                                <ExternalLink size={12} />
                              )}
                              <span>View College ID</span>
                            </button>
                          ) : (
                            <span className="text-gray-500 text-xs italic">Not Uploaded</span>
                          )}

                          {/* Legacy Alumni ID (if present in older test records) */}
                          {(reg.alumniIdFileUrl || reg.alumniIdFileId) && (
                            <button
                              onClick={() =>
                                handleViewProof(
                                  reg.alumniIdFileId,
                                  reg.alumniIdFileUrl,
                                  `Alumni ID (${reg.name})`
                                )
                              }
                              disabled={proofLoading === reg.alumniIdFileId}
                              className="inline-flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-200 hover:underline w-fit"
                              title="View Legacy Alumni ID"
                            >
                              <ExternalLink size={10} />
                              <span>(Legacy) Alumni ID</span>
                            </button>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        {reg.status === "deregistered" ? (
                          <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold bg-red-500/20 text-red-300 border border-red-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                            Deregistered
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            Registered
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                            reg.emailStatus === "sent"
                              ? "bg-green-500/20 text-green-300 border border-green-500/30"
                              : reg.emailStatus === "failed"
                              ? "bg-red-500/20 text-red-300 border border-red-500/30"
                              : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                          }`}
                        >
                          {reg.emailStatus || "pending"}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-gray-400 text-xs">{formatDate(reg.createdAt)}</td>
                      <td className="px-4 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          {/* ── Edit Button ─────────────────────────────── */}
                          <button
                            onClick={() => handleOpenEdit(reg)}
                            title="Edit candidate details"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 border border-indigo-500/30 transition-colors"
                          >
                            <Pencil size={13} />
                            Edit
                          </button>

                          {/* ── Email Button ────────────────────────────── */}
                          <button
                            onClick={() => handleSendEmail(reg)}
                            disabled={resendingId === reg.id || bulkSending}
                            title="Send or resend confirmation email"
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                              reg.emailStatus === "sent"
                                ? "bg-gray-700/60 text-gray-300 hover:bg-gray-700 hover:text-white"
                                : "bg-[#F3C87A] hover:bg-[#e6b960] text-[#0B0B0E] font-bold shadow-sm"
                            }`}
                          >
                            {resendingId === reg.id ? (
                              <>
                                <Loader2 size={13} className="animate-spin" />
                                Sending...
                              </>
                            ) : (
                              <>
                                <Mail size={13} />
                                {reg.emailStatus === "sent" ? "Resend" : "Send Email"}
                              </>
                            )}
                          </button>

                          {/* ── Restore / Deregister Button ─────────────── */}
                          {reg.status === "deregistered" ? (
                            <button
                              onClick={() => handleDeregister(reg, "restore")}
                              disabled={deregisteringId === reg.id}
                              title="Restore alumni registration"
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600/30 text-emerald-300 hover:bg-emerald-600/50 border border-emerald-500/30 transition-colors"
                            >
                              <UserCheck size={13} />
                              Restore
                            </button>
                          ) : (
                            <button
                              onClick={() => handleDeregister(reg, "deregister")}
                              disabled={deregisteringId === reg.id}
                              title="Deregister this alumni"
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30 transition-colors"
                            >
                              <UserX size={13} />
                              Deregister
                            </button>
                          )}

                          {/* ── Delete Button ───────────────────────────── */}
                          <button
                            onClick={() => handleDeregister(reg, "delete")}
                            disabled={deregisteringId === reg.id}
                            title="Permanently delete record"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Candidate Edit Modal ──────────────────────────────────────────── */}
      {editingReg && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#181824] border border-gray-700 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-gray-700/80 pb-3">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Pencil size={18} className="text-[#F3C87A]" />
                  Edit Alumni Candidate
                </h2>
                <p className="text-xs text-gray-400 font-mono mt-0.5">ID: {editingReg.id}</p>
              </div>
              <button
                onClick={() => setEditingReg(null)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Full Name *</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full bg-[#131318] border border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#F3C87A]"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Department *</label>
                  <select
                    value={editForm.department}
                    onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                    className="w-full bg-[#131318] border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#F3C87A]"
                    required
                  >
                    {DEPARTMENT_OPTIONS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Passed Out Year *</label>
                  <select
                    value={editForm.passedOutYear}
                    onChange={(e) =>
                      setEditForm({ ...editForm, passedOutYear: Number(e.target.value) })
                    }
                    className="w-full bg-[#131318] border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#F3C87A]"
                    required
                  >
                    {YEAR_OPTIONS.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Contact (10 digits) *</label>
                  <input
                    type="tel"
                    maxLength={10}
                    value={editForm.contact}
                    onChange={(e) => setEditForm({ ...editForm, contact: e.target.value })}
                    className="w-full bg-[#131318] border border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-[#F3C87A]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Status *</label>
                  <select
                    value={editForm.status}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        status: e.target.value as "registered" | "deregistered",
                      })
                    }
                    className="w-full bg-[#131318] border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#F3C87A]"
                  >
                    <option value="registered">Registered</option>
                    <option value="deregistered">Deregistered</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Email Address *</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full bg-[#131318] border border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-[#F3C87A]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Email Confirmation Status</label>
                  <select
                    value={editForm.emailStatus}
                    onChange={(e) => setEditForm({ ...editForm, emailStatus: e.target.value })}
                    className="w-full bg-[#131318] border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#F3C87A]"
                  >
                    <option value="pending">Pending</option>
                    <option value="sent">Sent</option>
                    <option value="failed">Failed</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Batch (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. 2018-2022"
                  value={editForm.batch}
                  onChange={(e) => setEditForm({ ...editForm, batch: e.target.value })}
                  className="w-full bg-[#131318] border border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#F3C87A]"
                />
              </div>

              {/* Referring Person Details in Modal */}
              <div className="pt-2 border-t border-gray-700/60 space-y-3">
                <h3 className="text-xs font-bold text-[#F3C87A] uppercase tracking-wider">
                  Referring Person Details
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">
                      Referring Type *
                    </label>
                    <select
                      value={editForm.referringType}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          referringType: e.target.value as "student" | "faculty",
                        })
                      }
                      className="w-full bg-[#131318] border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#F3C87A]"
                    >
                      <option value="student">Student</option>
                      <option value="faculty">Faculty</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">
                      Referring Name
                    </label>
                    <input
                      type="text"
                      placeholder="Referee full name"
                      value={editForm.referringName}
                      onChange={(e) =>
                        setEditForm({ ...editForm, referringName: e.target.value })
                      }
                      className="w-full bg-[#131318] border border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#F3C87A]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">
                      Referring Department
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Computer Engineering"
                      value={editForm.referringDepartment}
                      onChange={(e) =>
                        setEditForm({ ...editForm, referringDepartment: e.target.value })
                      }
                      className="w-full bg-[#131318] border border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#F3C87A]"
                    />
                  </div>
                  {editForm.referringType === "student" && (
                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-1">
                        Student&apos;s Year of Study
                      </label>
                      <select
                        value={editForm.referringYear}
                        onChange={(e) =>
                          setEditForm({ ...editForm, referringYear: e.target.value })
                        }
                        className="w-full bg-[#131318] border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#F3C87A]"
                      >
                        <option value="">Select year</option>
                        {REFERRING_YEAR_OPTIONS.map((y) => (
                          <option key={y} value={y}>
                            {y}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* Uploaded Documents Quick Access */}
              <div className="pt-2 border-t border-gray-700/60">
                <label className="block text-xs font-medium text-gray-400 mb-2">
                  Uploaded College ID Proof
                </label>
                <div className="flex flex-wrap gap-2 items-center">
                  {editingReg.referringIdFileUrl || editingReg.referringIdFileId || editingReg.idProofUrl ? (
                    <button
                      type="button"
                      onClick={() =>
                        handleViewProof(
                          editingReg.referringIdFileId,
                          editingReg.referringIdFileUrl || editingReg.idProofUrl,
                          `Referring ID (${editingReg.referringName || "Referee"})`
                        )
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/30 hover:bg-sky-500/30 transition-colors"
                    >
                      <ExternalLink size={13} />
                      View College ID Proof
                    </button>
                  ) : (
                    <span className="text-xs text-gray-500 italic">No College ID uploaded</span>
                  )}

                  {(editingReg.alumniIdFileUrl || editingReg.alumniIdFileId) && (
                    <button
                      type="button"
                      onClick={() =>
                        handleViewProof(
                          editingReg.alumniIdFileId,
                          editingReg.alumniIdFileUrl,
                          `Alumni ID (${editingReg.name})`
                        )
                      }
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium text-gray-400 hover:text-gray-200 hover:underline"
                    >
                      <ExternalLink size={11} />
                      (Legacy) Alumni ID
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-700/80">
                <button
                  type="button"
                  onClick={() => setEditingReg(null)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-300 hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="flex items-center gap-2 bg-[#F3C87A] hover:bg-[#e6b960] disabled:opacity-50 text-[#0B0B0E] font-bold px-5 py-2 rounded-xl text-sm transition-all shadow-md"
                >
                  {savingEdit ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  {savingEdit ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
