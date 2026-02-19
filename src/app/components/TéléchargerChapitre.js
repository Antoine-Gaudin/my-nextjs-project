"use client";

import React, { useState } from "react";
import Cookies from "js-cookie";
import { useToast } from "./Toast";

const MAX_PDF_SIZE_MB = 20;
const MAX_PDF_SIZE_BYTES = MAX_PDF_SIZE_MB * 1024 * 1024;

const TéléchargerChapitre = ({ oeuvreId, onClose, onChapitreUploaded }) => {
  const toast = useToast();
  const [titre, setTitre] = useState("");
  const [order, setOrder] = useState("");
  const [tome, setTome] = useState("");
  const [pdfFile, setPdfFile] = useState(null); // Pour le fichier PDF
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.size > MAX_PDF_SIZE_BYTES) {
      toast.warning(`Le fichier est trop volumineux (${(file.size / 1024 / 1024).toFixed(1)} Mo). Taille maximale : ${MAX_PDF_SIZE_MB} Mo.`);
      e.target.value = "";
      return;
    }
    setPdfFile(file); // Stocke le fichier sélectionné
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!titre || !order || !pdfFile) {
      toast.warning("Veuillez remplir tous les champs obligatoires !");
      return;
    }

    setUploading(true);
    try {
      const jwt = Cookies.get("jwt");
      if (!jwt) {
        toast.error("Token JWT manquant. Veuillez vous reconnecter.");
        return;
      }

      // Étape 1 : Uploader le fichier PDF sur Cloudinary via Strapi
      const formData = new FormData();
      formData.append("files", pdfFile);

      const uploadRes = await fetch(`/api/proxy/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${jwt}`,
        },
        body: formData,
      });

      if (!uploadRes.ok) {
        console.error("Erreur lors de l'upload du PDF :", uploadRes.status);
        toast.error("Erreur lors de l'upload du fichier PDF.");
        return;
      }

      const uploadResponseData = await uploadRes.json();

      // Vérifier que la réponse contient bien l'URL du fichier
      if (!Array.isArray(uploadResponseData) || uploadResponseData.length === 0 || !uploadResponseData[0].url) {
        console.error("Réponse upload inattendue :", uploadResponseData);
        toast.error("Erreur : la réponse du serveur ne contient pas l'URL du fichier.");
        return;
      }

      // Récupérez l'URL du fichier (Cloudinary = URL absolue)
      const pdf = uploadResponseData[0].url;


      // Étape 2 : Créer un chapitre avec les données textuelles et l'URL du fichier PDF
      const requestBody = {
        data: {
          titre,
          order: parseInt(order, 10),
          texte: null, // Texte laissé vide
          tome: tome ? parseInt(tome, 10) : null,
          pdf, // URL Cloudinary du fichier PDF
          oeuvres: oeuvreId, // Relation avec l'œuvre
        },
      };

  
      const res = await fetch(`/api/proxy/chapitres`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!res.ok) {
        console.error("Erreur lors de la création du chapitre :", res.status);
        toast.error("Erreur lors de la création du chapitre.");
        return;
      }

      const chapitreData = await res.json();

      toast.success("Chapitre et fichier PDF ajoutés avec succès !");
      onChapitreUploaded(); // Met à jour les données du parent
    } catch (error) {
      console.error("Erreur lors de l'opération :", error);
      toast.error("Une erreur est survenue lors de l'ajout du chapitre.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div role="dialog" aria-modal="true" aria-label="Télécharger un chapitre" className="bg-gray-800 text-white p-6 rounded-lg shadow-lg w-full max-w-3xl">
        <h2 className="text-xl font-bold mb-4">Télécharger un Chapitre</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-semibold mb-1">Titre</label>
            <input
              type="text"
              value={titre}
              onChange={(e) => setTitre(e.target.value)}
              className="w-full p-2 rounded bg-gray-700 border border-gray-600"
              placeholder="Titre du chapitre"
              required
            />
          </div>
          <div>
            <label className="block font-semibold mb-1">Ordre</label>
            <input
              type="number"
              value={order}
              onChange={(e) => setOrder(e.target.value)}
              className="w-full p-2 rounded bg-gray-700 border border-gray-600"
              placeholder="Ordre du chapitre"
              required
            />
          </div>
          <div>
            <label className="block font-semibold mb-1">Tome <span className="text-gray-400 text-sm">(optionnel)</span></label>
            <input
              type="number"
              value={tome}
              onChange={(e) => setTome(e.target.value)}
              className="w-full p-2 rounded bg-gray-700 border border-gray-600"
              placeholder="Numéro du tome"
            />
          </div>
          <div>
            <label className="block font-semibold mb-1">Fichier PDF <span className="text-gray-400 text-sm">(max {MAX_PDF_SIZE_MB} Mo)</span></label>
            <input
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              className="w-full p-2 rounded bg-gray-700 border border-gray-600"
              required
            />
            {pdfFile && (
              <p className="text-sm text-gray-400 mt-1">
                {pdfFile.name} — {(pdfFile.size / 1024 / 1024).toFixed(1)} Mo
              </p>
            )}
          </div>
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={onClose}
              className="bg-red-500 px-4 py-2 rounded hover:bg-red-400"
              disabled={uploading}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="bg-green-500 px-4 py-2 rounded hover:bg-green-400 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={uploading}
            >
              {uploading ? "Upload en cours..." : "Ajouter"}
            </button>
          </div>
        </form>
        {message && <p className="text-green-400 mt-4">{message}</p>}
      </div>
    </div>
  );
};

export default TéléchargerChapitre;
