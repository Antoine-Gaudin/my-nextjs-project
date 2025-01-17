"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function FicheOeuvre({ oeuvre, onClose }) {
  const [chapitres, setChapitres] = useState(null);
  const [filteredChapitres, setFilteredChapitres] = useState([]);
  const [filter, setFilter] = useState("all"); // "all", "downloadable", "not-downloadable"
  const [searchTerm, setSearchTerm] = useState(""); // Recherche par titre
  const [tags, setTags] = useState([]); // Tags ajoutés
  const [genres, setGenres] = useState([]); // Genres ajoutés
  const [users, setUsers] = useState([]);// users ajoutés
  const firstChapter = filteredChapitres.slice().sort((a, b) => a.order - b.order)[0]; // Premier chapitre (ordre croissant)
const lastChapter = filteredChapitres.slice().sort((a, b) => b.order - a.order)[0]; // Dernier chapitre (ordre décroissant)
const apiUrl = process.env.NEXT_PUBLIC_API_URL; // Récupérer l'URL de l'API

  const router = useRouter(); // Hook pour la navigation

  useEffect(() => {
    async function fetchChapitres() {
      try {
        console.log("Début de la récupération des chapitres pour documentId :", oeuvre.documentId);

        const response = await fetch(
          `${apiUrl}/api/oeuvres/${oeuvre.documentId}?populate=tags&populate=genres&populate=users&populate=chapitres`
        );
        const data = await response.json();


        if (data.data) {
          setChapitres(data.data.chapitres || []);
          setFilteredChapitres(data.data.chapitres || []); // Initialisation avec tous les chapitres
          setTags(data.data.tags || []); // Extraction des tags
          setGenres(data.data.genres || []); // Extraction des genres
          setUsers(data.data.users || []); // Extraction des utilisateurs
        } else {
          console.error("Aucun chapitre trouvé pour documentId :", oeuvre.documentId);
        }
      } catch (error) {
        console.error("Erreur lors de la récupération des chapitres :", error);
      }
    }

    if (oeuvre?.documentId) {
      fetchChapitres();
    }
  }, [oeuvre]);

  useEffect(() => {
    if (chapitres) {
      // Application du filtre principal
      let filtered = [];
      if (filter === "downloadable") {
        filtered = chapitres.filter((chapitre) => chapitre.pdf && chapitre.pdf.trim() !== "");
      } else if (filter === "not-downloadable") {
        filtered = chapitres.filter((chapitre) => !chapitre.pdf || chapitre.pdf.trim() === "");
      } else {
        filtered = chapitres; // Tous les chapitres
      }

      // Application de la recherche
      if (searchTerm.trim() !== "") {
        filtered = filtered.filter((chapitre) =>
          chapitre.titre.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      setFilteredChapitres(filtered);
    }
  }, [filter, chapitres, searchTerm]);

  let synopsisContent = "Aucun synopsis disponible.";
  if (Array.isArray(oeuvre.synopsis) && oeuvre.synopsis.length > 0) {
    const firstChild = oeuvre.synopsis[0].children;
    if (Array.isArray(firstChild) && firstChild.length > 0) {
      synopsisContent = firstChild[0].text || synopsisContent;
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex justify-center items-center">
      <div
        className="relative bg-gray-900 text-white rounded-lg shadow-lg w-full max-w-5xl h-5/6 overflow-hidden"
        style={{
          overflowY: "scroll", // Barre de défilement active
          scrollbarWidth: "none", // Masque la barre sur Firefox
          msOverflowStyle: "none", // Masque la barre sur IE
        }}
      >
        {/* Pour masquer la barre de défilement sur Webkit (Chrome, Safari) */}
        <style>
          {`
            .relative::-webkit-scrollbar {
              display: none;
            }
            @media (max-width: 814px) {
              .responsive-section {
                flex-direction: column;
                align-items: center;
                text-align: center;
              }
              .responsive-section img {
                width: 10rem;
                height: 14rem;
                margin-bottom: 1rem;
              }
              .responsive-buttons {
                flex-direction: column;
                gap: 0.5rem;
              }
              .responsive-grid {
                grid-template-columns: 1fr;
              }
            }
          `}
        </style>

        {/* En-tête */}
        <div
          className="relative"
          style={{
            paddingBottom: "4rem", // Espacement ajusté à 4rem
          }}
        >
          {/* Image de fond avec dégradé */}
          <div
            className="absolute inset-0 h-64"
            style={{
              backgroundImage: `
                linear-gradient(to bottom, rgba(17, 24, 39, 0.6), rgba(17, 24, 39, 1)),
                url('/images/HeroHeader.webp')`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          ></div>
        </div>

        {/* Zone d'informations */}
        <div className="relative flex items-end px-12 responsive-section">
          {/* Image de couverture */}
          {oeuvre.couverture?.[0]?.url && (
            <img
              src={`${apiUrl}${oeuvre.couverture[0].url}`}
              alt={oeuvre.titre || "Image non disponible"}
              className="rounded-md shadow-md"
              style={{
                width: "14rem",
                height: "20rem", // Ajustement de la hauteur de la couverture
                objectFit: "cover",
              }}
            />
          )}

          {/* Informations principales */}
          <div className="flex flex-col justify-end space-y-6 ml-8 h-full">
            <h1 className="text-4xl font-bold">{oeuvre.titre || "Titre non disponible"}</h1>
            <p className="text-gray-300 text-lg">
              <strong>
                {oeuvre.auteur || "Auteur inconnu"} (Auteur), {users.length > 0 ? users[0].username : "Utilisateur inconnu"}
                (Traduction)
              </strong>
            </p>

            {/* Boutons d'action */}
            <div className="flex space-x-4 responsive-buttons">
            <button
  className="px-6 py-3 bg-indigo-600 text-white rounded-md shadow hover:bg-indigo-700 text-lg"
  onClick={() => firstChapter && router.push(`/chapitre/${firstChapter.documentId}`)}
>
  Commencer à lire
</button>
<button
  className="px-6 py-3 bg-green-600 text-white rounded-md shadow hover:bg-green-700 text-lg"
  onClick={() => lastChapter && router.push(`/chapitre/${lastChapter.documentId}`)}
>
  Lire le dernier chapitre
</button>

            </div>
          </div>
        </div>

        {/* Bouton Fermer */}
        <button
          className="absolute top-4 right-4 bg-red-600 hover:bg-red-700 text-white rounded-full w-10 h-10 flex items-center justify-center text-lg"
          onClick={onClose}
        >
          ✖
        </button>

        {/* Contenu Principal */}
        <div className="p-6 space-y-4">
          {/* Tags, Genres, Année, État et Titre alternatif */}
          <div className="flex flex-wrap gap-4">
            <div className="flex gap-2">
              {tags.map((tag, index) => (
                <span key={index} className="bg-blue-600 text-white px-3 py-1 rounded-md text-sm" title={`Tag : ${tag.nom}`}>
                  {tag.nom}
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              {genres.map((genre, index) => (
                <span key={index} className="bg-green-600 text-white px-3 py-1 rounded-md text-sm" title={`genre : ${genre.nom}`}>
                  {genre.nom}
                </span>
              ))}
            </div>
            {oeuvre.annee && (
              <span className="bg-gray-600 text-white px-3 py-1 rounded-md text-sm" title={`Année : ${oeuvre.annee}`}>
                {oeuvre.annee}
              </span>
            )}
            {oeuvre.etat && (
              <span className="bg-purple-600 text-white px-3 py-1 rounded-md text-sm" title={`Etat : ${oeuvre.etat}`}>
                {oeuvre.etat}
              </span>
            )}
            {oeuvre.titrealt && (
              <span className="bg-yellow-600 text-white px-3 py-1 rounded-md text-sm" title={`titre alternative : ${oeuvre.titrealt}`}>
                {oeuvre.titrealt}
              </span>
            )}
          </div>

          {/* Synopsis */}
          <div>
            <h2 className="text-xl font-bold mb-2">Synopsis</h2>
            <div
  className="text-gray-300 space-y-2"
  dangerouslySetInnerHTML={{
    __html: Array.isArray(oeuvre.synopsis) && oeuvre.synopsis.length > 0
      ? oeuvre.synopsis
          .map((item) =>
            item.children?.map((child) => child.text).join("<br>")
          )
          .join("<br><br>")
      : "Aucun synopsis disponible.",
  }}></div>

          </div>

          {/* Barre de recherche */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="Rechercher un chapitre par son titre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 rounded-md bg-gray-800 border border-gray-700 text-white focus:outline-none"
            />
          </div>

          {/* Sélecteur de filtre */}
          <div className="flex justify-end space-x-4 mb-4">
            <button
              className={`px-4 py-2 rounded-md ${filter === "all" ? "bg-blue-600 text-white" : "bg-gray-600 text-gray-300"}`}
              onClick={() => setFilter("all")}
            >
              Tous les chapitres
            </button>
            <button
              className={`px-4 py-2 rounded-md ${filter === "downloadable" ? "bg-blue-600 text-white" : "bg-gray-600 text-gray-300"}`}
              onClick={() => setFilter("downloadable")}
            >
              Téléchargeables
            </button>
            <button
              className={`px-4 py-2 rounded-md ${filter === "not-downloadable" ? "bg-blue-600 text-white" : "bg-gray-600 text-gray-300"}`}
              onClick={() => setFilter("not-downloadable")}
            >
              Non téléchargeables
            </button>
          </div>

{/* Chapitres */}
{filteredChapitres.length > 0 && (
  <div>
    <h2 className="text-xl font-bold mb-4">Chapitres</h2>
    <div className="grid grid-cols-4 gap-4 responsive-grid">
      {/* Tri des chapitres par ordre décroissant */}
      {filteredChapitres
        .slice()
        .sort((a, b) => b.order - a.order)
        .slice(0, 10)
        .map((chapitre, index) => (
          <div
            key={index}
            className="border border-gray-400 rounded-lg p-4 shadow-md hover:shadow-xl hover:scale-105 transition duration-300 cursor-pointer"
            onClick={() => router.push(`/chapitre/${chapitre.documentId}`)} // Navigation dynamique
          >
            <h3 className="font-bold text-lg">{chapitre.titre || "Titre non disponible"}</h3>
            <p className="text-sm italic text-gray-600">
              {chapitre.publishedAt
                ? new Date(chapitre.publishedAt).toLocaleDateString()
                : "Date non disponible"}
            </p>
          </div>
        ))}
    </div>
  </div>
)}

        </div>
      </div>
    </div>
  );
}
