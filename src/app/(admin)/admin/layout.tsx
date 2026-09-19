"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  FiUsers,
  FiCalendar,
  FiList,
  FiHome,
  FiLogOut,
  FiMenu,
  FiX,
  FiMusic,
} from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, userData, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/login");
      } else if (
        userData?.role !== "superAdmin" &&
        userData?.role !== "admin" &&
        userData?.role !== "abheriAdmin"
      ) {
        router.push("/");
      }
    }
  }, [user, userData, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (
    !userData ||
    (userData.role !== "superAdmin" &&
      userData.role !== "admin" &&
      userData.role !== "abheriAdmin")
  ) {
    return null;
  }

  const navItems = [
    {
      name: "Dashboard",
      href: "/admin",
      icon: FiHome,
      roles: ["superAdmin", "admin"],
    },
    {
      name: "Users",
      href: "/admin/users",
      icon: FiUsers,
      roles: ["superAdmin"],
    },
    {
      name: "Events",
      href: "/admin/events",
      icon: FiCalendar,
      roles: ["superAdmin", "admin"],
    },
    {
      name: "Registrations",
      href: "/admin/registrations",
      icon: FiList,
      roles: ["superAdmin", "admin"],
    },
    {
      name: "Abheri",
      href: "/admin/abheri",
      icon: FiMusic,
      roles: ["superAdmin", "abheriAdmin"],
    },
  ];

  const filteredNavItems = navItems.filter((item) =>
    item.roles.includes(userData.role || "")
  );

  return (
    <div className="min-h-screen bg-gray-900 text-white flex">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-gray-800 border-r border-gray-700 min-h-screen fixed left-0 top-0 z-20">
        <div className="p-6 border-b border-gray-700">
          <h1 className="text-2xl font-bold bg-linear-to-r from-indigo-400 to-fuchsia-400 bg-clip-text text-transparent">
            Sparkz Admin
          </h1>
          <p className="text-xs text-gray-400 mt-1 uppercase tracking-wider">
            {userData.role} Panel
          </p>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {filteredNavItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  isActive
                    ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/30"
                    : "text-gray-400 hover:bg-gray-700 hover:text-white"
                }`}
              >
                <item.icon size={20} />
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-700">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-sm font-bold">
              {userData.name?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium truncate">{userData.name}</p>
              <p className="text-xs text-gray-500 truncate">{userData.email}</p>
            </div>
          </div>
          <button
            onClick={() => logout()}
            className="w-full flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 py-2 rounded-lg transition-colors text-sm font-medium"
          >
            <FiLogOut /> Logout
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 w-full bg-gray-900/90 backdrop-blur z-30 border-b border-gray-800 p-4 flex justify-between items-center">
        <h1 className="text-lg font-bold bg-linear-to-r from-indigo-400 to-fuchsia-400 bg-clip-text text-transparent">
          Sparkz Admin
        </h1>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-gray-300 hover:text-white"
        >
          {isMobileMenuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
        </button>
      </div>

      {/* Mobile Menu & Backdrop */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
            />

            {/* Drawer */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.4 }}
              className="fixed inset-y-0 left-0 w-72 bg-gray-900 z-50 md:hidden border-r border-gray-800 flex flex-col shadow-2xl"
            >
              <div className="p-6 border-b border-gray-800 flex justify-between items-center">
                <span className="text-xl font-bold bg-linear-to-r from-indigo-400 to-fuchsia-400 bg-clip-text text-transparent">
                  Sparkz Admin
                </span>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 -mr-2 text-gray-400 hover:text-white"
                >
                  <FiX size={24} />
                </button>
              </div>

              <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                {filteredNavItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                        isActive
                          ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/30"
                          : "text-gray-400 hover:bg-gray-800 hover:text-white"
                      }`}
                    >
                      <item.icon size={20} />
                      <span className="font-medium">{item.name}</span>
                    </Link>
                  );
                })}
              </nav>

              <div className="p-4 border-t border-gray-800">
                <div className="flex items-center gap-3 mb-4 px-2">
                  <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-sm font-bold shadow-lg shadow-indigo-500/20">
                    {userData.name?.[0]?.toUpperCase() || "U"}
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-sm font-medium truncate text-white">
                      {userData.name}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {userData.email}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => logout()}
                  className="w-full flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 py-3 rounded-xl transition-colors text-sm font-medium"
                >
                  <FiLogOut /> Logout
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <main className="flex-1 md:ml-64 p-4 md:p-8 pt-20 md:pt-8 bg-[#04050b] min-h-screen overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
