"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";

const ScanReader = ({ scan, oeuvreSlug, allScans }) => {
  const router = useRouter();
  const containerRef = useRef(null);
  const touchStartRef = useRef({ x: 0, y: 0 });

  const [zenMode, setZenMode] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [loadedImages, setLoadedImages] = useState(new Set());

  // Trier les pages par numero
  const sortedPages = useMemo(() => {
    if (!scan?.pages || !Array.isArray(scan.pages)) return [];
    return [...scan.pages].sort((a, b) => (a.numero || 0) - (b.numero || 0));
  }, [scan]);

  // Navigation entre scans
  const currentOrder = scan?.order ? Number(scan.order) : 0;
  const sortedScans = useMemo(() => {
    if (!allScans || !Array.isArray(allScans)) return [];
    return [...allScans].sort((a, b) => Number(a.order) - Number(b.order));
  }, [allScans]);

  const currentIndex = sortedScans.findIndex((s) => Number(s.order) === currentOrder);
  const prevScan = currentIndex > 0 ? sortedScans[currentIndex - 1] : null;
  const nextScan = currentIndex < sortedScans.length - 1 ? sortedScans[currentIndex + 1] : null;

  const navigateToScan = useCallback(
    (targetScan) => {
      if (targetScan) {
        router.push(`/oeuvre/${oeuvreSlug}/scan/${targetScan.order}`);
      }
    },
    [router, oeuvreSlug]
  );

  // Zen mode toggle
  const toggleZenMode = useCallback(() => setZenMode((prev) => !prev), []);

  // Scroll-to-top button
  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          setShowScrollTop(window.scrollY > 600);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && zenMode) {
        setZenMode(false);
      }
      if (e.key === "ArrowLeft" && prevScan) {
        navigateToScan(prevScan);
      }
      if (e.key === "ArrowRight" && nextScan) {
        navigateToScan(nextScan);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [zenMode, prevScan, nextScan, navigateToScan]);

  // Mobile swipe navigation (horizontal only)
  useEffect(() => {
    const handleTouchStart = (e) => {
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
    };
    const handleTouchEnd = (e) => {
      const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
      const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
      // Only trigger on horizontal swipes (not vertical scroll)
      if (Math.abs(dx) > 80 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        if (dx > 0 && prevScan) navigateToScan(prevScan);
        if (dx < 0 && nextScan) navigateToScan(nextScan);
      }
    };
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [prevScan, nextScan, navigateToScan]);

  // Marquer le scan comme lu dans localStorage
  useEffect(() => {
    if (scan?.documentId) {
      try {
        const readScans = JSON.parse(localStorage.getItem("readScans") || "{}");
        readScans[scan.documentId] = Date.now();
        localStorage.setItem("readScans", JSON.stringify(readScans));
      } catch {}
    }
  }, [scan?.documentId]);

  const handleImageLoad = useCallback((numero) => {
    setLoadedImages((prev) => {
      if (prev.has(numero)) return prev; // Éviter un re-render inutile
      const next = new Set(prev);
      next.add(numero);
      return next;
    });
  }, []);

  const getImageUrl = useCallback((page) => {
    if (!page?.image) return null;
    // Strapi v5 media: page.image peut être un objet avec url, ou formats
    const img = page.image;
    if (typeof img === "string") return img;
    // Préférer le format large > medium > l'original
    if (img.formats?.large?.url) return img.formats.large.url;
    if (img.formats?.medium?.url) return img.formats.medium.url;
    if (img.url) return img.url;
    return null;
  }, []);

  if (!scan) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-white text-xl">Scan introuvable.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black" ref={containerRef}>
      {/* Header */}
      {!zenMode && (
        <header className="sticky top-0 z-30 bg-gray-900/95 backdrop-blur border-b border-gray-800 px-4 py-3">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            {/* Retour */}
            <button
              onClick={() => router.back()}
              className="text-gray-300 hover:text-white transition text-sm"
              aria-label="Retour"
            >
              ← Retour
            </button>

            {/* Titre */}
            <h1 className="text-white font-bold text-lg truncate mx-4 text-center flex-1">
              {scan.titre || `Scan ${scan.order}`}
            </h1>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-sm hidden sm:inline">
                {sortedPages.length} page{sortedPages.length > 1 ? "s" : ""}
              </span>
              <button
                onClick={toggleZenMode}
                className="text-gray-300 hover:text-white transition px-2 py-1 text-sm border border-gray-600 rounded"
                aria-label="Mode zen"
                title="Mode zen (masquer l'interface)"
              >
                Zen
              </button>
            </div>
          </div>
        </header>
      )}

      {/* Images empilées verticalement — ZERO gap */}
      <div
        className="max-w-4xl mx-auto"
        style={{ fontSize: 0, lineHeight: 0 }}
      >
        {sortedPages.map((page, index) => {
          const url = getImageUrl(page);
          if (!url) return null;

          return (
            <div key={page.id || page.numero} style={{ margin: 0, padding: 0 }}>
              <img
                src={url}
                alt={`Page ${page.numero}`}
                loading={index < 3 ? "eager" : "lazy"}
                decoding="async"
                fetchPriority={index < 2 ? "high" : "low"}
                onLoad={() => handleImageLoad(page.numero)}
                style={{
                  width: "100%",
                  height: "auto",
                  display: "block",
                  margin: 0,
                  padding: 0,
                  border: "none",
                }}
              />
              {/* Placeholder pendant le chargement */}
              {!loadedImages.has(page.numero) && (
                <div
                  className="flex items-center justify-center bg-gray-900 text-gray-500"
                  style={{ width: "100%", minHeight: "200px" }}
                >
                  <span className="text-sm animate-pulse">Chargement page {page.numero}...</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Navigation bas de page */}
      <div className="max-w-4xl mx-auto px-4 py-8 flex flex-col items-center gap-4 bg-gray-900">
        <p className="text-gray-400 text-sm">
          Fin du scan — {sortedPages.length} page{sortedPages.length > 1 ? "s" : ""}
        </p>
        <div className="flex items-center gap-4">
          {prevScan && (
            <button
              onClick={() => navigateToScan(prevScan)}
              className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded transition"
            >
              ← Scan précédent
            </button>
          )}
          {nextScan && (
            <button
              onClick={() => navigateToScan(nextScan)}
              className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded transition"
            >
              Scan suivant →
            </button>
          )}
        </div>
        {!nextScan && (
          <p className="text-gray-300 text-center mt-2">
            Vous avez atteint le dernier scan disponible.
            <br />
            <button
              onClick={() => router.push(`/oeuvre/${oeuvreSlug}`)}
              className="text-blue-400 hover:underline mt-1 inline-block"
            >
              Retour à la fiche de l&apos;œuvre
            </button>
          </p>
        )}
      </div>

      {/* Scroll-to-top */}
      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-6 right-6 z-40 bg-gray-700 hover:bg-gray-600 text-white w-10 h-10 rounded-full shadow-lg flex items-center justify-center transition"
          aria-label="Retour en haut"
        >
          ▲
        </button>
      )}

      {/* Zen mode exit hint */}
      {zenMode && (
        <button
          onClick={() => setZenMode(false)}
          className="fixed top-4 right-4 z-50 bg-black/50 text-white/60 hover:text-white px-3 py-1 rounded text-sm transition"
          aria-label="Quitter le mode zen"
        >
          Échap pour quitter
        </button>
      )}
    </div>
  );
};

export default ScanReader;
