"use client";

import React, { useState, useRef } from "react";
import Cookies from "js-cookie";

const AjouterChapitre = ({ oeuvreId, onClose, onChapitreAdded }) => {
  const [titre, setTitre] = useState("");
  const [order, setOrder] = useState("");
  const [tome, setTome] = useState(""); // Peut être laissé vide
  const editorRef = useRef(null);

  const handleEditorCommand = (command, value = null) => {
    document.execCommand(command, false, value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Récupère le contenu HTML brut depuis l'éditeur
    const texte = editorRef.current.innerHTML.trim();

    // Formatage pour Strapi : conserve les balises HTML (y compris <br> et <p>)
    const formattedTexte = [
      {
        type: "paragraph",
        children: [
          {
            type: "text",
            text: texte, // Le texte inclut maintenant les balises HTML pour les retours à la ligne
          },
        ],
      },
    ];

    if (!titre || !order || !texte) {
      alert("Veuillez remplir tous les champs obligatoires !");
      return;
    }

    try {
      const jwt = Cookies.get("jwt");
      if (!jwt) {
        console.error("JWT manquant !");
        return;
      }

      const requestBody = {
        data: {
          titre,
          order: parseInt(order, 10),
          tome: tome || null, // Envoie null si le champ est vide
          texte: formattedTexte, // Texte au format HTML brut
          oeuvres: oeuvreId,
        },
      };

      const res = await fetch("http://127.0.0.1:1337/api/chapitres", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!res.ok) {
        console.error("Erreur lors de l'ajout du chapitre :", res.status);
        alert("Erreur lors de l'ajout du chapitre.");
        return;
      }

      const data = await res.json();
      console.log("Réponse du serveur :", data);
      alert("Chapitre ajouté avec succès !");
      onChapitreAdded(data); // Met à jour la liste des chapitres dans le composant parent
    } catch (error) {
      console.error("Erreur lors de l'ajout du chapitre :", error);
      alert("Une erreur est survenue.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-6 rounded-lg shadow-lg w-full max-w-3xl text-white max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Ajouter un Chapitre</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-1 font-semibold">Titre</label>
            <input
              type="text"
              value={titre}
              onChange={(e) => setTitre(e.target.value)}
              className="w-full p-2 rounded bg-gray-700 border border-gray-600"
              placeholder="Titre du chapitre"
            />
          </div>
          <div>
            <label className="block mb-1 font-semibold">Ordre</label>
            <input
              type="number"
              value={order}
              onChange={(e) => setOrder(e.target.value)}
              className="w-full p-2 rounded bg-gray-700 border border-gray-600"
              placeholder="Ordre du chapitre"
            />
          </div>
          <div>
            <label className="block mb-1 font-semibold">Tome</label>
            <input
              type="text"
              value={tome}
              onChange={(e) => setTome(e.target.value)}
              className="w-full p-2 rounded bg-gray-700 border border-gray-600"
              placeholder="Numéro du tome (optionnel)"
            />
          </div>
          <div>
            <label className="block mb-1 font-semibold">Texte</label>
            <div className="bg-gray-700 p-2 rounded border border-gray-600">
              {/* Barre d'outils */}
              <div className="mb-2 space-x-2">
                <button
                  type="button"
                  onClick={() => handleEditorCommand("bold")}
                  className="px-2 py-1 bg-blue-500 text-white rounded"
                >
                  Gras
                </button>
                <button
                  type="button"
                  onClick={() => handleEditorCommand("italic")}
                  className="px-2 py-1 bg-blue-500 text-white rounded"
                >
                  Italique
                </button>
                <button
                  type="button"
                  onClick={() => handleEditorCommand("underline")}
                  className="px-2 py-1 bg-blue-500 text-white rounded"
                >
                  Souligné
                </button>
                {/* Taille de police */}
                <select
                  onChange={(e) => handleEditorCommand("fontSize", e.target.value)}
                  className="bg-gray-700 text-white px-2 py-1 rounded"
                  defaultValue=""
                >
                  <option value="" disabled>
                    Taille de police
                  </option>
                  <option value="1">Très petite</option>
                  <option value="2">Petite</option>
                  <option value="3">Normale</option>
                  <option value="4">Grande</option>
                  <option value="5">Très grande</option>
                  <option value="6">Énorme</option>
                  <option value="7">Gigantesque</option>
                </select>
              </div>

              {/* Conteneur éditable */}
              <div
                ref={editorRef}
                contentEditable
                className="min-h-[200px] bg-gray-800 p-2 rounded text-white overflow-y-auto"
                style={{ outline: "none", maxHeight: "300px" }}
              ></div>
            </div>
          </div>
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={onClose}
              className="bg-red-500 px-4 py-2 rounded hover:bg-red-400 transition"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="bg-green-500 px-4 py-2 rounded hover:bg-green-400 transition"
            >
              Ajouter
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AjouterChapitre;
