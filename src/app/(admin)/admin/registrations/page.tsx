"use client";

import { useAuth } from "@/context/AuthContext";
import { db } from "@/utils/firebase";
import {
  collection,
  getDocs,
  query,
  where,
  deleteDoc,
  doc,
  updateDoc,
  arrayRemove,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { FiDownload, FiUserX } from "react-icons/fi";
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
  const [deregisteringId, setDeregisteringId] = useState<string | null>(null);

  useEffect(() => {
    if (userData) {
      fetchEvents();
    }
  }, [userData]);

  useEffect(() => {
    if (selectedEventId) {
      fetchRegistrations(selectedEventId);
    } else {
      setRegistrations([]);
    }
  }, [selectedEventId]);

  const fetchEvents = async () => {
    try {
      setEventsLoading(true);

      let q;

      if (userData?.role === "superAdmin") {
        q = query(collection(db, "events"));
      } else if (
        userData?.role === "admin" &&
        userData.department
      ) {
        q = query(
          collection(db, "events"),
          where("department", "==", userData.department)
        );
      } else {
        setEvents([]);
        return;
      }

      const snapshot = await getDocs(q);

      setEvents(
        snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        })) as Event[]
      );
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
      const q = query(
        collection(db, "registrations"),
        where("eventId", "==", eventId)
      );

      const snapshot = await getDocs(q);

      setRegistrations(
        snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        })) as UserRegistration[]
      );
    } catch (error) {
      console.error("Error fetching registrations:", error);
      toastError("Failed to fetch registrations from Firebase");
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------------
  // SUPER ADMIN - DEREGISTER USER
  // ---------------------------------------------------------

  const deregisterUser = async (registration: UserRegistration) => {
    // Only Super Admin is allowed to deregister users.
    if (userData?.role !== "superAdmin") {
      toastError("Only Super Admin can deregister users.");
      return;
    }

    const registrationId = registration.id;

    const userId = String(registration.userId || "");

    const eventTitle =
      String(
        registration.eventTitle ||
        events.find((event) => event.id === selectedEventId)?.title ||
        ""
      );

    const userName = String(
      registration.userName ||
      registration.name ||
      registration.leaderName ||
      "this user"
    );

    // Make sure we have a Firebase user ID.
    if (!userId) {
      toastError(
        "User ID is missing from this registration. Cannot deregister."
      );
      return;
    }

    // Make sure we know the event.
    if (!eventTitle) {
      toastError(
        "Event information is missing. Cannot deregister."
      );
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to deregister ${userName} from "${eventTitle}"?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeregisteringId(registrationId);

      // ---------------------------------------------------
      // 1. Delete the registration document
      // ---------------------------------------------------

      await deleteDoc(
        doc(db, "registrations", registrationId)
      );

      // ---------------------------------------------------
      // 2. Remove the event from the user's registeredEvents
      // ---------------------------------------------------

      await updateDoc(doc(db, "users", userId), {
        registeredEvents: arrayRemove(eventTitle),
      });

      // ---------------------------------------------------
      // 3. Remove the registration from the current table
      // ---------------------------------------------------

      setRegistrations((currentRegistrations) =>
        currentRegistrations.filter(
          (item) => item.id !== registrationId
        )
      );

    } catch (error) {
      console.error(
        "Error deregistering user:",
        error
      );

      toastError(
        "Failed to deregister user. Please check Firebase permissions."
      );

      // Refresh the registrations in case the database changed
      // before an error occurred.
      if (selectedEventId) {
        await fetchRegistrations(selectedEventId);
      }
    } finally {
      setDeregisteringId(null);
    }
  };

  // ---------------------------------------------------------
  // EXPORT EXCEL
  // ---------------------------------------------------------

  const exportToExcel = () => {
    if (!registrations.length) return;

    const event = events.find(
      (e) => e.id === selectedEventId
    );

    const eventName = event?.title || "Event";

    const rows: Record<string, string | number>[] =
      registrations.map((reg) => {
        const row: Record<string, string | number> = {
          "Registration ID": reg.id,

          Status: String(
            reg.status || ""
          ),

          "Payment Status": String(
            reg.paymentStatus || ""
          ),

          Event: String(
            reg.eventTitle || eventName
          ),

          "Registration Fee": Number(
            reg.registrationFee || 0
          ),

          Name: String(
            reg.leaderName ||
            reg.userName ||
            reg.name ||
            ""
          ),

          Email: String(
            reg.leaderEmail ||
            reg.userEmail ||
            reg.email ||
            ""
          ),

          Phone: String(
            reg.leaderMobile ||
            reg.phone ||
            ""
          ),

          "School / College": String(
            reg.leaderCollege ||
            reg.college ||
            ""
          ),

          "Department / Class": String(
            reg.leaderDepartment ||
            ""
          ),

          ...(event?.showMemberYear !== false
            ? {
              Year: String(
                reg.leaderYear || ""
              ),
            }
            : {}),

          "Team Size": Number(
            reg.teamSize ||
            (Array.isArray(reg.teamMembers)
              ? reg.teamMembers.length + 1
              : 1)
          ),

          "Razorpay Payment ID": String(
            reg.razorpayPaymentId || ""
          ),

          "Razorpay Order ID": String(
            reg.razorpayOrderId || ""
          ),
        };

        // ---------------------------------------------------
        // TEAM MEMBERS
        // ---------------------------------------------------

        if (Array.isArray(reg.teamMembers)) {
          reg.teamMembers.forEach(
            (member, index) => {
              const memberNo = index + 2;

              row[`Member ${memberNo} Name`] =
                String(member?.name || "");

              Object.entries(member || {}).forEach(
                ([key, value]) => {
                  if (key === "name") {
                    return;
                  }

                  // Do not export Year if admin disabled
                  // Year collection for this event.
                  if (
                    key.toLowerCase() === "year" &&
                    event?.showMemberYear === false
                  ) {
                    return;
                  }

                  const label = key
                    .replace(
                      /([A-Z])/g,
                      " $1"
                    )
                    .replace(
                      /^./,
                      (char) =>
                        char.toUpperCase()
                    );

                  row[
                    `Member ${memberNo} ${label}`
                  ] =
                    value == null
                      ? ""
                      : String(value);
                }
              );
            }
          );
        }

        // ---------------------------------------------------
        // CUSTOM EVENT FIELDS
        // ---------------------------------------------------

        if (
          reg.extraData &&
          typeof reg.extraData === "object"
        ) {
          Object.entries(
            reg.extraData
          ).forEach(([key, value]) => {
            row[key] =
              value == null
                ? ""
                : String(value);
          });
        }

        return row;
      });

    const workbook =
      XLSX.utils.book_new();

    const worksheet =
      XLSX.utils.json_to_sheet(rows);

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Registrations"
    );

    XLSX.writeFile(
      workbook,
      `${eventName.replace(
        /[^a-z0-9_-]/gi,
        "_"
      )}_Registrations.xlsx`
    );
  };

  // ---------------------------------------------------------
  // PAGE
  // ---------------------------------------------------------

  if (!userData) {
    return null;
  }

  return (
    <div className="text-white max-w-7xl mx-auto">

      <h1 className="text-3xl font-bold mb-8">
        Registrations
      </h1>

      {/* ---------------------------------------------------
          EVENT SELECTOR
      --------------------------------------------------- */}

      <div className="mb-8">

        <label className="block text-sm text-gray-400 mb-2">
          Select Event
        </label>

        <div className="relative max-w-xl">

          <select
            value={selectedEventId}
            onChange={(e) =>
              setSelectedEventId(
                e.target.value
              )
            }
            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 appearance-none focus:outline-none focus:border-indigo-500"
            disabled={eventsLoading}
          >

            <option value="">
              -- Choose an Event --
            </option>

            {events.map((event) => (
              <option
                key={event.id}
                value={event.id}
              >
                {event.title} (
                {event.department})
              </option>
            ))}

          </select>

          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
            ▼
          </div>

        </div>
      </div>

      {/* ---------------------------------------------------
          REGISTRATIONS
      --------------------------------------------------- */}

      {selectedEventId && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-xl">

          {/* HEADER */}

          <div className="p-6 border-b border-gray-800 flex justify-between items-center flex-wrap gap-4">

            <div>

              <h2 className="text-xl font-semibold">
                {
                  events.find(
                    (e) =>
                      e.id ===
                      selectedEventId
                  )?.title
                }
              </h2>

              <p className="text-sm text-gray-500 mt-1">
                {registrations.length} Total
                Registrations
              </p>

            </div>

            <button
              onClick={exportToExcel}
              disabled={
                !registrations.length ||
                loading
              }
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-800 disabled:text-gray-600 text-white px-4 py-2 rounded-lg transition-colors font-medium"
            >
              <FiDownload />
              Export Excel
            </button>

          </div>

          {/* TABLE */}

          <div className="overflow-x-auto">

            <table className="w-full text-left border-collapse">

              <thead>

                <tr className="bg-gray-800/50">

                  <th className="p-4 font-semibold text-gray-400 text-sm">
                    Name
                  </th>

                  <th className="p-4 font-semibold text-gray-400 text-sm">
                    Email
                  </th>

                  <th className="p-4 font-semibold text-gray-400 text-sm">
                    Phone
                  </th>

                  <th className="p-4 font-semibold text-gray-400 text-sm">
                    College
                  </th>

                  <th className="p-4 font-semibold text-gray-400 text-sm">
                    Team
                  </th>

                  <th className="p-4 font-semibold text-gray-400 text-sm">
                    Status
                  </th>

                  {/* Only Super Admin gets Action column */}

                  {userData?.role ===
                    "superAdmin" && (
                      <th className="p-4 font-semibold text-gray-400 text-sm">
                        Action
                      </th>
                    )}

                </tr>

              </thead>

              <tbody className="divide-y divide-gray-800">

                {/* LOADING */}

                {loading ? (
                  <tr>

                    <td
                      colSpan={
                        userData?.role ===
                          "superAdmin"
                          ? 7
                          : 6
                      }
                      className="p-8 text-center text-gray-500"
                    >
                      Loading registrations...
                    </td>

                  </tr>

                ) : registrations.length ? (

                  registrations.map(
                    (reg) => (
                      <tr
                        key={reg.id}
                        className="hover:bg-gray-800/30"
                      >

                        {/* NAME */}

                        <td className="p-4 font-medium">
                          {String(
                            reg.userName ||
                            reg.name ||
                            reg.leaderName ||
                            "N/A"
                          )}
                        </td>

                        {/* EMAIL */}

                        <td className="p-4 text-gray-400">
                          {String(
                            reg.userEmail ||
                            reg.email ||
                            reg.leaderEmail ||
                            "N/A"
                          )}
                        </td>

                        {/* PHONE */}

                        <td className="p-4 text-gray-400">
                          {String(
                            reg.leaderMobile ||
                            reg.phone ||
                            "N/A"
                          )}
                        </td>

                        {/* COLLEGE */}

                        <td className="p-4 text-gray-400">
                          {String(
                            reg.leaderCollege ||
                            reg.college ||
                            "N/A"
                          )}
                        </td>

                        {/* TEAM */}

                        <td className="p-4 text-gray-400">

                          {reg.teamSize
                            ? `${String(
                              reg.teamSize
                            )} members`
                            : Array.isArray(
                              reg.teamMembers
                            )
                              ? `${reg.teamMembers
                                .length +
                              1
                              } members`
                              : "Individual"}

                        </td>

                        {/* STATUS */}

                        <td className="p-4">

                          <span className="text-xs px-3 py-1 rounded-full bg-emerald-950/40 text-emerald-300 border border-emerald-500/30">

                            {String(
                              reg.status ||
                              "registered"
                            )}

                          </span>

                        </td>

                        {/* DEREGISTER */}

                        {userData?.role ===
                          "superAdmin" && (
                            <td className="p-4">

                              <button
                                onClick={() =>
                                  deregisterUser(
                                    reg
                                  )
                                }
                                disabled={
                                  deregisteringId ===
                                  reg.id ||
                                  loading
                                }
                                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-600/20 text-red-300 border border-red-500/30 hover:bg-red-600/30 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                              >

                                <FiUserX />

                                {deregisteringId ===
                                  reg.id
                                  ? "Removing..."
                                  : "Deregister"}

                              </button>

                            </td>
                          )}

                      </tr>
                    )
                  )

                ) : (

                  /* NO REGISTRATIONS */

                  <tr>

                    <td
                      colSpan={
                        userData?.role ===
                          "superAdmin"
                          ? 7
                          : 6
                      }
                      className="p-8 text-center text-gray-500"
                    >
                      No registrations found
                      for this event.
                    </td>

                  </tr>

                )}

              </tbody>

            </table>

          </div>

        </div>
      )}

    </div>
  );
}