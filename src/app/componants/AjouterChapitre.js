"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import Cookies from "js-cookie";
import dynamic from "next/dynamic";
import {
  htmlToStrapiBlocks,
  countWords,
  countChars,
} from "./strapiBlocksUtils";

const RichEditor = dynamic(() => import("./RichEditor"), { ssr: false });

// ─── Mini classification pour la preview ───
function classifyLine(text) {
  const trimmed = text.trim();
  if (!trimmed) return "empty";
  if (/^\[.+\]$/.test(trimmed)) return "game-badge";
  if (/^["«»\u201C\u201D\u00AB\u00BB]/.test(trimmed)) return "dialogue";
  if (/^[''\u2018\u2019]/.test(trimmed) && /[''\u2018\u2019]$/.test(trimmed))
    return "thought";
  if (
    trimmed.length < 40 &&
    (/^([A-ZÀ-Úa-zà-ú][a-zà-ú]*[.!]\s*){2,}$/.test(trimmed) ||
      /^[A-ZÀ-ÚÉÈ\s!?~*─—]+$/.test(trimmed) ||
      (/!{1,}$/.test(trimmed) && trimmed.length < 25) ||
      /^\.{3,}$/.test(trimmed) ||
      /^─+\s*!?$/.test(trimmed))
  )
    return "sfx";
  if (trimmed.length < 12 && /^[A-ZÀ-Úa-zà-ú]+[.!]+$/.test(trimmed))
    return "sfx";
  if (trimmed.length < 15 && /^[.…!?─—]+$/.test(trimmed)) return "sfx";
  if (
    trimmed.length < 100 &&
    /\?$/.test(trimmed) &&
    !/^["«»\u201C\u201D]/.test(trimmed)
  )
    return "thought";
  return "narration";
}

const CLASSIFICATION_STYLES = {
  dialogue: "pl-4 border-l-2 border-indigo-400/30 text-indigo-200 ml-2",
  thought: "italic opacity-90 pl-3 text-gray-400",
  sfx: "text-center font-bold tracking-wider text-white",
  "game-badge":
    "text-center font-mono font-semibold text-indigo-300 tracking-wide",
  narration: "text-gray-200",
  empty: "h-3",
};

const TYPE_LABELS = {
  dialogue: { label: "Dialogue", dot: "bg-blue-400" },
  thought: { label: "Pensée", dot: "bg-purple-400" },
  sfx: { label: "SFX", dot: "bg-amber-400" },
  "game-badge": { label: "Badge", dot: "bg-cyan-400" },
  narration: { label: "Narration", dot: "bg-gray-400" },
};

const DRAFT_KEY_PREFIX = "chapter-draft-";

const AjouterChapitre = ({
  oeuvreId,
  onClose,
  onChapitreAdded,
  oeuvreTitre,
}) => {
  const [titre, setTitre] = useState("");
  const [order, setOrder] = useState("");
  const [tome, setTome] = useState("");
  const [texte, setTexte] = useState("");
  const [pasteText, setPasteText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [activeTab, setActiveTab] = useState("editor"); // "editor" | "paste" | "preview"
  const [hasDraft, setHasDraft] = useState(false);

  const draftKey = `${DRAFT_KEY_PREFIX}${oeuvreId}`;
  const autoSaveTimer = useRef(null);

  // ─── Charger le prochain numéro d'ordre ───
  useEffect(() => {
    const fetchNextOrder = async () => {
      const jwt = Cookies.get("jwt");
      if (!jwt) return;
      try {
        const res = await fetch(
          `/api/proxy/chapitres?filters[oeuvres][documentId][$eq]=${oeuvreId}&sort=order:desc&pagination[limit]=1`,
          { headers: { Authorization: `Bearer ${jwt}` } }
        );
        const data = await res.json();
        const lastOrder = data.data?.[0]?.order || 0;
        setOrder(String(lastOrder + 1));
      } catch {
        setOrder("1");
      }
    };
    fetchNextOrder();
  }, [oeuvreId]);

  // ─── Charger le brouillon ───
  useEffect(() => {
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        const draft = JSON.parse(saved);
        if (draft.texte || draft.pasteText || draft.titre) {
          setHasDraft(true);
        }
      }
    } catch {}
  }, [draftKey]);

  const loadDraft = useCallback(() => {
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        const draft = JSON.parse(saved);
        if (draft.titre) setTitre(draft.titre);
        if (draft.order) setOrder(draft.order);
        if (draft.tome) setTome(draft.tome);
        if (draft.texte) setTexte(draft.texte);
        if (draft.pasteText) setPasteText(draft.pasteText);
        if (draft.activeTab) setActiveTab(draft.activeTab);
        setHasDraft(false);
        setMessage({ text: "Brouillon restauré", type: "success" });
        setTimeout(() => setMessage({ text: "", type: "" }), 2000);
      }
    } catch {}
  }, [draftKey]);

  const clearDraft = useCallback(() => {
    localStorage.removeItem(draftKey);
    setHasDraft(false);
  }, [draftKey]);

  // ─── Auto-save brouillon ───
  useEffect(() => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      const hasContent = texte.replace(/<[^>]+>/g, "").trim() || pasteText.trim() || titre.trim();
      if (hasContent) {
        try {
          localStorage.setItem(
            draftKey,
            JSON.stringify({ titre, order, tome, texte, pasteText, activeTab })
          );
        } catch {}
      }
    }, 2000);
    return () => clearTimeout(autoSaveTimer.current);
  }, [titre, order, tome, texte, pasteText, activeTab, draftKey]);

  // ─── Contenu effectif selon l'onglet ───
  const effectiveContent = useMemo(() => {
    if (activeTab === "paste" && pasteText.trim()) {
      return pasteText;
    }
    return texte;
  }, [activeTab, texte, pasteText]);

  // ─── Preview classifiée ───
  const previewBlocks = useMemo(() => {
    const raw = effectiveContent.replace(/<[^>]+>/g, "").trim();
    if (!raw) return [];
    return raw.split(/\n+/).map((line) => ({
      text: line.trim(),
      type: classifyLine(line.trim()),
    }));
  }, [effectiveContent]);

  // ─── Stats ───
  const words = useMemo(() => countWords(effectiveContent), [effectiveContent]);
  const chars = useMemo(() => countChars(effectiveContent), [effectiveContent]);

  // ─── Raccourcis clavier ───
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (!submitting) handleSubmit();
      }
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  // ─── Soumission ───
  const handleSubmit = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    setSubmitting(true);
    setMessage({ text: "", type: "" });

    const strapiBlocks = htmlToStrapiBlocks(effectiveContent);

    if (!titre || !order || strapiBlocks.length === 0) {
      setMessage({
        text: "Veuillez remplir le titre, l'ordre et le contenu.",
        type: "error",
      });
      setSubmitting(false);
      return;
    }

    const jwt = Cookies.get("jwt");
    if (!jwt) {
      setMessage({
        text: "JWT manquant. Veuillez vous reconnecter.",
        type: "error",
      });
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch(`/api/proxy/chapitres`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({
          data: {
            titre,
            order: parseInt(order, 10),
            tome: tome || null,
            texte: strapiBlocks,
            oeuvres: oeuvreId,
          },
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        console.error("Erreur ajout chapitre:", res.status, errData);
        setMessage({
          text: `Erreur lors de l'ajout (${res.status}).`,
          type: "error",
        });
        setSubmitting(false);
        return;
      }

      // ── Novel-index sync via route serveur ──
      try {
        const createData = await res.json();
        const documentId = createData.data?.documentId;
        const chapitreUrl = `https://trad-index.com/chapitre/${documentId}`;

        await fetch('/api/novel-index', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${jwt}`,
          },
          body: JSON.stringify({
            action: 'sync-chapitre',
            oeuvreTitre: oeuvreTitre,
            chapitreData: {
              titre,
              order: parseInt(order, 10),
              tome: tome || null,
              url: chapitreUrl,
            },
          }),
        });
      } catch (syncErr) {
        console.warn("Sync novel-index ignorée :", syncErr.message);
      }

      // Succès — supprimer le brouillon
      clearDraft();

      setMessage({
        text: `Chapitre "${titre}" ajouté ! (${strapiBlocks.length} blocs, ${words} mots)`,
        type: "success",
      });

      setTimeout(() => {
        if (onChapitreAdded) onChapitreAdded();
        onClose();
      }, 1500);
    } catch (error) {
      console.error("Erreur ajout chapitre:", error);
      setMessage({ text: "Une erreur réseau est survenue.", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Drag & drop pour fichiers .txt/.md ───
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (!file) return;
    const ext = file.name.split(".").pop().toLowerCase();
    if (ext === "txt" || ext === "md") {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setPasteText(ev.target.result);
        setActiveTab("paste");
        setMessage({
          text: `Fichier "${file.name}" chargé (${countWords(ev.target.result)} mots)`,
          type: "success",
        });
      };
      reader.readAsText(file);
    } else {
      setMessage({
        text: "Format non supporté ici. Utilisez « Import Word » pour les .docx.",
        type: "error",
      });
    }
  }, []);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div
        className="relative bg-gray-900 text-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col overflow-hidden"
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        {/* Drag overlay */}
        {dragOver && (
          <div className="absolute inset-0 z-50 bg-indigo-600/20 border-2 border-dashed border-indigo-400 rounded-2xl flex items-center justify-center backdrop-blur-sm">
            <div className="text-center">
              <svg className="w-16 h-16 text-indigo-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-lg font-semibold text-indigo-300">Déposez un fichier .txt ou .md</p>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-600/20 rounded-lg">
              <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold">Ajouter un chapitre</h2>
              <p className="text-xs text-gray-400">{oeuvreTitre || "Œuvre"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-3 text-xs text-gray-400 mr-2">
              <span>{words} mots</span>
              <span className="text-gray-700">•</span>
              <span>{chars} car.</span>
            </div>
            <div className="hidden lg:flex items-center gap-1 text-[10px] text-gray-600">
              <kbd className="px-1.5 py-0.5 bg-gray-800 rounded border border-gray-700 font-mono">Ctrl+S</kbd>
              <span>Sauver</span>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-800 hover:bg-red-600 text-gray-400 hover:text-white transition"
              aria-label="Fermer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Brouillon restauration */}
        {hasDraft && (
          <div className="mx-6 mt-4 flex items-center gap-3 p-3 rounded-xl bg-amber-950/30 border border-amber-500/30">
            <svg className="w-5 h-5 text-amber-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-amber-300 flex-1">Un brouillon non sauvegardé a été trouvé.</p>
            <button onClick={loadDraft} className="px-3 py-1 text-xs bg-amber-600 hover:bg-amber-500 rounded-lg font-medium transition">Restaurer</button>
            <button onClick={clearDraft} className="px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition">Ignorer</button>
          </div>
        )}

        {/* Message */}
        {message.text && (
          <div className={`mx-6 mt-4 p-3 rounded-xl text-sm font-medium flex items-center gap-2 ${
            message.type === "error"
              ? "bg-red-900/40 text-red-400 border border-red-800/50"
              : "bg-green-900/40 text-green-400 border border-green-800/50"
          }`}>
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={message.type === "error" ? "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" : "M5 13l4 4L19 7"} />
            </svg>
            {message.text}
          </div>
        )}

        {/* Contenu scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Métadonnées */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">Titre du chapitre *</label>
              <input type="text" value={titre} onChange={(e) => setTitre(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-gray-800 border border-gray-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 outline-none transition text-sm"
                placeholder="Ex: Chapitre 1 — Le Commencement" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">Ordre *</label>
              <input type="number" value={order} onChange={(e) => setOrder(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-gray-800 border border-gray-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 outline-none transition text-sm"
                placeholder="Auto" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">Tome</label>
              <input type="text" value={tome} onChange={(e) => setTome(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-gray-800 border border-gray-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 outline-none transition text-sm"
                placeholder="Optionnel" />
            </div>
          </div>

          {/* Tabs : Éditeur / Coller / Preview */}
          <div className="flex items-center gap-1 border-b border-gray-800">
            {[
              { key: "editor", label: "Éditeur riche", icon: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" },
              { key: "paste", label: "Coller du texte", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
              { key: "preview", label: "Aperçu lecteur", icon: "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" },
            ].map(({ key, label, icon }) => (
              <button key={key} onClick={() => setActiveTab(key)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${
                  activeTab === key ? "border-indigo-500 text-indigo-300" : "border-transparent text-gray-400 hover:text-gray-300"
                }`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={icon} />
                </svg>
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
            <a href="/documentation/editeur" target="_blank"
              className="ml-auto text-xs text-gray-600 hover:text-indigo-400 transition-colors flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Documentation
            </a>
          </div>

          {/* ─── Tab: Éditeur riche ─── */}
          {activeTab === "editor" && (
            <div>
              <RichEditor value={texte} onChange={setTexte} height={400} placeholder="Écrivez ou collez le contenu du chapitre..." />
            </div>
          )}

          {/* ─── Tab: Coller du texte ─── */}
          {activeTab === "paste" && (
            <div>
              <p className="text-xs text-gray-400 mb-2">
                Collez du texte brut, du HTML ou du Markdown. Chaque paragraphe sera converti en bloc Strapi.
              </p>
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                rows={18}
                className="w-full p-4 rounded-xl bg-gray-800/80 border border-gray-700 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all font-mono text-sm resize-none"
                placeholder={"Collez votre texte ici...\n\nChaque ligne vide sépare un paragraphe.\nLe HTML est aussi supporté (<p>, <strong>, etc.).\n\nVous pouvez aussi glisser-déposer un fichier .txt"}
              />
            </div>
          )}

          {/* ─── Tab: Preview (aperçu lecteur) ─── */}
          {activeTab === "preview" && (
            <div className="rounded-xl bg-gray-950 border border-gray-800 p-6 min-h-[300px]">
              {previewBlocks.length === 0 ? (
                <p className="text-gray-600 italic text-sm text-center py-10">
                  Rien à afficher. Écrivez ou collez du contenu dans un autre onglet.
                </p>
              ) : (
                <div className="max-w-3xl mx-auto space-y-1">
                  <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-800">
                    <span className="text-xs text-gray-400">
                      {previewBlocks.filter((b) => b.type !== "empty").length} blocs classifiés
                    </span>
                    <span className="text-gray-700">•</span>
                    <span className="text-xs text-gray-400">{words} mots</span>
                  </div>
                  {previewBlocks.map((block, i) => {
                    if (block.type === "empty") return <div key={i} className="h-3" />;
                    const cfg = TYPE_LABELS[block.type];
                    return (
                      <div key={i} className="flex items-start gap-3 group">
                        <div className="flex-shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-gray-800/80 border border-gray-700/50">
                            <span className={`w-1.5 h-1.5 rounded-full ${cfg?.dot}`} />
                            <span className="text-gray-400">{cfg?.label}</span>
                          </span>
                        </div>
                        <p className={`flex-1 text-[15px] leading-relaxed ${CLASSIFICATION_STYLES[block.type]}`}>{block.text}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer fixe */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-800 flex-shrink-0 bg-gray-900/95">
          <div className="flex items-center gap-3 text-xs text-gray-400 sm:hidden">
            <span>{words} mots</span>
          </div>
          <div className="flex items-center gap-3 ml-auto">
            <button type="button" onClick={onClose}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl font-medium transition border border-gray-700">
              Annuler
            </button>
            <button onClick={handleSubmit} disabled={submitting}
              className="flex items-center gap-2 px-5 py-2 bg-green-600 hover:bg-green-500 text-white rounded-xl font-semibold transition disabled:opacity-50 shadow-lg shadow-green-600/20">
              {submitting && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {submitting ? "Ajout en cours..." : "Ajouter le chapitre"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AjouterChapitre;
