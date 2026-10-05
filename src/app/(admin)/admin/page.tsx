"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import {
  FiUsers,
  FiCalendar,
  FiList,
  FiCheckCircle,
  FiClock,
  FiXCircle,
  FiMusic,
  FiTool,
  FiRefreshCw,
} from "react-icons/fi";
import { getAdminDashboardStats } from "@/utils/firestoreCache";
import { useMaintenance } from "@/context/MaintenanceContext";

export default function AdminDashboard() {
  const { userData } = useAuth();
  const {
    isMaintenance,
    maintenanceMessage,
    maintenanceUpdatedAt,
    maintenanceLoading,
    toggleMaintenance,
  } = useMaintenance();

  const [messageInput, setMessageInput] = useState("");
  const [togglingMaintenance, setTogglingMaintenance] = useState(false);
  const [savingMessage, setSavingMessage] = useState(false);

  useEffect(() => {
    setMessageInput(maintenanceMessage || "");
  }, [maintenanceMessage]);

  const [totalUsers, setTotalUsers] = useState<number>(0);
  const [totalEvents, setTotalEvents] = useState<number>(0);
  const [totalRegistrations, setTotalRegistrations] = useState<number>(0);
  const [paidRegistrations, setPaidRegistrations] = useState<number>(0);
  const [pendingRegistrations, setPendingRegistrations] =
    useState<number>(0);
  const [freeRegistrations, setFreeRegistrations] = useState<number>(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleToggleMaintenance = async () => {
    const nextState = !isMaintenance;
    const confirmText = nextState
      ? "Turn ON Maintenance Mode?\n\nPublic users will NOT be able to view events or register. They will see the Maintenance screen."
      : "Turn OFF Maintenance Mode?\n\nPublic website access will be restored to normal.";
    if (!window.confirm(confirmText)) return;

    try {
      setTogglingMaintenance(true);
      await toggleMaintenance(nextState, messageInput);
    } finally {
      setTogglingMaintenance(false);
    }
  };

  const handleSaveMessage = async () => {
    try {
      setSavingMessage(true);
      await toggleMaintenance(isMaintenance, messageInput);
    } finally {
      setSavingMessage(false);
    }
  };

  const loadDashboardStats = async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);

      // Uses Firestore getCountFromServer aggregation queries (~1 read per 1,000 docs)
      // instead of downloading every document in the entire database.
      const statsData = await getAdminDashboardStats(forceRefresh);

      setTotalUsers(statsData.totalUsers);
      setTotalEvents(statsData.totalEvents);
      setTotalRegistrations(statsData.totalRegistrations);
      setPaidRegistrations(statsData.paidRegistrations);
      setPendingRegistrations(statsData.pendingRegistrations);
      setFreeRegistrations(statsData.freeRegistrations);
    } catch (err) {
      console.error("Error loading dashboard statistics:", err);
      setError(
        "Unable to load dashboard statistics. Please check your Firestore permissions."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!userData) return;
    loadDashboardStats(false);
  }, [userData?.role]);

  if (!userData) return null;

  const stats = [
    {
      title: "Total Users",
      value: loading ? "..." : totalUsers,
      icon: FiUsers,
      color: "bg-blue-500/10 text-blue-400",
    },
    {
      title: "Total Events",
      value: loading ? "..." : totalEvents,
      icon: FiCalendar,
      color: "bg-fuchsia-500/10 text-fuchsia-400",
    },
    {
      title: "Registrations",
      value: loading ? "..." : totalRegistrations,
      icon: FiList,
      color: "bg-emerald-500/10 text-emerald-400",
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Dashboard
          </h1>
          <p className="text-gray-400">
            Welcome back, {userData.name}
          </p>
        </div>
        <button
          onClick={() => loadDashboardStats(true)}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm font-medium rounded-xl border border-gray-700 transition-colors disabled:opacity-50 cursor-pointer"
        >
          <FiRefreshCw className={loading ? "animate-spin" : ""} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Super Admin Maintenance Mode Control */}
      {userData?.role === "superAdmin" && (
        <div
          className={`mb-8 p-6 md:p-8 rounded-3xl border transition-all duration-300 shadow-2xl relative overflow-hidden ${
            isMaintenance
              ? "bg-gradient-to-br from-amber-950/40 via-red-950/20 to-[#131318] border-amber-500/50 shadow-amber-500/10"
              : "bg-[#131318] border-gray-800 hover:border-gray-700 shadow-black/40"
          }`}
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-gray-800">
            <div>
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Super Admin Only
                </span>

                {isMaintenance ? (
                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-red-500/20 text-red-300 border border-red-500/40">
                    <span className="w-2 h-2 rounded-full bg-red-400 animate-ping" />
                    <span className="w-2 h-2 rounded-full bg-red-400 -ml-4" />
                    Maintenance Mode: ACTIVE
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    Site Status: LIVE & NORMAL
                  </span>
                )}
              </div>

              <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2.5">
                <FiTool className={isMaintenance ? "text-amber-400 animate-pulse" : "text-gray-400"} />
                Site Maintenance Control
              </h2>
              <p className="text-sm text-gray-400 mt-1 max-w-2xl leading-relaxed">
                {isMaintenance
                  ? "Public visitors cannot access events, registrations, or the homepage. They see the 'Site Under Maintenance' screen. You have full bypass access to manage and test."
                  : "When toggled ON, the entire public site displays the maintenance screen. Unchecking it instantly restores normal access for all users."}
              </p>
            </div>

            {/* Toggle Switch */}
            <div className="flex items-center gap-4 bg-gray-900/80 p-3.5 rounded-2xl border border-gray-800 shrink-0">
              <span className="text-sm font-semibold text-gray-300">
                {isMaintenance ? "Maintenance ON" : "Maintenance OFF"}
              </span>

              <button
                type="button"
                role="switch"
                aria-checked={isMaintenance}
                disabled={togglingMaintenance || maintenanceLoading}
                onClick={handleToggleMaintenance}
                className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors duration-300 focus:outline-none cursor-pointer disabled:opacity-50 ${
                  isMaintenance ? "bg-amber-500 shadow-lg shadow-amber-500/30" : "bg-gray-700"
                }`}
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-md transition-transform duration-300 ${
                    isMaintenance ? "translate-x-9" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Optional Custom Message & Info */}
          <div className="pt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 flex items-center justify-between">
                <span>Public Notice / Maintenance Message</span>
                <span className="text-gray-500 font-normal">Optional</span>
              </label>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder="e.g. Upgrading servers for Sparkz 2K26. We will be back online shortly!"
                  className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                />
                <button
                  type="button"
                  onClick={handleSaveMessage}
                  disabled={savingMessage}
                  className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm font-semibold rounded-xl border border-gray-700 transition-colors disabled:opacity-50 cursor-pointer shrink-0"
                >
                  {savingMessage ? "Saving..." : "Save Message"}
                </button>
              </div>
              <p className="text-xs text-gray-500">
                This notice is displayed to students and visitors on the maintenance screen.
              </p>
            </div>

            <div className="bg-gray-900/60 p-4 rounded-2xl border border-gray-800 text-xs space-y-2 text-gray-400">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Last Changed:</span>
                <span className="font-mono text-gray-300">{maintenanceUpdatedAt || "Never"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Super Admin Access:</span>
                <span className="text-emerald-400 font-medium">Bypass Active</span>
              </div>
              <div className="pt-2 border-t border-gray-800 flex items-center justify-between">
                <span className="text-gray-500">Preview:</span>
                <Link
                  href="/"
                  target="_blank"
                  className="text-amber-400 hover:underline flex items-center gap-1 font-medium"
                >
                  View Public Site ↗
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {stats.map((stat, idx) => (
          <div
            key={idx}
            className="bg-gray-900 border border-gray-800 p-6 rounded-2xl flex items-center gap-4"
          >
            <div
              className={`p-4 rounded-xl ${stat.color}`}
            >
              <stat.icon size={24} />
            </div>

            <div>
              <p className="text-gray-500 text-sm font-medium">
                {stat.title}
              </p>

              <h3 className="text-2xl font-bold text-white mt-1">
                {stat.value}
              </h3>
            </div>
          </div>
        ))}
      </div>

      {/* Registration Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {/* Paid */}
        <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl flex items-center gap-4">
          <div className="p-4 rounded-xl bg-green-500/10 text-green-400">
            <FiCheckCircle size={24} />
          </div>

          <div>
            <p className="text-gray-500 text-sm font-medium">
              Paid Registrations
            </p>

            <h3 className="text-2xl font-bold text-white mt-1">
              {loading ? "..." : paidRegistrations}
            </h3>
          </div>
        </div>

        {/* Pending */}
        <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl flex items-center gap-4">
          <div className="p-4 rounded-xl bg-yellow-500/10 text-yellow-400">
            <FiClock size={24} />
          </div>

          <div>
            <p className="text-gray-500 text-sm font-medium">
              Pending Registrations
            </p>

            <h3 className="text-2xl font-bold text-white mt-1">
              {loading ? "..." : pendingRegistrations}
            </h3>
          </div>
        </div>

        {/* Free */}
        <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl flex items-center gap-4">
          <div className="p-4 rounded-xl bg-cyan-500/10 text-cyan-400">
            <FiXCircle size={24} />
          </div>

          <div>
            <p className="text-gray-500 text-sm font-medium">
              Free Registrations
            </p>

            <h3 className="text-2xl font-bold text-white mt-1">
              {loading ? "..." : freeRegistrations}
            </h3>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <h2 className="text-xl font-semibold text-white mb-4">
        Quick Actions
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Manage Users */}
        {(userData.role === "superAdmin" || userData.role === "basicScienceAdmin") && (
          <Link
            href="/admin/users"
            className="group p-6 bg-gray-900 border border-gray-800 rounded-2xl hover:border-indigo-500/50 transition-all hover:bg-gray-800"
          >
            <div className="text-indigo-400 mb-4 group-hover:scale-110 transition-transform">
              <FiUsers size={32} />
            </div>

            <h3 className="text-lg font-semibold text-white">
              Manage Users
            </h3>

            <p className="text-sm text-gray-500 mt-2">
              View users and register participants.
            </p>
          </Link>
        )}

        {/* Manage Events */}
        <Link
          href="/admin/events"
          className="group p-6 bg-gray-900 border border-gray-800 rounded-2xl hover:border-fuchsia-500/50 transition-all hover:bg-gray-800"
        >
          <div className="text-fuchsia-400 mb-4 group-hover:scale-110 transition-transform">
            <FiCalendar size={32} />
          </div>

          <h3 className="text-lg font-semibold text-white">
            Manage Events
          </h3>

          <p className="text-sm text-gray-500 mt-2">
            Create and edit events.
          </p>
        </Link>

        {/* Registrations */}
        <Link
          href="/admin/registrations"
          className="group p-6 bg-gray-900 border border-gray-800 rounded-2xl hover:border-emerald-500/50 transition-all hover:bg-gray-800"
        >
          <div className="text-emerald-400 mb-4 group-hover:scale-110 transition-transform">
            <FiList size={32} />
          </div>

          <h3 className="text-lg font-semibold text-white">
            View Registrations
          </h3>

          <p className="text-sm text-gray-500 mt-2">
            Check who registered & export data.
          </p>
        </Link>

        {/* Abheri Registrations */}
        {(userData.role === "superAdmin" || userData.role === "abheriAdmin" || userData.role === "admin") && (
          <Link
            href="/admin/abheri"
            className="group p-6 bg-gray-900 border border-gray-800 rounded-2xl hover:border-purple-500/50 transition-all hover:bg-gray-800"
          >
            <div className="text-purple-400 mb-4 group-hover:scale-110 transition-transform">
              <FiMusic size={32} />
            </div>

            <h3 className="text-lg font-semibold text-white">
              Abheri Registrations
            </h3>

            <p className="text-sm text-gray-500 mt-2">
              View &amp; manage Battle of Bands entries.
            </p>
          </Link>
        )}
      </div>
    </div>
  );
}