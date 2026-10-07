"use client";

import { useEffect, useState, useMemo } from "react";
import {
  collection,
  getDocs,
  getDoc,
  setDoc,
  query,
  orderBy,
  doc,
  updateDoc,
  deleteDoc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db, auth } from "@/utils/firebase";
import { useAuth } from "@/context/AuthContext";
import {
  Download,
  Search,
  ShieldCheck,
  UserX,
  UserCheck,
  Trash2,
  Eye,
  Plus,
  RefreshCw,
  X,
  CheckCircle,
  AlertCircle,
  Filter,
  Calendar,
  Building,
  Phone,
  Mail,
  User,
  ExternalLink,
} from "lucide-react";
import * as XLSX from "xlsx";
import { toastError, toastSuccess } from "@/utils/common/Toast";

interface VisitorRegistration {
  id: string;
  name: string;
  phone: string;
  email: string;
  userId?: string;
  college: string;
  department: string;
  yearOfStudy?: string;
  referringType: "student" | "faculty" | string;
  referringName?: string;
  referringDepartment?: string;
  referringYear?: string;
  referringStudentName?: string;
  referringFacultyName?: string;
  studentCollegeIdFileId?: string;
  studentAadhaarFileId?: string;
  facultyIdFileId?: string;
  facultyAadhaarFileId?: string;
  collegeIdFileId?: string;
  collegeIdFileUrl?: string;
  idProofUrl?: string;
  qualifyingPaidEvent?: string;
  fee?: number;
  amountPaid?: number;
  paymentStatus?: string;
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
  passValidity?: string;
  approvalStatus?: "pending" | "approved" | "revoked" | string;
  revokedReason?: string;
  revokedAt?: { seconds: number; nanoseconds?: number } | null;
  emailStatus?: string;
  createdByAdmin?: boolean;
  notes?: string;
  createdAt: { seconds: number; nanoseconds?: number } | null;
  updatedAt?: { seconds: number; nanoseconds?: number } | null;
}

export default function VisitorRegistrationsAdmin() {
  const { user, userData } = useAuth();
  const [registrations, setRegistrations] = useState<VisitorRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "active" | "revoked">("All");
  const [referralFilter, setReferralFilter] = useState<"All" | "student" | "faculty">("All");

  // Visitor Fee Management State
  const [visitorFee, setVisitorFee] = useState<number>(250);
  const [isEditingFee, setIsEditingFee] = useState(false);
  const [feeInput, setFeeInput] = useState("250");
  const [savingFee, setSavingFee] = useState(false);

  // Registration Status & Capacity Management
  const [registrationOpen, setRegistrationOpen] = useState(true);
  const [statusLoading, setStatusLoading] = useState(false);
  const [totalCapacity, setTotalCapacity] = useState<number>(300);
  const [isEditingCapacity, setIsEditingCapacity] = useState(false);
  const [capacityInput, setCapacityInput] = useState("300");
  const [savingCapacity, setSavingCapacity] = useState(false);

  // Proof viewer
  const [proofLoading, setProofLoading] = useState<string | null>(null);

  // Actions state
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Modals
  const [selectedReg, setSelectedReg] = useState<VisitorRegistration | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Add Registration Form State
  const [addForm, setAddForm] = useState({
    name: "",
    phone: "",
    email: "",
    college: "",
    department: "",
    yearOfStudy: "1st Year",
    referringType: "student" as "student" | "faculty",
    referringName: "",
    referringDepartment: "",
    referringYear: "1st Year",
    qualifyingPaidEvent: "Admin Direct Pass",
    notes: "",
  });
  const [addFormSubmitting, setAddFormSubmitting] = useState(false);

  const isSuperAdmin = useMemo(() => {
    if (!userData && !user) return false;
    const superEmails = (process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAILS || "")
      .split(",")
      .map((e) => e.trim().toLowerCase());
    return (
      userData?.role === "superAdmin" ||
      (user?.email && superEmails.includes(user.email.toLowerCase()))
    );
  }, [userData, user]);

  useEffect(() => {
    fetchRegistrations();
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const snap = await getDoc(doc(db, "eventSettings", "visitorPass"));
      if (snap.exists()) {
        const data = snap.data();
        if (typeof data?.fee === "number" && data.fee >= 0) {
          setVisitorFee(data.fee);
          setFeeInput(String(data.fee));
        }
        if (typeof data?.registrationOpen === "boolean") {
          setRegistrationOpen(data.registrationOpen);
        }
        if (typeof data?.totalCapacity === "number" && data.totalCapacity > 0) {
          setTotalCapacity(data.totalCapacity);
          setCapacityInput(String(data.totalCapacity));
        }
      }
    } catch (e) {
      console.warn("Error fetching visitor settings:", e);
    }
  };

  const toggleRegistration = async () => {
    if (!isSuperAdmin) {
      toastError("Only Super Admin can change registration status.");
      return;
    }
    setStatusLoading(true);
    try {
      const next = !registrationOpen;
      await setDoc(
        doc(db, "eventSettings", "visitorPass"),
        {
          registrationOpen: next,
          updatedAt: serverTimestamp(),
          updatedBy: user?.email || "SuperAdmin",
        },
        { merge: true }
      );
      setRegistrationOpen(next);
      toastSuccess(next ? "Visitor registrations opened!" : "Visitor registrations closed.");
    } catch (e) {
      console.error("Failed to update registration status:", e);
      toastError("Failed to update registration status.");
    } finally {
      setStatusLoading(false);
    }
  };

  const handleSaveCapacity = async () => {
    if (!isSuperAdmin) {
      toastError("Only Super Admin can change ticket capacity.");
      return;
    }
    const parsed = Number(capacityInput);
    if (isNaN(parsed) || parsed < 1) {
      toastError("Please enter a valid ticket capacity (minimum 1).");
      return;
    }
    setSavingCapacity(true);
    try {
      await setDoc(
        doc(db, "eventSettings", "visitorPass"),
        {
          totalCapacity: parsed,
          updatedAt: serverTimestamp(),
          updatedBy: user?.email || "SuperAdmin",
        },
        { merge: true }
      );
      setTotalCapacity(parsed);
      setIsEditingCapacity(false);
      toastSuccess(`Total ticket capacity updated to ${parsed}!`);
    } catch (e) {
      console.error("Failed to update capacity:", e);
      toastError("Failed to update ticket capacity.");
    } finally {
      setSavingCapacity(false);
    }
  };

  const handleSaveFee = async () => {
    if (!isSuperAdmin) {
      toastError("Only Super Admin can change the visitor pass registration fee.");
      return;
    }
    const parsed = Number(feeInput);
    if (isNaN(parsed) || parsed < 0) {
      toastError("Please enter a valid non-negative fee amount.");
      return;
    }
    setSavingFee(true);
    try {
      await setDoc(
        doc(db, "eventSettings", "visitorPass"),
        {
          fee: parsed,
          updatedAt: serverTimestamp(),
          updatedBy: user?.email || "SuperAdmin",
        },
        { merge: true }
      );
      setVisitorFee(parsed);
      setIsEditingFee(false);
      toastSuccess(`Visitor pass fee updated to ₹${parsed} successfully!`);
    } catch (e) {
      console.error("Failed to update visitor fee:", e);
      toastError("Failed to update visitor pass fee.");
    } finally {
      setSavingFee(false);
    }
  };

  const fetchRegistrations = async () => {
    try {
      setRefreshing(true);
      const q = query(collection(db, "visitor_registrations"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      const data: VisitorRegistration[] = [];
      snap.forEach((d) => data.push({ id: d.id, ...d.data() } as VisitorRegistration));
      setRegistrations(data);
    } catch (error) {
      console.error("Error fetching visitor registrations:", error);
      toastError("Failed to fetch visitor registrations");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const formatDate = (ts: { seconds: number } | null | undefined) => {
    if (!ts?.seconds) return "N/A";
    return new Date(ts.seconds * 1000).toLocaleString();
  };

  const getProofUrl = (reg: VisitorRegistration | null | undefined): string => {
    if (!reg) return "";
    if (reg.collegeIdFileUrl) return reg.collegeIdFileUrl;
    if (reg.idProofUrl) return reg.idProofUrl;
    const fileId =
      reg.collegeIdFileId ||
      reg.studentCollegeIdFileId ||
      reg.facultyIdFileId;
    if (fileId) return `https://drive.google.com/file/d/${fileId}/view`;
    return "";
  };

  const handleViewProof = async (fileId: string, label: string) => {
    if (!fileId) return;
    setProofLoading(fileId);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        toastError("Not authenticated");
        return;
      }
      const token = await currentUser.getIdToken(true);
      const res = await fetch(
        `/api/visitor-registration/view-proof?fileId=${encodeURIComponent(fileId)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!res.ok) {
        toastError("Failed to load proof file");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      toastSuccess(`Opened ${label}`);
    } catch (err) {
      console.error("View proof error:", err);
      toastError("Failed to open proof file");
    } finally {
      setProofLoading(null);
    }
  };

  // Deregister / Revoke Pass
  const handleDeregister = async (reg: VisitorRegistration) => {
    if (
      !window.confirm(
        `Are you sure you want to revoke the visitor pass for "${reg.name}"? This will invalidate their entry eligibility for Abheri & Proshow.`
      )
    ) {
      return;
    }

    setActionLoadingId(reg.id);
    try {
      await updateDoc(doc(db, "visitor_registrations", reg.id), {
        approvalStatus: "revoked",
        revokedAt: serverTimestamp(),
        revokedReason: "Deregistered by admin",
        updatedAt: serverTimestamp(),
      });

      setRegistrations((prev) =>
        prev.map((item) =>
          item.id === reg.id
            ? {
                ...item,
                approvalStatus: "revoked",
                revokedReason: "Deregistered by admin",
                revokedAt: { seconds: Math.floor(Date.now() / 1000) },
              }
            : item
        )
      );

      if (selectedReg && selectedReg.id === reg.id) {
        setSelectedReg((prev) =>
          prev
            ? {
                ...prev,
                approvalStatus: "revoked",
                revokedReason: "Deregistered by admin",
                revokedAt: { seconds: Math.floor(Date.now() / 1000) },
              }
            : null
        );
      }

      toastSuccess(`Visitor pass for ${reg.name} has been revoked.`);
    } catch (err) {
      console.error("Error revoking visitor pass:", err);
      toastError("Failed to revoke visitor pass");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Restore / Reactivate Pass
  const handleRestore = async (reg: VisitorRegistration) => {
    if (
      !window.confirm(
        `Restore visitor pass for "${reg.name}" back to Active?`
      )
    ) {
      return;
    }

    setActionLoadingId(reg.id);
    try {
      await updateDoc(doc(db, "visitor_registrations", reg.id), {
        approvalStatus: "approved",
        revokedReason: null,
        revokedAt: null,
        updatedAt: serverTimestamp(),
      });

      setRegistrations((prev) =>
        prev.map((item) =>
          item.id === reg.id
            ? {
                ...item,
                approvalStatus: "approved",
                revokedReason: undefined,
                revokedAt: null,
              }
            : item
        )
      );

      if (selectedReg && selectedReg.id === reg.id) {
        setSelectedReg((prev) =>
          prev
            ? {
                ...prev,
                approvalStatus: "approved",
                revokedReason: undefined,
                revokedAt: null,
              }
            : null
        );
      }

      toastSuccess(`Visitor pass for ${reg.name} has been restored to Active.`);
    } catch (err) {
      console.error("Error restoring visitor pass:", err);
      toastError("Failed to restore visitor pass");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Permanent Delete (Super Admin only)
  const handleDeletePermanent = async (regId: string) => {
    setActionLoadingId(regId);
    try {
      await deleteDoc(doc(db, "visitor_registrations", regId));
      setRegistrations((prev) => prev.filter((r) => r.id !== regId));
      if (selectedReg?.id === regId) setSelectedReg(null);
      setDeleteConfirmId(null);
      toastSuccess("Visitor registration permanently deleted.");
    } catch (err) {
      console.error("Error deleting registration:", err);
      toastError("Failed to delete registration");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Super Admin Direct Manual Registration
  const handleCreateManualRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.name.trim()) {
      toastError("Full Name is required");
      return;
    }
    if (!/^\d{10}$/.test(addForm.phone.trim())) {
      toastError("10-digit phone number is required");
      return;
    }
    if (!addForm.college.trim()) {
      toastError("College name is required");
      return;
    }
    if (!addForm.referringName.trim()) {
      toastError("Referring person name is required");
      return;
    }

    setAddFormSubmitting(true);
    try {
      const newDoc: Record<string, unknown> = {
        name: addForm.name.trim(),
        phone: addForm.phone.trim(),
        email: addForm.email.trim().toLowerCase() || `${addForm.phone.trim()}@visitor.sparkz.in`,
        college: addForm.college.trim(),
        department: addForm.department.trim() || "Visitor",
        yearOfStudy: addForm.yearOfStudy,
        referringType: addForm.referringType,
        referringName: addForm.referringName.trim(),
        referringDepartment: addForm.referringDepartment.trim() || "CCET",
        qualifyingPaidEvent: addForm.qualifyingPaidEvent.trim() || "Admin Direct Pass",
        fee: visitorFee,
        amountPaid: 0,
        passValidity: "08 & 09 Oct",
        approvalStatus: "approved",
        emailStatus: "manual",
        createdByAdmin: true,
        notes: addForm.notes.trim() || "Manually issued by Super Admin",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      if (addForm.referringType === "student" && addForm.referringYear) {
        newDoc.referringYear = addForm.referringYear;
      }

      const docRef = await addDoc(collection(db, "visitor_registrations"), newDoc);
      toastSuccess(`Visitor pass created for ${addForm.name}!`);

      setIsAddModalOpen(false);
      setAddForm({
        name: "",
        phone: "",
        email: "",
        college: "",
        department: "",
        yearOfStudy: "1st Year",
        referringType: "student",
        referringName: "",
        referringDepartment: "",
        referringYear: "1st Year",
        qualifyingPaidEvent: "Admin Direct Pass",
        notes: "",
      });

      // Refresh data
      fetchRegistrations();
    } catch (err) {
      console.error("Error creating manual visitor pass:", err);
      toastError("Failed to create visitor pass");
    } finally {
      setAddFormSubmitting(false);
    }
  };

  // Filtered List
  const filteredRegistrations = useMemo(() => {
    return registrations.filter((reg) => {
      // Status filter
      if (statusFilter === "active" && reg.approvalStatus === "revoked") return false;
      if (statusFilter === "revoked" && reg.approvalStatus !== "revoked") return false;

      // Referral filter
      if (referralFilter !== "All" && reg.referringType !== referralFilter) return false;

      // Search term
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      const referrer =
        reg.referringName ||
        reg.referringStudentName ||
        reg.referringFacultyName ||
        "";
      return (
        reg.name?.toLowerCase().includes(term) ||
        reg.phone?.toLowerCase().includes(term) ||
        reg.email?.toLowerCase().includes(term) ||
        reg.college?.toLowerCase().includes(term) ||
        reg.department?.toLowerCase().includes(term) ||
        referrer.toLowerCase().includes(term) ||
        reg.qualifyingPaidEvent?.toLowerCase().includes(term) ||
        reg.id.toLowerCase().includes(term)
      );
    });
  }, [registrations, statusFilter, referralFilter, searchTerm]);

  // Statistics
  const stats = useMemo(() => {
    const total = registrations.length;
    const revoked = registrations.filter((r) => r.approvalStatus === "revoked").length;
    const active = total - revoked;
    const studentReferrals = registrations.filter((r) => r.referringType === "student").length;
    const facultyReferrals = registrations.filter((r) => r.referringType === "faculty").length;
    return { total, active, revoked, studentReferrals, facultyReferrals };
  }, [registrations]);

  // Export to Excel
  const handleExport = () => {
    const exportData = filteredRegistrations.map((reg, idx) => ({
      "#": idx + 1,
      "Pass ID": reg.id,
      "Name": reg.name,
      "Phone": reg.phone,
      "Email": reg.email,
      "College": reg.college,
      "Department": reg.department,
      "Visitor Year": reg.yearOfStudy || "N/A",
      "Pass Validity": reg.passValidity || "08 & 09 Oct",
      "Fee Paid": reg.amountPaid !== undefined ? `₹${reg.amountPaid}` : (reg.fee !== undefined ? `₹${reg.fee}` : "₹250"),
      "Payment ID": reg.razorpayPaymentId || "N/A",
      "Referral Type": reg.referringType,
      "Referring Person":
        reg.referringName ||
        (reg.referringType === "student"
          ? reg.referringStudentName || ""
          : reg.referringFacultyName || ""),
      "Referring Dept": reg.referringDepartment || "N/A",
      "Referring Year": reg.referringYear || "N/A",
      "Qualifying Paid Event": reg.qualifyingPaidEvent || "N/A",
      "ID Proof URL": getProofUrl(reg) || "N/A",
      "Status": reg.approvalStatus === "revoked" ? "Revoked" : "Active",
      "Revoked Reason": reg.revokedReason || "N/A",
      "Revoked Date": reg.revokedAt ? formatDate(reg.revokedAt) : "N/A",
      "Email Status": reg.emailStatus || "pending",
      "Created By Admin": reg.createdByAdmin ? "Yes" : "No",
      "Registered Date": formatDate(reg.createdAt),
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Visitor Passes");
    XLSX.writeFile(wb, `Sparkz_Visitor_Passes_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toastSuccess("Excel exported successfully!");
  };

  return (
    <div className="space-y-6">
      {/* ── Top Header ────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <span>Abheri & Proshow Visitor Passes</span>
            {isSuperAdmin && (
              <span className="text-xs px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-medium">
                Super Admin Mode
              </span>
            )}
          </h1>
          <p className="text-gray-400 mt-1">
            Manage external visitor ticket registrations, referrals, ID proof verifications, and access controls.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Registration Status Toggle (Like Abheri) */}
          <div
            className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-1.5 ${
              registrationOpen
                ? "border-green-500/30 bg-green-500/10"
                : "border-red-500/30 bg-red-500/10"
            }`}
          >
            <div>
              <p className="text-[10px] uppercase font-semibold text-gray-400">Visitor Pass</p>
              <p className={`text-xs font-bold ${registrationOpen ? "text-green-300" : "text-red-300"}`}>
                {statusLoading ? "Updating..." : registrationOpen ? "● REGISTRATION OPEN" : "○ REGISTRATION CLOSED"}
              </p>
            </div>

            {isSuperAdmin && (
              <button
                type="button"
                onClick={toggleRegistration}
                disabled={statusLoading}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 ${
                  registrationOpen
                    ? "bg-red-600 hover:bg-red-500 text-white"
                    : "bg-green-600 hover:bg-green-500 text-white"
                }`}
              >
                {statusLoading ? "..." : registrationOpen ? "Close" : "Open"}
              </button>
            )}
          </div>

          <button
            onClick={fetchRegistrations}
            disabled={refreshing}
            className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-2 rounded-xl border border-gray-700 transition-colors disabled:opacity-50 text-sm font-medium"
            title="Refresh list"
          >
            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>

          {isSuperAdmin && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 bg-[#F3C87A] hover:bg-[#E5B86A] text-[#131318] px-4 py-2 rounded-xl font-semibold transition-colors text-sm shadow-md"
            >
              <Plus size={18} />
              <span>+ Add Visitor Pass</span>
            </button>
          )}

          <button
            onClick={handleExport}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl transition-colors text-sm font-semibold shadow-md"
          >
            <Download size={18} />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {/* ── Fee & Live Vacancy Controls for Super Admin ────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Registration Fee Card */}
        <div className="bg-gradient-to-r from-[#181824] via-[#15151f] to-[#12121a] border border-[#F3C87A]/30 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-[#F3C87A]/10 border border-[#F3C87A]/30 flex items-center justify-center text-[#F3C87A] font-extrabold text-xl shadow-inner">
              ₹
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold text-white">Visitor Pass Fee:</span>
                <span className="text-2xl font-black text-[#F3C87A]">₹{visitorFee}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                  Live Systemwide
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Configured registration fee across Homepage & Razorpay.
              </p>
            </div>
          </div>

          {isSuperAdmin && (
            <div className="flex items-center gap-2">
              {isEditingFee ? (
                <div className="flex items-center gap-2 bg-gray-900/90 border border-[#F3C87A]/40 p-1.5 rounded-xl">
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#F3C87A] text-sm font-bold">₹</span>
                    <input
                      type="number"
                      min={0}
                      max={10000}
                      value={feeInput}
                      onChange={(e) => setFeeInput(e.target.value)}
                      className="w-20 pl-6 pr-2 py-1 bg-gray-800 border border-gray-700 text-white rounded-lg text-sm font-bold focus:outline-none focus:border-[#F3C87A]"
                      placeholder="250"
                      autoFocus
                    />
                  </div>
                  <button
                    onClick={handleSaveFee}
                    disabled={savingFee}
                    className="px-2.5 py-1 bg-[#F3C87A] hover:bg-[#E5B86A] text-[#131318] text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
                  >
                    {savingFee ? "..." : "Save"}
                  </button>
                  <button
                    onClick={() => { setIsEditingFee(false); setFeeInput(String(visitorFee)); }}
                    disabled={savingFee}
                    className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs font-medium rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { setIsEditingFee(true); setFeeInput(String(visitorFee)); }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#F3C87A]/10 hover:bg-[#F3C87A]/20 text-[#F3C87A] border border-[#F3C87A]/40 rounded-xl text-xs font-bold transition-all shadow-sm"
                >
                  <span>Edit Fee</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Live Vacancy & Capacity Card */}
        <div className="bg-gradient-to-r from-[#181824] via-[#15151f] to-[#12121a] border border-indigo-500/30 rounded-xl p-4 flex flex-col justify-between gap-3 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-xl shadow-inner">
                🎟️
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white">Ticket Count:</span>
                  <span className={`text-2xl font-black ${stats.active >= totalCapacity ? "text-red-400" : "text-emerald-400"}`}>
                    {Math.max(0, totalCapacity - stats.active)}
                  </span>
                  <span className="text-xs text-gray-400 font-medium">/ {totalCapacity} left</span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  {stats.active} tickets registered &bull; decreases automatically on registration
                </p>
              </div>
            </div>

            {isSuperAdmin && (
              <div>
                {isEditingCapacity ? (
                  <div className="flex items-center gap-1.5 bg-gray-900/90 border border-indigo-500/40 p-1.5 rounded-xl">
                    <input
                      type="number"
                      min={1}
                      max={10000}
                      value={capacityInput}
                      onChange={(e) => setCapacityInput(e.target.value)}
                      className="w-16 px-2 py-1 bg-gray-800 border border-gray-700 text-white rounded-lg text-xs font-bold focus:outline-none focus:border-indigo-400"
                    />
                    <button
                      onClick={handleSaveCapacity}
                      disabled={savingCapacity}
                      className="px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
                    >
                      {savingCapacity ? "..." : "Save"}
                    </button>
                    <button
                      onClick={() => { setIsEditingCapacity(false); setCapacityInput(String(totalCapacity)); }}
                      disabled={savingCapacity}
                      className="px-1.5 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded-lg"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setIsEditingCapacity(true); setCapacityInput(String(totalCapacity)); }}
                    className="px-2.5 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-semibold transition-all"
                  >
                    Edit Capacity ({totalCapacity})
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Capacity Progress Bar */}
          <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden border border-gray-700">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                stats.active >= totalCapacity
                  ? "bg-red-500"
                  : stats.active / totalCapacity > 0.8
                  ? "bg-amber-400"
                  : "bg-emerald-400"
              }`}
              style={{ width: `${Math.min(100, (stats.active / totalCapacity) * 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* ── Summary Stats Cards ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-800/60 border border-gray-700/60 rounded-xl p-4">
          <div className="text-xs uppercase font-medium tracking-wider text-gray-400">Total Registered</div>
          <div className="text-2xl font-bold text-white mt-1">{stats.total}</div>
          <div className="text-xs text-gray-500 mt-1">External attendees</div>
        </div>

        <div className="bg-gray-800/60 border border-emerald-500/20 rounded-xl p-4">
          <div className="text-xs uppercase font-medium tracking-wider text-emerald-400">Active Passes</div>
          <div className="text-2xl font-bold text-emerald-300 mt-1">{stats.active}</div>
          <div className="text-xs text-emerald-500/80 mt-1">Eligible for gate entry</div>
        </div>

        <div className="bg-gray-800/60 border border-red-500/20 rounded-xl p-4">
          <div className="text-xs uppercase font-medium tracking-wider text-red-400">Revoked / Ineligible</div>
          <div className="text-2xl font-bold text-red-300 mt-1">{stats.revoked}</div>
          <div className="text-xs text-red-500/80 mt-1">Access revoked by admin</div>
        </div>

        <div className="bg-gray-800/60 border border-indigo-500/20 rounded-xl p-4">
          <div className="text-xs uppercase font-medium tracking-wider text-indigo-400">Referral Mix</div>
          <div className="text-xl font-bold text-white mt-1">
            {stats.studentReferrals} <span className="text-xs font-normal text-gray-400">students</span> / {stats.facultyReferrals} <span className="text-xs font-normal text-gray-400">faculty</span>
          </div>
          <div className="text-xs text-indigo-400/80 mt-1">CCET internal referrers</div>
        </div>
      </div>

      {/* ── Search & Filter Controls ──────────────────────────────────────── */}
      <div className="bg-gray-800/40 border border-gray-700/60 rounded-xl p-4 space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search by visitor name, phone, email, college, referrer, or event..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 text-white pl-10 pr-10 py-2.5 rounded-xl text-sm focus:outline-none focus:border-[#F3C87A] transition-colors"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Status Tabs */}
          <div className="flex rounded-xl bg-gray-900 p-1 border border-gray-700">
            <button
              onClick={() => setStatusFilter("All")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                statusFilter === "All"
                  ? "bg-[#F3C87A] text-[#131318]"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              All ({registrations.length})
            </button>
            <button
              onClick={() => setStatusFilter("active")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                statusFilter === "active"
                  ? "bg-emerald-600 text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Active ({stats.active})
            </button>
            <button
              onClick={() => setStatusFilter("revoked")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                statusFilter === "revoked"
                  ? "bg-red-600 text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Revoked ({stats.revoked})
            </button>
          </div>

          {/* Referral Type Filter */}
          <div className="flex rounded-xl bg-gray-900 p-1 border border-gray-700">
            <button
              onClick={() => setReferralFilter("All")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                referralFilter === "All" ? "bg-gray-700 text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              All Referrals
            </button>
            <button
              onClick={() => setReferralFilter("student")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                referralFilter === "student" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              Student
            </button>
            <button
              onClick={() => setReferralFilter("faculty")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                referralFilter === "faculty" ? "bg-purple-600 text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              Faculty
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-gray-400">
          <div>
            Showing <span className="font-semibold text-white">{filteredRegistrations.length}</span> of {registrations.length} visitor passes
          </div>
          {(searchTerm || statusFilter !== "All" || referralFilter !== "All") && (
            <button
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("All");
                setReferralFilter("All");
              }}
              className="text-[#F3C87A] hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* ── Registrations Table ───────────────────────────────────────────── */}
      {loading ? (
        <div className="flex justify-center p-16">
          <RefreshCw className="w-8 h-8 animate-spin text-[#F3C87A]" />
        </div>
      ) : (
        <div className="bg-gray-800/40 rounded-xl border border-gray-700 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-800/90 text-gray-300 border-b border-gray-700">
                <tr>
                  <th className="px-4 py-3.5 font-semibold text-xs whitespace-nowrap">#</th>
                  <th className="px-4 py-3.5 font-semibold text-xs whitespace-nowrap">Visitor Details</th>
                  <th className="px-4 py-3.5 font-semibold text-xs whitespace-nowrap">College & Dept</th>
                  <th className="px-4 py-3.5 font-semibold text-xs whitespace-nowrap">Referred By</th>
                  <th className="px-4 py-3.5 font-semibold text-xs whitespace-nowrap">Qualifying Event</th>
                  <th className="px-4 py-3.5 font-semibold text-xs whitespace-nowrap text-center">College ID Proof</th>
                  <th className="px-4 py-3.5 font-semibold text-xs whitespace-nowrap text-center">Status</th>
                  <th className="px-4 py-3.5 font-semibold text-xs whitespace-nowrap">Registered</th>
                  <th className="px-4 py-3.5 font-semibold text-xs whitespace-nowrap text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/60">
                {filteredRegistrations.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-gray-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <AlertCircle className="w-8 h-8 text-gray-500" />
                        <p className="text-base font-medium text-gray-300">No visitor registrations found</p>
                        <p className="text-xs text-gray-500">Try adjusting your search or status filters.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredRegistrations.map((reg, i) => {
                    const isRevoked = reg.approvalStatus === "revoked";
                    const fileId = reg.collegeIdFileId || reg.studentCollegeIdFileId || reg.facultyIdFileId;

                    return (
                      <tr
                        key={reg.id}
                        className={`hover:bg-gray-700/30 transition-colors ${
                          isRevoked ? "bg-red-950/10" : ""
                        }`}
                      >
                        <td className="px-4 py-4 text-gray-400 text-xs font-mono">{i + 1}</td>

                        {/* Visitor Info */}
                        <td className="px-4 py-4">
                          <div className="font-semibold text-white text-sm flex items-center gap-1.5">
                            <span>{reg.name}</span>
                            {reg.createdByAdmin && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-normal">
                                Admin Created
                              </span>
                            )}
                          </div>
                          <div className="text-gray-400 text-xs mt-0.5">{reg.phone}</div>
                          <div className="text-gray-500 text-xs truncate max-w-[180px]">{reg.email}</div>
                        </td>

                        {/* College & Department */}
                        <td className="px-4 py-4">
                          <div className="text-gray-200 text-sm font-medium">{reg.college}</div>
                          <div className="text-gray-400 text-xs">{reg.department}</div>
                        </td>

                        {/* Referring Person */}
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                                reg.referringType === "student"
                                  ? "bg-blue-500/20 text-blue-300"
                                  : "bg-purple-500/20 text-purple-300"
                              }`}
                            >
                              {reg.referringType}
                            </span>
                            <span className="text-white text-xs font-medium">
                              {reg.referringName || reg.referringStudentName || reg.referringFacultyName}
                            </span>
                          </div>
                          {(reg.referringDepartment || reg.referringYear) && (
                            <div className="text-gray-400 text-xs mt-0.5">
                              {reg.referringDepartment}
                              {reg.referringYear ? ` • ${reg.referringYear}` : ""}
                            </div>
                          )}
                        </td>

                        {/* Qualifying Event */}
                        <td className="px-4 py-4">
                          <div
                            className="text-emerald-400 text-xs font-medium truncate max-w-[170px]"
                            title={reg.qualifyingPaidEvent || "Paid Event"}
                          >
                            {reg.qualifyingPaidEvent || "Departmental Event"}
                          </div>
                          <div className="text-gray-500 text-[11px]">Pass: Abheri & Proshow</div>
                        </td>

                        {/* Proof Viewer (Like Abheri) */}
                        <td className="px-4 py-4 text-center">
                          {(() => {
                            const proofUrl = getProofUrl(reg);
                            return proofUrl ? (
                              <a
                                href={proofUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-indigo-400 hover:text-indigo-300 text-xs inline-flex items-center justify-center gap-1 hover:underline font-medium"
                                title="Open uploaded ID in Google Drive"
                              >
                                <span>View Proof</span>
                                <ExternalLink size={11} />
                              </a>
                            ) : (
                              <span className="text-gray-500 text-xs italic">No ID uploaded</span>
                            );
                          })()}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-4 text-center">
                          {isRevoked ? (
                            <div className="inline-flex flex-col items-center">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-500/20 text-red-400 border border-red-500/30">
                                Revoked
                              </span>
                              {reg.revokedReason && (
                                <span
                                  className="text-[10px] text-red-400/80 mt-0.5 max-w-[120px] truncate"
                                  title={reg.revokedReason}
                                >
                                  {reg.revokedReason}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              Active
                            </span>
                          )}
                        </td>

                        {/* Registered Date */}
                        <td className="px-4 py-4 text-gray-400 text-xs whitespace-nowrap">
                          {formatDate(reg.createdAt)}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* View details */}
                            <button
                              onClick={() => setSelectedReg(reg)}
                              className="p-1.5 rounded-lg bg-gray-700/60 hover:bg-gray-700 text-gray-200 transition-colors"
                              title="View full pass details"
                            >
                              <Eye size={15} />
                            </button>

                            {/* Deregister / Revoke */}
                            {!isRevoked ? (
                              <button
                                onClick={() => handleDeregister(reg)}
                                disabled={actionLoadingId === reg.id}
                                className="px-2.5 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-semibold transition-colors disabled:opacity-50"
                                title="Revoke visitor pass"
                              >
                                {actionLoadingId === reg.id ? "..." : "Revoke"}
                              </button>
                            ) : (
                              <button
                                onClick={() => handleRestore(reg)}
                                disabled={actionLoadingId === reg.id}
                                className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition-colors disabled:opacity-50"
                                title="Restore to Active pass"
                              >
                                {actionLoadingId === reg.id ? "..." : "Restore"}
                              </button>
                            )}

                            {/* Permanent Delete for Super Admin */}
                            {isSuperAdmin && (
                              <button
                                onClick={() => setDeleteConfirmId(reg.id)}
                                className="p-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-400 transition-colors"
                                title="Delete record permanently"
                              >
                                <Trash2 size={15} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Modal 1: Details View Modal ───────────────────────────────────── */}
      {selectedReg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[#181820] border border-gray-700 rounded-2xl max-w-2xl w-full p-6 text-white space-y-6 shadow-2xl relative my-8">
            <div className="flex items-start justify-between border-b border-gray-700/80 pb-4">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold text-white">{selectedReg.name}</h2>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      selectedReg.approvalStatus === "revoked"
                        ? "bg-red-500/20 text-red-400 border border-red-500/30"
                        : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    }`}
                  >
                    {selectedReg.approvalStatus === "revoked" ? "Revoked" : "Active Pass"}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-1">Pass ID: {selectedReg.id}</p>
              </div>
              <button
                onClick={() => setSelectedReg(null)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Grid Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="bg-gray-800/40 p-3.5 rounded-xl border border-gray-700/60 space-y-2">
                <div className="text-xs font-semibold text-[#F3C87A] uppercase tracking-wider">
                  Visitor Information
                </div>
                <div>
                  <span className="text-gray-400 text-xs">Phone:</span>
                  <div className="font-mono text-white">{selectedReg.phone}</div>
                </div>
                <div>
                  <span className="text-gray-400 text-xs">Email:</span>
                  <div className="text-white text-xs">{selectedReg.email}</div>
                </div>
                <div>
                  <span className="text-gray-400 text-xs">College:</span>
                  <div className="text-white font-medium">{selectedReg.college}</div>
                </div>
                <div>
                  <span className="text-gray-400 text-xs">Department:</span>
                  <div className="text-white">{selectedReg.department}</div>
                </div>
                <div>
                  <span className="text-gray-400 text-xs">Visitor Year of Study:</span>
                  <div className="text-white font-medium">{selectedReg.yearOfStudy || "N/A"}</div>
                </div>
                {selectedReg.userId && (
                  <div>
                    <span className="text-gray-400 text-xs">User Account UID:</span>
                    <div className="text-gray-400 text-xs font-mono">{selectedReg.userId}</div>
                  </div>
                )}
              </div>

              <div className="bg-gray-800/40 p-3.5 rounded-xl border border-gray-700/60 space-y-2">
                <div className="text-xs font-semibold text-[#F3C87A] uppercase tracking-wider">
                  Referral Details
                </div>
                <div>
                  <span className="text-gray-400 text-xs">Referral Type:</span>
                  <div className="capitalize text-white font-medium">{selectedReg.referringType}</div>
                </div>
                <div>
                  <span className="text-gray-400 text-xs">Referred By:</span>
                  <div className="text-white font-medium">
                    {selectedReg.referringName ||
                      selectedReg.referringStudentName ||
                      selectedReg.referringFacultyName ||
                      "N/A"}
                  </div>
                </div>
                <div>
                  <span className="text-gray-400 text-xs">Referrer Department:</span>
                  <div className="text-white">{selectedReg.referringDepartment || "N/A"}</div>
                </div>
                {selectedReg.referringYear && (
                  <div>
                    <span className="text-gray-400 text-xs">Referrer Student Year:</span>
                    <div className="text-white">{selectedReg.referringYear}</div>
                  </div>
                )}
              </div>

              <div className="bg-gray-800/40 p-3.5 rounded-xl border border-gray-700/60 space-y-2">
                <div className="text-xs font-semibold text-[#F3C87A] uppercase tracking-wider">
                  Pass & Event Eligibility
                </div>
                <div>
                  <span className="text-gray-400 text-xs">Pass Validity:</span>
                  <div className="text-emerald-400 font-bold">Valid for 08 &amp; 09 Oct</div>
                </div>
                <div>
                  <span className="text-gray-400 text-xs">Pass Fee / Payment:</span>
                  <div className="text-white font-medium">
                    ₹{selectedReg.amountPaid !== undefined ? selectedReg.amountPaid : (selectedReg.fee !== undefined ? selectedReg.fee : 250)}{" "}
                    <span className="text-xs text-green-400">({selectedReg.paymentStatus || "Paid"})</span>
                  </div>
                  {selectedReg.razorpayPaymentId && (
                    <div className="text-gray-400 text-xs font-mono">PID: {selectedReg.razorpayPaymentId}</div>
                  )}
                </div>
                <div>
                  <span className="text-gray-400 text-xs">Qualifying Paid Event:</span>
                  <div className="text-emerald-400 font-medium">
                    {selectedReg.qualifyingPaidEvent || "Departmental Event"}
                  </div>
                </div>
                <div>
                  <span className="text-gray-400 text-xs">Events Granted:</span>
                  <div className="text-white font-medium">Abheri (Day 1) &amp; Proshow (Day 2)</div>
                </div>
                {selectedReg.notes && (
                  <div>
                    <span className="text-gray-400 text-xs">Admin Notes:</span>
                    <div className="text-gray-300 text-xs">{selectedReg.notes}</div>
                  </div>
                )}
              </div>

              <div className="bg-gray-800/40 p-3.5 rounded-xl border border-gray-700/60 space-y-2">
                <div className="text-xs font-semibold text-[#F3C87A] uppercase tracking-wider">
                  ID Proof & Timestamps
                </div>
                <div>
                  <span className="text-gray-400 text-xs">College ID Proof:</span>
                  <div className="mt-1">
                    {(() => {
                      const proofUrl = getProofUrl(selectedReg);
                      return proofUrl ? (
                        <a
                          href={proofUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium transition-colors"
                        >
                          <ExternalLink size={14} />
                          <span>View Proof Link</span>
                        </a>
                      ) : (
                        <span className="text-gray-500 text-xs">No document uploaded</span>
                      );
                    })()}
                  </div>
                </div>
                <div>
                  <span className="text-gray-400 text-xs">Registered At:</span>
                  <div className="text-white text-xs">{formatDate(selectedReg.createdAt)}</div>
                </div>
                {selectedReg.approvalStatus === "revoked" && (
                  <div className="bg-red-950/40 p-2 rounded-lg border border-red-800/40 mt-2">
                    <span className="text-red-400 text-xs font-semibold">Revocation Reason:</span>
                    <div className="text-red-300 text-xs">{selectedReg.revokedReason || "N/A"}</div>
                    {selectedReg.revokedAt && (
                      <div className="text-red-400/80 text-[11px] mt-0.5">
                        Revoked on: {formatDate(selectedReg.revokedAt)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-gray-700">
              <div className="flex items-center gap-2">
                {selectedReg.approvalStatus === "revoked" ? (
                  <button
                    onClick={() => handleRestore(selectedReg)}
                    disabled={actionLoadingId === selectedReg.id}
                    className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
                  >
                    <UserCheck size={16} />
                    <span>Restore Pass to Active</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleDeregister(selectedReg)}
                    disabled={actionLoadingId === selectedReg.id}
                    className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
                  >
                    <UserX size={16} />
                    <span>Revoke Pass</span>
                  </button>
                )}

                {isSuperAdmin && (
                  <button
                    onClick={() => {
                      setDeleteConfirmId(selectedReg.id);
                    }}
                    className="flex items-center gap-1.5 bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-800/50 px-3 py-2 rounded-xl text-sm transition-colors"
                  >
                    <Trash2 size={16} />
                    <span>Delete Record</span>
                  </button>
                )}
              </div>

              <button
                onClick={() => setSelectedReg(null)}
                className="bg-gray-700 hover:bg-gray-600 text-gray-200 px-5 py-2 rounded-xl text-sm font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal 2: Super Admin Add Visitor Pass ─────────────────────────── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[#181820] border border-gray-700 rounded-2xl max-w-xl w-full p-6 text-white space-y-5 shadow-2xl relative my-8">
            <div className="flex items-center justify-between border-b border-gray-700 pb-3">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <span>+ Add Visitor Pass</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-normal">
                    Super Admin Direct Grant
                  </span>
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Directly register an external attendee for Abheri & Proshow.
                </p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateManualRegistration} className="space-y-4 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    Visitor Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. John Doe"
                    value={addForm.name}
                    onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-[#F3C87A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    10-Digit Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="9876543210"
                    value={addForm.phone}
                    onChange={(e) =>
                      setAddForm({ ...addForm, phone: e.target.value.replace(/\D/g, "") })
                    }
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-[#F3C87A]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    Visitor Email (optional)
                  </label>
                  <input
                    type="email"
                    placeholder="visitor@example.com"
                    value={addForm.email}
                    onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-[#F3C87A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    Visitor College Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. TKM College of Engg"
                    value={addForm.college}
                    onChange={(e) => setAddForm({ ...addForm, college: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-[#F3C87A]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    Visitor Department / Branch
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Computer Science"
                    value={addForm.department}
                    onChange={(e) => setAddForm({ ...addForm, department: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-[#F3C87A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    Visitor Year of Study *
                  </label>
                  <select
                    value={addForm.yearOfStudy}
                    onChange={(e) => setAddForm({ ...addForm, yearOfStudy: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-[#F3C87A]"
                  >
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="border-t border-gray-700 pt-3">
                <div className="text-xs font-semibold text-[#F3C87A] mb-2 uppercase">
                  Referral Details (CCET)
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">
                      Referring Type
                    </label>
                    <select
                      value={addForm.referringType}
                      onChange={(e) =>
                        setAddForm({
                          ...addForm,
                          referringType: e.target.value as "student" | "faculty",
                        })
                      }
                      className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-[#F3C87A]"
                    >
                      <option value="student">Student</option>
                      <option value="faculty">Faculty</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">
                      Referrer Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rahul S"
                      value={addForm.referringName}
                      onChange={(e) => setAddForm({ ...addForm, referringName: e.target.value })}
                      className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-[#F3C87A]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">
                      Referrer Dept
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. CSE"
                      value={addForm.referringDepartment}
                      onChange={(e) =>
                        setAddForm({ ...addForm, referringDepartment: e.target.value })
                      }
                      className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-[#F3C87A]"
                    />
                  </div>
                </div>

                {addForm.referringType === "student" && (
                  <div className="mt-2">
                    <label className="block text-xs font-medium text-gray-300 mb-1">
                      Referrer Student Year
                    </label>
                    <select
                      value={addForm.referringYear}
                      onChange={(e) => setAddForm({ ...addForm, referringYear: e.target.value })}
                      className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-[#F3C87A]"
                    >
                      <option value="1st Year">1st Year</option>
                      <option value="2nd Year">2nd Year</option>
                      <option value="3rd Year">3rd Year</option>
                      <option value="4th Year">4th Year</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 border-t border-gray-700 pt-3">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    Qualifying Event / Grant Reason
                  </label>
                  <input
                    type="text"
                    value={addForm.qualifyingPaidEvent}
                    onChange={(e) =>
                      setAddForm({ ...addForm, qualifyingPaidEvent: e.target.value })
                    }
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-[#F3C87A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    Admin Notes (optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Special guest / VIP / Manual approval"
                    value={addForm.notes}
                    onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-[#F3C87A]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-700">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-gray-300 hover:text-white text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addFormSubmitting}
                  className="bg-[#F3C87A] hover:bg-[#E5B86A] text-[#131318] px-5 py-2 rounded-xl font-semibold text-sm transition-colors disabled:opacity-50"
                >
                  {addFormSubmitting ? "Creating..." : "Issue Visitor Pass"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal 3: Delete Confirmation Modal ────────────────────────────── */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="bg-[#181820] border border-red-700/60 rounded-2xl max-w-md w-full p-6 text-white space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-red-400">
              <AlertCircle size={24} />
              <h3 className="text-lg font-bold">Permanently Delete Pass?</h3>
            </div>
            <p className="text-sm text-gray-300">
              Are you sure you want to permanently delete this registration record? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3 pt-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-xl text-gray-300 hover:text-white text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeletePermanent(deleteConfirmId)}
                disabled={actionLoadingId === deleteConfirmId}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
              >
                {actionLoadingId === deleteConfirmId ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
