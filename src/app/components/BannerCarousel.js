"use client";

import { useState, useEffect, useCallback } from "react";

/* ────────────────────────────────────────────
   Icône étoile Kanveo (réutilisée partout)
──────────────────────────────────────────── */
function StarIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
      <path d="M12 2L14.09 8.26L21 9.27L16 14.14L17.18 21.02L12 17.77L6.82 21.02L8 14.14L3 9.27L9.91 8.26L12 2Z" />
    </svg>
  );
}

/* ────────────────────────────────────────────
   SLIDE 1 — Kanveo Ad (responsive)
──────────────────────────────────────────── */
function KanveoSlide() {
  return (
    <a
      href="https://kanveo.fr/ref/3HAW4BNP"
      target="_blank"
      rel="noopener noreferrer"
      className="block w-full"
    >
      {/* ── Desktop : Longboard 728×90 ── */}
      <div className="hidden md:flex items-center w-full max-w-[728px] mx-auto h-[90px] rounded-xl overflow-hidden bg-gradient-to-r from-indigo-600 via-purple-600 to-purple-700 px-6 gap-5 shadow-lg hover:shadow-xl transition-shadow duration-300">
        {/* Logo */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <div className="w-10 h-10 rounded-lg bg-white/15 flex items-center justify-center">
            <StarIcon size={20} />
          </div>
          <span className="text-white font-bold text-xl tracking-tight">Kanveo</span>
        </div>
        {/* Texte */}
        <div className="flex-1 min-w-0">
          <div className="text-white font-semibold text-[13px]">Le CRM de prospection pour indépendants & TPE</div>
          <div className="text-white/60 text-[11px] mt-0.5">Import SIRENE · Pipeline Kanban · Tâches · Clients & Finances</div>
        </div>
        {/* Prix + CTA */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="text-right">
            <div className="text-white/50 text-[11px] line-through">19€/mois</div>
            <div className="text-white font-bold text-lg">
              15€ <span className="text-white/60 text-[11px] font-normal">HT/mois</span>
            </div>
          </div>
          <span className="bg-white text-indigo-700 font-semibold text-[13px] px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors">
            Essayer →
          </span>
        </div>
      </div>

      {/* ── Mobile : Banner 320×50 ── */}
      <div className="flex md:hidden items-center w-full max-w-[320px] mx-auto h-[50px] rounded-lg overflow-hidden bg-gradient-to-r from-indigo-600 to-purple-600 px-3 gap-2.5 shadow-md">
        {/* Logo */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <div className="w-6 h-6 rounded bg-white/15 flex items-center justify-center">
            <StarIcon size={12} />
          </div>
          <span className="text-white font-bold text-xs">Kanveo</span>
        </div>
        {/* Texte */}
        <div className="flex-1 text-white/80 text-[10px] leading-tight min-w-0">
          CRM prospection<br />indépendants & TPE
        </div>
        {/* Prix + CTA */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-white font-bold text-[13px]">
            15€<span className="text-white/50 text-[9px]">/mois</span>
          </span>
          <span className="bg-white text-indigo-700 font-semibold text-[10px] px-2.5 py-1 rounded">
            Essayer
          </span>
        </div>
      </div>
    </a>
  );
}

/* ────────────────────────────────────────────
   SLIDE 1 bis — Kanveo Rectangle (fiche/sidebar)
──────────────────────────────────────────── */
function KanveoRectangle() {
  return (
    <a
      href="https://kanveo.fr/ref/3HAW4BNP"
      target="_blank"
      rel="noopener noreferrer"
      className="flex flex-col items-center justify-between w-full max-w-[300px] mx-auto h-[250px] rounded-xl overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-purple-800 p-5 shadow-lg hover:shadow-xl transition-shadow duration-300"
    >
      {/* Logo + badge */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
          <StarIcon size={16} />
        </div>
        <span className="text-white font-bold text-lg">Kanveo</span>
        <span className="bg-amber-400/20 text-amber-200 border border-amber-400/30 text-[9px] px-1.5 py-0.5 rounded-full">
          BETA
        </span>
      </div>

      {/* Texte + features */}
      <div className="text-center">
        <div className="text-white font-bold text-[15px] leading-tight">
          Le CRM de prospection<br />pour indépendants & TPE
        </div>
        <div className="flex flex-wrap justify-center gap-1 mt-2">
          {["SIRENE", "Kanban", "Tâches", "Finances"].map((tag) => (
            <span key={tag} className="text-[10px] bg-white/10 text-white/80 px-2 py-0.5 rounded-full">
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Prix + CTA */}
      <div className="flex flex-col items-center gap-2">
        <div className="flex items-baseline gap-2">
          <span className="text-white/40 text-[13px] line-through">19€</span>
          <span className="text-white font-bold text-2xl">15€</span>
          <span className="text-white/50 text-[11px]">HT/mois</span>
        </div>
        <span className="bg-white text-indigo-700 font-semibold text-[13px] px-6 py-2 rounded-lg hover:bg-gray-100 transition-colors">
          Commencer maintenant →
        </span>
      </div>
    </a>
  );
}

/* ────────────────────────────────────────────
   SLIDE 2 — Novel-Index CTA
──────────────────────────────────────────── */
function NovelIndexSlide({ variant, href }) {
  const url = href || "https://novel-index.com";
  if (variant === "rectangle") {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex flex-col items-center justify-center w-full max-w-[300px] mx-auto h-[250px] rounded-xl overflow-hidden bg-gradient-to-br from-indigo-950/60 to-purple-950/60 border border-indigo-500/20 hover:border-indigo-500/40 p-6 transition-all duration-300"
      >
        <div className="w-14 h-14 rounded-2xl bg-indigo-600/30 group-hover:bg-indigo-600/50 flex items-center justify-center mb-4 transition-colors">
          <svg className="w-7 h-7 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </div>
        <span className="text-indigo-300 group-hover:text-indigo-200 font-semibold text-center text-sm leading-relaxed transition-colors">
          Retrouvez toutes nos<br />sorties sur Novel-Index
        </span>
        <svg className="w-5 h-5 text-indigo-500 group-hover:text-indigo-400 mt-3 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      </a>
    );
  }

  // Variant inline (longboard / mobile)
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="block w-full"
    >
      {/* Desktop */}
      <div className="hidden md:flex group items-center justify-center gap-3 w-full max-w-[728px] mx-auto h-[90px] rounded-xl overflow-hidden bg-gradient-to-r from-indigo-950/40 to-purple-950/40 border border-indigo-500/20 hover:border-indigo-500/40 px-6 transition-all duration-300">
        <div className="w-10 h-10 rounded-lg bg-indigo-600/30 group-hover:bg-indigo-600/50 flex items-center justify-center transition-colors">
          <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </div>
        <span className="text-sm text-indigo-300 group-hover:text-indigo-200 font-medium transition-colors">
          Retrouvez toutes nos sorties sur Novel-Index
        </span>
        <svg className="w-4 h-4 text-indigo-500 group-hover:text-indigo-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      </div>

      {/* Mobile */}
      <div className="flex md:hidden group items-center justify-center gap-2 w-full max-w-[320px] mx-auto h-[50px] rounded-lg overflow-hidden bg-gradient-to-r from-indigo-950/40 to-purple-950/40 border border-indigo-500/20 hover:border-indigo-500/40 px-3 transition-all duration-300">
        <div className="w-6 h-6 rounded bg-indigo-600/30 group-hover:bg-indigo-600/50 flex items-center justify-center transition-colors flex-shrink-0">
          <svg className="w-3 h-3 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </div>
        <span className="text-[11px] text-indigo-300 group-hover:text-indigo-200 font-medium transition-colors">
          Nos sorties sur Novel-Index
        </span>
        <svg className="w-3 h-3 text-indigo-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      </div>
    </a>
  );
}

/* ────────────────────────────────────────────
   COMPOSANT PRINCIPAL — BannerCarousel
   
   Props :
     variant : "inline"    → longboard (desktop) + mobile (phone)
               "rectangle" → 300×250 pour fiches / sidebar
     interval : durée en ms entre les slides (défaut 8000)
──────────────────────────────────────────── */
export default function BannerCarousel({ variant = "inline", interval = 8000, novelIndexUrl }) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const totalSlides = 2;

  // Auto-rotation
  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % totalSlides);
    }, interval);
    return () => clearInterval(timer);
  }, [isPaused, interval]);

  const goToSlide = useCallback((index) => {
    setCurrentSlide(index);
  }, []);

  return (
    <div
      className="relative w-full"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      role="region"
      aria-label="Bannière publicitaire"
    >
      {/* Container des slides avec transition */}
      <div className="relative overflow-hidden">
        <div
          className="flex transition-transform duration-700 ease-in-out"
          style={{ transform: `translateX(-${currentSlide * 100}%)` }}
        >
          {/* Slide 1 : Kanveo */}
          <div className="w-full flex-shrink-0 flex items-center justify-center">
            {variant === "rectangle" ? <KanveoRectangle /> : <KanveoSlide />}
          </div>

          {/* Slide 2 : Novel-Index */}
          <div className="w-full flex-shrink-0 flex items-center justify-center">
            <NovelIndexSlide variant={variant} href={novelIndexUrl} />
          </div>
        </div>
      </div>

      {/* Indicateurs (dots) */}
      <div className="flex items-center justify-center gap-1.5 mt-3">
        {Array.from({ length: totalSlides }).map((_, i) => (
          <button
            key={i}
            onClick={() => goToSlide(i)}
            className={`rounded-full transition-all duration-300 ${
              currentSlide === i
                ? "w-5 h-1.5 bg-indigo-500"
                : "w-1.5 h-1.5 bg-gray-600 hover:bg-gray-500"
            }`}
            aria-label={`Aller à la diapositive ${i + 1}`}
          />
        ))}
      </div>

      {/* Label discret "Publicité" */}
      <div className="flex justify-center mt-1">
        <span className="text-[9px] text-gray-600 uppercase tracking-widest">Publicité</span>
      </div>
    </div>
  );
}
