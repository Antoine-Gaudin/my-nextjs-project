"use client";

import React, { useState } from "react";
import Cookies from "js-cookie";

const TéléchargerChapitre = ({ oeuvreId, onClose, onChapitreUploaded }) => {
  const [titre, setTitre] = useState("");
  const [order, setOrder] = useState("");
  const [pdfFile, setPdfFile] = useState(null); // Pour le fichier PDF
  const [message, setMessage] = useState("");
  
  const handleFileChange = (e) => {
    setPdfFile(e.target.files[0]); // Stocke le fichier sélectionné
    console.log("Fichier PDF sélectionné :", e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!titre || !order || !pdfFile) {
      alert("Veuillez remplir tous les champs obligatoires !");
      return;
    }

    try {
      const jwt = Cookies.get("jwt");
      if (!jwt) {
        alert("Token JWT manquant. Veuillez vous reconnecter.");
        return;
      }

      console.log("Données d'entrée avant envoi :", {
        titre,
        order,
        oeuvreId,
        pdfFileName: pdfFile.name,
      });

      // Étape 1 : Uploader le fichier PDF
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
        alert("Erreur lors de l'upload du fichier PDF.");
        return;
      }

      const uploadResponseData = await uploadRes.json();


      // Récupérez l'URL du fichier
      const pdf = uploadResponseData[0].url;


      // Étape 2 : Créer un chapitre avec les données textuelles et l'URL du fichier PDF
      const requestBody = {
        data: {
          titre,
          order: parseInt(order, 10),
          texte: null, // Texte laissé vide
          tome: null, // Tome laissé vide
          pdf, // Enregistrez l'URL du fichier PDF dans le champ "pdf"
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
        alert("Erreur lors de la création du chapitre.");
        return;
      }

      const chapitreData = await res.json();

      alert("Chapitre et fichier PDF ajoutés avec succès !");
      onChapitreUploaded(); // Met à jour les données du parent
    } catch (error) {
      console.error("Erreur lors de l'opération :", error);
      alert("Une erreur est survenue lors de l'ajout du chapitre.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-gray-800 text-white p-6 rounded-lg shadow-lg w-full max-w-3xl">
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
            <label className="block font-semibold mb-1">Fichier PDF</label>
            <input
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              className="w-full p-2 rounded bg-gray-700 border border-gray-600"
              required
            />
          </div>
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={onClose}
              className="bg-red-500 px-4 py-2 rounded hover:bg-red-400"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="bg-green-500 px-4 py-2 rounded hover:bg-green-400"
            >
              Ajouter
            </button>
          </div>
        </form>
        {message && <p className="text-green-400 mt-4">{message}</p>}
      </div>
    </div>
  );
};

export default TéléchargerChapitre;
