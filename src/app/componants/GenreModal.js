import React, { useState, useEffect } from "react";
import axios from "axios";

const GenreModal = ({ oeuvreId, onClose, onGenreUpdate }) => {
  const [genreSearchTerm, setGenreSearchTerm] = useState("");
  const [genres, setGenres] = useState([]);
  const [filteredGenres, setFilteredGenres] = useState([]);
  const [oeuvreGenres, setOeuvreGenres] = useState([]);
  const [oeuvre, setOeuvre] = useState(null);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL; 
  useEffect(() => {
    const fetchOeuvreAndGenres = async () => {
      try {
        // Récupération de l'œuvre
        const oeuvreRes = await axios.get(
          `${apiUrl}/api/oeuvres/${oeuvreId}?populate=genres`
        );
        const fetchedOeuvre = oeuvreRes.data.data;
        setOeuvre(fetchedOeuvre);
        setOeuvreGenres(fetchedOeuvre.genres || []);

        // Récupération des genres disponibles
        const genreRes = await axios.get(`${apiUrl}/api/genres`);
        setGenres(genreRes.data.data || []);
      } catch (error) {
        console.error("Erreur lors de la récupération des données :", error);
      }
    };

    fetchOeuvreAndGenres();
  }, [oeuvreId]);

  useEffect(() => {
    setFilteredGenres(
      genres.filter((genre) =>
        genre.nom.toLowerCase().includes(genreSearchTerm.toLowerCase())
      )
    );
  }, [genres, genreSearchTerm]);

  const handleCreateGenre = async () => {
    if (!genreSearchTerm.trim()) {
      alert("Le nom du genre ne peut pas être vide.");
      return;
    }

    const existingGenre = genres.find(
      (genre) => genre.nom.toLowerCase() === genreSearchTerm.toLowerCase()
    );

    if (existingGenre) {
      alert("Ce genre existe déjà.");
      return;
    }

    try {
      const res = await axios.post(`${apiUrl}/api/genres`, {
        data: { nom: genreSearchTerm },
      });
      const newGenre = res.data.data;

      setGenres([...genres, newGenre]);
      setGenreSearchTerm("");

      // Associer immédiatement au besoin
      await handleToggleGenre(newGenre.documentId);
    } catch (error) {
      console.error("Erreur lors de la création du genre :", error);
    }
  };

  const handleToggleGenre = async (genreDocumentId) => {
    if (!oeuvre) {
      console.error("L'œuvre n'a pas été chargée.");
      return;
    }

    try {
      const isAttached = oeuvreGenres.some(
        (genre) => genre.documentId === genreDocumentId
      );
      const updatedGenres = isAttached
        ? oeuvreGenres.filter((genre) => genre.documentId !== genreDocumentId)
        : [
            ...oeuvreGenres,
            genres.find((genre) => genre.documentId === genreDocumentId),
          ];

      await axios.put(`${apiUrl}/api/oeuvres/${oeuvre.documentId}`, {
        data: { genres: updatedGenres.map((genre) => genre.documentId) },
      });

      setOeuvreGenres(updatedGenres);
      onGenreUpdate();
      console.log(
        isAttached
          ? `Genre retiré : ${genreDocumentId}`
          : `Genre attribué : ${genreDocumentId}`
      );
    } catch (error) {
      console.error("Erreur lors de la mise à jour des genres :", error);
    }
  };

  const renderGenres = () =>
    filteredGenres.map((genre) => {
      const isAttached = oeuvreGenres.some(
        (g) => g.documentId === genre.documentId
      );
      return (
        <div
          key={genre.documentId}
          className={`p-2 border rounded cursor-pointer ${
            isAttached ? "bg-green-700 text-white" : "bg-gray-700 text-gray-300"
          } hover:bg-gray-600 transition`}
          onClick={() => handleToggleGenre(genre.documentId)}
        >
          <span>{genre.nom || "Genre sans nom"}</span>
        </div>
      );
    });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="p-6 bg-gray-900 text-white rounded shadow-lg w-full max-w-4xl">
        <h2 className="text-xl font-bold mb-4">Gérer les Genres</h2>

        <div className="mb-6">
          <label className="block mb-2">Rechercher ou Ajouter un Genre :</label>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={genreSearchTerm}
              onChange={(e) => setGenreSearchTerm(e.target.value)}
              className="w-full p-2 rounded bg-gray-800 border border-gray-700 text-gray-300"
            />
            <button
              onClick={handleCreateGenre}
              className="bg-green-600 px-4 py-2 rounded hover:bg-green-500 transition"
            >
              Ajouter
            </button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">{renderGenres()}</div>
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

export default GenreModal;
