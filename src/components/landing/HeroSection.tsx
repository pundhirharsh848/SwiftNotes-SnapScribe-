"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";

export default function HeroSection() {
  const statsRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const animated = useRef(false);

  const stats = [
    { glyph: "<", target: 120, decimals: 0, suffix: "ms", label: "Inference Time", delay: 0 },
    { glyph: "%", target: 99.99, decimals: 2, suffix: "%", label: "Platform Uptime", delay: 1 },
    { glyph: "*", target: 24, decimals: 0, suffix: "/7", label: "Autonomous Runtime", delay: 2 },
    { glyph: "#", target: 2.4, decimals: 1, suffix: "M", label: "Context Windows", delay: 3 },
  ];

  useEffect(() => {
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

    function runCountUp(valEl: Element, target: number, decimals: number, suffix: string, i: number) {
      const duration = 1500 + i * 80;
      const startOffset = 480 + i * 90;
      setTimeout(() => {
        const startTime = performance.now();
        function update(now: number) {
          const elapsed = now - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const current = target * easeOutCubic(progress);
          valEl.textContent = current.toFixed(decimals) + suffix;
          if (progress < 1) requestAnimationFrame(update);
          else valEl.textContent = target.toFixed(decimals) + suffix;
        }
        requestAnimationFrame(update);
      }, startOffset);
    }

    const container = statsRef.current;
    if (!container) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !animated.current) {
          animated.current = true;
          const valEls = container.querySelectorAll("[data-stat-val]");
          stats.forEach((stat, i) => {
            const el = valEls[i];
            if (el) runCountUp(el, stat.target, stat.decimals, stat.suffix, i);
          });
          observerRef.current?.disconnect();
        }
      },
      { threshold: 0.25 }
    );
    observerRef.current.observe(container);

    return () => observerRef.current?.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      {/* Fixed full-bleed background video */}
      <div className="hero-bg" aria-hidden="true">
        <video
          className="hero-bg-video"
          autoPlay
          muted
          loop
          playsInline
        >
          <source
            src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260809_012548_ef22562c-c0ae-4816-ad9d-f8922af4e6a7.mp4"
            type="video/mp4"
          />
        </video>
      </div>

      {/* Single-viewport hero composition */}
      <section className="hero-viewport" id="hero-home">
        {/* Hero content center */}
        <div className="hero-center">
          {/* SwiftNotes Brand Pill */}
          <div className="hero-trust-row hero-anim" style={{ "--d": "0.05s" } as React.CSSProperties}>
            <div className="hero-trust-pill">
              <span>SWIFTNOTES</span>
            </div>
          </div>

          {/* Headline */}
          <h1 className="hero-headline hero-anim hero-headline-parent">
            <span className="hero-headline-line hero-headline-line-1">
              Your Digital Canvas,
            </span>
            <span className="hero-headline-line hero-headline-line-2">
              Powered by AI.
            </span>
          </h1>

          {/* Subhead */}
          <p className="hero-subhead hero-anim" style={{ "--d": "0.28s" } as React.CSSProperties}>
            Experience glassmorphism notebooks with realistic physical page flips.
            Doodle, snap polaroids, and get instant answers from your smart AI sidebar.
          </p>

          {/* CTA */}
          <div className="hero-cta-wrap hero-anim" style={{ "--d": "0.4s" } as React.CSSProperties}>
            <Link href="/dashboard" className="hero-cta-btn">
              Get Started
            </Link>
          </div>
        </div>

        {/* Stats footer pinned to bottom of viewport */}
        <div className="hero-stats" ref={statsRef}>
          {stats.map((stat, i) => (
            <div
              key={stat.label}
              className="hero-stat-card hero-anim"
              style={{ "--d": `${0.5 + i * 0.08}s` } as React.CSSProperties}
            >
              <span className="hero-stat-glyph">{stat.glyph}</span>
              <div className="hero-stat-content">
                <span
                  className="hero-stat-val"
                  data-stat-val=""
                >
                  {stat.decimals > 0 ? stat.target.toFixed(stat.decimals) : stat.target}
                  {stat.suffix}
                </span>
                <span className="hero-stat-label">{stat.label}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
