"use client";
import { useState, useEffect } from "react";
import { User, Mail, Shield, Camera, Save, ArrowLeft, Loader2, Edit2, Check, UserIcon, Zap } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { api } from "@/lib/api";
import { updateProfile } from "firebase/auth";

interface UserProfile {
  display_name: string;
  bio: string;
  interests: string[];
}

export default function Profile({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile>({
    display_name: "",
    bio: "",
    interests: []
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState("");

  useEffect(() => {
    if (user) {
      setTempName(user.displayName || user.email?.split('@')[0] || "");
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const res = await fetch(api(`/api/user/profile/${user?.uid}`));
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
      }
    } catch (e) {
      console.error("Failed to fetch profile", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // 1. Update Firebase display name if changed
      if (user && tempName !== user.displayName) {
        await updateProfile(user, { displayName: tempName });
      }

      // 2. Update MongoDB profile
      const res = await fetch(api(`/api/user/profile/${user?.uid}`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...profile,
          display_name: tempName
        })
      });

      if (res.ok) {
        setProfile(prev => ({ ...prev, display_name: tempName }));
        alert("Profile updated successfully!");
      }
    } catch (e) {
      console.error("Failed to save profile", e);
      alert("Error saving profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-10 w-10 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-12">
          <button 
            onClick={onClose}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors font-bold group"
          >
            <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
            <span>Back to Dashboard</span>
          </button>
          <button 
            onClick={handleSave}
            disabled={saving}
            className="bg-primary text-white px-8 py-3 rounded-2xl font-black shadow-xl shadow-primary/20 hover:scale-105 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
            <span>{saving ? "SAVING..." : "SAVE CHANGES"}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Left Column: Avatar & Basic Info */}
          <div className="md:col-span-1 space-y-8">
            <div className="bg-white p-8 rounded-[3rem] shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col items-center text-center">
              <div className="relative group mb-6">
                <div className="w-32 h-32 rounded-[2.5rem] bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-4xl font-black shadow-2xl">
                  {tempName.charAt(0).toUpperCase()}
                </div>
                <button className="absolute -bottom-2 -right-2 bg-white p-3 rounded-2xl shadow-xl border border-slate-100 text-primary hover:scale-110 transition-all">
                  <Camera className="h-5 w-5" />
                </button>
              </div>

              <div className="w-full">
                {editingName ? (
                  <div className="flex items-center gap-2 mb-2">
                    <input 
                      type="text" 
                      value={tempName}
                      onChange={(e) => setTempName(e.target.value)}
                      className="w-full text-center font-black text-2xl text-slate-900 bg-slate-50 border-2 border-primary/20 rounded-xl py-1 outline-none focus:border-primary"
                      autoFocus
                      onBlur={() => setEditingName(false)}
                      onKeyDown={(e) => e.key === 'Enter' && setEditingName(false)}
                    />
                    <button onClick={() => setEditingName(false)} className="text-emerald-500">
                      <Check className="h-6 w-6" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-3 mb-2">
                    <h2 className="text-2xl font-black text-slate-900">{tempName}</h2>
                    <button onClick={() => setEditingName(true)} className="text-slate-300 hover:text-primary transition-colors">
                      <Edit2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
                <p className="text-slate-400 font-bold text-sm tracking-wide uppercase truncate px-4">{user?.email}</p>
              </div>
            </div>

            <div className="bg-white p-8 rounded-[3rem] shadow-xl shadow-slate-200/50 border border-slate-100 space-y-6">
              <div className="flex items-center gap-4 text-slate-700">
                <div className="bg-indigo-50 p-2.5 rounded-xl text-primary">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Verification</p>
                  <p className="font-bold text-emerald-500 flex items-center gap-1">
                    Verified <Check className="h-3 w-3" />
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Detailed Bio & Interests */}
          <div className="md:col-span-2 space-y-8">
            <div className="bg-white p-10 rounded-[4rem] shadow-xl shadow-slate-200/50 border border-slate-100">
              <h3 className="text-xl font-black text-slate-900 mb-8 flex items-center gap-3">
                <User className="h-6 w-6 text-primary" />
                Personal Biography
              </h3>
              <textarea 
                className="w-full min-h-[150px] bg-slate-50 border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-[2rem] p-8 outline-none font-medium text-slate-700 leading-relaxed transition-all text-lg placeholder:text-slate-300"
                placeholder="Tell us about yourself and your learning goals..."
                value={profile.bio}
                onChange={(e) => setProfile(prev => ({ ...prev, bio: e.target.value }))}
              />
            </div>

            <div className="bg-white p-10 rounded-[4rem] shadow-xl shadow-slate-200/50 border border-slate-100 text-left">
              <h3 className="text-xl font-black text-slate-900 mb-8 flex items-center gap-3">
                <img src="/logo.png" alt="EduStream Logo" className="h-6 w-6 object-contain" />
                Learning Interests
              </h3>
              <div className="flex flex-wrap gap-3">
                {["Artificial Intelligence", "Web Development", "Data Science", "Physics", "Philosophy", "Design"].map(interest => (
                  <button 
                    key={interest}
                    onClick={() => {
                      const current = profile.interests || [];
                      if (current.includes(interest)) {
                        setProfile(prev => ({ ...prev, interests: current.filter(i => i !== interest) }));
                      } else {
                        setProfile(prev => ({ ...prev, interests: [...current, interest] }));
                      }
                    }}
                    className={`px-6 py-3 rounded-2xl font-bold transition-all ${
                      (profile.interests || []).includes(interest)
                      ? "bg-primary text-white shadow-lg shadow-primary/20 scale-105"
                      : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                    }`}
                  >
                    {interest}
                  </button>
                ))}
              </div>
              <p className="text-slate-400 text-sm font-medium mt-6">* Select your favorite topics to personalize your dashboard.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
