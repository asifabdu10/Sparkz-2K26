"use client";

import { useState, useEffect } from "react";
import { collection, addDoc, doc, updateDoc, arrayUnion, query, where, getDocs, limit, getDoc } from "firebase/firestore";
import { db } from "@/utils/firebase";
import Link from "next/link";
import { toastSuccess, toastError, toastInfo } from "@/utils/common/Toast";
import { Loader2, Smartphone, ExternalLink, AlertCircle, Calendar } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";
import { Event } from "@/utils/types/event";
import GradientBackground from "@/components/ui/GradientBackground";

export default function Register() {
  const params = useParams();
  const id = params?.id as string;
  
  const [event, setEvent] = useState<Event | null>(null);
  const [pageLoading, setPageLoading] = useState(true);

  const [loading, setLoading] = useState(false);
  // Dynamic form state
  const [formData, setFormData] = useState<Record<string, any>>({
    leaderName: "",
    leaderEmail: "",
    leaderMobile: "",
    leaderCollege: "",
    leaderDepartment: "",
    leaderYear: "",
    transactionId: "",
  });
  
  // For team events
  const [teamMembers, setTeamMembers] = useState<{name: string, mobile: string}[]>([]);
  
  const [isRegistrationClosed, setIsRegistrationClosed] = useState(false);
  const [existingRegistrationId, setExistingRegistrationId] = useState<string | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);

  const { user, loading: authLoading, refetchUserProfile } = useAuth();
  const router = useRouter();

  const STORAGE_KEY = `event_registration_${id}`;

  // Fetch Event Data
  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const docRef = doc(db, "events", id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setEvent({ id: docSnap.id, ...docSnap.data() } as Event);
        } else {
          toastError("Event not found");
        }
      } catch (error) {
        console.error("Error fetching event:", error);
        toastError("Failed to load event details");
      } finally {
        setPageLoading(false);
      }
    };

    if (id) {
      fetchEvent();
    }
  }, [id]);

  // Check deadline
  useEffect(() => {
    if (!event) return;

    const checkDeadline = () => {
      try {
        if (!event.regFinalDate) {
          setIsRegistrationClosed(event.registrationOpen === false);
          return;
        }

        // Parse DD-MM-YYYY
        const [day, month, year] = event.regFinalDate.split("-").map(Number);
        
        let deadline = new Date(year, month - 1, day);
        
        // Add time if available, else end of day
        if (event.RegCloseTime) {
          deadline.setHours(event.RegCloseTime.hours);
          deadline.setMinutes(event.RegCloseTime.minutes);
          deadline.setSeconds(0);
        } else {
          deadline.setHours(23, 59, 59);
        }

        const now = new Date();
        setIsRegistrationClosed(
          event.registrationOpen === false || now > deadline
        );
      } catch (err) {
        console.error("Error checking registration status:", err);
      }
    };

    checkDeadline();
  }, [event]);

  // Load from Local Storage
  useEffect(() => {
    if (!existingRegistrationId) {
      const savedData = localStorage.getItem(STORAGE_KEY);
      if (savedData) {
        try {
          const parsed = JSON.parse(savedData);
          if (parsed.formData) setFormData(parsed.formData);
          if (parsed.teamMembers) setTeamMembers(parsed.teamMembers);
        } catch (error) {
          console.error("Failed to parse saved draft:", error);
        }
      }
    }
  }, [existingRegistrationId, STORAGE_KEY]);

  // Save to Local Storage
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (!existingRegistrationId) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ formData, teamMembers }));
      }
    }, 1000);
    return () => clearTimeout(timeoutId);
  }, [formData, teamMembers, existingRegistrationId, STORAGE_KEY]);

  // Fetch existing registration
  useEffect(() => {
    const fetchRegistration = async () => {
      if (user && event) {
        try {
          const q = query(
            collection(db, "registrations"), 
            where("eventId", "==", event.id),
            where("userId", "==", user.uid),
            limit(1)
          );
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
            const docSnap = querySnapshot.docs[0];
            const data = docSnap.data();
            setExistingRegistrationId(docSnap.id);
            
            // Populate form with existing data
            const loadedData = { ...data };
            delete loadedData.eventId;
            delete loadedData.userId;
            delete loadedData.createdAt;
            delete loadedData.updatedAt;
            
            // Separate team members if exists
            if (loadedData.teamMembers && Array.isArray(loadedData.teamMembers)) {
              setTeamMembers(loadedData.teamMembers);
              delete loadedData.teamMembers;
            }
            
            setFormData(loadedData);
            setAcknowledged(true);
            toastInfo("Loaded your existing registration.");
          }
        } catch (error) {
          console.error("Error fetching registration:", error);
        }
      }
    };

    if (!authLoading && user) {
      fetchRegistration();
    }
  }, [user, authLoading, event]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleTeamMemberChange = (index: number, field: string, value: string) => {
    const updatedMembers = [...teamMembers];
    updatedMembers[index] = { ...updatedMembers[index], [field]: value };
    setTeamMembers(updatedMembers);
  };

  const addTeamMember = () => {
    if (!event) return;
    const max = event.memberMaxCount || 0;
    if (teamMembers.length + 1 < max) {
      setTeamMembers([...teamMembers, { name: "", mobile: "" }]);
    } else {
      toastError(`Maximum team size is ${max}`);
    }
  };

  const removeTeamMember = (index: number) => {
    const updated = teamMembers.filter((_, i) => i !== index);
    setTeamMembers(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event) return;
    
    // Validation
    const min = event.memberMinCount || 1;
    const max = event.memberMaxCount || 1;
    const currentCount = 1 + teamMembers.length;
    
    if (event.eveType === 'team') {
      if (currentCount < min) {
        toastError(`Minimum team size is ${min} (including leader)`);
        return;
      }
      if (currentCount > max) {
        toastError(`Maximum team size is ${max} (including leader)`);
        return;
      }
    }

    setLoading(true);

    try {
      const isFreeEvent =
        event.isFree === true ||
        Number(String(event.registrationFee || "0").replace(/[^0-9.]/g, "")) === 0;

      const registrationData = {
        eventId: event.id,
        eventTitle: event.title,
        userId: user?.uid || "",
        userEmail: user?.email || formData.leaderEmail,
        userName: user?.displayName || formData.leaderName,
        ...formData,
        teamMembers: event.eveType === 'team' ? teamMembers : [],
        status: isFreeEvent ? "registered" : "pending",
        paymentStatus: isFreeEvent ? "free" : "pending",
        updatedAt: new Date()
      };

      if (existingRegistrationId) {
        // Update
        await updateDoc(doc(db, "registrations", existingRegistrationId), registrationData);
        toastSuccess("Registration updated!");
      } else {
        // Create
        await addDoc(collection(db, "registrations"), {
          ...registrationData,
          createdAt: new Date()
        });

        // Update user profile if logged in
        if (user) {
          const userRef = doc(db, "users", user.uid);
          await updateDoc(userRef, {
            registeredEvents: arrayUnion(event.title)
          });
          await refetchUserProfile();
        }
        
        toastSuccess("Registered successfully!");
      }
      
      localStorage.removeItem(STORAGE_KEY);
      
      if (!existingRegistrationId) {
        router.push('/events');
      }

    } catch (error) {
      console.error("Registration error:", error);
      toastError("Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (pageLoading) {
    return (
      <div className="min-h-screen bg-[#0B0B0E] flex items-center justify-center text-[#F3C87A]">
        <Loader2 className="w-10 h-10 animate-spin text-[#F3C87A]" />
      </div>
    );
  }

  if (!event) return (
    <div className="min-h-screen bg-[#0B0B0E] flex items-center justify-center text-white">
      Event not found
    </div>
  );

  const upiId = (event.upi && event.upi.length > 0) ? event.upi[0] : (event as any).upi1; 
  const upiLink = upiId ? `upi://pay?pa=${upiId}&pn=Sparkz24&tn=${encodeURIComponent(`${event.title} Reg`)}` : "#";

  return (
    <div className="min-h-screen bg-[#0B0B0E] text-white selection:bg-[#3A270D] selection:text-[#F3C87A] font-sans relative overflow-hidden">
      {/* Global Gradient Background */}
      <GradientBackground />

      <div className="relative z-10 min-h-screen flex items-center justify-center py-12 px-4">
        <div className="max-w-3xl w-full bg-[#131318] rounded-3xl border border-[rgba(212,163,89,0.25)] p-6 md:p-10 shadow-2xl">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
                <span className="gold-gradient-text">
                  {event.title} Registration
                </span>
              </h1>
              <p className="text-[#A1A1AA] mt-2 flex items-center gap-2 text-sm md:text-base">
                <Calendar className="w-4 h-4 text-[#F3C87A]" />
                Date: {event.date}
              </p>
            </div>
            {isRegistrationClosed && (
              <div className="px-4 py-2 bg-red-950/40 border border-red-500/30 rounded-xl text-red-300 flex items-center gap-2 font-semibold text-sm">
                <AlertCircle className="w-5 h-5 text-red-400" />
                Registration Closed
              </div>
            )}
          </div>

          {isRegistrationClosed && !existingRegistrationId ? (
            <div className="text-center py-12 bg-[#0B0B0E] rounded-2xl border border-[rgba(212,163,89,0.2)]">
              <p className="text-xl text-[#A1A1AA]">Registration for this event is currently closed.</p>
              <Link href="/events" className="inline-block mt-6 px-6 py-3 btn-gold font-semibold rounded-xl transition-all">
                Browse other events
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Leader Details */}
              <div className="space-y-5">
                <h3 className="text-lg font-semibold text-[#FDE6B0] border-b border-[rgba(212,163,89,0.2)] pb-2">
                  {event.eveType === 'team' ? "Team Leader Details" : "Participant Details"}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[#A1A1AA]">Name <span className="text-[#F3C87A]">*</span></label>
                    <input required type="text" name="leaderName" value={formData.leaderName} onChange={handleInputChange} placeholder="Full Name" className="w-full bg-[#0B0B0E] border border-[rgba(212,163,89,0.25)] rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#D4A359]/30 focus:border-[#F3C87A] outline-none transition-all placeholder:text-[#A1A1AA]/40 text-white" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[#A1A1AA]">Mobile <span className="text-[#F3C87A]">*</span></label>
                    <input required type="tel" name="leaderMobile" value={formData.leaderMobile} onChange={handleInputChange} placeholder="Mobile Number" className="w-full bg-[#0B0B0E] border border-[rgba(212,163,89,0.25)] rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#D4A359]/30 focus:border-[#F3C87A] outline-none transition-all placeholder:text-[#A1A1AA]/40 text-white" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[#A1A1AA]">Email <span className="text-[#F3C87A]">*</span></label>
                    <input required type="email" name="leaderEmail" value={formData.leaderEmail} onChange={handleInputChange} placeholder="Email Address" className="w-full bg-[#0B0B0E] border border-[rgba(212,163,89,0.25)] rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#D4A359]/30 focus:border-[#F3C87A] outline-none transition-all placeholder:text-[#A1A1AA]/40 text-white" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[#A1A1AA]">College <span className="text-[#F3C87A]">*</span></label>
                    <input required type="text" name="leaderCollege" value={formData.leaderCollege} onChange={handleInputChange} placeholder="College Name" className="w-full bg-[#0B0B0E] border border-[rgba(212,163,89,0.25)] rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#D4A359]/30 focus:border-[#F3C87A] outline-none transition-all placeholder:text-[#A1A1AA]/40 text-white" />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium text-[#A1A1AA]">Department/Year <span className="text-[#F3C87A]">*</span></label>
                    <input required type="text" name="leaderDepartment" value={formData.leaderDepartment} onChange={handleInputChange} placeholder="e.g. CSE S5" className="w-full bg-[#0B0B0E] border border-[rgba(212,163,89,0.25)] rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#D4A359]/30 focus:border-[#F3C87A] outline-none transition-all placeholder:text-[#A1A1AA]/40 text-white" />
                  </div>
                </div>
              </div>

              {/* Team Members */}
              {event.eveType === 'team' && (
                <div className="space-y-5">
                  <div className="flex justify-between items-center border-b border-[rgba(212,163,89,0.2)] pb-2">
                    <h3 className="text-lg font-semibold text-[#FDE6B0]">Team Members</h3>
                    <div className="text-xs font-semibold text-[#F3C87A] bg-[#3A270D] px-3 py-1 rounded-full border border-[rgba(212,163,89,0.3)]">
                      Limit: {event.memberMinCount}-{event.memberMaxCount} members
                    </div>
                  </div>
                  
                  {teamMembers.map((member, idx) => (
                    <div key={idx} className="p-5 bg-[#0B0B0E] rounded-2xl border border-[rgba(212,163,89,0.2)] space-y-3 relative group hover:border-[rgba(212,163,89,0.4)] transition-colors">
                      <button type="button" onClick={() => removeTeamMember(idx)} className="absolute top-3 right-3 text-[#A1A1AA] hover:text-red-400 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                      </button>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs text-[#A1A1AA] ml-1">Member {idx + 2} Name</label>
                          <input required type="text" value={member.name} onChange={(e) => handleTeamMemberChange(idx, 'name', e.target.value)} className="w-full bg-[#131318] border border-[rgba(212,163,89,0.25)] rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-[#D4A359]/30 focus:border-[#F3C87A] outline-none transition-all text-white" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-[#A1A1AA] ml-1">Mobile</label>
                          <input required type="tel" value={member.mobile} onChange={(e) => handleTeamMemberChange(idx, 'mobile', e.target.value)} className="w-full bg-[#131318] border border-[rgba(212,163,89,0.25)] rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-[#D4A359]/30 focus:border-[#F3C87A] outline-none transition-all text-white" />
                        </div>
                      </div>
                    </div>
                  ))}

                  {teamMembers.length + 1 < (event.memberMaxCount || 99) && (
                    <button type="button" onClick={addTeamMember} className="w-full py-3 border border-dashed border-[rgba(212,163,89,0.3)] rounded-2xl text-[#F3C87A] hover:border-[#F3C87A] hover:bg-[#3A270D]/30 transition-all font-medium flex items-center justify-center gap-2">
                      <div className="w-5 h-5 rounded-full border border-current flex items-center justify-center text-xs">+</div>
                      Add Team Member
                    </button>
                  )}
                </div>
              )}

              {/* Extra Fields */}
              {event.requiresExtraData && event.extraFields && (
                <div className="space-y-5">
                  <h3 className="text-lg font-semibold text-[#FDE6B0] border-b border-[rgba(212,163,89,0.2)] pb-2">Additional Information</h3>
                  <div className="grid grid-cols-1 gap-5">
                    {event.extraFields.map((field) => (
                      <div key={field.name} className="space-y-2">
                        <label className="text-sm font-medium text-[#A1A1AA]">{field.name} <span className="text-[#F3C87A]">*</span></label>
                        <input required type={field.type || "text"} name={field.name} value={formData[field.name] || ""} onChange={handleInputChange} placeholder={`Enter ${field.name}`} className="w-full bg-[#0B0B0E] border border-[rgba(212,163,89,0.25)] rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#D4A359]/30 focus:border-[#F3C87A] outline-none transition-all placeholder:text-[#A1A1AA]/40 text-white" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Payment Section */}
              {event.registrationFee && event.registrationFee !== "0" && (
                <div className="space-y-6 pt-4">
                  <h3 className="text-xl font-bold gold-gradient-text">
                    Payment Details <span className="text-[#A1A1AA] text-base font-normal ml-2">(Fee: ₹{event.registrationFee})</span>
                  </h3>
                  <div className="flex flex-col items-center justify-center gap-4 bg-[#0B0B0E] border border-[rgba(212,163,89,0.25)] p-6 rounded-2xl">
                    <a href={upiLink} className="w-full max-w-sm flex items-center justify-between bg-[#131318] hover:bg-[#1a1a22] border border-[rgba(212,163,89,0.25)] hover:border-[#F3C87A] rounded-xl p-4 transition-all group cursor-pointer">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-[#3A270D] flex items-center justify-center text-[#F3C87A] border border-[rgba(212,163,89,0.3)] group-hover:scale-110 transition-transform">
                          <Smartphone className="w-6 h-6" />
                        </div>
                        <div className="text-left">
                          <div className="font-bold text-white group-hover:text-[#F3C87A] text-sm transition-colors">Pay via UPI App</div>
                          <div className="text-xs text-[#A1A1AA]">{upiId ? "Tap to pay" : "UPI ID not available"}</div>
                        </div>
                      </div>
                      <ExternalLink className="w-5 h-5 text-[#A1A1AA] group-hover:text-[#F3C87A] transition-colors" />
                    </a>

                    {upiId && (
                      <div className="text-sm text-[#FDE6B0] font-mono bg-[#131318] px-3 py-1 rounded border border-[rgba(212,163,89,0.25)]">
                        UPI ID: {upiId}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[#A1A1AA]">Transaction ID / Reference No <span className="text-[#F3C87A]">*</span></label>
                    <input required type="text" name="transactionId" value={formData.transactionId} onChange={handleInputChange} placeholder="Enter UPI Transaction ID" className="w-full bg-[#0B0B0E] border border-[rgba(212,163,89,0.25)] rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-[#D4A359]/30 focus:border-[#F3C87A] outline-none font-mono placeholder:text-[#A1A1AA]/40" />
                  </div>
                </div>
              )}

              {/* Acknowledgement */}
              <div className="flex items-start gap-3 p-4 bg-[#0B0B0E] rounded-xl border border-[rgba(212,163,89,0.2)]">
                <input id="ack" type="checkbox" checked={acknowledged} onChange={(e) => setAcknowledged(e.target.checked)} className="mt-1 w-5 h-5 rounded border-[rgba(212,163,89,0.3)] text-[#D4A359] focus:ring-[#D4A359] bg-[#131318] cursor-pointer" />
                <label htmlFor="ack" className="text-sm text-[#A1A1AA] cursor-pointer select-none">
                  I confirm that the details provided are accurate and I agree to the event rules.
                </label>
              </div>

              <button type="submit" disabled={loading || !acknowledged} className="w-full btn-gold font-bold py-4 rounded-2xl transition-all transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-xl shadow-[#D4A359]/20 disabled:grayscale disabled:shadow-none">
                {loading ? <><Loader2 className="w-5 h-5 animate-spin text-[#0B0B0E]" /> Processing...</> : existingRegistrationId ? "Update Registration" : "Confirm Registration"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}