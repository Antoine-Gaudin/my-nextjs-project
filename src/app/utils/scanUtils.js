/**
 * Utilitaires partagés pour les composants de gestion de scans.
 * Utilisé par AjouterScan et ModifierScan.
 */

export const MAX_IMAGE_SIZE_MB = 10;
export const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;
export const MAX_PAGES = 100;
export const ACCEPTED_TYPES = ["image/webp", "image/jpeg", "image/png", "image/gif", "image/bmp"];
export const MAX_DIMENSION = 1800;
export const UPLOAD_BATCH_SIZE = 20;

/**
 * Tri naturel des fichiers par nom (1.jpg, 2.jpg, 10.jpg au lieu de 1, 10, 2).
 */
export function naturalSort(a, b) {
  return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" });
}

/**
 * Vérifie si un fichier a besoin d'être converti en WebP.
 */
export function needsConversion(file) {
  return file.type !== "image/webp";
}

/**
 * Lit récursivement un dossier via l'API DataTransferItem/webkitGetAsEntry.
 * Retourne un tableau plat de File.
 */
export async function readDirectoryFiles(directoryEntry) {
  const files = [];
  const reader = directoryEntry.createReader();
  const readBatch = () =>
    new Promise((resolve, reject) => {
      reader.readEntries(resolve, reject);
    });
  let batch;
  do {
    batch = await readBatch();
    for (const entry of batch) {
      if (entry.isFile) {
        const file = await new Promise((res, rej) => entry.file(res, rej));
        files.push(file);
      } else if (entry.isDirectory) {
        const sub = await readDirectoryFiles(entry);
        files.push(...sub);
      }
    }
  } while (batch.length > 0);
  return files;
}

/**
 * Convertit et/ou redimensionne une image en une seule passe canvas.
 * - Non-WebP → WebP + resize si nécessaire
 * - WebP trop large → resize
 * - WebP OK → retourne tel quel
 */
export async function convertAndResize(file, maxWidth = MAX_DIMENSION, quality = 0.85) {
  return new Promise((resolve) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      // Déjà WebP et dans les limites → rien à faire
      if (file.type === "image/webp" && img.width <= maxWidth) {
        resolve(file);
        return;
      }
      const ratio = img.width > maxWidth ? maxWidth / img.width : 1;
      const w = Math.round(img.width * ratio);
      const h = Math.round(img.height * ratio);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d").drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(file); return; }
          resolve(new File([blob], file.name.replace(/\.[^.]+$/, ".webp"), { type: "image/webp" }));
        },
        "image/webp",
        quality
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

/**
 * Redimensionne une image si elle dépasse maxWidth pixels de large.
 * Retourne le fichier original si aucun redimensionnement n'est nécessaire.
 */
export async function resizeIfNeeded(file, maxWidth = MAX_DIMENSION) {
  return new Promise((resolve) => {
    const img = new window.Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      if (img.width <= maxWidth) {
        resolve(file);
        return;
      }
      const ratio = maxWidth / img.width;
      const canvas = document.createElement("canvas");
      canvas.width = maxWidth;
      canvas.height = Math.round(img.height * ratio);
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(file); return; }
          resolve(new File([blob], file.name, { type: "image/webp" }));
        },
        "image/webp",
        0.85
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };
    img.src = objectUrl;
  });
}

/**
 * Valide un tableau de fichiers : vérifie le format et la taille max.
 * Retourne les fichiers valides et déclenche les toasts d'erreur pour les invalides.
 */
export function validateFiles(files, toast) {
  return Array.from(files).filter((f) => {
    if (!ACCEPTED_TYPES.includes(f.type)) {
      toast.error(`${f.name} : Format non supporté. Formats acceptés : WebP, JPG, PNG, GIF, BMP.`);
      return false;
    }
    if (f.size > MAX_IMAGE_SIZE_BYTES) {
      toast.warning(`${f.name} trop volumineux (${(f.size / 1024 / 1024).toFixed(1)} Mo). Max : ${MAX_IMAGE_SIZE_MB} Mo.`);
      return false;
    }
    return true;
  });
}

/**
 * Upload un lot d'images vers Strapi via le proxy.
 * Gère le redimensionnement, le batching et l'abort.
 *
 * @param {Array} newPages - Pages à uploader ({ id, file, numero, ... })
 * @param {string} jwt - Token JWT
 * @param {AbortController} controller - Contrôleur d'annulation
 * @param {function} onProgress - Callback (texte, progressPercent 0–100)
 * @returns {Map} uploadedMap: localId -> strapiMediaId
 */
export async function batchUploadImages(newPages, jwt, controller, onProgress) {
  const uploadedMap = new Map();
  const total = newPages.length;
  let uploaded = 0;

  for (let batchStart = 0; batchStart < total; batchStart += UPLOAD_BATCH_SIZE) {
    if (controller.signal.aborted) throw new DOMException("Annulé", "AbortError");

    const batch = newPages.slice(batchStart, batchStart + UPLOAD_BATCH_SIZE);

    // Phase 1 : optimisation des images du lot
    const optimPercent = Math.round((uploaded / total) * 100);
    onProgress("optimize", optimPercent, uploaded, total);

    const resizedFiles = await Promise.all(
      batch.map(async (page) => ({
        page,
        resized: await resizeIfNeeded(page.file),
      }))
    );

    // Phase 2 : envoi du lot
    const sendPercent = Math.round(((uploaded + batch.length * 0.5) / total) * 100);
    onProgress("upload", sendPercent, uploaded, total);

    const formData = new FormData();
    resizedFiles.forEach(({ page, resized }) => {
      formData.append("files", new File([resized], `${page.numero}.webp`, { type: "image/webp" }));
    });

    const uploadRes = await fetch("/api/proxy/upload", {
      method: "POST",
      headers: { Authorization: `Bearer ${jwt}` },
      body: formData,
      signal: controller.signal,
    });

    if (!uploadRes.ok) throw new Error(`Erreur upload pages ${batchStart + 1}-${Math.min(batchStart + UPLOAD_BATCH_SIZE, total)}`);
    const uploadData = await uploadRes.json();
    if (!Array.isArray(uploadData) || uploadData.length !== batch.length) {
      throw new Error(`Réponse inattendue pour le lot ${batchStart + 1}-${Math.min(batchStart + UPLOAD_BATCH_SIZE, total)}`);
    }

    batch.forEach((page, idx) => {
      uploadedMap.set(page.id, uploadData[idx].id);
    });

    uploaded += batch.length;
  }

  onProgress("upload", 100, total, total);
  return uploadedMap;
}
