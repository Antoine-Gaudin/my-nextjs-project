"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import axios from "axios";
import Cookies from "js-cookie";

const MoChapitre = () => {
  const router = useRouter();
  const { documentid } = useParams(); // Récupère le documentid depuis l'URL
  const [formData, setFormData] = useState({
    titre: "",
    order: "",
    texte: "",
    tome: "",
  });
  const editorRef = useRef(null); // Référence pour l'éditeur de texte riche
  const [message, setMessage] = useState("");
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  useEffect(() => {
    const fetchChapitre = async () => {
      try {
        const jwt = Cookies.get("jwt");
        if (!jwt) {
          setMessage("JWT manquant. Veuillez vous reconnecter.");
          return;
        }

        // Récupère les données du chapitre via l'API
        const res = await axios.get(`${apiUrl}/api/chapitres/${documentid}`, {
          headers: {
            Authorization: `Bearer ${jwt}`,
          },
        });

        const chapitre = res.data.data;

        // Met à jour les champs avec les données récupérées
        setFormData({
          titre: chapitre.titre || "",
          order: chapitre.order || "",
          texte: chapitre.texte
            .map((t) => t.children[0]?.text || "")
            .join("\n"), // Convertir en sauts de ligne
          tome: chapitre.tome || "",
        });

        // Insère le texte dans l'éditeur riche avec sauts de ligne
        if (editorRef.current) {
          const texteHTML = chapitre.texte
            .map((t) => `<p>${t.children[0]?.text || ""}</p>`)
            .join("");
          editorRef.current.innerHTML = texteHTML;
        }
      } catch (error) {
        console.error("Erreur lors de la récupération du chapitre :", error);
        setMessage("Erreur lors de la récupération du chapitre.");
      }
    };

    fetchChapitre();
  }, [documentid]);

  const handleEditorCommand = (command, value = null) => {
    document.execCommand(command, false, value);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Récupère le texte formaté depuis l'éditeur riche
    const texteHTML = editorRef.current.innerHTML.trim();

    // Transforme le texte HTML en structure avec les retours à la ligne
    const formattedTexte = texteHTML
      .split(/<p>|<\/p>/)
      .filter((line) => line.trim() !== "")
      .map((line) => ({
        type: "paragraph",
        children: [{ type: "text", text: line.replace(/<br>/g, "\n").trim() }],
      }));

    if (!formData.titre || !formData.order || !texteHTML) {
      alert("Veuillez remplir tous les champs obligatoires !");
      return;
    }

    try {
      const jwt = Cookies.get("jwt");
      if (!jwt) {
        setMessage("JWT manquant. Veuillez vous reconnecter.");
        return;
      }

      const payload = {
        data: {
          titre: formData.titre,
          order: parseInt(formData.order, 10),
          texte: formattedTexte,
          tome: formData.tome || null,
        },
      };

      const res = await axios.put(`${apiUrl}/api/chapitres/${documentid}`, payload, {
        headers: {
          Authorization: `Bearer ${jwt}`,
        },
      });

      setMessage("Chapitre modifié avec succès !");
      router.back(); // Retourne à la page précédente
    } catch (error) {
      console.error("Erreur lors de la modification :", error);
      setMessage("Erreur lors de la modification.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col p-6">
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="bg-blue-500 hover:bg-blue-400 text-white px-4 py-2 rounded"
        >
          Retour
        </button>
      </div>
      <h1 className="text-3xl font-bold mb-6">Modifier le Chapitre</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
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
          <label className="block text-sm font-medium mb-1">Ordre :</label>
          <input
            type="number"
            name="order"
            value={formData.order}
            onChange={handleInputChange}
            className="block w-full p-2 bg-gray-700 border border-gray-600 rounded focus:outline-none"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Tome :</label>
          <input
            type="text"
            name="tome"
            value={formData.tome}
            onChange={handleInputChange}
            className="block w-full p-2 bg-gray-700 border border-gray-600 rounded focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Texte :</label>
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
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => router.back()}
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
      {message && <p className="mt-6 text-green-400">{message}</p>}
    </div>
  );
};

export default MoChapitre;
