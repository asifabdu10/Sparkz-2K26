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
    FiMusic,
    FiPlus,
    FiTrash2,
} from "react-icons/fi";
import { toastError, toastSuccess } from "@/utils/common/Toast";
import { departments } from "@/utils/constants/Constants";
import { Event, RegistrationField } from "@/utils/types/event";

type MemberData = Record<string, string>;

const baseMemberFields: RegistrationField[] = [
    { name: "Phone Number", type: "tel", required: true },
    { name: "School / College", type: "text", required: true },
    { name: "Department / Class", type: "text", required: true },
    { name: "Year", type: "text", required: true },
];

function emptyMember(fields: RegistrationField[]): MemberData {
    const member: MemberData = { name: "" };
    fields.forEach((field) => { member[field.name] = ""; });
    return member;
}

function inputType(type: RegistrationField["type"]): string {
    if (type === "email") return "email";
    if (type === "number") return "number";
    if (type === "date") return "date";
    if (type === "tel") return "tel";
    return "text";
}

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
    const { user, userData } = useAuth();

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
    const createEmptyManualForm = () => ({
        leaderName: "",
        leaderEmail: "",
        leaderMobile: "",
        leaderCollege: "",
        leaderDepartment: "",
        leaderYear: "",
        extraData: {} as Record<string, string>,
        teamMembers: [] as MemberData[],
    });

    const [manualForm, setManualForm] = useState(createEmptyManualForm());

    const [abheriUser, setAbheriUser] = useState<UserData | null>(null);
    const [abheriRegistering, setAbheriRegistering] = useState(false);
    const [abheriForm, setAbheriForm] = useState({
        bandName: "",
        managerName: "",
        managerMobile: "",
        leaderName: "",
        leaderMobile: "",
        musiciansCount: "",
        vocalistCount: "",
        instrumentalistCount: "",
        instruments: "",
    });

    const isSuperAdmin =
        userData?.role === "superAdmin" ||
        user?.email?.toLowerCase() === "joeljoy1237@gmail.com";

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

    // Super Admin manual registration:
    // Allow registration for any event that accepts a registration record.
    // This bypasses public registration-open/deadline checks because the
    // Super Admin is registering the existing user manually without payment.
    // Expo/details-only events (registrationMode === "none") remain excluded.
    const availableEvents = useMemo(() => {
        return events.filter(
            (event) => (event.registrationMode || "online") !== "none"
        );
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

    const selectedManualEvent = useMemo(
        () => events.find((item) => item.id === selectedEventId) || null,
        [events, selectedEventId]
    );

    const manualMemberFields = useMemo<RegistrationField[]>(() => {
        if (!selectedManualEvent || selectedManualEvent.eveType !== "team") return [];
        if (selectedManualEvent.department === "Football") {
            return [{ name: "Phone Number", type: "tel", required: true }];
        }
        const custom = selectedManualEvent.teamMemberFields || [];
        const collectYear = selectedManualEvent.showMemberYear !== false;
        const customNames = new Set(custom.map((field) => field.name.toLowerCase().trim()));
        return [
            ...baseMemberFields.filter((field) => !customNames.has(field.name.toLowerCase().trim())),
            ...custom,
        ].filter((field) => collectYear || field.name.toLowerCase().trim() !== "year");
    }, [selectedManualEvent]);

    const manualMinMembers = selectedManualEvent?.eveType === "team"
        ? selectedManualEvent.department === "Football"
            ? 1
            : Math.max(1, Number(selectedManualEvent.memberMinCount) || 1)
        : 1;
    const manualMaxMembers = selectedManualEvent?.eveType === "team"
        ? selectedManualEvent.department === "Football"
            ? Infinity
            : Math.max(manualMinMembers, Number(selectedManualEvent.memberMaxCount) || manualMinMembers)
        : 1;

    const closeRegisterModal = () => {
        if (registering) return;
        setRegisteringUser(null);
        setSelectedEventId("");
        setManualForm(createEmptyManualForm());
    };

    const handleManualEventChange = (eventId: string) => {
        setSelectedEventId(eventId);
        const nextEvent = events.find((item) => item.id === eventId);
        if (!nextEvent) {
            setManualForm(createEmptyManualForm());
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
        setManualForm({
            ...createEmptyManualForm(),
            teamMembers: nextEvent.eveType === "team"
                ? Array.from({ length: Math.max(0, min - 1) }, () => emptyMember(custom))
                : [],
        });
    };

    const addManualMember = () => {
        if (!selectedManualEvent || selectedManualEvent.eveType !== "team") return;
        if (selectedManualEvent.department !== "Football" && manualForm.teamMembers.length + 1 >= manualMaxMembers) {
            toastError(`Maximum team size is ${manualMaxMembers} members.`);
            return;
        }
        setManualForm((current) => ({ ...current, teamMembers: [...current.teamMembers, emptyMember(manualMemberFields)] }));
    };

    const removeManualMember = (index: number) => {
        if (manualForm.teamMembers.length <= manualMinMembers - 1) {
            toastError(`Minimum team size is ${manualMinMembers} members including the leader.`);
            return;
        }
        setManualForm((current) => ({ ...current, teamMembers: current.teamMembers.filter((_, i) => i !== index) }));
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

        if ((event.registrationMode || "online") === "none") {
            toastError("Expo events cannot be registered online.");
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

            const teamSize = event.eveType === "team" ? 1 + manualForm.teamMembers.length : 1;
            const minMembers = event.eveType === "team" ? (event.department === "Football" ? 1 : Math.max(1, Number(event.memberMinCount) || 1)) : 1;
            const maxMembers = event.eveType === "team" ? (event.department === "Football" ? Infinity : Math.max(minMembers, Number(event.memberMaxCount) || minMembers)) : 1;
            if (event.eveType === "team" && (teamSize < minMembers || teamSize > maxMembers)) {
                toastError(`Team size must be between ${minMembers} and ${maxMembers} members.`);
                return;
            }
            if (event.eveType === "team") {
                for (let index = 0; index < manualForm.teamMembers.length; index += 1) {
                    const member = manualForm.teamMembers[index];
                    if (!String(member.name || "").trim()) {
                        toastError(`Member ${index + 2} name is required.`);
                        return;
                    }
                    for (const field of manualMemberFields) {
                        if (field.required && !String(member[field.name] || "").trim()) {
                            toastError(`Member ${index + 2}: ${field.name} is required.`);
                            return;
                        }
                    }
                }
            }
            for (const field of event.extraFields || []) {
                if (field.required && !String(manualForm.extraData[field.name] || "").trim()) {
                    toastError(`${field.name} is required.`);
                    return;
                }
            }

            const cleanedMembers = manualForm.teamMembers.map((member) => {
                if (event.showMemberYear === false) {
                    const { Year, ...rest } = member;
                    void Year;
                    return rest;
                }
                return member;
            });

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
                leaderMobile: manualForm.leaderMobile || "",
                leaderCollege: registeringUser.college || "",
                leaderDepartment: manualForm.leaderDepartment || "",
                leaderYear: manualForm.leaderYear || "",
                college: registeringUser.college || "",
                department: event.department || "",
                extraData: manualForm.extraData,
                status: "registered",
                paymentStatus: "admin",
                registrationFee: 0,
                registrationMethod: "superAdmin",
                registeredBy: userData?.email || "",
                teamSize,
                teamMembers: cleanedMembers,
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

            if (event.registrationMode === "spot") {
                try {
                    const ticketResponse = await fetch("/api/events/send-spot-ticket", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            registrationId: registrationRef.id,
                            event,
                            registration: {
                                ...manualForm,
                                userId: registeringUser.id,
                                userEmail: registeringUser.email || manualForm.leaderEmail,
                                userName: registeringUser.name || manualForm.leaderName,
                                leaderName: registeringUser.name || manualForm.leaderName,
                                leaderEmail: registeringUser.email || manualForm.leaderEmail,
                                leaderMobile: manualForm.leaderMobile,
                                leaderCollege: registeringUser.college || manualForm.leaderCollege,
                                teamSize,
                                teamMembers: cleanedMembers,
                            },
                        }),
                    });
                    const ticketResult = await ticketResponse.json().catch(() => ({}));
                    if (!ticketResponse.ok) {
                        console.error("Spot ticket email failed for manual registration");
                        toastError("Registration was added, but the ticket email could not be sent.");
                    } else if (ticketResult.ticketNumber) {
                        await updateDoc(registrationRef, {
                            ticketNumber: ticketResult.ticketNumber,
                            ticketEmailStatus: "sent",
                            ticketEmailedAt: new Date(),
                        });
                    }
                } catch (ticketError) {
                    console.error("Spot ticket email failed:", ticketError);
                    toastError("Registration was added, but the ticket email could not be sent.");
                }
            }

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


    const openAbheriModal = (selectedUser: UserData) => {
        setAbheriUser(selectedUser);
        setAbheriForm({
            bandName: "",
            managerName: selectedUser.name || "",
            managerMobile: "",
            leaderName: selectedUser.name || "",
            leaderMobile: "",
            musiciansCount: "",
            vocalistCount: "",
            instrumentalistCount: "",
            instruments: "",
        });
    };

    const closeAbheriModal = () => {
        if (abheriRegistering) return;
        setAbheriUser(null);
    };

    const registerUserForAbheri = async () => {
        if (!abheriUser) return;

        if (!isSuperAdmin) {
            toastError("Only Super Admin can add an Abheri registration.");
            return;
        }

        const bandName = abheriForm.bandName.trim();
        const managerName = abheriForm.managerName.trim();
        const managerMobile = abheriForm.managerMobile.trim();
        const leaderName = abheriForm.leaderName.trim();
        const leaderMobile = abheriForm.leaderMobile.trim();
        const musiciansCount = Number(abheriForm.musiciansCount);
        const vocalistCount = Number(abheriForm.vocalistCount);
        const instrumentalistCount = Number(abheriForm.instrumentalistCount);
        const instruments = abheriForm.instruments
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean);

        if (!bandName || !managerName || !managerMobile || !leaderName || !leaderMobile) {
            toastError("Please fill all band, manager and leader details.");
            return;
        }

        if (!Number.isInteger(musiciansCount) || musiciansCount < 5 || musiciansCount > 10) {
            toastError("Musicians count must be between 5 and 10.");
            return;
        }

        if (!Number.isInteger(vocalistCount) || vocalistCount < 2) {
            toastError("At least 2 vocalists are required.");
            return;
        }

        if (!Number.isInteger(instrumentalistCount) || instrumentalistCount < 3) {
            toastError("At least 3 instrumentalists are required.");
            return;
        }

        if (vocalistCount + instrumentalistCount > musiciansCount) {
            toastError("Vocalists + instrumentalists cannot exceed total musicians.");
            return;
        }

        try {
            setAbheriRegistering(true);

            const registrationRef = doc(db, "abheri_registrations", abheriUser.id);
            const registrationData = {
                bandName,
                collegeName: abheriUser.college || "",
                managerName,
                managerMobile,
                leaderName,
                leaderMobile,
                musiciansCount: String(musiciansCount),
                vocalistCount: String(vocalistCount),
                instrumentalistCount: String(instrumentalistCount),
                transactionId: "ADMIN_REGISTRATION",
                instruments,
                screenshotUrl: "",
                screenshotFileId: "",
                userId: abheriUser.id,
                userEmail: abheriUser.email || "",
                registrationMethod: "superAdmin",
                paymentStatus: "admin",
                paymentAmount: 0,
                paymentRequired: false,
                registeredBy: userData?.email || "",
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            const batch = writeBatch(db);
            batch.set(registrationRef, registrationData);
            batch.update(doc(db, "users", abheriUser.id), {
                registeredEvents: arrayUnion("Abheri Battle of Bands"),
            });

            await batch.commit();

            setUsers((current) =>
                current.map((u) =>
                    u.id === abheriUser.id
                        ? {
                              ...u,
                              registeredEvents: Array.from(
                                  new Set([
                                      ...(u.registeredEvents || []),
                                      "Abheri Battle of Bands",
                                  ])
                              ),
                          }
                        : u
                )
            );

            toastSuccess(`${abheriUser.name || "User"} added to Abheri without payment.`);
            setAbheriUser(null);
        } catch (error) {
            console.error("Error adding Abheri registration:", error);
            toastError(
                "Failed to add Abheri registration. The user may already have an Abheri registration."
            );
        } finally {
            setAbheriRegistering(false);
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
                                                onClick={() => openAbheriModal(user)}
                                                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-colors text-sm font-medium"
                                                title="Add this user to Abheri without payment"
                                            >
                                                <FiMusic size={15} />
                                                Abheri
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

            {/* Super Admin: Manual Abheri Registration Modal */}
            {abheriUser && (
                <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
                    <div className="w-full max-w-2xl bg-[#0b0d14] border border-gray-800 rounded-2xl shadow-2xl p-6 my-8">
                        <div className="flex items-start justify-between gap-4 mb-6">
                            <div>
                                <h2 className="text-xl font-bold text-white">
                                    Add Abheri Registration
                                </h2>
                                <p className="text-sm text-gray-500 mt-1">
                                    {abheriUser.name || "Unnamed user"} • {abheriUser.email}
                                </p>
                                <p className="text-xs text-amber-400 mt-2">
                                    Super Admin manual registration — no payment or screenshot required.
                                </p>
                            </div>
                            <button
                                onClick={closeAbheriModal}
                                disabled={abheriRegistering}
                                className="p-2 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white disabled:opacity-50"
                            >
                                <FiX size={20} />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[
                                ["bandName", "Band Name", "text"],
                                ["managerName", "Manager Name", "text"],
                                ["managerMobile", "Manager Mobile", "tel"],
                                ["leaderName", "Leader Name", "text"],
                                ["leaderMobile", "Leader Mobile", "tel"],
                                ["musiciansCount", "Total Musicians (5–10)", "number"],
                                ["vocalistCount", "Vocalists (minimum 2)", "number"],
                                ["instrumentalistCount", "Instrumentalists (minimum 3)", "number"],
                            ].map(([name, label, type]) => (
                                <label key={name} className="block">
                                    <span className="block text-sm font-medium text-gray-300 mb-2">
                                        {label}
                                    </span>
                                    <input
                                        type={type}
                                        value={abheriForm[name as keyof typeof abheriForm]}
                                        onChange={(e) =>
                                            setAbheriForm((current) => ({
                                                ...current,
                                                [name]: e.target.value,
                                            }))
                                        }
                                        className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500"
                                    />
                                </label>
                            ))}

                            <label className="block md:col-span-2">
                                <span className="block text-sm font-medium text-gray-300 mb-2">
                                    Instruments
                                </span>
                                <input
                                    type="text"
                                    value={abheriForm.instruments}
                                    onChange={(e) =>
                                        setAbheriForm((current) => ({
                                            ...current,
                                            instruments: e.target.value,
                                        }))
                                    }
                                    placeholder="Keyboard, Guitar, Drums..."
                                    className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500"
                                />
                                <span className="text-xs text-gray-600 mt-1 block">
                                    Separate multiple instruments with commas.
                                </span>
                            </label>
                        </div>

                        <div className="mt-5 rounded-xl bg-amber-500/5 border border-amber-500/20 p-4 text-sm text-gray-400">
                            <p>
                                College is taken from the selected user's profile:{" "}
                                <span className="text-gray-200">{abheriUser.college || "Not provided"}</span>
                            </p>
                            <p className="mt-2">
                                Payment status will be recorded as{" "}
                                <span className="text-amber-300">Admin / No Payment</span>.
                            </p>
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={closeAbheriModal}
                                disabled={abheriRegistering}
                                className="px-4 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={registerUserForAbheri}
                                disabled={abheriRegistering}
                                className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <FiMusic />
                                {abheriRegistering ? "Adding..." : "Add Abheri Registration"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Register User Modal */}
            {registeringUser && (
                <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="w-full max-w-4xl max-h-[92vh] overflow-y-auto bg-[#0b0d14] border border-gray-800 rounded-2xl shadow-2xl p-6">
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
                            Select Event
                        </label>

                        <select
                            value={selectedEventId}
                            onChange={(e) => handleManualEventChange(e.target.value)}
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
                                        ? ` — ${String(event.registrationFee).trim().startsWith("₹") ? event.registrationFee : `₹ ${event.registrationFee}`}`
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
                                No registrable events found.
                            </p>
                        )}

                        {selectedManualEvent && (
                            <div className="mt-6 space-y-6">
                                <section className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
                                    <h3 className="font-semibold text-white mb-4">Participant / Leader Details</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <label className="block">
                                            <span className="block text-sm text-gray-400 mb-2">Phone Number *</span>
                                            <input value={manualForm.leaderMobile} onChange={(e) => setManualForm((c) => ({ ...c, leaderMobile: e.target.value }))} className="w-full bg-gray-950 border border-gray-700 rounded-xl px-4 py-3 text-sm" />
                                        </label>
                                        {selectedManualEvent.department !== "Football" && (
                                            <>
                                                <label className="block">
                                                    <span className="block text-sm text-gray-400 mb-2">Department / Class *</span>
                                                    <input value={manualForm.leaderDepartment} onChange={(e) => setManualForm((c) => ({ ...c, leaderDepartment: e.target.value }))} className="w-full bg-gray-950 border border-gray-700 rounded-xl px-4 py-3 text-sm" />
                                                </label>
                                                {selectedManualEvent.showMemberYear !== false && (
                                                    <label className="block">
                                                        <span className="block text-sm text-gray-400 mb-2">Year *</span>
                                                        <input value={manualForm.leaderYear} onChange={(e) => setManualForm((c) => ({ ...c, leaderYear: e.target.value }))} className="w-full bg-gray-950 border border-gray-700 rounded-xl px-4 py-3 text-sm" />
                                                    </label>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </section>

                                {selectedManualEvent.eveType === "team" && (
                                    <section className="rounded-xl border border-gray-800 bg-gray-900/50 p-4 space-y-4">
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <h3 className="font-semibold text-white">Team Members</h3>
                                                <p className="text-xs text-gray-500 mt-1">Current team size: {1 + manualForm.teamMembers.length} / {selectedManualEvent.department === "Football" ? "Unlimited" : `${manualMinMembers}-${manualMaxMembers}`}</p>
                                            </div>
                                            <button type="button" onClick={addManualMember} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-medium"><FiPlus /> Add Member</button>
                                        </div>
                                        {manualForm.teamMembers.map((member, index) => (
                                            <div key={index} className="rounded-xl border border-gray-800 bg-gray-950/60 p-4 space-y-4 relative">
                                                <button type="button" onClick={() => removeManualMember(index)} className="absolute right-3 top-3 text-gray-500 hover:text-red-400"><FiTrash2 /></button>
                                                <h4 className="font-medium text-indigo-300">Member {index + 2}</h4>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-6">
                                                    <label className="block"><span className="block text-sm text-gray-400 mb-2">Name *</span><input value={member.name || ""} onChange={(e) => setManualForm((c) => ({ ...c, teamMembers: c.teamMembers.map((m, i) => i === index ? { ...m, name: e.target.value } : m) }))} className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-sm" /></label>
                                                    {manualMemberFields.map((field) => (
                                                        <label key={field.name} className="block"><span className="block text-sm text-gray-400 mb-2">{field.name} {field.required && "*"}</span><input type={inputType(field.type)} value={member[field.name] || ""} onChange={(e) => setManualForm((c) => ({ ...c, teamMembers: c.teamMembers.map((m, i) => i === index ? { ...m, [field.name]: e.target.value } : m) }))} className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-sm" /></label>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </section>
                                )}

                                {selectedManualEvent.extraFields && selectedManualEvent.extraFields.length > 0 && (
                                    <section className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
                                        <h3 className="font-semibold text-white mb-4">Additional Event Details</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {selectedManualEvent.extraFields.map((field) => (
                                                <label key={field.name} className="block"><span className="block text-sm text-gray-400 mb-2">{field.name} {field.required && "*"}</span><input type={inputType(field.type)} value={manualForm.extraData[field.name] || ""} onChange={(e) => setManualForm((c) => ({ ...c, extraData: { ...c.extraData, [field.name]: e.target.value } }))} className="w-full bg-gray-950 border border-gray-700 rounded-xl px-4 py-3 text-sm" /></label>
                                            ))}
                                        </div>
                                    </section>
                                )}
                            </div>
                        )}

                        {selectedEventId && (
                            <div className="rounded-xl bg-indigo-500/5 border border-indigo-500/20 p-4 mt-5 text-sm text-gray-400">
                                <p>
                                    This event will be added to the user's registered events and a registration record will be created in Firestore.
                                </p>
                                <p className="text-amber-400 mt-2">
                                    This is a Super Admin manual registration. Public registration status, closing date, and payment are bypassed. No payment will be requested from the user.
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
