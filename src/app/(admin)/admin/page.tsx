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
} from "react-icons/fi";
import { FiRefreshCw } from "react-icons/fi";
import { getAdminDashboardStats } from "@/utils/firestoreCache";

export default function AdminDashboard() {
  const { userData } = useAuth();

  const [totalUsers, setTotalUsers] = useState<number>(0);
  const [totalEvents, setTotalEvents] = useState<number>(0);
  const [totalRegistrations, setTotalRegistrations] = useState<number>(0);
  const [paidRegistrations, setPaidRegistrations] = useState<number>(0);
  const [pendingRegistrations, setPendingRegistrations] =
    useState<number>(0);
  const [freeRegistrations, setFreeRegistrations] = useState<number>(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      </div>
    </div>
  );
}