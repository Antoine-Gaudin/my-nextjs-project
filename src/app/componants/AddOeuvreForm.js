"use client";

import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import Cookies from "js-cookie";

const AddOeuvreForm = ({ onClose }) => {
  const [formData, setFormData] = useState({
    titre: "",
    titrealt: "",
    auteur: "",
    annee: "",
    type: "",
    categorie: "",
    etat: "En cours", // Valeur par défaut
  });
  const [message, setMessage] = useState("");
  const [couverture, setCouverture] = useState(null);
  const [userId, setUserId] = useState(null);
  const editorRef = useRef(null);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL; // Récupérer l'URL de l'API
  useEffect(() => {
    const fetchUserId = async () => {
      const jwt = Cookies.get("jwt");
      if (!jwt) {
        setMessage("JWT manquant. Veuillez vous reconnecter.");
        return;
      }

      try {
        const res = await axios.get(`${apiUrl}/api/users/me`, {
          headers: {
            Authorization: `Bearer ${jwt}`,
          },
        });

        if (res.status === 200) {
          setUserId(res.data.id);
        } else {
          setMessage("Erreur lors de la récupération des informations utilisateur.");
        }
      } catch (err) {
        console.error("Erreur lors de la récupération de l'utilisateur :", err);
        setMessage("Erreur lors de la récupération des informations utilisateur.");
      }
    };

    fetchUserId();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleFileChange = (e) => {
    setCouverture(e.target.files[0]);
  };

  const handleEditorCommand = (command, value = null) => {
    document.execCommand(command, false, value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!userId) {
      alert("Impossible d'ajouter l'œuvre. Utilisateur non identifié.");
      return;
    }

    // Récupérer et formater le contenu du champ synopsis
    const rawSynopsis = editorRef.current.innerHTML.trim();
    const formattedSynopsis = [
      {
        type: "paragraph",
        children: [
          { type: "text", text: rawSynopsis.replace(/<[^>]+>/g, "") },
        ],
      },
    ];

    try {
      const jwt = Cookies.get("jwt");
      if (!jwt) {
        alert("JWT manquant. Veuillez vous reconnecter.");
        return;
      }

      const payload = {
        data: {
          ...formData,
          synopsis: formattedSynopsis, // Envoi du synopsis formaté
          users: [userId],
        },
      };

      const response = await axios.post(`${apiUrl}/api/oeuvres`, payload, {
        headers: {
          Authorization: `Bearer ${jwt}`,
        },
      });

      const newOeuvre = response.data;

      // Upload de la couverture, si présente
      if (couverture) {
        const uploadData = new FormData();
        uploadData.append("files", couverture);
        uploadData.append("ref", "api::oeuvre.oeuvre");
        uploadData.append("refId", newOeuvre.data.id);
        uploadData.append("field", "couverture");

        await axios.post(`${apiUrl}/api/upload`, uploadData, {
          headers: {
            Authorization: `Bearer ${jwt}`,
          },
        });
      }

      alert("Œuvre ajoutée avec succès !");
      setFormData({
        titre: "",
        titrealt: "",
        auteur: "",
        annee: "",
        type: "",
        categorie: "",
        etat: "En cours", // Reset par défaut
      });
      editorRef.current.innerHTML = ""; // Réinitialise le synopsis
      setCouverture(null);
      onClose();
    } catch (err) {
      console.error("Erreur lors de l’ajout :", err.response?.data || err);
      alert("Erreur lors de l’ajout.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-gray-800 text-white p-6 rounded shadow-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold mb-6">Ajouter une œuvre</h3>
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
                <button
                  type="button"
                  onClick={() => handleEditorCommand("insertImage")}
                  className="px-2 py-1 bg-blue-500 text-white rounded"
                >
                  Ajouter Image
                </button>
              </div>
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
            <select
              name="etat"
              value={formData.etat}
              onChange={handleInputChange}
              className="block w-full p-2 bg-gray-700 border border-gray-600 rounded focus:outline-none"
            >
              <option value="En cours">En cours</option>
              <option value="Arrêter">Arrêter</option>
              <option value="En pause">En pause</option>
              <option value="Terminer">Terminer</option>
              <option value="Libre">Libre</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Couverture :</label>
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
      </div>
    </div>
  );
};

export default AddOeuvreForm;
