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
  const apiToken="cb2645fbb7eef796ddc032f2d273465aa0e3cef5c5e72a3d7ea37aeeec9dbdde71f3a593a428355fb18cebfa8ae8d18932de36d48185f4125944f70f0771feeec5a6819be2338dd89db5a0df784daeab243dc5feac8d620bb65401d5b5efac46b606fc9995fc0d2359b08a0acaefcf3880967ed43865ba4ecfea9f1f081b0c34";
  
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
  
    const jwt = Cookies.get("jwt");
    if (!jwt) {
      alert("JWT manquant. Veuillez vous reconnecter.");
      return;
    }
  
    if (!userId) {
      alert("Impossible d'ajouter l'œuvre. Utilisateur non identifié.");
      return;
    }
  
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
      // 1. Création de l’œuvre locale
      const payload = {
        data: {
          ...formData,
          synopsis: formattedSynopsis,
          users: [userId],
        },
      };
  
      const response = await axios.post(`${apiUrl}/api/oeuvres`, payload, {
        headers: {
          Authorization: `Bearer ${jwt}`,
        },
      });
  
      const newOeuvre = response.data;
  
      // 2. Upload de la couverture locale (si présente)
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
  
      // 3. Récupérer l'utilisateur pour le champ "traduction"
      const userRes = await axios.get(`${apiUrl}/api/users/me`, {
        headers: {
          Authorization: `Bearer ${jwt}`,
        },
      });
  
      const userName = userRes.data.username || "Anonyme";
  
      // 4. Récupérer l’image locale en blob si uploadée
      let couvertureBlob = null;
      if (couverture) {
        couvertureBlob = couverture;
      }
  
      // 5. Envoi vers novel-index
      const indexPayload = {
        data: {
          titre: formData.titre,
          titrealt: formData.titrealt,
          auteur: formData.auteur,
          annee: formData.annee,
          type: formData.type,
          categorie: formData.categorie,
          etat: formData.etat,
          synopsis: rawSynopsis.replace(/<[^>]+>/g, ""), // extrait le texte brut du HTML
          traduction: userName,
          langage: "Français",
          licence: false,
        },
      };
  
      const indexRes = await axios.post(
        "https://novel-index-strapi.onrender.com/api/oeuvres",
        indexPayload,
        {
          headers: {
            Authorization: `Bearer ${apiToken}`,
          },
        }
      );
  
      if (couvertureBlob) {
        const uploadDataIndex = new FormData();
        uploadDataIndex.append("files", couvertureBlob, couvertureBlob.name);
        uploadDataIndex.append("ref", "api::oeuvre.oeuvre");
        uploadDataIndex.append("refId", indexRes.data.data.id);
        uploadDataIndex.append("field", "couverture");
  
        await axios.post(
          "https://novel-index-strapi.onrender.com/api/upload",
          uploadDataIndex,
          {
            headers: {
              Authorization: `Bearer ${apiToken}`,
            },
          }
        );
      }
  
      alert("Œuvre ajoutée et synchronisée avec succès !");
      setFormData({
        titre: "",
        titrealt: "",
        auteur: "",
        annee: "",
        type: "",
        categorie: "",
        etat: "En cours",
      });
      editorRef.current.innerHTML = "";
      setCouverture(null);
      onClose();
  
    } catch (err) {
      console.error("Erreur :", err.response?.data || err);
      alert("Erreur lors de l’ajout ou de la synchro.");
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
