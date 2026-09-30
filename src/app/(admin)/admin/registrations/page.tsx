"use client";

import { useAuth } from "@/context/AuthContext";
import { db } from "@/utils/firebase";
import {
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDocs,
  updateDoc,
  setDoc,
  writeBatch,
  query,
  where,
} from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { getAllEvents } from "@/utils/firestoreCache";
import {
  FiDownload,
  FiEye,
  FiSearch,
  FiUsers,
  FiUserX,
  FiUserPlus,
  FiX,
  FiPlus,
  FiTrash2,
  FiCheckCircle,
  FiRefreshCw,
  FiAlertCircle,
  FiClock,
  FiEdit2,
  FiSave,
  FiCopy,
  FiCheck,
  FiFilter,
  FiZap,
} from "react-icons/fi";
import { toastError, toastSuccess } from "@/utils/common/Toast";
import { isBasicScienceDepartment, allowsMultipleRegistrations } from "@/utils/constants/Constants";
import { Event, RegistrationField } from "@/utils/types/event";

interface UserRegistration {
  id: string;
  [key: string]: any;
}

interface EventSummary {
  event: Event;
  registrations: UserRegistration[];
  registrationCount: number;
  memberCount: number;
  pendingCount: number;
  paidCount: number;
  freeCount: number;
}

const isPendingRegistration = (reg: UserRegistration): boolean => {
  const pStatus = String(reg.paymentStatus || "").toLowerCase().trim();
  const rStatus = String(reg.status || "").toLowerCase().trim();
  return pStatus === "pending" || rStatus === "pending";
};

const isPaidRegistration = (reg: UserRegistration): boolean => {
  const pStatus = String(reg.paymentStatus || "").toLowerCase().trim();
  const rStatus = String(reg.status || "").toLowerCase().trim();
  return pStatus === "paid" || rStatus === "paid" || rStatus === "registered";
};

const isFreeRegistration = (reg: UserRegistration): boolean => {
  const pStatus = String(reg.paymentStatus || "").toLowerCase().trim();
  const rMethod = String(reg.registrationMethod || "").toLowerCase().trim();
  return pStatus === "free" || rMethod === "free";
};

const getMemberCount = (registration: UserRegistration) => {
  if (typeof registration.teamSize === "number" && registration.teamSize > 0) {
    return registration.teamSize;
  }

  if (Array.isArray(registration.teamMembers)) {
    return registration.teamMembers.length + 1;
  }

  return 1;
};

const baseMemberFields: RegistrationField[] = [
  { name: "Phone Number", type: "tel", required: true },
  { name: "School / College", type: "text", required: true },
  { name: "Department / Class", type: "text", required: true },
  { name: "Year", type: "text", required: true },
];

const memberInputType = (type: RegistrationField["type"]) => {
  if (type === "email") return "email";
  if (type === "number") return "number";
  if (type === "date") return "date";
  if (type === "tel") return "tel";
  return "text";
};

const getMemberFields = (event: Event): RegistrationField[] => {
  if (event.eveType !== "team") return [];
  if (event.department === "Football") return [{ name: "Phone Number", type: "tel", required: true }];
  const custom = event.teamMemberFields || [];
  const customNames = new Set(custom.map((field) => field.name.toLowerCase().trim()));
  return [
    ...baseMemberFields.filter((field) => !customNames.has(field.name.toLowerCase().trim())),
    ...custom,
  ].filter((field) => event.showMemberYear !== false || field.name.toLowerCase().trim() !== "year");
};

const emptyTeamMember = (fields: RegistrationField[]): Record<string, string> => {
  const member: Record<string, string> = { name: "" };
  fields.forEach((field) => { member[field.name] = ""; });
  return member;
};

const getDepartment = (event: Event) => event.department || "Other";

const getRegistrationName = (registration: UserRegistration) =>
  String(
    registration.userName ||
    registration.name ||
    registration.leaderName ||
    registration.captainName ||
    "N/A"
  );

const getRegistrationEmail = (registration: UserRegistration) =>
  String(
    registration.userEmail ||
    registration.email ||
    registration.leaderEmail ||
    registration.captainEmail ||
    "N/A"
  );

const getRegistrationPhone = (registration: UserRegistration) =>
  String(
    registration.leaderMobile ||
    registration.phone ||
    registration.captainPhone ||
    registration.mobile ||
    "N/A"
  );

const getRegistrationCollege = (registration: UserRegistration) =>
  String(
    registration.leaderCollege ||
    registration.college ||
    registration.captainCollege ||
    "N/A"
  );

const formatValue = (value: unknown) => {
  if (value === null || value === undefined || value === "") return "N/A";
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
};

// In-memory cache for admin registrations with 2-minute TTL
let adminRegsCache: { data: UserRegistration[]; timestamp: number } | null = null;
let adminRegsPromise: Promise<UserRegistration[]> | null = null;

export function invalidateAdminRegistrationsCache() {
  adminRegsCache = null;
  adminRegsPromise = null;
}

export default function RegistrationsManagement() {
  const { userData } = useAuth();

  const [events, setEvents] = useState<Event[]>([]);
  const [registrations, setRegistrations] = useState<UserRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [deregisteringId, setDeregisteringId] = useState<string | null>(null);

  // Main Page Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("All");
  const [eventFilter, setEventFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState<"All" | "pending" | "paid" | "free">("All");

  // Selected Event Modal State
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [modalSearch, setModalSearch] = useState("");
  const [modalStatusFilter, setModalStatusFilter] = useState<"All" | "pending" | "paid" | "free">("All");

  // Selected Registration Details State
  const [selectedRegistration, setSelectedRegistration] = useState<UserRegistration | null>(null);
  const [editingTeamMembers, setEditingTeamMembers] = useState<Record<string, string>[]>([]);
  const [savingTeamMembers, setSavingTeamMembers] = useState(false);

  // Edit Registration Form State
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [savingDetails, setSavingDetails] = useState(false);
  const [editFormData, setEditFormData] = useState({
    leaderName: "",
    leaderEmail: "",
    leaderMobile: "",
    leaderCollege: "",
    leaderDepartment: "",
    leaderYear: "",
    paymentStatus: "pending",
    status: "pending",
    razorpayPaymentId: "",
    razorpayOrderId: "",
    registrationFee: 0 as number | string,
    extraData: {} as Record<string, any>,
    newExtraKey: "",
    newExtraValue: "",
  });

  // Quick Resolve State
  const [quickPaymentId, setQuickPaymentId] = useState("");
  const [quickOrderId, setQuickOrderId] = useState("");
  const [quickConfirming, setQuickConfirming] = useState(false);

  // Copy helper
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const isSuperAdmin = userData?.role === "superAdmin";
  const isBasicScienceAdmin = userData?.role === "basicScienceAdmin";

  // State for registering new participant without Google login
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [addingNewUser, setAddingNewUser] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    selectedEventId: "",
    name: "",
    email: "",
    mobile: "",
    college: "",
    department: "",
    year: "",
    extraData: {} as Record<string, string>,
    teamMembers: [] as Record<string, string>[],
  });

  useEffect(() => {
    if (!userData) return;
    void loadData(false);
  }, [userData?.role]);

  const loadData = async (forceRefresh = false) => {
    try {
      setLoading(true);

      const now = Date.now();
      const eventsPromise = getAllEvents(forceRefresh);

      let regsPromise: Promise<UserRegistration[]>;
      if (!forceRefresh && adminRegsCache && now - adminRegsCache.timestamp < 2 * 60 * 1000) {
        regsPromise = Promise.resolve(adminRegsCache.data);
      } else if (adminRegsPromise) {
        regsPromise = adminRegsPromise;
      } else {
        adminRegsPromise = (async () => {
          try {
            const registrationsSnapshot = await getDocs(collection(db, "registrations"));
            const list = registrationsSnapshot.docs.map((item) => ({
              id: item.id,
              ...item.data(),
            })) as UserRegistration[];
            adminRegsCache = { data: list, timestamp: Date.now() };
            return list;
          } finally {
            adminRegsPromise = null;
          }
        })();
        regsPromise = adminRegsPromise;
      }

      const [eventList, registrationList] = await Promise.all([
        eventsPromise,
        regsPromise,
      ]);

      const allowedEventIds = new Set(eventList.map((event) => event.id));
      const visibleRegistrations = registrationList.filter((registration) =>
        allowedEventIds.has(String(registration.eventId || ""))
      );

      setEvents(eventList);
      setRegistrations(visibleRegistrations);
    } catch (error) {
      console.error("Error loading registration management:", error);
      toastError("Failed to load events and registrations");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    if (!text || text === "N/A") return;
    void navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const availableEvents = useMemo(() => {
    return events.filter((event) => {
      const isRegistrable = (event.registrationMode || "online") !== "none";
      if (!isRegistrable) return false;
      if (isBasicScienceAdmin && !isSuperAdmin) {
        return isBasicScienceDepartment(event.department);
      }
      return true;
    });
  }, [events, isBasicScienceAdmin, isSuperAdmin]);

  const summaries = useMemo<EventSummary[]>(() => {
    const relevantEvents = isBasicScienceAdmin && !isSuperAdmin
      ? events.filter(e => isBasicScienceDepartment(e.department))
      : events;

    return relevantEvents
      .map((event) => {
        const eventRegistrations = registrations.filter(
          (registration) => registration.eventId === event.id
        );

        return {
          event,
          registrations: eventRegistrations,
          registrationCount: eventRegistrations.length,
          memberCount: eventRegistrations.reduce(
            (total, registration) => total + getMemberCount(registration),
            0
          ),
          pendingCount: eventRegistrations.filter(isPendingRegistration).length,
          paidCount: eventRegistrations.filter(isPaidRegistration).length,
          freeCount: eventRegistrations.filter(isFreeRegistration).length,
        };
      })
      .sort((a, b) => a.event.title.localeCompare(b.event.title));
  }, [events, registrations, isBasicScienceAdmin, isSuperAdmin]);

  const departments = useMemo(() => {
    return Array.from(
      new Set(summaries.map((summary) => getDepartment(summary.event)))
    ).sort((a, b) => a.localeCompare(b));
  }, [summaries]);

  const totalPendingCount = useMemo(() => {
    return registrations.filter(isPendingRegistration).length;
  }, [registrations]);

  const totalPaidCount = useMemo(() => {
    return registrations.filter(isPaidRegistration).length;
  }, [registrations]);

  const filteredSummaries = useMemo(() => {
    const lower = searchTerm.trim().toLowerCase();

    return summaries.filter((summary) => {
      const departmentMatches =
        departmentFilter === "All" ||
        getDepartment(summary.event) === departmentFilter;

      const eventMatches =
        eventFilter === "All" || summary.event.id === eventFilter;

      const statusMatches =
        statusFilter === "All" ||
        (statusFilter === "pending" && summary.pendingCount > 0) ||
        (statusFilter === "paid" && summary.paidCount > 0) ||
        (statusFilter === "free" && summary.freeCount > 0);

      const searchMatches =
        !lower ||
        summary.event.title.toLowerCase().includes(lower) ||
        getDepartment(summary.event).toLowerCase().includes(lower) ||
        summary.registrations.some((r) =>
          getRegistrationName(r).toLowerCase().includes(lower) ||
          getRegistrationEmail(r).toLowerCase().includes(lower) ||
          getRegistrationPhone(r).toLowerCase().includes(lower) ||
          String(r.id || "").toLowerCase().includes(lower) ||
          String(r.razorpayPaymentId || "").toLowerCase().includes(lower) ||
          String(r.razorpayOrderId || "").toLowerCase().includes(lower)
        );

      return departmentMatches && eventMatches && statusMatches && searchMatches;
    });
  }, [summaries, departmentFilter, eventFilter, statusFilter, searchTerm]);

  const visibleRegistrationCount = filteredSummaries.reduce(
    (total, summary) => total + summary.registrationCount,
    0
  );

  const visibleMemberCount = filteredSummaries.reduce(
    (total, summary) => total + summary.memberCount,
    0
  );

  const visiblePendingCount = filteredSummaries.reduce(
    (total, summary) => total + summary.pendingCount,
    0
  );

  const selectedSummary = selectedEventId
    ? summaries.find((summary) => summary.event.id === selectedEventId) || null
    : null;

  const selectedEventRegistrations = selectedSummary?.registrations || [];

  const displayedEventRegistrations = useMemo(() => {
    const lower = modalSearch.trim().toLowerCase();
    return selectedEventRegistrations.filter((reg) => {
      const statusMatches =
        modalStatusFilter === "All" ||
        (modalStatusFilter === "pending" && isPendingRegistration(reg)) ||
        (modalStatusFilter === "paid" && isPaidRegistration(reg)) ||
        (modalStatusFilter === "free" && isFreeRegistration(reg));

      const searchMatches =
        !lower ||
        getRegistrationName(reg).toLowerCase().includes(lower) ||
        getRegistrationEmail(reg).toLowerCase().includes(lower) ||
        getRegistrationPhone(reg).toLowerCase().includes(lower) ||
        getRegistrationCollege(reg).toLowerCase().includes(lower) ||
        String(reg.id || "").toLowerCase().includes(lower) ||
        String(reg.razorpayPaymentId || "").toLowerCase().includes(lower) ||
        String(reg.razorpayOrderId || "").toLowerCase().includes(lower);

      return statusMatches && searchMatches;
    });
  }, [selectedEventRegistrations, modalSearch, modalStatusFilter]);

  const exportRows = (sourceSummaries: EventSummary[]) => {
    const rows: Record<string, string | number>[] = [];

    sourceSummaries.forEach((summary) => {
      summary.registrations.forEach((reg, registrationIndex) => {
        const event = summary.event;
        const row: Record<string, string | number> = {
          Department: getDepartment(event),
          Event: event.title,
          "Registration #": registrationIndex + 1,
          "Registration ID": reg.id,
          "Registration Status": String(reg.status || ""),
          "Payment Status": String(reg.paymentStatus || ""),
          "Registration Method": String(reg.registrationMethod || "online"),
          "Ticket Number": String(reg.ticketNumber || ""),
          "Ticket Email Status": String(reg.ticketEmailStatus || ""),
          "Registered By": String(reg.registeredBy || ""),
          Name: getRegistrationName(reg),
          Email: getRegistrationEmail(reg),
          Phone: getRegistrationPhone(reg),
          "School / College": getRegistrationCollege(reg),
          "Department / Class": String(
            reg.leaderDepartment || reg.department || ""
          ),
          Year: String(reg.leaderYear || reg.year || ""),
          "Team Size": getMemberCount(reg),
          "Registration Fee": String(reg.registrationFee || "0"),
          "Razorpay Payment ID": String(reg.razorpayPaymentId || ""),
          "Razorpay Order ID": String(reg.razorpayOrderId || ""),
        };

        if (Array.isArray(reg.teamMembers)) {
          reg.teamMembers.forEach((member: Record<string, unknown>, index: number) => {
            const memberNo = index + 2;
            Object.entries(member || {}).forEach(([key, value]) => {
              if (
                key.toLowerCase() === "year" &&
                event.showMemberYear === false
              ) {
                return;
              }

              const label = key
                .replace(/([A-Z])/g, " $1")
                .replace(/^./, (char) => char.toUpperCase());

              row[`Member ${memberNo} ${label}`] = formatValue(value);
            });
          });
        }

        if (reg.extraData && typeof reg.extraData === "object") {
          Object.entries(reg.extraData).forEach(([key, value]) => {
            row[key] = formatValue(value);
          });
        }

        rows.push(row);
      });
    });

    return rows;
  };

  const exportSummary = () => {
    if (!filteredSummaries.length) return;

    const summaryRows = filteredSummaries.map((summary) => ({
      Department: getDepartment(summary.event),
      Event: summary.event.title,
      "Registration Mode": summary.event.registrationMode || "online",
      "Event Start": summary.event.startDate || summary.event.date || "",
      "Event End": summary.event.endDate || summary.event.startDate || "",
      "Registered Teams / Entries": summary.registrationCount,
      "Total Members": summary.memberCount,
      "Registration Fee": summary.event.registrationFee || "0",
      Venue: summary.event.venue || "",
    }));

    const detailRows = exportRows(filteredSummaries);

    const workbook = XLSX.utils.book_new();
    const summarySheet = XLSX.utils.json_to_sheet(summaryRows);
    const detailSheet = XLSX.utils.json_to_sheet(detailRows);

    XLSX.utils.book_append_sheet(workbook, summarySheet, "Event Summary");
    XLSX.utils.book_append_sheet(workbook, detailSheet, "Registrations");

    XLSX.writeFile(workbook, "Sparkz_Registration_Report.xlsx");
    toastSuccess("Excel report generated successfully");
  };

  const exportSingleEvent = (summary: EventSummary) => {
    const workbook = XLSX.utils.book_new();
    const detailRows = exportRows([summary]);
    const detailSheet = XLSX.utils.json_to_sheet(detailRows);
    XLSX.utils.book_append_sheet(workbook, detailSheet, "Registrations");
    XLSX.writeFile(
      workbook,
      `${summary.event.title.replace(/[^a-z0-9_-]/gi, "_")}_Registrations.xlsx`
    );
  };

  const openRegistrationDetails = (registration: UserRegistration) => {
    setSelectedRegistration(registration);
    setIsEditingDetails(false);
    setQuickPaymentId(String(registration.razorpayPaymentId || ""));
    setQuickOrderId(String(registration.razorpayOrderId || ""));

    const regName = getRegistrationName(registration);
    const regEmail = getRegistrationEmail(registration);
    const regPhone = getRegistrationPhone(registration);
    const regCollege = getRegistrationCollege(registration);

    setEditFormData({
      leaderName: regName === "N/A" ? "" : regName,
      leaderEmail: regEmail === "N/A" ? "" : regEmail,
      leaderMobile: regPhone === "N/A" ? "" : regPhone,
      leaderCollege: regCollege === "N/A" ? "" : regCollege,
      leaderDepartment: String(registration.leaderDepartment || registration.department || ""),
      leaderYear: String(registration.leaderYear || registration.year || ""),
      paymentStatus: String(registration.paymentStatus || "pending"),
      status: String(registration.status || "pending"),
      razorpayPaymentId: String(registration.razorpayPaymentId || ""),
      razorpayOrderId: String(registration.razorpayOrderId || ""),
      registrationFee: registration.registrationFee ?? 0,
      extraData:
        registration.extraData && typeof registration.extraData === "object"
          ? { ...registration.extraData }
          : {},
      newExtraKey: "",
      newExtraValue: "",
    });

    setEditingTeamMembers(
      Array.isArray(registration.teamMembers)
        ? registration.teamMembers.map((member: Record<string, unknown>) =>
          Object.fromEntries(
            Object.entries(member).map(([key, value]) => [key, String(value ?? "")])
          )
        )
        : []
    );
  };

  const selectedRegistrationEvent = selectedRegistration
    ? events.find((event) => event.id === selectedRegistration.eventId) || null
    : null;

  const selectedMemberFields = selectedRegistrationEvent
    ? getMemberFields(selectedRegistrationEvent)
    : [];

  const selectedMinMembers = selectedRegistrationEvent?.eveType === "team"
    ? selectedRegistrationEvent.department === "Football"
      ? 1
      : Math.max(1, Number(selectedRegistrationEvent.memberMinCount) || 1)
    : 1;

  const selectedMaxMembers = selectedRegistrationEvent?.eveType === "team"
    ? selectedRegistrationEvent.department === "Football"
      ? Infinity
      : Math.max(
        selectedMinMembers,
        Number(selectedRegistrationEvent.memberMaxCount) || selectedMinMembers
      )
    : 1;

  const canManageSelected = isSuperAdmin || (isBasicScienceAdmin && isBasicScienceDepartment(selectedRegistrationEvent?.department));

  // Confirm pending registration & mark as paid
  const confirmAndRegisterEvent = async (
    registration: UserRegistration,
    paymentIdToUse: string,
    orderIdToUse?: string
  ) => {
    const event = events.find((item) => item.id === registration.eventId);
    const canManage = isSuperAdmin || (isBasicScienceAdmin && isBasicScienceDepartment(event?.department));
    if (!canManage) {
      toastError("You do not have permission to confirm registrations for this event.");
      return;
    }

    const trimmedPaymentId = paymentIdToUse.trim();
    if (!trimmedPaymentId) {
      toastError("Please enter a Payment ID (e.g. from Razorpay dashboard).");
      return;
    }

    const eventTitle = String(registration.eventTitle || event?.title || "");
    const userId = String(
      registration.userId ||
      (registration.id.includes("_") ? registration.id.split("_")[0] : "")
    );

    try {
      setQuickConfirming(true);

      const updateData: Record<string, any> = {
        paymentStatus: "paid",
        status: "paid",
        razorpayPaymentId: trimmedPaymentId,
        razorpayOrderId: (orderIdToUse || "").trim() || (registration.razorpayOrderId || ""),
        paidAt: registration.paidAt || new Date(),
        updatedAt: new Date(),
      };

      // 1. Update registration doc in Firestore
      await updateDoc(doc(db, "registrations", registration.id), updateData);

      // 2. If user ID and event title are known, add event to user's registeredEvents
      if (userId && eventTitle) {
        try {
          await updateDoc(doc(db, "users", userId), {
            registeredEvents: arrayUnion(eventTitle),
          });
        } catch (userErr) {
          console.warn("Could not sync user profile registeredEvents:", userErr);
        }
      }

      // 3. Update local state
      const updatedRegistration: UserRegistration = {
        ...registration,
        ...updateData,
      };

      setRegistrations((current) =>
        current.map((r) => (r.id === registration.id ? updatedRegistration : r))
      );

      if (selectedRegistration?.id === registration.id) {
        setSelectedRegistration(updatedRegistration);
      }

      toastSuccess(
        `Registration confirmed! Marked as Paid & linked to user profile for ${eventTitle || "event"}.`
      );
    } catch (error) {
      console.error("Error confirming registration:", error);
      toastError("Failed to confirm registration. Please check console or permissions.");
    } finally {
      setQuickConfirming(false);
    }
  };

  // Full edit & save registration details
  const saveAllRegistrationDetails = async () => {
    if (!selectedRegistration) return;

    const event = events.find((item) => item.id === selectedRegistration.eventId);
    const canManage = isSuperAdmin || (isBasicScienceAdmin && isBasicScienceDepartment(event?.department));
    if (!canManage) {
      toastError("You do not have permission to edit registration details for this event.");
      return;
    }

    const eventTitle = String(selectedRegistration.eventTitle || event?.title || "");
    const userId = String(
      selectedRegistration.userId ||
      (selectedRegistration.id.includes("_") ? selectedRegistration.id.split("_")[0] : "")
    );

    try {
      setSavingDetails(true);

      const previousStatus = String(selectedRegistration.status || "");
      const previousPaymentStatus = String(selectedRegistration.paymentStatus || "");
      const newStatus = editFormData.status.trim() || "pending";
      const newPaymentStatus = editFormData.paymentStatus.trim() || "pending";

      const updatePayload: Record<string, any> = {
        userName: editFormData.leaderName.trim(),
        leaderName: editFormData.leaderName.trim(),
        name: editFormData.leaderName.trim(),

        userEmail: editFormData.leaderEmail.trim(),
        leaderEmail: editFormData.leaderEmail.trim(),
        email: editFormData.leaderEmail.trim(),

        leaderMobile: editFormData.leaderMobile.trim(),
        phone: editFormData.leaderMobile.trim(),
        mobile: editFormData.leaderMobile.trim(),

        leaderCollege: editFormData.leaderCollege.trim(),
        college: editFormData.leaderCollege.trim(),

        leaderDepartment: editFormData.leaderDepartment.trim(),
        department: editFormData.leaderDepartment.trim(),

        leaderYear: editFormData.leaderYear.trim(),
        year: editFormData.leaderYear.trim(),

        status: newStatus,
        paymentStatus: newPaymentStatus,
        razorpayPaymentId: editFormData.razorpayPaymentId.trim(),
        razorpayOrderId: editFormData.razorpayOrderId.trim(),
        registrationFee: Number(editFormData.registrationFee) || 0,
        extraData: editFormData.extraData || {},
        updatedAt: new Date(),
      };

      if (
        (newStatus === "paid" || newPaymentStatus === "paid" || newStatus === "registered") &&
        !selectedRegistration.paidAt
      ) {
        updatePayload.paidAt = new Date();
      }

      await updateDoc(doc(db, "registrations", selectedRegistration.id), updatePayload);

      // Handle user registeredEvents array in users collection
      const isNowRegistered =
        newStatus === "paid" || newStatus === "registered" || newPaymentStatus === "paid";
      const wasRegistered =
        previousStatus === "paid" ||
        previousStatus === "registered" ||
        previousPaymentStatus === "paid";

      if (userId && eventTitle) {
        try {
          if (isNowRegistered && !wasRegistered) {
            await updateDoc(doc(db, "users", userId), {
              registeredEvents: arrayUnion(eventTitle),
            });
          } else if (!isNowRegistered && wasRegistered) {
            await updateDoc(doc(db, "users", userId), {
              registeredEvents: arrayRemove(eventTitle),
            });
          }
        } catch (userErr) {
          console.warn("Could not sync user profile registeredEvents:", userErr);
        }
      }

      const updatedReg: UserRegistration = {
        ...selectedRegistration,
        ...updatePayload,
      };

      setRegistrations((current) =>
        current.map((r) => (r.id === selectedRegistration.id ? updatedReg : r))
      );
      setSelectedRegistration(updatedReg);
      setIsEditingDetails(false);
      toastSuccess("Registration details updated successfully!");
    } catch (error) {
      console.error("Error saving registration details:", error);
      toastError("Failed to update registration details.");
    } finally {
      setSavingDetails(false);
    }
  };

  const addTeamMember = () => {
    if (!canManageSelected || !selectedRegistrationEvent || selectedRegistrationEvent.eveType !== "team") return;
    const currentTeamSize = editingTeamMembers.length + 1;
    if (selectedRegistrationEvent.department !== "Football" && currentTeamSize >= selectedMaxMembers) {
      toastError(`Maximum team size is ${selectedMaxMembers} members.`);
      return;
    }
    setEditingTeamMembers((current) => [...current, emptyTeamMember(selectedMemberFields)]);
  };

  const removeTeamMember = (index: number) => {
    if (!canManageSelected) return;
    if (editingTeamMembers.length <= selectedMinMembers - 1) {
      toastError(`Minimum team size is ${selectedMinMembers} members including the leader.`);
      return;
    }
    setEditingTeamMembers((current) => current.filter((_, i) => i !== index));
  };

  const saveTeamMembers = async () => {
    if (!canManageSelected || !selectedRegistration || !selectedRegistrationEvent) return;
    if (selectedRegistrationEvent.eveType !== "team") {
      toastError("This is not a team event.");
      return;
    }
    const teamSize = editingTeamMembers.length + 1;
    if (teamSize < selectedMinMembers || teamSize > selectedMaxMembers) {
      toastError(`Team size must be between ${selectedMinMembers} and ${selectedMaxMembers} members.`);
      return;
    }
    for (let index = 0; index < editingTeamMembers.length; index += 1) {
      const member = editingTeamMembers[index];
      if (!String(member.name || "").trim()) {
        toastError(`Member ${index + 2} name is required.`);
        return;
      }
      for (const field of selectedMemberFields) {
        if (field.required && !String(member[field.name] || "").trim()) {
          toastError(`Member ${index + 2}: ${field.name} is required.`);
          return;
        }
      }
    }
    const cleanedMembers = editingTeamMembers.map((member) => {
      if (selectedRegistrationEvent.showMemberYear === false) {
        const { Year, ...rest } = member;
        void Year;
        return rest;
      }
      return member;
    });
    try {
      setSavingTeamMembers(true);
      await updateDoc(doc(db, "registrations", selectedRegistration.id), {
        teamMembers: cleanedMembers,
        teamSize,
        updatedAt: new Date(),
      });
      setRegistrations((current) =>
        current.map((registration) =>
          registration.id === selectedRegistration.id
            ? { ...registration, teamMembers: cleanedMembers, teamSize }
            : registration
        )
      );
      setSelectedRegistration((current) =>
        current ? { ...current, teamMembers: cleanedMembers, teamSize } : current
      );
      setEditingTeamMembers(cleanedMembers);
      toastSuccess("Team members updated successfully");
    } catch (error) {
      console.error("Error updating team members:", error);
      toastError("Failed to update team members");
    } finally {
      setSavingTeamMembers(false);
    }
  };

  const deregisterUser = async (registration: UserRegistration) => {
    const event = events.find((item) => item.id === registration.eventId);
    const canManage = isSuperAdmin || (isBasicScienceAdmin && isBasicScienceDepartment(event?.department));
    if (!canManage) {
      toastError("You do not have permission to deregister users from this event.");
      return;
    }

    const userId = String(
      registration.userId ||
      (registration.id.includes("_") ? registration.id.split("_")[0] : "")
    );
    const eventTitle = String(registration.eventTitle || event?.title || "");
    const userName = getRegistrationName(registration);

    if (!userId || !eventTitle) {
      toastError("Registration is missing user or event information.");
      return;
    }

    if (!window.confirm(`Deregister ${userName} from "${eventTitle}"?`)) {
      return;
    }

    try {
      setDeregisteringId(registration.id);
      await deleteDoc(doc(db, "registrations", registration.id));
      await updateDoc(doc(db, "users", userId), {
        registeredEvents: arrayRemove(eventTitle),
      });

      setRegistrations((current) =>
        current.filter((item) => item.id !== registration.id)
      );
      setSelectedRegistration(null);
      toastSuccess("User deregistered successfully");
    } catch (error) {
      console.error("Error deregistering user:", error);
      toastError("Failed to deregister user");
    } finally {
      setDeregisteringId(null);
    }
  };

  // Direct registration helpers for adding participants without Google login
  const selectedNewUserEvent = useMemo(
    () => events.find((item) => item.id === newUserForm.selectedEventId) || null,
    [events, newUserForm.selectedEventId]
  );

  const newUserMemberFields = useMemo<RegistrationField[]>(() => {
    if (!selectedNewUserEvent || selectedNewUserEvent.eveType !== "team") return [];
    if (selectedNewUserEvent.department === "Football") {
      return [{ name: "Phone Number", type: "tel", required: true }];
    }
    const custom = selectedNewUserEvent.teamMemberFields || [];
    const collectYear = selectedNewUserEvent.showMemberYear !== false;
    const customNames = new Set(custom.map((field) => field.name.toLowerCase().trim()));
    return [
      ...baseMemberFields.filter((field) => !customNames.has(field.name.toLowerCase().trim())),
      ...custom,
    ].filter((field) => collectYear || field.name.toLowerCase().trim() !== "year");
  }, [selectedNewUserEvent]);

  const newUserMinMembers = selectedNewUserEvent?.eveType === "team"
    ? selectedNewUserEvent.department === "Football"
      ? 1
      : Math.max(1, Number(selectedNewUserEvent.memberMinCount) || 1)
    : 1;

  const newUserMaxMembers = selectedNewUserEvent?.eveType === "team"
    ? selectedNewUserEvent.department === "Football"
      ? Infinity
      : Math.max(newUserMinMembers, Number(selectedNewUserEvent.memberMaxCount) || newUserMinMembers)
    : 1;

  const handleNewUserEventChange = (eventId: string) => {
    const nextEvent = events.find((item) => item.id === eventId);
    if (!nextEvent) {
      setNewUserForm((prev) => ({
        ...prev,
        selectedEventId: "",
        extraData: {},
        teamMembers: [],
      }));
      return;
    }
    const min = nextEvent.eveType === "team"
      ? nextEvent.department === "Football" ? 1 : Math.max(1, Number(nextEvent.memberMinCount) || 1)
      : 1;
    const custom = nextEvent.department === "Football"
      ? [{ name: "Phone Number", type: "tel", required: true } as RegistrationField]
      : (() => {
        const fields = nextEvent.teamMemberFields || [];
        const names = new Set(fields.map((field) => field.name.toLowerCase().trim()));
        return [...baseMemberFields.filter((field) => !names.has(field.name.toLowerCase().trim())), ...fields]
          .filter((field) => nextEvent.showMemberYear !== false || field.name.toLowerCase().trim() !== "year");
      })();

    setNewUserForm((prev) => ({
      ...prev,
      selectedEventId: eventId,
      extraData: {},
      teamMembers: nextEvent.eveType === "team"
        ? Array.from({ length: Math.max(0, min - 1) }, () => emptyTeamMember(custom))
        : [],
    }));
  };

  const addNewUserMember = () => {
    if (!selectedNewUserEvent || selectedNewUserEvent.eveType !== "team") return;
    if (selectedNewUserEvent.department !== "Football" && newUserForm.teamMembers.length + 1 >= newUserMaxMembers) {
      toastError(`Maximum team size is ${newUserMaxMembers} members.`);
      return;
    }
    setNewUserForm((current) => ({
      ...current,
      teamMembers: [...current.teamMembers, emptyTeamMember(newUserMemberFields)],
    }));
  };

  const removeNewUserMember = (index: number) => {
    if (newUserForm.teamMembers.length <= newUserMinMembers - 1) {
      toastError(`Minimum team size is ${newUserMinMembers} members including the leader.`);
      return;
    }
    setNewUserForm((current) => ({
      ...current,
      teamMembers: current.teamMembers.filter((_, i) => i !== index),
    }));
  };

  const registerNewUserWithoutLogin = async () => {
    if (!newUserForm.selectedEventId) {
      toastError("Please select an event.");
      return;
    }
    if (!newUserForm.name.trim()) {
      toastError("Participant Name is required.");
      return;
    }
    if (!newUserForm.email.trim() || !newUserForm.email.includes("@")) {
      toastError("A valid Email Address is required.");
      return;
    }
    if (!newUserForm.mobile.trim()) {
      toastError("Mobile Number is required.");
      return;
    }
    if (!newUserForm.college.trim()) {
      toastError("College name is required.");
      return;
    }

    const event = events.find((e) => e.id === newUserForm.selectedEventId);
    if (!event) {
      toastError("Selected event not found.");
      return;
    }

    if (!isSuperAdmin && (!isBasicScienceAdmin || !isBasicScienceDepartment(event.department))) {
      toastError("You can only register participants for Basic Science department events.");
      return;
    }

    const teamSize = event.eveType === "team" ? 1 + newUserForm.teamMembers.length : 1;
    if (event.eveType === "team" && (teamSize < newUserMinMembers || teamSize > newUserMaxMembers)) {
      toastError(`Team size must be between ${newUserMinMembers} and ${newUserMaxMembers} members.`);
      return;
    }

    if (event.eveType === "team") {
      for (let index = 0; index < newUserForm.teamMembers.length; index += 1) {
        const member = newUserForm.teamMembers[index];
        if (!String(member.name || "").trim()) {
          toastError(`Member ${index + 2} name is required.`);
          return;
        }
        for (const field of newUserMemberFields) {
          if (field.required && !String(member[field.name] || "").trim()) {
            toastError(`Member ${index + 2}: ${field.name} is required.`);
            return;
          }
        }
      }
    }

    for (const field of event.extraFields || []) {
      if (field.required && !String(newUserForm.extraData[field.name] || "").trim()) {
        toastError(`${field.name} is required.`);
        return;
      }
    }

    const cleanedMembers = newUserForm.teamMembers.map((member) => {
      if (event.showMemberYear === false) {
        const { Year, ...rest } = member;
        void Year;
        return rest;
      }
      return member;
    });

    try {
      setAddingNewUser(true);
      const normEmail = newUserForm.email.trim().toLowerCase();

      const existingUserQuery = query(
        collection(db, "users"),
        where("email", "==", normEmail)
      );
      const existingSnapshot = await getDocs(existingUserQuery);

      let targetUserId = "";
      let userDocExists = false;

      if (!existingSnapshot.empty) {
        targetUserId = existingSnapshot.docs[0].id;
        userDocExists = true;
      } else {
        const newUserDocRef = doc(collection(db, "users"));
        targetUserId = newUserDocRef.id;
      }

      const canRegisterMultiple = allowsMultipleRegistrations(event);
      if (!canRegisterMultiple) {
        const regCheckQuery = query(
          collection(db, "registrations"),
          where("eventId", "==", event.id),
          where("userId", "==", targetUserId)
        );
        const regCheckSnapshot = await getDocs(regCheckQuery);
        if (!regCheckSnapshot.empty) {
          toastError("This user is already registered for this event.");
          return;
        }
      }

      const batch = writeBatch(db);
      const registrationRef = doc(collection(db, "registrations"));

      if (!userDocExists) {
        const userDocRef = doc(db, "users", targetUserId);
        batch.set(userDocRef, {
          name: newUserForm.name.trim(),
          email: normEmail,
          college: newUserForm.college.trim(),
          department: newUserForm.department.trim(),
          isProfileComplete: true,
          registeredEvents: [event.title],
          role: "user",
          isManualUser: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      } else {
        const userDocRef = doc(db, "users", targetUserId);
        batch.update(userDocRef, {
          registeredEvents: arrayUnion(event.title),
        });
      }

      const newRegistrationData: UserRegistration = {
        id: registrationRef.id,
        eventId: event.id,
        eventTitle: event.title,
        userId: targetUserId,
        userName: newUserForm.name.trim(),
        userEmail: normEmail,
        name: newUserForm.name.trim(),
        email: normEmail,
        leaderName: newUserForm.name.trim(),
        leaderEmail: normEmail,
        leaderMobile: newUserForm.mobile.trim(),
        leaderCollege: newUserForm.college.trim(),
        leaderDepartment: newUserForm.department.trim(),
        leaderYear: newUserForm.year.trim(),
        college: newUserForm.college.trim(),
        department: event.department || "",
        extraData: newUserForm.extraData,
        status: "registered",
        paymentStatus: "admin",
        registrationFee: 0,
        registrationMethod: isBasicScienceAdmin ? "basicScienceAdmin" : "superAdmin",
        registeredBy: userData?.email || "",
        teamSize,
        teamMembers: cleanedMembers,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      batch.set(registrationRef, newRegistrationData);
      await batch.commit();

      if (event.registrationMode === "spot") {
        try {
          const ticketResponse = await fetch("/api/events/send-spot-ticket", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              registrationId: registrationRef.id,
              event,
              registration: {
                userId: targetUserId,
                userName: newUserForm.name.trim(),
                userEmail: normEmail,
                leaderName: newUserForm.name.trim(),
                leaderEmail: normEmail,
                leaderMobile: newUserForm.mobile.trim(),
                leaderCollege: newUserForm.college.trim(),
                leaderDepartment: newUserForm.department.trim(),
                leaderYear: newUserForm.year.trim(),
                teamSize,
                teamMembers: cleanedMembers,
              },
            }),
          });
          const ticketResult = await ticketResponse.json().catch(() => ({}));
          if (ticketResult.ticketNumber) {
            await updateDoc(registrationRef, {
              ticketNumber: ticketResult.ticketNumber,
              ticketEmailStatus: "sent",
              ticketEmailedAt: new Date(),
            });
            newRegistrationData.ticketNumber = ticketResult.ticketNumber;
          }
        } catch (ticketError) {
          console.error("Spot ticket email failed:", ticketError);
        }
      }

      setRegistrations((prev) => [newRegistrationData, ...prev]);

      toastSuccess(
        `${newUserForm.name.trim()} successfully registered for ${event.title}!`
      );

      setIsAddUserModalOpen(false);
      setNewUserForm({
        selectedEventId: "",
        name: "",
        email: "",
        mobile: "",
        college: "",
        department: "",
        year: "",
        extraData: {},
        teamMembers: [],
      });
    } catch (error) {
      console.error("Error adding new user and registration:", error);
      toastError("Failed to register participant. Please check permissions and try again.");
    } finally {
      setAddingNewUser(false);
    }
  };

  const handleAddExtraDataField = () => {
    const key = editFormData.newExtraKey.trim();
    if (!key) {
      toastError("Please enter a field name.");
      return;
    }
    setEditFormData((prev) => ({
      ...prev,
      extraData: {
        ...prev.extraData,
        [key]: prev.newExtraValue.trim(),
      },
      newExtraKey: "",
      newExtraValue: "",
    }));
  };

  const handleRemoveExtraDataField = (key: string) => {
    setEditFormData((prev) => {
      const next = { ...prev.extraData };
      delete next[key];
      return { ...prev, extraData: next };
    });
  };

  if (!userData) return null;

  return (
    <div className="max-w-[1500px] mx-auto text-white">
      {/* Header */}
      <div className="mb-8 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-indigo-400 font-semibold">
            Registration Management
          </p>
          <h1 className="text-3xl md:text-4xl font-bold mt-2">
            Event Registrations
          </h1>
          <p className="text-gray-400 mt-2 max-w-2xl">
            View registrations department-wise, resolve pending payments, edit participant details, and export Excel reports.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => {
              setNewUserForm({
                selectedEventId: availableEvents[0]?.id || "",
                name: "",
                email: "",
                mobile: "",
                college: "",
                department: "",
                year: "",
                extraData: {},
                teamMembers: [],
              });
              if (availableEvents[0]?.id) {
                handleNewUserEventChange(availableEvents[0].id);
              }
              setIsAddUserModalOpen(true);
            }}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-semibold transition-colors shadow-lg shadow-indigo-950 text-white"
          >
            <FiUserPlus size={18} />
            Register Participant (No Login Required)
          </button>
          <button
            onClick={exportSummary}
            disabled={loading || !filteredSummaries.length}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed font-semibold transition-colors shadow-lg shadow-emerald-950"
          >
            <FiDownload />
            Export Excel Report
          </button>
          <button
            onClick={() => void loadData(true)}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 disabled:opacity-40 font-semibold transition-colors shadow-lg border border-gray-700 text-white cursor-pointer"
          >
            <FiRefreshCw className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* Spot Registration Live Status */}
      {events.some((event) => event.registrationMode === "spot" && event.spotRegistrationOpen === true) && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-950/20 p-5 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-amber-300 font-semibold">Registration</p>
              <h2 className="text-xl font-bold mt-1">Spot Registration Status</h2>
              <p className="text-sm text-gray-500 mt-1">Use this live summary at the on-site Registration.</p>
            </div>
            <div className="text-sm text-amber-200">{new Date().toLocaleString()}</div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {events.filter((event) => event.registrationMode === "spot" && event.spotRegistrationOpen === true).map((event) => {
              const eventRegs = registrations.filter((registration) => registration.eventId === event.id);
              const members = eventRegs.reduce((total, registration) => total + getMemberCount(registration), 0);
              const start = event.spotRegistrationDate
                ? `${event.spotRegistrationDate}${event.spotRegistrationTime ? ` · ${event.spotRegistrationTime}` : ""}`
                : "Time not set";
              return (
                <div key={event.id} className="rounded-xl border border-amber-500/20 bg-black/20 p-4">
                  <p className="font-semibold text-white">{event.title}</p>
                  <p className="text-xs text-gray-500 mt-1">{event.spotRegistrationDesk || "Registration"}</p>
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    <div>
                      <p className="text-[10px] uppercase text-gray-500">Registrations</p>
                      <p className="text-xl font-bold text-amber-200">{eventRegs.length}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase text-gray-500">Members</p>
                      <p className="text-xl font-bold text-amber-200">{members}</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-3">Spot start: {start}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pending Registrations Attention Banner */}
      {totalPendingCount > 0 && (
        <div className="rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-950/40 via-amber-900/20 to-black/40 p-4 sm:p-5 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 shrink-0">
              <FiAlertCircle size={22} />
            </div>
            <div>
              <h3 className="font-bold text-amber-200 text-base">
                {totalPendingCount} Pending Registration{totalPendingCount > 1 ? "s" : ""} Require Review
              </h3>
              <p className="text-sm text-gray-300 mt-0.5">
                Some users may have had money debited without automatic registration. You can view pending events, fill their Payment ID & Order ID, and register them.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setStatusFilter((prev) => (prev === "pending" ? "All" : "pending"));
            }}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all whitespace-nowrap ${
              statusFilter === "pending"
                ? "bg-amber-400 text-black shadow-lg shadow-amber-950"
                : "bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200"
            }`}
          >
            <FiZap />
            {statusFilter === "pending" ? "Showing Pending Only (Reset)" : "Filter Pending Only"}
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <div className="rounded-2xl border border-gray-800 bg-gray-900/70 p-5">
          <p className="text-xs uppercase tracking-wider text-gray-400">Events</p>
          <p className="text-3xl font-bold mt-2">{filteredSummaries.length}</p>
        </div>

        <div className="rounded-2xl border border-gray-800 bg-gray-900/70 p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-wider text-gray-400">Registrations</p>
            <span className="text-xs text-emerald-400 font-semibold">{totalPaidCount} Paid</span>
          </div>
          <p className="text-3xl font-bold mt-2">{visibleRegistrationCount}</p>
        </div>

        <div className="rounded-2xl border border-gray-800 bg-gray-900/70 p-5">
          <p className="text-xs uppercase tracking-wider text-gray-400">Members</p>
          <p className="text-3xl font-bold mt-2">{visibleMemberCount}</p>
        </div>

        <div
          onClick={() => setStatusFilter((prev) => (prev === "pending" ? "All" : "pending"))}
          className={`rounded-2xl border p-5 cursor-pointer transition-all ${
            totalPendingCount > 0
              ? "border-amber-500/40 bg-amber-950/20 hover:bg-amber-950/30"
              : "border-gray-800 bg-gray-900/70"
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-wider text-gray-400">Pending Issues</p>
            {totalPendingCount > 0 && (
              <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                Action Needed
              </span>
            )}
          </div>
          <p
            className={`text-3xl font-bold mt-2 ${
              totalPendingCount > 0 ? "text-amber-400" : "text-white"
            }`}
          >
            {totalPendingCount}
          </p>
        </div>
      </div>

      {/* Main Filter Bar */}
      <div className="bg-gray-900/70 border border-gray-800 rounded-2xl p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search event, user, phone, ID..."
              className="w-full bg-gray-950 border border-gray-800 rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:border-indigo-500"
            />
          </div>

          <select
            value={departmentFilter}
            onChange={(e) => {
              setDepartmentFilter(e.target.value);
              setEventFilter("All");
            }}
            className="bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-500"
          >
            <option value="All">All Departments</option>
            {departments.map((department) => (
              <option key={department} value={department}>
                {department}
              </option>
            ))}
          </select>

          <select
            value={eventFilter}
            onChange={(e) => setEventFilter(e.target.value)}
            className="bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-500"
          >
            <option value="All">All Events</option>
            {summaries
              .filter(
                (summary) =>
                  departmentFilter === "All" ||
                  getDepartment(summary.event) === departmentFilter
              )
              .map((summary) => (
                <option key={summary.event.id} value={summary.event.id}>
                  {summary.event.title}
                </option>
              ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-500 font-medium"
          >
            <option value="All">All Statuses</option>
            <option value="pending">⚠️ Pending ({totalPendingCount})</option>
            <option value="paid">✅ Paid ({totalPaidCount})</option>
            <option value="free">Free Registrations</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-gray-800 bg-gray-900 p-12 text-center text-gray-500">
          Loading events and registrations...
        </div>
      ) : filteredSummaries.length === 0 ? (
        <div className="rounded-2xl border border-gray-800 bg-gray-900 p-12 text-center text-gray-500">
          No matching events or registrations found.
        </div>
      ) : (
        <div className="space-y-8">
          {Array.from(
            new Set(filteredSummaries.map((summary) => getDepartment(summary.event)))
          ).map((department) => {
            const departmentSummaries = filteredSummaries.filter(
              (summary) => getDepartment(summary.event) === department
            );

            const departmentRegistrations = departmentSummaries.reduce(
              (total, summary) => total + summary.registrationCount,
              0
            );
            const departmentMembers = departmentSummaries.reduce(
              (total, summary) => total + summary.memberCount,
              0
            );

            return (
              <section key={department}>
                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-3">
                  <div>
                    <h2 className="text-xl font-bold">{department}</h2>
                    <p className="text-sm text-gray-500 mt-1">
                      {departmentSummaries.length} events · {departmentRegistrations} registrations · {departmentMembers} members
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-800 bg-gray-900 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[900px]">
                      <thead className="bg-gray-800/60">
                        <tr>
                          <th className="px-5 py-4 text-xs uppercase tracking-wider text-gray-400">Event</th>
                          <th className="px-5 py-4 text-xs uppercase tracking-wider text-gray-400">Type</th>
                          <th className="px-5 py-4 text-xs uppercase tracking-wider text-gray-400">Mode</th>
                          <th className="px-5 py-4 text-xs uppercase tracking-wider text-gray-400">Registrations</th>
                          <th className="px-5 py-4 text-xs uppercase tracking-wider text-gray-400">Members</th>
                          <th className="px-5 py-4 text-xs uppercase tracking-wider text-gray-400">Date</th>
                          <th className="px-5 py-4 text-xs uppercase tracking-wider text-gray-400">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800">
                        {departmentSummaries.map((summary) => (
                          <tr key={summary.event.id} className="hover:bg-gray-800/30">
                            <td className="px-5 py-4">
                              <p className="font-semibold">{summary.event.title}</p>
                              <p className="text-xs text-gray-500 mt-1">{summary.event.venue || "Venue not set"}</p>
                            </td>
                            <td className="px-5 py-4 text-sm text-gray-400">
                              {summary.event.type || "—"}
                            </td>
                            <td className="px-5 py-4 text-sm text-gray-400">
                              {summary.event.registrationMode === "none"
                                ? "Expo"
                                : summary.event.registrationMode === "spot"
                                  ? "Spot"
                                  : "Online"}
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-2">
                                <span className="inline-flex items-center gap-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 text-indigo-300 font-semibold">
                                  <FiUsers size={14} />
                                  {summary.registrationCount}
                                </span>
                                {summary.pendingCount > 0 && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
                                    <FiAlertCircle size={12} />
                                    {summary.pendingCount} Pending
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-5 py-4 font-semibold text-emerald-300">
                              {summary.memberCount}
                            </td>
                            <td className="px-5 py-4 text-sm text-gray-400">
                              {summary.event.startDate || summary.event.date || "—"}
                              {summary.event.endDate && summary.event.endDate !== summary.event.startDate
                                ? ` → ${summary.event.endDate}`
                                : ""}
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => {
                                    setSelectedEventId(summary.event.id);
                                    setModalSearch("");
                                    setModalStatusFilter("All");
                                  }}
                                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 hover:bg-indigo-500/20 text-sm font-medium"
                                >
                                  <FiEye /> View
                                </button>
                                <button
                                  onClick={() => exportSingleEvent(summary)}
                                  disabled={!summary.registrationCount}
                                  className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-30"
                                  title="Export this event"
                                >
                                  <FiDownload />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* Selected Event Registrations Modal */}
      {selectedSummary && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 md:p-6">
          <div className="w-full max-w-7xl max-h-[92vh] bg-[#080a11] border border-gray-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-5 md:p-6 border-b border-gray-800 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-indigo-400 font-semibold">
                  {getDepartment(selectedSummary.event)}
                </p>
                <div className="flex items-center gap-3 mt-1">
                  <h2 className="text-2xl font-bold">{selectedSummary.event.title}</h2>
                  {selectedSummary.pendingCount > 0 && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
                      <FiAlertCircle size={13} />
                      {selectedSummary.pendingCount} Pending Resolution
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {selectedSummary.registrationCount} registrations · {selectedSummary.memberCount} members · {selectedSummary.paidCount} paid
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => exportSingleEvent(selectedSummary)}
                  disabled={!selectedSummary.registrationCount}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 font-medium"
                >
                  <FiDownload /> Export Event
                </button>
                <button
                  onClick={() => setSelectedEventId(null)}
                  className="p-2 rounded-lg bg-gray-800 text-gray-300 hover:text-white hover:bg-gray-700"
                >
                  <FiX size={20} />
                </button>
              </div>
            </div>

            {/* Modal Filter & Search Bar */}
            <div className="p-4 bg-gray-950/70 border-b border-gray-800/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                <button
                  onClick={() => setModalStatusFilter("All")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                    modalStatusFilter === "All"
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-900 border border-gray-800 text-gray-400 hover:text-white"
                  }`}
                >
                  All ({selectedEventRegistrations.length})
                </button>
                <button
                  onClick={() => setModalStatusFilter("pending")}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                    modalStatusFilter === "pending"
                      ? "bg-amber-500 text-black font-bold"
                      : "bg-gray-900 border border-gray-800 text-amber-300/80 hover:text-amber-200"
                  }`}
                >
                  <FiClock size={12} />
                  Pending ({selectedSummary.pendingCount})
                </button>
                <button
                  onClick={() => setModalStatusFilter("paid")}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                    modalStatusFilter === "paid"
                      ? "bg-emerald-600 text-white"
                      : "bg-gray-900 border border-gray-800 text-emerald-400/80 hover:text-emerald-300"
                  }`}
                >
                  <FiCheckCircle size={12} />
                  Paid ({selectedSummary.paidCount})
                </button>
                <button
                  onClick={() => setModalStatusFilter("free")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                    modalStatusFilter === "free"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-900 border border-gray-800 text-gray-400 hover:text-white"
                  }`}
                >
                  Free ({selectedSummary.freeCount})
                </button>
              </div>

              <div className="relative min-w-[240px]">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs" />
                <input
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                  placeholder="Filter name, phone, email, ID..."
                  className="w-full bg-gray-900 border border-gray-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Modal Table Content */}
            <div className="overflow-auto flex-1">
              {displayedEventRegistrations.length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                  No registrations match the selected criteria.
                </div>
              ) : (
                <table className="w-full text-left min-w-[1100px]">
                  <thead className="sticky top-0 bg-gray-900 z-10">
                    <tr className="border-b border-gray-800">
                      <th className="px-5 py-4 text-xs uppercase tracking-wider text-gray-500">#</th>
                      <th className="px-5 py-4 text-xs uppercase tracking-wider text-gray-500">Participant / Captain</th>
                      <th className="px-5 py-4 text-xs uppercase tracking-wider text-gray-500">Contact</th>
                      <th className="px-5 py-4 text-xs uppercase tracking-wider text-gray-500">College</th>
                      <th className="px-5 py-4 text-xs uppercase tracking-wider text-gray-500">Team Size</th>
                      <th className="px-5 py-4 text-xs uppercase tracking-wider text-gray-500">Payment Status</th>
                      <th className="px-5 py-4 text-xs uppercase tracking-wider text-gray-500">Payment ID</th>
                      <th className="px-5 py-4 text-xs uppercase tracking-wider text-gray-500">Actions</th>
                      {(isSuperAdmin || (isBasicScienceAdmin && isBasicScienceDepartment(selectedSummary?.event.department))) && (
                        <th className="px-5 py-4 text-xs uppercase tracking-wider text-gray-500">Manage</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {displayedEventRegistrations.map((registration, index) => {
                      const isPending = isPendingRegistration(registration);
                      const isPaid = isPaidRegistration(registration);
                      const isFree = isFreeRegistration(registration);

                      return (
                        <tr
                          key={registration.id}
                          className={`hover:bg-gray-800/30 transition-colors ${
                            isPending ? "bg-amber-950/10" : ""
                          }`}
                        >
                          <td className="px-5 py-4 text-gray-500">{index + 1}</td>
                          <td className="px-5 py-4">
                            <p className="font-medium text-white">{getRegistrationName(registration)}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{getRegistrationEmail(registration)}</p>
                          </td>
                          <td className="px-5 py-4 text-sm text-gray-300">
                            {getRegistrationPhone(registration)}
                          </td>
                          <td className="px-5 py-4 text-sm text-gray-400 max-w-[180px] truncate" title={getRegistrationCollege(registration)}>
                            {getRegistrationCollege(registration)}
                          </td>
                          <td className="px-5 py-4">
                            <span className="font-semibold text-emerald-300">{getMemberCount(registration)}</span>
                          </td>
                          <td className="px-5 py-4">
                            {isPaid ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                <FiCheckCircle size={12} /> Paid
                              </span>
                            ) : isPending ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                                <FiClock size={12} /> Pending
                              </span>
                            ) : isFree ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                                Free
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs text-gray-400 bg-gray-800">
                                {String(registration.paymentStatus || "—")}
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-4 text-sm font-mono text-gray-400 max-w-[150px] truncate" title={registration.razorpayPaymentId || "N/A"}>
                            {registration.razorpayPaymentId || "—"}
                          </td>
                          <td className="px-5 py-4">
                            {(() => {
                              const canManage = isSuperAdmin || (isBasicScienceAdmin && isBasicScienceDepartment(selectedSummary?.event.department));
                              return (
                                <div className="flex items-center gap-2">
                                  {canManage && isPending && (
                                    <button
                                      onClick={() => openRegistrationDetails(registration)}
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/40 hover:bg-amber-500/25 text-amber-300 text-xs font-bold transition-all shadow-sm"
                                      title="Enter Payment ID & complete registration"
                                    >
                                      <FiZap size={13} /> Resolve
                                    </button>
                                  )}
                                  <button
                                    onClick={() => openRegistrationDetails(registration)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-medium transition-colors"
                                  >
                                    {canManage ? <FiEdit2 size={12} /> : <FiEye size={12} />}
                                    {canManage ? "Edit / View" : "View"}
                                  </button>
                                </div>
                              );
                            })()}
                          </td>
                          {(isSuperAdmin || (isBasicScienceAdmin && isBasicScienceDepartment(selectedSummary?.event.department))) && (
                            <td className="px-5 py-4">
                              <button
                                onClick={() => void deregisterUser(registration)}
                                disabled={deregisteringId === registration.id}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 hover:bg-red-500/20 disabled:opacity-40 text-xs transition-colors"
                              >
                                <FiUserX size={13} />
                                {deregisteringId === registration.id ? "Removing..." : "Deregister"}
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Selected Registration Details & Edit Modal */}
      {selectedRegistration && (
        <div className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 md:p-6 overflow-y-auto">
          <div className="w-full max-w-3xl my-auto max-h-[92vh] bg-[#0c0e17] border border-gray-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-5 border-b border-gray-800 flex items-center justify-between gap-3 bg-[#0a0c13]">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-xs uppercase tracking-wider text-indigo-400 font-semibold">
                    Registration Details
                  </p>
                  {isPaidRegistration(selectedRegistration) && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Paid / Registered
                    </span>
                  )}
                  {isPendingRegistration(selectedRegistration) && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                      Pending Action
                    </span>
                  )}
                </div>
                <h3 className="text-xl font-bold mt-1 truncate">
                  {getRegistrationName(selectedRegistration)}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                {canManageSelected && (
                  <button
                    type="button"
                    onClick={() => setIsEditingDetails((prev) => !prev)}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                      isEditingDetails
                        ? "bg-gray-800 text-gray-300 hover:bg-gray-700"
                        : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-950"
                    }`}
                  >
                    <FiEdit2 size={13} />
                    {isEditingDetails ? "Cancel Edit" : "Edit Details"}
                  </button>
                )}

                <button
                  onClick={() => setSelectedRegistration(null)}
                  className="p-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                >
                  <FiX size={18} />
                </button>
              </div>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-5 overflow-y-auto space-y-6">
              {/* Quick Resolve / Register Banner (Shown in view mode when pending to Admin only) */}
              {canManageSelected && !isEditingDetails && isPendingRegistration(selectedRegistration) && (
                <div className="rounded-xl border border-amber-500/40 bg-amber-950/25 p-4 shadow-lg">
                  <div className="flex items-start gap-3">
                    <FiAlertCircle className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <h4 className="text-sm font-bold text-amber-200">
                        Pending Registration / Money Debited?
                      </h4>
                      <p className="text-xs text-amber-300/80 mt-1 leading-relaxed">
                        If the user completed payment but the event was not automatically registered, enter their Razorpay Payment ID and Order ID below to confirm and activate their registration immediately.
                      </p>

                      <div className="mt-3.5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] uppercase tracking-wider text-amber-300/80 font-bold block mb-1">
                            Razorpay Payment ID *
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. pay_NW5slEjsvZZ8"
                            value={quickPaymentId}
                            onChange={(e) => setQuickPaymentId(e.target.value)}
                            className="w-full bg-black/60 border border-amber-500/40 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-amber-400 font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] uppercase tracking-wider text-amber-300/80 font-bold block mb-1">
                            Razorpay Order ID (Optional)
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. order_NW5slEjsvZZ8"
                            value={quickOrderId}
                            onChange={(e) => setQuickOrderId(e.target.value)}
                            className="w-full bg-black/60 border border-amber-500/40 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-amber-400 font-mono"
                          />
                        </div>
                      </div>

                      <div className="mt-3.5 flex justify-end">
                        <button
                          type="button"
                          disabled={quickConfirming || !quickPaymentId.trim()}
                          onClick={() =>
                            void confirmAndRegisterEvent(
                              selectedRegistration,
                              quickPaymentId,
                              quickOrderId
                            )
                          }
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-sm transition-all shadow-md shadow-emerald-950"
                        >
                          <FiCheckCircle size={15} />
                          {quickConfirming ? "Registering..." : "Confirm Payment & Register Event"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Notice for unauthorized admin when registration is pending */}
              {!canManageSelected && isPendingRegistration(selectedRegistration) && (
                <div className="rounded-xl border border-amber-500/20 bg-amber-950/20 p-3.5 flex items-center gap-2.5 text-xs text-amber-300/80">
                  <FiClock size={16} className="text-amber-400 shrink-0" />
                  <span>
                    This registration is pending payment verification. Only authorized administrators have permission to modify or resolve it.
                  </span>
                </div>
              )}

              {/* View Mode: Readonly Detail Cards */}
              {(!canManageSelected || !isEditingDetails) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    {
                      label: "Email",
                      value: getRegistrationEmail(selectedRegistration),
                      copyKey: "email",
                    },
                    {
                      label: "Phone",
                      value: getRegistrationPhone(selectedRegistration),
                      copyKey: "phone",
                    },
                    {
                      label: "College",
                      value: getRegistrationCollege(selectedRegistration),
                    },
                    {
                      label: "Department / Class",
                      value:
                        selectedRegistration.leaderDepartment ||
                        selectedRegistration.department,
                    },
                    {
                      label: "Year",
                      value:
                        selectedRegistration.leaderYear ||
                        selectedRegistration.year,
                    },
                    {
                      label: "Team Size",
                      value: getMemberCount(selectedRegistration),
                    },
                    {
                      label: "Payment Status",
                      value: selectedRegistration.paymentStatus,
                      badge: isPaidRegistration(selectedRegistration)
                        ? "paid"
                        : isPendingRegistration(selectedRegistration)
                          ? "pending"
                          : "other",
                    },
                    {
                      label: "Registration Status",
                      value: selectedRegistration.status,
                      badge: isPaidRegistration(selectedRegistration)
                        ? "paid"
                        : isPendingRegistration(selectedRegistration)
                          ? "pending"
                          : "other",
                    },
                    {
                      label: "Payment ID",
                      value: selectedRegistration.razorpayPaymentId,
                      copyKey: "paymentId",
                      mono: true,
                    },
                    {
                      label: "Order ID",
                      value: selectedRegistration.razorpayOrderId,
                      copyKey: "orderId",
                      mono: true,
                    },
                    {
                      label: "Registration Fee",
                      value:
                        selectedRegistration.registrationFee !== undefined
                          ? `₹${selectedRegistration.registrationFee}`
                          : "N/A",
                    },
                    {
                      label: "Registration ID",
                      value: selectedRegistration.id,
                      copyKey: "regId",
                      mono: true,
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="rounded-xl border border-gray-800 bg-gray-900/70 p-4 relative group"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-gray-500 uppercase tracking-wider">
                          {item.label}
                        </p>
                        {item.copyKey && item.value && item.value !== "N/A" && (
                          <button
                            type="button"
                            onClick={() => copyToClipboard(String(item.value), item.copyKey!)}
                            className="text-gray-500 hover:text-indigo-400 text-xs transition-colors p-1"
                            title="Copy to clipboard"
                          >
                            {copiedKey === item.copyKey ? (
                              <FiCheck className="text-emerald-400" />
                            ) : (
                              <FiCopy />
                            )}
                          </button>
                        )}
                      </div>

                      <div className="mt-1">
                        {item.badge === "paid" ? (
                          <span className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-300">
                            <FiCheckCircle size={13} /> {formatValue(item.value)}
                          </span>
                        ) : item.badge === "pending" ? (
                          <span className="inline-flex items-center gap-1 text-sm font-bold text-amber-300">
                            <FiClock size={13} /> {formatValue(item.value)}
                          </span>
                        ) : (
                          <p
                            className={`text-sm text-gray-200 break-words ${
                              item.mono ? "font-mono text-xs text-gray-300" : ""
                            }`}
                          >
                            {formatValue(item.value)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Edit Mode: Full Details Form */}
              {canManageSelected && isEditingDetails && (
                <div className="space-y-6">
                  {/* Payment & Status Settings Section */}
                  <div className="rounded-xl border border-indigo-500/30 bg-indigo-950/15 p-4 space-y-4">
                    <h4 className="text-sm font-bold text-indigo-300 flex items-center gap-2">
                      <FiZap size={15} /> Payment & Registration Status
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-400 font-medium block mb-1">
                          Payment Status *
                        </label>
                        <select
                          value={editFormData.paymentStatus}
                          onChange={(e) =>
                            setEditFormData((prev) => ({
                              ...prev,
                              paymentStatus: e.target.value,
                            }))
                          }
                          className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
                        >
                          <option value="paid">paid (Payment Confirmed)</option>
                          <option value="pending">pending (Payment Pending)</option>
                          <option value="free">free (No payment required)</option>
                          <option value="failed">failed</option>
                          <option value="refunded">refunded</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-xs text-gray-400 font-medium block mb-1">
                          Registration Status *
                        </label>
                        <select
                          value={editFormData.status}
                          onChange={(e) =>
                            setEditFormData((prev) => ({
                              ...prev,
                              status: e.target.value,
                            }))
                          }
                          className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
                        >
                          <option value="paid">paid</option>
                          <option value="registered">registered</option>
                          <option value="pending">pending</option>
                          <option value="cancelled">cancelled</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-xs text-gray-400 font-medium block mb-1">
                          Razorpay Payment ID
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. pay_..."
                          value={editFormData.razorpayPaymentId}
                          onChange={(e) =>
                            setEditFormData((prev) => ({
                              ...prev,
                              razorpayPaymentId: e.target.value,
                            }))
                          }
                          className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white font-mono outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="text-xs text-gray-400 font-medium block mb-1">
                          Razorpay Order ID
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. order_..."
                          value={editFormData.razorpayOrderId}
                          onChange={(e) =>
                            setEditFormData((prev) => ({
                              ...prev,
                              razorpayOrderId: e.target.value,
                            }))
                          }
                          className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white font-mono outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="text-xs text-gray-400 font-medium block mb-1">
                          Registration Fee (₹)
                        </label>
                        <input
                          type="number"
                          value={editFormData.registrationFee}
                          onChange={(e) =>
                            setEditFormData((prev) => ({
                              ...prev,
                              registrationFee: e.target.value,
                            }))
                          }
                          className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Participant / Leader Contact Details */}
                  <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4 space-y-4">
                    <h4 className="text-sm font-bold text-gray-200">
                      Participant / Leader Contact
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-400 font-medium block mb-1">
                          Name *
                        </label>
                        <input
                          type="text"
                          value={editFormData.leaderName}
                          onChange={(e) =>
                            setEditFormData((prev) => ({
                              ...prev,
                              leaderName: e.target.value,
                            }))
                          }
                          className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="text-xs text-gray-400 font-medium block mb-1">
                          Email Address *
                        </label>
                        <input
                          type="email"
                          value={editFormData.leaderEmail}
                          onChange={(e) =>
                            setEditFormData((prev) => ({
                              ...prev,
                              leaderEmail: e.target.value,
                            }))
                          }
                          className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="text-xs text-gray-400 font-medium block mb-1">
                          Phone Number *
                        </label>
                        <input
                          type="tel"
                          value={editFormData.leaderMobile}
                          onChange={(e) =>
                            setEditFormData((prev) => ({
                              ...prev,
                              leaderMobile: e.target.value,
                            }))
                          }
                          className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="text-xs text-gray-400 font-medium block mb-1">
                          College / Institute
                        </label>
                        <input
                          type="text"
                          value={editFormData.leaderCollege}
                          onChange={(e) =>
                            setEditFormData((prev) => ({
                              ...prev,
                              leaderCollege: e.target.value,
                            }))
                          }
                          className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="text-xs text-gray-400 font-medium block mb-1">
                          Department / Class
                        </label>
                        <input
                          type="text"
                          value={editFormData.leaderDepartment}
                          onChange={(e) =>
                            setEditFormData((prev) => ({
                              ...prev,
                              leaderDepartment: e.target.value,
                            }))
                          }
                          className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="text-xs text-gray-400 font-medium block mb-1">
                          Year
                        </label>
                        <input
                          type="text"
                          value={editFormData.leaderYear}
                          onChange={(e) =>
                            setEditFormData((prev) => ({
                              ...prev,
                              leaderYear: e.target.value,
                            }))
                          }
                          className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Additional Event Custom Details (extraData) */}
                  <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4 space-y-3">
                    <h4 className="text-sm font-bold text-gray-200">
                      Additional Event Details
                    </h4>

                    {Object.entries(editFormData.extraData).map(([key, value]) => (
                      <div key={key} className="flex items-center gap-2">
                        <span className="w-1/3 text-xs text-gray-400 truncate" title={key}>
                          {key}
                        </span>
                        <input
                          type="text"
                          value={String(value ?? "")}
                          onChange={(e) =>
                            setEditFormData((prev) => ({
                              ...prev,
                              extraData: {
                                ...prev.extraData,
                                [key]: e.target.value,
                              },
                            }))
                          }
                          className="flex-1 bg-gray-950 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-indigo-500"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveExtraDataField(key)}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-red-400"
                          title="Remove field"
                        >
                          <FiTrash2 size={13} />
                        </button>
                      </div>
                    ))}

                    {/* Add Custom Field */}
                    <div className="pt-2 border-t border-gray-800/80 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <input
                        type="text"
                        placeholder="New field name..."
                        value={editFormData.newExtraKey}
                        onChange={(e) =>
                          setEditFormData((prev) => ({
                            ...prev,
                            newExtraKey: e.target.value,
                          }))
                        }
                        className="sm:w-1/3 bg-gray-950 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-indigo-500"
                      />
                      <input
                        type="text"
                        placeholder="Value..."
                        value={editFormData.newExtraValue}
                        onChange={(e) =>
                          setEditFormData((prev) => ({
                            ...prev,
                            newExtraValue: e.target.value,
                          }))
                        }
                        className="flex-1 bg-gray-950 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={handleAddExtraDataField}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600/80 hover:bg-indigo-600 text-xs font-semibold whitespace-nowrap"
                      >
                        + Add Detail
                      </button>
                    </div>
                  </div>

                  {/* Form Action Buttons */}
                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsEditingDetails(false)}
                      className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-sm font-semibold transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={savingDetails}
                      onClick={() => void saveAllRegistrationDetails()}
                      className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-sm transition-all shadow-md shadow-emerald-950"
                    >
                      <FiSave size={15} />
                      {savingDetails ? "Saving Changes..." : "Save All Changes"}
                    </button>
                  </div>
                </div>
              )}

              {/* Team Members Section (Available for team events) */}
              {selectedRegistrationEvent?.eveType === "team" && (
                <div>
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div>
                      <h4 className="font-semibold">Team Members</h4>
                      <p className="text-xs text-gray-500 mt-1">
                        Current team size: {editingTeamMembers.length + 1} /{" "}
                        {selectedRegistrationEvent.department === "Football"
                          ? "Unlimited"
                          : `${selectedMinMembers}-${selectedMaxMembers}`}
                      </p>
                    </div>
                    {canManageSelected && (
                      <button
                        type="button"
                        onClick={addTeamMember}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-medium"
                      >
                        <FiPlus /> Add Team Member
                      </button>
                    )}
                  </div>

                  <div className="space-y-3">
                    {editingTeamMembers.map((member, index) => (
                      <div
                        key={index}
                        className="rounded-xl border border-gray-800 bg-gray-900/60 p-4 relative"
                      >
                        {canManageSelected && (
                          <button
                            type="button"
                            onClick={() => removeTeamMember(index)}
                            className="absolute right-3 top-3 text-gray-500 hover:text-red-400"
                            title="Remove member"
                          >
                            <FiTrash2 />
                          </button>
                        )}
                        <p className="font-medium mb-3 text-indigo-300">
                          Member {index + 2}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pr-6">
                          <label className="block">
                            <span className="text-xs text-gray-500">Name *</span>
                            <input
                              disabled={!canManageSelected}
                              value={member.name || ""}
                              onChange={(e) =>
                                setEditingTeamMembers((current) =>
                                  current.map((m, i) =>
                                    i === index ? { ...m, name: e.target.value } : m
                                  )
                                )
                              }
                              className="mt-1 w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm disabled:opacity-70"
                            />
                          </label>
                          {selectedMemberFields.map((field) => (
                            <label key={field.name} className="block">
                              <span className="text-xs text-gray-500">
                                {field.name} {field.required && "*"}
                              </span>
                              <input
                                disabled={!canManageSelected}
                                type={memberInputType(field.type)}
                                value={member[field.name] || ""}
                                onChange={(e) =>
                                  setEditingTeamMembers((current) =>
                                    current.map((m, i) =>
                                      i === index
                                        ? { ...m, [field.name]: e.target.value }
                                        : m
                                    )
                                  )
                                }
                                className="mt-1 w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm disabled:opacity-70"
                              />
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {canManageSelected && (
                    <div className="flex justify-end mt-4">
                      <button
                        type="button"
                        onClick={() => void saveTeamMembers()}
                        disabled={savingTeamMembers}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 font-semibold text-sm"
                      >
                        {savingTeamMembers ? "Saving..." : "Save Team Members"}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* View Mode: Additional Event Details */}
              {!isEditingDetails &&
                selectedRegistration.extraData &&
                typeof selectedRegistration.extraData === "object" &&
                Object.keys(selectedRegistration.extraData).length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-3">Additional Event Details</h4>
                    <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {Object.entries(selectedRegistration.extraData).map(
                        ([key, value]) => (
                          <div key={key} className="text-sm">
                            <span className="text-gray-500">{key}: </span>
                            <span className="text-gray-200">{formatValue(value)}</span>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Register New User / Participant without Google Login */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-4xl max-h-[92vh] overflow-y-auto bg-[#0b0d14] border border-gray-800 rounded-2xl shadow-2xl p-6">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <FiUserPlus className="text-indigo-400" />
                  Register Participant (No Login Required)
                </h2>
                <p className="text-sm text-gray-400 mt-1">
                  Add participant and event members directly without requiring Google sign-in or login on the website.
                </p>
              </div>

              <button
                onClick={() => !addingNewUser && setIsAddUserModalOpen(false)}
                disabled={addingNewUser}
                className="p-2 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white disabled:opacity-50"
              >
                <FiX size={20} />
              </button>
            </div>

            {/* Event Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Select Event * {isBasicScienceAdmin && !isSuperAdmin && "(Basic Science & Humanities)"}
              </label>
              <select
                value={newUserForm.selectedEventId}
                onChange={(e) => handleNewUserEventChange(e.target.value)}
                disabled={addingNewUser}
                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 disabled:opacity-50"
              >
                <option value="">-- Select an event to register for --</option>
                {availableEvents.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.title} ({event.department || "General"})
                    {event.isFree
                      ? " — Free"
                      : event.registrationFee
                      ? ` — ${String(event.registrationFee).trim().startsWith("₹") ? event.registrationFee : `₹ ${event.registrationFee}`}`
                      : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Leader / Participant Details */}
            <div className="space-y-6">
              <section className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
                <h3 className="font-semibold text-white mb-4">
                  {selectedNewUserEvent?.eveType === "team" ? "Team Leader / Main Contact Details" : "Participant Details"}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="block">
                    <span className="block text-sm text-gray-400 mb-2">Full Name *</span>
                    <input
                      type="text"
                      placeholder="e.g. Rahul Sharma"
                      value={newUserForm.name}
                      onChange={(e) => setNewUserForm(c => ({ ...c, name: e.target.value }))}
                      className="w-full bg-gray-950 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500"
                    />
                  </label>

                  <label className="block">
                    <span className="block text-sm text-gray-400 mb-2">Email Address *</span>
                    <input
                      type="email"
                      placeholder="e.g. rahul@example.com (no login needed)"
                      value={newUserForm.email}
                      onChange={(e) => setNewUserForm(c => ({ ...c, email: e.target.value }))}
                      className="w-full bg-gray-950 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500"
                    />
                  </label>

                  <label className="block">
                    <span className="block text-sm text-gray-400 mb-2">Mobile / WhatsApp Number *</span>
                    <input
                      type="tel"
                      placeholder="e.g. 9876543210"
                      value={newUserForm.mobile}
                      onChange={(e) => setNewUserForm(c => ({ ...c, mobile: e.target.value }))}
                      className="w-full bg-gray-950 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500"
                    />
                  </label>

                  <label className="block">
                    <span className="block text-sm text-gray-400 mb-2">School / College *</span>
                    <input
                      type="text"
                      placeholder="e.g. Carmel College of Engineering"
                      value={newUserForm.college}
                      onChange={(e) => setNewUserForm(c => ({ ...c, college: e.target.value }))}
                      className="w-full bg-gray-950 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500"
                    />
                  </label>

                  <label className="block">
                    <span className="block text-sm text-gray-400 mb-2">Department / Class</span>
                    <input
                      type="text"
                      placeholder="e.g. Physics / S1 CSE"
                      value={newUserForm.department}
                      onChange={(e) => setNewUserForm(c => ({ ...c, department: e.target.value }))}
                      className="w-full bg-gray-950 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500"
                    />
                  </label>

                  <label className="block">
                    <span className="block text-sm text-gray-400 mb-2">Year</span>
                    <input
                      type="text"
                      placeholder="e.g. 1st Year / 2nd Year"
                      value={newUserForm.year}
                      onChange={(e) => setNewUserForm(c => ({ ...c, year: e.target.value }))}
                      className="w-full bg-gray-950 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500"
                    />
                  </label>
                </div>
              </section>

              {/* Team Members if selected event is team */}
              {selectedNewUserEvent && selectedNewUserEvent.eveType === "team" && (
                <section className="rounded-xl border border-gray-800 bg-gray-900/50 p-4 space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-white">Team Members</h3>
                      <p className="text-xs text-gray-500 mt-1">
                        Team size: {1 + newUserForm.teamMembers.length} / {selectedNewUserEvent.department === "Football" ? "Unlimited" : `${newUserMinMembers}-${newUserMaxMembers}`}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={addNewUserMember}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-medium"
                    >
                      <FiPlus /> Add Member
                    </button>
                  </div>

                  {newUserForm.teamMembers.map((member, index) => (
                    <div key={index} className="rounded-xl border border-gray-800 bg-gray-950/60 p-4 space-y-4 relative">
                      <button
                        type="button"
                        onClick={() => removeNewUserMember(index)}
                        className="absolute right-3 top-3 text-gray-500 hover:text-red-400"
                      >
                        <FiTrash2 />
                      </button>
                      <h4 className="font-medium text-indigo-300">Member {index + 2}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-6">
                        <label className="block">
                          <span className="block text-sm text-gray-400 mb-2">Name *</span>
                          <input
                            value={member.name || ""}
                            onChange={(e) => setNewUserForm(c => ({
                              ...c,
                              teamMembers: c.teamMembers.map((m, i) => i === index ? { ...m, name: e.target.value } : m)
                            }))}
                            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500"
                          />
                        </label>
                        {newUserMemberFields.map((field) => (
                          <label key={field.name} className="block">
                            <span className="block text-sm text-gray-400 mb-2">{field.name} {field.required && "*"}</span>
                            <input
                              type={memberInputType(field.type)}
                              value={member[field.name] || ""}
                              onChange={(e) => setNewUserForm(c => ({
                                ...c,
                                teamMembers: c.teamMembers.map((m, i) => i === index ? { ...m, [field.name]: e.target.value } : m)
                              }))}
                              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500"
                            />
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </section>
              )}

              {/* Extra event fields */}
              {selectedNewUserEvent && selectedNewUserEvent.extraFields && selectedNewUserEvent.extraFields.length > 0 && (
                <section className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
                  <h3 className="font-semibold text-white mb-4">Additional Event Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedNewUserEvent.extraFields.map((field) => (
                      <label key={field.name} className="block">
                        <span className="block text-sm text-gray-400 mb-2">{field.name} {field.required && "*"}</span>
                        <input
                          type={memberInputType(field.type)}
                          value={newUserForm.extraData[field.name] || ""}
                          onChange={(e) => setNewUserForm(c => ({
                            ...c,
                            extraData: { ...c.extraData, [field.name]: e.target.value }
                          }))}
                          className="w-full bg-gray-950 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500"
                        />
                      </label>
                    ))}
                  </div>
                </section>
              )}
            </div>

            <div className="rounded-xl bg-indigo-500/5 border border-indigo-500/20 p-4 mt-6 text-sm text-gray-400">
              <p className="text-indigo-300 font-medium">Offline Direct Registration</p>
              <p className="mt-1">
                This will create an event registration record immediately without requiring the user to login with Google. If the user later signs into the site using this email, their registrations will automatically link to their account.
              </p>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setIsAddUserModalOpen(false)}
                disabled={addingNewUser}
                className="px-4 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                onClick={registerNewUserWithoutLogin}
                disabled={addingNewUser || !newUserForm.selectedEventId}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-600/30"
              >
                <FiUserPlus />
                {addingNewUser ? "Registering Participant..." : "Register Participant"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
