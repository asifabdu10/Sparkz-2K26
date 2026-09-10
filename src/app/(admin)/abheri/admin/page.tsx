"use client";

import { useAuth } from "@/context/AuthContext";
import { db } from "@/utils/firebase";
import {
    collection,
    getDocs,
    doc,
    writeBatch,
    arrayRemove,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import {
    FiDownload,
    FiLogOut,
    FiExternalLink,
    FiTrash2,
} from "react-icons/fi";
import { useRouter } from "next/navigation";
import {
    toastError,
    toastSuccess,
} from "@/utils/common/Toast";

interface AbheriRegistration {
    id: string;

    userId?: string;
    userEmail?: string;

    bandName: string;
    collegeName: string;

    managerName: string;
    managerMobile: string;

    leaderName: string;
    leaderMobile: string;

    musiciansCount: number;

    vocalistCount?: number;
    instrumentalistCount?: number;

    transactionId: string;

    screenshotUrl: string;
    screenshotFileId?: string;

    instruments: string[];
}

export default function AbheriAdminPage() {
    const {
        userData,
        loading,
        logout,
    } = useAuth();

    const router = useRouter();

    const [
        registrations,
        setRegistrations,
    ] = useState<AbheriRegistration[]>([]);

    const [
        fetchLoading,
        setFetchLoading,
    ] = useState(true);

    const [
        deletingId,
        setDeletingId,
    ] = useState<string | null>(null);

    /*
     * IMPORTANT:
     *
     * Your Firestore rules recognize this email
     * as a Super Admin.
     *
     * Therefore the UI must also recognize it
     * as a Super Admin.
     */
    const isSuperAdmin =
        userData?.role === "superAdmin" ||
        user?.email?.toLowerCase() === "joeljoy1237@gmail.com";

    useEffect(() => {
        if (loading) {
            return;
        }

        /*
         * Allow:
         * - Abheri Admin
         * - Super Admin
         */
        if (
            !userData ||
            (
                userData.role !== "abheriAdmin" &&
                !isSuperAdmin
            )
        ) {
            router.push("/");
            return;
        }

        fetchRegistrations();
    }, [
        userData,
        loading,
        router,
        isSuperAdmin,
    ]);

    /*
     * Fetch all Abheri registrations
     */
    const fetchRegistrations = async () => {
        try {
            setFetchLoading(true);

            const querySnapshot =
                await getDocs(
                    collection(
                        db,
                        "abheri_registrations"
                    )
                );

            const list =
                querySnapshot.docs.map(
                    (registrationDoc) => ({
                        id: registrationDoc.id,
                        ...registrationDoc.data(),
                    })
                ) as AbheriRegistration[];

            setRegistrations(list);
        } catch (error) {
            console.error(
                "Error fetching Abheri registrations:",
                error
            );

            toastError(
                "Failed to load Abheri registrations."
            );
        } finally {
            setFetchLoading(false);
        }
    };

    /*
     * Super Admin only:
     *
     * Deregister a user/band from Abheri.
     *
     * This does TWO things:
     *
     * 1. Deletes:
     *    abheri_registrations/{registrationId}
     *
     * 2. Removes:
     *    "Abheri Battle of Bands"
     *
     *    from:
     *    users/{userId}.registeredEvents
     */
    const deregisterUser = async (
        registration: AbheriRegistration
    ) => {
        /*
         * Extra security check on the UI
         */
        if (!isSuperAdmin) {
            toastError(
                "Only Super Admin can deregister users."
            );
            return;
        }

        /*
         * Get Firebase UID
         */
        const userId = String(
            registration.userId || ""
        ).trim();

        if (!userId) {
            toastError(
                "User ID not found for this registration."
            );
            return;
        }

        /*
         * Confirmation
         */
        const confirmed =
            window.confirm(
                `Are you sure you want to deregister "${registration.bandName}" from Abheri Battle of Bands?\n\n` +
                `This will delete the Abheri registration and remove Abheri from the user's registered events.\n\n` +
                `This action cannot be undone.`
            );

        if (!confirmed) {
            return;
        }

        try {
            setDeletingId(registration.id);

            /*
             * Use one Firestore batch so both
             * database changes are committed together.
             */
            const batch = writeBatch(db);

            /*
             * ------------------------------------------------
             * 1. DELETE ABHERI REGISTRATION
             * ------------------------------------------------
             */
            batch.delete(
                doc(
                    db,
                    "abheri_registrations",
                    registration.id
                )
            );

            /*
             * ------------------------------------------------
             * 2. REMOVE ABHERI FROM USER PROFILE
             * ------------------------------------------------
             */
            batch.update(
                doc(
                    db,
                    "users",
                    userId
                ),
                {
                    registeredEvents:
                        arrayRemove(
                            "Abheri Battle of Bands"
                        ),
                }
            );

            /*
             * Commit both changes
             */
            await batch.commit();

            /*
             * Remove the row immediately
             * from the admin page.
             */
            setRegistrations(
                (current) =>
                    current.filter(
                        (item) =>
                            item.id !==
                            registration.id
                    )
            );

            toastSuccess(
                `${registration.bandName} has been deregistered successfully.`
            );
        } catch (error) {
            console.error(
                "Error deregistering Abheri user:",
                error
            );

            toastError(
                "Failed to deregister user. Please check the console."
            );
        } finally {
            setDeletingId(null);
        }
    };

    /*
     * Export registrations to Excel
     */
    const exportToExcel = () => {
        const data =
            registrations.map((r) => ({
                "Band Name":
                    r.bandName,

                "College":
                    r.collegeName,

                "Manager":
                    r.managerName,

                "Manager Phone":
                    r.managerMobile,

                "Leader":
                    r.leaderName,

                "Leader Phone":
                    r.leaderMobile,

                "Members":
                    r.musiciansCount,

                "Vocalists":
                    r.vocalistCount ??
                    "",

                "Instrumentalists":
                    r.instrumentalistCount ??
                    "",

                "Transaction ID":
                    r.transactionId,

                "Instruments":
                    r.instruments?.join(
                        ", "
                    ),

                "Screenshot Link":
                    r.screenshotUrl,

                "User Email":
                    r.userEmail ?? "",
            }));

        const wb =
            XLSX.utils.book_new();

        const ws =
            XLSX.utils.json_to_sheet(
                data
            );

        XLSX.utils.book_append_sheet(
            wb,
            ws,
            "Abheri Registrations"
        );

        XLSX.writeFile(
            wb,
            "Abheri_Registrations.xlsx"
        );
    };

    /*
     * Loading screen
     */
    if (
        loading ||
        fetchLoading
    ) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center">
                Loading...
            </div>
        );
    }

    if (!userData) {
        return null;
    }

    return (
        <div className="min-h-screen bg-[#04050b] text-white p-4 md:p-8">

            <div className="max-w-7xl mx-auto">

                {/* =========================================
                    HEADER
                ========================================= */}

                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">

                    <div>

                        <h1 className="text-3xl font-bold bg-linear-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                            Abheri Admin
                        </h1>

                        <p className="text-gray-400 mt-1">
                            Manage Battle of Bands Registrations
                        </p>

                        {isSuperAdmin && (
                            <p className="text-xs text-purple-400 mt-2">
                                Super Admin — Deregistration enabled
                            </p>
                        )}

                    </div>

                    <div className="flex flex-wrap gap-4">

                        {/* Export */}
                        <button
                            onClick={
                                exportToExcel
                            }
                            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 px-4 py-2 rounded-lg transition-colors font-medium shadow-lg shadow-emerald-500/20"
                        >
                            <FiDownload />

                            Export Excel
                        </button>

                        {/* Logout */}
                        <button
                            onClick={() =>
                                logout()
                            }
                            className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 px-4 py-2 rounded-lg transition-colors font-medium"
                        >
                            <FiLogOut />

                            Logout
                        </button>

                    </div>

                </div>

                {/* =========================================
                    REGISTRATION TABLE
                ========================================= */}

                <div className="bg-gray-900/50 border border-gray-800 rounded-2xl overflow-hidden backdrop-blur-sm">

                    <div className="overflow-x-auto">

                        <table className="w-full text-left border-collapse min-w-[1200px]">

                            <thead>

                                <tr className="bg-gray-800/50 text-gray-400 text-sm">

                                    <th className="p-4 font-semibold">
                                        Band Info
                                    </th>

                                    <th className="p-4 font-semibold">
                                        Contact
                                    </th>

                                    <th className="p-4 font-semibold">
                                        Details
                                    </th>

                                    <th className="p-4 font-semibold">
                                        Payment
                                    </th>

                                    {/* ONLY SUPER ADMIN */}
                                    {isSuperAdmin && (
                                        <th className="p-4 font-semibold text-center">
                                            Action
                                        </th>
                                    )}

                                </tr>

                            </thead>

                            <tbody className="divide-y divide-gray-800">

                                {registrations.map(
                                    (reg) => (

                                        <tr
                                            key={
                                                reg.id
                                            }
                                            className="hover:bg-gray-800/20 transition-colors group"
                                        >

                                            {/* =================================
                                                BAND INFO
                                            ================================= */}

                                            <td className="p-4 align-top">

                                                <div className="font-bold text-lg text-white">
                                                    {
                                                        reg.bandName
                                                    }
                                                </div>

                                                <div className="text-sm text-gray-400">
                                                    {
                                                        reg.collegeName
                                                    }
                                                </div>

                                                {reg.userEmail && (
                                                    <div className="text-xs text-gray-500 mt-2">
                                                        {
                                                            reg.userEmail
                                                        }
                                                    </div>
                                                )}

                                            </td>

                                            {/* =================================
                                                CONTACT
                                            ================================= */}

                                            <td className="p-4 align-top">

                                                <div className="text-sm">

                                                    <span className="text-gray-500">
                                                        Mgr:
                                                    </span>{" "}

                                                    {
                                                        reg.managerName
                                                    }

                                                    <br />

                                                    <span className="text-gray-500">
                                                        Ph:
                                                    </span>{" "}

                                                    {
                                                        reg.managerMobile
                                                    }

                                                </div>

                                                <div className="text-sm mt-2">

                                                    <span className="text-gray-500">
                                                        Ldr:
                                                    </span>{" "}

                                                    {
                                                        reg.leaderName
                                                    }

                                                    <br />

                                                    <span className="text-gray-500">
                                                        Ph:
                                                    </span>{" "}

                                                    {
                                                        reg.leaderMobile
                                                    }

                                                </div>

                                            </td>

                                            {/* =================================
                                                DETAILS
                                            ================================= */}

                                            <td className="p-4 align-top">

                                                <div className="text-sm">

                                                    <span className="px-2 py-0.5 rounded bg-gray-800 text-gray-300">
                                                        {
                                                            reg.musiciansCount
                                                        }{" "}
                                                        Members
                                                    </span>

                                                </div>

                                                {(
                                                    reg.vocalistCount !==
                                                    undefined ||
                                                    reg.instrumentalistCount !==
                                                    undefined
                                                ) && (

                                                        <div className="text-xs text-gray-500 mt-2">

                                                            {reg.vocalistCount !==
                                                                undefined && (
                                                                    <span>
                                                                        Vocalists:{" "}
                                                                        {
                                                                            reg.vocalistCount
                                                                        }
                                                                    </span>
                                                                )}

                                                            {reg.vocalistCount !==
                                                                undefined &&
                                                                reg.instrumentalistCount !==
                                                                undefined && (
                                                                    <span className="mx-1">
                                                                        •
                                                                    </span>
                                                                )}

                                                            {reg.instrumentalistCount !==
                                                                undefined && (
                                                                    <span>
                                                                        Instrumentalists:{" "}
                                                                        {
                                                                            reg.instrumentalistCount
                                                                        }
                                                                    </span>
                                                                )}

                                                        </div>

                                                    )}

                                                <div className="mt-2 flex flex-wrap gap-1">

                                                    {reg.instruments
                                                        ?.slice(
                                                            0,
                                                            3
                                                        )
                                                        .map(
                                                            (
                                                                inst,
                                                                i
                                                            ) => (

                                                                <span
                                                                    key={
                                                                        i
                                                                    }
                                                                    className="text-xs bg-purple-500/10 text-purple-300 px-1.5 py-0.5 rounded border border-purple-500/20"
                                                                >
                                                                    {
                                                                        inst
                                                                    }
                                                                </span>

                                                            )
                                                        )}

                                                    {reg.instruments
                                                        ?.length >
                                                        3 && (
                                                            <span className="text-xs text-gray-500">
                                                                +
                                                                {reg
                                                                    .instruments
                                                                    .length -
                                                                    3}
                                                            </span>
                                                        )}

                                                </div>

                                            </td>

                                            {/* =================================
                                                PAYMENT
                                            ================================= */}

                                            <td className="p-4 align-top">

                                                <div className="text-sm font-mono text-gray-300 mb-2">
                                                    {
                                                        reg.transactionId
                                                    }
                                                </div>

                                                {reg.screenshotUrl && (
                                                    <a
                                                        href={
                                                            reg.screenshotUrl
                                                        }
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 underline"
                                                    >
                                                        <FiExternalLink />

                                                        View Screenshot
                                                    </a>
                                                )}

                                            </td>

                                            {/* =================================
                                                DEREGISTER
                                                SUPER ADMIN ONLY
                                            ================================= */}

                                            {isSuperAdmin && (
                                                <td className="p-4 align-top text-center">

                                                    <button
                                                        onClick={() =>
                                                            deregisterUser(
                                                                reg
                                                            )
                                                        }
                                                        disabled={
                                                            deletingId ===
                                                            reg.id
                                                        }
                                                        className="inline-flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 hover:text-red-300 px-3 py-2 rounded-lg transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >

                                                        <FiTrash2 />

                                                        {deletingId ===
                                                            reg.id
                                                            ? "Removing..."
                                                            : "Deregister"}

                                                    </button>

                                                </td>
                                            )}

                                        </tr>

                                    )
                                )}

                                {/* =================================
                                    EMPTY STATE
                                ================================= */}

                                {registrations.length ===
                                    0 && (
                                        <tr>

                                            <td
                                                colSpan={
                                                    isSuperAdmin
                                                        ? 5
                                                        : 4
                                                }
                                                className="p-12 text-center text-gray-500"
                                            >
                                                No registrations found.
                                            </td>

                                        </tr>
                                    )}

                            </tbody>

                        </table>

                    </div>

                </div>

                {/* =========================================
                    SUPER ADMIN INFORMATION
                ========================================= */}

                {isSuperAdmin && (
                    <div className="mt-6 bg-purple-500/5 border border-purple-500/10 rounded-xl p-4 text-sm text-gray-400">

                        <div className="font-medium text-purple-300 mb-1">
                            Super Admin Controls
                        </div>

                        <p>
                            You can deregister a band using
                            the{" "}
                            <span className="text-red-400">
                                Deregister
                            </span>{" "}
                            button. This deletes the
                            Abheri registration from
                            Firestore and removes{" "}
                            <span className="text-white">
                                Abheri Battle of Bands
                            </span>{" "}
                            from the user's registered
                            events.
                        </p>

                    </div>
                )}

            </div>

        </div>
    );
}