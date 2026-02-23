"use client";

import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
import Cookies from "js-cookie";
import { useToast } from "./Toast";
import ConfirmDialog from "./ConfirmDialog";
import {
  MAX_IMAGE_SIZE_MB, MAX_PAGES,
  naturalSort, readDirectoryFiles, validateFiles, batchUploadImages,
  needsConversion, convertAndResize,
} from "../utils/scanUtils";

/**
 * ModifierScan — Modal d'édition complète d'un scan existant.
 * - Modifier titre, ordre, tome
 * - Réordonner / supprimer / ajouter des pages
 * - Drag & drop (desktop) + boutons toujours visibles (mobile)
 * - Lightbox, sélection multiple, dirty-check, Escape, Ctrl+S, a11y
 */
const ModifierScan = ({ scan, onClose, onScanUpdated }) => {
  const toast = useToast();
  const [titre, setTitre] = useState(scan.titre || "");
  const [order, setOrder] = useState(String(scan.order || ""));
  const [tome, setTome] = useState(scan.tome ? String(scan.tome) : "");
  const [loading, setLoading] = useState(true);

  // Pages: { id, numero, imageId, imageUrl, file?, preview, isExisting, selected }
  const [pages, setPages] = useState([]);
  const [initialSnapshot, setInitialSnapshot] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [uploadPercent, setUploadPercent] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [dragIndex, setDragIndex] = useState(null);
  const [lightboxUrl, setLightboxUrl] = useState(null);
  const [confirmState, setConfirmState] = useState({ open: false, message: "", onConfirm: null });

  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);
  const pagesEndRef = useRef(null);
  const idCounter = useRef(0);
  const abortRef = useRef(null);
  const mountedRef = useRef(true);
  const dialogRef = useRef(null);
  const conversionMutex = useRef(Promise.resolve());
  const [downloading, setDownloading] = useState(false);

  // ─── Dirty check ───
  const isDirty = useMemo(() => {
    if (!initialSnapshot) return false;
    if (titre !== initialSnapshot.titre) return true;
    if (order !== initialSnapshot.order) return true;
    if (tome !== initialSnapshot.tome) return true;
    if (pages.length !== initialSnapshot.pageIds.length) return true;
    return pages.some((p, i) => p.id !== initialSnapshot.pageIds[i] || !p.isExisting);
  }, [titre, order, tome, pages, initialSnapshot]);

  // Stats
  const existingCount = useMemo(() => pages.filter((p) => p.isExisting).length, [pages]);
  const newCount = useMemo(() => pages.filter((p) => !p.isExisting).length, [pages]);
  const selectedCount = useMemo(() => pages.filter((p) => p.selected).length, [pages]);
  const convertingCount = useMemo(() => pages.filter((p) => p.converting).length, [pages]);

  // ─── Unmount guard ───
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // ─── Focus dialog on mount ───
  useEffect(() => {
    if (!loading) dialogRef.current?.focus();
  }, [loading]);

  // ─── Charger le scan complet avec ses pages ───
  useEffect(() => {
    async function fetchFullScan() {
      const jwt = Cookies.get("jwt");
      try {
        const res = await fetch(
          `/api/proxy/scans/${scan.documentId}?populate[pages][populate]=image`,
          { headers: jwt ? { Authorization: `Bearer ${jwt}` } : {} }
        );
        if (!res.ok) throw new Error("Erreur fetch scan");
        const data = await res.json();
        const fullScan = data?.data;
        if (fullScan?.pages) {
          const existing = fullScan.pages
            .sort((a, b) => (a.numero || 0) - (b.numero || 0))
            .map((p) => {
              const img = p.image;
              const url = img?.formats?.medium?.url || img?.formats?.small?.url || img?.url || null;
              return {
                id: ++idCounter.current,
                numero: p.numero,
                imageId: img?.id || null,
                imageUrl: url,
                downloadUrl: img?.url || null,
                componentId: p.id,
                file: null,
                preview: url,
                isExisting: true,
                selected: false,
                converting: false,
              };
            });
          if (mountedRef.current) {
            setPages(existing);
            setInitialSnapshot({
              titre: scan.titre || "",
              order: String(scan.order || ""),
              tome: scan.tome ? String(scan.tome) : "",
              pageIds: existing.map((p) => p.id),
            });
          }
        }
      } catch (err) {
        console.error("Erreur chargement scan complet :", err);
        if (mountedRef.current) toast.error("Impossible de charger les pages du scan.");
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    }
    fetchFullScan();
  }, [scan.documentId]);

  // ─── Escape & Ctrl+S ───
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (lightboxUrl) { setLightboxUrl(null); return; }
        requestClose();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (!saving && isDirty) {
          document.getElementById("modifier-scan-form")?.requestSubmit();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [lightboxUrl, isDirty, saving]);

  // ─── Fermeture avec dirty-check (F1) ───
  const requestClose = useCallback(() => {
    if (saving) return;
    if (isDirty) {
      setConfirmState({
        open: true,
        message: "Vous avez des modifications non sauvegardées. Fermer sans sauvegarder ?",
        onConfirm: () => {
          setConfirmState({ open: false, message: "", onConfirm: null });
          doClose();
        },
      });
    } else {
      doClose();
    }
  }, [isDirty, saving, pages, onClose]);

  const doClose = useCallback(() => {
    if (abortRef.current) { abortRef.current.abort(); abortRef.current = null; }
    pages.forEach((p) => { if (p.file) URL.revokeObjectURL(p.preview); });
    onClose();
  }, [pages, onClose]);

  // ─── Ajout de fichiers (avec conversion auto non-WebP) ───
  const addFiles = useCallback((files) => {
    const validFiles = validateFiles(files, toast);
    if (validFiles.length === 0) return;

    const toConvert = [];

    setPages((prev) => {
      if (prev.length + validFiles.length > MAX_PAGES) {
        toast.warning(`Maximum ${MAX_PAGES} pages par scan.`);
        return prev;
      }
      const newPages = validFiles.map((file) => {
        const id = ++idCounter.current;
        const converting = needsConversion(file);
        if (converting) toConvert.push({ id, file });
        return {
          id, file, preview: URL.createObjectURL(file), numero: 0,
          imageId: null, imageUrl: null, isExisting: false, selected: false, converting,
        };
      });
      const all = [...prev, ...newPages];
      return all.map((p, i) => ({ ...p, numero: i + 1 }));
    });

    // Conversion en arrière-plan
    if (toConvert.length > 0) {
      conversionMutex.current = conversionMutex.current.then(async () => {
        for (let i = 0; i < toConvert.length; i += 5) {
          const batch = toConvert.slice(i, i + 5);
          const results = await Promise.all(
            batch.map(async ({ id, file }) => {
              try { return { id, webp: await convertAndResize(file) }; }
              catch { return { id, webp: file }; }
            })
          );
          if (!mountedRef.current) return;
          setPages((prev) => prev.map((p) => {
            const r = results.find((r) => r.id === p.id);
            return r ? { ...p, file: r.webp, converting: false } : p;
          }));
        }
      });
    }

    setTimeout(() => pagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 100);
  }, [toast]);

  const handleFileChange = (e) => {
    if (e.target.files?.length) addFiles(e.target.files);
    e.target.value = "";
  };

  const handleFolderChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    files.sort(naturalSort);
    addFiles(files);
    e.target.value = "";
  };

  // F2 : Drop zone avec support dossiers via webkitGetAsEntry
  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    setDragOver(false);

    const items = e.dataTransfer.items;
    if (items?.length) {
      for (let i = 0; i < items.length; i++) {
        const entry = items[i].webkitGetAsEntry?.();
        if (entry?.isDirectory) {
          try {
            const dirFiles = await readDirectoryFiles(entry);
            dirFiles.sort(naturalSort);
            addFiles(dirFiles);
          } catch (err) {
            console.error("Erreur lecture dossier :", err);
            toast.error("Impossible de lire le dossier.");
          }
          return;
        }
      }
    }

    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  }, [addFiles, toast]);

  // ─── Réordonner par drag & drop (desktop) ───
  const handleDragStart = (index) => setDragIndex(index);

  const handleDragOverPage = useCallback((e, index) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    setPages((prev) => {
      const arr = [...prev];
      const [moved] = arr.splice(dragIndex, 1);
      arr.splice(index, 0, moved);
      setDragIndex(index);
      return arr.map((p, i) => ({ ...p, numero: i + 1 }));
    });
  }, [dragIndex]);

  const handleDragEnd = () => setDragIndex(null);

  // ─── Sélection (E2) ───
  const toggleSelect = (id) => {
    setPages((prev) => prev.map((p) => p.id === id ? { ...p, selected: !p.selected } : p));
  };

  const selectAll = () => setPages((prev) => prev.map((p) => ({ ...p, selected: true })));
  const deselectAll = () => setPages((prev) => prev.map((p) => ({ ...p, selected: false })));

  // ─── Supprimer ───
  const removePage = (id) => {
    setPages((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target?.file) URL.revokeObjectURL(target.preview);
      return prev.filter((p) => p.id !== id).map((p, i) => ({ ...p, numero: i + 1 }));
    });
  };

  const removeSelected = () => {
    setPages((prev) => {
      prev.filter((p) => p.selected && p.file).forEach((p) => URL.revokeObjectURL(p.preview));
      return prev.filter((p) => !p.selected).map((p, i) => ({ ...p, numero: i + 1 }));
    });
  };

  const removeAll = () => {
    setConfirmState({
      open: true,
      message: `Supprimer les ${pages.length} pages ? Cette action est irréversible.`,
      onConfirm: () => {
        setConfirmState({ open: false, message: "", onConfirm: null });
        pages.forEach((p) => { if (p.file) URL.revokeObjectURL(p.preview); });
        setPages([]);
      },
    });
  };

  // ─── Déplacer ───
  const moveUp = (index) => {
    if (index === 0) return;
    setPages((prev) => {
      const arr = [...prev];
      [arr[index - 1], arr[index]] = [arr[index], arr[index - 1]];
      return arr.map((p, i) => ({ ...p, numero: i + 1 }));
    });
  };

  const moveDown = (index) => {
    setPages((prev) => {
      if (index >= prev.length - 1) return prev;
      const arr = [...prev];
      [arr[index], arr[index + 1]] = [arr[index + 1], arr[index]];
      return arr.map((p, i) => ({ ...p, numero: i + 1 }));
    });
  };

  // ─── Téléchargement des pages existantes ───
  const downloadPages = useCallback(async () => {
    const existingPages = pages.filter((p) => p.isExisting && p.downloadUrl);
    if (existingPages.length === 0) {
      toast.warning("Aucune page à télécharger.");
      return;
    }
    setDownloading(true);
    let count = 0;
    for (const page of existingPages) {
      try {
        const res = await fetch(page.downloadUrl);
        const blob = await res.blob();
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `page-${String(page.numero).padStart(3, "0")}.webp`;
        link.click();
        URL.revokeObjectURL(link.href);
        count++;
        await new Promise((r) => setTimeout(r, 200));
      } catch {
        console.error(`Échec téléchargement page ${page.numero}`);
      }
    }
    if (mountedRef.current) {
      toast.success(`${count} page(s) téléchargée(s) !`);
      setDownloading(false);
    }
  }, [pages, toast]);

  // ─── Sauvegarde (D2 : utilise batchUploadImages partagé) ───
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!titre || !order) {
      toast.warning("Veuillez remplir le titre et l'ordre.");
      return;
    }
    if (pages.length === 0) {
      toast.warning("Le scan doit avoir au moins une page.");
      return;
    }

    setSaving(true);
    setUploadPercent(0);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const jwt = Cookies.get("jwt");
      if (!jwt) { toast.error("Token JWT manquant."); return; }

      const newPages = pages.filter((p) => p.file);
      let uploadedMap = new Map();

      if (newPages.length > 0) {
        uploadedMap = await batchUploadImages(newPages, jwt, controller, (phase, percent, done, total) => {
          if (!mountedRef.current) return;
          setUploadPercent(percent);
          if (phase === "optimize") {
            setUploadProgress(`Optimisation des images... ${done}/${total}`);
          } else {
            setUploadProgress(`Envoi en cours... ${done}/${total} (${percent}%)`);
          }
        });
      }

      if (mountedRef.current) {
        setUploadProgress("Finalisation...");
        setUploadPercent(100);
      }

      const finalPages = pages.map((p) => ({
        numero: p.numero,
        image: p.file ? uploadedMap.get(p.id) : p.imageId,
      }));

      const res = await fetch(`/api/proxy/scans/${scan.documentId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({
          data: {
            titre,
            order: parseInt(order, 10),
            tome: tome ? parseInt(tome, 10) : null,
            pages: finalPages,
          },
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error("Erreur mise à jour scan :", errText);
        if (mountedRef.current) toast.error("Erreur lors de la mise à jour du scan.");
        return;
      }

      if (mountedRef.current) toast.success(`Scan "${titre}" mis à jour !`);
      pages.forEach((p) => { if (p.file) URL.revokeObjectURL(p.preview); });
      onScanUpdated();
    } catch (error) {
      if (error.name === "AbortError") {
        if (mountedRef.current) toast.warning("Opération annulée.");
      } else {
        console.error("Erreur modification scan :", error);
        if (mountedRef.current) toast.error(error.message || "Une erreur est survenue.");
      }
    } finally {
      abortRef.current = null;
      if (mountedRef.current) {
        setSaving(false);
        setUploadProgress("");
        setUploadPercent(0);
      }
    }
  };

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/80 z-50 overflow-y-auto" onClick={requestClose}>
        <div className="flex min-h-full items-start justify-center p-4 pt-8">
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="Modifier un scan"
            tabIndex={-1}
            className="bg-gray-800 text-white p-6 rounded-xl shadow-2xl w-full max-w-5xl mb-8 border border-gray-700 outline-none"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <svg className="w-5 h-5 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Modifier le scan
                {isDirty && <span className="text-pink-400 text-sm font-normal ml-1">(modifié)</span>}
              </h2>
              <button onClick={requestClose} className="text-gray-400 hover:text-white transition p-1" aria-label="Fermer">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full animate-spin" />
                <span className="ml-3 text-gray-400">Chargement des pages...</span>
              </div>
            ) : (
              <form id="modifier-scan-form" onSubmit={handleSubmit} className="space-y-5">
                {/* Métadonnées */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="ms-titre" className="block font-semibold mb-1 text-sm">Titre</label>
                    <input
                      id="ms-titre"
                      type="text"
                      value={titre}
                      onChange={(e) => setTitre(e.target.value)}
                      className="w-full p-2 rounded-lg bg-gray-700 border border-gray-600 focus:border-pink-500 focus:outline-none transition"
                      placeholder="Ex: Chapitre 1"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="ms-order" className="block font-semibold mb-1 text-sm">Ordre</label>
                    <input
                      id="ms-order"
                      type="number"
                      value={order}
                      onChange={(e) => setOrder(e.target.value)}
                      className="w-full p-2 rounded-lg bg-gray-700 border border-gray-600 focus:border-pink-500 focus:outline-none transition"
                      placeholder="Ordre d'affichage"
                      required
                      min="1"
                    />
                  </div>
                  <div>
                    <label htmlFor="ms-tome" className="block font-semibold mb-1 text-sm">
                      Tome <span className="text-gray-500 text-xs">(optionnel)</span>
                    </label>
                    <input
                      id="ms-tome"
                      type="number"
                      value={tome}
                      onChange={(e) => setTome(e.target.value)}
                      className="w-full p-2 rounded-lg bg-gray-700 border border-gray-600 focus:border-pink-500 focus:outline-none transition"
                      placeholder="N° tome"
                    />
                  </div>
                </div>

                {/* Zone d'ajout d'images */}
                <div>
                  <label className="block font-semibold mb-1 text-sm">
                    Ajouter des pages <span className="text-gray-500 text-xs">(max {MAX_PAGES}, {MAX_IMAGE_SIZE_MB} Mo chaque)</span>
                  </label>
                  <div
                    onDrop={handleDrop}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition ${
                      dragOver ? "border-pink-400 bg-pink-900/10" : "border-gray-600 hover:border-gray-400"
                    }`}
                  >
                    <p className="text-gray-300 text-sm">
                      Glissez-déposez vos images ou un dossier, ou{" "}
                      <span className="text-pink-400 underline">cliquez pour sélectionner</span>
                    </p>
                    <p className="text-gray-500 text-xs mt-1">
                      JPG, PNG, GIF, BMP, WebP — conversion automatique en WebP
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => folderInputRef.current?.click()}
                    className="mt-2 text-xs text-pink-400 hover:text-pink-300 underline transition"
                  >
                    📁 Sélectionner un dossier entier
                  </button>
                  <input
                    ref={folderInputRef}
                    type="file"
                    onChange={handleFolderChange}
                    className="hidden"
                    webkitdirectory=""
                    directory=""
                  />
                </div>

                {/* Barre d'outils pages */}
                {pages.length > 0 && (
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <p className="font-semibold text-sm">
                        {pages.length} page{pages.length > 1 ? "s" : ""}
                        {newCount > 0 && (
                          <span className="text-green-400 font-normal ml-1">
                            ({existingCount} existante{existingCount > 1 ? "s" : ""} + {newCount} nouvelle{newCount > 1 ? "s" : ""})
                          </span>
                        )}
                      </p>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-gray-500 hidden md:inline">Glissez les vignettes pour réordonner</span>
                        {selectedCount > 0 ? (
                          <>
                            <span className="text-pink-300">{selectedCount} sélectionnée{selectedCount > 1 ? "s" : ""}</span>
                            <button type="button" onClick={deselectAll} className="px-2 py-1 bg-gray-600 hover:bg-gray-500 rounded transition text-gray-300">
                              Désélectionner
                            </button>
                            <button type="button" onClick={removeSelected} className="px-2 py-1 bg-red-600/80 hover:bg-red-500 rounded transition text-white">
                              Supprimer ({selectedCount})
                            </button>
                          </>
                        ) : (
                          <>
                            <button type="button" onClick={selectAll} className="px-2 py-1 bg-gray-600 hover:bg-gray-500 rounded transition text-gray-300">
                              Tout sélectionner
                            </button>
                            {existingCount > 0 && (
                              <button
                                type="button"
                                onClick={downloadPages}
                                disabled={downloading}
                                className="px-2 py-1 bg-blue-600/30 hover:bg-blue-600/50 rounded transition text-blue-400 disabled:opacity-50 flex items-center gap-1"
                              >
                                {downloading ? (
                                  <><div className="w-3 h-3 border border-blue-400 border-t-transparent rounded-full animate-spin" /> Téléchargement...</>
                                ) : (
                                  <>⬇ Télécharger ({existingCount})</>
                                )}
                              </button>
                            )}
                            <button type="button" onClick={removeAll} className="px-2 py-1 bg-red-600/30 hover:bg-red-600/50 rounded transition text-red-400">
                              Tout supprimer
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Grille des pages (M4: 2 cols mobile, M2: contrôles toujours visibles mobile) */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 max-h-[500px] overflow-y-auto pr-1">
                      {pages.map((page, index) => (
                        <div
                          key={page.id}
                          draggable
                          onDragStart={() => handleDragStart(index)}
                          onDragOver={(e) => handleDragOverPage(e, index)}
                          onDragEnd={handleDragEnd}
                          className={`relative bg-gray-700 rounded-lg overflow-hidden group cursor-grab active:cursor-grabbing transition-all ${
                            dragIndex === index ? "ring-2 ring-pink-500 scale-95 opacity-70" : ""
                          } ${page.selected ? "ring-2 ring-blue-400" : ""} ${!page.isExisting && !page.selected ? "ring-1 ring-green-500/50" : ""}`}
                        >
                          {/* Image */}
                          <img
                            src={page.preview}
                            alt={`Page ${page.numero}`}
                            className="w-full h-32 object-cover pointer-events-none"
                            draggable={false}
                          />
                          {/* Clic = lightbox ; Ctrl/Shift+clic = sélection */}
                          <button
                            type="button"
                            className="absolute inset-0 z-10 cursor-pointer"
                            onClick={(e) => {
                              if (e.shiftKey || e.ctrlKey || e.metaKey) {
                                toggleSelect(page.id);
                              } else {
                                setLightboxUrl(page.preview);
                              }
                            }}
                            aria-label={`Voir page ${page.numero} en grand (Ctrl+clic pour sélectionner)`}
                          />

                          {/* Numéro */}
                          <div className="absolute top-1 left-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded font-mono z-20 pointer-events-none">
                            {page.numero}
                          </div>
                          {/* Spinner de conversion */}
                          {page.converting && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20 pointer-events-none">
                              <div className="w-6 h-6 border-2 border-pink-400 border-t-transparent rounded-full animate-spin" />
                            </div>
                          )}
                          {/* Badge nouveau */}
                          {!page.isExisting && (
                            <div className="absolute top-1 left-8 bg-green-600/80 text-white text-[10px] px-1 py-0.5 rounded z-20 pointer-events-none">
                              new
                            </div>
                          )}
                          {/* Checkbox sélection */}
                          <div className="absolute top-1 left-1 z-30">
                            <input
                              type="checkbox"
                              checked={page.selected}
                              onChange={() => toggleSelect(page.id)}
                              className="w-4 h-4 accent-blue-500 cursor-pointer opacity-0 group-hover:opacity-100 checked:opacity-100 transition"
                              aria-label={`Sélectionner page ${page.numero}`}
                            />
                          </div>

                          {/* M2/M3: Contrôles toujours visibles mobile, hover desktop, taille min 28px */}
                          <div className="absolute top-1 right-1 flex flex-col gap-0.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition z-20">
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); moveUp(index); }}
                              disabled={index === 0}
                              className="bg-gray-800/80 text-white rounded w-7 h-7 md:w-6 md:h-6 flex items-center justify-center text-xs hover:bg-gray-600 disabled:opacity-30"
                              aria-label={`Déplacer page ${page.numero} vers le haut`}
                            >▲</button>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); moveDown(index); }}
                              disabled={index === pages.length - 1}
                              className="bg-gray-800/80 text-white rounded w-7 h-7 md:w-6 md:h-6 flex items-center justify-center text-xs hover:bg-gray-600 disabled:opacity-30"
                              aria-label={`Déplacer page ${page.numero} vers le bas`}
                            >▼</button>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); removePage(page.id); }}
                              className="bg-red-600/80 text-white rounded w-7 h-7 md:w-6 md:h-6 flex items-center justify-center text-xs hover:bg-red-500"
                              aria-label={`Supprimer page ${page.numero}`}
                            >✕</button>
                          </div>
                        </div>
                      ))}
                      <div ref={pagesEndRef} />
                    </div>
                  </div>
                )}

                {/* Barre de conversion */}
                {convertingCount > 0 && (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex items-center gap-3">
                    <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-amber-300 text-sm">
                        Conversion en WebP... {pages.length - convertingCount}/{pages.length} prêtes
                      </p>
                      <div className="w-full bg-gray-700 rounded-full h-1.5 mt-1.5 overflow-hidden">
                        <div
                          className="bg-amber-400 h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${Math.round(((pages.length - convertingCount) / pages.length) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Barre de progression upload */}
                {uploadProgress && (
                  <div className="bg-gray-700/50 border border-gray-600 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-white">{uploadProgress}</p>
                      <span className="text-lg font-bold text-pink-400">{uploadPercent}%</span>
                    </div>
                    <div className="w-full bg-gray-600 rounded-full h-3 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-pink-500 to-purple-500 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(uploadPercent, 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-400 text-center">
                      Ne fermez pas cette fenêtre. L&apos;envoi peut prendre plusieurs minutes selon le nombre d&apos;images.
                    </p>
                  </div>
                )}

                {/* Boutons */}
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={requestClose}
                    className="px-5 py-2 rounded-lg bg-gray-600 hover:bg-gray-500 transition text-sm"
                  >
                    {saving ? "Annuler" : "Fermer"}
                  </button>
                  <button
                    type="submit"
                    disabled={saving || !isDirty || convertingCount > 0}
                    className={`px-5 py-2 rounded-lg transition text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${
                      isDirty ? "bg-pink-600 hover:bg-pink-500" : "bg-gray-600"
                    }`}
                  >
                    {saving ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Sauvegarde...
                      </>
                    ) : (
                      `Sauvegarder (${pages.length} page${pages.length > 1 ? "s" : ""})`
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* E4: Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center cursor-zoom-out"
          onClick={() => setLightboxUrl(null)}
        >
          <img
            src={lightboxUrl}
            alt="Aperçu plein écran"
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            className="absolute top-4 right-4 text-white/70 hover:text-white transition"
            onClick={() => setLightboxUrl(null)}
            aria-label="Fermer l'aperçu"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* ConfirmDialog */}
      {confirmState.open && (
        <ConfirmDialog
          open={confirmState.open}
          message={confirmState.message}
          onConfirm={confirmState.onConfirm}
          onCancel={() => setConfirmState({ open: false, message: "", onConfirm: null })}
        />
      )}
    </>
  );
};

export default ModifierScan;
