"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export default function TTSPlayer({ texte, themeStyles: t }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState("");
  const [rate, setRate] = useState(1);
  const [showControls, setShowControls] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [supported, setSupported] = useState(false);
  const utteranceRef = useRef(null);
  const paragraphsRef = useRef([]);

  // Extraire le texte brut des blocs
  useEffect(() => {
    if (!texte || !Array.isArray(texte)) return;
    const paragraphs = [];
    const extract = (blocks) => {
      for (const block of blocks) {
        if (block.children) {
          const text = block.children.map((c) => c.text || "").join("").trim();
          if (text) paragraphs.push(text);
        }
      }
    };
    extract(texte);
    paragraphsRef.current = paragraphs;
  }, [texte]);

  // Charger les voix disponibles
  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    setSupported(true);

    const loadVoices = () => {
      const available = speechSynthesis.getVoices();
      const frVoices = available.filter((v) => v.lang.startsWith("fr"));
      const allVoices = frVoices.length > 0 ? frVoices : available;
      setVoices(allVoices);
      if (allVoices.length > 0 && !selectedVoice) {
        setSelectedVoice(allVoices[0].name);
      }
    };

    loadVoices();
    speechSynthesis.addEventListener("voiceschanged", loadVoices);
    return () => speechSynthesis.removeEventListener("voiceschanged", loadVoices);
  }, []);

  const speakParagraph = useCallback(
    (index) => {
      if (index >= paragraphsRef.current.length) {
        setIsPlaying(false);
        setIsPaused(false);
        setCurrentIndex(0);
        return;
      }

      const utterance = new SpeechSynthesisUtterance(paragraphsRef.current[index]);
      utterance.rate = rate;
      const voice = voices.find((v) => v.name === selectedVoice);
      if (voice) utterance.voice = voice;
      utterance.lang = "fr-FR";

      utterance.onend = () => {
        const next = index + 1;
        setCurrentIndex(next);
        speakParagraph(next);
      };

      utterance.onerror = () => {
        setIsPlaying(false);
        setIsPaused(false);
      };

      utteranceRef.current = utterance;
      speechSynthesis.speak(utterance);
    },
    [rate, selectedVoice, voices]
  );

  const play = useCallback(() => {
    if (isPaused) {
      speechSynthesis.resume();
      setIsPaused(false);
      setIsPlaying(true);
      return;
    }
    speechSynthesis.cancel();
    setIsPlaying(true);
    setIsPaused(false);
    speakParagraph(currentIndex);
  }, [isPaused, currentIndex, speakParagraph]);

  const pause = useCallback(() => {
    speechSynthesis.pause();
    setIsPaused(true);
    setIsPlaying(false);
  }, []);

  const stop = useCallback(() => {
    speechSynthesis.cancel();
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentIndex(0);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        speechSynthesis.cancel();
      }
    };
  }, []);

  if (!supported || paragraphsRef.current.length === 0) return null;

  const progress = paragraphsRef.current.length > 0
    ? Math.round((currentIndex / paragraphsRef.current.length) * 100)
    : 0;

  return (
    <>
      {/* Bouton TTS flottant en bas à droite */}
      {!showControls && !isPlaying && !isPaused && (
        <button
          onClick={() => setShowControls(true)}
          className={`fixed bottom-20 right-6 z-40 w-10 h-10 ${t.scrollTopBg} border ${t.scrollTopBorder} rounded-full flex items-center justify-center ${t.btnText} transition-all shadow-lg`}
          title="Lecture audio"
          aria-label="Activer la lecture audio"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
          </svg>
        </button>
      )}

      {/* Barre de contrôle TTS */}
      {(showControls || isPlaying || isPaused) && (
        <div className={`fixed bottom-20 right-6 z-40 ${t.floatBg} border ${t.floatBorder} rounded-xl shadow-2xl backdrop-blur-sm animate-fade-in`} style={{ width: "280px" }}>
          {/* Header */}
          <div className={`flex items-center justify-between px-3 py-2 border-b ${t.floatBorder}`}>
            <span className={`text-xs font-medium ${t.titleText}`}>Lecture audio</span>
            <button
              onClick={() => { stop(); setShowControls(false); }}
              className={`p-1 rounded ${t.btnText} transition-colors`}
              aria-label="Fermer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Progression */}
          {(isPlaying || isPaused) && (
            <div className="px-3 pt-2">
              <div className={`w-full h-1 rounded-full ${t.progressBg}`}>
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${t.progressBar} transition-all duration-300`}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className={`text-[10px] ${t.dimText} mt-1`}>
                Paragraphe {currentIndex + 1} / {paragraphsRef.current.length}
              </p>
            </div>
          )}

          {/* Contrôles */}
          <div className="px-3 py-2 flex items-center gap-2">
            {/* Reculer */}
            <button
              onClick={() => { stop(); setCurrentIndex(Math.max(0, currentIndex - 1)); }}
              className={`w-8 h-8 rounded-full flex items-center justify-center ${t.btnText} transition-colors`}
              aria-label="Paragraphe précédent"
              disabled={currentIndex === 0 && !isPlaying}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            {/* Play / Pause */}
            <button
              onClick={isPlaying ? pause : play}
              className={`w-10 h-10 rounded-full flex items-center justify-center bg-indigo-600 hover:bg-indigo-500 text-white transition-colors`}
              aria-label={isPlaying ? "Pause" : "Lire"}
            >
              {isPlaying ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 9v6m4-6v6" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            {/* Stop */}
            <button
              onClick={stop}
              className={`w-8 h-8 rounded-full flex items-center justify-center ${t.btnText} transition-colors`}
              aria-label="Arrêter"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="6" width="12" height="12" rx="1" />
              </svg>
            </button>

            {/* Avancer */}
            <button
              onClick={() => {
                speechSynthesis.cancel();
                const next = Math.min(paragraphsRef.current.length - 1, currentIndex + 1);
                setCurrentIndex(next);
                if (isPlaying) speakParagraph(next);
              }}
              className={`w-8 h-8 rounded-full flex items-center justify-center ${t.btnText} transition-colors`}
              aria-label="Paragraphe suivant"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Vitesse */}
          <div className={`px-3 pb-2 flex items-center gap-2`}>
            <span className={`text-[10px] ${t.dimText} w-12`}>Vitesse</span>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.25"
              value={rate}
              onChange={(e) => setRate(Number(e.target.value))}
              className="flex-1 accent-indigo-500"
              aria-label="Vitesse de lecture"
            />
            <span className={`text-[10px] ${t.dimText} w-8 text-right`}>{rate}x</span>
          </div>

          {/* Voix */}
          {voices.length > 1 && (
            <div className={`px-3 pb-2`}>
              <select
                value={selectedVoice}
                onChange={(e) => setSelectedVoice(e.target.value)}
                className={`w-full text-xs rounded-lg px-2 py-1.5 ${t.settingBg} ${t.mutedText} border ${t.settingBorder} bg-transparent`}
                aria-label="Voix"
              >
                {voices.map((v) => (
                  <option key={v.name} value={v.name}>
                    {v.name} ({v.lang})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}
    </>
  );
}
