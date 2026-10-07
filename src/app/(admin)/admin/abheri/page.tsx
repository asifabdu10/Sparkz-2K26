"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy, doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/utils/firebase";
import { Loader2, Download, Printer, ExternalLink, Search } from "lucide-react";
import * as XLSX from "xlsx";
import { toastError, toastSuccess } from "@/utils/common/Toast";
import { useAuth } from "@/context/AuthContext";

interface Registration {
  id: string;
  bandName: string;
  collegeName: string;
  managerName: string;
  managerMobile: string;
  leaderName: string;
  leaderMobile: string;
  musiciansCount: string;
  vocalistCount: string;
  instrumentalistCount: string;
  instruments: string[];
  transactionId: string;
  screenshotUrl: string;
  userId: string;
  userEmail: string;
  createdAt: any; // Timestamp
  updatedAt: any; // Timestamp
}

export default function AbheriAdmin() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [registrationOpen, setRegistrationOpen] = useState(true);
  const [statusLoading, setStatusLoading] = useState(true);
  const [statusSaving, setStatusSaving] = useState(false);

  const { userData, loading: authLoading } = useAuth();

  const fetchRegistrationStatus = async () => {
    try {
      const snap = await getDoc(
        doc(db, "eventSettings", "abheri")
      );

      setRegistrationOpen(
        snap.exists()
          ? snap.data().registrationOpen !== false
          : true
      );
    } catch (error) {
      console.error("Error fetching registration status:", error);
      toastError("Failed to fetch registration status");
    } finally {
      setStatusLoading(false);
    }
  };

  useEffect(() => {
    fetchRegistrations();
    fetchRegistrationStatus();
  }, []);
  const toggleRegistration = async () => {
    if (
      !userData ||
      (
        userData.role !== "abheriAdmin" &&
        userData.role !== "superAdmin"
      )
    ) {
      toastError(
        "You do not have permission to change registration status."
      );
      return;
    }

    setStatusSaving(true);

    try {
      const nextValue = !registrationOpen;

      await setDoc(
        doc(db, "eventSettings", "abheri"),
        {
          registrationOpen: nextValue,
          updatedAt: new Date(),
        },
        { merge: true }
      );

      setRegistrationOpen(nextValue);

      toastSuccess(
        nextValue
          ? "Abheri registration opened."
          : "Abheri registration closed."
      );
    } catch (error) {
      console.error(
        "Error updating registration status:",
        error
      );

      toastError(
        "Failed to update registration status."
      );
    } finally {
      setStatusSaving(false);
    }
  };

  const fetchRegistrations = async () => {
    try {
      const q = query(
        collection(db, "abheri_registrations"),
        orderBy("createdAt", "desc")
      );
      const querySnapshot = await getDocs(q);
      const data: Registration[] = [];
      querySnapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as Registration);
      });
      setRegistrations(data);
    } catch (error) {
      console.error("Error fetching registrations:", error);
      toastError("Failed to fetch registrations");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "N/A";
    // Check if it's a Firestore Timestamp
    if (timestamp.seconds) {
      return new Date(timestamp.seconds * 1000).toLocaleString();
    }
    // Fallback if it's already a date or string
    return new Date(timestamp).toLocaleString();
  };

  const handleExportCSV = () => {
    const exportData = registrations.map((reg) => ({
      "Band Name": reg.bandName,
      "College Name": reg.collegeName,
      "Manager Name": reg.managerName,
      "Manager Mobile": reg.managerMobile,
      "Leader Name": reg.leaderName,
      "Leader Mobile": reg.leaderMobile,
      "Musicians Count": reg.musiciansCount,
      Vocalists: reg.vocalistCount,
      Instrumentalists: reg.instrumentalistCount,
      Instruments: Array.isArray(reg.instruments)
        ? reg.instruments.join(", ")
        : reg.instruments,
      "Transaction ID": reg.transactionId,
      "Screenshot URL": reg.screenshotUrl,
      "User Email": reg.userEmail,
      "User ID": reg.userId,
      "Created At": formatDate(reg.createdAt),
      "Updated At": formatDate(reg.updatedAt),
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Abheri Registrations");
    XLSX.writeFile(wb, "Abheri_Registrations.xlsx");
  };

  const handlePrint = () => {
    window.print();
  };

  const filteredRegistrations = registrations.filter(
    (reg) =>
      reg.bandName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reg.collegeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reg.transactionId.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-3xl font-bold text-white">
            Abheri Registrations
          </h1>
          <p className="text-gray-400 mt-1">
            Manage and view all band registrations
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">

          {/* Registration Status */}
          <div
            className={`flex items-center gap-3 rounded-xl border px-4 py-2 ${registrationOpen
                ? "border-green-500/30 bg-green-500/10"
                : "border-red-500/30 bg-red-500/10"
              }`}
          >
            <div>
              <p className="text-xs text-gray-400">
                Registration
              </p>

              <p
                className={`font-semibold ${registrationOpen
                    ? "text-green-300"
                    : "text-red-300"
                  }`}
              >
                {statusLoading
                  ? "Loading..."
                  : registrationOpen
                    ? "OPEN"
                    : "CLOSED"}
              </p>
            </div>

            {(userData?.role === "abheriAdmin" || userData?.role === "superAdmin") && (
              <button
                type="button"
                onClick={toggleRegistration}
                disabled={
                  statusLoading ||
                  statusSaving ||
                  authLoading
                }
                className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 ${registrationOpen
                    ? "bg-red-600 hover:bg-red-500"
                    : "bg-green-600 hover:bg-green-500"
                  }`}
              >
                {statusSaving
                  ? "Saving..."
                  : registrationOpen
                    ? "Close"
                    : "Open"}
              </button>
            )}
          </div>


          {/* Export Excel */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Download size={18} /> Export Excel
          </button>

          {/* Print / PDF */}
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Printer size={18} /> Print / PDF
          </button>

        </div>
      </div>

      <div className="relative print:hidden">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          size={20}
        />
        <input
          type="text"
          placeholder="Search by Band, College, or Transaction ID..."
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
        <div className="bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden print:border-none print:bg-white print:text-black">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm print:text-xs">
              <thead className="bg-gray-800 text-gray-300 border-b border-gray-700 print:bg-gray-100 print:text-black">
                <tr>
                  <th className="px-6 py-4 font-semibold whitespace-nowrap">
                    Band Details
                  </th>
                  <th className="px-6 py-4 font-semibold whitespace-nowrap">
                    Contact Info
                  </th>
                  <th className="px-6 py-4 font-semibold whitespace-nowrap">
                    Members
                  </th>
                  <th className="px-6 py-4 font-semibold whitespace-nowrap">
                    Payment
                  </th>
                  <th className="px-6 py-4 font-semibold whitespace-nowrap">
                    Submission Date
                  </th>
                  <th className="px-6 py-4 font-semibold whitespace-nowrap print:hidden">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700 print:divide-gray-300">
                {filteredRegistrations.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-8 text-center text-gray-400"
                    >
                      No registrations found.
                    </td>
                  </tr>
                ) : (
                  filteredRegistrations.map((reg) => (
                    <tr
                      key={reg.id}
                      className="hover:bg-gray-700/50 transition-colors print:hover:bg-transparent"
                    >
                      <td className="px-6 py-4">
                        <div className="font-medium text-white print:text-black">
                          {reg.bandName}
                        </div>
                        <div className="text-gray-400 text-xs print:text-gray-600">
                          {reg.collegeName}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-gray-300 print:text-black">
                          <span className="text-gray-500 text-xs">Mgr:</span>{" "}
                          {reg.managerName}
                        </div>
                        <div className="text-gray-400 text-xs font-mono">
                          {reg.managerMobile}
                        </div>
                        <div className="text-gray-300 mt-1 print:text-black">
                          <span className="text-gray-500 text-xs">Ldr:</span>{" "}
                          {reg.leaderName}
                        </div>
                        <div className="text-gray-400 text-xs font-mono">
                          {reg.leaderMobile}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-gray-300 print:text-black">
                          Total: {reg.musiciansCount}
                        </div>
                        <div className="text-gray-400 text-xs">
                          V: {reg.vocalistCount} | I: {reg.instrumentalistCount}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {reg.instruments &&
                            reg.instruments.slice(0, 3).map((inst, i) => (
                              <span
                                key={i}
                                className="px-1.5 py-0.5 bg-indigo-500/20 text-indigo-300 text-[10px] rounded print:border print:border-gray-300 print:text-black print:bg-transparent"
                              >
                                {inst}
                              </span>
                            ))}
                          {reg.instruments && reg.instruments.length > 3 && (
                            <span className="px-1.5 py-0.5 bg-gray-700 text-gray-300 text-[10px] rounded print:text-black print:bg-transparent">
                              +{reg.instruments.length - 3}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-mono text-xs text-gray-300 print:text-black">
                          {reg.transactionId}
                        </div>
                        {reg.screenshotUrl ? (
                          <a
                            href={reg.screenshotUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-400 hover:text-indigo-300 text-xs flex items-center gap-1 mt-1 print:hidden"
                          >
                            View Proof <ExternalLink size={10} />
                          </a>
                        ) : (
                          <span className="text-red-400 text-xs">
                            No screenshot
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-400 text-xs print:text-black">
                        {formatDate(reg.createdAt)}
                      </td>
                      <td className="px-6 py-4 print:hidden">
                        {/* <button className="text-gray-400 hover:text-white transition-colors">
                                <span className="sr-only">Menu</span>
                                ...
                            </button> */}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Print-only Footer */}
      <div className="hidden print:block mt-8 text-center text-sm text-gray-500">
        Generated from Sparkz Admin Dashboard - {new Date().toLocaleString()}
      </div>
    </div>
  );
}
