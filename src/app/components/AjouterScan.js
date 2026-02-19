"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import Cookies from "js-cookie";
import { useToast } from "./Toast";
import {
  MAX_IMAGE_SIZE_MB, MAX_PAGES,
  naturalSort, readDirectoryFiles, validateFiles, batchUploadImages,
} from "../utils/scanUtils";

/**
 * AjouterScan — Modal d'ajout d'un nouveau scan.
 * Design aligné avec ModifierScan (thème pink, mêmes patterns UI).
 */
const AjouterScan = ({ oeuvreId, onClose, onScanAdded }) => {
  const toast = useToast();
  const [titre, setTitre] = useState("");
  const [order, setOrder] = useState("");
  const [tome, setTome] = useState("");
  const [pages, setPages] = useState([]); // { id, file, preview, numero }
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [uploadPercent, setUploadPercent] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState(null);

  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);
  const pagesEndRef = useRef(null);
  const idCounter = useRef(0);
  const abortRef = useRef(null);
  const mountedRef = useRef(true);
  const dialogRef = useRef(null);

  // ─── Unmount guard ───
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // ─── Focus dialog on mount ───
  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  // ─── Escape key ───
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (lightboxUrl) { setLightboxUrl(null); return; }
        handleCancel();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [lightboxUrl]);

  // ─── Nettoyage et fermeture ───
  const handleCancel = useCallback(() => {
    if (abortRef.current) { abortRef.current.abort(); abortRef.current = null; }
    pages.forEach((p) => URL.revokeObjectURL(p.preview));
    onClose();
  }, [pages, onClose]);

  // ─── Ajout de fichiers ───
  const addFiles = useCallback((files) => {
    const validFiles = validateFiles(files, toast);
    if (validFiles.length === 0) return;

    setPages((prev) => {
      if (prev.length + validFiles.length > MAX_PAGES) {
        toast.warning(`Maximum ${MAX_PAGES} pages par scan.`);
        return prev;
      }
      const newPages = validFiles.map((file) => ({
        id: ++idCounter.current,
        file,
        preview: URL.createObjectURL(file),
        numero: 0,
      }));
      const all = [...prev, ...newPages];
      return all.map((p, i) => ({ ...p, numero: i + 1 }));
    });

    setTimeout(() => pagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 100);
  }, [toast]);

  const applyFolderName = useCallback((folderName) => {
    if (folderName) setTitre((prev) => (prev === "" ? folderName : prev));
  }, []);

  const handleFileChange = (e) => {
    if (e.target.files?.length) addFiles(e.target.files);
    e.target.value = "";
  };

  const handleFolderChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const firstPath = files[0].webkitRelativePath || "";
    const folderName = firstPath.split("/")[0] || "";
    applyFolderName(folderName);
    files.sort(naturalSort);
    addFiles(files);
    e.target.value = "";
  };

  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    setDragOver(false);

    const items = e.dataTransfer.items;
    if (items?.length) {
      for (let i = 0; i < items.length; i++) {
        const entry = items[i].webkitGetAsEntry?.();
        if (entry?.isDirectory) {
          try {
            applyFolderName(entry.name);
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
  }, [addFiles, applyFolderName, toast]);

  // ─── Actions pages ───
  const removePage = (id) => {
    setPages((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.preview);
      return prev.filter((p) => p.id !== id).map((p, i) => ({ ...p, numero: i + 1 }));
    });
  };

  const removeAll = () => {
    pages.forEach((p) => URL.revokeObjectURL(p.preview));
    setPages([]);
  };

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

  // ─── Submit ───
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!titre || !order) {
      toast.warning("Veuillez remplir le titre et l'ordre.");
      return;
    }
    if (pages.length === 0) {
      toast.warning("Ajoutez au moins une image de scan.");
      return;
    }

    setUploading(true);
    setUploadPercent(0);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const jwt = Cookies.get("jwt");
      if (!jwt) { toast.error("Token JWT manquant. Veuillez vous reconnecter."); return; }

      const uploadedMap = await batchUploadImages(pages, jwt, controller, (text, percent) => {
        if (mountedRef.current) {
          setUploadProgress(text);
          setUploadPercent(percent);
        }
      });

      if (mountedRef.current) {
        setUploadProgress("Création du scan...");
        setUploadPercent(95);
      }

      const uploadedPages = pages.map((p) => ({
        numero: p.numero,
        image: uploadedMap.get(p.id),
      }));

      const res = await fetch("/api/proxy/scans", {
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
            pages: uploadedPages,
            oeuvres: { connect: [oeuvreId] },
          },
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error("Erreur création scan :", errText);
        if (mountedRef.current) toast.error("Erreur lors de la création du scan.");
        return;
      }

      if (mountedRef.current) toast.success(`Scan "${titre}" ajouté avec ${uploadedPages.length} page(s) !`);
      pages.forEach((p) => URL.revokeObjectURL(p.preview));
      onScanAdded();
    } catch (error) {
      if (error.name === "AbortError") {
        if (mountedRef.current) toast.warning("Upload annulé.");
      } else {
        console.error("Erreur lors de l'ajout du scan :", error);
        if (mountedRef.current) toast.error(error.message || "Une erreur est survenue.");
      }
    } finally {
      abortRef.current = null;
      if (mountedRef.current) {
        setUploading(false);
        setUploadProgress("");
        setUploadPercent(0);
      }
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/80 z-50 overflow-y-auto" onClick={handleCancel}>
        <div className="flex min-h-full items-start justify-center p-4 pt-8">
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="Ajouter un scan"
            tabIndex={-1}
            className="bg-gray-800 text-white p-6 rounded-xl shadow-2xl w-full max-w-5xl mb-8 border border-gray-700 outline-none"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <svg className="w-5 h-5 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                Ajouter un scan
              </h2>
              <button onClick={handleCancel} className="text-gray-400 hover:text-white transition p-1" aria-label="Fermer">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Métadonnées — grille 3 colonnes */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="as-titre" className="block font-semibold mb-1 text-sm">Titre</label>
                  <input
                    id="as-titre"
                    type="text"
                    value={titre}
                    onChange={(e) => setTitre(e.target.value)}
                    className="w-full p-2 rounded-lg bg-gray-700 border border-gray-600 focus:border-pink-500 focus:outline-none transition"
                    placeholder="Ex: Chapitre 1, Prologue..."
                    required
                  />
                </div>
                <div>
                  <label htmlFor="as-order" className="block font-semibold mb-1 text-sm">Ordre</label>
                  <input
                    id="as-order"
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
                  <label htmlFor="as-tome" className="block font-semibold mb-1 text-sm">
                    Tome <span className="text-gray-500 text-xs">(optionnel)</span>
                  </label>
                  <input
                    id="as-tome"
                    type="number"
                    value={tome}
                    onChange={(e) => setTome(e.target.value)}
                    className="w-full p-2 rounded-lg bg-gray-700 border border-gray-600 focus:border-pink-500 focus:outline-none transition"
                    placeholder="N° tome"
                  />
                </div>
              </div>

              {/* Zone de drop */}
              <div>
                <label className="block font-semibold mb-1 text-sm">
                  Pages du scan <span className="text-gray-500 text-xs">(max {MAX_PAGES}, {MAX_IMAGE_SIZE_MB} Mo chaque, WebP uniquement)</span>
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
                    Glissez-déposez des images <strong>WebP</strong> ou un dossier, ou{" "}
                    <span className="text-pink-400 underline">cliquez pour sélectionner</span>
                  </p>
                  <p className="text-gray-500 text-xs mt-1">
                    Seuls les fichiers .webp sont acceptés. Convertissez vos images via le menu Édition.
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".webp,image/webp"
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

              {/* Grille des pages */}
              {pages.length > 0 && (
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <p className="font-semibold text-sm">{pages.length} page{pages.length > 1 ? "s" : ""} sélectionnée{pages.length > 1 ? "s" : ""}</p>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-gray-500 hidden md:inline">Glissez les vignettes pour réordonner</span>
                      {pages.length > 1 && (
                        <button type="button" onClick={removeAll} className="px-2 py-1 bg-red-600/30 hover:bg-red-600/50 rounded transition text-red-400">
                          Tout supprimer
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 max-h-[500px] overflow-y-auto pr-1">
                    {pages.map((page, index) => (
                      <div
                        key={page.id}
                        className="relative bg-gray-700 rounded-lg overflow-hidden group"
                      >
                        <img
                          src={page.preview}
                          alt={`Page ${page.numero}`}
                          className="w-full h-32 object-cover pointer-events-none"
                          draggable={false}
                        />
                        {/* Clic = lightbox */}
                        <button
                          type="button"
                          className="absolute inset-0 z-10 cursor-pointer"
                          onClick={() => setLightboxUrl(page.preview)}
                          aria-label={`Voir page ${page.numero} en grand`}
                        />
                        {/* Numéro */}
                        <div className="absolute top-1 left-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded font-mono z-20 pointer-events-none">
                          {page.numero}
                        </div>
                        {/* Contrôles — toujours visibles mobile */}
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

              {/* Barre de progression réelle */}
              {uploadProgress && (
                <div className="space-y-1">
                  <div className="w-full bg-gray-700 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-pink-500 h-2.5 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(uploadPercent, 100)}%` }}
                    />
                  </div>
                  <p className="text-center text-sm text-pink-300">{uploadProgress}</p>
                </div>
              )}

              {/* Boutons */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-5 py-2 rounded-lg bg-gray-600 hover:bg-gray-500 transition text-sm"
                >
                  {uploading ? "Annuler" : "Fermer"}
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-5 py-2 rounded-lg bg-pink-600 hover:bg-pink-500 transition text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {uploading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Upload en cours...
                    </>
                  ) : (
                    `Ajouter (${pages.length} page${pages.length > 1 ? "s" : ""})`
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Lightbox */}
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
    </>
  );
};

export default AjouterScan;
