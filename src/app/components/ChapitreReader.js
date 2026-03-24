"use client";

import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import dynamic from "next/dynamic";

const BannerCarousel = dynamic(() => import("./BannerCarousel"), {
  ssr: false,
  loading: () => null,
});
const TTSPlayer = dynamic(() => import("./TTSPlayer"), { ssr: false });
const TextSelectionPopover = dynamic(() => import("./TextSelectionPopover"), { ssr: false });

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

  // ─── Thèmes de lecture ───
  const THEME_LABELS = {
    dark: "Sombre", light: "Clair", comfort: "Sépia", night: "Nuit",
    forest: "Forêt", rose: "Rose", ocean: "Océan", paper: "Papier", ink: "Encre",
  };

  const THEME_DEFAULTS = {
    dark:    { dialogue: "#c7d2fe", thought: "#a5b4c4", sfx: "#f9fafb", gameBadge: "#a5b4fc", narration: "#d4d4d8" },
    light:   { dialogue: "#3730a3", thought: "#475569", sfx: "#1c1917", gameBadge: "#4338ca", narration: "#1c1917" },
    comfort: { dialogue: "#92400e", thought: "#78716c", sfx: "#44403c", gameBadge: "#b45309", narration: "#44403c" },
    night:   { dialogue: "#a0b4c8", thought: "#8a9baa", sfx: "#c8c0b0", gameBadge: "#7a9bb5", narration: "#b8b0a0" },
    forest:  { dialogue: "#8fbf8f", thought: "#7a9a7a", sfx: "#d0dcc0", gameBadge: "#6aaa6a", narration: "#b4c8b0" },
    rose:    { dialogue: "#d4a0b4", thought: "#b08a9a", sfx: "#dcc8d0", gameBadge: "#c48aa4", narration: "#c8b8c0" },
    ocean:   { dialogue: "#80c8d8", thought: "#7aaabb", sfx: "#c0dce8", gameBadge: "#60b0c8", narration: "#a8c4d0" },
    paper:   { dialogue: "#5a4030", thought: "#7a6a58", sfx: "#3a3028", gameBadge: "#6a5040", narration: "#3a3028" },
    ink:     { dialogue: "#4a4440", thought: "#5a5650", sfx: "#38342e", gameBadge: "#5a5048", narration: "#38342e" },
  };

  // Préférences de lecture (défauts SSR-safe, hydratées via useEffect)
  const [readerTheme, setReaderTheme] = useState("dark");
  const [fontSize, setFontSize] = useState(18);
  const [fontFamily, setFontFamily] = useState("sans");
  const [lineHeight, setLineHeight] = useState(1.8);
  const [classificationEnabled, setClassificationEnabled] = useState(true);
  const [dialogueStyle, setDialogueStyle] = useState("border-left");
  const [thoughtStyle, setThoughtStyle] = useState("italic");
  const [colors, setColors] = useState({ dialogue: "#c7d2fe", thought: "#a5b4c4", sfx: "#f9fafb", gameBadge: "#a5b4fc", narration: "#d4d4d8" });
  const [brightness, setBrightness] = useState(1);
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showChapterList, setShowChapterList] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [showFloatThemePicker, setShowFloatThemePicker] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [showAutoScrollPanel, setShowAutoScrollPanel] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [bookmarkSaving, setBookmarkSaving] = useState(false);
  const [autoScrolling, setAutoScrolling] = useState(false);
  const [autoScrollSpeed, setAutoScrollSpeed] = useState(2);
  const [focusMode, setFocusMode] = useState(false);
  const [textWidth, setTextWidth] = useState("medium");
  const [paragraphSpacing, setParagraphSpacing] = useState(1);
  const [lateralMargins, setLateralMargins] = useState(0);
  const [showErrorReport, setShowErrorReport] = useState(false);
  const [errorReportData, setErrorReportData] = useState({ type: "traduction", texte: "", paragraphe: "" });
  const [errorReportSending, setErrorReportSending] = useState(false);
  const [errorReportSent, setErrorReportSent] = useState(false);
  const [showShareCard, setShowShareCard] = useState(false);
  const [shareCardUrl, setShareCardUrl] = useState(null);
  const [shareCardGenerating, setShareCardGenerating] = useState(false);
  const [settingsTab, setSettingsTab] = useState("general");

  // Progression de lecture
  const [showHeader, setShowHeader] = useState(true);
  const [zenMode, setZenMode] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [chaptersRead, setChaptersRead] = useState({});

  const lastScrollY = useRef(0);
  const contentRef = useRef(null);
  const settingsRef = useRef(null);
  const chapterListRef = useRef(null);
  const themePickerRef = useRef(null);
  const floatThemeRef = useRef(null);
  const shareMenuRef = useRef(null);
  const progressBarRef = useRef(null);
  const remainingTimeRef = useRef(null);
  const finishTimeRef = useRef(null);
  const readingProgressRef = useRef(0);
  const readingStartRef = useRef(null); // { time, progress } — point de départ pour calcul WPM réel
  const realWpmRef = useRef(null);
  const savedScrollRef = useRef(null);
  const autoScrollRef = useRef(null);
  const autoScrollPanelRef = useRef(null);
  const touchStartRef = useRef(null);

  const oeuvreDocId = oeuvre?.documentId;
  const coverUrl = oeuvre?.couverture?.[0]?.url;
  const oeuvreTitle = oeuvre?.titre || "Œuvre";
  const chapterTitle = chapitre.titre || "Sans titre";

  // Novel-Index URL
  const novelIndexUrl = useMemo(() => {
    if (!oeuvre?.novelIndexDocumentId) return null;
    const titre = oeuvre.novelIndexTitre || oeuvre.titre || "";
    const slug = titre
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return `https://novel-index.com/oeuvre/${oeuvre.novelIndexDocumentId}-${slug}`;
  }, [oeuvre]);

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

  // Compteur de mots et temps de lecture estimé
  const { wordCount, readingTime } = useMemo(() => {
    if (chapitre.pdf) return { wordCount: 0, readingTime: 0 };
    let text = "";
    const extractText = (blocks) => {
      if (!blocks) return;
      for (const block of blocks) {
        if (block.children) {
          for (const child of block.children) {
            if (child.text) text += child.text + " ";
            if (child.children) extractText([child]);
          }
        }
      }
    };
    extractText(chapitre.texte || []);
    const wc = text.split(/\s+/).filter(Boolean).length;
    return { wordCount: wc, readingTime: Math.max(1, Math.ceil(wc / 200)) };
  }, [chapitre.texte, chapitre.pdf]);

  // Charger les préférences depuis localStorage (après hydratation)
  useEffect(() => {
    try {
      const saved = localStorage.getItem("reader-prefs");
      if (saved) {
        const p = JSON.parse(saved);
        if (p.readerTheme) setReaderTheme(p.readerTheme);
        if (p.fontSize) setFontSize(p.fontSize);
        if (p.fontFamily) setFontFamily(p.fontFamily);
        if (p.lineHeight) setLineHeight(p.lineHeight);
        if (p.classificationEnabled !== undefined) setClassificationEnabled(p.classificationEnabled);
        if (p.dialogueStyle) setDialogueStyle(p.dialogueStyle);
        if (p.thoughtStyle) setThoughtStyle(p.thoughtStyle);
        if (p.colors) setColors(prev => ({ ...prev, ...p.colors }));
        if (p.brightness != null) setBrightness(p.brightness);
        if (p.textWidth) setTextWidth(p.textWidth);
        if (p.paragraphSpacing != null) setParagraphSpacing(p.paragraphSpacing);
        if (p.lateralMargins != null) setLateralMargins(p.lateralMargins);
        if (p.autoScrollSpeed != null) setAutoScrollSpeed(p.autoScrollSpeed);
      }
    } catch (e) {}
    setPrefsLoaded(true);
  }, []);

  // Charger chapitres lus + position de lecture
  useEffect(() => {
    try {
      const readData = localStorage.getItem("chapters-read");
      if (readData) setChaptersRead(JSON.parse(readData));
      const savedPos = localStorage.getItem(`read-pos-${chapitre.documentId}`);
      if (savedPos) {
        const pos = JSON.parse(savedPos);
        if (pos.progress > 5 && pos.progress < 95) {
          savedScrollRef.current = pos;
          setShowResumePrompt(true);
        }
      }
    } catch (e) {}
  }, [chapitre.documentId]);

  // Charger le statut signet (localStorage + API si connecté)
  useEffect(() => {
    // Check localStorage first
    try {
      const localBookmarks = JSON.parse(localStorage.getItem("reader-bookmarks") || "{}");
      if (localBookmarks[chapitre.documentId]) setIsBookmarked(true);
    } catch {}
    // Check API if authenticated
    if (typeof window !== "undefined") {
      const Cookies = require("js-cookie");
      const jwt = Cookies.get("jwt");
      if (jwt && oeuvreDocId) {
        fetch(`/api/signets?oeuvreId=${oeuvreDocId}`, {
          headers: { Authorization: `Bearer ${jwt}` },
        })
          .then((r) => r.json())
          .then((data) => {
            if (data.data?.some((s) => s.chapitreId === chapitre.documentId)) {
              setIsBookmarked(true);
            }
          })
          .catch(() => {});
      }
    }
  }, [chapitre.documentId, oeuvreDocId]);

  // Sauvegarder les préférences (seulement après chargement initial)
  useEffect(() => {
    if (!prefsLoaded) return;
    try {
      localStorage.setItem("reader-prefs", JSON.stringify({
        readerTheme, fontSize, fontFamily, lineHeight, classificationEnabled,
        dialogueStyle, thoughtStyle, colors, brightness,
        textWidth, paragraphSpacing, lateralMargins, autoScrollSpeed,
      }));
    } catch (e) {}
  }, [readerTheme, fontSize, fontFamily, lineHeight, classificationEnabled, dialogueStyle, thoughtStyle, colors, brightness, textWidth, paragraphSpacing, lateralMargins, autoScrollSpeed, prefsLoaded]);

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

  // Classe thème appliquée sur le wrapper principal
  const themeWrapperClass = readerTheme !== "dark" ? `reader-theme-${readerTheme}` : "";

  // ─── Styles dynamiques selon le thème ───
  const t = useMemo(() => {
    const all = {
      dark: {
        pageBg: "bg-gray-950", pageText: "text-gray-200",
        headerBg: "bg-gray-900/95", headerBorder: "border-gray-800",
        btnHover: "hover:bg-gray-800", btnText: "text-gray-400 hover:text-gray-100",
        dropBg: "bg-gray-800", dropBorder: "border-gray-700",
        cardBg: "bg-gray-900", cardHover: "hover:bg-gray-800", cardBorder: "border-gray-800", cardHoverBorder: "hover:border-gray-700",
        mutedText: "text-gray-400", dimText: "text-gray-600", titleText: "text-gray-100",
        settingBg: "bg-gray-700", settingBorder: "border-gray-600", settingInactiveBg: "bg-gray-700", settingInactiveBorder: "border-gray-600", settingInactiveText: "text-gray-400",
        progressBg: "bg-gray-900", progressBar: "from-indigo-600 to-purple-500",
        kbdBg: "bg-gray-800", kbdBorder: "border-gray-700",
        scrollTopBg: "bg-gray-800 hover:bg-gray-700", scrollTopBorder: "border-gray-700",
        floatBg: "bg-gray-800/90", floatBorder: "border-gray-700",
        pdfBg: "bg-gray-900", pdfBorder: "border-gray-800",
        breadcrumbSep: "text-gray-700", chapterBorder: "border-gray-800",
      },
      light: {
        pageBg: "bg-stone-50", pageText: "text-stone-900",
        headerBg: "bg-white/95", headerBorder: "border-stone-200",
        btnHover: "hover:bg-stone-200", btnText: "text-stone-500 hover:text-stone-900",
        dropBg: "bg-white", dropBorder: "border-stone-200",
        cardBg: "bg-stone-100", cardHover: "hover:bg-stone-200", cardBorder: "border-stone-200", cardHoverBorder: "hover:border-stone-300",
        mutedText: "text-stone-500", dimText: "text-stone-400", titleText: "text-stone-900",
        settingBg: "bg-stone-100", settingBorder: "border-stone-300", settingInactiveBg: "bg-stone-200", settingInactiveBorder: "border-stone-300", settingInactiveText: "text-stone-500",
        progressBg: "bg-stone-200", progressBar: "from-indigo-500 to-purple-400",
        kbdBg: "bg-stone-200", kbdBorder: "border-stone-300",
        scrollTopBg: "bg-white hover:bg-stone-100", scrollTopBorder: "border-stone-300",
        floatBg: "bg-white/90", floatBorder: "border-stone-200",
        pdfBg: "bg-stone-100", pdfBorder: "border-stone-200",
        breadcrumbSep: "text-stone-300", chapterBorder: "border-stone-200",
      },
      comfort: {
        pageBg: "bg-amber-50", pageText: "text-amber-950",
        headerBg: "bg-orange-50/95", headerBorder: "border-amber-200",
        btnHover: "hover:bg-amber-200", btnText: "text-amber-700 hover:text-amber-950",
        dropBg: "bg-orange-50", dropBorder: "border-amber-200",
        cardBg: "bg-amber-100/60", cardHover: "hover:bg-amber-200/60", cardBorder: "border-amber-200", cardHoverBorder: "hover:border-amber-300",
        mutedText: "text-amber-700", dimText: "text-amber-600", titleText: "text-amber-950",
        settingBg: "bg-amber-100", settingBorder: "border-amber-300", settingInactiveBg: "bg-amber-100", settingInactiveBorder: "border-amber-300", settingInactiveText: "text-amber-700",
        progressBg: "bg-amber-200", progressBar: "from-amber-500 to-orange-400",
        kbdBg: "bg-amber-100", kbdBorder: "border-amber-300",
        scrollTopBg: "bg-orange-50 hover:bg-amber-100", scrollTopBorder: "border-amber-300",
        floatBg: "bg-orange-50/90", floatBorder: "border-amber-200",
        pdfBg: "bg-amber-100", pdfBorder: "border-amber-200",
        breadcrumbSep: "text-amber-300", chapterBorder: "border-amber-200",
      },
      night: {
        pageBg: "bg-[#0b1120]", pageText: "text-[#b8b0a0]",
        headerBg: "bg-[#0e1529]/95", headerBorder: "border-[#1a2540]",
        btnHover: "hover:bg-[#152040]", btnText: "text-[#6a7a8a] hover:text-[#b8b0a0]",
        dropBg: "bg-[#0e1529]", dropBorder: "border-[#1a2540]",
        cardBg: "bg-[#0e1529]", cardHover: "hover:bg-[#152040]", cardBorder: "border-[#1a2540]", cardHoverBorder: "hover:border-[#203060]",
        mutedText: "text-[#6a7a8a]", dimText: "text-[#4a5a6a]", titleText: "text-[#c8c0b0]",
        settingBg: "bg-[#152040]", settingBorder: "border-[#203060]", settingInactiveBg: "bg-[#121d35]", settingInactiveBorder: "border-[#1a2540]", settingInactiveText: "text-[#6a7a8a]",
        progressBg: "bg-[#0e1529]", progressBar: "from-[#1a2540] to-[#203060]",
        kbdBg: "bg-[#152040]", kbdBorder: "border-[#1a2540]",
        scrollTopBg: "bg-[#0e1529] hover:bg-[#152040]", scrollTopBorder: "border-[#1a2540]",
        floatBg: "bg-[#0e1529]/90", floatBorder: "border-[#1a2540]",
        pdfBg: "bg-[#0e1529]", pdfBorder: "border-[#1a2540]",
        breadcrumbSep: "text-[#1a2540]", chapterBorder: "border-[#1a2540]",
      },
      forest: {
        pageBg: "bg-[#0a1a0f]", pageText: "text-[#b4c8b0]",
        headerBg: "bg-[#0d1f12]/95", headerBorder: "border-[#1a3020]",
        btnHover: "hover:bg-[#152a1a]", btnText: "text-[#6a8a6a] hover:text-[#b4c8b0]",
        dropBg: "bg-[#0d1f12]", dropBorder: "border-[#1a3020]",
        cardBg: "bg-[#0d1f12]", cardHover: "hover:bg-[#152a1a]", cardBorder: "border-[#1a3020]", cardHoverBorder: "hover:border-[#206030]",
        mutedText: "text-[#6a8a6a]", dimText: "text-[#4a6a4a]", titleText: "text-[#c8d8c0]",
        settingBg: "bg-[#152a1a]", settingBorder: "border-[#206030]", settingInactiveBg: "bg-[#122518]", settingInactiveBorder: "border-[#1a3020]", settingInactiveText: "text-[#6a8a6a]",
        progressBg: "bg-[#0d1f12]", progressBar: "from-emerald-800 to-emerald-600",
        kbdBg: "bg-[#152a1a]", kbdBorder: "border-[#1a3020]",
        scrollTopBg: "bg-[#0d1f12] hover:bg-[#152a1a]", scrollTopBorder: "border-[#1a3020]",
        floatBg: "bg-[#0d1f12]/90", floatBorder: "border-[#1a3020]",
        pdfBg: "bg-[#0d1f12]", pdfBorder: "border-[#1a3020]",
        breadcrumbSep: "text-[#1a3020]", chapterBorder: "border-[#1a3020]",
      },
      rose: {
        pageBg: "bg-[#1a0f14]", pageText: "text-[#c8b8c0]",
        headerBg: "bg-[#1f1218]/95", headerBorder: "border-[#30182a]",
        btnHover: "hover:bg-[#2a1a24]", btnText: "text-[#8a6a7a] hover:text-[#c8b8c0]",
        dropBg: "bg-[#1f1218]", dropBorder: "border-[#30182a]",
        cardBg: "bg-[#1f1218]", cardHover: "hover:bg-[#2a1a24]", cardBorder: "border-[#30182a]", cardHoverBorder: "hover:border-[#503050]",
        mutedText: "text-[#8a6a7a]", dimText: "text-[#6a4a5a]", titleText: "text-[#d8c8d0]",
        settingBg: "bg-[#2a1a24]", settingBorder: "border-[#503050]", settingInactiveBg: "bg-[#251520]", settingInactiveBorder: "border-[#30182a]", settingInactiveText: "text-[#8a6a7a]",
        progressBg: "bg-[#1f1218]", progressBar: "from-rose-800 to-rose-600",
        kbdBg: "bg-[#2a1a24]", kbdBorder: "border-[#30182a]",
        scrollTopBg: "bg-[#1f1218] hover:bg-[#2a1a24]", scrollTopBorder: "border-[#30182a]",
        floatBg: "bg-[#1f1218]/90", floatBorder: "border-[#30182a]",
        pdfBg: "bg-[#1f1218]", pdfBorder: "border-[#30182a]",
        breadcrumbSep: "text-[#30182a]", chapterBorder: "border-[#30182a]",
      },
      ocean: {
        pageBg: "bg-[#0a141a]", pageText: "text-[#a8c4d0]",
        headerBg: "bg-[#0d1820]/95", headerBorder: "border-[#183040]",
        btnHover: "hover:bg-[#152530]", btnText: "text-[#5a8a9a] hover:text-[#a8c4d0]",
        dropBg: "bg-[#0d1820]", dropBorder: "border-[#183040]",
        cardBg: "bg-[#0d1820]", cardHover: "hover:bg-[#152530]", cardBorder: "border-[#183040]", cardHoverBorder: "hover:border-[#205060]",
        mutedText: "text-[#5a8a9a]", dimText: "text-[#3a6a7a]", titleText: "text-[#c0d8e0]",
        settingBg: "bg-[#152530]", settingBorder: "border-[#205060]", settingInactiveBg: "bg-[#122028]", settingInactiveBorder: "border-[#183040]", settingInactiveText: "text-[#5a8a9a]",
        progressBg: "bg-[#0d1820]", progressBar: "from-cyan-800 to-teal-600",
        kbdBg: "bg-[#152530]", kbdBorder: "border-[#183040]",
        scrollTopBg: "bg-[#0d1820] hover:bg-[#152530]", scrollTopBorder: "border-[#183040]",
        floatBg: "bg-[#0d1820]/90", floatBorder: "border-[#183040]",
        pdfBg: "bg-[#0d1820]", pdfBorder: "border-[#183040]",
        breadcrumbSep: "text-[#183040]", chapterBorder: "border-[#183040]",
      },
      paper: {
        pageBg: "bg-[#e8dfd0]", pageText: "text-[#3a3028]",
        headerBg: "bg-[#e0d6c4]/95", headerBorder: "border-[#c8bca8]",
        btnHover: "hover:bg-[#d4c8b4]", btnText: "text-[#7a6a58] hover:text-[#3a3028]",
        dropBg: "bg-[#e0d6c4]", dropBorder: "border-[#c8bca8]",
        cardBg: "bg-[#ddd2c0]", cardHover: "hover:bg-[#d4c8b4]", cardBorder: "border-[#c8bca8]", cardHoverBorder: "hover:border-[#b8a890]",
        mutedText: "text-[#7a6a58]", dimText: "text-[#9a8a78]", titleText: "text-[#2a2018]",
        settingBg: "bg-[#ddd2c0]", settingBorder: "border-[#c8bca8]", settingInactiveBg: "bg-[#d8ccb8]", settingInactiveBorder: "border-[#c8bca8]", settingInactiveText: "text-[#7a6a58]",
        progressBg: "bg-[#d4c8b4]", progressBar: "from-[#8a7a60] to-[#6a5a40]",
        kbdBg: "bg-[#d4c8b4]", kbdBorder: "border-[#c8bca8]",
        scrollTopBg: "bg-[#e0d6c4] hover:bg-[#d4c8b4]", scrollTopBorder: "border-[#c8bca8]",
        floatBg: "bg-[#e0d6c4]/90", floatBorder: "border-[#c8bca8]",
        pdfBg: "bg-[#ddd2c0]", pdfBorder: "border-[#c8bca8]",
        breadcrumbSep: "text-[#c8bca8]", chapterBorder: "border-[#c8bca8]",
      },
      ink: {
        pageBg: "bg-[#e4e0d8]", pageText: "text-[#38342e]",
        headerBg: "bg-[#dcd8d0]/95", headerBorder: "border-[#c4c0b8]",
        btnHover: "hover:bg-[#d0ccc4]", btnText: "text-[#6a665e] hover:text-[#38342e]",
        dropBg: "bg-[#dcd8d0]", dropBorder: "border-[#c4c0b8]",
        cardBg: "bg-[#d8d4cc]", cardHover: "hover:bg-[#d0ccc4]", cardBorder: "border-[#c4c0b8]", cardHoverBorder: "hover:border-[#b0aca4]",
        mutedText: "text-[#6a665e]", dimText: "text-[#8a8680]", titleText: "text-[#2c2824]",
        settingBg: "bg-[#d8d4cc]", settingBorder: "border-[#c4c0b8]", settingInactiveBg: "bg-[#d4d0c8]", settingInactiveBorder: "border-[#c4c0b8]", settingInactiveText: "text-[#6a665e]",
        progressBg: "bg-[#d0ccc4]", progressBar: "from-[#7a7670] to-[#5a5650]",
        kbdBg: "bg-[#d0ccc4]", kbdBorder: "border-[#c4c0b8]",
        scrollTopBg: "bg-[#dcd8d0] hover:bg-[#d0ccc4]", scrollTopBorder: "border-[#c4c0b8]",
        floatBg: "bg-[#dcd8d0]/90", floatBorder: "border-[#c4c0b8]",
        pdfBg: "bg-[#d8d4cc]", pdfBorder: "border-[#c4c0b8]",
        breadcrumbSep: "text-[#c4c0b8]", chapterBorder: "border-[#c4c0b8]",
      },
    };
    return all[readerTheme] || all.dark;
  }, [readerTheme]);

  // Handler changement de thème
  const changeTheme = useCallback((newTheme) => {
    setReaderTheme(newTheme);
    setColors(THEME_DEFAULTS[newTheme]);
  }, []);

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
    "--reader-paragraph-spacing": `${paragraphSpacing}rem`,
  }), [lineHeight, colors, paragraphSpacing]);

  // Largeur du contenu et marges latérales
  const widthClass = textWidth === "narrow" ? "max-w-xl" : textWidth === "large" ? "max-w-5xl" : "max-w-3xl";
  const marginPx = lateralMargins === 1 ? "px-6 sm:px-10" : lateralMargins === 2 ? "px-10 sm:px-16" : lateralMargins === 3 ? "px-14 sm:px-24" : "px-4 sm:px-6";

  // Index du chapitre courant (dans la liste dédupliquée)
  const currentIndex = useMemo(() => {
    return sortedChapitres.findIndex((c) => c.documentId === chapitre.documentId);
  }, [sortedChapitres, chapitre.documentId]);

  const prevChapter = currentIndex > 0 ? sortedChapitres[currentIndex - 1] : null;
  const nextChapter = currentIndex < sortedChapitres.length - 1 ? sortedChapitres[currentIndex + 1] : null;

  // Navigation vers un chapitre (avec transition)
  const navigateTo = useCallback(
    (chap) => {
      setIsTransitioning(true);
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: "instant" });
        if (oeuvreDocId && chap.order) {
          router.push(`/oeuvre/${oeuvreDocId}/chapitre/${chap.order}`);
        } else {
          router.push(`/chapitre/${chap.documentId}`);
        }
      }, 200);
    },
    [router, oeuvreDocId]
  );

  // Copier le lien du chapitre
  const copyChapterLink = useCallback(() => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }).catch(() => {});
  }, []);

  // Toggle signet
  const toggleBookmark = useCallback(async () => {
    if (bookmarkSaving) return;
    setBookmarkSaving(true);
    const newState = !isBookmarked;
    setIsBookmarked(newState);

    // Sauvegarder en localStorage
    try {
      const localBookmarks = JSON.parse(localStorage.getItem("reader-bookmarks") || "{}");
      if (newState) {
        localBookmarks[chapitre.documentId] = { order: chapitre.order, titre: chapterTitle, date: Date.now() };
      } else {
        delete localBookmarks[chapitre.documentId];
      }
      localStorage.setItem("reader-bookmarks", JSON.stringify(localBookmarks));
    } catch {}

    // Sauvegarder via API si connecté
    try {
      const Cookies = require("js-cookie");
      const jwt = Cookies.get("jwt");
      if (jwt && oeuvreDocId) {
        if (newState) {
          await fetch("/api/signets", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
            body: JSON.stringify({
              chapitreId: chapitre.documentId,
              oeuvreId: oeuvreDocId,
              chapitreOrder: chapitre.order,
              chapitreTitre: chapterTitle,
              position: Math.round(readingProgressRef.current),
            }),
          });
        }
        // Pour la suppression on ne supprime pas côté API ici (complexité de trouver l'ID)
      }
    } catch {}
    setBookmarkSaving(false);
  }, [isBookmarked, bookmarkSaving, chapitre.documentId, chapitre.order, chapterTitle, oeuvreDocId]);

  // Reprendre la lecture
  const resumeReading = useCallback(() => {
    if (savedScrollRef.current) {
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollTo = (savedScrollRef.current.progress / 100) * docHeight;
      window.scrollTo({ top: scrollTo, behavior: "smooth" });
    }
    setShowResumePrompt(false);
  }, []);

  // Scroll to top quand le chapitre change + fade in
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    setIsTransitioning(false);
    setShowResumePrompt(false);
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

  // Navigation clavier (flèches + Escape zen + Home scroll-top)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      if (e.key === "ArrowRight" && nextChapter) navigateTo(nextChapter);
      if (e.key === "ArrowLeft" && prevChapter) navigateTo(prevChapter);
      if (e.key === "Escape" && zenMode) setZenMode(false);
      if (e.key === "Home") {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [nextChapter, prevChapter, navigateTo, zenMode]);

  // Progression de lecture & visibilité du header (RAF pour performance)
  useEffect(() => {
    let rafId = null;
    const handleScroll = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = docHeight > 0 ? Math.min((scrollTop / docHeight) * 100, 100) : 0;
        readingProgressRef.current = progress;
        // Mettre à jour la barre de progression via ref DOM (pas de re-render)
        if (progressBarRef.current) {
          progressBarRef.current.style.width = `${progress}%`;
          progressBarRef.current.setAttribute("aria-valuenow", Math.round(progress).toString());
        }
        // Temps restant avec estimation intelligente
        if (readingTime > 0 && wordCount > 0) {
          // Démarrer le tracking de vitesse au premier scroll > 5%
          if (!readingStartRef.current && progress > 5) {
            readingStartRef.current = { time: Date.now(), progress };
          }
          // Calculer le WPM réel après 30s de lecture et > 10% de progression
          let estimatedRemaining = readingTime * (1 - progress / 100);
          if (readingStartRef.current && progress > readingStartRef.current.progress + 10) {
            const elapsedMin = (Date.now() - readingStartRef.current.time) / 60000;
            if (elapsedMin > 0.5) {
              const wordsRead = wordCount * ((progress - readingStartRef.current.progress) / 100);
              const wpm = wordsRead / elapsedMin;
              if (wpm > 30 && wpm < 2000) { // sanity check
                realWpmRef.current = wpm;
                const wordsLeft = wordCount * (1 - progress / 100);
                estimatedRemaining = wordsLeft / wpm;
              }
            }
          }
          const remaining = Math.max(0, Math.ceil(estimatedRemaining));
          if (remainingTimeRef.current) {
            remainingTimeRef.current.textContent = remaining > 0 ? `~${remaining} min` : "Terminé";
          }
          // Heure de fin estimée
          if (finishTimeRef.current) {
            if (remaining > 0 && progress > 3) {
              const finishDate = new Date(Date.now() + remaining * 60000);
              finishTimeRef.current.textContent = `Fin vers ${finishDate.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;
              finishTimeRef.current.style.display = "";
            } else if (remaining === 0 && progress > 95) {
              finishTimeRef.current.textContent = "Terminé";
              finishTimeRef.current.style.display = "";
            } else {
              finishTimeRef.current.style.display = "none";
            }
          }
        }
        // Scroll to top button
        setShowScrollTop(scrollTop > 600);
        // Auto-hide header
        if (scrollTop > lastScrollY.current && scrollTop > 100) {
          setShowHeader(false);
        } else {
          setShowHeader(true);
        }
        lastScrollY.current = scrollTop;
        // Sauvegarder la position de lecture
        try {
          localStorage.setItem(`read-pos-${chapitre.documentId}`, JSON.stringify({ progress, ts: Date.now() }));
        } catch (e) {}
        // Marquer comme lu si > 90%
        if (progress > 90) {
          setChaptersRead((prev) => {
            if (prev[chapitre.documentId]) return prev;
            const next = { ...prev, [chapitre.documentId]: true };
            try { localStorage.setItem("chapters-read", JSON.stringify(next)); } catch (e) {}
            return next;
          });
        }
        rafId = null;
      });
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [chapitre.documentId]);

  // Fermer les dropdowns au clic extérieur
  useEffect(() => {
    const handleClick = (e) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target)) {
        setShowSettings(false);
      }
      if (chapterListRef.current && !chapterListRef.current.contains(e.target)) {
        setShowChapterList(false);
      }
      if (themePickerRef.current && !themePickerRef.current.contains(e.target)) {
        setShowThemePicker(false);
      }
      if (floatThemeRef.current && !floatThemeRef.current.contains(e.target)) {
        setShowFloatThemePicker(false);
      }
      if (shareMenuRef.current && !shareMenuRef.current.contains(e.target)) {
        setShowShareMenu(false);
      }
      if (autoScrollPanelRef.current && !autoScrollPanelRef.current.contains(e.target)) {
        setShowAutoScrollPanel(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Swipe tactile pour navigation mobile
  useEffect(() => {
    const handleTouchStart = (e) => {
      touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };
    const handleTouchEnd = (e) => {
      if (!touchStartRef.current) return;
      const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
      const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
      // Swipe horizontal significatif (>80px) et pas trop vertical
      if (Math.abs(dx) > 80 && Math.abs(dy) < Math.abs(dx) * 0.5) {
        if (dx > 0 && prevChapter) navigateTo(prevChapter);
        if (dx < 0 && nextChapter) navigateTo(nextChapter);
      }
      touchStartRef.current = null;
    };
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [prevChapter, nextChapter, navigateTo]);

  // Auto-scroll
  useEffect(() => {
    if (!autoScrolling) {
      if (autoScrollRef.current) { cancelAnimationFrame(autoScrollRef.current); autoScrollRef.current = null; }
      return;
    }
    let accumulator = 0;
    const scroll = () => {
      accumulator += autoScrollSpeed * 0.15;
      if (accumulator >= 1) {
        const px = Math.floor(accumulator);
        window.scrollBy(0, px);
        accumulator -= px;
      }
      if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 10) {
        setAutoScrolling(false);
        return;
      }
      autoScrollRef.current = requestAnimationFrame(scroll);
    };
    autoScrollRef.current = requestAnimationFrame(scroll);
    return () => { if (autoScrollRef.current) cancelAnimationFrame(autoScrollRef.current); };
  }, [autoScrolling, autoScrollSpeed]);

  // Focus paragraph mode
  useEffect(() => {
    if (!focusMode || !contentRef.current) return;
    let rafId = null;
    const highlight = () => {
      const paragraphs = contentRef.current?.querySelectorAll(".chapter-content p, .chapter-content .game-badge");
      if (!paragraphs?.length) return;
      const center = window.innerHeight / 2;
      let closest = null;
      let closestDist = Infinity;
      paragraphs.forEach((p) => {
        const rect = p.getBoundingClientRect();
        const dist = Math.abs(rect.top + rect.height / 2 - center);
        if (dist < closestDist) { closestDist = dist; closest = p; }
      });
      paragraphs.forEach((p) => {
        p.style.opacity = p === closest ? "1" : "0.3";
        p.style.transition = "opacity 0.3s ease";
      });
    };
    const onScroll = () => { if (rafId) return; rafId = requestAnimationFrame(() => { highlight(); rafId = null; }); };
    highlight();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (rafId) cancelAnimationFrame(rafId);
      const paragraphs = contentRef.current?.querySelectorAll(".chapter-content p, .chapter-content .game-badge");
      paragraphs?.forEach((p) => { p.style.opacity = ""; p.style.transition = ""; });
    };
  }, [focusMode]);

  // Générer une carte de partage (canvas)
  const generateShareCard = useCallback(async (mode = "progress") => {
    setShareCardGenerating(true);
    try {
      const canvas = document.createElement("canvas");
      const w = 1200, h = 630;
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");

      // Fond gradient
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, "#1e1b4b");
      grad.addColorStop(0.5, "#312e81");
      grad.addColorStop(1, "#1e1b4b");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Motif subtil
      ctx.fillStyle = "rgba(99, 102, 241, 0.05)";
      for (let i = 0; i < 20; i++) {
        const x = Math.random() * w, y = Math.random() * h, r = Math.random() * 80 + 20;
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      }

      // Charger la couverture si dispo
      let coverLoaded = false;
      if (coverUrl) {
        try {
          const img = new window.Image();
          img.crossOrigin = "anonymous";
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = coverUrl;
            setTimeout(reject, 5000);
          });
          // Couverture à gauche avec ombre
          ctx.save();
          ctx.shadowColor = "rgba(0,0,0,0.5)";
          ctx.shadowBlur = 30;
          ctx.shadowOffsetX = 5;
          ctx.shadowOffsetY = 5;
          const coverW = 200, coverH = 290;
          const coverX = 80, coverY = (h - coverH) / 2;
          ctx.beginPath();
          ctx.roundRect(coverX, coverY, coverW, coverH, 12);
          ctx.clip();
          ctx.drawImage(img, coverX, coverY, coverW, coverH);
          ctx.restore();
          // Bordure
          ctx.strokeStyle = "rgba(255,255,255,0.15)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.roundRect(coverX, coverY, coverW, coverH, 12);
          ctx.stroke();
          coverLoaded = true;
        } catch {}
      }

      const textX = coverLoaded ? 340 : 80;
      const textW = w - textX - 80;

      // Titre de l'oeuvre
      ctx.fillStyle = "#e0e7ff";
      ctx.font = "bold 38px 'Inter', system-ui, sans-serif";
      const titleLines = wrapText(ctx, oeuvreTitle, textW);
      let textY = coverLoaded ? 160 : 180;
      titleLines.forEach((line) => {
        ctx.fillText(line, textX, textY);
        textY += 48;
      });

      if (mode === "progress") {
        // Progression
        const chapRead = Object.keys(chaptersRead).length;
        const totalChap = sortedChapitres.length;
        const pct = totalChap > 0 ? Math.round((chapRead / totalChap) * 100) : 0;

        ctx.fillStyle = "#a5b4fc";
        ctx.font = "600 26px 'Inter', system-ui, sans-serif";
        textY += 20;
        ctx.fillText(`${chapRead} chapitre${chapRead > 1 ? "s" : ""} lu${chapRead > 1 ? "s" : ""} sur ${totalChap}`, textX, textY);

        // Barre de progression
        textY += 30;
        const barW = Math.min(textW, 500), barH = 16;
        ctx.fillStyle = "rgba(255,255,255,0.1)";
        ctx.beginPath(); ctx.roundRect(textX, textY, barW, barH, 8); ctx.fill();
        if (pct > 0) {
          const progGrad = ctx.createLinearGradient(textX, 0, textX + barW * (pct / 100), 0);
          progGrad.addColorStop(0, "#818cf8");
          progGrad.addColorStop(1, "#a78bfa");
          ctx.fillStyle = progGrad;
          ctx.beginPath(); ctx.roundRect(textX, textY, barW * (pct / 100), barH, 8); ctx.fill();
        }
        textY += 35;
        ctx.fillStyle = "#c7d2fe";
        ctx.font = "500 22px 'Inter', system-ui, sans-serif";
        ctx.fillText(`${pct}% de l'oeuvre`, textX, textY);

        // Chapitre actuel
        textY += 40;
        ctx.fillStyle = "rgba(199, 210, 254, 0.6)";
        ctx.font = "20px 'Inter', system-ui, sans-serif";
        ctx.fillText(`Actuellement : Chapitre ${chapitre.order} — ${chapterTitle}`, textX, textY);
      } else {
        // Mode "oeuvre" : info générale
        textY += 20;
        ctx.fillStyle = "#a5b4fc";
        ctx.font = "500 24px 'Inter', system-ui, sans-serif";
        ctx.fillText(`${sortedChapitres.length} chapitres disponibles`, textX, textY);
        if (oeuvre?.synopsis) {
          textY += 40;
          ctx.fillStyle = "rgba(199, 210, 254, 0.7)";
          ctx.font = "18px 'Inter', system-ui, sans-serif";
          const synLines = wrapText(ctx, typeof oeuvre.synopsis === "string" ? oeuvre.synopsis.slice(0, 200) : "", textW);
          synLines.slice(0, 3).forEach((line) => {
            ctx.fillText(line, textX, textY);
            textY += 26;
          });
        }
      }

      // Branding
      ctx.fillStyle = "rgba(165, 180, 252, 0.4)";
      ctx.font = "bold 18px 'Inter', system-ui, sans-serif";
      ctx.fillText("trad-index.com", w - 200, h - 30);

      // Ligne décorative en bas
      const lineGrad = ctx.createLinearGradient(0, h - 4, w, h - 4);
      lineGrad.addColorStop(0, "transparent");
      lineGrad.addColorStop(0.3, "#818cf8");
      lineGrad.addColorStop(0.7, "#a78bfa");
      lineGrad.addColorStop(1, "transparent");
      ctx.fillStyle = lineGrad;
      ctx.fillRect(0, h - 4, w, 4);

      setShareCardUrl(canvas.toDataURL("image/png"));
      setShowShareCard(true);
    } catch (err) {
      console.error("Share card generation error:", err);
    }
    setShareCardGenerating(false);
  }, [coverUrl, oeuvreTitle, chaptersRead, sortedChapitres, chapitre.order, chapterTitle, oeuvre?.synopsis]);

  // Helper pour wrap text sur canvas
  function wrapText(ctx, text, maxWidth) {
    const words = text.split(" ");
    const lines = [];
    let currentLine = "";
    for (const word of words) {
      const test = currentLine ? currentLine + " " + word : word;
      if (ctx.measureText(test).width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
        if (lines.length >= 2) { currentLine += "..."; lines.push(currentLine); return lines; }
      } else {
        currentLine = test;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
  }

  // Télécharger la carte de partage
  const downloadShareCard = useCallback(() => {
    if (!shareCardUrl) return;
    const a = document.createElement("a");
    a.href = shareCardUrl;
    a.download = "trad-index-progression.png";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [shareCardUrl]);

  // Envoyer un signalement d'erreur
  const submitErrorReport = useCallback(async () => {
    if (!errorReportData.texte.trim() || errorReportSending) return;
    setErrorReportSending(true);
    try {
      const res = await fetch("/api/signalements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: errorReportData.type,
          description: errorReportData.texte.trim(),
          paragraphe: errorReportData.paragraphe.trim(),
          chapitreId: chapitre.documentId,
          chapitreOrder: chapitre.order,
          chapitreTitre: chapterTitle,
          oeuvreId: oeuvreDocId,
          oeuvreTitre: oeuvreTitle,
        }),
      });
      if (res.ok) {
        setErrorReportSent(true);
        setTimeout(() => {
          setShowErrorReport(false);
          setErrorReportSent(false);
          setErrorReportData({ type: "traduction", texte: "", paragraphe: "" });
        }, 2000);
      }
    } catch (err) {
      console.error("Error report error:", err);
    }
    setErrorReportSending(false);
  }, [errorReportData, errorReportSending, chapitre.documentId, chapitre.order, chapterTitle, oeuvreDocId, oeuvreTitle]);

  return (
    <div className={`min-h-screen ${t.pageBg} ${t.pageText} transition-opacity duration-200 ${themeWrapperClass} ${isTransitioning ? "opacity-0" : "opacity-100"}`}>
      {/* ─── Barre de progression de lecture ─── */}
      {!zenMode && (
        <div className={`fixed top-0 left-0 right-0 z-50 h-1 ${t.progressBg}`} role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100" aria-label="Progression de lecture">
          <div
            ref={progressBarRef}
            className={`h-full transition-all duration-150 ease-out bg-gradient-to-r ${t.progressBar}`}
            style={{ width: "0%" }}
          />
        </div>
      )}

      {/* ─── Header sticky ─── */}
      {!zenMode && (
      <header
        className={`fixed top-1 left-0 right-0 z-40 transition-transform duration-300 ${
          showHeader ? "translate-y-0" : "-translate-y-full"
        }`}
      >
        <div className={`${t.headerBg} backdrop-blur-md border-b ${t.headerBorder}`}>
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
            {/* Gauche : retour + infos */}
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => router.push("/oeuvres")}
                className={`flex-shrink-0 p-2 ${t.btnHover} rounded-lg transition-colors ${t.btnText}`}
                title="Retour au catalogue"
                aria-label="Retour au catalogue"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <div className="min-w-0">
                <p className={`text-xs ${t.mutedText} truncate`}>{oeuvreTitle}</p>
                <div className="flex items-center gap-2">
                  <p className={`text-sm font-medium ${t.titleText} truncate`}>{chapterTitle}</p>
                  {readingTime > 0 && (
                    <>
                      <span ref={remainingTimeRef} className={`hidden sm:inline text-[10px] ${t.dimText} whitespace-nowrap`}>
                        ~{readingTime} min
                      </span>
                      <span ref={finishTimeRef} className={`hidden sm:inline text-[10px] text-indigo-400/70 whitespace-nowrap`} style={{ display: "none" }} />
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Droite : actions */}
            <div className="flex items-center gap-1">
              {/* Taille de police rapide */}
              <div className={`hidden sm:flex items-center gap-0.5 mr-1 px-1.5 py-1 ${t.dropBg} rounded-lg border ${t.dropBorder}`}>
                <button
                  onClick={() => setFontSize(Math.max(14, fontSize - 2))}
                  className={`w-7 h-7 rounded flex items-center justify-center ${t.btnText} transition-colors`}
                  aria-label="Réduire la taille du texte"
                >
                  <span className="text-xs font-bold">A-</span>
                </button>
                <span className={`text-[10px] ${t.dimText} w-8 text-center tabular-nums`}>{fontSize}px</span>
                <button
                  onClick={() => setFontSize(Math.min(28, fontSize + 2))}
                  className={`w-7 h-7 rounded flex items-center justify-center ${t.btnText} transition-colors`}
                  aria-label="Augmenter la taille du texte"
                >
                  <span className="text-sm font-bold">A+</span>
                </button>
              </div>

              {/* ─── Sélecteur de thème (bouton livre + dropdown) ─── */}
              <div className="relative" ref={themePickerRef}>
                <button
                  onClick={() => {
                    setShowThemePicker(!showThemePicker);
                    setShowSettings(false);
                    setShowChapterList(false);
                  }}
                  className={`p-2 ${t.btnHover} rounded-lg transition-colors ${t.btnText}`}
                  title="Thèmes de lecture"
                  aria-label="Thèmes de lecture"
                  aria-expanded={showThemePicker}
                  aria-haspopup="true"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </button>
                {showThemePicker && (
                  <div className={`absolute right-0 mt-2 w-56 ${t.dropBg} border ${t.dropBorder} rounded-xl shadow-2xl animate-fade-in max-h-[80vh] overflow-y-auto no-scrollbar`}>
                    {/* ── Thèmes de couleur ── */}
                    <div className={`p-3 border-b ${t.dropBorder}`}>
                      <p className={`text-sm font-semibold ${t.titleText}`}>Thème de lecture</p>
                    </div>
                    <div className="p-1.5">
                      {[
                        { key: "dark", bg: "#111827", fg: "#d4d4d8" },
                        { key: "light", bg: "#fafaf9", fg: "#1c1917" },
                        { key: "comfort", bg: "#fffbeb", fg: "#451a03" },
                        { key: "night", bg: "#0b1120", fg: "#b8b0a0" },
                        { key: "forest", bg: "#0a1a0f", fg: "#b4c8b0" },
                        { key: "rose", bg: "#1a0f14", fg: "#c8b8c0" },
                        { key: "ocean", bg: "#0a141a", fg: "#a8c4d0" },
                        { key: "paper", bg: "#e8dfd0", fg: "#3a3028" },
                        { key: "ink", bg: "#e4e0d8", fg: "#38342e" },
                      ].map(({ key, bg, fg }) => (
                        <button
                          key={key}
                          onClick={() => changeTheme(key)}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                            readerTheme === key
                              ? "bg-indigo-600/20"
                              : `${t.cardHover}`
                          }`}
                        >
                          <span
                            className={`w-6 h-6 rounded-md border flex-shrink-0 flex items-center justify-center text-[9px] font-medium ${
                              readerTheme === key ? "ring-2 ring-indigo-400 border-transparent" : "border-black/10"
                            }`}
                            style={{ backgroundColor: bg, color: fg }}
                          >
                            Aa
                          </span>
                          <span className={`text-sm ${readerTheme === key ? "text-indigo-300 font-medium" : t.mutedText}`}>
                            {THEME_LABELS[key]}
                          </span>
                          {readerTheme === key && (
                            <svg className="w-4 h-4 ml-auto text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                      ))}
                    </div>

                    {/* ── Police de caractère ── */}
                    <div className={`p-3 border-t ${t.dropBorder}`}>
                      <p className={`text-xs ${t.mutedText} mb-2`}>Police</p>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          { key: "sans", label: "Sans", ff: "system-ui, sans-serif" },
                          { key: "serif", label: "Serif", ff: "Georgia, serif" },
                          { key: "mono", label: "Mono", ff: "monospace" },
                        ].map(({ key, label, ff }) => (
                          <button
                            key={key}
                            onClick={() => setFontFamily(key)}
                            className={`p-1.5 rounded-lg border text-center transition-all ${
                              fontFamily === key
                                ? "bg-indigo-600/20 border-indigo-500 text-indigo-300"
                                : `${t.settingInactiveBg} ${t.settingInactiveBorder} ${t.settingInactiveText} hover:border-current`
                            }`}
                          >
                            <span className="block text-base" style={{ fontFamily: ff }}>Aa</span>
                            <span className="text-[10px]">{label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Partage */}
              <div className="relative" ref={shareMenuRef}>
                <button
                  onClick={() => {
                    setShowShareMenu(!showShareMenu);
                    setShowSettings(false);
                    setShowChapterList(false);
                    setShowThemePicker(false);
                  }}
                  className={`p-2 ${t.btnHover} rounded-lg transition-colors ${t.btnText}`}
                  title="Partager"
                  aria-label="Partager le chapitre"
                  aria-expanded={showShareMenu}
                  aria-haspopup="true"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                </button>
                {showShareMenu && (
                  <div className={`absolute right-0 mt-2 w-52 ${t.dropBg} border ${t.dropBorder} rounded-xl shadow-2xl animate-fade-in`}>
                    <div className={`p-3 border-b ${t.dropBorder}`}>
                      <p className={`text-sm font-semibold ${t.titleText}`}>Partager</p>
                    </div>
                    <div className="p-1.5">
                      {/* Partage natif (mobile) */}
                      {typeof navigator !== "undefined" && navigator.share && (
                        <button
                          onClick={() => {
                            navigator.share({ title: `${oeuvreTitle} - ${chapterTitle}`, url: window.location.href }).catch(() => {});
                            setShowShareMenu(false);
                          }}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg ${t.cardHover} transition-colors`}
                        >
                          <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                          </svg>
                          <span className={`text-sm ${t.mutedText}`}>Partager...</span>
                        </button>
                      )}
                      {/* Copier le lien */}
                      <button
                        onClick={() => { copyChapterLink(); setShowShareMenu(false); }}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg ${t.cardHover} transition-colors`}
                      >
                        {copiedLink ? (
                          <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                          </svg>
                        )}
                        <span className={`text-sm ${t.mutedText}`}>{copiedLink ? "Copié !" : "Copier le lien"}</span>
                      </button>
                      {/* Twitter / X */}
                      <a
                        href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Je lis "${oeuvreTitle}" - ${chapterTitle}`)}&url=${encodeURIComponent(typeof window !== "undefined" ? window.location.href : "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg ${t.cardHover} transition-colors`}
                        onClick={() => setShowShareMenu(false)}
                      >
                        <svg className="w-5 h-5 text-gray-400" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                        </svg>
                        <span className={`text-sm ${t.mutedText}`}>Twitter / X</span>
                      </a>
                      {/* WhatsApp */}
                      <a
                        href={`https://wa.me/?text=${encodeURIComponent(`Je lis "${oeuvreTitle}" - ${chapterTitle}\n${typeof window !== "undefined" ? window.location.href : ""}`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg ${t.cardHover} transition-colors`}
                        onClick={() => setShowShareMenu(false)}
                      >
                        <svg className="w-5 h-5 text-green-500" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                        </svg>
                        <span className={`text-sm ${t.mutedText}`}>WhatsApp</span>
                      </a>
                      {/* Discord */}
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(`**${oeuvreTitle}** - ${chapterTitle}\n${window.location.href}`).catch(() => {});
                          setCopiedLink(true);
                          setTimeout(() => setCopiedLink(false), 2000);
                          setShowShareMenu(false);
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg ${t.cardHover} transition-colors`}
                      >
                        <svg className="w-5 h-5 text-indigo-400" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286z" />
                        </svg>
                        <span className={`text-sm ${t.mutedText}`}>Copier pour Discord</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Signet */}
              <button
                onClick={toggleBookmark}
                className={`p-2 ${t.btnHover} rounded-lg transition-colors ${isBookmarked ? "text-yellow-400" : t.btnText}`}
                title={isBookmarked ? "Retirer le signet" : "Ajouter un signet"}
                aria-label={isBookmarked ? "Retirer le signet" : "Ajouter un signet"}
              >
                <svg className="w-5 h-5" fill={isBookmarked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              </button>

              {/* Mode zen */}
              <button
                onClick={() => setZenMode(true)}
                className={`p-2 ${t.btnHover} rounded-lg transition-colors ${t.btnText}`}
                title="Mode lecture zen (Escape pour quitter)"
                aria-label="Activer le mode lecture zen"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              </button>

              {/* Sélecteur de chapitre */}
              <div className="relative" ref={chapterListRef}>
                <button
                  onClick={() => {
                    setShowChapterList(!showChapterList);
                    setShowSettings(false);
                    setShowThemePicker(false);
                  }}
                  className={`p-2 ${t.btnHover} rounded-lg transition-colors ${t.btnText}`}
                  title="Liste des chapitres"
                  aria-label="Liste des chapitres"
                  aria-expanded={showChapterList}
                  aria-haspopup="true"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                </button>
                {showChapterList && (
                  <div className={`absolute right-0 mt-2 w-72 ${t.dropBg} border ${t.dropBorder} rounded-xl shadow-2xl max-h-80 overflow-y-auto no-scrollbar animate-fade-in`}>
                    <div className={`p-3 border-b ${t.dropBorder} sticky top-0 ${t.dropBg} z-10`}>
                      <p className={`text-sm font-semibold ${t.titleText}`}>Chapitres ({sortedChapitres.length})</p>
                    </div>
                    {sortedChapitres.map((chap) => (
                      <button
                        key={chap.documentId}
                        onClick={() => {
                          navigateTo(chap);
                          setShowChapterList(false);
                        }}
                        className={`w-full text-left px-4 py-3 ${t.cardHover} transition-colors flex items-center gap-3 ${
                          chap.documentId === chapitre.documentId
                            ? "bg-indigo-600/20 border-l-2 border-indigo-500"
                            : ""
                        }`}
                      >
                        <span
                          className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                            chap.documentId === chapitre.documentId
                              ? "bg-indigo-600 text-white"
                              : `${t.settingBg} ${t.mutedText}`
                          }`}
                        >
                          {chap.order}
                        </span>
                        <span
                          className={`text-sm truncate flex-1 ${
                            chap.documentId === chapitre.documentId
                              ? "text-indigo-300 font-medium"
                              : t.mutedText
                          }`}
                        >
                          {chap.titre}
                        </span>
                        {chaptersRead[chap.documentId] && (
                          <svg className="w-4 h-4 flex-shrink-0 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
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
                    setShowThemePicker(false);
                  }}
                  className={`p-2 ${t.btnHover} rounded-lg transition-colors ${t.btnText}`}
                  title="Paramètres de lecture"
                  aria-label="Paramètres de lecture"
                  aria-expanded={showSettings}
                  aria-haspopup="true"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                </button>
                {showSettings && (
                  <div className={`absolute right-0 mt-2 w-80 ${t.dropBg} border ${t.dropBorder} rounded-xl shadow-2xl animate-fade-in max-h-[70vh] overflow-y-auto no-scrollbar`}>
                    {/* Header avec onglets */}
                    <div className={`sticky top-0 ${t.dropBg} z-10 border-b ${t.dropBorder}`}>
                      <div className="flex items-center justify-between px-4 pt-3 pb-1">
                        <p className={`text-sm font-semibold ${t.titleText}`}>Paramètres de lecture</p>
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
                                : `${t.mutedText}`
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
                          {/* Thème de lecture */}
                          <div>
                            <label className={`text-xs ${t.mutedText} mb-2 block`}>Thème</label>
                            <div className="grid grid-cols-4 gap-2">
                              {[
                                { key: "dark", bg: "#111827", fg: "#e5e7eb" },
                                { key: "light", bg: "#fafaf9", fg: "#1c1917" },
                                { key: "comfort", bg: "#fffbeb", fg: "#451a03" },
                                { key: "night", bg: "#0b1120", fg: "#b8b0a0" },
                                { key: "forest", bg: "#0a1a0f", fg: "#b4c8b0" },
                                { key: "rose", bg: "#1a0f14", fg: "#c8b8c0" },
                                { key: "ocean", bg: "#0a141a", fg: "#a8c4d0" },
                                { key: "paper", bg: "#e8dfd0", fg: "#3a3028" },
                        { key: "ink", bg: "#e4e0d8", fg: "#38342e" },
                              ].map(({ key, bg, fg }) => (
                                <button
                                  key={key}
                                  onClick={() => changeTheme(key)}
                                  className={`relative p-1.5 rounded-lg border text-center transition-all ${
                                    readerTheme === key
                                      ? "ring-2 ring-indigo-400 border-transparent"
                                      : `${t.settingInactiveBg} ${t.settingInactiveBorder} border hover:border-current`
                                  }`}
                                >
                                  <span
                                    className="block w-full h-6 rounded mb-1 border border-black/10"
                                    style={{ backgroundColor: bg }}
                                  >
                                    <span className="block text-[10px] leading-6" style={{ color: fg }}>Aa</span>
                                  </span>
                                  <span className={`text-[10px] ${readerTheme === key ? t.titleText : t.settingInactiveText}`}>
                                    {THEME_LABELS[key]}
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Taille de police */}
                          <div>
                            <label className={`text-xs ${t.mutedText} mb-2 block`}>
                              Taille du texte : {fontSize}px
                            </label>
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => setFontSize(Math.max(14, fontSize - 2))}
                                className={`w-8 h-8 rounded-lg ${t.settingBg} flex items-center justify-center ${t.titleText} transition-colors`}
                                aria-label="Réduire la taille du texte"
                              >
                                <span className="text-xs font-bold">A-</span>
                              </button>
                              <input type="range" min="14" max="28" step="2" value={fontSize}
                                onChange={(e) => setFontSize(Number(e.target.value))}
                                className="flex-1 accent-indigo-500"
                                aria-label={`Taille du texte : ${fontSize}px`} />
                              <button
                                onClick={() => setFontSize(Math.min(28, fontSize + 2))}
                                className={`w-8 h-8 rounded-lg ${t.settingBg} flex items-center justify-center ${t.titleText} transition-colors`}
                                aria-label="Augmenter la taille du texte"
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
                              className="w-full accent-indigo-500"
                              aria-label={`Interligne : ${lineHeight.toFixed(1)}`} />
                            <div className={`flex justify-between text-[10px] ${t.dimText} mt-1`}>
                              <span>Dense</span><span>Aéré</span>
                            </div>
                          </div>

                          {/* Luminosité */}
                          <div>
                            <label className={`text-xs ${t.mutedText} mb-2 block`}>
                              Luminosité : {Math.round(brightness * 100)}%
                            </label>
                            <div className="flex items-center gap-3">
                              <svg className={`w-4 h-4 flex-shrink-0 ${t.dimText}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                              </svg>
                              <input type="range" min="0.3" max="1" step="0.05" value={brightness}
                                onChange={(e) => setBrightness(Number(e.target.value))}
                                className="flex-1 accent-indigo-500"
                                aria-label={`Luminosité : ${Math.round(brightness * 100)}%`} />
                              <svg className={`w-4 h-4 flex-shrink-0 ${t.mutedText}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                              </svg>
                            </div>
                          </div>

                          {/* Police */}
                          <div>
                            <label className={`text-xs ${t.mutedText} mb-2 block`}>Police</label>
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
                                      : `${t.settingInactiveBg} ${t.settingInactiveBorder} ${t.settingInactiveText} hover:border-current`
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

                          {/* Largeur du texte */}
                          <div>
                            <label className={`text-xs ${t.mutedText} mb-2 block`}>Largeur du texte</label>
                            <div className="grid grid-cols-3 gap-2">
                              {[
                                { key: "narrow", label: "Étroit" },
                                { key: "medium", label: "Normal" },
                                { key: "large", label: "Large" },
                              ].map(({ key, label }) => (
                                <button
                                  key={key}
                                  onClick={() => setTextWidth(key)}
                                  className={`p-2 rounded-lg border text-center transition-all ${
                                    textWidth === key
                                      ? "bg-indigo-600/20 border-indigo-500 text-indigo-300"
                                      : `${t.settingInactiveBg} ${t.settingInactiveBorder} ${t.settingInactiveText} hover:border-current`
                                  }`}
                                >
                                  <span className="text-xs">{label}</span>
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Espacement des paragraphes */}
                          <div>
                            <label className={`text-xs ${t.mutedText} mb-2 block`}>
                              Espacement paragraphes : {paragraphSpacing.toFixed(1)}rem
                            </label>
                            <input type="range" min="0" max="3" step="0.25" value={paragraphSpacing}
                              onChange={(e) => setParagraphSpacing(Number(e.target.value))}
                              className="w-full accent-indigo-500" />
                            <div className={`flex justify-between text-[10px] ${t.dimText} mt-1`}>
                              <span>Compact</span><span>Aéré</span>
                            </div>
                          </div>

                          {/* Marges latérales */}
                          <div>
                            <label className={`text-xs ${t.mutedText} mb-2 block`}>
                              Marges latérales : {lateralMargins}
                            </label>
                            <input type="range" min="0" max="3" step="1" value={lateralMargins}
                              onChange={(e) => setLateralMargins(Number(e.target.value))}
                              className="w-full accent-indigo-500" />
                            <div className={`flex justify-between text-[10px] ${t.dimText} mt-1`}>
                              <span>Aucune</span><span>Larges</span>
                            </div>
                          </div>

                          {/* Vitesse de défilement auto */}
                          <div>
                            <label className={`text-xs ${t.mutedText} mb-2 block`}>
                              Défilement auto : vitesse {autoScrollSpeed}
                            </label>
                            <input type="range" min="1" max="10" step="1" value={autoScrollSpeed}
                              onChange={(e) => setAutoScrollSpeed(Number(e.target.value))}
                              className="w-full accent-indigo-500" />
                            <div className={`flex justify-between text-[10px] ${t.dimText} mt-1`}>
                              <span>Lent</span><span>Rapide</span>
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
                              <p className={`text-sm ${t.titleText} font-medium`}>Classification active</p>
                              <p className={`text-xs ${t.mutedText}`}>Style visuel par type de contenu</p>
                            </div>
                            <button
                              onClick={() => setClassificationEnabled(!classificationEnabled)}
                              role="switch"
                              aria-checked={classificationEnabled}
                              aria-label="Classification active"
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
                                <label className={`text-xs ${t.mutedText} mb-2 block`}>Style des dialogues</label>
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
                                          : `${t.settingInactiveBg} ${t.settingInactiveBorder} ${t.settingInactiveText} hover:border-current`
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
                                <label className={`text-xs ${t.mutedText} mb-2 block`}>Style des pensées</label>
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
                                          : `${t.settingInactiveBg} ${t.settingInactiveBorder} ${t.settingInactiveText} hover:border-current`
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
                          <p className={`text-xs ${t.mutedText} mb-2`}>Personnalisez la couleur de chaque type de contenu</p>
                          {[
                            { key: "dialogue", label: "Dialogue", dot: "bg-blue-400" },
                            { key: "thought", label: "Pensées", dot: "bg-purple-400" },
                            { key: "sfx", label: "Effets sonores", dot: "bg-amber-400" },
                            { key: "gameBadge", label: "Système / Badge", dot: "bg-cyan-400" },
                            { key: "narration", label: "Narration", dot: "bg-gray-400" },
                          ].map(({ key, label, dot }) => (
                            <div key={key} className={`flex items-center justify-between p-2 rounded-lg ${t.settingBg}/30`}>
                              <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${dot}`} />
                                <span className={`text-sm ${t.mutedText}`}>{label}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`text-xs font-mono ${t.dimText}`}>{colors[key]}</span>
                                <input
                                  type="color"
                                  value={colors[key]}
                                  onChange={(e) => setColors(prev => ({ ...prev, [key]: e.target.value }))}
                                  className={`w-7 h-7 rounded-lg border ${t.settingBorder} cursor-pointer bg-transparent`}
                                  aria-label={`Couleur ${label}`}
                                />
                              </div>
                            </div>
                          ))}
                          <button
                            onClick={() => setColors(THEME_DEFAULTS[readerTheme])}
                            className={`w-full mt-2 text-xs ${t.mutedText} py-1.5 rounded-lg border ${t.dropBorder} transition-colors`}
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
                  className={`p-2 ${t.btnHover} rounded-lg transition-colors ${t.btnText} disabled:opacity-30 disabled:cursor-not-allowed`}
                  title="Chapitre précédent (←)"
                  aria-label="Chapitre précédent"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={() => nextChapter && navigateTo(nextChapter)}
                  disabled={!nextChapter}
                  className={`p-2 ${t.btnHover} rounded-lg transition-colors ${t.btnText} disabled:opacity-30 disabled:cursor-not-allowed`}
                  title="Chapitre suivant (→)"
                  aria-label="Chapitre suivant"
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
      )}

      {/* ─── Contenu du chapitre ─── */}
      <main ref={contentRef} className={zenMode ? "pt-8 pb-32" : "pt-20 pb-32"}>
        {/* Fil d'Ariane (Breadcrumb) */}
        <nav aria-label="Fil d'Ariane" className={`${widthClass} mx-auto ${marginPx} mb-6`}>
          <ol className={`flex items-center flex-wrap gap-1.5 text-sm ${t.mutedText}`} itemScope itemType="https://schema.org/BreadcrumbList">
            <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
              <a href="/" itemProp="item" className="hover:opacity-75 transition-colors">
                <span itemProp="name">Accueil</span>
              </a>
              <meta itemProp="position" content="1" />
            </li>
            <li className={t.breadcrumbSep}>/</li>
            <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
              <a href="/oeuvres" itemProp="item" className="hover:opacity-75 transition-colors">
                <span itemProp="name">Catalogue</span>
              </a>
              <meta itemProp="position" content="2" />
            </li>
            <li className={t.breadcrumbSep}>/</li>
            <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
              <span itemProp="name" className={t.mutedText}>{oeuvreTitle}</span>
              <meta itemProp="position" content="3" />
            </li>
            <li className={t.breadcrumbSep}>/</li>
            <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
              <span itemProp="name" className="text-indigo-400">Chapitre {chapitre.order}</span>
              <meta itemProp="position" content="4" />
            </li>
          </ol>
        </nav>

        {/* En-tête du chapitre */}
        <div className={`${widthClass} mx-auto ${marginPx} mb-10`}>
          <div className={`text-center py-10 border-b ${t.chapterBorder}`}>
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
              <div className={`text-sm ${t.mutedText} uppercase tracking-widest mb-2`}>
                Chapitre {chapitre.order}
              </div>
            )}

            {/* Titre */}
            <h1 className={`text-3xl sm:text-4xl font-bold ${t.titleText} mb-4 leading-tight`}>
              {chapterTitle}
            </h1>

            {/* Meta */}
            <div className={`flex flex-wrap items-center justify-center gap-4 text-sm ${t.mutedText}`}>
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
                <span className={`flex items-center gap-1.5 ${t.dimText}`}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Chapitre {currentIndex + 1}/{sortedChapitres.length} — {Math.round(((currentIndex + 1) / sortedChapitres.length) * 100)}%
                </span>
              )}
              {wordCount > 0 && (
                <>
                  <span className="flex items-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    ~{readingTime} min de lecture
                  </span>
                  <span className={t.dimText}>
                    {wordCount.toLocaleString("fr-FR")} mots
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Zone de contenu */}
        <article className={`${widthClass} mx-auto ${marginPx}`}>
          {chapitre.pdf ? (
            // ─── Chapitre PDF : affichage intégré + lien de téléchargement ───
            <div className="space-y-6">
              <div className={`flex flex-col sm:flex-row items-center gap-4 p-6 ${t.pdfBg} rounded-xl border ${t.pdfBorder}`}>
                <div className="flex-shrink-0 w-16 h-16 rounded-xl bg-green-600/20 flex items-center justify-center">
                  <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <h2 className={`text-lg font-semibold ${t.titleText}`}>Ce chapitre est disponible en PDF</h2>
                  <p className={`text-sm ${t.mutedText} mt-1`}>Consultez-le directement dans le lecteur intégré ou téléchargez-le.</p>
                </div>
                <a
                  href={chapitre.pdf}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-500 text-white font-medium rounded-xl transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Ouvrir le PDF
                </a>
              </div>
              {/* Lecteur PDF intégré */}
              <div className={`w-full rounded-xl overflow-hidden border ${t.pdfBorder} ${t.pdfBg}`}>
                <iframe
                  src={chapitre.pdf}
                  className="w-full border-0"
                  style={{ height: "80vh" }}
                  title={`PDF - ${chapterTitle}`}
                  loading="lazy"
                />
              </div>
            </div>
          ) : (
            // ─── Chapitre texte : rendu riche classique ───
            <RichContentRenderer
              texte={chapitre.texte}
              fontSize={fontSize}
              fontFamily={fontFamily}
              contentClasses={contentClasses}
              contentCSSVars={contentCSSVars}
            />
          )}
        </article>

        {/* ─── Bannière publicitaire + Novel-Index ─── */}
        <div className={`${widthClass} mx-auto ${marginPx} mt-12`}>
          <BannerCarousel variant="inline" novelIndexUrl={novelIndexUrl} />
        </div>

        {/* ─── Footer de navigation ─── */}
        <div className={`${widthClass} mx-auto ${marginPx} mt-8`}>
          <div className={`border-t ${t.chapterBorder} pt-8`}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Chapitre précédent */}
              <div>
                {prevChapter ? (
                  <button
                    onClick={() => navigateTo(prevChapter)}
                    className={`w-full group text-left p-4 ${t.cardBg} ${t.cardHover} rounded-xl border ${t.cardBorder} ${t.cardHoverBorder} transition-all`}
                  >
                    <span className={`text-xs ${t.mutedText} flex items-center gap-1 mb-1`}>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                      </svg>
                      Chapitre précédent
                    </span>
                    <span className={`${t.titleText} font-medium group-hover:text-indigo-300 transition-colors line-clamp-1`}>
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
                    className={`w-full group text-right p-4 ${t.cardBg} ${t.cardHover} rounded-xl border ${t.cardBorder} ${t.cardHoverBorder} transition-all`}
                  >
                    <span className={`text-xs ${t.mutedText} flex items-center justify-end gap-1 mb-1`}>
                      Chapitre suivant
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                      </svg>
                    </span>
                    <span className={`${t.titleText} font-medium group-hover:text-indigo-300 transition-colors line-clamp-1`}>
                      {nextChapter.titre}
                    </span>
                  </button>
                ) : (
                  <div className={`text-center p-6 ${t.cardBg} rounded-xl border ${t.cardBorder}`}>
                    <div className="w-12 h-12 rounded-full bg-indigo-600/20 flex items-center justify-center mx-auto mb-3">
                      <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className={`${t.titleText} font-medium mb-1`}>Vous êtes à jour !</p>
                    <p className={`${t.mutedText} text-sm mb-4`}>C&apos;était le dernier chapitre disponible pour <span className="text-indigo-300">{oeuvreTitle}</span>.</p>
                    <button
                      onClick={() => router.push("/oeuvres")}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      Découvrir d&apos;autres œuvres
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Partager ma progression / l'oeuvre */}
            <div className="flex flex-wrap justify-center gap-3 mt-8">
              <button
                onClick={() => generateShareCard("progress")}
                disabled={shareCardGenerating}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl ${t.cardBg} border ${t.cardBorder} ${t.cardHover} ${t.mutedText} text-sm font-medium transition-all`}
              >
                <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                {shareCardGenerating ? "Génération..." : "Partager ma progression"}
              </button>
              <button
                onClick={() => generateShareCard("oeuvre")}
                disabled={shareCardGenerating}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl ${t.cardBg} border ${t.cardBorder} ${t.cardHover} ${t.mutedText} text-sm font-medium transition-all`}
              >
                <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                {shareCardGenerating ? "Génération..." : "Partager l'oeuvre"}
              </button>
            </div>

            {/* Signaler une erreur */}
            <div className="flex justify-center mt-4 mb-4">
              <button
                onClick={() => setShowErrorReport(true)}
                className={`inline-flex items-center gap-2.5 px-5 py-3 rounded-xl bg-red-600/10 border border-red-500/30 text-red-400 hover:bg-red-600/20 hover:border-red-500/50 text-sm font-medium transition-all`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                Signaler une erreur de traduction
              </button>
            </div>

            {/* Raccourcis clavier (desktop) */}
            <div className={`hidden sm:flex items-center justify-center gap-6 mt-8 text-xs ${t.dimText}`}>
              <span className="flex items-center gap-2">
                <kbd className={`px-2 py-1 ${t.kbdBg} rounded border ${t.kbdBorder} font-mono`}>←</kbd>
                Précédent
              </span>
              <span className="flex items-center gap-2">
                <kbd className={`px-2 py-1 ${t.kbdBg} rounded border ${t.kbdBorder} font-mono`}>→</kbd>
                Suivant
              </span>
              <span className="flex items-center gap-2">
                <kbd className={`px-2 py-1 ${t.kbdBg} rounded border ${t.kbdBorder} font-mono`}>Home</kbd>
                Haut de page
              </span>
            </div>
            {/* Indication swipe mobile */}
            <div className={`sm:hidden flex items-center justify-center gap-2 mt-6 text-xs ${t.dimText}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16l-4-4m0 0l4-4m-4 4h18" />
              </svg>
              <span>Swipez pour naviguer</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </div>
          </div>
        </div>
      </main>

      {/* ─── Bouton retour en haut ─── */}
      {showScrollTop && !zenMode && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className={`fixed bottom-6 right-6 z-40 w-10 h-10 ${t.scrollTopBg} border ${t.scrollTopBorder} rounded-full flex items-center justify-center ${t.btnText} transition-all shadow-lg`}
          aria-label="Retour en haut de page"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
          </svg>
        </button>
      )}

      {/* ─── Bouton reprendre la lecture ─── */}
      {showResumePrompt && !zenMode && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-4 py-3 bg-indigo-600 rounded-xl shadow-2xl animate-fade-in">
          <span className="text-sm text-white">Reprendre votre lecture ?</span>
          <button
            onClick={resumeReading}
            className="px-3 py-1 bg-white text-indigo-600 text-sm font-medium rounded-lg hover:bg-gray-100 transition-colors"
          >
            Reprendre
          </button>
          <button
            onClick={() => setShowResumePrompt(false)}
            className="p-1 text-indigo-200 hover:text-white transition-colors"
            aria-label="Fermer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* ─── Sortir du mode zen ─── */}
      {zenMode && (
        <button
          onClick={() => setZenMode(false)}
          className={`fixed top-4 right-4 z-50 p-2 ${t.floatBg} ${t.btnHover} rounded-full ${t.btnText} transition-all opacity-0 hover:opacity-100 focus:opacity-100`}
          aria-label="Quitter le mode zen"
          title="Quitter le mode zen (Escape)"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}

      {/* ─── TTS Player ─── */}
      {!chapitre.pdf && (
        <TTSPlayer texte={chapitre.texte} themeStyles={t} />
      )}

      {/* ─── Sélection de texte enrichie ─── */}
      <TextSelectionPopover
        containerRef={contentRef}
        themeStyles={t}
        oeuvreTitle={oeuvreTitle}
        chapterTitle={chapterTitle}
      />

      {/* ─── Overlay de luminosité ─── */}
      {brightness < 1 && (
        <div
          className="fixed inset-0 bg-black pointer-events-none z-[90] transition-opacity duration-200"
          style={{ opacity: 1 - brightness }}
          aria-hidden="true"
        />
      )}

      {/* ─── Contrôles flottants : taille + luminosité ─── */}
      {!zenMode && (
        <div className={`fixed bottom-6 left-4 z-40 flex items-center gap-1 px-2 py-1.5 ${t.floatBg} border ${t.floatBorder} rounded-full shadow-lg backdrop-blur-sm`}>
          {/* Taille de police */}
          <button
            onClick={() => setFontSize(Math.max(14, fontSize - 2))}
            className={`w-8 h-8 rounded-full flex items-center justify-center ${t.btnText} transition-colors`}
            aria-label="Réduire la taille du texte"
          >
            <span className="text-xs font-bold">A-</span>
          </button>
          <span className={`text-[10px] ${t.dimText} w-8 text-center tabular-nums`}>{fontSize}</span>
          <button
            onClick={() => setFontSize(Math.min(28, fontSize + 2))}
            className={`w-8 h-8 rounded-full flex items-center justify-center ${t.btnText} transition-colors`}
            aria-label="Augmenter la taille du texte"
          >
            <span className="text-sm font-bold">A+</span>
          </button>

          <div className={`w-px h-5 ${t.floatBorder} mx-0.5`} />

          {/* Luminosité */}
          <button
            onClick={() => setBrightness(Math.max(0.3, +(brightness - 0.1).toFixed(2)))}
            className={`w-8 h-8 rounded-full flex items-center justify-center ${t.btnText} transition-colors`}
            aria-label="Réduire la luminosité"
            title={`Luminosité ${Math.round(brightness * 100)}%`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          </button>
          <span className={`text-[10px] ${t.dimText} w-8 text-center tabular-nums`}>{Math.round(brightness * 100)}%</span>
          <button
            onClick={() => setBrightness(Math.min(1, +(brightness + 0.1).toFixed(2)))}
            className={`w-8 h-8 rounded-full flex items-center justify-center ${t.btnText} transition-colors`}
            aria-label="Augmenter la luminosité"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </button>

          <div className={`w-px h-5 ${t.floatBorder} mx-0.5`} />

          {/* Thèmes & police (livre SVG) */}
          <div className="relative" ref={floatThemeRef}>
            <button
              onClick={() => setShowFloatThemePicker(!showFloatThemePicker)}
              className={`w-8 h-8 rounded-full flex items-center justify-center ${t.btnText} transition-colors`}
              title="Thèmes & police"
              aria-label="Thèmes et police de lecture"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </button>
            {showFloatThemePicker && (
              <div className={`absolute bottom-full left-0 mb-2 w-56 ${t.dropBg} border ${t.dropBorder} rounded-xl shadow-2xl animate-fade-in max-h-[70vh] overflow-y-auto no-scrollbar`}>
                {/* Thèmes */}
                <div className={`p-3 border-b ${t.dropBorder}`}>
                  <p className={`text-sm font-semibold ${t.titleText}`}>Thème de lecture</p>
                </div>
                <div className="p-1.5">
                  {[
                    { key: "dark", bg: "#111827", fg: "#d4d4d8" },
                    { key: "light", bg: "#fafaf9", fg: "#1c1917" },
                    { key: "comfort", bg: "#fffbeb", fg: "#451a03" },
                    { key: "night", bg: "#0b1120", fg: "#b8b0a0" },
                    { key: "forest", bg: "#0a1a0f", fg: "#b4c8b0" },
                    { key: "rose", bg: "#1a0f14", fg: "#c8b8c0" },
                    { key: "ocean", bg: "#0a141a", fg: "#a8c4d0" },
                    { key: "paper", bg: "#e8dfd0", fg: "#3a3028" },
                        { key: "ink", bg: "#e4e0d8", fg: "#38342e" },
                  ].map(({ key, bg, fg }) => (
                    <button
                      key={key}
                      onClick={() => changeTheme(key)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                        readerTheme === key ? "bg-indigo-600/20" : `${t.cardHover}`
                      }`}
                    >
                      <span
                        className={`w-6 h-6 rounded-md border flex-shrink-0 flex items-center justify-center text-[9px] font-medium ${
                          readerTheme === key ? "ring-2 ring-indigo-400 border-transparent" : "border-black/10"
                        }`}
                        style={{ backgroundColor: bg, color: fg }}
                      >
                        Aa
                      </span>
                      <span className={`text-sm ${readerTheme === key ? "text-indigo-300 font-medium" : t.mutedText}`}>
                        {THEME_LABELS[key]}
                      </span>
                      {readerTheme === key && (
                        <svg className="w-4 h-4 ml-auto text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
                {/* Police */}
                <div className={`p-3 border-t ${t.dropBorder}`}>
                  <p className={`text-xs ${t.mutedText} mb-2`}>Police</p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { key: "sans", label: "Sans", ff: "system-ui, sans-serif" },
                      { key: "serif", label: "Serif", ff: "Georgia, serif" },
                      { key: "mono", label: "Mono", ff: "monospace" },
                    ].map(({ key, label, ff }) => (
                      <button
                        key={key}
                        onClick={() => setFontFamily(key)}
                        className={`p-1.5 rounded-lg border text-center transition-all ${
                          fontFamily === key
                            ? "bg-indigo-600/20 border-indigo-500 text-indigo-300"
                            : `${t.settingInactiveBg} ${t.settingInactiveBorder} ${t.settingInactiveText} hover:border-current`
                        }`}
                      >
                        <span className="block text-base" style={{ fontFamily: ff }}>Aa</span>
                        <span className="text-[10px]">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className={`w-px h-5 ${t.floatBorder} mx-0.5`} />

          {/* Auto-scroll */}
          <div className="relative" ref={autoScrollPanelRef}>
            <button
              onClick={() => setShowAutoScrollPanel(!showAutoScrollPanel)}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${autoScrolling ? "text-green-400" : t.btnText}`}
              title={autoScrolling ? "Défilement en cours" : "Défilement auto"}
              aria-label="Défilement automatique"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </button>
            {showAutoScrollPanel && (
              <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 ${t.dropBg} border ${t.dropBorder} rounded-xl shadow-2xl animate-fade-in`}>
                <div className={`p-3 border-b ${t.dropBorder} flex items-center justify-between`}>
                  <p className={`text-sm font-semibold ${t.titleText}`}>Défilement auto</p>
                  <button
                    onClick={() => { setAutoScrolling(!autoScrolling); }}
                    role="switch"
                    aria-checked={autoScrolling}
                    className={`relative w-10 h-5 rounded-full transition-colors ${autoScrolling ? "bg-green-600" : "bg-gray-600"}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow ${autoScrolling ? "translate-x-5" : ""}`} />
                  </button>
                </div>
                <div className="p-3">
                  <label className={`text-xs ${t.mutedText} mb-2 block`}>
                    Vitesse : {autoScrollSpeed}
                  </label>
                  <input type="range" min="1" max="10" step="1" value={autoScrollSpeed}
                    onChange={(e) => setAutoScrollSpeed(Number(e.target.value))}
                    className="w-full accent-green-500" />
                  <div className={`flex justify-between text-[10px] ${t.dimText} mt-1`}>
                    <span>Lent</span><span>Rapide</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Focus mode */}
          <button
            onClick={() => setFocusMode(!focusMode)}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${focusMode ? "text-amber-400" : t.btnText}`}
            title={focusMode ? "Désactiver le focus" : "Mode focus paragraphe"}
            aria-label="Mode focus paragraphe"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </button>
        </div>
      )}

      {/* ─── Modal carte de partage ─── */}
      {showShareCard && shareCardUrl && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => { setShowShareCard(false); setShareCardUrl(null); }}>
          <div className={`w-full max-w-2xl mx-4 ${t.dropBg} border ${t.dropBorder} rounded-2xl shadow-2xl animate-fade-in`} onClick={(e) => e.stopPropagation()}>
            <div className={`p-4 border-b ${t.dropBorder} flex items-center justify-between`}>
              <h3 className={`text-lg font-semibold ${t.titleText}`}>Carte de partage</h3>
              <button onClick={() => { setShowShareCard(false); setShareCardUrl(null); }} className={`p-1 ${t.btnText} transition-colors`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4">
              <img src={shareCardUrl} alt="Carte de partage" className="w-full rounded-xl shadow-lg" />
              <div className="flex gap-3 mt-4">
                <button
                  onClick={downloadShareCard}
                  className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Télécharger l&apos;image
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href).catch(() => {});
                    setCopiedLink(true);
                    setTimeout(() => setCopiedLink(false), 2000);
                  }}
                  className={`px-4 py-2.5 rounded-lg border ${t.cardBorder} ${t.cardHover} ${t.mutedText} text-sm font-medium transition-colors flex items-center gap-2`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  {copiedLink ? "Copié !" : "Copier le lien"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal signalement d'erreur ─── */}
      {showErrorReport && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowErrorReport(false)}>
          <div className={`w-full max-w-md mx-4 ${t.dropBg} border ${t.dropBorder} rounded-2xl shadow-2xl animate-fade-in`} onClick={(e) => e.stopPropagation()}>
            <div className={`p-4 border-b ${t.dropBorder} flex items-center justify-between`}>
              <h3 className={`text-lg font-semibold ${t.titleText}`}>Signaler une erreur</h3>
              <button onClick={() => setShowErrorReport(false)} className={`p-1 ${t.btnText} transition-colors`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 space-y-4">
              {errorReportSent ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 rounded-full bg-green-600/20 flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className={`${t.titleText} font-medium`}>Merci pour votre signalement !</p>
                  <p className={`text-sm ${t.mutedText} mt-1`}>Il sera examiné par l&apos;équipe.</p>
                </div>
              ) : (
                <>
                  <div>
                    <label className={`text-xs ${t.mutedText} mb-1.5 block`}>Type d&apos;erreur</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { key: "traduction", label: "Traduction" },
                        { key: "orthographe", label: "Orthographe" },
                        { key: "autre", label: "Autre" },
                      ].map(({ key, label }) => (
                        <button
                          key={key}
                          onClick={() => setErrorReportData((prev) => ({ ...prev, type: key }))}
                          className={`p-2 rounded-lg border text-center text-xs transition-all ${
                            errorReportData.type === key
                              ? "bg-indigo-600/20 border-indigo-500 text-indigo-300"
                              : `${t.settingInactiveBg} ${t.settingInactiveBorder} ${t.settingInactiveText}`
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className={`text-xs ${t.mutedText} mb-1.5 block`}>Passage concerné (optionnel)</label>
                    <input
                      type="text"
                      value={errorReportData.paragraphe}
                      onChange={(e) => setErrorReportData((prev) => ({ ...prev, paragraphe: e.target.value }))}
                      placeholder="Copiez le passage contenant l'erreur..."
                      maxLength={500}
                      className={`w-full text-sm px-3 py-2 rounded-lg ${t.settingBg} border ${t.settingBorder} ${t.mutedText} bg-transparent outline-none focus:ring-1 focus:ring-indigo-500`}
                    />
                  </div>
                  <div>
                    <label className={`text-xs ${t.mutedText} mb-1.5 block`}>Description de l&apos;erreur *</label>
                    <textarea
                      value={errorReportData.texte}
                      onChange={(e) => setErrorReportData((prev) => ({ ...prev, texte: e.target.value }))}
                      placeholder="Décrivez l'erreur que vous avez trouvée..."
                      maxLength={2000}
                      rows={3}
                      className={`w-full text-sm px-3 py-2 rounded-lg ${t.settingBg} border ${t.settingBorder} ${t.mutedText} bg-transparent outline-none focus:ring-1 focus:ring-indigo-500 resize-none`}
                    />
                    <span className={`text-[10px] ${t.dimText}`}>{errorReportData.texte.length}/2000</span>
                  </div>
                  <div className={`p-3 rounded-lg ${t.settingBg} border ${t.settingBorder}`}>
                    <p className={`text-xs ${t.dimText}`}>
                      Ce signalement sera envoyé à l&apos;équipe de Novel-Index pour examen.
                    </p>
                    <p className={`text-[10px] ${t.dimText} mt-1`}>
                      {oeuvreTitle} — Chapitre {chapitre.order}: {chapterTitle}
                    </p>
                  </div>
                  <button
                    onClick={submitErrorReport}
                    disabled={!errorReportData.texte.trim() || errorReportSending}
                    className="w-full px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                  >
                    {errorReportSending ? "Envoi..." : "Envoyer le signalement"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
