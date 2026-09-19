"use client";

import { useAuth } from "@/context/AuthContext";
import { db } from "@/utils/firebase";
import {
  arrayRemove,
  collection,
  deleteDoc,
  doc,
  getDocs,
  updateDoc,
} from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import {
  FiDownload,
  FiEye,
  FiSearch,
  FiUsers,
  FiUserX,
  FiX,
  FiPlus,
  FiTrash2,
} from "react-icons/fi";
import { toastError, toastSuccess } from "@/utils/common/Toast";
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
}

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

export default function RegistrationsManagement() {
  const { userData } = useAuth();

  const [events, setEvents] = useState<Event[]>([]);
  const [registrations, setRegistrations] = useState<UserRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [deregisteringId, setDeregisteringId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("All");
  const [eventFilter, setEventFilter] = useState("All");
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedRegistration, setSelectedRegistration] =
    useState<UserRegistration | null>(null);
  const [editingTeamMembers, setEditingTeamMembers] =
    useState<Record<string, string>[]>([]);
  const [savingTeamMembers, setSavingTeamMembers] = useState(false);

  const isSuperAdmin = userData?.role === "superAdmin";

  useEffect(() => {
    if (!userData) return;
    void loadData();
  }, [userData]);

  const loadData = async () => {
    try {
      setLoading(true);

      const [eventsSnapshot, registrationsSnapshot] = await Promise.all([
        getDocs(collection(db, "events")),
        getDocs(collection(db, "registrations")),
      ]);

      let eventList = eventsSnapshot.docs.map((item) => ({
        id: item.id,
        ...item.data(),
      })) as Event[];

      const registrationList = registrationsSnapshot.docs.map((item) => ({
        id: item.id,
        ...item.data(),
      })) as UserRegistration[];

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

  const summaries = useMemo<EventSummary[]>(() => {
    return events
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
        };
      })
      .sort((a, b) => a.event.title.localeCompare(b.event.title));
  }, [events, registrations]);

  const departments = useMemo(() => {
    return Array.from(
      new Set(summaries.map((summary) => getDepartment(summary.event)))
    ).sort((a, b) => a.localeCompare(b));
  }, [summaries]);

  const filteredSummaries = useMemo(() => {
    const lower = searchTerm.trim().toLowerCase();

    return summaries.filter((summary) => {
      const departmentMatches =
        departmentFilter === "All" ||
        getDepartment(summary.event) === departmentFilter;

      const eventMatches =
        eventFilter === "All" || summary.event.id === eventFilter;

      const searchMatches =
        !lower ||
        summary.event.title.toLowerCase().includes(lower) ||
        getDepartment(summary.event).toLowerCase().includes(lower);

      return departmentMatches && eventMatches && searchMatches;
    });
  }, [summaries, departmentFilter, eventFilter, searchTerm]);

  const visibleRegistrationCount = filteredSummaries.reduce(
    (total, summary) => total + summary.registrationCount,
    0
  );

  const visibleMemberCount = filteredSummaries.reduce(
    (total, summary) => total + summary.memberCount,
    0
  );

  const selectedSummary = selectedEventId
    ? summaries.find((summary) => summary.event.id === selectedEventId) || null
    : null;

  const selectedEventRegistrations = selectedSummary?.registrations || [];

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
    setEditingTeamMembers(
      Array.isArray(registration.teamMembers)
        ? registration.teamMembers.map((member: Record<string, unknown>) =>
            Object.fromEntries(Object.entries(member).map(([key, value]) => [key, String(value ?? "")]))
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
      : Math.max(selectedMinMembers, Number(selectedRegistrationEvent.memberMaxCount) || selectedMinMembers)
    : 1;

  const addTeamMember = () => {
    if (!isSuperAdmin || !selectedRegistrationEvent || selectedRegistrationEvent.eveType !== "team") return;
    const currentTeamSize = editingTeamMembers.length + 1;
    if (selectedRegistrationEvent.department !== "Football" && currentTeamSize >= selectedMaxMembers) {
      toastError(`Maximum team size is ${selectedMaxMembers} members.`);
      return;
    }
    setEditingTeamMembers((current) => [...current, emptyTeamMember(selectedMemberFields)]);
  };

  const removeTeamMember = (index: number) => {
    if (!isSuperAdmin) return;
    if (editingTeamMembers.length <= selectedMinMembers - 1) {
      toastError(`Minimum team size is ${selectedMinMembers} members including the leader.`);
      return;
    }
    setEditingTeamMembers((current) => current.filter((_, i) => i !== index));
  };

  const saveTeamMembers = async () => {
    if (!isSuperAdmin || !selectedRegistration || !selectedRegistrationEvent) return;
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
      setRegistrations((current) => current.map((registration) =>
        registration.id === selectedRegistration.id
          ? { ...registration, teamMembers: cleanedMembers, teamSize }
          : registration
      ));
      setSelectedRegistration((current) => current ? { ...current, teamMembers: cleanedMembers, teamSize } : current);
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
    if (!isSuperAdmin) {
      toastError("Only Super Admin can deregister users.");
      return;
    }

    const userId = String(registration.userId || "");
    const event = events.find((item) => item.id === registration.eventId);
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

  if (!userData) return null;

  return (
    <div className="max-w-[1500px] mx-auto text-white">
      <div className="mb-8 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-indigo-400 font-semibold">
            Registration Management
          </p>
          <h1 className="text-3xl md:text-4xl font-bold mt-2">
            Event Registrations
          </h1>
          <p className="text-gray-500 mt-2 max-w-2xl">
            View registrations department-wise, see participant totals for every
            event, open complete registration details, and export Excel reports.
          </p>
        </div>

        <button
          onClick={exportSummary}
          disabled={loading || !filteredSummaries.length}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed font-semibold transition-colors"
        >
          <FiDownload />
          Export Excel Report
        </button>
      </div>

      {events.some((event) => event.registrationMode === "spot" && event.spotRegistrationOpen === true) && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-950/20 p-5 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-amber-300 font-semibold">Registration Desk</p>
              <h2 className="text-xl font-bold mt-1">Spot Registration Status</h2>
              <p className="text-sm text-gray-500 mt-1">Use this live summary at the on-site registration desk.</p>
            </div>
            <div className="text-sm text-amber-200">{new Date().toLocaleString()}</div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {events.filter((event) => event.registrationMode === "spot" && event.spotRegistrationOpen === true).map((event) => {
              const eventRegs = registrations.filter((registration) => registration.eventId === event.id);
              const members = eventRegs.reduce((total, registration) => total + getMemberCount(registration), 0);
              const start = event.spotRegistrationDate ? `${event.spotRegistrationDate}${event.spotRegistrationTime ? ` · ${event.spotRegistrationTime}` : ""}` : "Time not set";
              return (
                <div key={event.id} className="rounded-xl border border-amber-500/20 bg-black/20 p-4">
                  <p className="font-semibold text-white">{event.title}</p>
                  <p className="text-xs text-gray-500 mt-1">{event.spotRegistrationDesk || "Registration Desk"}</p>
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    <div><p className="text-[10px] uppercase text-gray-500">Registrations</p><p className="text-xl font-bold text-amber-200">{eventRegs.length}</p></div>
                    <div><p className="text-[10px] uppercase text-gray-500">Members</p><p className="text-xl font-bold text-amber-200">{members}</p></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-3">Spot start: {start}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <div className="rounded-2xl border border-gray-800 bg-gray-900/70 p-5">
          <p className="text-xs uppercase tracking-wider text-gray-500">Events</p>
          <p className="text-3xl font-bold mt-2">{filteredSummaries.length}</p>
        </div>
        <div className="rounded-2xl border border-gray-800 bg-gray-900/70 p-5">
          <p className="text-xs uppercase tracking-wider text-gray-500">Registrations</p>
          <p className="text-3xl font-bold mt-2">{visibleRegistrationCount}</p>
        </div>
        <div className="rounded-2xl border border-gray-800 bg-gray-900/70 p-5">
          <p className="text-xs uppercase tracking-wider text-gray-500">Members</p>
          <p className="text-3xl font-bold mt-2">{visibleMemberCount}</p>
        </div>
        <div className="rounded-2xl border border-gray-800 bg-gray-900/70 p-5">
          <p className="text-xs uppercase tracking-wider text-gray-500">Departments</p>
          <p className="text-3xl font-bold mt-2">
            {departmentFilter === "All" ? departments.length : 1}
          </p>
        </div>
      </div>

      <div className="bg-gray-900/70 border border-gray-800 rounded-2xl p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search event or department..."
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
                              <span className="inline-flex items-center gap-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 text-indigo-300 font-semibold">
                                <FiUsers size={14} />
                                {summary.registrationCount}
                              </span>
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
                                  onClick={() => setSelectedEventId(summary.event.id)}
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

      {selectedSummary && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 md:p-6">
          <div className="w-full max-w-7xl max-h-[92vh] bg-[#080a11] border border-gray-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-5 md:p-6 border-b border-gray-800 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-indigo-400 font-semibold">
                  {getDepartment(selectedSummary.event)}
                </p>
                <h2 className="text-2xl font-bold mt-1">{selectedSummary.event.title}</h2>
                <p className="text-sm text-gray-500 mt-1">
                  {selectedSummary.registrationCount} registrations · {selectedSummary.memberCount} members
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

            <div className="overflow-auto flex-1">
              {selectedEventRegistrations.length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                  No registrations for this event yet.
                </div>
              ) : (
                <table className="w-full text-left min-w-[1050px]">
                  <thead className="sticky top-0 bg-gray-900 z-10">
                    <tr className="border-b border-gray-800">
                      <th className="px-5 py-4 text-xs uppercase tracking-wider text-gray-500">#</th>
                      <th className="px-5 py-4 text-xs uppercase tracking-wider text-gray-500">Participant / Captain</th>
                      <th className="px-5 py-4 text-xs uppercase tracking-wider text-gray-500">Contact</th>
                      <th className="px-5 py-4 text-xs uppercase tracking-wider text-gray-500">College</th>
                      <th className="px-5 py-4 text-xs uppercase tracking-wider text-gray-500">Team</th>
                      <th className="px-5 py-4 text-xs uppercase tracking-wider text-gray-500">Payment</th>
                      <th className="px-5 py-4 text-xs uppercase tracking-wider text-gray-500">Details</th>
                      {isSuperAdmin && (
                        <th className="px-5 py-4 text-xs uppercase tracking-wider text-gray-500">Action</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {selectedEventRegistrations.map((registration, index) => (
                      <tr key={registration.id} className="hover:bg-gray-800/30">
                        <td className="px-5 py-4 text-gray-500">{index + 1}</td>
                        <td className="px-5 py-4">
                          <p className="font-medium">{getRegistrationName(registration)}</p>
                          <p className="text-xs text-gray-500 mt-1">{getRegistrationEmail(registration)}</p>
                        </td>
                        <td className="px-5 py-4 text-sm text-gray-400">
                          {getRegistrationPhone(registration)}
                        </td>
                        <td className="px-5 py-4 text-sm text-gray-400">
                          {getRegistrationCollege(registration)}
                        </td>
                        <td className="px-5 py-4">
                          <span className="font-semibold text-emerald-300">{getMemberCount(registration)}</span>
                        </td>
                        <td className="px-5 py-4 text-sm">
                          <span className="text-gray-300">{String(registration.paymentStatus || "—")}</span>
                        </td>
                        <td className="px-5 py-4">
                          <button
                            onClick={() => openRegistrationDetails(registration)}
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm"
                          >
                            <FiEye /> View
                          </button>
                        </td>
                        {isSuperAdmin && (
                          <td className="px-5 py-4">
                            <button
                              onClick={() => void deregisterUser(registration)}
                              disabled={deregisteringId === registration.id}
                              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 hover:bg-red-500/20 disabled:opacity-40 text-sm"
                            >
                              <FiUserX />
                              {deregisteringId === registration.id ? "Removing..." : "Deregister"}
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedRegistration && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-3xl max-h-[90vh] bg-[#0a0c13] border border-gray-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-5 border-b border-gray-800 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-indigo-400">Registration Details</p>
                <h3 className="text-xl font-bold mt-1">{getRegistrationName(selectedRegistration)}</h3>
              </div>
              <button
                onClick={() => setSelectedRegistration(null)}
                className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700"
              >
                <FiX />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  ["Email", getRegistrationEmail(selectedRegistration)],
                  ["Phone", getRegistrationPhone(selectedRegistration)],
                  ["College", getRegistrationCollege(selectedRegistration)],
                  ["Department / Class", selectedRegistration.leaderDepartment || selectedRegistration.department],
                  ["Year", selectedRegistration.leaderYear || selectedRegistration.year],
                  ["Team Size", getMemberCount(selectedRegistration)],
                  ["Payment Status", selectedRegistration.paymentStatus],
                  ["Registration Status", selectedRegistration.status],
                  ["Payment ID", selectedRegistration.razorpayPaymentId],
                  ["Registration ID", selectedRegistration.id],
                ].map(([label, value]) => (
                  <div key={String(label)} className="rounded-xl border border-gray-800 bg-gray-900/70 p-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
                    <p className="text-sm text-gray-200 mt-1 break-words">{formatValue(value)}</p>
                  </div>
                ))}
              </div>

              {selectedRegistrationEvent?.eveType === "team" && (
                <div>
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div>
                      <h4 className="font-semibold">Team Members</h4>
                      <p className="text-xs text-gray-500 mt-1">Current team size: {editingTeamMembers.length + 1} / {selectedRegistrationEvent.department === "Football" ? "Unlimited" : `${selectedMinMembers}-${selectedMaxMembers}`}</p>
                    </div>
                    {isSuperAdmin && (
                      <button type="button" onClick={addTeamMember} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-medium">
                        <FiPlus /> Add Team Member
                      </button>
                    )}
                  </div>
                  <div className="space-y-3">
                    {editingTeamMembers.map((member, index) => (
                      <div key={index} className="rounded-xl border border-gray-800 bg-gray-900/60 p-4 relative">
                        {isSuperAdmin && (
                          <button type="button" onClick={() => removeTeamMember(index)} className="absolute right-3 top-3 text-gray-500 hover:text-red-400" title="Remove member"><FiTrash2 /></button>
                        )}
                        <p className="font-medium mb-3 text-indigo-300">Member {index + 2}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pr-6">
                          <label className="block"><span className="text-xs text-gray-500">Name *</span><input disabled={!isSuperAdmin} value={member.name || ""} onChange={(e) => setEditingTeamMembers((current) => current.map((m, i) => i === index ? { ...m, name: e.target.value } : m))} className="mt-1 w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm disabled:opacity-70" /></label>
                          {selectedMemberFields.map((field) => (
                            <label key={field.name} className="block"><span className="text-xs text-gray-500">{field.name} {field.required && "*"}</span><input disabled={!isSuperAdmin} type={memberInputType(field.type)} value={member[field.name] || ""} onChange={(e) => setEditingTeamMembers((current) => current.map((m, i) => i === index ? { ...m, [field.name]: e.target.value } : m))} className="mt-1 w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm disabled:opacity-70" /></label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  {isSuperAdmin && (
                    <div className="flex justify-end mt-4">
                      <button type="button" onClick={() => void saveTeamMembers()} disabled={savingTeamMembers} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 font-semibold text-sm">
                        {savingTeamMembers ? "Saving..." : "Save Team Members"}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {selectedRegistration.extraData && typeof selectedRegistration.extraData === "object" && (
                <div>
                  <h4 className="font-semibold mb-3">Additional Event Details</h4>
                  <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {Object.entries(selectedRegistration.extraData).map(([key, value]) => (
                      <div key={key} className="text-sm">
                        <span className="text-gray-500">{key}: </span>
                        <span className="text-gray-200">{formatValue(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
