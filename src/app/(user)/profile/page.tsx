'use client';

import { useAuth } from '@/context/AuthContext';
import { db } from '@/utils/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toastSuccess, toastError } from '@/utils/common/Toast';
import GradientBackground from '@/components/ui/GradientBackground';

export default function ProfilePage() {
  const { user, userData, loading, refetchUserProfile, logout } = useAuth();
  const router = useRouter();
  
  const [name, setName] = useState('');
  const [college, setCollege] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (userData) {
      setName(userData.name || '');
      setCollege(userData.college || '');
    }
  }, [userData]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!name.trim() || !college.trim()) {
      toastError("Please fill in all fields.");
      return;
    }

    setSaving(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        name: name.trim(),
        college: college.trim(),
        isProfileComplete: true
      });
      await refetchUserProfile();
      toastSuccess("Profile updated successfully!");
    } catch (error) {
      console.error("Error updating profile:", error);
      toastError("Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0B0E] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#F3C87A]"></div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#0B0B0E] py-20 px-4 md:px-8 max-w-4xl mx-auto text-white selection:bg-[#3A270D] selection:text-[#F3C87A]">
      <GradientBackground />
      <h1 className="text-4xl font-bold mb-8 gold-gradient-text">
        My Profile
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
        {/* Profile Details Section */}
        <div className="bg-[#131318] border border-[rgba(212,163,89,0.25)] p-8 rounded-3xl h-fit shadow-2xl">
          <h2 className="text-xl font-semibold mb-6 text-[#FDE6B0]">Personal Details</h2>
          <form onSubmit={handleSave} className="flex flex-col gap-5">
            <div>
              <label className="block text-sm text-[#A1A1AA] mb-2">Email</label>
              <input 
                type="email" 
                value={user.email || ''} 
                disabled 
                className="w-full bg-[#0B0B0E] border border-[rgba(212,163,89,0.2)] rounded-xl px-4 py-3 text-[#A1A1AA] cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm text-[#A1A1AA] mb-2">Full Name</label>
              <input 
                type="text" 
                value={name} 
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                className="w-full bg-[#0B0B0E] border border-[rgba(212,163,89,0.25)] rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#D4A359]/30 focus:border-[#F3C87A] transition-all placeholder:text-[#A1A1AA]/40"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-[#A1A1AA] mb-2">College</label>
              <input 
                type="text" 
                value={college} 
                onChange={(e) => setCollege(e.target.value)}
                placeholder="Enter your college name"
                className="w-full bg-[#0B0B0E] border border-[rgba(212,163,89,0.25)] rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#D4A359]/30 focus:border-[#F3C87A] transition-all placeholder:text-[#A1A1AA]/40"
                required
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="mt-4 w-full btn-gold font-bold py-3 px-4 rounded-xl transition-all shadow-lg shadow-[#D4A359]/20 disabled:opacity-50 disabled:cursor-not-allowed text-[#0B0B0E]"
            >
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
            <button
              type="button"
              onClick={logout}
              className="mt-2 w-full bg-red-950/40 border border-red-500/30 hover:bg-red-950/60 text-red-300 font-semibold py-3 px-4 rounded-xl transition-colors"
            >
              Logout
            </button>
          </form>
        </div>

        {/* Registered Events Section */}
        <div className="bg-[#131318] border border-[rgba(212,163,89,0.25)] p-8 rounded-3xl h-fit shadow-2xl">
          <h2 className="text-xl font-semibold mb-6 text-[#FDE6B0]">Registered Events</h2>
          
          {userData?.registeredEvents && userData.registeredEvents.length > 0 ? (
            <ul className="space-y-3">
              {userData.registeredEvents.map((eventId, index) => (
                <li key={index} className="bg-[#0B0B0E] border border-[rgba(212,163,89,0.2)] p-4 rounded-xl flex items-center justify-between hover:border-[rgba(212,163,89,0.4)] transition-colors group">
                  <span className="font-medium text-white/90">{eventId}</span> 
                  <span className="text-xs bg-[#3A270D] text-[#F3C87A] border border-[rgba(212,163,89,0.3)] px-3 py-1 rounded-full">Registered</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center py-12 text-[#A1A1AA] bg-[#0B0B0E] rounded-2xl border border-[rgba(212,163,89,0.2)]">
              <p>You haven&apos;t registered for any events yet.</p>
              <button 
                onClick={() => router.push('/events')}
                className="mt-4 text-sm text-[#F3C87A] hover:text-[#FDE6B0] underline font-medium cursor-pointer"
              >
                Browse Events
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
