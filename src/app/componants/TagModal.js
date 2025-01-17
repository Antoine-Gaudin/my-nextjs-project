import React, { useState, useEffect } from "react";
import axios from "axios";

const TagModal = ({ oeuvreId, onClose, onTagUpdate }) => {
  const [tagSearchTerm, setTagSearchTerm] = useState("");
  const [tags, setTags] = useState([]);
  const [filteredTags, setFilteredTags] = useState([]);
  const [oeuvreTags, setOeuvreTags] = useState([]);
  const [oeuvre, setOeuvre] = useState(null);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  useEffect(() => {
    const fetchOeuvreAndTags = async () => {
      try {
        // Récupération de l'œuvre
        const oeuvreRes = await axios.get(
          `${apiUrl}/api/oeuvres/${oeuvreId}?populate=tags`
        );
        const fetchedOeuvre = oeuvreRes.data.data;
        setOeuvre(fetchedOeuvre);
        setOeuvreTags(fetchedOeuvre.tags || []);

        // Récupération des tags disponibles
        const tagRes = await axios.get(`${apiUrl}/api/tags`);
        setTags(tagRes.data.data || []);
      } catch (error) {
        console.error("Erreur lors de la récupération des données :", error);
      }
    };

    fetchOeuvreAndTags();
  }, [oeuvreId]);

  useEffect(() => {
    setFilteredTags(
      tags.filter((tag) =>
        tag.nom.toLowerCase().includes(tagSearchTerm.toLowerCase())
      )
    );
  }, [tags, tagSearchTerm]);

  const handleCreateTag = async () => {
    if (!tagSearchTerm.trim()) {
      alert("Le nom du tag ne peut pas être vide.");
      return;
    }

    const existingTag = tags.find(
      (tag) => tag.nom.toLowerCase() === tagSearchTerm.toLowerCase()
    );

    if (existingTag) {
      alert("Ce tag existe déjà.");
      return;
    }

    try {
      const res = await axios.post(`${apiUrl}/api/tags`, {
        data: { nom: tagSearchTerm },
      });
      const newTag = res.data.data;

      setTags([...tags, newTag]);
      setTagSearchTerm("");

      // Associer immédiatement au besoin
      await handleToggleTag(newTag.documentId);
    } catch (error) {
      console.error("Erreur lors de la création du tag :", error);
    }
  };

  const handleToggleTag = async (tagDocumentId) => {
    if (!oeuvre) {
      console.error("L'œuvre n'a pas été chargée.");
      return;
    }

    try {
      const isAttached = oeuvreTags.some(
        (tag) => tag.documentId === tagDocumentId
      );
      const updatedTags = isAttached
        ? oeuvreTags.filter((tag) => tag.documentId !== tagDocumentId)
        : [
            ...oeuvreTags,
            tags.find((tag) => tag.documentId === tagDocumentId),
          ];

      await axios.put(`${apiUrl}/api/oeuvres/${oeuvre.documentId}`, {
        data: { tags: updatedTags.map((tag) => tag.documentId) },
      });

      setOeuvreTags(updatedTags);
      onTagUpdate?.(); // Appelle `onTagUpdate` si elle est définie
    } catch (error) {
      console.error("Erreur lors de la mise à jour des tags :", error);
    }
  };

  const renderTags = () =>
    filteredTags.map((tag) => {
      const isAttached = oeuvreTags.some(
        (t) => t.documentId === tag.documentId
      );
      return (
        <div
          key={tag.documentId}
          className={`p-2 border rounded cursor-pointer ${
            isAttached ? "bg-blue-700 text-white" : "bg-gray-700 text-gray-300"
          } hover:bg-gray-600 transition`}
          onClick={() => handleToggleTag(tag.documentId)}
        >
          <span>{tag.nom || "Tag sans nom"}</span>
        </div>
      );
    });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="p-6 bg-gray-900 text-white rounded shadow-lg w-full max-w-4xl">
        <h2 className="text-xl font-bold mb-4">Gérer les Tags</h2>

        <div className="mb-6">
          <label className="block mb-2">Rechercher ou Ajouter un Tag :</label>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={tagSearchTerm}
              onChange={(e) => setTagSearchTerm(e.target.value)}
              className="w-full p-2 rounded bg-gray-800 border border-gray-700 text-gray-300"
            />
            <button
              onClick={handleCreateTag}
              className="bg-blue-600 px-4 py-2 rounded hover:bg-blue-500 transition"
            >
              Ajouter
            </button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">{renderTags()}</div>
        </div>

        <button
          onClick={onClose}
          className="w-full bg-red-600 py-2 rounded hover:bg-red-500 transition"
        >
          Fermer
        </button>
      </div>
    </div>
  );
};

export default TagModal;
