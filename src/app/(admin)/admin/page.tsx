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
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/utils/firebase";

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

  useEffect(() => {
    if (!userData) return;

    const loadDashboardStats = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch all users
        const usersSnapshot = await getDocs(collection(db, "users"));
        setTotalUsers(usersSnapshot.size);

        // Fetch all events
        const eventsSnapshot = await getDocs(collection(db, "events"));
        setTotalEvents(eventsSnapshot.size);

        // Fetch all registrations
        const registrationsSnapshot = await getDocs(
          collection(db, "registrations")
        );

        let paid = 0;
        let pending = 0;
        let free = 0;

        registrationsSnapshot.forEach((registrationDoc) => {
          const data = registrationDoc.data();

          const status = String(data.status || "").toLowerCase();

          if (status === "paid") {
            paid++;
          } else if (status === "pending") {
            pending++;
          } else if (
            status === "free" ||
            status === "registered"
          ) {
            free++;
          }
        });

        setTotalRegistrations(registrationsSnapshot.size);
        setPaidRegistrations(paid);
        setPendingRegistrations(pending);
        setFreeRegistrations(free);
      } catch (err) {
        console.error("Error loading dashboard statistics:", err);
        setError(
          "Unable to load dashboard statistics. Please check your Firestore permissions."
        );
      } finally {
        setLoading(false);
      }
    };

    loadDashboardStats();
  }, [userData]);

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
      <h1 className="text-3xl font-bold text-white mb-2">
        Dashboard
      </h1>

      <p className="text-gray-400 mb-8">
        Welcome back, {userData.name}
      </p>

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
        {userData.role === "superAdmin" && (
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
              View users and assign roles.
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