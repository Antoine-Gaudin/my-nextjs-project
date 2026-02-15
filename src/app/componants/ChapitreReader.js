"use client";

import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

// ─── Détection du type de contenu ───
function classifyLine(text) {
  const trimmed = text.trim();
  if (!trimmed) return "empty";

  // [Notification système] ou [Alerte]
  if (/^\[.+\]$/.test(trimmed)) return "game-badge";

  // Dialogue : commence par des guillemets
  if (/^["«»\u201C\u201D\u00AB\u00BB]/.test(trimmed)) return "dialogue";

  // Pensées entre apostrophes simples : 'texte'
  if (/^[''\u2018\u2019]/.test(trimmed) && /[''\u2018\u2019]$/.test(trimmed))
    return "thought";

  // Onomatopées / SFX : mots courts répétés (Huff. Huff., Heh. Heh., Boom!)
  if (
    trimmed.length < 40 &&
    (/^([A-ZÀ-Úa-zà-ú][a-zà-ú]*[.!]\s*){2,}$/.test(trimmed) ||
      /^[A-ZÀ-ÚÉÈ\s!?~*─—]+$/.test(trimmed) ||
      (/!{1,}$/.test(trimmed) && trimmed.length < 25) ||
      /^\.{3,}$/.test(trimmed) ||
      /^─+\s*!?$/.test(trimmed))
  )
    return "sfx";

  // Interjections courtes (Ohh., Tsk., Hmm., Heh.)
  if (trimmed.length < 12 && /^[A-ZÀ-Úa-zà-ú]+[.!]+$/.test(trimmed))
    return "sfx";

  // Ligne très courte type exclamation / réaction
  if (trimmed.length < 15 && /^[.…!?─—]+$/.test(trimmed)) return "sfx";

  // Pensées : question courte (pas un dialogue)
  if (
    trimmed.length < 100 &&
    /\?$/.test(trimmed) &&
    !/^["«»\u201C\u201D]/.test(trimmed)
  )
    return "thought";

  return "narration";
}

// ─── Parser HTML brut en blocs classifiés ───
function parseRawHtml(html) {
  const parts = html
    .replace(/<\/?(div|p)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .split("\n");

  const blocks = [];
  let consecutiveEmpties = 0;

  for (const part of parts) {
    const cleanText = part.replace(/<[^>]+>/g, "").trim();
    if (!cleanText) {
      consecutiveEmpties++;
      continue;
    }
    if (consecutiveEmpties >= 2) {
      blocks.push({ type: "scene-break", text: "" });
    } else if (consecutiveEmpties === 1 && blocks.length > 0) {
      blocks.push({ type: "spacing", text: "" });
    }
    consecutiveEmpties = 0;
    blocks.push({ type: classifyLine(cleanText), text: cleanText });
  }
  return blocks;
}

// ─── Rendu d'un bloc classifié ───
function ClassifiedBlock({ block, idx }) {
  switch (block.type) {
    case "scene-break":
      return (
        <div key={idx} className="scene-break" aria-hidden="true">
          <span>✦</span>
        </div>
      );
    case "spacing":
      return <div key={idx} className="h-3" />;
    case "game-badge":
      return <div key={idx} className="game-badge">{block.text}</div>;
    case "dialogue":
      return <p key={idx} className="dialogue">{block.text}</p>;
    case "sfx":
      return <p key={idx} className="sfx">{block.text}</p>;
    case "thought":
      return <p key={idx} className="thought">{block.text}</p>;
    case "narration":
    default:
      return <p key={idx} className="narration">{block.text}</p>;
  }
}

// ─── Composant de rendu riche du contenu ───
function RichContentRenderer({ texte, fontSize, fontFamily, contentClasses, contentCSSVars }) {
  if (!texte || !Array.isArray(texte)) {
    return <p className="text-gray-400 italic">Aucun contenu disponible.</p>;
  }

  const containsRawHtml = (children) => {
    if (!children || !Array.isArray(children)) return false;
    return children.some(
      (c) => c.type === "text" && c.text && /<(div|p|br)[\s>]/i.test(c.text)
    );
  };

  const extractRawText = (children) => {
    if (!children || !Array.isArray(children)) return "";
    return children.map((c) => c.text || "").join("");
  };

  const renderChildren = (children) => {
    if (!children || !Array.isArray(children)) return null;
    return children.map((child, i) => {
      if (child.type === "text") {
        let content = child.text || "";
        if (!content && !child.text === "") return null;

        let className = "";
        if (child.bold) className += " font-bold";
        if (child.italic) className += " italic";
        if (child.underline) className += " underline";
        if (child.strikethrough) className += " line-through";

        if (child.code) {
          return (
            <code key={i} className="px-1.5 py-0.5 bg-gray-800 rounded text-indigo-300 font-mono text-[0.9em]">
              {content}
            </code>
          );
        }
        if (className.trim()) {
          return <span key={i} className={className.trim()}>{content}</span>;
        }
        return <span key={i}>{content}</span>;
      }
      if (child.type === "link") {
        return (
          <a
            key={i}
            href={child.url || "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2 transition-colors"
          >
            {renderChildren(child.children)}
          </a>
        );
      }
      return null;
    });
  };

  const renderBlock = (block, index) => {
    const type = block.type;
    const children = block.children;

    if (type === "paragraph" && containsRawHtml(children)) {
      const rawHtml = extractRawText(children);
      const classifiedBlocks = parseRawHtml(rawHtml);
      return (
        <div key={index} className="smart-content">
          {classifiedBlocks.map((b, i) => (
            <ClassifiedBlock key={i} block={b} idx={i} />
          ))}
        </div>
      );
    }

    const isEmpty =
      !children ||
      children.length === 0 ||
      (children.length === 1 &&
        children[0].type === "text" &&
        (!children[0].text || children[0].text.trim() === ""));

    // Extraire le texte brut pour la classification
    const plainText = children
      ?.map((c) => c.text || "")
      .join("")
      .trim();

    switch (type) {
      case "paragraph": {
        if (isEmpty) return <div key={index} className="h-4" />;
        const lineType = classifyLine(plainText || "");
        return (
          <p key={index} className={lineType}>
            {renderChildren(children)}
          </p>
        );
      }
      case "heading": {
        const level = block.level || 2;
        const headingClasses = {
          1: "text-3xl font-bold mt-10 mb-5 text-white",
          2: "text-2xl font-bold mt-8 mb-4 text-white",
          3: "text-xl font-semibold mt-6 mb-3 text-white",
          4: "text-lg font-semibold mt-5 mb-2 text-white",
          5: "text-base font-semibold mt-4 mb-2 text-gray-100",
          6: "text-sm font-semibold mt-3 mb-1 text-gray-200 uppercase tracking-wide",
        };
        const HeadingTag = `h${level}`;
        return (
          <HeadingTag key={index} className={headingClasses[level] || headingClasses[2]}>
            {renderChildren(children)}
          </HeadingTag>
        );
      }
      case "list": {
        const ListTag = block.format === "ordered" ? "ol" : "ul";
        const listClass =
          block.format === "ordered"
            ? "list-decimal pl-6 mb-4 space-y-1"
            : "list-disc pl-6 mb-4 space-y-1";
        return (
          <ListTag key={index} className={listClass}>
            {children?.map((item, i) => (
              <li key={i} className="text-gray-200 leading-[1.8]">
                {renderChildren(item.children)}
              </li>
            ))}
          </ListTag>
        );
      }
      case "quote":
        return (
          <blockquote
            key={index}
            className="border-l-4 border-indigo-500/60 pl-5 py-3 mb-5 italic text-gray-300 bg-indigo-950/20 rounded-r-lg"
          >
            {renderChildren(children)}
          </blockquote>
        );
      case "code":
        return (
          <pre key={index} className="bg-gray-900 rounded-xl p-4 mb-5 overflow-x-auto border border-gray-800">
            <code className="text-sm font-mono text-green-300 leading-relaxed">
              {children?.map((c) => c.text).join("")}
            </code>
          </pre>
        );
      case "image":
        return (
          <figure key={index} className="my-8 flex flex-col items-center">
            <Image
              src={block.image?.url || block.url}
              alt={block.image?.alternativeText || block.caption || "Illustration"}
              width={800}
              height={600}
              className="rounded-xl max-w-full shadow-lg"
              loading="lazy"
            />
            {(block.caption || block.image?.caption) && (
              <figcaption className="text-sm text-gray-400 mt-3 italic">
                {block.caption || block.image?.caption}
              </figcaption>
            )}
          </figure>
        );
      default:
        if (children) {
          return (
            <p key={index} className="narration">
              {renderChildren(children)}
            </p>
          );
        }
        return null;
    }
  };

  // Filtrer les blocs vides consécutifs (ne garder qu'un seul espacement)
  const filteredTexte = useMemo(() => {
    const result = [];
    let lastWasEmpty = false;
    for (const block of texte) {
      const isEmptyBlock =
        block.type === "paragraph" &&
        (!block.children ||
          block.children.length === 0 ||
          (block.children.length === 1 &&
            block.children[0].type === "text" &&
            (!block.children[0].text || block.children[0].text.trim() === "")));
      // Filtrer les blocs dont le seul texte est "Drag"
      const isDragBlock =
        block.type === "paragraph" &&
        block.children?.length === 1 &&
        block.children[0].type === "text" &&
        block.children[0].text?.trim() === "Drag";
      if (isDragBlock) continue;
      if (isEmptyBlock) {
        if (lastWasEmpty) continue; // Skip consecutive empties
        lastWasEmpty = true;
      } else {
        lastWasEmpty = false;
      }
      result.push(block);
    }
    return result;
  }, [texte]);

  return (
    <div
      className={contentClasses || "chapter-content"}
      style={{
        fontSize: `${fontSize}px`,
        fontFamily:
          fontFamily === "serif"
            ? "'Merriweather', 'Georgia', 'Times New Roman', serif"
            : fontFamily === "mono"
            ? "'JetBrains Mono', 'Fira Code', 'Consolas', monospace"
            : "'Inter', system-ui, -apple-system, sans-serif",
        ...(contentCSSVars || {}),
      }}
    >
      {filteredTexte.map((block, index) => renderBlock(block, index))}
    </div>
  );
}

// ─── Composant lecteur de chapitre ───
export default function ChapitreReader({ chapitre, oeuvre, chapitres }) {
  const router = useRouter();

  // Préférences de lecture
  const [fontSize, setFontSize] = useState(18);
  const [fontFamily, setFontFamily] = useState("sans");
  const [lineHeight, setLineHeight] = useState(1.8);
  const [classificationEnabled, setClassificationEnabled] = useState(true);
  const [dialogueStyle, setDialogueStyle] = useState("border-left");
  const [thoughtStyle, setThoughtStyle] = useState("italic");
  const [colors, setColors] = useState({
    dialogue: "#c7d2fe",
    thought: "#a5b4c4",
    sfx: "#f9fafb",
    gameBadge: "#a5b4fc",
    narration: "#e5e7eb",
  });
  const [showSettings, setShowSettings] = useState(false);
  const [showChapterList, setShowChapterList] = useState(false);
  const [settingsTab, setSettingsTab] = useState("general");

  // Progression de lecture
  const [readingProgress, setReadingProgress] = useState(0);
  const [showHeader, setShowHeader] = useState(true);
  const lastScrollY = useRef(0);
  const contentRef = useRef(null);
  const settingsRef = useRef(null);
  const chapterListRef = useRef(null);

  const oeuvreDocId = oeuvre?.documentId;
  const coverUrl = oeuvre?.couverture?.[0]?.url;
  const oeuvreTitle = oeuvre?.titre || "Œuvre";
  const chapterTitle = chapitre.titre || "Sans titre";

  // Dédupliquer et trier les chapitres numériquement
  const sortedChapitres = useMemo(() => {
    const seen = new Set();
    return chapitres
      .filter((c) => {
        const key = c.order;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => Number(a.order) - Number(b.order));
  }, [chapitres]);

  // Charger les préférences
  useEffect(() => {
    try {
      const saved = localStorage.getItem("reader-prefs");
      if (saved) {
        const prefs = JSON.parse(saved);
        if (prefs.fontSize) setFontSize(prefs.fontSize);
        if (prefs.fontFamily) setFontFamily(prefs.fontFamily);
        if (prefs.lineHeight) setLineHeight(prefs.lineHeight);
        if (prefs.classificationEnabled !== undefined) setClassificationEnabled(prefs.classificationEnabled);
        if (prefs.dialogueStyle) setDialogueStyle(prefs.dialogueStyle);
        if (prefs.thoughtStyle) setThoughtStyle(prefs.thoughtStyle);
        if (prefs.colors) setColors(prev => ({ ...prev, ...prefs.colors }));
      }
    } catch (e) {}
  }, []);

  // Sauvegarder les préférences
  useEffect(() => {
    try {
      localStorage.setItem("reader-prefs", JSON.stringify({
        fontSize, fontFamily, lineHeight, classificationEnabled,
        dialogueStyle, thoughtStyle, colors,
      }));
    } catch (e) {}
  }, [fontSize, fontFamily, lineHeight, classificationEnabled, dialogueStyle, thoughtStyle, colors]);

  // Classes CSS dynamiques pour le conteneur chapter-content
  const contentClasses = useMemo(() => {
    const cls = ["chapter-content"];
    if (!classificationEnabled) cls.push("no-classification");
    if (dialogueStyle === "italic") cls.push("dialogue-style-italic");
    if (dialogueStyle === "highlighted") cls.push("dialogue-style-highlighted");
    if (thoughtStyle === "dimmed") cls.push("thought-style-dimmed");
    if (thoughtStyle === "border") cls.push("thought-style-border");
    return cls.join(" ");
  }, [classificationEnabled, dialogueStyle, thoughtStyle]);

  // CSS variables inline pour les couleurs personnalisées
  const contentCSSVars = useMemo(() => ({
    "--reader-line-height": lineHeight,
    "--reader-narration-color": colors.narration,
    "--reader-dialogue-color": colors.dialogue,
    "--reader-dialogue-border": colors.dialogue + "4D",
    "--reader-thought-color": colors.thought,
    "--reader-sfx-color": colors.sfx,
    "--reader-badge-color": colors.gameBadge,
    "--reader-badge-dot": colors.gameBadge,
  }), [lineHeight, colors]);

  // Index du chapitre courant (dans la liste dédupliquée)
  const currentIndex = useMemo(() => {
    return sortedChapitres.findIndex((c) => c.documentId === chapitre.documentId);
  }, [sortedChapitres, chapitre.documentId]);

  const prevChapter = currentIndex > 0 ? sortedChapitres[currentIndex - 1] : null;
  const nextChapter = currentIndex < sortedChapitres.length - 1 ? sortedChapitres[currentIndex + 1] : null;

  // Navigation vers un chapitre
  const navigateTo = useCallback(
    (chap) => {
      window.scrollTo({ top: 0, behavior: "instant" });
      if (oeuvreDocId && chap.order) {
        router.push(`/oeuvre/${oeuvreDocId}/chapitre/${chap.order}`);
      } else {
        router.push(`/chapitre/${chap.documentId}`);
      }
    },
    [router, oeuvreDocId]
  );

  // Scroll to top quand le chapitre change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [chapitre.documentId]);

  // Tracking de la vue (timer 10s pour éviter les bots)
  useEffect(() => {
    if (!chapitre.documentId || !oeuvreDocId) return;
    const timer = setTimeout(() => {
      fetch("/api/tracking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "vue",
          cibleType: "chapitre",
          cibleId: chapitre.documentId,
          oeuvreId: oeuvreDocId,
        }),
      }).catch(() => {});
    }, 10000);
    return () => clearTimeout(timer);
  }, [chapitre.documentId, oeuvreDocId]);

  // Navigation clavier
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      if (e.key === "ArrowRight" && nextChapter) navigateTo(nextChapter);
      if (e.key === "ArrowLeft" && prevChapter) navigateTo(prevChapter);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [nextChapter, prevChapter, navigateTo]);

  // Progression de lecture & visibilité du header
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? Math.min((scrollTop / docHeight) * 100, 100) : 0;
      setReadingProgress(progress);
      if (scrollTop > lastScrollY.current && scrollTop > 100) {
        setShowHeader(false);
      } else {
        setShowHeader(true);
      }
      lastScrollY.current = scrollTop;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Fermer les dropdowns au clic extérieur
  useEffect(() => {
    const handleClick = (e) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target)) {
        setShowSettings(false);
      }
      if (chapterListRef.current && !chapterListRef.current.contains(e.target)) {
        setShowChapterList(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* ─── Barre de progression de lecture ─── */}
      <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-gray-900">
        <div
          className="h-full bg-gradient-to-r from-indigo-600 to-purple-500 transition-all duration-150 ease-out"
          style={{ width: `${readingProgress}%` }}
        />
      </div>

      {/* ─── Header sticky ─── */}
      <header
        className={`fixed top-1 left-0 right-0 z-40 transition-transform duration-300 ${
          showHeader ? "translate-y-0" : "-translate-y-full"
        }`}
      >
        <div className="bg-gray-900/95 backdrop-blur-md border-b border-gray-800">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
            {/* Gauche : retour + infos */}
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => router.push("/oeuvres")}
                className="flex-shrink-0 p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-white"
                title="Retour au catalogue"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <div className="min-w-0">
                <p className="text-xs text-gray-400 truncate">{oeuvreTitle}</p>
                <p className="text-sm font-medium text-white truncate">{chapterTitle}</p>
              </div>
            </div>

            {/* Droite : actions */}
            <div className="flex items-center gap-1">
              {/* Sélecteur de chapitre */}
              <div className="relative" ref={chapterListRef}>
                <button
                  onClick={() => {
                    setShowChapterList(!showChapterList);
                    setShowSettings(false);
                  }}
                  className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-white"
                  title="Liste des chapitres"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                </button>
                {showChapterList && (
                  <div className="absolute right-0 mt-2 w-72 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl max-h-80 overflow-y-auto no-scrollbar animate-fade-in">
                    <div className="p-3 border-b border-gray-700 sticky top-0 bg-gray-800 z-10">
                      <p className="text-sm font-semibold text-white">Chapitres ({sortedChapitres.length})</p>
                    </div>
                    {sortedChapitres.map((chap) => (
                      <button
                        key={chap.documentId}
                        onClick={() => {
                          navigateTo(chap);
                          setShowChapterList(false);
                        }}
                        className={`w-full text-left px-4 py-3 hover:bg-gray-700 transition-colors flex items-center gap-3 ${
                          chap.documentId === chapitre.documentId
                            ? "bg-indigo-600/20 border-l-2 border-indigo-500"
                            : ""
                        }`}
                      >
                        <span
                          className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                            chap.documentId === chapitre.documentId
                              ? "bg-indigo-600 text-white"
                              : "bg-gray-700 text-gray-400"
                          }`}
                        >
                          {chap.order}
                        </span>
                        <span
                          className={`text-sm truncate ${
                            chap.documentId === chapitre.documentId
                              ? "text-indigo-300 font-medium"
                              : "text-gray-300"
                          }`}
                        >
                          {chap.titre}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Paramètres de lecture */}
              <div className="relative" ref={settingsRef}>
                <button
                  onClick={() => {
                    setShowSettings(!showSettings);
                    setShowChapterList(false);
                  }}
                  className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-white"
                  title="Paramètres de lecture"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                </button>
                {showSettings && (
                  <div className="absolute right-0 mt-2 w-80 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl animate-fade-in max-h-[70vh] overflow-y-auto no-scrollbar">
                    {/* Header avec onglets */}
                    <div className="sticky top-0 bg-gray-800 z-10 border-b border-gray-700">
                      <div className="flex items-center justify-between px-4 pt-3 pb-1">
                        <p className="text-sm font-semibold text-white">Paramètres de lecture</p>
                        <a href="/documentation/editeur" target="_blank" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                          Documentation
                        </a>
                      </div>
                      <div className="flex px-2 pb-1">
                        {[
                          { key: "general", label: "Général" },
                          { key: "classification", label: "Classification" },
                          { key: "couleurs", label: "Couleurs" },
                        ].map(({ key, label }) => (
                          <button
                            key={key}
                            onClick={() => setSettingsTab(key)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                              settingsTab === key
                                ? "bg-indigo-600/20 text-indigo-300"
                                : "text-gray-400 hover:text-gray-300"
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="p-4">
                      {/* ─── Onglet Général ─── */}
                      {settingsTab === "general" && (
                        <div className="space-y-5">
                          {/* Taille de police */}
                          <div>
                            <label className="text-xs text-gray-400 mb-2 block">
                              Taille du texte : {fontSize}px
                            </label>
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => setFontSize(Math.max(14, fontSize - 2))}
                                className="w-8 h-8 rounded-lg bg-gray-700 hover:bg-gray-600 flex items-center justify-center text-white transition-colors"
                              >
                                <span className="text-xs font-bold">A-</span>
                              </button>
                              <input type="range" min="14" max="28" step="2" value={fontSize}
                                onChange={(e) => setFontSize(Number(e.target.value))}
                                className="flex-1 accent-indigo-500" />
                              <button
                                onClick={() => setFontSize(Math.min(28, fontSize + 2))}
                                className="w-8 h-8 rounded-lg bg-gray-700 hover:bg-gray-600 flex items-center justify-center text-white transition-colors"
                              >
                                <span className="text-sm font-bold">A+</span>
                              </button>
                            </div>
                          </div>

                          {/* Interligne */}
                          <div>
                            <label className="text-xs text-gray-400 mb-2 block">
                              Interligne : {lineHeight.toFixed(1)}
                            </label>
                            <input type="range" min="1.4" max="2.4" step="0.1" value={lineHeight}
                              onChange={(e) => setLineHeight(Number(e.target.value))}
                              className="w-full accent-indigo-500" />
                            <div className="flex justify-between text-[10px] text-gray-600 mt-1">
                              <span>Dense</span><span>Aéré</span>
                            </div>
                          </div>

                          {/* Police */}
                          <div>
                            <label className="text-xs text-gray-400 mb-2 block">Police</label>
                            <div className="grid grid-cols-3 gap-2">
                              {[
                                { key: "sans", label: "Sans", preview: "Aa" },
                                { key: "serif", label: "Serif", preview: "Aa" },
                                { key: "mono", label: "Mono", preview: "Aa" },
                              ].map(({ key, label, preview }) => (
                                <button
                                  key={key}
                                  onClick={() => setFontFamily(key)}
                                  className={`p-2 rounded-lg border text-center transition-all ${
                                    fontFamily === key
                                      ? "bg-indigo-600/20 border-indigo-500 text-indigo-300"
                                      : "bg-gray-700 border-gray-600 text-gray-400 hover:border-gray-500"
                                  }`}
                                >
                                  <span className="block text-lg" style={{
                                    fontFamily: key === "serif" ? "Georgia, serif" : key === "mono" ? "monospace" : "system-ui, sans-serif",
                                  }}>{preview}</span>
                                  <span className="text-xs">{label}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* ─── Onglet Classification ─── */}
                      {settingsTab === "classification" && (
                        <div className="space-y-5">
                          {/* Toggle classification */}
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-white font-medium">Classification active</p>
                              <p className="text-xs text-gray-400">Style visuel par type de contenu</p>
                            </div>
                            <button
                              onClick={() => setClassificationEnabled(!classificationEnabled)}
                              className={`relative w-11 h-6 rounded-full transition-colors ${
                                classificationEnabled ? "bg-indigo-600" : "bg-gray-600"
                              }`}
                            >
                              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow ${
                                classificationEnabled ? "translate-x-5" : ""
                              }`} />
                            </button>
                          </div>

                          {classificationEnabled && (
                            <>
                              {/* Style dialogue */}
                              <div>
                                <label className="text-xs text-gray-400 mb-2 block">Style des dialogues</label>
                                <div className="grid grid-cols-3 gap-2">
                                  {[
                                    { key: "border-left", label: "Bordure", icon: "┃" },
                                    { key: "italic", label: "Italique", icon: "𝑖" },
                                    { key: "highlighted", label: "Surligné", icon: "█" },
                                  ].map(({ key, label, icon }) => (
                                    <button
                                      key={key}
                                      onClick={() => setDialogueStyle(key)}
                                      className={`p-2 rounded-lg border text-center transition-all ${
                                        dialogueStyle === key
                                          ? "bg-blue-600/20 border-blue-500 text-blue-300"
                                          : "bg-gray-700 border-gray-600 text-gray-400 hover:border-gray-500"
                                      }`}
                                    >
                                      <span className="block text-base mb-0.5">{icon}</span>
                                      <span className="text-[10px]">{label}</span>
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* Style pensées */}
                              <div>
                                <label className="text-xs text-gray-400 mb-2 block">Style des pensées</label>
                                <div className="grid grid-cols-3 gap-2">
                                  {[
                                    { key: "italic", label: "Italique", icon: "𝑖" },
                                    { key: "dimmed", label: "Atténué", icon: "◌" },
                                    { key: "border", label: "Bordure", icon: "┆" },
                                  ].map(({ key, label, icon }) => (
                                    <button
                                      key={key}
                                      onClick={() => setThoughtStyle(key)}
                                      className={`p-2 rounded-lg border text-center transition-all ${
                                        thoughtStyle === key
                                          ? "bg-purple-600/20 border-purple-500 text-purple-300"
                                          : "bg-gray-700 border-gray-600 text-gray-400 hover:border-gray-500"
                                      }`}
                                    >
                                      <span className="block text-base mb-0.5">{icon}</span>
                                      <span className="text-[10px]">{label}</span>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      )}

                      {/* ─── Onglet Couleurs ─── */}
                      {settingsTab === "couleurs" && (
                        <div className="space-y-3">
                          <p className="text-xs text-gray-400 mb-2">Personnalisez la couleur de chaque type de contenu</p>
                          {[
                            { key: "dialogue", label: "Dialogue", dot: "bg-blue-400" },
                            { key: "thought", label: "Pensées", dot: "bg-purple-400" },
                            { key: "sfx", label: "Effets sonores", dot: "bg-amber-400" },
                            { key: "gameBadge", label: "Système / Badge", dot: "bg-cyan-400" },
                            { key: "narration", label: "Narration", dot: "bg-gray-400" },
                          ].map(({ key, label, dot }) => (
                            <div key={key} className="flex items-center justify-between p-2 rounded-lg bg-gray-700/30">
                              <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${dot}`} />
                                <span className="text-sm text-gray-300">{label}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-mono text-gray-400">{colors[key]}</span>
                                <input
                                  type="color"
                                  value={colors[key]}
                                  onChange={(e) => setColors(prev => ({ ...prev, [key]: e.target.value }))}
                                  className="w-7 h-7 rounded-lg border border-gray-600 cursor-pointer bg-transparent"
                                />
                              </div>
                            </div>
                          ))}
                          <button
                            onClick={() => setColors({
                              dialogue: "#c7d2fe", thought: "#a5b4c4",
                              sfx: "#f9fafb", gameBadge: "#a5b4fc", narration: "#e5e7eb",
                            })}
                            className="w-full mt-2 text-xs text-gray-400 hover:text-gray-300 py-1.5 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors"
                          >
                            Réinitialiser les couleurs par défaut
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Navigation rapide prev/next */}
              <div className="flex items-center gap-1 ml-1">
                <button
                  onClick={() => prevChapter && navigateTo(prevChapter)}
                  disabled={!prevChapter}
                  className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Chapitre précédent (←)"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={() => nextChapter && navigateTo(nextChapter)}
                  disabled={!nextChapter}
                  className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Chapitre suivant (→)"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ─── Contenu du chapitre ─── */}
      <main ref={contentRef} className="pt-20 pb-32">
        {/* Fil d'Ariane (Breadcrumb) */}
        <nav aria-label="Fil d'Ariane" className="max-w-3xl mx-auto px-4 sm:px-6 mb-6">
          <ol className="flex items-center flex-wrap gap-1.5 text-sm text-gray-400" itemScope itemType="https://schema.org/BreadcrumbList">
            <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
              <a href="/" itemProp="item" className="hover:text-gray-300 transition-colors">
                <span itemProp="name">Accueil</span>
              </a>
              <meta itemProp="position" content="1" />
            </li>
            <li className="text-gray-700">/</li>
            <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
              <a href="/oeuvres" itemProp="item" className="hover:text-gray-300 transition-colors">
                <span itemProp="name">Catalogue</span>
              </a>
              <meta itemProp="position" content="2" />
            </li>
            <li className="text-gray-700">/</li>
            <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
              <span itemProp="name" className="text-gray-400">{oeuvreTitle}</span>
              <meta itemProp="position" content="3" />
            </li>
            <li className="text-gray-700">/</li>
            <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
              <span itemProp="name" className="text-indigo-400">Chapitre {chapitre.order}</span>
              <meta itemProp="position" content="4" />
            </li>
          </ol>
        </nav>

        {/* En-tête du chapitre */}
        <div className="max-w-3xl mx-auto px-4 sm:px-6 mb-10">
          <div className="text-center py-10 border-b border-gray-800">
            {/* Lien vers l'œuvre */}
            <button
              onClick={() => router.push("/oeuvres")}
              className="inline-flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors mb-4"
            >
              {coverUrl && (
                <Image src={coverUrl} alt={oeuvreTitle} className="w-6 h-8 object-cover rounded" width={24} height={32} />
              )}
              <span>{oeuvreTitle}</span>
            </button>

            {/* Numéro du chapitre */}
            {chapitre.order && (
              <div className="text-sm text-gray-400 uppercase tracking-widest mb-2">
                Chapitre {chapitre.order}
              </div>
            )}

            {/* Titre */}
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4 leading-tight">
              {chapterTitle}
            </h1>

            {/* Meta */}
            <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-gray-400">
              {chapitre.publishedAt && (
                <time dateTime={chapitre.publishedAt} className="flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {new Date(chapitre.publishedAt).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </time>
              )}
              {chapitre.tome && (
                <span className="px-2 py-0.5 bg-purple-600/20 text-purple-300 rounded-lg text-xs font-medium">
                  Tome {chapitre.tome}
                </span>
              )}
              {sortedChapitres.length > 0 && (
                <span className="text-gray-600">
                  {currentIndex + 1} / {sortedChapitres.length}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Zone de contenu */}
        <article className="max-w-3xl mx-auto px-4 sm:px-6">
          <RichContentRenderer
            texte={chapitre.texte}
            fontSize={fontSize}
            fontFamily={fontFamily}
            contentClasses={contentClasses}
            contentCSSVars={contentCSSVars}
          />
        </article>

        {/* ─── Lien Novel-Index ─── */}
        <div className="max-w-3xl mx-auto px-4 sm:px-6 mt-12">
          <a
            href="https://novel-index.com"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center justify-center gap-3 p-4 bg-gradient-to-r from-indigo-950/40 to-purple-950/40 hover:from-indigo-950/60 hover:to-purple-950/60 border border-indigo-500/20 hover:border-indigo-500/40 rounded-2xl transition-all"
          >
            <div className="w-8 h-8 rounded-lg bg-indigo-600/30 flex items-center justify-center group-hover:bg-indigo-600/50 transition-colors">
              <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <span className="text-sm text-indigo-300 group-hover:text-indigo-200 transition-colors font-medium">
              Retrouvez toutes nos sorties sur Novel-Index
            </span>
            <svg className="w-4 h-4 text-indigo-500 group-hover:text-indigo-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>

        {/* ─── Footer de navigation ─── */}
        <div className="max-w-3xl mx-auto px-4 sm:px-6 mt-8">
          <div className="border-t border-gray-800 pt-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Chapitre précédent */}
              <div>
                {prevChapter ? (
                  <button
                    onClick={() => navigateTo(prevChapter)}
                    className="w-full group text-left p-4 bg-gray-900 hover:bg-gray-800 rounded-xl border border-gray-800 hover:border-gray-700 transition-all"
                  >
                    <span className="text-xs text-gray-400 flex items-center gap-1 mb-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                      </svg>
                      Chapitre précédent
                    </span>
                    <span className="text-white font-medium group-hover:text-indigo-300 transition-colors line-clamp-1">
                      {prevChapter.titre}
                    </span>
                  </button>
                ) : (
                  <div />
                )}
              </div>

              {/* Chapitre suivant */}
              <div>
                {nextChapter ? (
                  <button
                    onClick={() => navigateTo(nextChapter)}
                    className="w-full group text-right p-4 bg-gray-900 hover:bg-gray-800 rounded-xl border border-gray-800 hover:border-gray-700 transition-all"
                  >
                    <span className="text-xs text-gray-400 flex items-center justify-end gap-1 mb-1">
                      Chapitre suivant
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                      </svg>
                    </span>
                    <span className="text-white font-medium group-hover:text-indigo-300 transition-colors line-clamp-1">
                      {nextChapter.titre}
                    </span>
                  </button>
                ) : (
                  <div className="text-center p-4 bg-gray-900 rounded-xl border border-gray-800">
                    <p className="text-gray-400 text-sm">Vous avez terminé le dernier chapitre disponible</p>
                    <button
                      onClick={() => router.push("/oeuvres")}
                      className="mt-2 text-indigo-400 hover:text-indigo-300 text-sm font-medium transition-colors"
                    >
                      Retour au catalogue →
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Raccourcis clavier (desktop) */}
            <div className="hidden sm:flex items-center justify-center gap-6 mt-8 text-xs text-gray-600">
              <span className="flex items-center gap-2">
                <kbd className="px-2 py-1 bg-gray-800 rounded border border-gray-700 font-mono">←</kbd>
                Précédent
              </span>
              <span className="flex items-center gap-2">
                <kbd className="px-2 py-1 bg-gray-800 rounded border border-gray-700 font-mono">→</kbd>
                Suivant
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
