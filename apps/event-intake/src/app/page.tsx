"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ShieldCheck, UserCheck, Loader2, AlertCircle } from "lucide-react";
import type { IDVResult } from "@inception/idv-engine";

export default function IntakeForm() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    socialLink: "",
    referredBy: "",
    selfieImage: "", // Base64 string of the image
  });
  const [status, setStatus] = useState<"idle" | "loading" | "approved" | "idv_required" | "error">("idle");
  const [resultData, setResultData] = useState<IDVResult | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, selfieImage: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    
    try {
      const res = await fetch("/api/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setResultData(data);
        if (data.status === "APPROVED") setStatus("approved");
        else if (data.status === "REQUIRES_IDV") setStatus("idv_required");
        else setStatus("error");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  };

  const inputClasses = "w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all";

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-background text-foreground font-sans relative overflow-hidden">
      {/* Decorative background glow */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-serif text-white mb-2">Private Event Intake</h1>
          <p className="text-white/60 text-sm">Please provide your details to request access.</p>
        </div>

        <motion.div 
          className="glass-panel p-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <AnimatePresence mode="wait">
            {status === "idle" || status === "loading" || status === "error" ? (
              <motion.form 
                key="form"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onSubmit={handleSubmit} 
                className="space-y-5"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-white/50 mb-1 uppercase tracking-wider">First Name</label>
                    <input required disabled={status === "loading"} type="text" className={inputClasses} value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs text-white/50 mb-1 uppercase tracking-wider">Last Name</label>
                    <input type="text" disabled={status === "loading"} className={inputClasses} value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-white/50 mb-1 uppercase tracking-wider">Email Address</label>
                  <input required disabled={status === "loading"} type="email" className={inputClasses} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                </div>

                <div>
                  <label className="block text-xs text-white/50 mb-1 uppercase tracking-wider">Phone Phone</label>
                  <input required disabled={status === "loading"} type="tel" className={inputClasses} value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                </div>

                <div>
                  <label className="block text-xs text-white/50 mb-1 uppercase tracking-wider">Referred By (Optional VIP)</label>
                  <input type="text" disabled={status === "loading"} className={inputClasses} placeholder="e.g. Justin" value={formData.referredBy} onChange={e => setFormData({...formData, referredBy: e.target.value})} />
                  <p className="text-[10px] text-white/40 mt-1">Known referrals expedite verification.</p>
                </div>

                <div>
                  <label className="block text-xs text-white/50 mb-1 uppercase tracking-wider">Quick Selfie (Optional Tier 1)</label>
                  <input type="file" accept="image/*" disabled={status === "loading"} className={inputClasses + " text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-accent file:text-white hover:file:bg-amber-500"} onChange={handleImageUpload} />
                  {formData.selfieImage && <span className="text-xs text-green-400 mt-2 inline-block">Image attached successfully.</span>}
                </div>

                {status === "error" && (
                   <div className="flex items-center gap-2 text-red-400 text-sm bg-red-400/10 p-3 rounded-lg border border-red-400/20">
                     <AlertCircle size={16} /> Something went wrong. Please try again.
                   </div>
                )}

                <button 
                  disabled={status === "loading"}
                  type="submit" 
                  className="w-full bg-accent hover:bg-amber-500 text-white font-medium py-3.5 rounded-lg transition-colors flex items-center justify-center gap-2 mt-4 disabled:opacity-50"
                >
                  {status === "loading" ? <Loader2 className="animate-spin" size={20} /> : "Submit Request"}
                </button>
              </motion.form>
            ) : status === "approved" ? (
              <motion.div 
                key="approved"
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8"
              >
                <div className="w-16 h-16 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto mb-6">
                  <UserCheck size={32} />
                </div>
                <h2 className="text-2xl font-serif text-white mb-2">Access Granted</h2>
                <p className="text-white/60 text-sm">Your risk score was beautifully low ({resultData?.riskScore}). A digital pass has been provisioned.</p>
              </motion.div>
            ) : (
              <motion.div 
                key="idv"
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8"
              >
                <div className="w-16 h-16 bg-accent/20 text-accent rounded-full flex items-center justify-center mx-auto mb-6">
                  <ShieldCheck size={32} />
                </div>
                <h2 className="text-2xl font-serif text-white mb-2">Verification Required</h2>
                <p className="text-white/60 text-sm mb-6">For security, unrecognized guests (Risk Score: {resultData?.riskScore}) must complete identity verification.</p>
                <div className="bg-black/40 rounded-lg p-4 mb-6 border border-white/5 text-left text-xs text-white/70">
                  <p className="mb-2"><strong>Applicant ID:</strong> {resultData?.sessionData?.applicantId}</p>
                  <p className="truncate"><strong>SDK Token:</strong> {resultData?.sessionData?.sdkToken}</p>
                </div>
                <button className="w-full bg-white text-black font-medium py-3 rounded-lg hover:bg-white/90 transition-colors flex items-center justify-center gap-2">
                  Launch Onfido Flow <ArrowRight size={16} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </main>
  );
}
