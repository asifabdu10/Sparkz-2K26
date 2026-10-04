"use client";
import { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/utils/firebase";
import { Loader2, Download, Search, Mail, UserX, UserCheck, Trash2 } from "lucide-react";
import * as XLSX from "xlsx";
import { toastError, toastSuccess } from "@/utils/common/Toast";
import { useAuth } from "@/context/AuthContext";

interface AlumniRegistration {
  id: string;
  userId?: string;
  name: string;
  passedOutYear: number;
  batch: string;
  contact: string;
  email: string;
  status?: "registered" | "deregistered";
  emailStatus?: string;
  createdAt: { seconds: number; nanoseconds: number } | null;
}

export default function AlumniRegistrationsAdmin() {
  const { user, userData } = useAuth();
  const [registrations, setRegistrations] = useState<AlumniRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [deregisteringId, setDeregisteringId] = useState<string | null>(null);
  const [bulkSending, setBulkSending] = useState(false);

  useEffect(() => { fetchRegistrations(); }, []);

  const fetchRegistrations = async () => {
    try {
      const q = query(collection(db, "alumni_registrations"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      const data: AlumniRegistration[] = [];
      snap.forEach((d) => data.push({ id: d.id, ...d.data() } as AlumniRegistration));
      setRegistrations(data);
    } catch (error) {
      console.error("Error fetching alumni registrations:", error);
      toastError("Failed to fetch alumni registrations");
    } finally {
      setLoading(false);
    }
  };

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
          passedOutYear: reg.passedOutYear,
          batch: reg.batch,
          contact: reg.contact,
          registrationId: reg.id,
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
    let confirmMsg = `Are you sure you want to deregister ${reg.name} (${reg.batch})?`;
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
        toastSuccess(`Deleted registration for ${reg.name}`);
      } else if (action === "restore") {
        setRegistrations((prev) =>
          prev.map((r) => (r.id === reg.id ? { ...r, status: "registered" } : r))
        );
        toastSuccess(`Restored registration for ${reg.name}`);
      } else {
        setRegistrations((prev) =>
          prev.map((r) => (r.id === reg.id ? { ...r, status: "deregistered" } : r))
        );
        toastSuccess(`Deregistered ${reg.name}`);
      }
    } catch (err: unknown) {
      const e = err as { message?: string };
      toastError(e?.message || "Failed to update alumni registration");
    } finally {
      setDeregisteringId(null);
    }
  };

  const handleSendAllPending = async () => {
    const pending = registrations.filter((r) => r.status !== "deregistered" && r.emailStatus !== "sent");
    if (!pending.length) {
      toastSuccess("All active alumni have already received their confirmation emails!");
      return;
    }
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
            passedOutYear: reg.passedOutYear,
            batch: reg.batch,
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
      reg.batch?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeCount = registrations.filter((r) => r.status !== "deregistered").length;
  const deregisteredCount = registrations.filter((r) => r.status === "deregistered").length;
  const pendingCount = registrations.filter((r) => r.status !== "deregistered" && r.emailStatus !== "sent").length;

  const handleExport = () => {
    const exportData = filteredRegistrations.map((reg) => ({
      "Name": reg.name,
      "Passed Out Year": reg.passedOutYear,
      "Batch": reg.batch,
      "Contact": reg.contact,
      "Email": reg.email,
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
            onClick={handleExport}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors text-sm font-semibold"
          >
            <Download size={18} /> Export Excel
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Search by name, email, or batch..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 text-white pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

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
                  <th className="px-4 py-4 font-semibold whitespace-nowrap">Passed Out Year</th>
                  <th className="px-4 py-4 font-semibold whitespace-nowrap">Batch</th>
                  <th className="px-4 py-4 font-semibold whitespace-nowrap">Contact</th>
                  <th className="px-4 py-4 font-semibold whitespace-nowrap">Email</th>
                  <th className="px-4 py-4 font-semibold whitespace-nowrap">Registration Status</th>
                  <th className="px-4 py-4 font-semibold whitespace-nowrap">Email Status</th>
                  <th className="px-4 py-4 font-semibold whitespace-nowrap">Date</th>
                  <th className="px-4 py-4 font-semibold whitespace-nowrap text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {filteredRegistrations.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-6 py-8 text-center text-gray-400">No alumni registrations found.</td>
                  </tr>
                ) : (
                  filteredRegistrations.map((reg, i) => (
                    <tr key={reg.id} className={`hover:bg-gray-700/50 transition-colors ${reg.status === "deregistered" ? "opacity-60 bg-red-950/10" : ""}`}>
                      <td className="px-4 py-4 text-gray-400 text-xs">{i + 1}</td>
                      <td className="px-4 py-4">
                        <div className="font-medium text-white">{reg.name}</div>
                        <div className="text-gray-500 text-xs font-mono">{reg.id.slice(0, 8)}...</div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-[#F3C87A]/20 text-[#F3C87A]">
                          {reg.passedOutYear}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-gray-300">{reg.batch}</td>
                      <td className="px-4 py-4 text-gray-300 font-mono text-xs">{reg.contact}</td>
                      <td className="px-4 py-4 text-gray-300 text-xs">{reg.email}</td>
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
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                          reg.emailStatus === "sent"
                            ? "bg-green-500/20 text-green-300 border border-green-500/30"
                            : reg.emailStatus === "failed"
                            ? "bg-red-500/20 text-red-300 border border-red-500/30"
                            : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                        }`}>
                          {reg.emailStatus || "pending"}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-gray-400 text-xs">{formatDate(reg.createdAt)}</td>
                      <td className="px-4 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
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
    </div>
  );
}
