"use client";

import React from "react";
import Link from "next/link";
import { useMaintenance } from "@/context/MaintenanceContext";
import { useAuth } from "@/context/AuthContext";
import MaintenanceScreen from "./MaintenanceScreen";
import { FiAlertTriangle, FiSettings } from "react-icons/fi";

export default function MaintenanceGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isMaintenance, maintenanceMessage, maintenanceLoading, refetchMaintenance } =
    useMaintenance();
  const { userData, loading: authLoading } = useAuth();

  const isSuperAdmin = userData?.role === "superAdmin";

  // While checking initial maintenance status, show children without flicker
  if (maintenanceLoading && authLoading) {
    return <>{children}</>;
  }

  // If maintenance mode is ON:
  if (isMaintenance) {
    // Super Admin gets access with a persistent warning banner
    if (isSuperAdmin) {
      return (
        <div className="relative">
          <div className="bg-gradient-to-r from-amber-600 via-yellow-600 to-amber-700 text-black px-4 py-2 text-xs md:text-sm font-bold flex items-center justify-between shadow-lg sticky top-0 z-50 border-b border-black/20">
            <div className="flex items-center gap-2">
              <FiAlertTriangle className="w-4 h-4 shrink-0 animate-bounce" />
              <span>
                <strong>MAINTENANCE MODE IS ON:</strong> Public visitors cannot access the site and see the maintenance screen. You have Super Admin bypass access.
              </span>
            </div>
            <Link
              href="/admin"
              className="ml-4 px-3 py-1 bg-black text-amber-300 rounded-lg text-xs font-semibold hover:bg-black/80 transition-colors flex items-center gap-1.5 shrink-0"
            >
              <FiSettings className="w-3.5 h-3.5" />
              Admin Panel
            </Link>
          </div>
          {children}
        </div>
      );
    }

    // Normal users and guests see the maintenance screen
    return (
      <MaintenanceScreen
        message={maintenanceMessage}
        onRefresh={refetchMaintenance}
      />
    );
  }

  // Normal live operation
  return <>{children}</>;
}
