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

// Helper to safely parse JSON from a fetch response without ever throwing syntax errors on HTML responses
async function safeParseJson(res: Response): Promise<{ ok: boolean; data: any }> {
  try {
    const text = await res.text();
    if (!text || !text.trim().startsWith("{")) {
      return { ok: res.ok, data: { error: text?.slice(0, 150) || "Invalid server response" } };
    }
    return { ok: res.ok, data: JSON.parse(text) };
  } catch {
    return { ok: false, data: { error: "Failed to parse server response" } };
  }
}

export const MaintenanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isMaintenance, setIsMaintenance] = useState<boolean>(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState<string>("");
  const [maintenanceUpdatedAt, setMaintenanceUpdatedAt] = useState<string | null>(null);
  const [maintenanceLoading, setMaintenanceLoading] = useState<boolean>(true);
  const { userData, user } = useAuth();

  // 1. Real-time Firestore listener for instant synchronization.
  // We use "eventSettings/maintenance" because eventSettings already has "allow read: if true;"
  // and "allow create, update: if isAdmin();" deployed in existing Firestore rules.
  useEffect(() => {
    let isSubscribed = true;

    try {
      const docRef = doc(db, "eventSettings", "maintenance");
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
        async (err) => {
          console.warn("[MaintenanceProvider] Real-time listener note (trying fallback):", err?.message);
          try {
            const res = await fetch("/api/admin/maintenance");
            const parsed = await safeParseJson(res);
            if (isSubscribed && parsed.ok && parsed.data) {
              setIsMaintenance(Boolean(parsed.data.enabled));
              setMaintenanceMessage(parsed.data.message || "");
            }
          } catch {
            // Non-fatal fallback
          } finally {
            if (isSubscribed) setMaintenanceLoading(false);
          }
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
      const parsed = await safeParseJson(res);
      if (parsed.ok && parsed.data) {
        setIsMaintenance(Boolean(parsed.data.enabled));
        if (typeof parsed.data.message === "string") {
          setMaintenanceMessage(parsed.data.message);
        }
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

      const payload = {
        enabled,
        message: effectiveMessage,
        updatedAt: serverTimestamp(),
        updatedBy: user?.email || userData.email || "superAdmin",
      };

      let clientWriteSuccess = false;

      // 1. Direct write to Firestore via client SDK (using eventSettings which is permitted in rules)
      try {
        await setDoc(doc(db, "eventSettings", "maintenance"), payload, { merge: true });
        clientWriteSuccess = true;
      } catch (clientErr) {
        console.warn("[toggleMaintenance] Client write to eventSettings failed:", clientErr);
      }

      // Also try systemSettings doc in case new rules are active
      try {
        await setDoc(doc(db, "systemSettings", "maintenance"), payload, { merge: true });
        clientWriteSuccess = true;
      } catch {
        // Ignored if rules pending deploy
      }

      // 2. Also call server API route safely as backup
      try {
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

        const parsed = await safeParseJson(res);
        if (parsed.ok) {
          clientWriteSuccess = true;
        } else if (!clientWriteSuccess) {
          throw new Error(parsed.data?.error || "Failed to update maintenance status on server");
        }
      } catch (apiErr: any) {
        if (!clientWriteSuccess) {
          throw apiErr;
        }
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
