"use client";

import { useEffect, useMemo, useState } from "react";
import {
  arrayUnion,
  collection,
  deleteField,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/utils/firebase";
import Link from "next/link";
import { toastError, toastInfo, toastSuccess } from "@/utils/common/Toast";
import { AlertCircle, Calendar, Loader2, Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useParams, useRouter } from "next/navigation";
import { Event, RegistrationField } from "@/utils/types/event";
import GradientBackground from "@/components/ui/GradientBackground";
import dynamic from "next/dynamic";

const RazorpayButton = dynamic(() => import("@/components/ui/RazorpayButton"), {
  ssr: false,
});

type MemberData = Record<string, string>;

type RegistrationData = {
  leaderName: string;
  leaderEmail: string;
  leaderMobile: string;
  leaderCollege: string;
  leaderDepartment: string;
  leaderYear: string;
  extraData: Record<string, string>;
  teamMembers: MemberData[];
};

const baseMemberFields: RegistrationField[] = [
  { name: "Phone Number", type: "tel", required: true },
  { name: "School / College", type: "text", required: true },
  { name: "Department / Class", type: "text", required: true },
  { name: "Year", type: "text", required: true },
];

function getDeadline(event: Event): Date | null {
  if (!event.regFinalDate) return null;
  const [day, month, year] = event.regFinalDate.split("-").map(Number);
  if (!day || !month || !year) return null;
  const deadline = new Date(year, month - 1, day);
  if (event.RegCloseTime) {
    deadline.setHours(event.RegCloseTime.hours, event.RegCloseTime.minutes, 59, 999);
  } else {
    deadline.setHours(23, 59, 59, 999);
  }
  return deadline;
}

function fieldInputType(type: RegistrationField["type"]): string {
  if (type === "email") return "email";
  if (type === "number") return "number";
  if (type === "date") return "date";
  if (type === "tel") return "tel";
  return "text";
}

function emptyMember(fields: RegistrationField[]): MemberData {
  const member: MemberData = { name: "" };
  fields.forEach((field) => {
    member[field.name] = "";
  });
  return member;
}

export default function Register() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const { user, userData, loading: authLoading, refetchUserProfile } = useAuth();

  const [event, setEvent] = useState<Event | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [paymentReady, setPaymentReady] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [registrationId, setRegistrationId] = useState<string | null>(null);
  const [registrationClosed, setRegistrationClosed] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);

  const [formData, setFormData] = useState<RegistrationData>({
    leaderName: "",
    leaderEmail: "",
    leaderMobile: "",
    leaderCollege: "",
    leaderDepartment: "",
    leaderYear: "",
    extraData: {},
    teamMembers: [],
  });

  const STORAGE_KEY = `event_registration_${id}`;

  const isFree = useMemo(() => {
    if (!event) return false;
    const fee = Number(String(event.registrationFee || "0").replace(/[^0-9.]/g, ""));
    return event.isFree === true || !fee || Number.isNaN(fee);
  }, [event]);

  const feeNumber = useMemo(() => {
    if (!event || isFree) return 0;
    return Number(String(event.registrationFee || "0").replace(/[^0-9.]/g, ""));
  }, [event, isFree]);

  const memberFields = useMemo<RegistrationField[]>(() => {
    if (!event || event.eveType !== "team") return [];
    const custom = event.teamMemberFields || [];
    const collectYear = event.showMemberYear !== false;
    const customNames = new Set(custom.map((field) => field.name.toLowerCase().trim()));
    const combined = [
      ...baseMemberFields.filter((field) => !customNames.has(field.name.toLowerCase().trim())),
      ...custom,
    ];
    // The Year toggle controls the built-in Year field (and prevents a custom
    // field named "Year" from re-introducing it when the toggle is off).
    return combined.filter((field) => collectYear || field.name.toLowerCase().trim() !== "year");
  }, [event]);

  const minMembers = event?.eveType === "team" ? Math.max(1, Number(event.memberMinCount) || 1) : 1;
  const maxMembers = event?.eveType === "team"
    ? Math.max(minMembers, Number(event.memberMaxCount) || minMembers)
    : 1;

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const snap = await getDoc(doc(db, "events", id));
        if (!snap.exists()) {
          toastError("Event not found");
          return;
        }
        setEvent({ id: snap.id, ...snap.data() } as Event);
      } catch (error) {
        console.error(error);
        toastError("Failed to load event details");
      } finally {
        setPageLoading(false);
      }
    };
    if (id) fetchEvent();
  }, [id]);

  useEffect(() => {
    if (!event) return;
    const deadline = getDeadline(event);
    setRegistrationClosed(
      event.registrationOpen === false || Boolean(deadline && new Date() > deadline)
    );
  }, [event]);

  useEffect(() => {
    if (!event || !user || authLoading) return;

    const loadRegistration = async () => {
      try {
        const q = query(
          collection(db, "registrations"),
          where("eventId", "==", event.id),
          where("userId", "==", user.uid),
          limit(1)
        );
        const snap = await getDocs(q);

        if (!snap.empty) {
          const registration = snap.docs[0];
          const data = registration.data();
          setRegistrationId(registration.id);

          if (data.status === "paid" || data.status === "registered") {
            setRegistered(true);
            setAcknowledged(true);
          }

          setFormData((current) => ({
            ...current,
            leaderName: data.leaderName || data.userName || current.leaderName,
            leaderEmail: data.leaderEmail || data.userEmail || current.leaderEmail,
            leaderMobile: data.leaderMobile || current.leaderMobile,
            leaderCollege: data.leaderCollege || current.leaderCollege,
            leaderDepartment: data.leaderDepartment || current.leaderDepartment,
            leaderYear: data.leaderYear || current.leaderYear,
            extraData: data.extraData || current.extraData,
            teamMembers: Array.isArray(data.teamMembers) ? data.teamMembers : current.teamMembers,
          }));

          if (data.status === "pending") {
            setPaymentReady(true);
            toastInfo("Your details are saved. Complete payment to finish registration.");
          }
        } else {
          const saved = localStorage.getItem(STORAGE_KEY);
          if (saved) {
            try {
              const parsed = JSON.parse(saved);
              setFormData((current) => ({ ...current, ...parsed }));
            } catch {
              // Ignore malformed local draft.
            }
          }
        }
      } catch (error) {
        console.error("Failed to load registration:", error);
      }
    };

    loadRegistration();
  }, [event, user, authLoading, STORAGE_KEY]);

  useEffect(() => {
    if (!event || !user || registered || paymentReady) return;
    const timer = window.setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(formData));
    }, 500);
    return () => window.clearTimeout(timer);
  }, [event, user, registered, paymentReady, formData, STORAGE_KEY]);

  useEffect(() => {
    if (!event || event.eveType !== "team") return;
    setFormData((current) => {
      const desired = Math.max(0, minMembers - 1);
      if (current.teamMembers.length >= desired) return current;
      return {
        ...current,
        teamMembers: [
          ...current.teamMembers,
          ...Array.from({ length: desired - current.teamMembers.length }, () => emptyMember(memberFields)),
        ],
      };
    });
  }, [event, minMembers, memberFields]);

  const updateLeader = (field: keyof RegistrationData, value: string) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const updateExtra = (field: string, value: string) => {
    setFormData((current) => ({
      ...current,
      extraData: { ...current.extraData, [field]: value },
    }));
  };

  const updateMember = (index: number, field: string, value: string) => {
    setFormData((current) => {
      const members = [...current.teamMembers];
      members[index] = { ...(members[index] || emptyMember(memberFields)), [field]: value };
      return { ...current, teamMembers: members };
    });
  };

  const addMember = () => {
    if (formData.teamMembers.length + 1 >= maxMembers) {
      toastError(`Maximum team size is ${maxMembers} members.`);
      return;
    }
    setFormData((current) => ({
      ...current,
      teamMembers: [...current.teamMembers, emptyMember(memberFields)],
    }));
  };

  const removeMember = (index: number) => {
    if (formData.teamMembers.length <= minMembers - 1) {
      toastError(`Minimum team size is ${minMembers} members including the leader.`);
      return;
    }
    setFormData((current) => ({
      ...current,
      teamMembers: current.teamMembers.filter((_, i) => i !== index),
    }));
  };

  const validate = () => {
    if (!user) {
      toastError("Please login to register.");
      router.push("/login");
      return false;
    }
    if (registrationClosed) {
      toastError("Registration for this event is closed.");
      return false;
    }

    const requiredLeader = [
      ["Name", formData.leaderName],
      ["Email", formData.leaderEmail],
      ["Mobile", formData.leaderMobile],
      ["School / College", formData.leaderCollege],
      ["Department / Year", formData.leaderDepartment],
    ] as const;

    for (const [label, value] of requiredLeader) {
      if (!String(value || "").trim()) {
        toastError(`${label} is required.`);
        return false;
      }
    }

    if (event?.eveType === "team") {
      const count = 1 + formData.teamMembers.length;
      if (count < minMembers || count > maxMembers) {
        toastError(
          minMembers === maxMembers
            ? `Team size must be ${minMembers} ${minMembers === 1 ? "member" : "members"}.`
            : `Team size must be between ${minMembers} and ${maxMembers} members.`
        );
        return false;
      }

      for (let index = 0; index < formData.teamMembers.length; index += 1) {
        const member = formData.teamMembers[index];
        if (!member.name.trim()) {
          toastError(`Member ${index + 2} name is required.`);
          return false;
        }
        for (const field of memberFields) {
          if (field.required && !String(member[field.name] || "").trim()) {
            toastError(`Member ${index + 2}: ${field.name} is required.`);
            return false;
          }
        }
      }
    }

    for (const field of event?.extraFields || []) {
      if (field.required && !String(formData.extraData[field.name] || "").trim()) {
        toastError(`${field.name} is required.`);
        return false;
      }
    }

    return true;
  };

  const savePendingRegistration = async () => {
    if (!user || !event) throw new Error("Login is required.");

    const idToUse = registrationId || `${user.uid}_${event.id}`;
    const registration = {
      eventId: event.id,
      eventTitle: event.title,
      userId: user.uid,
      userEmail: user.email || formData.leaderEmail,
      userName: user.displayName || formData.leaderName,
      leaderName: formData.leaderName,
      leaderEmail: formData.leaderEmail,
      leaderMobile: formData.leaderMobile,
      leaderCollege: formData.leaderCollege,
      leaderDepartment: formData.leaderDepartment,
      leaderYear:
        event.showMemberYear === false
          ? deleteField()
          : formData.leaderYear,
      extraData: formData.extraData,
      teamMembers:
        event.eveType === "team"
          ? formData.teamMembers.map((member) => {
            if (event.showMemberYear === false) {
              const { Year, ...memberWithoutYear } = member;
              void Year;
              return memberWithoutYear;
            }
            return member;
          })
          : [],
      teamSize: event.eveType === "team" ? 1 + formData.teamMembers.length : 1,
      registrationFee: feeNumber,
      department: event.department || "",
      status: isFree ? "registered" : "pending",
      paymentStatus: isFree ? "free" : "pending",
      updatedAt: new Date(),
    };

    const payload = registrationId
      ? registration
      : { ...registration, createdAt: new Date() };

    await setDoc(doc(db, "registrations", idToUse), payload, { merge: true });

    setRegistrationId(idToUse);
    return idToUse;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || !event || !user) return;

    setLoading(true);
    try {
      await savePendingRegistration();
      localStorage.removeItem(STORAGE_KEY);

      if (isFree) {
        await updateDoc(doc(db, "users", user.uid), {
          registeredEvents: arrayUnion(event.title),
        });
        await refetchUserProfile();
        setRegistered(true);
        setAcknowledged(true);
        toastSuccess("Registration successful! 🎉");
      } else {
        setPaymentReady(true);
        toastSuccess("Details saved. Complete the payment to finish registration.");
      }
    } catch (error) {
      console.error("Registration save error:", error);
      toastError("Could not save registration details. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const completePaidRegistration = async (paymentId: string, orderId: string) => {
    if (!user || !event || !registrationId) throw new Error("Registration session expired.");

    await updateDoc(doc(db, "registrations", registrationId), {
      status: "paid",
      paymentStatus: "paid",
      razorpayPaymentId: paymentId,
      razorpayOrderId: orderId,
      paidAt: new Date(),
      updatedAt: new Date(),
    });

    await updateDoc(doc(db, "users", user.uid), {
      registeredEvents: arrayUnion(event.title),
    });

    await refetchUserProfile();
    setRegistered(true);
    setPaymentReady(false);
    toastSuccess("Payment successful! You are registered 🎉");
  };

  if (pageLoading || authLoading) {
    return (
      <div className="min-h-screen bg-[#0B0B0E] flex items-center justify-center text-[#F3C87A]">
        <Loader2 className="w-10 h-10 animate-spin" />
      </div>
    );
  }

  if (!event) {
    return <div className="min-h-screen bg-[#0B0B0E] flex items-center justify-center text-white">Event not found</div>;
  }

  return (
    <div className="min-h-screen bg-[#0B0B0E] text-white font-sans relative overflow-hidden">
      <GradientBackground />
      <div className="relative z-10 min-h-screen flex items-center justify-center py-12 px-4">
        <div className="max-w-4xl w-full bg-[#131318] rounded-3xl border border-[rgba(212,163,89,0.25)] p-6 md:p-10 shadow-2xl">
          <div className="flex flex-col md:flex-row justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl md:text-5xl font-bold tracking-tight gold-gradient-text">{event.title} Registration</h1>
              <p className="text-[#A1A1AA] mt-2 flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-[#F3C87A]" /> Date: {event.date || "TBA"}
              </p>
            </div>
            {registrationClosed && !registered && (
              <div className="px-4 py-2 h-fit bg-red-950/40 border border-red-500/30 rounded-xl text-red-300 flex items-center gap-2 font-semibold text-sm">
                <AlertCircle className="w-5 h-5" /> Registration Closed
              </div>
            )}
          </div>

          {registered ? (
            <div className="text-center py-16 bg-[#0B0B0E] rounded-2xl border border-emerald-500/20">
              <div className="text-5xl mb-4">✓</div>
              <h2 className="text-2xl font-bold text-emerald-300">You are registered!</h2>
              <p className="text-[#A1A1AA] mt-2">Your registration for {event.title} is saved successfully.</p>
              <Link href="/events" className="inline-block mt-8 px-6 py-3 btn-gold font-semibold rounded-xl text-[#0B0B0E]">Back to Events</Link>
            </div>
          ) : registrationClosed ? (
            <div className="text-center py-12 bg-[#0B0B0E] rounded-2xl border border-[rgba(212,163,89,0.2)]">
              <p className="text-xl text-[#A1A1AA]">Registration for this event is currently closed.</p>
              <Link href="/events" className="inline-block mt-6 px-6 py-3 btn-gold font-semibold rounded-xl text-[#0B0B0E]">Browse Other Events</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-8">
              <section className="space-y-5">
                <div>
                  <h3 className="text-lg font-semibold text-[#FDE6B0]">{event.eveType === "team" ? "Team Leader Details" : "Participant Details"}</h3>
                  <p className="text-xs text-[#71717A] mt-1">Fields marked * are required.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {[
                    ["leaderName", "Name", "text", "Full Name"],
                    ["leaderMobile", "Phone Number", "tel", "Mobile Number"],
                    ["leaderEmail", "Email", "email", "Email Address"],
                    ["leaderCollege", "School / College", "text", "School or College Name"],
                    ["leaderDepartment", "Department / Class", "text", "e.g. CSE S5"],
                    ...(event.showMemberYear !== false
                      ? [["leaderYear", "Year", "text", "e.g. 2nd Year"]]
                      : []),
                  ].map(([name, label, type, placeholder]) => (
                    <div key={name} className="space-y-2">
                      <label className="text-sm font-medium text-[#A1A1AA]">{label} <span className="text-[#F3C87A]">*</span></label>
                      <input
                        required
                        type={type}
                        value={String(formData[name as keyof RegistrationData] || "")}
                        onChange={(e) => updateLeader(name as keyof RegistrationData, e.target.value)}
                        placeholder={placeholder}
                        className="w-full bg-[#0B0B0E] border border-[rgba(212,163,89,0.25)] rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#D4A359]/30 focus:border-[#F3C87A] outline-none text-white placeholder:text-[#A1A1AA]/40"
                      />
                    </div>
                  ))}
                </div>
              </section>

              {event.eveType === "team" && (
                <section className="space-y-5">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[rgba(212,163,89,0.2)] pb-3">
                    <div>
                      <h3 className="text-lg font-semibold text-[#FDE6B0]">Team Members</h3>
                      <p className="text-xs text-[#71717A] mt-1">Add or remove members within the configured team limit.</p>
                    </div>
                    <div className="text-xs font-semibold text-[#F3C87A] bg-[#3A270D] px-3 py-1 rounded-full border border-[rgba(212,163,89,0.3)]">
                      Team size: {1 + formData.teamMembers.length} / {minMembers === maxMembers ? minMembers : `${minMembers}-${maxMembers}`}
                    </div>
                  </div>

                  {formData.teamMembers.map((member, idx) => (
                    <div key={idx} className="p-5 bg-[#0B0B0E] rounded-2xl border border-[rgba(212,163,89,0.2)] space-y-4 relative">
                      <button type="button" onClick={() => removeMember(idx)} className="absolute top-4 right-4 text-[#A1A1AA] hover:text-red-400" title="Remove member">
                        <Trash2 className="w-5 h-5" />
                      </button>
                      <h4 className="font-semibold text-[#F3C87A]">Member {idx + 2}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-2">
                        <div className="space-y-2">
                          <label className="text-sm text-[#A1A1AA]">Name <span className="text-[#F3C87A]">*</span></label>
                          <input required type="text" value={member.name || ""} onChange={(e) => updateMember(idx, "name", e.target.value)} className="w-full bg-[#131318] border border-[rgba(212,163,89,0.25)] rounded-xl px-4 py-3 outline-none text-white" />
                        </div>
                        {memberFields.map((field) => (
                          <div key={field.name} className="space-y-2">
                            <label className="text-sm text-[#A1A1AA]">
                              {field.name} {field.required && <span className="text-[#F3C87A]">*</span>}
                            </label>
                            <input
                              required={field.required === true}
                              type={fieldInputType(field.type)}
                              value={member[field.name] || ""}
                              onChange={(e) => updateMember(idx, field.name, e.target.value)}
                              className="w-full bg-[#131318] border border-[rgba(212,163,89,0.25)] rounded-xl px-4 py-3 outline-none text-white"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  {1 + formData.teamMembers.length < maxMembers && (
                    <button type="button" onClick={addMember} className="w-full py-3 border border-dashed border-[rgba(212,163,89,0.3)] rounded-2xl text-[#F3C87A] hover:border-[#F3C87A] hover:bg-[#3A270D]/30 transition-all font-medium flex items-center justify-center gap-2">
                      <Plus className="w-5 h-5" /> Add Team Member
                    </button>
                  )}
                </section>
              )}

              {event.extraFields && event.extraFields.length > 0 && (
                <section className="space-y-5">
                  <h3 className="text-lg font-semibold text-[#FDE6B0] border-b border-[rgba(212,163,89,0.2)] pb-2">Additional Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {event.extraFields.map((field) => (
                      <div key={field.name} className="space-y-2">
                        <label className="text-sm text-[#A1A1AA]">{field.name} {field.required && <span className="text-[#F3C87A]">*</span>}</label>
                        <input
                          required={field.required === true}
                          type={fieldInputType(field.type)}
                          value={formData.extraData[field.name] || ""}
                          onChange={(e) => updateExtra(field.name, e.target.value)}
                          className="w-full bg-[#0B0B0E] border border-[rgba(212,163,89,0.25)] rounded-xl px-4 py-3 outline-none text-white"
                        />
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <div className="pt-4 border-t border-gray-800">
                {!paymentReady ? (
                  <button type="submit" disabled={loading} className="btn-gold w-full rounded-full p-4 font-bold text-lg text-[#0B0B0E] disabled:opacity-60">
                    {loading ? "Saving Details..." : isFree ? "Register Free" : `Continue to Payment · ₹${feeNumber}`}
                  </button>
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-[#D4A359]/20 bg-[#0B0B0E] p-4 text-center">
                      <p className="text-[#FDE6B0] font-semibold">Your team details are saved.</p>
                      <p className="text-sm text-[#A1A1AA] mt-1">Complete the payment below to finish registration.</p>
                    </div>
                    <RazorpayButton
                      amountRupees={feeNumber}
                      eventTitle={event.title}
                      eventId={event.id}
                      userId={user?.uid || ""}
                      userName={formData.leaderName}
                      userEmail={formData.leaderEmail}
                      userPhone={formData.leaderMobile}
                      metadata={{ registrationId }}
                      onSuccess={completePaidRegistration}
                      label="Pay & Complete Registration"
                    />
                  </div>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
