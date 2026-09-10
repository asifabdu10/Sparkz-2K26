"use client";

import { useAuth } from "@/context/AuthContext";
import { db } from "@/utils/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { FiDownload } from "react-icons/fi";
import { toastError } from "@/utils/common/Toast";
import { Event } from "@/utils/types/event";

interface UserRegistration {
  id: string;
  [key: string]: unknown;
}

export default function RegistrationsManagement() {
  const { userData } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [registrations, setRegistrations] = useState<UserRegistration[]>([]);
  const [loading, setLoading] = useState(false);
  const [eventsLoading, setEventsLoading] = useState(true);

  useEffect(() => {
    if (userData) fetchEvents();
  }, [userData]);

  useEffect(() => {
    if (selectedEventId) fetchRegistrations(selectedEventId);
    else setRegistrations([]);
  }, [selectedEventId]);

  const fetchEvents = async () => {
    try {
      setEventsLoading(true);
      let q;
      if (userData?.role === "superAdmin") {
        q = query(collection(db, "events"));
      } else if (userData?.role === "admin" && userData.department) {
        q = query(collection(db, "events"), where("department", "==", userData.department));
      } else {
        setEvents([]);
        return;
      }

      const snapshot = await getDocs(q);
      setEvents(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })) as Event[]);
    } catch (error) {
      console.error("Error fetching events:", error);
      toastError("Failed to fetch events");
    } finally {
      setEventsLoading(false);
    }
  };

  const fetchRegistrations = async (eventId: string) => {
    setLoading(true);
    try {
      const q = query(collection(db, "registrations"), where("eventId", "==", eventId));
      const snapshot = await getDocs(q);
      setRegistrations(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })) as UserRegistration[]);
    } catch (error) {
      console.error("Error fetching registrations:", error);
      toastError("Failed to fetch registrations from Firebase");
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    if (!registrations.length) return;

    const eventName = events.find((e) => e.id === selectedEventId)?.title || "Event";
    const rows = registrations.map((reg) => {
      const row: Record<string, string | number> = {};

      Object.entries(reg).forEach(([key, value]) => {
        if (key === "id" || key === "createdAt" || key === "updatedAt") return;
        if (Array.isArray(value)) {
          row[key] = value.map((item) => typeof item === "object" ? JSON.stringify(item) : String(item)).join(" | ");
        } else if (value && typeof value === "object") {
          row[key] = JSON.stringify(value);
        } else if (value !== undefined && value !== null) {
          row[key] = String(value);
        } else {
          row[key] = "";
        }
      });

      return row;
    });

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Registrations");
    XLSX.writeFile(workbook, `${eventName.replace(/[^a-z0-9_-]/gi, "_")}_Registrations.xlsx`);
  };

  if (!userData) return null;

  return (
    <div className="text-white max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Registrations</h1>

      <div className="mb-8">
        <label className="block text-sm text-gray-400 mb-2">Select Event</label>
        <div className="relative max-w-xl">
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 appearance-none focus:outline-none focus:border-indigo-500"
            disabled={eventsLoading}
          >
            <option value="">-- Choose an Event --</option>
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.title} ({event.department})
              </option>
            ))}
          </select>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">▼</div>
        </div>
      </div>

      {selectedEventId && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-6 border-b border-gray-800 flex justify-between items-center flex-wrap gap-4">
            <div>
              <h2 className="text-xl font-semibold">{events.find((e) => e.id === selectedEventId)?.title}</h2>
              <p className="text-sm text-gray-500 mt-1">{registrations.length} Total Registrations</p>
            </div>
            <button
              onClick={exportToExcel}
              disabled={!registrations.length || loading}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-800 disabled:text-gray-600 text-white px-4 py-2 rounded-lg transition-colors font-medium"
            >
              <FiDownload /> Export Excel
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-800/50">
                  <th className="p-4 font-semibold text-gray-400 text-sm">Name</th>
                  <th className="p-4 font-semibold text-gray-400 text-sm">Email</th>
                  <th className="p-4 font-semibold text-gray-400 text-sm">Phone</th>
                  <th className="p-4 font-semibold text-gray-400 text-sm">College</th>
                  <th className="p-4 font-semibold text-gray-400 text-sm">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {loading ? (
                  <tr><td colSpan={5} className="p-8 text-center text-gray-500">Loading registrations...</td></tr>
                ) : registrations.length ? (
                  registrations.map((reg) => (
                    <tr key={reg.id} className="hover:bg-gray-800/30">
                      <td className="p-4 font-medium">{String(reg.userName || reg.name || reg.leaderName || "N/A")}</td>
                      <td className="p-4 text-gray-400">{String(reg.userEmail || reg.email || reg.leaderEmail || "N/A")}</td>
                      <td className="p-4 text-gray-400">{String(reg.leaderMobile || reg.phone || "N/A")}</td>
                      <td className="p-4 text-gray-400">{String(reg.leaderCollege || reg.college || "N/A")}</td>
                      <td className="p-4">
                        <span className="text-xs px-3 py-1 rounded-full bg-emerald-950/40 text-emerald-300 border border-emerald-500/30">
                          {String(reg.status || "registered")}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={5} className="p-8 text-center text-gray-500">No registrations found for this event.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
