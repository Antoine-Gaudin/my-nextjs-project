"use client";

import React, { useState, useRef } from "react";
import Cookies from "js-cookie";

const AjouterChapitre = ({ oeuvreId, onClose, onChapitreAdded, oeuvreTitre }) => {
  const [titre, setTitre] = useState("");
  const [order, setOrder] = useState("");
  const [tome, setTome] = useState(""); // Peut être laissé vide
  const editorRef = useRef(null);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL; // Récupérer l'URL de l'API

  const handleEditorCommand = (command, value = null) => {
    document.execCommand(command, false, value);
  };

  const handleTextColor = (color) => {
    document.execCommand("foreColor", false, color);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
  
    const texte = editorRef.current.innerHTML.trim();
  
    const formattedTexte = [
      {
        type: "paragraph",
        children: [
          {
            type: "text",
            text: texte,
          },
        ],
      },
    ];
  
    if (!titre || !order || !texte) {
      alert("Veuillez remplir tous les champs obligatoires !");
      return;
    }
  
    const jwt = Cookies.get("jwt");
    if (!jwt) {
      console.error("JWT manquant !");
      return;
    }
  
    try {
      // 1. Création du chapitre localement
      const requestBody = {
        data: {
          titre,
          order: parseInt(order, 10),
          tome: tome || null,
          texte: formattedTexte,
          oeuvres: oeuvreId,
        },
      };
  
      const res = await fetch(`${apiUrl}/api/chapitres`, {
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
  
    
  
      // 2. Construire l'URL publique du chapitre
      const createData = await res.json();
      const documentId = createData.data.documentId;
      const chapitreUrl = `https://trad-index.com/chapitre/${documentId}`;
  
      const apiToken = "cb2645fbb7eef796ddc032f2d273465aa0e3cef5c5e72a3d7ea37aeeec9dbdde71f3a593a428355fb18cebfa8ae8d18932de36d48185f4125944f70f0771feeec5a6819be2338dd89db5a0df784daeab243dc5feac8d620bb65401d5b5efac46b606fc9995fc0d2359b08a0acaefcf3880967ed43865ba4ecfea9f1f081b0c34"; // ← à remplacer

      // 1. On récupère l'ID de l’œuvre côté novel-index
      const oeuvreRes = await fetch(
        `https://novel-index-strapi.onrender.com/api/oeuvres?filters[titre][$eq]=${encodeURIComponent(oeuvreTitre)}`,
        {
          headers: {
            Authorization: `Bearer ${apiToken}`,
          },
        }
      );
      
      const oeuvreData = await oeuvreRes.json();
      const oeuvreIndexId = oeuvreData.data?.[0]?.documentId;
      
      if (!oeuvreIndexId) {
        console.error("Aucune œuvre trouvée avec ce titre sur novel-index");
        alert("Impossible de synchroniser le chapitre : œuvre non trouvée côté novel-index.");
        return;
      }
      
      // 2. Création du chapitre côté novel-index
      const indexPayload = {
        data: {
          titre,
          order: parseInt(order, 10),
          tome: tome || null,
          url: chapitreUrl,
          oeuvres: oeuvreIndexId, // 👈 on relie le chapitre à l’œuvre via son documentID
        },
      };
      
      const indexRes = await fetch("https://novel-index-strapi.onrender.com/api/chapitres", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiToken}`,
        },
        body: JSON.stringify(indexPayload),
      });
      
      if (!indexRes.ok) {
        const errorText = await indexRes.json();
        console.error("Erreur de validation novel-index :", errorText);
        alert("Chapitre ajouté localement, mais erreur de synchro vers le site de référencement.");
        return;
      }
      
  
      alert("Chapitre ajouté et synchronisé avec succès !");
      onChapitreAdded(oeuvreData);
      onClose();
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
                {/* Nouveau bouton pour la couleur du texte */}
                <button
  type="button"
  onClick={() => handleTextColor("#D3D3D3")}  // Applique la couleur gris clair
  className="px-2 py-1 bg-gray-500 text-white rounded"
>
  Couleur Texte
</button>
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
