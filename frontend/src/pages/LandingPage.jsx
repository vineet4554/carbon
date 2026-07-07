import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Leaf, Bot, Compass, Award, Zap, FileText, ArrowRight, Shield, Sun, Moon
} from "lucide-react";

export default function LandingPage() {
  const [theme, setTheme] = useState("dark");

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const activeTheme = savedTheme || "dark";
    setTheme(activeTheme);
    document.documentElement.className = activeTheme;
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);
    document.documentElement.className = nextTheme;
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 100 } }
  };

  const features = [
    { name: "Habits Calculator", desc: "Instantly track emissions from daily transportation, food choice, and waste habits.", icon: Leaf, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { name: "Bill OCR Analyzer", desc: "Upload utility invoices. Our Gemini Vision model parses electricity draws and computes logs.", icon: Zap, color: "text-amber-500", bg: "bg-amber-500/10" },
    { name: "Room EcoVision", desc: "Audit appliance energy stars visually via picture captures to target power draws.", icon: FileText, color: "text-blue-500", bg: "bg-blue-500/10" },
    { name: "AI Sustainability Coach", desc: "Chat with your coaching bot regarding customized sustainability targets.", icon: Bot, color: "text-purple-500", bg: "bg-purple-500/10" },
    { name: "Carbon Twin Environment", desc: "Simulate offset goals inside a matching virtual carbon twin dashboard.", icon: Compass, color: "text-teal-500", bg: "bg-teal-500/10" },
    { name: "Gamified Challenges", desc: "Participate in daily zero-waste quests, earn XP, and unlock achievement badges.", icon: Award, color: "text-rose-500", bg: "bg-rose-500/10" }
  ];

  return (
    <div className="min-h-screen bg-background text-foreground antialiased selection:bg-emerald-500/30">
      {/* Top Header/Navbar */}
      <header className="fixed top-0 left-0 w-full z-50 px-6 py-4 border-b border-slate-200/80 dark:border-slate-800/20 bg-white/40 dark:bg-slate-950/20 backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-500 to-blue-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <span className="font-bold text-white text-base">E</span>
          </div>
          <div>
            <span className="font-bold text-base text-foreground tracking-tight block">EcoPilot</span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase tracking-widest font-bold block -mt-1">AI PLATFORM</span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            className="w-9 h-9 rounded-xl flex items-center justify-center border border-slate-200 dark:border-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-900/50 text-foreground transition-all cursor-pointer"
          >
            {theme === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-blue-500" />}
          </button>
          <Link
            to="/login"
            state={{ mode: "login" }}
            className="text-xs font-bold text-slate-500 hover:text-slate-950 dark:text-slate-400 dark:hover:text-foreground transition-colors px-3 py-2"
          >
            Sign In
          </Link>
          <Link
            to="/login"
            state={{ mode: "signup" }}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-md shadow-emerald-500/10"
          >
            Sign Up
          </Link>
        </div>
      </header>

      {/* Main content wrapper */}
      <main className="max-w-6xl mx-auto px-6 pt-28 pb-16 space-y-16">
        
        {/* Hero Section */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto space-y-6"
        >
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-tight text-foreground">
            Coordinate Your Path to <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-blue-500 glow-text">Net Zero</span>
          </h1>
          
          <p className="text-muted text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
            Unlock AI-driven carbon calculation, utility bill scanning, visual appliance audits, and conversational coaching to reduce your environmental footprint.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link 
              to="/login"
              state={{ mode: "signup" }}
              className="w-full sm:w-auto py-3 px-8 rounded-full text-white font-bold glow-btn text-xs flex items-center justify-center gap-2"
            >
              Get Started (Free)
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link 
              to="/login"
              state={{ mode: "login" }}
              className="w-full sm:w-auto py-3 px-8 rounded-full text-foreground bg-slate-900/10 hover:bg-slate-800/10 text-xs font-bold border border-slate-200 dark:border-slate-800/50 flex items-center justify-center gap-2"
            >
              Sign In
            </Link>
          </div>
        </motion.div>

      {/* Grid Features */}
      <div className="space-y-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground">Complete Sustainability Toolset</h2>
          <p className="text-muted text-xs mt-1">Harness advanced tools designed to monitor, model, and minimize emissions.</p>
        </div>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {features.map((feat, idx) => {
            const IconComp = feat.icon;
            return (
              <motion.div 
                key={idx}
                variants={itemVariants}
                className="glass-panel rounded-2xl p-6 space-y-4 flex flex-col justify-between glass-panel-hover"
              >
                <div className="space-y-3">
                  <div className={`w-10 h-10 rounded-xl ${feat.bg} flex items-center justify-center shadow-lg`}>
                    <IconComp className={`w-5 h-5 ${feat.color}`} />
                  </div>
                  <h3 className="font-bold text-foreground text-base">{feat.name}</h3>
                  <p className="text-xs text-muted leading-relaxed">{feat.desc}</p>
                </div>
                
                <Link 
                  to={idx === 1 ? "/bills" : idx === 2 ? "/rooms" : idx === 3 ? "/coach" : idx === 4 ? "/twin" : idx === 5 ? "/challenges" : "/calculator"}
                  className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:text-emerald-400 mt-4 transition-colors"
                >
                  Explore Feature
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      {/* Trust & Security Banner */}
      <div className="glass-panel rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-6 bg-gradient-to-r from-emerald-950/5 to-blue-950/5 border border-border">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h4 className="font-bold text-foreground text-sm">Security & Privacy First</h4>
            <p className="text-xs text-muted mt-0.5">Your invoices, images, and data logs are private and secure. All session interactions are encrypted.</p>
          </div>
        </div>
        
        <div className="text-xs font-semibold text-slate-500 border-l border-border pl-6 hidden md:block">
          <span>Compliant with GHG protocols.</span>
        </div>
      </div>

      </main>
    </div>
  );
}
