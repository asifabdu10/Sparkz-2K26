"use client";

import { useAuth } from "@/context/AuthContext";
import { db } from "@/utils/firebase";
import { collection, getDocs, doc, setDoc, deleteDoc, query, where, updateDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { FiPlus, FiTrash2, FiEdit2, FiSave, FiX, FiUploadCloud, FiPower } from "react-icons/fi";
import { toastError, toastSuccess } from "@/utils/common/Toast";
import { departments } from "@/utils/constants/Constants";
import { Event } from "@/utils/types/event";
import { compressImage } from "@/utils/imageUtils";
import Image from "next/image";


export default function EventsManagement() {
    const { userData } = useAuth();
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);

    // Form State
    const initialFormState: Partial<Event> = {
        title: "",
        description: "",
        department: "CSE",
        type: "technical",
        date: "",
        regFinalDate: "",
        registrationFee: "",
        isFree: false,
        registrationOpen: true,
        showMemberYear: true,
        firstPrize: "",
        memberMaxCount: 1,
        memberMinCount: 1,
        coordinators: [{ name: "", phone: "" }],
        imageUrl: "",
        bgImageUrl: "",
        regLink: "",
        upi: [],
        gpay: "",
        maxParticipation: "",
        minParticipation: "",
        totalParticipation: "",
        eveType: "ind",
        secondPrize: "",
        thirdPrize: "",
        rules: [],
        venue: "",
        isOnline: false,
    };
    const [formData, setFormData] = useState<Partial<Event>>(initialFormState);
    const [posterFile, setPosterFile] = useState<File | null>(null);
    const [bgFile, setBgFile] = useState<File | null>(null);
    const [posterPreview, setPosterPreview] = useState<string>("");
    const [bgPreview, setBgPreview] = useState<string>("");
    const [regCloseTime, setRegCloseTime] = useState<{ hours: number; minutes: number }>({ hours: 23, minutes: 59 });

    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        if (userData) fetchEvents();
    }, [userData]);

    // Helper for array inputs
    const handleArrayInput = (field: keyof Event, value: string, index: number) => {
        /* eslint-disable @typescript-eslint/no-explicit-any */
        const currentArray = (formData[field] as string[]) || [];
        const newArray = [...currentArray];
        newArray[index] = value;
        setFormData({ ...formData, [field]: newArray });
    };

    const addArrayItem = (field: keyof Event) => {
        /* eslint-disable @typescript-eslint/no-explicit-any */
        const currentArray = (formData[field] as string[]) || [];
        setFormData({ ...formData, [field]: [...currentArray, ""] });
    };

    const removeArrayItem = (field: keyof Event, index: number) => {
        /* eslint-disable @typescript-eslint/no-explicit-any */
        const currentArray = (formData[field] as string[]) || [];
        setFormData({ ...formData, [field]: currentArray.filter((_, i) => i !== index) });
    };

    // Coordinators Helper
    const addCoordinator = () => {
        const current = formData.coordinators || [];
        setFormData({ ...formData, coordinators: [...current, { name: "", phone: "" }] });
    };

    const removeCoordinator = (index: number) => {
        const current = formData.coordinators || [];
        setFormData({ ...formData, coordinators: current.filter((_, i) => i !== index) });
    };

    const updateCoordinator = (index: number, field: 'name' | 'phone', value: string) => {
        const current = [...(formData.coordinators || [])];
        if (!current[index]) current[index] = { name: "", phone: "" };
        current[index][field] = value;
        setFormData({ ...formData, coordinators: current });
    };

    const canManageCustomFields = userData?.role === 'superAdmin';
    const canManageMemberYear = userData?.role === 'superAdmin' || userData?.role === 'admin';

    // Extra Fields Helper
    const addExtraField = () => {
        const current = formData.extraFields || [];
        setFormData({ ...formData, extraFields: [...current, { name: "", type: "text", required: true }] });
    };

    const removeExtraField = (index: number) => {
        const current = formData.extraFields || [];
        setFormData({ ...formData, extraFields: current.filter((_, i) => i !== index) });
    };

    const updateExtraField = (index: number, field: 'name' | 'type', value: string) => {
        const current = [...(formData.extraFields || [])];
        if (!current[index]) current[index] = { name: "", type: "text", required: true };
        current[index] = { ...current[index], [field]: value };
        setFormData({ ...formData, extraFields: current });
    };

    // Team-member-specific registration fields. These are controlled by Super Admin.
    const addTeamMemberField = () => {
        const current = formData.teamMemberFields || [];
        setFormData({ ...formData, teamMemberFields: [...current, { name: "", type: "text", required: true }] });
    };

    const removeTeamMemberField = (index: number) => {
        const current = formData.teamMemberFields || [];
        setFormData({ ...formData, teamMemberFields: current.filter((_, i) => i !== index) });
    };

    const updateTeamMemberField = (index: number, field: 'name' | 'type' | 'required', value: string | boolean) => {
        const current = [...(formData.teamMemberFields || [])];
        if (!current[index]) current[index] = { name: "", type: "text", required: true };
        current[index] = { ...current[index], [field]: value };
        setFormData({ ...formData, teamMemberFields: current });
    };


    const fetchEvents = async () => {
        try {
            setLoading(true);
            let q;
            if (userData?.role === 'superAdmin') {
                q = query(collection(db, "events"));
            } else if (userData?.role === 'admin' && userData?.department) {
                // Filter by department for regular admins
                // Note: This relies on manual entry matching the department string exactly.
                q = query(collection(db, "events"), where("department", "==", userData.department));
            } else {
                setEvents([]);
                setLoading(false);
                return;
            }

            const querySnapshot = await getDocs(q);

            /* eslint-disable @typescript-eslint/no-explicit-any */
            const eventsList = querySnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    // Map legacy 'image' to 'imageUrl' if needed
                    imageUrl: data.imageUrl || data.image || "",
                    bgImageUrl: data.bgImageUrl || data.bgImage || "",
                };
            }) as Event[];

            setEvents(eventsList);
        } catch (error) {
            console.error("Error fetching events:", error);
            toastError("Failed to fetch events");
        } finally {
            setLoading(false);
        }
    };



    const toggleEventRegistration = async (event: Event) => {
        const nextOpen = event.registrationOpen === false;
        try {
            await updateDoc(doc(db, "events", event.id), {
                registrationOpen: nextOpen,
            });
            setEvents(prev => prev.map(e => e.id === event.id ? { ...e, registrationOpen: nextOpen } : e));
            toastSuccess(nextOpen ? `${event.title}: Registration opened` : `${event.title}: Registration closed`);
        } catch (error) {
            console.error("Registration toggle failed:", error);
            toastError("Failed to change registration status");
        }
    };

    const toggleAllRegistrations = async () => {
        if (events.length === 0) return;
        const shouldOpen = !events.every(e => e.registrationOpen !== false);
        try {
            await Promise.all(
                events.map(event =>
                    updateDoc(doc(db, "events", event.id), {
                        registrationOpen: shouldOpen,
                    })
                )
            );
            setEvents(prev => prev.map(e => ({ ...e, registrationOpen: shouldOpen })));
            toastSuccess(shouldOpen ? "Registration opened for all events" : "Registration closed for all events");
        } catch (error) {
            console.error("All registration toggle failed:", error);
            toastError("Failed to update all event registrations");
        }
    };


    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this event? This action cannot be undone.")) return;
        try {
            await deleteDoc(doc(db, "events", id));
            toastSuccess("Event deleted");
            setEvents(events.filter(e => e.id !== id));
        } catch (error) {
            console.error(error);
            toastError("Failed to delete event");
        }
    };

    const startEdit = (event?: Event) => {
        if (event) {
            setFormData({
                ...event,
                registrationOpen: event.registrationOpen !== false,
                isFree: event.isFree === true || Number(String(event.registrationFee || "0").replace(/[^0-9.]/g, "")) === 0,
            });
        } else {
            // Default to admin's department if not superAdmin
            const defaultDept = userData?.role !== 'superAdmin' && userData?.department
                ? userData.department
                : "CSE";

            setFormData({
                ...initialFormState,
                department: defaultDept
            });
        }
        setPosterFile(null);
        setBgFile(null);
        setPosterPreview(event?.imageUrl || "");
        setBgPreview(event?.bgImageUrl || "");

        if (event?.RegCloseTime) {
            setRegCloseTime(event.RegCloseTime);
        } else {
            setRegCloseTime({ hours: 23, minutes: 59 });
        }

        setIsEditing(true);
    };

    const handleImageUpload = async (
        file: File,
        eventId: string
    ) => {
        try {
            const compressedFile = await compressImage(file);

            const formData = new FormData();
            formData.append("file", compressedFile);
            formData.append("eventId", eventId);

            const response = await fetch("/api/google-drive/upload-event", {
                method: "POST",
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to upload image");
            }

            return {
                url: data.url,
                fileId: data.fileId,
            };
        } catch (error) {
            console.error("Google Drive upload failed:", error);
            throw error;
        }
    };


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();


        // Strict Validation
        if (!formData.title?.trim()) return toastError("Title is required");
        if (!formData.description?.trim()) return toastError("Description is required");
        if (!formData.date) return toastError("Event Date is required");
        if (!formData.regFinalDate) return toastError("Registration Closing Date is required");
        if (!formData.isFree && !formData.registrationFee) return toastError("Registration Fee is required");

        if (!formData.coordinators || formData.coordinators.length === 0 || !formData.coordinators[0].name || !formData.coordinators[0].phone) {
            return toastError("At least one Coordinator is required");
        }
        // if (!formData.upi || formData.upi.length === 0 || !formData.upi[0]) {
        //      return toastError("At least one UPI ID is required");
        // }

        if (!formData.id && !posterFile) {
            toastError("Event Poster is required for new events.");
            return;
        }

        setUploading(true);


        try {
            let imageUrl = formData.imageUrl;
            let bgImageUrl = formData.bgImageUrl;

            // Generate ID if new
            /* eslint-disable @typescript-eslint/no-explicit-any */
            const eventId = (formData as any).id || formData.title?.toLowerCase().replace(/\s+/g, '-') || 'new-event';

            if (posterFile) {
                const uploadedPoster = await handleImageUpload(
                    posterFile,
                    eventId
                );

                imageUrl = uploadedPoster.url;
            }

            if (bgFile) {
                const uploadedBackground = await handleImageUpload(
                    bgFile,
                    eventId
                );

                bgImageUrl = uploadedBackground.url;
            }


            // Enforce department for non-superAdmins
            let finalDepartment = formData.department;
            if (userData && userData.role !== 'superAdmin' && userData.department) {
                finalDepartment = userData.department;
            }

            const eventData = {
                ...formData,
                department: finalDepartment,
                RegCloseTime: regCloseTime,
                id: eventId,
                imageUrl,
                bgImageUrl,
                isFree: Boolean(formData.isFree),
                registrationOpen: formData.registrationOpen !== false,
                // Legacy events default to collecting Year unless explicitly turned off.
                showMemberYear: formData.showMemberYear !== false,
                registrationFee: formData.isFree ? "0" : formData.registrationFee,
                // Ensure numbers are numbers
                memberMaxCount: Number(formData.memberMaxCount),
                memberMinCount: Number(formData.memberMinCount),
                // Ensure arrays are cleaned
                upi: formData.upi?.filter(u => u) || [],
                rules: formData.rules?.filter(r => r) || [],
                coordinators: formData.coordinators?.filter(c => c.name) || [],
                extraFields: formData.extraFields?.filter(ef => ef.name?.trim()) || [],
                teamMemberFields: formData.teamMemberFields?.filter(ef => ef.name?.trim()) || [],
            };

            await setDoc(doc(db, "events", eventId), eventData);

            toastSuccess(formData.id ? "Event updated" : "Event created");
            setIsEditing(false);
            fetchEvents();
        } catch (error) {
            console.error("Error saving event:", error);
            toastError("Failed to save event");
        } finally {
            setUploading(false);
        }
    };

    if (!userData) return null;

    return (
        <div className="text-white max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold bg-linear-to-r from-indigo-400 to-fuchsia-400 bg-clip-text text-transparent">Event Management</h1>
                    <p className="text-gray-400 text-sm mt-1">Manage and organize all college events</p>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                    <button
                        onClick={toggleAllRegistrations}
                        disabled={events.length === 0}
                        className={`w-full md:w-auto px-5 py-2.5 rounded-xl flex justify-center items-center gap-2 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${events.length > 0 && events.every(e => e.registrationOpen !== false) ? "bg-red-600/20 text-red-300 border border-red-500/30 hover:bg-red-600/30" : "bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-600/30"}`}
                    >
                        <FiPower size={18} />
                        {events.length > 0 && events.every(e => e.registrationOpen !== false) ? "Close All Registrations" : "Open All Registrations"}
                    </button>
                    <button
                        onClick={() => startEdit()}
                        className="w-full md:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl flex justify-center items-center gap-2 font-medium transition-colors shadow-lg shadow-indigo-500/20"
                    >
                        <FiPlus size={20} /> Create New Event
                    </button>
                </div>
            </div>

            {isEditing ? (
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 md:p-8">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-semibold">{formData.id ? 'Edit Event' : 'Create Event'}</h2>
                        <button onClick={() => setIsEditing(false)} className="p-2 hover:bg-gray-800 rounded-full">
                            <FiX size={24} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-8">
                        {/* Section 1: Basic Info & Media */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-indigo-400 border-b border-gray-800 pb-2">Basic Info</h3>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Title <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        className="w-full bg-black/50 border border-gray-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Description <span className="text-red-500">*</span></label>
                                    <textarea
                                        rows={5}
                                        required
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        className="w-full bg-black/50 border border-gray-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Department</label>
                                        <select
                                            value={formData.department}
                                            onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                            className="w-full bg-black/50 border border-gray-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                                            disabled={userData.role !== 'superAdmin'}
                                        >
                                            {userData?.department ? <option key={userData?.department} value={userData?.department}>{userData?.department}</option> : departments.map(d => <option key={d} value={d}>{d}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Category</label>
                                        <select
                                            /* eslint-disable @typescript-eslint/no-explicit-any */
                                            value={formData.type}
                                            onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                                            className="w-full bg-black/50 border border-gray-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                                        >
                                            <option value="technical">Technical</option>
                                            <option value="nonTechnical">Non-Technical</option>
                                            <option value="sports">Sports</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-indigo-400 border-b border-gray-800 pb-2">Media & Details</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="border border-dashed border-gray-700 rounded-lg p-6 text-center hover:bg-gray-800/50 transition-colors cursor-pointer relative flex flex-col items-center justify-center overflow-hidden h-64">
                                        <input
                                            type="file"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    setPosterFile(file);
                                                    setPosterPreview(URL.createObjectURL(file));
                                                }
                                            }}
                                            className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                            accept="image/*"
                                        />
                                        {posterPreview ? (
                                            <div className="relative w-full h-full">
                                                <Image src={posterPreview} alt="Poster Preview" fill className="object-contain" />
                                            </div>
                                        ) : (
                                            <>
                                                <FiUploadCloud className="text-gray-400 mb-2" size={32} />
                                                <span className="text-xs text-gray-400 font-medium">Upload Poster (Required)</span>
                                            </>
                                        )}
                                    </div>
                                    <div className="border border-dashed border-gray-700 rounded-lg p-6 text-center hover:bg-gray-800/50 transition-colors cursor-pointer relative flex flex-col items-center justify-center overflow-hidden h-64">
                                        <input
                                            type="file"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    setBgFile(file);
                                                    setBgPreview(URL.createObjectURL(file));
                                                }
                                            }}
                                            className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                            accept="image/*"
                                        />
                                        {bgPreview ? (
                                            <div className="relative w-full h-full">
                                                <Image src={bgPreview} alt="Bg Preview" fill className="object-cover opacity-50" />
                                                <span className="absolute inset-0 flex items-center justify-center text-xs font-medium z-20">Click to Change</span>
                                            </div>
                                        ) : (
                                            <>
                                                <FiUploadCloud className="text-gray-400 mb-2" size={32} />
                                                <span className="text-xs text-gray-400 font-medium">{bgFile ? bgFile.name : "Upload Background"}</span>
                                            </>
                                        )}

                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Event Type</label>
                                        <select
                                            value={formData.eveType || 'ind'}
                                            onChange={(e) => setFormData({ ...formData, eveType: e.target.value as any })}
                                            className="w-full bg-black/50 border border-gray-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                                        >
                                            <option value="ind">Individual</option>
                                            <option value="team">Team</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Venue</label>
                                        <input
                                            type="text"
                                            value={formData.venue || ''}
                                            onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                                            className="w-full bg-black/50 border border-gray-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                                        />
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 pt-2">
                                    <input
                                        type="checkbox"
                                        id="isOnline"
                                        checked={formData.isOnline || false}
                                        onChange={(e) => setFormData({ ...formData, isOnline: e.target.checked })}
                                        className="w-4 h-4 rounded border-gray-700 bg-black/50 text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <label htmlFor="isOnline" className="text-sm text-gray-400 select-none cursor-pointer">This is an Online Event</label>
                                </div>
                            </div>
                        </div>

                        {/* Section 2: Registration & Limits */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-indigo-400 border-b border-gray-800 pb-2">Registration</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>

                                        <label className="block text-sm text-gray-400 mb-1">Event Date</label>
                                        <input
                                            type="date"
                                            required
                                            value={formData.date ? formData.date.split('-').reverse().join('-') : ''}
                                            onChange={(e) => {
                                                // Convert YYYY-MM-DD to DD-MM-YYYY
                                                const val = e.target.value;
                                                if (val) {
                                                    setFormData({ ...formData, date: val.split('-').reverse().join('-') });
                                                } else {
                                                    setFormData({ ...formData, date: '' });
                                                }
                                            }}
                                            className="w-full bg-black/50 border border-gray-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none date-picker-invert"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Reg Ends On <span className="text-red-500">*</span></label>
                                        <input
                                            type="date"
                                            required
                                            value={formData.regFinalDate ? formData.regFinalDate.split('-').reverse().join('-') : ''}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                if (val) {
                                                    setFormData({ ...formData, regFinalDate: val.split('-').reverse().join('-') });
                                                } else {
                                                    setFormData({ ...formData, regFinalDate: '' });
                                                }
                                            }}
                                            className="w-full bg-black/50 border border-gray-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none date-picker-invert"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-sm text-gray-400 mb-1">Reg Ends Time <span className="text-red-500">*</span></label>
                                        <div className="flex items-center gap-2 bg-black/50 border border-gray-700 rounded-lg px-4 py-2 w-full sm:w-1/2">
                                            <input
                                                type="number" min="0" max="23"
                                                value={isNaN(regCloseTime.hours) ? '' : regCloseTime.hours}
                                                onChange={e => setRegCloseTime({ ...regCloseTime, hours: Number(e.target.value) })}
                                                className="w-full bg-transparent text-center outline-none text-lg font-mono"
                                                placeholder="HH"
                                            />
                                            <span className="text-gray-500">:</span>
                                            <input
                                                type="number" min="0" max="59"
                                                value={isNaN(regCloseTime.minutes) ? '' : regCloseTime.minutes}
                                                onChange={e => setRegCloseTime({ ...regCloseTime, minutes: Number(e.target.value) })}
                                                className="w-full bg-transparent text-center outline-none text-lg font-mono"
                                                placeholder="MM"
                                            />
                                        </div>
                                    </div>

                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">External Reg Link (Optional)</label>
                                    <input
                                        type="text"
                                        value={formData.regLink || ''}
                                        onChange={(e) => setFormData({ ...formData, regLink: e.target.value })}
                                        className="w-full bg-black/50 border border-gray-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-indigo-400 border-b border-gray-800 pb-2">Participation Limits</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Min Members</label>
                                        <input
                                            type="number"
                                            value={!isNaN(Number(formData.memberMinCount)) ? formData.memberMinCount : ''}
                                            onChange={(e) => setFormData({ ...formData, memberMinCount: parseInt(e.target.value) })}
                                            className="w-full bg-black/50 border border-gray-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Max Members</label>
                                        <input
                                            type="number"
                                            value={!isNaN(Number(formData.memberMaxCount)) ? formData.memberMaxCount : ''}
                                            onChange={(e) => setFormData({ ...formData, memberMaxCount: parseInt(e.target.value) })}
                                            className="w-full bg-black/50 border border-gray-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Max Part. (Text)</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. 30 Teams"
                                            value={formData.maxParticipation || ''}
                                            onChange={(e) => setFormData({ ...formData, maxParticipation: e.target.value })}
                                            className="w-full bg-black/50 border border-gray-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Min Part. (Text)</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. 10 Teams"
                                            value={formData.minParticipation || ''}
                                            onChange={(e) => setFormData({ ...formData, minParticipation: e.target.value })}
                                            className="w-full bg-black/50 border border-gray-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Section 3: Financials & Rules */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-indigo-400 border-b border-gray-800 pb-2">Financials</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <label className="flex items-center gap-3 rounded-lg border border-gray-700 bg-black/30 px-4 py-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={Boolean(formData.isFree)}
                                            onChange={(e) => setFormData({ ...formData, isFree: e.target.checked, registrationFee: e.target.checked ? "0" : (formData.registrationFee === "0" ? "" : formData.registrationFee) })}
                                            className="h-4 w-4 accent-indigo-500"
                                        />
                                        <span className="text-sm text-gray-200">Free Event (no payment)</span>
                                    </label>
                                    <label className="flex items-center gap-3 rounded-lg border border-gray-700 bg-black/30 px-4 py-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.registrationOpen !== false}
                                            onChange={(e) => setFormData({ ...formData, registrationOpen: e.target.checked })}
                                            className="h-4 w-4 accent-emerald-500"
                                        />
                                        <span className="text-sm text-gray-200">Registration Open</span>
                                    </label>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Fee <span className="text-red-500">*</span></label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.isFree ? "0" : (formData.registrationFee || "")}
                                            disabled={Boolean(formData.isFree)}
                                            onChange={(e) => setFormData({ ...formData, registrationFee: e.target.value })}
                                            className="w-full bg-black/50 border border-gray-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Google Pay ID</label>
                                        <input
                                            type="text"
                                            value={formData.gpay || ''}
                                            onChange={(e) => setFormData({ ...formData, gpay: e.target.value })}
                                            className="w-full bg-black/50 border border-gray-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-sm text-gray-400 mb-1 flex justify-between items-center">
                                        <span>UPI IDs (Optional)</span>
                                        <button type="button" onClick={() => addArrayItem('upi')} className="text-xs px-2 py-1 bg-indigo-500/10 text-indigo-400 rounded hover:bg-indigo-500/20 transition-colors">+ Add UPI</button>
                                    </label>
                                    <div className="space-y-2 mt-2">
                                        {formData.upi?.map((u, idx) => (
                                            <div key={idx} className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={u}
                                                    onChange={(e) => handleArrayInput('upi', e.target.value, idx)}
                                                    placeholder="UPI ID"
                                                    className="w-full bg-black/50 border border-gray-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                                                />
                                                <button type="button" onClick={() => removeArrayItem('upi', idx)} className="text-red-400 hover:text-red-300 p-2"><FiTrash2 /></button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-2 mt-4">
                                    <label className="block text-sm text-gray-400 mb-1">Prizes (Optional)</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        <input
                                            type="text"
                                            placeholder="1st Prize"
                                            value={formData.firstPrize}
                                            onChange={(e) => setFormData({ ...formData, firstPrize: e.target.value })}
                                            className="w-full bg-black/50 border border-gray-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                                        />
                                        <input
                                            type="text"
                                            placeholder="2nd Prize"
                                            value={formData.secondPrize || ''}
                                            onChange={(e) => setFormData({ ...formData, secondPrize: e.target.value })}
                                            className="w-full bg-black/50 border border-gray-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                                        />
                                        <input
                                            type="text"
                                            placeholder="3rd Prize"
                                            value={formData.thirdPrize || ''}
                                            onChange={(e) => setFormData({ ...formData, thirdPrize: e.target.value })}
                                            className="w-full bg-black/50 border border-gray-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-indigo-400 border-b border-gray-800 pb-2">Rules & Guidelines</h3>
                                <div>
                                    <label className="text-sm text-gray-400 mb-1 flex justify-between items-center">
                                        <span>Rules List</span>
                                        <button type="button" onClick={() => addArrayItem('rules')} className="text-xs px-2 py-1 bg-indigo-500/10 text-indigo-400 rounded hover:bg-indigo-500/20 transition-colors">+ Add Rule</button>
                                    </label>
                                    <div className="space-y-2 mt-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                        {formData.rules?.map((rule, idx) => (
                                            <div key={idx} className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={rule}
                                                    onChange={(e) => handleArrayInput('rules', e.target.value, idx)}
                                                    placeholder={`Rule ${idx + 1}`}
                                                    className="w-full bg-black/50 border border-gray-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                                                />
                                                <button type="button" onClick={() => removeArrayItem('rules', idx)} className="text-red-400 hover:text-red-300 p-2"><FiTrash2 /></button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Section 4: Coordinators & Extras */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-indigo-400 border-b border-gray-800 pb-2">Coordinators & Extras</h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="text-sm text-gray-400">Coordinators <span className="text-red-500">*</span></label>
                                        <button type="button" onClick={addCoordinator} className="text-xs px-2 py-1 bg-indigo-500/10 text-indigo-400 rounded hover:bg-indigo-500/20 transition-colors">+ Add Coordinator</button>
                                    </div>
                                    <div className="space-y-3">
                                        {formData.coordinators?.map((coord, idx) => (
                                            <div key={idx} className="flex flex-col sm:flex-row gap-2 items-start sm:items-center bg-gray-900/50 p-3 rounded-lg border border-gray-800/50">
                                                <input
                                                    type="text"
                                                    required
                                                    placeholder="Name"
                                                    value={coord.name}
                                                    onChange={(e) => updateCoordinator(idx, 'name', e.target.value)}
                                                    className="w-full sm:flex-1 bg-black/50 border border-gray-700 rounded-lg px-4 py-2 outline-none text-sm"
                                                />
                                                <input
                                                    type="text"
                                                    required
                                                    placeholder="Phone"
                                                    value={coord.phone}
                                                    onChange={(e) => updateCoordinator(idx, 'phone', e.target.value)}
                                                    className="w-full sm:flex-1 bg-black/50 border border-gray-700 rounded-lg px-4 py-2 outline-none text-sm"
                                                />
                                                <button type="button" onClick={() => removeCoordinator(idx)} className="text-red-400 hover:text-red-300 p-2 ml-auto sm:ml-0"><FiTrash2 /></button>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="text-sm text-gray-400">Extra Fields (Custom)</label>
                                        {canManageCustomFields && (
                                            <button type="button" onClick={addExtraField} className="text-xs px-2 py-1 bg-indigo-500/10 text-indigo-400 rounded hover:bg-indigo-500/20 transition-colors">+ Add Field</button>
                                        )}
                                    </div>
                                    <div className="space-y-3">
                                        {formData.extraFields?.map((field, idx) => (
                                            <div key={idx} className="bg-gray-900/50 p-3 rounded-lg border border-gray-800/50 space-y-2">
                                                <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                                                    <input
                                                        type="text"
                                                        placeholder="Field Name"
                                                        value={field.name}
                                                        onChange={(e) => updateExtraField(idx, 'name', e.target.value)}
                                                        className="w-full sm:flex-1 bg-black/50 border border-gray-700 rounded-lg px-4 py-2 outline-none text-sm"
                                                        disabled={!canManageCustomFields}
                                                    />
                                                    <select
                                                        value={field.type}
                                                        onChange={(e) => updateExtraField(idx, 'type', e.target.value)}
                                                        className="w-full sm:w-32 bg-black/50 border border-gray-700 rounded-lg px-2 py-2 outline-none text-sm"
                                                        disabled={!canManageCustomFields}
                                                    >
                                                        <option value="text">Text</option>
                                                        <option value="number">Number</option>
                                                        <option value="date">Date</option>
                                                        <option value="email">Email</option>
                                                        <option value="tel">Phone</option>
                                                    </select>
                                                    {canManageCustomFields && (
                                                        <button type="button" onClick={() => removeExtraField(idx)} className="text-red-400 hover:text-red-300 p-2"><FiTrash2 /></button>
                                                    )}
                                                </div>
                                                <label className="flex items-center gap-2 text-xs text-gray-400">
                                                    <input type="checkbox" checked={field.required !== false} onChange={(e) => { const current = [...(formData.extraFields || [])]; current[idx] = { ...current[idx], required: e.target.checked }; setFormData({ ...formData, extraFields: current }); }} disabled={!canManageCustomFields} />
                                                    Required field
                                                </label>
                                            </div>
                                        ))}
                                        {(!formData.extraFields || formData.extraFields.length === 0) && (
                                            <p className="text-xs text-gray-600 italic">No extra fields added.</p>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-6 pt-6 border-t border-gray-800">
                                    {formData.eveType === 'team' && (
                                        <div className="mb-5 p-4 rounded-xl border border-indigo-500/20 bg-indigo-500/5">
                                            <div className="flex items-center justify-between gap-4">
                                                <div>
                                                    <label className="text-sm font-medium text-gray-300">Collect Year for Team Members</label>
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        Turn this off for events that accept both school and college students.
                                                        The setting is saved with this event and controls registration + Excel export.
                                                    </p>
                                                </div>
                                                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                                                    <input
                                                        type="checkbox"
                                                        className="sr-only peer"
                                                        checked={formData.showMemberYear !== false}
                                                        onChange={(e) => setFormData({ ...formData, showMemberYear: e.target.checked })}
                                                        disabled={!canManageMemberYear}
                                                    />
                                                    <div className="w-11 h-6 bg-gray-700 rounded-full peer peer-checked:bg-indigo-600 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5" />
                                                </label>
                                            </div>
                                            {!canManageMemberYear && (
                                                <p className="text-xs text-gray-600 mt-2">Only an Admin or Super Admin can change this setting.</p>
                                            )}
                                        </div>
                                    )}

                                    <div className="flex justify-between items-center mb-2">
                                        <div>
                                            <label className="text-sm text-gray-400">Team Member Fields</label>
                                            <p className="text-xs text-gray-600 mt-1">These fields appear for every member of a team event. Name is always required.</p>
                                        </div>
                                        {canManageCustomFields && formData.eveType === 'team' && (
                                            <button type="button" onClick={addTeamMemberField} className="text-xs px-2 py-1 bg-indigo-500/10 text-indigo-400 rounded hover:bg-indigo-500/20 transition-colors">+ Add Member Field</button>
                                        )}
                                    </div>
                                    {formData.eveType === 'team' ? (
                                        <div className="space-y-3">
                                            {(formData.teamMemberFields || []).map((field, idx) => (
                                                <div key={idx} className="bg-gray-900/50 p-3 rounded-lg border border-gray-800/50 space-y-2">
                                                    <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                                                        <input
                                                            type="text"
                                                            placeholder="e.g. Phone Number, College, Class"
                                                            value={field.name}
                                                            onChange={(e) => updateTeamMemberField(idx, 'name', e.target.value)}
                                                            className="w-full sm:flex-1 bg-black/50 border border-gray-700 rounded-lg px-4 py-2 outline-none text-sm"
                                                            disabled={!canManageCustomFields}
                                                        />
                                                        <select
                                                            value={field.type}
                                                            onChange={(e) => updateTeamMemberField(idx, 'type', e.target.value)}
                                                            className="w-full sm:w-32 bg-black/50 border border-gray-700 rounded-lg px-2 py-2 outline-none text-sm"
                                                            disabled={!canManageCustomFields}
                                                        >
                                                            <option value="text">Text</option>
                                                            <option value="number">Number</option>
                                                            <option value="date">Date</option>
                                                            <option value="email">Email</option>
                                                            <option value="tel">Phone</option>
                                                        </select>
                                                        {canManageCustomFields && (
                                                            <button type="button" onClick={() => removeTeamMemberField(idx)} className="text-red-400 hover:text-red-300 p-2"><FiTrash2 /></button>
                                                        )}
                                                    </div>
                                                    <label className="flex items-center gap-2 text-xs text-gray-400">
                                                        <input type="checkbox" checked={field.required !== false} onChange={(e) => updateTeamMemberField(idx, 'required', e.target.checked)} disabled={!canManageCustomFields} />
                                                        Required field
                                                    </label>
                                                </div>
                                            ))}
                                            {(!formData.teamMemberFields || formData.teamMemberFields.length === 0) && (
                                                <p className="text-xs text-gray-600 italic">No custom member fields. Members still receive Name, Phone Number, School / College and Department / Class. Year is controlled by the toggle above.</p>
                                            )}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-gray-600 italic">Select Team as the event type to configure member fields.</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-4 pt-6 border-t border-gray-800 mt-6 stuck sticky bottom-0 bg-gray-900/95 p-4 -mx-4 -mb-4 md:-mx-8 md:-mb-8 backdrop-blur rounded-b-2xl shadow-2xl z-20">
                            <button
                                type="button"
                                onClick={() => setIsEditing(false)}
                                className="px-6 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={uploading}
                                className="px-6 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition-colors flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-indigo-500/20"
                            >
                                {uploading ? 'Saving...' : <><FiSave /> Save Event</>}
                            </button>
                        </div>
                    </form>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {events.map(event => (
                        <div key={event.id} className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden group hover:border-indigo-500/30 transition-all">
                            <div className="h-40 bg-black relative">
                                {event.imageUrl && (
                                    <Image src={event.imageUrl} alt={event.title} fill className="object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                                )}
                                <div className="absolute top-2 right-2 bg-black/50 backdrop-blur px-2 py-1 rounded text-xs font-semibold uppercase border border-white/10">
                                    {event.department}
                                </div>
                            </div>
                            <div className="p-5">
                                <h3 className="text-lg font-bold text-white mb-1 truncate">{event.title}</h3>
                                <div className="flex justify-between text-sm text-gray-500 mb-4">
                                    <span>{event.type}</span>
                                    <span>{event.date}</span>
                                </div>
                                <div className="flex items-center justify-between mt-4 mb-3">
                                    <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${event.registrationOpen === false ? "text-red-300 bg-red-950/40 border-red-500/30" : "text-emerald-300 bg-emerald-950/40 border-emerald-500/30"}`}>
                                        {event.registrationOpen === false ? "Registration Closed" : "Registration Open"}
                                    </span>
                                    <button
                                        onClick={() => toggleEventRegistration(event)}
                                        className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${event.registrationOpen === false ? "text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/10" : "text-red-300 border-red-500/30 hover:bg-red-500/10"}`}
                                    >
                                        {event.registrationOpen === false ? "Open" : "Close"}
                                    </button>
                                </div>
                                <div className="flex gap-2 mt-4">
                                    <button
                                        onClick={() => startEdit(event)}
                                        className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                                    >
                                        <FiEdit2 /> Edit
                                    </button>
                                    <button
                                        onClick={() => handleDelete(event.id)}
                                        className="px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                                    >
                                        <FiTrash2 />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                    {events.length === 0 && !loading && (
                        <div className="col-span-full py-12 text-center text-gray-500 border border-dashed border-gray-800 rounded-2xl">
                            No events found. {userData.role === 'superAdmin' ? 'Create a new event.' : 'Create one to get started.'}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
