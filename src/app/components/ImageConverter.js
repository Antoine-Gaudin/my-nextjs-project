"use client";

import React, { useState, useRef, useCallback } from "react";
import { useToast } from "./Toast";

const ACCEPTED_INPUT_TYPES = ["image/jpeg", "image/png", "image/gif", "image/bmp"];
const MAX_FILE_SIZE_MB = 50;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

/**
 * Convertit un File image en webp via canvas.
 */
async function convertToWebp(file, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      
      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error("Échec de conversion webp"));
          const webpFile = new File([blob], file.name.replace(/\.[^.]+$/, ".webp"), {
            type: "image/webp",
          });
          resolve(webpFile);
        },
        "image/webp",
        quality
      );
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Impossible de charger ${file.name}`));
    };
    
    img.src = url;
  });
}

const ImageConverter = () => {
  const toast = useToast();
  const [files, setFiles] = useState([]); // { id, original: File, webp: File | null, preview: string, converting: boolean }
  const [converting, setConverting] = useState(false);
  const [quality, setQuality] = useState(0.85);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const idCounter = useRef(0);

  const addFiles = useCallback((newFiles) => {
    const validFiles = Array.from(newFiles).filter((f) => {
      if (!ACCEPTED_INPUT_TYPES.includes(f.type)) {
        toast.warning(`${f.name} : Format non supporté. Utilisez JPG, PNG, GIF ou BMP.`);
        return false;
      }
      if (f.size > MAX_FILE_SIZE_BYTES) {
        toast.warning(`${f.name} est trop volumineux (${(f.size / 1024 / 1024).toFixed(1)} Mo). Max : ${MAX_FILE_SIZE_MB} Mo.`);
        return false;
      }
      return true;
    });

    setFiles((prev) => {
      const newEntries = validFiles.map((file) => ({
        id: ++idCounter.current,
        original: file,
        webp: null,
        preview: URL.createObjectURL(file),
        converting: false,
      }));
      return [...prev, ...newEntries];
    });
  }, [toast]);

  const handleFileChange = (e) => {
    if (e.target.files?.length) addFiles(e.target.files);
    e.target.value = "";
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  }, [addFiles]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => setDragOver(false), []);

  const removeFile = (id) => {
    setFiles((prev) => {
      const entry = prev.find((f) => f.id === id);
      if (entry) {
        URL.revokeObjectURL(entry.preview);
      }
      return prev.filter((f) => f.id !== id);
    });
  };

  const convertAll = async () => {
    setConverting(true);
    const BATCH_SIZE = 5;

    try {
      for (let i = 0; i < files.length; i += BATCH_SIZE) {
        const batch = files.slice(i, i + BATCH_SIZE);
        
        // Marquer comme converting
        setFiles((prev) =>
          prev.map((f) =>
            batch.some((b) => b.id === f.id) ? { ...f, converting: true } : f
          )
        );

        const results = await Promise.all(
          batch.map(async (entry) => {
            try {
              const webpFile = await convertToWebp(entry.original, quality);
              return { id: entry.id, webp: webpFile };
            } catch (err) {
              console.error(`Erreur conversion ${entry.original.name}:`, err);
              toast.error(`Erreur : ${entry.original.name}`);
              return { id: entry.id, webp: null };
            }
          })
        );

        // Mettre à jour avec les résultats
        setFiles((prev) =>
          prev.map((f) => {
            const result = results.find((r) => r.id === f.id);
            if (result) {
              return { ...f, webp: result.webp, converting: false };
            }
            return f;
          })
        );
      }

      toast.success("Conversion terminée !");
    } catch (error) {
      console.error("Erreur conversion batch :", error);
      toast.error("Une erreur est survenue.");
    } finally {
      setConverting(false);
    }
  };

  const downloadAll = () => {
    const converted = files.filter((f) => f.webp);
    if (converted.length === 0) {
      toast.warning("Aucune image convertie à télécharger.");
      return;
    }

    converted.forEach((entry) => {
      const link = document.createElement("a");
      link.href = URL.createObjectURL(entry.webp);
      link.download = entry.webp.name;
      link.click();
      URL.revokeObjectURL(link.href);
    });

    toast.success(`${converted.length} image(s) téléchargée(s) !`);
  };

  const totalOriginalSize = files.reduce((acc, f) => acc + f.original.size, 0);
  const totalWebpSize = files.reduce((acc, f) => acc + (f.webp?.size || 0), 0);
  const savings = totalOriginalSize > 0 ? ((1 - totalWebpSize / totalOriginalSize) * 100).toFixed(1) : 0;

  return (
    <div className="w-full max-w-5xl mx-auto bg-gray-800 text-white p-6 rounded-lg shadow-lg">
      <h1 className="text-3xl font-bold mb-2 text-center">🖼️ Convertisseur d'images en WebP</h1>
      <p className="text-gray-400 text-center mb-6">
        Convertissez vos JPG, PNG, GIF, BMP en WebP pour des scans ultra-rapides
      </p>

      {/* Contrôle qualité */}
      <div className="mb-4">
        <label className="block font-semibold mb-2">
          Qualité de compression : <span className="text-blue-400">{Math.round(quality * 100)}%</span>
        </label>
        <input
          type="range"
          min="0.5"
          max="1"
          step="0.05"
          value={quality}
          onChange={(e) => setQuality(parseFloat(e.target.value))}
          className="w-full"
          disabled={converting}
        />
        <p className="text-xs text-gray-500 mt-1">
          Recommandé : 85% (bon compromis qualité/taille). 50% = taille minimale, 100% = qualité maximale
        </p>
      </div>

      {/* Zone de drop */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition mb-4 ${
          dragOver ? "border-blue-400 bg-blue-900/20" : "border-gray-600 hover:border-gray-400"
        }`}
      >
        <p className="text-gray-300">
          Glissez-déposez vos images ici ou <span className="text-blue-400 underline">cliquez pour sélectionner</span>
        </p>
        <p className="text-gray-500 text-sm mt-1">
          Formats acceptés : JPG, PNG, GIF, BMP — Max {MAX_FILE_SIZE_MB} Mo par image
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/bmp"
          multiple
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* Statistiques */}
      {files.length > 0 && (
        <div className="bg-gray-700 rounded p-4 mb-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-gray-400 text-sm">Images</p>
              <p className="text-xl font-bold">{files.length}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Taille d'origine</p>
              <p className="text-xl font-bold">{(totalOriginalSize / 1024 / 1024).toFixed(1)} Mo</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Taille WebP</p>
              <p className="text-xl font-bold text-green-400">{(totalWebpSize / 1024 / 1024).toFixed(1)} Mo</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Gain</p>
              <p className="text-xl font-bold text-green-400">-{savings}%</p>
            </div>
          </div>
        </div>
      )}

      {/* Liste des fichiers */}
      {files.length > 0 && (
        <div className="max-h-96 overflow-y-auto mb-4 space-y-2">
          {files.map((entry) => (
            <div
              key={entry.id}
              className="bg-gray-700 rounded p-3 flex items-center justify-between"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <img
                  src={entry.preview}
                  alt={entry.original.name}
                  className="w-12 h-12 object-cover rounded"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{entry.original.name}</p>
                  <p className="text-xs text-gray-400">
                    {(entry.original.size / 1024).toFixed(1)} Ko
                    {entry.webp && (
                      <>
                        {" → "}
                        <span className="text-green-400">{(entry.webp.size / 1024).toFixed(1)} Ko</span>
                        {" "}(-{((1 - entry.webp.size / entry.original.size) * 100).toFixed(0)}%)
                      </>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {entry.converting && <span className="text-blue-400 text-sm animate-pulse">⏳ Conversion...</span>}
                {entry.webp && <span className="text-green-400 text-sm">✓ Converti</span>}
                <button
                  onClick={() => removeFile(entry.id)}
                  className="bg-red-600 hover:bg-red-500 text-white px-2 py-1 rounded text-sm"
                  disabled={converting}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Boutons d'action */}
      {files.length > 0 && (
        <div className="flex justify-between items-center gap-4">
          <button
            onClick={() => {
              files.forEach((f) => URL.revokeObjectURL(f.preview));
              setFiles([]);
            }}
            className="bg-red-500 hover:bg-red-400 px-4 py-2 rounded"
            disabled={converting}
          >
            Tout effacer
          </button>
          <div className="flex gap-4">
            <button
              onClick={convertAll}
              className="bg-blue-500 hover:bg-blue-400 px-6 py-2 rounded font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={converting || files.every((f) => f.webp)}
            >
              {converting ? "Conversion..." : "Convertir tout"}
            </button>
            <button
              onClick={downloadAll}
              className="bg-green-500 hover:bg-green-400 px-6 py-2 rounded font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={converting || !files.some((f) => f.webp)}
            >
              Télécharger ({files.filter((f) => f.webp).length})
            </button>
          </div>
        </div>
      )}

      {files.length === 0 && (
        <p className="text-center text-gray-500 py-8">
          Aucune image sélectionnée. Ajoutez des images pour commencer.
        </p>
      )}
    </div>
  );
};

export default ImageConverter;
