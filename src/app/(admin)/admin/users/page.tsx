"use client";

import { useAuth } from "@/context/AuthContext";
import { db } from "@/utils/firebase";
import {
    collection,
    getDocs,
    doc,
    updateDoc,
    query,
    where,
    writeBatch,
    arrayUnion,
} from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import {
    FiEdit2,
    FiSave,
    FiSearch,
    FiX,
    FiUserPlus,
} from "react-icons/fi";
import { toastError, toastSuccess } from "@/utils/common/Toast";
import { departments } from "@/utils/constants/Constants";
import { Event } from "@/utils/types/event";

interface UserData {
    id: string;
    name: string;
    email: string;
    college: string;
    role?: string;
    department?: string;
    registeredEvents?: string[];
}

export default function UsersManagement() {
    const { userData } = useAuth();

    const [users, setUsers] = useState<UserData[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<UserData[]>([]);
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [eventsLoading, setEventsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editRole, setEditRole] = useState("");
    const [editDept, setEditDept] = useState("");

    const [registeringUser, setRegisteringUser] = useState<UserData | null>(null);
    const [selectedEventId, setSelectedEventId] = useState("");
    const [registering, setRegistering] = useState(false);

    const isSuperAdmin = userData?.role === "superAdmin";

    useEffect(() => {
        if (!isSuperAdmin) return;
        void fetchUsers();
        void fetchEvents();
    }, [isSuperAdmin]);

    useEffect(() => {
        if (!searchTerm) {
            setFilteredUsers(users);
            return;
        }

        const lower = searchTerm.toLowerCase();
        setFilteredUsers(
            users.filter(
                (u) =>
                    u.name?.toLowerCase().includes(lower) ||
                    u.email?.toLowerCase().includes(lower) ||
                    u.college?.toLowerCase().includes(lower)
            )
        );
    }, [searchTerm, users]);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const snapshot = await getDocs(collection(db, "users"));
            const usersList = snapshot.docs.map((item) => ({
                id: item.id,
                ...item.data(),
            })) as UserData[];

            setUsers(usersList);
            setFilteredUsers(usersList);
        } catch (error) {
            console.error("Error fetching users:", error);
            toastError("Failed to fetch users");
        } finally {
            setLoading(false);
        }
    };

    const fetchEvents = async () => {
        try {
            setEventsLoading(true);
            const snapshot = await getDocs(collection(db, "events"));
            const eventList = snapshot.docs.map((item) => ({
                id: item.id,
                ...item.data(),
            })) as Event[];
            setEvents(eventList);
        } catch (error) {
            console.error("Error fetching events:", error);
            toastError("Failed to fetch events");
        } finally {
            setEventsLoading(false);
        }
    };

    const availableEvents = useMemo(() => {
        const now = new Date();

        return events.filter((event) => {
            if (event.registrationOpen === false) return false;

            if (event.regFinalDate) {
                const closeDate = new Date(event.regFinalDate);

                if (!Number.isNaN(closeDate.getTime())) {
                    if (event.RegCloseTime) {
                        closeDate.setHours(
                            Number(event.RegCloseTime.hours || 0),
                            Number(event.RegCloseTime.minutes || 0),
                            0,
                            0
                        );
                    }

                    if (now > closeDate) return false;
                }
            }

            return true;
        });
    }, [events]);

    const startEdit = (user: UserData) => {
        setEditingId(user.id);
        setEditRole(user.role || "user");
        setEditDept(user.department || "All");
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditRole("");
        setEditDept("");
    };

    const saveEdit = async (userId: string) => {
        if (!userId) return;

        try {
            await updateDoc(doc(db, "users", userId), {
                role: editRole,
                department: editRole === "admin" ? editDept : null,
            });

            toastSuccess("User updated successfully");

            setUsers((current) =>
                current.map((u) =>
                    u.id === userId
                        ? {
                              ...u,
                              role: editRole,
                              department:
                                  editRole === "admin" ? editDept : undefined,
                          }
                        : u
                )
            );

            setEditingId(null);
        } catch (error) {
            console.error("Error updating user:", error);
            toastError("Failed to update user");
        }
    };

    const openRegisterModal = (user: UserData) => {
        setRegisteringUser(user);
        setSelectedEventId("");
    };

    const closeRegisterModal = () => {
        if (registering) return;
        setRegisteringUser(null);
        setSelectedEventId("");
    };

    const registerUserForEvent = async () => {
        if (!registeringUser || !selectedEventId) {
            toastError("Please select an event.");
            return;
        }

        if (!isSuperAdmin) {
            toastError("Only Super Admin can register users for events.");
            return;
        }

        const event = events.find((item) => item.id === selectedEventId);

        if (!event) {
            toastError("Event not found.");
            return;
        }

        if (event.registrationOpen === false) {
            toastError("Registration for this event is closed.");
            return;
        }

        if (registeringUser.registeredEvents?.includes(event.title)) {
            toastError("This user is already registered for this event.");
            return;
        }

        try {
            setRegistering(true);

            const existingQuery = query(
                collection(db, "registrations"),
                where("eventId", "==", event.id),
                where("userId", "==", registeringUser.id)
            );

            const existingSnapshot = await getDocs(existingQuery);

            if (!existingSnapshot.empty) {
                toastError("This user is already registered for this event.");
                return;
            }

            const batch = writeBatch(db);

            const registrationRef = doc(
                collection(db, "registrations")
            );

            batch.set(registrationRef, {
                eventId: event.id,
                eventTitle: event.title,
                userId: registeringUser.id,
                userName: registeringUser.name || "",
                userEmail: registeringUser.email || "",
                name: registeringUser.name || "",
                email: registeringUser.email || "",
                leaderName: registeringUser.name || "",
                leaderEmail: registeringUser.email || "",
                leaderCollege: registeringUser.college || "",
                college: registeringUser.college || "",
                status: "registered",
                paymentStatus: "admin",
                registrationFee: 0,
                registrationMethod: "superAdmin",
                registeredBy: userData?.email || "",
                teamSize: 1,
                teamMembers: [],
                createdAt: new Date(),
                updatedAt: new Date(),
            });

            batch.update(
                doc(db, "users", registeringUser.id),
                {
                    registeredEvents: arrayUnion(event.title),
                }
            );

            await batch.commit();

            setUsers((current) =>
                current.map((u) =>
                    u.id === registeringUser.id
                        ? {
                              ...u,
                              registeredEvents: Array.from(
                                  new Set([
                                      ...(u.registeredEvents || []),
                                      event.title,
                                  ])
                              ),
                          }
                        : u
                )
            );

            toastSuccess(
                `${registeringUser.name || "User"} registered for ${event.title}.`
            );

            setRegisteringUser(null);
            setSelectedEventId("");
        } catch (error) {
            console.error("Error registering user for event:", error);
            toastError(
                "Failed to register user. Check Firestore permissions and try again."
            );
        } finally {
            setRegistering(false);
        }
    };

    if (!isSuperAdmin) {
        return <div className="text-red-500">Access Denied</div>;
    }

    if (loading) {
        return <div className="text-white">Loading users...</div>;
    }

    return (
        <div className="text-white">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold mb-2">User Management</h1>
                    <p className="text-gray-500 text-sm">
                        Manage users and register them for available events.
                    </p>
                </div>
            </div>

            <div className="mb-6 relative max-w-md">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                    type="text"
                    placeholder="Search by name, email or college..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl py-2 pl-10 pr-4 focus:outline-none focus:border-indigo-500 text-sm"
                />
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[1050px]">
                    <thead>
                        <tr className="border-b border-gray-800 bg-gray-800/50">
                            <th className="p-4 font-semibold text-gray-400 text-sm">Name/Email</th>
                            <th className="p-4 font-semibold text-gray-400 text-sm">College</th>
                            <th className="p-4 font-semibold text-gray-400 text-sm">Role</th>
                            <th className="p-4 font-semibold text-gray-400 text-sm">Department</th>
                            <th className="p-4 font-semibold text-gray-400 text-sm">Registered Events</th>
                            <th className="p-4 font-semibold text-gray-400 text-sm">Actions</th>
                        </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-800">
                        {filteredUsers.map((user) => (
                            <tr key={user.id} className="hover:bg-gray-800/30 transition-colors">
                                <td className="p-4">
                                    <p className="font-medium text-white">{user.name || "Unnamed user"}</p>
                                    <p className="text-xs text-gray-500">{user.email}</p>
                                </td>

                                <td className="p-4 text-sm text-gray-300">
                                    {user.college || "-"}
                                </td>

                                <td className="p-4">
                                    {editingId === user.id ? (
                                        <select
                                            value={editRole}
                                            onChange={(e) => setEditRole(e.target.value)}
                                            className="bg-black border border-gray-600 rounded px-2 py-1 text-sm focus:outline-none focus:border-indigo-500"
                                        >
                                            <option value="user">User</option>
                                            <option value="admin">Admin</option>
                                            <option value="superAdmin">Super Admin</option>
                                            <option value="abheriAdmin">Abheri Admin</option>
                                        </select>
                                    ) : (
                                        <span
                                            className={`px-2 py-1 rounded text-xs font-semibold ${
                                                user.role === "superAdmin"
                                                    ? "bg-fuchsia-500/20 text-fuchsia-300"
                                                    : user.role === "admin"
                                                    ? "bg-indigo-500/20 text-indigo-300"
                                                    : user.role === "abheriAdmin"
                                                    ? "bg-amber-500/20 text-amber-300"
                                                    : "bg-gray-700 text-gray-300"
                                            }`}
                                        >
                                            {user.role || "user"}
                                        </span>
                                    )}
                                </td>

                                <td className="p-4">
                                    {editingId === user.id && editRole === "admin" ? (
                                        <select
                                            value={editDept}
                                            onChange={(e) => setEditDept(e.target.value)}
                                            className="bg-black border border-gray-600 rounded px-2 py-1 text-sm focus:outline-none focus:border-indigo-500"
                                        >
                                            <option value="">Select Dept</option>
                                            {departments
                                                .filter((d) => d !== "All")
                                                .map((d) => (
                                                    <option key={d} value={d}>
                                                        {d}
                                                    </option>
                                                ))}
                                        </select>
                                    ) : (
                                        <span className="text-sm text-gray-400">
                                            {user.department || "-"}
                                        </span>
                                    )}
                                </td>

                                <td className="p-4 max-w-[280px]">
                                    {user.registeredEvents?.length ? (
                                        <div className="flex flex-wrap gap-1">
                                            {user.registeredEvents.map((eventName, index) => (
                                                <span
                                                    key={`${eventName}-${index}`}
                                                    className="text-xs px-2 py-1 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-300"
                                                >
                                                    {eventName}
                                                </span>
                                            ))}
                                        </div>
                                    ) : (
                                        <span className="text-xs text-gray-600">No events</span>
                                    )}
                                </td>

                                <td className="p-4">
                                    {editingId === user.id ? (
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => saveEdit(user.id)}
                                                className="p-1.5 bg-green-500/10 text-green-400 rounded hover:bg-green-500/20"
                                                title="Save"
                                            >
                                                <FiSave size={16} />
                                            </button>
                                            <button
                                                onClick={cancelEdit}
                                                className="p-1.5 bg-red-500/10 text-red-400 rounded hover:bg-red-500/20"
                                                title="Cancel"
                                            >
                                                <FiX size={16} />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => openRegisterModal(user)}
                                                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors text-sm font-medium"
                                                title="Register this user for an event"
                                            >
                                                <FiUserPlus size={15} />
                                                Register Event
                                            </button>
                                            <button
                                                onClick={() => startEdit(user)}
                                                className="p-1.5 bg-gray-700 text-gray-300 rounded hover:bg-gray-600"
                                                title="Edit"
                                            >
                                                <FiEdit2 size={16} />
                                            </button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {filteredUsers.length === 0 && (
                    <div className="p-8 text-center text-gray-500">
                        No users found.
                    </div>
                )}
            </div>

            {/* Register User Modal */}
            {registeringUser && (
                <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="w-full max-w-lg bg-[#0b0d14] border border-gray-800 rounded-2xl shadow-2xl p-6">
                        <div className="flex items-start justify-between gap-4 mb-6">
                            <div>
                                <h2 className="text-xl font-bold text-white">
                                    Register User for Event
                                </h2>
                                <p className="text-sm text-gray-500 mt-1">
                                    {registeringUser.name || "Unnamed user"} • {registeringUser.email}
                                </p>
                            </div>

                            <button
                                onClick={closeRegisterModal}
                                disabled={registering}
                                className="p-2 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white disabled:opacity-50"
                            >
                                <FiX size={20} />
                            </button>
                        </div>

                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Select Available Event
                        </label>

                        <select
                            value={selectedEventId}
                            onChange={(e) => setSelectedEventId(e.target.value)}
                            disabled={eventsLoading || registering}
                            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                        >
                            <option value="">-- Select an event --</option>
                            {availableEvents.map((event) => (
                                <option key={event.id} value={event.id}>
                                    {event.title}
                                    {event.isFree
                                        ? " — Free"
                                        : event.registrationFee
                                        ? ` — ₹${event.registrationFee}`
                                        : ""}
                                </option>
                            ))}
                        </select>

                        {eventsLoading && (
                            <p className="text-sm text-gray-500 mt-2">
                                Loading events...
                            </p>
                        )}

                        {!eventsLoading && availableEvents.length === 0 && (
                            <p className="text-sm text-amber-400 mt-2">
                                No currently available events found.
                            </p>
                        )}

                        {selectedEventId && (
                            <div className="rounded-xl bg-indigo-500/5 border border-indigo-500/20 p-4 mt-5 text-sm text-gray-400">
                                <p>
                                    This event will be added to the user's registered events and a registration record will be created in Firestore.
                                </p>
                                <p className="text-amber-400 mt-2">
                                    This is a Super Admin manual registration. No payment will be requested from the user.
                                </p>
                            </div>
                        )}

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={closeRegisterModal}
                                disabled={registering}
                                className="px-4 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 disabled:opacity-50"
                            >
                                Cancel
                            </button>

                            <button
                                onClick={registerUserForEvent}
                                disabled={registering || !selectedEventId || eventsLoading}
                                className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <FiUserPlus />
                                {registering ? "Registering..." : "Register User"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
