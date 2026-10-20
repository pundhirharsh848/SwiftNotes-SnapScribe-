"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Menu, X, Rocket, Cpu, Newspaper, DollarSign, Book } from "lucide-react";
import Link from "next/link";
import { SignInButton, SignUpButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  {
    name: "Products",
    dropdown: [
      { name: "Digital Canvas", desc: "Our core physics-based physics engine.", icon: <Rocket size={16} />, href: "/#features" },
      { name: "AI Sidebar", desc: "Context-aware Gemini 2.5 assistance.", icon: <Cpu size={16} />, href: "/#ai" },
    ]
  },
  {
    name: "Solutions",
    dropdown: [
      { name: "For Students", desc: "Exam prep & flashcard generation.", icon: <Book size={16} />, href: "/docs" },
      { name: "For Teams", desc: "Real-time collaborative brainstorming.", icon: <Book size={16} />, href: "/docs" },
    ]
  },
  { name: "Docs", href: "/docs", icon: <Book size={16} /> },
  { name: "Blog", href: "/blog", icon: <Newspaper size={16} /> },
  { name: "Pricing", href: "/pricing", icon: <DollarSign size={16} /> },
];

export default function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header 
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300 px-4 sm:px-6 py-3 sm:py-4",
        scrolled 
          ? "bg-gradient-to-b from-black/90 via-black/80 to-black/70 backdrop-blur-xl border-b border-white/10 shadow-lg shadow-black/30" 
          : "bg-gradient-to-b from-black/80 via-black/35 to-transparent backdrop-blur-[2px]"
      )}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Logo Block (SwiftNotes) - Gradient Transparent Glass Pill */}
        <Link 
          href="/" 
          className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-white/[0.12] via-white/[0.06] to-white/[0.02] backdrop-blur-md border border-white/10 shadow-md shadow-black/20 group hover:border-white/25 hover:from-white/[0.16] transition-all"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-white via-zinc-200 to-black flex items-center justify-center font-black text-black shadow-md shadow-white/20 border border-white/40 group-hover:scale-105 transition-transform">
            S
          </div>
          <span className="text-lg sm:text-xl font-bold font-display bg-clip-text text-transparent bg-gradient-to-r from-white via-zinc-200 to-zinc-400 tracking-tight">
            SwiftNotes
          </span>
        </Link>

        {/* Desktop Nav Block (Product, Solutions, Docs, Blog, Pricing) - Gradient Transparent Glass Pill */}
        <nav className="hidden lg:flex items-center gap-7 px-6 py-2 rounded-full bg-gradient-to-r from-white/[0.08] via-white/[0.04] to-white/[0.08] backdrop-blur-md border border-white/10 shadow-md shadow-black/20">
          {NAV_LINKS.map(link => (
            <div 
              key={link.name} 
              className="relative"
              onMouseEnter={() => link.dropdown && setActiveDropdown(link.name)}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              <Link 
                href={link.href || "#"} 
                className="text-sm font-medium text-white/70 hover:text-white transition-colors flex items-center gap-1.5 py-1 hover:opacity-100"
              >
                {link.name}
                {link.dropdown && (
                  <ChevronDown size={14} className={cn("transition-transform duration-200 opacity-60", activeDropdown === link.name && "rotate-180 opacity-100")} />
                )}
              </Link>

              {/* Dropdown Menu */}
              <AnimatePresence>
                {link.dropdown && activeDropdown === link.name && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 p-2 bg-gradient-to-b from-black/95 via-black/90 to-black/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl"
                  >
                    {link.dropdown.map(item => (
                      <Link 
                        key={item.name} 
                        href={item.href}
                        className="flex items-start gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors group/item"
                      >
                        <div className="mt-1 w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-primary group-hover/item:bg-primary group-hover/item:text-white transition-colors">
                          {item.icon}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white">{item.name}</p>
                          <p className="text-[10px] text-white/40 leading-tight">{item.desc}</p>
                        </div>
                      </Link>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </nav>

        {/* Actions Block (Launch App / Log In / Get Started Side) - Gradient Transparent Glass Pill */}
        <div className="flex items-center gap-2 sm:gap-3 px-3 py-1.5 rounded-full bg-gradient-to-r from-white/[0.02] via-white/[0.06] to-white/[0.12] backdrop-blur-md border border-white/10 shadow-md shadow-black/20">
          <SignedOut>
            <div className="hidden sm:flex items-center gap-3">
              <SignInButton mode="modal">
                <button className="text-sm font-medium text-white/70 hover:text-white px-2 py-1 transition-colors">
                  Log In
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button className="px-4 py-1.5 rounded-full text-sm font-semibold bg-white text-black hover:bg-white/90 hover:scale-105 active:scale-95 transition-all shadow-sm">
                  Get Started
                </button>
              </SignUpButton>
            </div>
          </SignedOut>
          <SignedIn>
            <Link 
              href="/dashboard" 
              className="hidden sm:inline-flex items-center text-sm font-bold bg-gradient-to-r from-white via-zinc-200 to-zinc-300 text-black px-4 py-1.5 rounded-full border border-white/40 hover:from-white hover:to-white hover:scale-105 active:scale-95 transition-all shadow-md shadow-white/20"
            >
              Launch App
            </Link>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>

          {/* Mobile Menu Toggle */}
          <button 
            className="lg:hidden p-1.5 text-white/80 hover:text-white transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-black/95 backdrop-blur-2xl border-t border-white/10 overflow-hidden"
          >
            <div className="p-6 space-y-4">
              {NAV_LINKS.map(link => (
                <div key={link.name} className="space-y-2">
                  <p className="text-xs font-bold text-white/40 uppercase tracking-widest">{link.name}</p>
                  {link.dropdown ? (
                    <div className="grid grid-cols-1 gap-2 pl-2">
                      {link.dropdown.map(item => (
                        <Link key={item.name} href={item.href} className="text-sm text-white/70 hover:text-white flex items-center gap-2">
                          {item.icon} {item.name}
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <Link href={link.href || "#"} className="text-sm text-white hover:text-primary block pl-2 font-medium">
                      {link.name}
                    </Link>
                  )}
                </div>
              ))}
              <div className="pt-4 border-t border-white/10">
                <SignedOut>
                  <SignUpButton mode="modal">
                    <button className="w-full py-3 rounded-xl bg-primary text-white font-bold">Sign Up Free</button>
                  </SignUpButton>
                </SignedOut>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
