import React, { useState, useEffect } from "react";
import { User, Mail, Globe, Flame, Trophy, Award, Check, AlertCircle } from "lucide-react";
import { getBackendUrl, apiFetch, getAuthUser } from "../services/api";

export default function Profile() {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({
    points: 0,
    weekly_points: 0,
    monthly_points: 0,
    level: 1,
    xp_in_level: 0,
    badges: [],
    streak_current: 0,
    streak_longest: 0
  });

  const [formData, setFormData] = useState({
    full_name: "",
    country: "US",
    diet_preference: "omnivore",
    household_size: 1,
    has_car: false
  });

  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const fetchProfileAndStats = async () => {
    try {
      // 1. Fetch current user detail
      const meRes = await apiFetch(getBackendUrl("/auth/me"));
      if (meRes.ok) {
        const meData = await meRes.json();
        setUser(meData);
        setFormData({
          full_name: meData.full_name || "",
          country: meData.profile?.country || "US",
          diet_preference: meData.profile?.diet_preference || "omnivore",
          household_size: meData.profile?.household_size || 1,
          has_car: meData.profile?.has_car || false
        });
        // Update localStorage user details
        localStorage.setItem("user", JSON.stringify(meData));
      }

      // 2. Fetch gamification stats (includes streaks)
      const statsRes = await apiFetch(getBackendUrl("/gamification/stats"));
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
    } catch (err) {
      console.error("Failed to load profile details:", err);
      setError("Failed to retrieve profile data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileAndStats();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUpdating(true);
    setMessage(null);
    setError(null);

    try {
      const res = await apiFetch(getBackendUrl("/auth/profile"), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          full_name: formData.full_name,
          profile: {
            country: formData.country,
            diet_preference: formData.diet_preference,
            household_size: parseInt(formData.household_size, 10),
            has_car: formData.has_car
          }
        })
      });

      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        localStorage.setItem("user", JSON.stringify(data.user));
        setMessage("Profile preferences updated successfully!");
        fetchProfileAndStats();
      } else {
        const data = await res.json();
        throw new Error(data.detail || "Failed to update profile.");
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to update profile details.");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-slate-500 text-xs">Retrieving profile parameters...</div>;
  }

  const userInitial = formData.full_name ? formData.full_name.charAt(0).toUpperCase() : "U";

  return (
    <div className="space-y-8">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-extrabold text-foreground tracking-tight">User Profile</h1>
        <p className="text-muted text-xs mt-1.5">Manage your preferences, track daily streaks, and review ecological achievements.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Streaks, Badges & Level */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* User Details card */}
          <div className="glass-panel rounded-2xl p-6 text-center space-y-4">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-emerald-500 to-blue-600 flex items-center justify-center shadow-lg mx-auto">
              <span className="text-3xl font-black text-white">{userInitial}</span>
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-foreground">{formData.full_name || "EcoPilot Pioneer"}</h2>
              <span className="text-xs text-slate-500 block truncate">{user?.email}</span>
            </div>
          </div>

          {/* Activity Streaks Card */}
          <div className="glass-panel rounded-2xl p-6 space-y-6">
            <h3 className="font-bold text-foreground text-sm border-b border-slate-200/80 dark:border-slate-800 pb-2">Activity Streaks</h3>
            
            <div className="grid grid-cols-2 gap-4">
              {/* Daily Streak */}
              <div className="glass-panel rounded-xl p-4 flex flex-col items-center justify-center text-center space-y-2 border-emerald-500/10 bg-emerald-500/5 text-emerald-650 dark:text-emerald-400">
                <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                  <Flame className="w-5.5 h-5.5 text-orange-500 animate-pulse" />
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Current Streak</span>
                  <span className="text-2xl font-black text-foreground">{stats.streak_current || 0} {stats.streak_current === 1 ? "Day" : "Days"}</span>
                </div>
              </div>

              {/* Longest Streak */}
              <div className="glass-panel rounded-xl p-4 flex flex-col items-center justify-center text-center space-y-2 border-blue-500/10 bg-blue-500/5 text-blue-600 dark:text-blue-400">
                <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                  <Trophy className="w-5.5 h-5.5 text-amber-500" />
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Longest Streak</span>
                  <span className="text-2xl font-black text-foreground">{stats.streak_longest || 0} {stats.streak_longest === 1 ? "Day" : "Days"}</span>
                </div>
              </div>
            </div>

            <p className="text-[10px] text-slate-500 text-center leading-relaxed">
              💡 Log habits, upload energy bills, or chat with EcoPilot daily to increase your streak!
            </p>
          </div>

          {/* Gamification Level & Badges */}
          <div className="glass-panel rounded-2xl p-6 space-y-6">
            <h3 className="font-bold text-foreground text-sm border-b border-slate-200/80 dark:border-slate-800 pb-2">Gamification Status</h3>
            
            <div className="space-y-4">
              {/* Level indicator */}
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <Award className="w-5 h-5 text-emerald-500" />
                </div>
                <div className="space-y-1 w-full text-xs">
                  <span className="font-bold text-foreground block">Level {stats.level} Eco-Pioneer</span>
                  <div className="w-full h-2 bg-slate-200 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 transition-all duration-500" 
                      style={{ width: `${(stats.xp_in_level / 200) * 100}%` }}
                    />
                  </div>
                  <span className="text-[9px] text-slate-500 block font-semibold">{stats.xp_in_level} / 200 XP to next Level</span>
                </div>
              </div>

              {/* Total points */}
              <div className="flex justify-between items-center text-xs font-bold bg-slate-100/50 dark:bg-slate-950/20 p-2.5 rounded-xl border border-slate-200 dark:border-slate-900">
                <span className="text-slate-500">Cumulative Experience:</span>
                <span className="text-emerald-600 dark:text-emerald-400">{stats.points} XP</span>
              </div>

              {/* Unlocked Badges */}
              <div className="space-y-2">
                <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Unlocked Badges</span>
                {stats.badges?.length === 0 ? (
                  <span className="text-xs text-slate-500 italic block">No badges unlocked yet. Keep logging to earn points!</span>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {stats.badges?.map((badge, idx) => (
                      <span 
                        key={idx} 
                        className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold px-2 py-0.5 rounded-full"
                      >
                        🏅 {badge}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Profile Settings Form */}
        <div className="lg:col-span-2">
          <div className="glass-panel rounded-2xl p-6 space-y-6">
            <h3 className="font-bold text-foreground text-sm border-b border-slate-200/80 dark:border-slate-800 pb-2">Profile Preferences</h3>
            
            {message && (
              <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 p-3.5 rounded-xl text-xs font-bold">
                <Check className="w-4 h-4 shrink-0" />
                <span>{message}</span>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 p-3.5 rounded-xl text-xs font-bold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block" htmlFor="full_name">Full Name</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    id="full_name"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleChange}
                    required
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-foreground font-semibold placeholder-slate-400 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                    placeholder="Enter your name"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Country */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block" htmlFor="country">Country</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <Globe className="w-4 h-4" />
                    </div>
                    <select
                      id="country"
                      name="country"
                      value={formData.country}
                      onChange={handleChange}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-foreground font-semibold text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all appearance-none cursor-pointer"
                    >
                      <option value="US">United States (US)</option>
                      <option value="IN">India (IN)</option>
                      <option value="GB">United Kingdom (GB)</option>
                      <option value="CA">Canada (CA)</option>
                      <option value="DE">Germany (DE)</option>
                      <option value="FR">France (FR)</option>
                      <option value="AU">Australia (AU)</option>
                    </select>
                  </div>
                </div>

                {/* Diet Preference */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block" htmlFor="diet_preference">Diet Preference</label>
                  <select
                    id="diet_preference"
                    name="diet_preference"
                    value={formData.diet_preference}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-foreground font-semibold text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all cursor-pointer"
                  >
                    <option value="omnivore">Omnivore (Meat + Veggies)</option>
                    <option value="pescatarian">Pescatarian (Fish + Veggies)</option>
                    <option value="vegetarian">Vegetarian (No meat/fish)</option>
                    <option value="vegan">Vegan (100% plant-based)</option>
                  </select>
                </div>

                {/* Household Size */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block" htmlFor="household_size">Household Size</label>
                  <input
                    type="number"
                    id="household_size"
                    name="household_size"
                    min="1"
                    max="20"
                    value={formData.household_size}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-foreground font-semibold text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                  />
                </div>

                {/* Has Car Option */}
                <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 self-end h-[42px]">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Own a Personal Vehicle</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      name="has_car"
                      checked={formData.has_car}
                      onChange={handleChange}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 dark:bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>

              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={updating}
                className="w-full py-3 rounded-xl text-white font-bold glow-btn text-xs cursor-pointer flex items-center justify-center disabled:opacity-50"
              >
                {updating ? "Saving Changes..." : "Save Preferences"}
              </button>

            </form>
          </div>
        </div>

      </div>
    </div>
  );
}
