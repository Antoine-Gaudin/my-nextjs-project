"use client";

import React, { useState, useCallback, useRef } from "react";
import Cookies from "js-cookie";
import mammoth from "mammoth/mammoth.browser";
import { htmlToStrapiBlocks, countWords } from "./strapiBlocksUtils";

// ─── Tri naturel (Chapitre 2 < Chapitre 10) ───
function naturalSort(a, b) {
  const nameA = typeof a === "string" ? a : a.name || "";
  const nameB = typeof b === "string" ? b : b.name || "";
  return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: "base" });
}

// ─── Extraire le tome depuis webkitRelativePath ───
function extractTomeFromPath(file) {
  const rel = file.webkitRelativePath || "";
  if (!rel) return null;
  const parts = rel.split("/");
  // parts[0] = dossier racine, parts[last] = fichier
  // Si ≥3 parties → sous-dossier = tome
  if (parts.length >= 3) return parts[parts.length - 2];
  return null;
}

function isAcceptedFile(name) {
  return /\.(docx|txt|md)$/i.test(name);
}

const ImportWord = ({ oeuvreId, oeuvreTitre, onClose, onImportDone }) => {
  const [mode, setMode] = useState("basic"); // "basic" | "multi" | "batch"
  const [files, setFiles] = useState([]); // [{ file: File, tome: string|null }]
  const [importing, setImporting] = useState(false);
  const [progressText, setProgressText] = useState("");
  const [progressPct, setProgressPct] = useState(0);
  const [results, setResults] = useState([]);
  const [preview, setPreview] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);

  // ─── Gestion fichiers (input classique ou dossier) ───
  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files).map(f => ({
      file: f,
      tome: extractTomeFromPath(f),
    }));
    setFiles(selected);
    setPreview(null);
    setResults([]);
    setProgressText("");
  };

  // ─── Helpers drag & drop de dossiers ───
  function entryToFile(entry) {
    return new Promise((resolve) => {
      entry.file(resolve, () => resolve(null));
    });
  }

  function readEntries(dirEntry) {
    return new Promise((resolve) => {
      const reader = dirEntry.createReader();
      const all = [];
      const readBatch = () => {
        reader.readEntries((entries) => {
          if (entries.length === 0) resolve(all);
          else { all.push(...entries); readBatch(); }
        }, () => resolve(all));
      };
      readBatch();
    });
  }

  async function readDirectoryRecursive(dirEntry, parentTome, collected) {
    const tome = parentTome || dirEntry.name;
    const entries = await readEntries(dirEntry);
    for (const entry of entries) {
      if (entry.isFile) {
        const file = await entryToFile(entry);
        if (file && isAcceptedFile(file.name)) collected.push({ file, tome });
      } else if (entry.isDirectory) {
        await readDirectoryRecursive(entry, entry.name, collected);
      }
    }
  }

  // ─── Drag & drop avec support dossiers ───
  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    setDragOver(false);
    const items = e.dataTransfer?.items;
    if (!items) return;

    const collected = [];
    const entries = [];
    for (const item of items) {
      const entry = item.webkitGetAsEntry?.();
      if (entry) entries.push(entry);
    }

    const hasDir = entries.some(en => en.isDirectory);
    if (hasDir) {
      for (const entry of entries) {
        if (entry.isDirectory) await readDirectoryRecursive(entry, null, collected);
        else if (entry.isFile) {
          const file = await entryToFile(entry);
          if (file && isAcceptedFile(file.name)) collected.push({ file, tome: null });
        }
      }
    } else {
      Array.from(e.dataTransfer.files || []).forEach(f => {
        if (isAcceptedFile(f.name)) collected.push({ file: f, tome: null });
      });
    }

    if (collected.length > 0) {
      setFiles(collected);
      setPreview(null);
      setResults([]);
      if (collected.length > 1 && mode === "basic") setMode("batch");
    }
  }, [mode]);

  const convertDocxToHtml = async (file) => {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.convertToHtml({ arrayBuffer });
    return result.value;
  };

  const readTextFile = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  const convertFile = async (file) => {
    const ext = file.name.split(".").pop().toLowerCase();
    if (ext === "txt" || ext === "md") {
      const text = await readTextFile(file);
      // Wrap plain text lines in <p> tags
      return text.split(/\n\n+/).map(p => `<p>${p.replace(/\n/g, "<br>")}</p>`).join("");
    }
    return convertDocxToHtml(file);
  };

  const splitByHeadings = (html) => {
    const parts = html.split(/<h[12][^>]*>/i);
    const titles = [];
    const regex = /<h[12][^>]*>(.*?)<\/h[12]>/gi;
    let match;
    while ((match = regex.exec(html)) !== null) {
      titles.push(match[1].replace(/<[^>]+>/g, "").trim());
    }

    const chapters = [];
    for (let i = 0; i < titles.length; i++) {
      const content = parts[i + 1];
      if (content) {
        const cleanContent = content.replace(/<\/h[12]>/i, "").trim();
        if (cleanContent) {
          chapters.push({ titre: titles[i], html: cleanContent });
        }
      }
    }
    return chapters;
  };

  const getNextOrder = async () => {
    const jwt = Cookies.get("jwt");
    try {
      const res = await fetch(
        `/api/proxy/chapitres?filters[oeuvres][documentId][$eq]=${oeuvreId}&sort=order:desc&pagination[limit]=1`,
        { headers: { Authorization: `Bearer ${jwt}` } }
      );
      const data = await res.json();
      const lastOrder = data.data?.[0]?.order || 0;
      return lastOrder + 1;
    } catch {
      return 1;
    }
  };

  // ── Novel-index sync helper via route serveur ──
  const getNovelIndexOeuvreId = async () => {
    try {
      const jwt = Cookies.get("jwt");
      const res = await fetch('/api/novel-index', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({ action: 'find-oeuvre', titre: oeuvreTitre }),
      });
      const data = await res.json();
      return data.data?.documentId || null;
    } catch {
      return null;
    }
  };

  const createChapitre = async (titre, html, order, tome, oeuvreIndexId) => {
    const jwt = Cookies.get("jwt");
    const strapiBlocks = htmlToStrapiBlocks(html);

    const res = await fetch(`/api/proxy/chapitres`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({
        data: {
          titre,
          order,
          tome: tome || null,
          texte: strapiBlocks,
          oeuvres: oeuvreId,
        },
      }),
    });

    if (!res.ok) throw new Error(`Erreur Strapi: ${res.status}`);

    const createData = await res.json();
    const documentId = createData.data.documentId;

    // Novel-index sync via route serveur
    if (oeuvreIndexId) {
      try {
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
              order,
              tome: tome || null,
              url: chapitreUrl,
            },
          }),
        });
      } catch (syncErr) {
        console.warn("Sync novel-index ignorée :", syncErr.message);
      }
    }

    return { titre, blockCount: strapiBlocks.length };
  };

  // ─── Générer la preview avant import ───
  const handlePreview = async () => {
    if (files.length === 0) return;
    setProgressText("Analyse des fichiers...");
    setResults([]);

    try {
      const chapters = [];

      if (mode === "basic") {
        const { file, tome } = files[0];
        const html = await convertFile(file);
        const titre = file.name.replace(/\.(docx|txt|md)$/i, "");
        const blocks = htmlToStrapiBlocks(html);
        chapters.push({ titre, html, wordCount: countWords(html), blockCount: blocks.length, tome });
      } else if (mode === "multi") {
        const { file, tome } = files[0];
        const html = await convertFile(file);
        const splitChaps = splitByHeadings(html);
        if (splitChaps.length === 0) {
          const titre = file.name.replace(/\.(docx|txt|md)$/i, "");
          const blocks = htmlToStrapiBlocks(html);
          chapters.push({ titre, html, wordCount: countWords(html), blockCount: blocks.length, tome });
        } else {
          for (const ch of splitChaps) {
            const blocks = htmlToStrapiBlocks(ch.html);
            chapters.push({ titre: ch.titre, html: ch.html, wordCount: countWords(ch.html), blockCount: blocks.length, tome });
          }
        }
      } else if (mode === "batch") {
        const sorted = [...files].sort((a, b) => naturalSort(a.file, b.file));
        for (const { file, tome } of sorted) {
          const html = await convertFile(file);
          const titre = file.name.replace(/\.(docx|txt|md)$/i, "");
          const blocks = htmlToStrapiBlocks(html);
          chapters.push({ titre, html, wordCount: countWords(html), blockCount: blocks.length, tome });
        }
      }

      setPreview({ chapters });
      setShowPreview(true);
      setProgressText("");
    } catch (err) {
      console.error("Erreur preview :", err);
      setProgressText(`Erreur preview : ${err.message}`);
    }
  };

  // ─── Lancer l'import ───
  const handleImport = async () => {
    const chaptersToImport = preview?.chapters || [];
    if (chaptersToImport.length === 0) {
      // Si pas de preview, générer d'abord
      await handlePreview();
      return;
    }

    setImporting(true);
    setResults([]);
    setProgressPct(0);
    const importResults = [];

    try {
      const startOrder = await getNextOrder();
      // Cache l'ID novel-index une seule fois
      const oeuvreIndexId = await getNovelIndexOeuvreId();

      for (let i = 0; i < chaptersToImport.length; i++) {
        const ch = chaptersToImport[i];
        setProgressText(`Import ${i + 1}/${chaptersToImport.length} : ${ch.titre}`);
        setProgressPct(Math.round(((i + 1) / chaptersToImport.length) * 100));

        try {
          const result = await createChapitre(ch.titre, ch.html, startOrder + i, ch.tome, oeuvreIndexId);
          importResults.push({ titre: ch.titre, status: "ok", blockCount: result.blockCount, tome: ch.tome });
        } catch (err) {
          console.error(`Erreur import "${ch.titre}" :`, err);
          importResults.push({ titre: ch.titre, status: "error", error: err.message, tome: ch.tome });
        }

        setResults([...importResults]);
      }

      const successCount = importResults.filter(r => r.status === "ok").length;
      const errorCount = importResults.filter(r => r.status === "error").length;
      setProgressText(
        `Import terminé ! ${successCount} réussi${successCount > 1 ? "s" : ""}${errorCount > 0 ? `, ${errorCount} erreur${errorCount > 1 ? "s" : ""}` : ""}`
      );
      setProgressPct(100);

      if (onImportDone) onImportDone();
    } catch (err) {
      console.error("Erreur import Word :", err);
      setProgressText(`Erreur fatale : ${err.message}`);
    } finally {
      setImporting(false);
    }
  };

  const totalWords = preview?.chapters.reduce((sum, ch) => sum + ch.wordCount, 0) || 0;
  const totalBlocks = preview?.chapters.reduce((sum, ch) => sum + ch.blockCount, 0) || 0;

  // Regrouper les fichiers par tome
  const filesByTome = files.reduce((acc, { file, tome }) => {
    const key = tome || "__none__";
    if (!acc[key]) acc[key] = [];
    acc[key].push(file);
    return acc;
  }, {});
  const hasTomes = Object.keys(filesByTome).some(k => k !== "__none__");

  // Regrouper la preview par tome
  const previewByTome = preview?.chapters.reduce((acc, ch) => {
    const key = ch.tome || "__none__";
    if (!acc[key]) acc[key] = [];
    acc[key].push(ch);
    return acc;
  }, {}) || {};

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div
        className="relative bg-gray-900 text-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[95vh] flex flex-col overflow-hidden"
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        {/* Drag overlay */}
        {dragOver && (
          <div className="absolute inset-0 z-50 bg-purple-600/20 border-2 border-dashed border-purple-400 rounded-2xl flex items-center justify-center backdrop-blur-sm">
            <div className="text-center">
              <svg className="w-16 h-16 text-purple-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-lg font-semibold text-purple-300">Déposez des fichiers ou dossiers</p>
              <p className="text-sm text-purple-400/70 mt-1">Les dossiers seront utilisés comme noms de tome</p>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-600/20 rounded-lg">
              <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold">Import de fichiers</h2>
              <p className="text-xs text-gray-400">{oeuvreTitre || "Œuvre"} • .docx / .txt</p>
            </div>
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

        {/* Contenu scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Mode selection */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-2">Mode d&apos;import</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Basique */}
              <button type="button" onClick={() => { setMode("basic"); setPreview(null); setResults([]); }}
                className={`p-4 rounded-xl border-2 text-sm transition text-left ${
                  mode === "basic" ? "border-indigo-500 bg-indigo-600/20" : "border-gray-700 bg-gray-800/50 hover:border-gray-500"
                }`}>
                <div className="flex items-center gap-2 mb-2">
                  <svg className={`w-5 h-5 ${mode === "basic" ? "text-indigo-400" : "text-gray-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="font-bold">Basique</span>
                </div>
                <p className="text-xs text-gray-400">Un seul fichier = un seul chapitre</p>
                <div className="mt-2 p-2 rounded-lg bg-gray-900/50 text-[11px] font-mono text-gray-400">
                  📄 chapitre.docx → 1 chapitre
                </div>
              </button>

              {/* Multi */}
              <button type="button" onClick={() => { setMode("multi"); setPreview(null); setResults([]); }}
                className={`p-4 rounded-xl border-2 text-sm transition text-left ${
                  mode === "multi" ? "border-indigo-500 bg-indigo-600/20" : "border-gray-700 bg-gray-800/50 hover:border-gray-500"
                }`}>
                <div className="flex items-center gap-2 mb-2">
                  <svg className={`w-5 h-5 ${mode === "multi" ? "text-indigo-400" : "text-gray-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  <span className="font-bold">Multi-chapitres</span>
                </div>
                <p className="text-xs text-gray-400">Un fichier contenant plusieurs chapitres séparés par des titres H1 ou H2</p>
                <div className="mt-2 p-2 rounded-lg bg-gray-900/50 text-[11px] font-mono text-gray-400">
                  📄 roman.docx → N chapitres
                </div>
              </button>

              {/* Batch */}
              <button type="button" onClick={() => { setMode("batch"); setPreview(null); setResults([]); }}
                className={`p-4 rounded-xl border-2 text-sm transition text-left ${
                  mode === "batch" ? "border-indigo-500 bg-indigo-600/20" : "border-gray-700 bg-gray-800/50 hover:border-gray-500"
                }`}>
                <div className="flex items-center gap-2 mb-2">
                  <svg className={`w-5 h-5 ${mode === "batch" ? "text-indigo-400" : "text-gray-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                  </svg>
                  <span className="font-bold">Batch / Lot</span>
                </div>
                <p className="text-xs text-gray-400">Plusieurs fichiers = un chapitre chacun. Supporte les dossiers pour les tomes.</p>
                <div className="mt-2 p-2 rounded-lg bg-gray-900/50 text-[11px] font-mono text-gray-400">
                  📄📄📄 fichiers → N chapitres
                </div>
              </button>
            </div>
          </div>

          {/* Explication batch détaillée */}
          {mode === "batch" && (
            <div className="rounded-xl border border-indigo-500/30 bg-indigo-950/20 overflow-hidden">
              <details className="group" open>
                <summary className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none hover:bg-indigo-900/20 transition-colors">
                  <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm font-semibold text-indigo-300">Comment fonctionne le mode batch ?</span>
                  <svg className="w-4 h-4 text-indigo-400 ml-auto transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="px-4 pb-4 text-sm space-y-4 border-t border-indigo-500/20 pt-3">
                  <div>
                    <p className="text-gray-300 font-medium mb-2 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-indigo-600/40 text-indigo-300 flex items-center justify-center text-xs font-bold">1</span>
                      Sélectionnez plusieurs fichiers
                    </p>
                    <div className="p-3 rounded-lg bg-gray-900/60 font-mono text-xs text-gray-400 space-y-0.5">
                      <p>📄 chapitre-01.docx → <span className="text-white">Chapitre 1</span></p>
                      <p>📄 chapitre-02.docx → <span className="text-white">Chapitre 2</span></p>
                      <p>📄 chapitre-03.txt → <span className="text-white">Chapitre 3</span></p>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Le nom du fichier (sans extension) devient le titre du chapitre.</p>
                  </div>
                  <div className="pt-2 border-t border-gray-800">
                    <p className="text-gray-300 font-medium mb-2 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-purple-600/40 text-purple-300 flex items-center justify-center text-xs font-bold">2</span>
                      Ou sélectionnez un dossier avec des sous-dossiers pour les tomes
                    </p>
                    <div className="p-3 rounded-lg bg-gray-900/60 font-mono text-xs text-gray-400 space-y-0.5">
                      <p>📂 Mon Œuvre/</p>
                      <p className="pl-4">📂 <span className="text-purple-300">Tome 1</span>/</p>
                      <p className="pl-8">📄 chapitre-01.docx → <span className="text-white">tome: Tome 1</span></p>
                      <p className="pl-8">📄 chapitre-02.docx → <span className="text-white">tome: Tome 1</span></p>
                      <p className="pl-4">📂 <span className="text-purple-300">Tome 2</span>/</p>
                      <p className="pl-8">📄 chapitre-03.docx → <span className="text-white">tome: Tome 2</span></p>
                      <p className="pl-8">📄 chapitre-04.docx → <span className="text-white">tome: Tome 2</span></p>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Le <span className="text-purple-300 font-medium">nom du dossier</span> est automatiquement utilisé comme nom de tome.
                      Nommez vos dossiers comme vous voulez (« Tome 1 », « Arc 2 », « Saison 1 »...).
                    </p>
                  </div>
                </div>
              </details>
            </div>
          )}

          {/* File input — zone drag & drop stylisée */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-2">
              {mode === "batch" ? "Fichiers ou dossier" : "Fichier"} (.docx, .txt)
            </label>

            {mode === "batch" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-700 hover:border-indigo-500/50 rounded-xl p-6 text-center cursor-pointer transition-colors">
                  <svg className="w-8 h-8 text-gray-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-sm text-gray-400 font-medium">Sélectionner des fichiers</p>
                  <p className="text-xs text-gray-600 mt-1">Sans tome</p>
                </div>
                <div onClick={() => folderInputRef.current?.click()}
                  className="border-2 border-dashed border-purple-700/50 hover:border-purple-500/50 rounded-xl p-6 text-center cursor-pointer transition-colors">
                  <svg className="w-8 h-8 text-purple-600/70 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                  <p className="text-sm text-purple-400/80 font-medium">Sélectionner un dossier</p>
                  <p className="text-xs text-purple-600/60 mt-1">Sous-dossiers = tomes</p>
                </div>
                <input ref={fileInputRef} type="file" accept=".docx,.txt,.md" multiple onChange={handleFileChange} className="hidden" />
                <input ref={folderInputRef} type="file" accept=".docx,.txt,.md" multiple onChange={handleFileChange} className="hidden"
                  {...{ webkitdirectory: "", directory: "" }} />
              </div>
            ) : (
              <div>
                <div onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-700 hover:border-indigo-500/50 rounded-xl p-8 text-center cursor-pointer transition-colors">
                  <svg className="w-10 h-10 text-gray-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="text-sm text-gray-400">Cliquez ou glissez-déposez votre fichier</p>
                </div>
                <input ref={fileInputRef} type="file" accept=".docx,.txt,.md" multiple={false} onChange={handleFileChange} className="hidden" />
              </div>
            )}
          </div>

          {/* Fichiers sélectionnés */}
          {files.length > 0 && !showPreview && (
            <div className="rounded-xl border border-gray-700 bg-gray-800/30">
              <div className="px-4 py-2.5 border-b border-gray-700/50 flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-400">
                  {files.length} fichier{files.length > 1 ? "s" : ""} sélectionné{files.length > 1 ? "s" : ""}
                </span>
                {hasTomes && (
                  <span className="text-xs text-purple-400 flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                    {Object.keys(filesByTome).filter(k => k !== "__none__").length} tome{Object.keys(filesByTome).filter(k => k !== "__none__").length > 1 ? "s" : ""} détecté{Object.keys(filesByTome).filter(k => k !== "__none__").length > 1 ? "s" : ""}
                  </span>
                )}
              </div>
              <div className="max-h-48 overflow-y-auto divide-y divide-gray-700/30">
                {hasTomes ? (
                  Object.entries(filesByTome).sort(([a], [b]) => naturalSort(a, b)).map(([tome, tomeFiles]) => (
                    <div key={tome}>
                      <div className="px-4 py-1.5 bg-gray-800/50 flex items-center gap-2">
                        <svg className="w-3.5 h-3.5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                        </svg>
                        <span className="text-xs font-semibold text-purple-300">
                          {tome === "__none__" ? "Sans tome" : tome}
                        </span>
                        <span className="text-xs text-gray-600">({tomeFiles.length})</span>
                      </div>
                      {tomeFiles.sort(naturalSort).map((f, i) => (
                        <div key={i} className="flex items-center gap-2 px-6 py-1.5 text-xs text-gray-400">
                          <span className="text-gray-600">📄</span>
                          <span className="truncate">{f.name}</span>
                        </div>
                      ))}
                    </div>
                  ))
                ) : (
                  files.map(({ file }, i) => (
                    <div key={i} className="flex items-center gap-2 px-4 py-2 text-sm text-gray-400">
                      <span className="text-gray-600">📄</span>
                      <span className="truncate">{file.name}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Preview des chapitres à importer */}
          {showPreview && preview && (
            <div className="rounded-xl border border-gray-700 bg-gray-800/50">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-sm font-semibold text-indigo-300">Preview — {preview.chapters.length} chapitre{preview.chapters.length > 1 ? "s" : ""}</span>
                </div>
                <div className="text-xs text-gray-400">
                  {totalWords.toLocaleString()} mots • {totalBlocks.toLocaleString()} blocs
                </div>
              </div>
              <div className="max-h-72 overflow-y-auto">
                {Object.keys(previewByTome).length > 1 || (Object.keys(previewByTome).length === 1 && !previewByTome["__none__"]) ? (
                  Object.entries(previewByTome).sort(([a], [b]) => naturalSort(a, b)).map(([tome, chapters]) => (
                    <div key={tome}>
                      <div className="px-4 py-2 bg-purple-900/20 border-b border-gray-700/50 flex items-center gap-2 sticky top-0">
                        <svg className="w-3.5 h-3.5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                        </svg>
                        <span className="text-xs font-bold text-purple-300">{tome === "__none__" ? "Sans tome" : tome}</span>
                        <span className="text-xs text-gray-600">— {chapters.length} chapitre{chapters.length > 1 ? "s" : ""}</span>
                      </div>
                      <div className="divide-y divide-gray-700/30">
                        {chapters.map((ch, i) => (
                          <div key={i} className="flex items-center gap-3 px-4 py-2 hover:bg-gray-700/30">
                            <span className="w-6 h-6 rounded-lg bg-indigo-600/30 text-indigo-300 flex items-center justify-center text-[11px] font-bold flex-shrink-0">
                              {preview.chapters.indexOf(ch) + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{ch.titre}</p>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-gray-400">
                              <span>{ch.wordCount} mots</span>
                              <span>{ch.blockCount} blocs</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="divide-y divide-gray-700/50">
                    {preview.chapters.map((ch, i) => (
                      <div key={i} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-700/30">
                        <span className="w-7 h-7 rounded-lg bg-indigo-600/30 text-indigo-300 flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{ch.titre}</p>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-400">
                          <span>{ch.wordCount} mots</span>
                          <span>{ch.blockCount} blocs</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Progress bar */}
          {importing && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>{progressText}</span>
                <span>{progressPct}%</span>
              </div>
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          )}

          {/* Message hors import */}
          {!importing && progressText && (
            <div className={`p-3 rounded-xl text-sm font-medium flex items-center gap-2 ${
              progressText.includes("Erreur")
                ? "bg-red-900/40 text-red-400 border border-red-800/50"
                : "bg-green-900/40 text-green-400 border border-green-800/50"
            }`}>
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={
                  progressText.includes("Erreur") ? "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" : "M5 13l4 4L19 7"
                } />
              </svg>
              {progressText}
            </div>
          )}

          {/* Résultats détaillés */}
          {results.length > 0 && (
            <div className="rounded-xl border border-gray-700 bg-gray-800/50 max-h-48 overflow-y-auto">
              <div className="px-4 py-2 border-b border-gray-700 text-xs font-semibold text-gray-400">
                Résultats détaillés
              </div>
              <div className="divide-y divide-gray-700/50">
                {results.map((r, i) => (
                  <div key={i} className="flex items-center gap-2 px-4 py-2 text-sm">
                    {r.status === "ok" ? (
                      <svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                    <span className={`flex-1 ${r.status === "ok" ? "text-gray-300" : "text-red-400"}`}>
                      {r.titre}
                    </span>
                    {r.tome && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-purple-600/30 text-purple-300 rounded font-medium">{r.tome}</span>
                    )}
                    {r.status === "ok" && (
                      <span className="text-xs text-gray-400">{r.blockCount} blocs</span>
                    )}
                    {r.status === "error" && (
                      <span className="text-xs text-red-500">{r.error}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-800 flex-shrink-0 bg-gray-900/95">
          <div className="text-xs text-gray-400">
            {files.length > 0 && !preview && "Cliquez « Aperçu » pour vérifier avant import"}
            {preview && !importing && `${preview.chapters.length} chapitre${preview.chapters.length > 1 ? "s" : ""} prêt${preview.chapters.length > 1 ? "s" : ""}`}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onClose}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl font-medium transition border border-gray-700">
              Fermer
            </button>
            {!preview && files.length > 0 && (
              <button onClick={handlePreview} disabled={importing}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold transition disabled:opacity-50">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Aperçu
              </button>
            )}
            {preview && (
              <button onClick={handleImport} disabled={importing}
                className="flex items-center gap-2 px-5 py-2 bg-green-600 hover:bg-green-500 text-white rounded-xl font-semibold transition disabled:opacity-50 shadow-lg shadow-green-600/20">
                {importing && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {importing ? "Import en cours..." : `Importer ${preview.chapters.length} chapitre${preview.chapters.length > 1 ? "s" : ""}`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportWord;
