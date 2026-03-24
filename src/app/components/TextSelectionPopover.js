"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export default function TextSelectionPopover({ containerRef, themeStyles: t, oeuvreTitle, chapterTitle }) {
  const [selection, setSelection] = useState(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [copiedText, setCopiedText] = useState(false);
  const [highlights, setHighlights] = useState([]);
  const popoverRef = useRef(null);

  // Charger les surlignages depuis localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("reader-highlights");
      if (saved) setHighlights(JSON.parse(saved));
    } catch {}
  }, []);

  const handleMouseUp = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.toString().trim()) {
      // Petit délai pour permettre aux clics sur le popover
      setTimeout(() => {
        const sel2 = window.getSelection();
        if (!sel2 || sel2.isCollapsed) setSelection(null);
      }, 200);
      return;
    }

    // Vérifier que la sélection est dans le conteneur
    if (containerRef?.current && !containerRef.current.contains(sel.anchorNode)) return;

    const text = sel.toString().trim();
    if (text.length < 2) return;

    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    setSelection(text);
    setPosition({
      x: rect.left + rect.width / 2,
      y: rect.top + window.scrollY - 10,
    });
    setCopiedText(false);
  }, [containerRef]);

  useEffect(() => {
    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("touchend", handleMouseUp);
    return () => {
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("touchend", handleMouseUp);
    };
  }, [handleMouseUp]);

  const copyText = useCallback(() => {
    if (!selection) return;
    navigator.clipboard.writeText(selection).catch(() => {});
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 1500);
  }, [selection]);

  const highlightText = useCallback(() => {
    if (!selection) return;
    const newHighlights = [...highlights, { text: selection, date: Date.now() }];
    setHighlights(newHighlights);
    try {
      localStorage.setItem("reader-highlights", JSON.stringify(newHighlights));
    } catch {}
    setSelection(null);
  }, [selection, highlights]);

  const shareExtract = useCallback(() => {
    if (!selection) return;
    const shareText = `"${selection}"\n— ${oeuvreTitle}, ${chapterTitle}`;
    if (navigator.share) {
      navigator.share({ text: shareText, url: window.location.href }).catch(() => {});
    } else {
      navigator.clipboard.writeText(shareText).catch(() => {});
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 1500);
    }
    setSelection(null);
  }, [selection, oeuvreTitle, chapterTitle]);

  const searchDefinition = useCallback(() => {
    if (!selection) return;
    window.open(`https://fr.wiktionary.org/wiki/${encodeURIComponent(selection.split(/\s+/)[0])}`, "_blank");
    setSelection(null);
  }, [selection]);

  if (!selection) return null;

  return (
    <div
      ref={popoverRef}
      className={`fixed z-50 ${t.dropBg} border ${t.dropBorder} rounded-xl shadow-2xl animate-fade-in`}
      style={{
        left: `${Math.max(10, Math.min(position.x - 100, window.innerWidth - 210))}px`,
        top: `${position.y - 48}px`,
        transform: "translateY(-100%)",
      }}
    >
      <div className="flex items-center gap-0.5 p-1">
        {/* Copier */}
        <button
          onClick={copyText}
          className={`p-2 rounded-lg ${t.cardHover} transition-colors group`}
          title={copiedText ? "Copié !" : "Copier"}
        >
          {copiedText ? (
            <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className={`w-4 h-4 ${t.mutedText}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          )}
        </button>

        {/* Surligner */}
        <button
          onClick={highlightText}
          className={`p-2 rounded-lg ${t.cardHover} transition-colors`}
          title="Surligner"
        >
          <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>

        {/* Séparateur */}
        <div className={`w-px h-5 ${t.floatBorder}`} />

        {/* Définition */}
        <button
          onClick={searchDefinition}
          className={`p-2 rounded-lg ${t.cardHover} transition-colors`}
          title="Chercher la définition"
        >
          <svg className={`w-4 h-4 ${t.mutedText}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </button>

        {/* Partager l'extrait */}
        <button
          onClick={shareExtract}
          className={`p-2 rounded-lg ${t.cardHover} transition-colors`}
          title="Partager cet extrait"
        >
          <svg className={`w-4 h-4 ${t.mutedText}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
        </button>

        {/* Fermer */}
        <button
          onClick={() => { setSelection(null); window.getSelection()?.removeAllRanges(); }}
          className={`p-2 rounded-lg ${t.cardHover} transition-colors`}
          title="Fermer"
        >
          <svg className={`w-4 h-4 ${t.mutedText}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
