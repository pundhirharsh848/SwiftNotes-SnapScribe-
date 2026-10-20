"use client";

import { motion } from "framer-motion";
import { ShieldCheck, Zap } from "lucide-react";
import Link from "next/link";
import HeroSection from "@/components/landing/HeroSection";
import SiteHeader from "@/components/layout/SiteHeader";
import FeatureShowcase from "@/components/landing/FeatureShowcase";
import PricingSection from "@/components/landing/PricingSection";
import TeamSection from "@/components/landing/TeamSection";

export default function LandingPage() {
  return (
    <div className="relative min-h-screen text-white selection:bg-primary/30" style={{ background: "#000" }}>

      {/* ─── HERO SECTION (full-bleed video, single viewport) ─── */}
      {/* HeroSection renders its own fixed video + viewport composition */}
      <HeroSection />

      {/* ─── ABOVE-FOLD SITE HEADER ─── */}
      {/* SiteHeader self-manages its fixed positioning & scroll-glass effect */}
      <SiteHeader />

      {/* ─── SCROLLABLE CONTENT (seamlessly connects immediately below hero stats) ─── */}
      <div className="relative z-10 pt-4 sm:pt-6">

        {/* Scroll backdrop — seamless gradient transparent (neutral black with alpha, not dark blue) */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            zIndex: -1,
            background:
              "linear-gradient(to bottom, transparent 0%, rgba(0, 0, 0, 0.3) 100px, rgba(0, 0, 0, 0.65) 500px, rgba(0, 0, 0, 0.88) 100%)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
          }}
        />

        {/* Elegant subtle glowing divider line connecting hero to features */}
        <div className="max-w-2xl mx-auto px-6 mb-12 sm:mb-16">
          <div className="h-px w-full bg-gradient-to-r from-transparent via-white/15 to-transparent" />
        </div>

        {/* --- FEATURE SHOWCASE SECTION --- */}
        <section className="px-6 pb-24 sm:pb-32 max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-end justify-between mb-20 gap-8">
            <div className="space-y-4 max-w-xl">
              <h2 className="text-4xl md:text-5xl font-display font-bold text-white tracking-tight">
                Everything you need to learn masterfully.
              </h2>
              <p className="text-lg text-white/50">
                We&apos;ve combined physical aesthetics with cloud-first intelligence.
              </p>
            </div>
            <div className="hidden lg:flex gap-12 text-sm font-bold text-white/30 uppercase tracking-widest">
              <div className="flex items-center gap-2"><Zap size={16} /> Fast Latency</div>
              <div className="flex items-center gap-2"><ShieldCheck size={16} /> Privacy First</div>
            </div>
          </div>
          <FeatureShowcase />
        </section>

        {/* --- STATS SECTION --- */}
        <section className="px-6 py-32 bg-white/[0.02] border-y border-white/5">
          <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-12 text-center">
            <div className="space-y-2">
              <p className="text-4xl md:text-5xl font-display font-black text-primary">150K+</p>
              <p className="text-xs font-bold text-white/40 uppercase tracking-widest">Notebooks Created</p>
            </div>
            <div className="space-y-2">
              <p className="text-4xl md:text-5xl font-display font-black text-accent">98%</p>
              <p className="text-xs font-bold text-white/40 uppercase tracking-widest">Student Retention</p>
            </div>
            <div className="space-y-2">
              <p className="text-4xl md:text-5xl font-display font-black text-white">10M+</p>
              <p className="text-xs font-bold text-white/40 uppercase tracking-widest">Doodles Drawn</p>
            </div>
            <div className="space-y-2">
              <p className="text-4xl md:text-5xl font-display font-black text-success">500+</p>
              <p className="text-xs font-bold text-white/40 uppercase tracking-widest">Universities</p>
            </div>
          </div>
        </section>

        {/* --- PRICING SECTION --- */}
        <section className="max-w-7xl mx-auto px-6">
          <PricingSection />
        </section>

        {/* --- TEAM SECTION --- */}
        <section className="max-w-7xl mx-auto px-6">
          <TeamSection />
        </section>

        {/* --- CTA SECTION --- */}
        <section className="py-24 px-6 md:py-48 max-w-5xl mx-auto text-center">
          <motion.div
            whileInView={{ scale: [0.95, 1], opacity: [0, 1] }}
            transition={{ duration: 0.8 }}
            className="glass-card p-12 md:p-24 rounded-[3rem] border border-white/10 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 blur-[100px] -translate-y-1/2 translate-x-1/2 rounded-full pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 blur-[100px] translate-y-1/2 -translate-x-1/2 rounded-full pointer-events-none" />

            <h2 className="text-4xl md:text-6xl font-display font-bold text-white mb-8 tracking-tighter">
              Ready to redefine <br /> how you study?
            </h2>
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
              <Link href="/dashboard">
                <button className="px-10 py-5 rounded-full bg-white text-black font-bold text-xl hover:bg-white/90 hover:scale-105 active:scale-95 transition-all">
                  Start for Free
                </button>
              </Link>
              <Link href="/docs" className="text-white/60 hover:text-white font-bold transition-all">
                Talk to a Specialist →
              </Link>
            </div>
          </motion.div>
        </section>

        {/* --- FOOTER --- */}
        <footer className="px-6 py-20 border-t border-white/5 bg-black/40 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto flex flex-col items-center">
            <div className="flex gap-12 text-sm font-bold text-white/40 uppercase tracking-tighter mb-12">
              <Link href="/" className="hover:text-primary transition-colors">Twitter</Link>
              <Link href="/" className="hover:text-primary transition-colors">GitHub</Link>
              <Link href="/" className="hover:text-primary transition-colors">Discord</Link>
              <Link href="/" className="hover:text-primary transition-colors">LinkedIn</Link>
            </div>
            <div className="text-center text-xs text-white/30 space-y-2">
              <p className="font-display font-black text-xl text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-300 to-zinc-600 mb-4">SwiftNotes</p>
              <p>&copy; {new Date().getFullYear()} ABESIT Team. All rights reserved.</p>
              <p className="max-w-md mx-auto">
                SwiftNotes is not just an app; it&apos;s a movement towards tactile, intelligent productivity
                for the next generation of knowledge workers.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
