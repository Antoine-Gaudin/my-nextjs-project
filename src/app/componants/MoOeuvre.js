"use client";

import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import Cookies from "js-cookie";

const MoOeuvre = ({ oeuvre, onClose, onUpdate }) => {
  const [formData, setFormData] = useState({
    titre: "",
    titrealt: "",
    auteur: "",
    annee: "",
    type: "",
    categorie: "",
    synopsis: "",
    etat: "",
  });
  const [couverture, setCouverture] = useState(null); // Nouvelle photo
  const [existingCouverture, setExistingCouverture] = useState(""); // URL de la couverture existante
  const [message, setMessage] = useState("");
  const editorRef = useRef(null); // Référence pour l'éditeur de synopsis
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const handleEditorCommand = (command, value = null) => {
    document.execCommand(command, false, value);
  };

  useEffect(() => {
    if (oeuvre) {
      console.log("Initialisation des données de l'œuvre :", oeuvre);

      // Initialise le contenu HTML de l'éditeur
      if (editorRef.current && oeuvre.synopsis) {
        editorRef.current.innerHTML = oeuvre.synopsis
          .map(item => item.children.map(child => child.text).join(""))
          .join("<br>");
      }

      setFormData({
        titre: oeuvre.titre || "",
        titrealt: oeuvre.titrealt || "",
        auteur: oeuvre.auteur || "",
        annee: oeuvre.annee || "",
        type: oeuvre.type || "",
        categorie: oeuvre.categorie || "",
        etat: oeuvre.etat || "",
      });

      // Stocke l'URL de la couverture existante
      if (oeuvre.couverture && oeuvre.couverture.url) {
        setExistingCouverture(`${apiUrl}${oeuvre.couverture.url}`);
      }
    }
  }, [oeuvre]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    console.log(`Modification du champ ${name} :`, value);
    setFormData({ ...formData, [name]: value });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setCouverture(file); // Stocke le fichier sélectionné

  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Récupère le contenu HTML brut depuis l'éditeur
    const texte = editorRef.current.innerHTML.trim();

    // Formatage pour Strapi
    const formattedSynopsis = [
      {
        type: "paragraph",
        children: [
          {
            type: "text",
            text: texte, // Texte brut incluant les retours à la ligne HTML
          },
        ],
      },
    ];


    try {
      const jwt = Cookies.get("jwt");
      if (!jwt) {
        setMessage("JWT manquant. Veuillez vous reconnecter.");
        console.error("JWT manquant !");
        return;
      }

      const payload = {
        data: {
          ...formData,
          synopsis: formattedSynopsis, // Met à jour le synopsis avec le contenu de l'éditeur
        },
      };

      const response = await axios.put(
        `${apiUrl}/api/oeuvres/${oeuvre.documentId}`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${jwt}`,
          },
        }
      );

      const updatedOeuvre = response.data;

      // Vérifie si une nouvelle couverture a été sélectionnée
      if (couverture) {
        const uploadData = new FormData();
        uploadData.append("files", couverture);
        uploadData.append("ref", "api::oeuvre.oeuvre");
        uploadData.append("refId", updatedOeuvre.data.id);
        uploadData.append("field", "couverture");

        const uploadResponse = await axios.post(`${apiUrl}/api/upload`, uploadData, {
          headers: {
            Authorization: `Bearer ${jwt}`,
          },
        });

        console.log("Réponse de l'upload de la couverture :");
      } else {
        console.log("Aucune nouvelle couverture sélectionnée. La couverture existante reste inchangée.");
      }

      setMessage("Œuvre modifiée avec succès !");
      onUpdate();
      onClose();
    } catch (err) {
      console.error("Erreur lors de la modification :", err.response?.data || err);
      setMessage("Erreur lors de la modification.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-gray-800 text-white p-6 rounded shadow-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold mb-6">Modifier une œuvre</h3>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-1">Titre :</label>
            <input
              type="text"
              name="titre"
              value={formData.titre}
              onChange={handleInputChange}
              className="block w-full p-2 bg-gray-700 border border-gray-600 rounded focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Titre alternatif :</label>
            <input
              type="text"
              name="titrealt"
              value={formData.titrealt}
              onChange={handleInputChange}
              className="block w-full p-2 bg-gray-700 border border-gray-600 rounded focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Auteur :</label>
            <input
              type="text"
              name="auteur"
              value={formData.auteur}
              onChange={handleInputChange}
              className="block w-full p-2 bg-gray-700 border border-gray-600 rounded focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Année :</label>
            <input
              type="number"
              name="annee"
              value={formData.annee}
              onChange={handleInputChange}
              className="block w-full p-2 bg-gray-700 border border-gray-600 rounded focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Type :</label>
            <input
              type="text"
              name="type"
              value={formData.type}
              onChange={handleInputChange}
              className="block w-full p-2 bg-gray-700 border border-gray-600 rounded focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Catégorie :</label>
            <input
              type="text"
              name="categorie"
              value={formData.categorie}
              onChange={handleInputChange}
              className="block w-full p-2 bg-gray-700 border border-gray-600 rounded focus:outline-none"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Synopsis :</label>
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
          <div>
            <label className="block text-sm font-medium mb-1">État :</label>
            <input
              type="text"
              name="etat"
              value={formData.etat}
              onChange={handleInputChange}
              className="block w-full p-2 bg-gray-700 border border-gray-600 rounded focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Couverture :</label>
            {existingCouverture && !couverture && (
              <img
                src={existingCouverture}
                alt="Couverture existante"
                className="mb-4 max-w-full max-h-32 object-cover rounded"
              />
            )}
            <input
              type="file"
              onChange={handleFileChange}
              className="block w-full p-2 bg-gray-700 border border-gray-600 rounded focus:outline-none"
            />
          </div>
          <div className="md:col-span-2 flex justify-end space-x-4">
            <button
              type="button"
              onClick={onClose}
              className="bg-red-600 px-4 py-2 rounded hover:bg-red-500"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="bg-green-600 px-4 py-2 rounded hover:bg-green-500"
            >
              Enregistrer
            </button>
          </div>
        </form>
        {message && <p className="mt-4 text-green-400">{message}</p>}
      </div>
    </div>
  );
};

export default MoOeuvre;
