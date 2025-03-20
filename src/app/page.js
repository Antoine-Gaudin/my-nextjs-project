"use client";

import { useState, useEffect } from "react";
import FicheOeuvre from "./componants/FicheOeuvre"; // Import du composant FicheOeuvre

export default function Home() {
  const [searchText, setSearchText] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [dailyReleases, setDailyReleases] = useState([]);
  const [selectedOeuvre, setSelectedOeuvre] = useState(null); // Oeuvre sélectionnée pour le composant FicheOeuvre
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  useEffect(() => {
    const fetchDailyReleases = async () => {
      const today = new Date().toISOString().split("T")[0];
      const url = `${apiUrl}/api/chapitres?filters[updatedAt][$gte]=${today}T00:00:00&populate=oeuvres.couverture`;

      try {
        const res = await fetch(url);
        const data = await res.json();

        const uniqueOeuvres = {};
        data.data.forEach((chapitre) => {
          const oeuvre = chapitre.oeuvres[0];
          if (oeuvre && !uniqueOeuvres[oeuvre.id]) {
            uniqueOeuvres[oeuvre.id] = {
              ...oeuvre,
              chapitres: [],
            };
          }
          if (oeuvre) {
            uniqueOeuvres[oeuvre.id].chapitres.push({
              titre: chapitre.titre,
              publishedAt: chapitre.publishedAt,
            });
          }
        });

        setDailyReleases(Object.values(uniqueOeuvres));
      } catch (error) {
        console.error("Erreur lors de la récupération des sorties du jour :", error);
      }
    };

    fetchDailyReleases();
  }, []);

  const handleSearch = async () => {
    try {

      const url = `${apiUrl}/api/oeuvres?filters[titre][$containsi]=${searchText}&populate=*`;
  

      const res = await fetch(url);
      const data = await res.json();

     

      setSearchResults(data.data);
    } catch (error) {
      console.error("Erreur lors de la recherche :", error);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleOeuvreClick = (oeuvre) => {
    setSelectedOeuvre(oeuvre); // Définit l'œuvre sélectionnée pour afficher FicheOeuvre
  };

  const closeFicheOeuvre = () => {
    setSelectedOeuvre(null); // Réinitialise l'œuvre sélectionnée pour fermer FicheOeuvre
  };

  return (
    <div className="relative">
      {/* Hero Header */}
      <div
        className="relative h-screen w-full bg-cover bg-center"
        style={{
          backgroundImage: `url('/images/HeroHeader.webp')`,
          backgroundAttachment: "fixed",
        }}
      >
        <div className="absolute inset-0 bg-black bg-opacity-50"></div>

        <div className="absolute inset-0 flex flex-col justify-center items-center text-center text-white px-4">
          <h1 className="text-5xl md:text-6xl font-bold mb-4">
            Bienvenue sur Trad-Index
          </h1>
          <p className="text-lg md:text-2xl mb-6">
            Explorez et découvrez notre univers.
          </p>
          <input
            type="text"
            placeholder="Rechercher une œuvre"
            className="px-4 py-2 rounded-md text-gray-900 focus:outline-none w-3/4 max-w-lg"
            onClick={() => setIsSearchOpen(true)}
          />
        </div>
      </div>

      {/* Sorties du jour */}
      <div className="bg-gray-900 text-white p-8">
        <h2 className="text-3xl font-bold mb-6">Sortie du jour !</h2>
        {dailyReleases.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {dailyReleases.map((oeuvre) => (
              <div
                key={oeuvre.id}
                className="relative bg-gray-800 rounded-lg shadow-lg overflow-hidden cursor-pointer"
                onClick={() => handleOeuvreClick(oeuvre)}
              >
                {oeuvre.couverture?.[0]?.url && (
                  <div
                    className="h-64 bg-cover bg-center"
                    style={{
                      backgroundImage: `url('${apiUrl}${oeuvre.couverture[0].url}')`,
                    }}
                  ></div>
                )}
                <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black via-gray-900 opacity-90 px-4 py-2">
                  <div className="flex space-x-2 mb-2">
                    <span className="bg-black bg-opacity-70 text-white px-3 py-1 text-sm rounded-md">
                      {oeuvre.type}
                    </span>
                    <span className="bg-black bg-opacity-70 text-white px-3 py-1 text-sm rounded-md">
                      {oeuvre.categorie}
                    </span>
                  </div>
                  <p className="font-bold text-lg text-white">
                    {oeuvre.titre || "Titre non disponible"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400">Aucun chapitre n'est actuellement sorti.</p>
        )}
      </div>

      {/* Fiche Oeuvre (Pop-up) */}
      {selectedOeuvre && (
        <FicheOeuvre oeuvre={selectedOeuvre} onClose={closeFicheOeuvre} />
      )}

      {/* Recherche Plein Écran */}
      {isSearchOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex flex-col items-center justify-center">
          <div className="w-full max-w-2xl p-4">
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Rechercher une œuvre..."
              className="w-full px-4 py-3 rounded-md text-gray-900 focus:outline-none"
              autoFocus
            />
            <button
              onClick={handleSearch}
              className="mt-4 w-full bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md"
            >
              Rechercher
            </button>
          </div>

          <div className="mt-6 w-full max-w-2xl bg-gray-800 rounded-lg p-4">
            {searchResults.length > 0 ? (
              <ul>
                {searchResults.map((oeuvre) => (
                  <li
                    key={oeuvre.id}
                    className="p-4 border-b border-gray-700 hover:bg-gray-700 cursor-pointer flex items-center"
                    onClick={() => {
                      handleOeuvreClick(oeuvre);
                      setIsSearchOpen(false);
                    }}
                  >
                    {oeuvre.couverture?.length > 0 && (
                      <img
                        src={`${oeuvre.couverture.url}`}
                        alt={oeuvre.titre || "Image non disponible"}
                        className="w-16 h-16 object-cover rounded-md mr-4"
                      />
                    )}
                    <div>
                      <h3 className="text-xl font-bold">
                        {oeuvre.titre || "Titre non disponible"}
                      </h3>
                      <p className="text-sm text-gray-400">
                        Auteur : {oeuvre.auteur || "Auteur non spécifié"}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-400 text-center">
                Aucun résultat pour cette recherche.
              </p>
            )}
          </div>

          <button
            onClick={() => setIsSearchOpen(false)}
            className="absolute top-4 right-4 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md"
          >
            Fermer
          </button>
        </div>
      )}
    </div>
  );
}
