"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { doc, onSnapshot, setDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "@/utils/firebase";
import { useAuth } from "@/context/AuthContext";
import { toastSuccess, toastError } from "@/utils/common/Toast";

interface MaintenanceContextType {
  isMaintenance: boolean;
  maintenanceMessage: string;
  maintenanceUpdatedAt: string | null;
  maintenanceLoading: boolean;
  toggleMaintenance: (enabled: boolean, message?: string) => Promise<boolean>;
  refetchMaintenance: () => Promise<void>;
}

const MaintenanceContext = createContext<MaintenanceContextType | undefined>(undefined);

export const MaintenanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isMaintenance, setIsMaintenance] = useState<boolean>(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState<string>("");
  const [maintenanceUpdatedAt, setMaintenanceUpdatedAt] = useState<string | null>(null);
  const [maintenanceLoading, setMaintenanceLoading] = useState<boolean>(true);
  const { userData, user } = useAuth();

  // 1. Real-time Firestore listener for instant synchronization
  useEffect(() => {
    let isSubscribed = true;

    try {
      const docRef = doc(db, "systemSettings", "maintenance");
      const unsubscribe = onSnapshot(
        docRef,
        (snap) => {
          if (!isSubscribed) return;
          if (snap.exists()) {
            const data = snap.data();
            setIsMaintenance(Boolean(data?.enabled));
            setMaintenanceMessage(data?.message || "");
            const dateVal = data?.updatedAt?.toDate?.() || data?.updatedAt;
            setMaintenanceUpdatedAt(dateVal ? new Date(dateVal).toLocaleString() : null);
          } else {
            setIsMaintenance(false);
            setMaintenanceMessage("");
            setMaintenanceUpdatedAt(null);
          }
          setMaintenanceLoading(false);
        },
        (err) => {
          console.warn("[MaintenanceProvider] Real-time listener note (falling back to REST):", err?.message);
          // If Firestore permissions or rules block direct read, fallback to REST API
          fetch("/api/admin/maintenance")
            .then((r) => r.json())
            .then((res) => {
              if (isSubscribed && res) {
                setIsMaintenance(Boolean(res.enabled));
                setMaintenanceMessage(res.message || "");
              }
            })
            .catch(() => {})
            .finally(() => {
              if (isSubscribed) setMaintenanceLoading(false);
            });
        }
      );

      return () => {
        isSubscribed = false;
        unsubscribe();
      };
    } catch (e) {
      console.warn("[MaintenanceProvider] Init error:", e);
      setMaintenanceLoading(false);
    }
  }, []);

  const refetchMaintenance = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/maintenance");
      const data = await res.json();
      setIsMaintenance(Boolean(data.enabled));
      if (typeof data.message === "string") {
        setMaintenanceMessage(data.message);
      }
    } catch (e) {
      console.error("[MaintenanceProvider] Refetch failed:", e);
    }
  }, []);

  const toggleMaintenance = async (enabled: boolean, message?: string): Promise<boolean> => {
    if (userData?.role !== "superAdmin") {
      toastError("Permission denied: Only Super Admins can toggle maintenance mode.");
      return false;
    }

    try {
      const effectiveMessage =
        typeof message === "string" ? message.trim() : maintenanceMessage;

      // 1. Update directly in Firestore via client SDK (superAdmin rule allows this)
      try {
        await setDoc(
          doc(db, "systemSettings", "maintenance"),
          {
            enabled,
            message: effectiveMessage,
            updatedAt: serverTimestamp(),
            updatedBy: user?.email || userData.email || "superAdmin",
          },
          { merge: true }
        );
      } catch (clientErr) {
        console.warn("[toggleMaintenance] Client write note (calling API route):", clientErr);
      }

      // 2. Also call server API route with Firebase ID token for guaranteed administrative authority
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/admin/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled,
          message: effectiveMessage,
          firebaseIdToken: token || "",
          userId: user?.uid,
        }),
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || "Failed to update maintenance state on server");
      }

      setIsMaintenance(enabled);
      setMaintenanceMessage(effectiveMessage);

      if (enabled) {
        toastSuccess("Site Maintenance Mode turned ON 🚨");
      } else {
        toastSuccess("Site restored to NORMAL! Public access is live 🎉");
      }

      return true;
    } catch (error: any) {
      console.error("[toggleMaintenance] Error:", error);
      toastError(error?.message || "Failed to toggle maintenance mode.");
      return false;
    }
  };

  return (
    <MaintenanceContext.Provider
      value={{
        isMaintenance,
        maintenanceMessage,
        maintenanceUpdatedAt,
        maintenanceLoading,
        toggleMaintenance,
        refetchMaintenance,
      }}
    >
      {children}
    </MaintenanceContext.Provider>
  );
};

export const useMaintenance = () => {
  const context = useContext(MaintenanceContext);
  if (!context) {
    throw new Error("useMaintenance must be used within a MaintenanceProvider");
  }
  return context;
};
