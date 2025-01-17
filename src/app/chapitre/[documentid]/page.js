"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import axios from "axios";

export default function ChapitrePage() {
  const { documentid } = useParams(); // Récupération de documentid depuis l'URL
  const [chapitre, setChapitre] = useState(null);
  const [oeuvre, setOeuvre] = useState(null);
  const [chapitres, setChapitres] = useState([]); // Liste des chapitres associés
  const [isDropdownOpen, setIsDropdownOpen] = useState(false); // Contrôle de l'état de la liste déroulante
  const [selectedChapitre, setSelectedChapitre] = useState(""); // Chapitre sélectionné
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  useEffect(() => {
    async function fetchChapitreAndOeuvre() {
      try {
        console.log(`Récupération des données du chapitre avec ID : ${documentid}`);

        // 1. Récupération des données du chapitre
        const chapitreResponse = await axios.get(
          `${apiUrl}/api/chapitres/${documentid}?populate=oeuvres`
        );
        const chapitreData = chapitreResponse.data;
        console.log("Données du chapitre récupérées :", chapitreData);
        setChapitre(chapitreData);

        // 2. Récupération de l'œuvre associée
        const oeuvreId = chapitreData.data.oeuvres[0]?.documentId;
        console.log(`ID de l'œuvre associée : ${oeuvreId}`);
        if (oeuvreId) {
          const oeuvreResponse = await axios.get(
            `${apiUrl}/api/oeuvres/${oeuvreId}?populate=chapitres`
          );
          const oeuvreData = oeuvreResponse.data;
          console.log("Données de l'œuvre associée récupérées :", oeuvreData);
          setOeuvre(oeuvreData);

          // 3. Extraction des chapitres liés et tri par ordre croissant
          const associatedChapitres = oeuvreData.data.chapitres
            .map((chap) => ({
              documentId: chap.documentId,
              titre: chap.titre,
              order: chap.order,
            }))
            .sort((a, b) => a.order - b.order); // Tri par ordre croissant
          console.log("Liste des chapitres associés triée :", associatedChapitres);
          setChapitres(associatedChapitres);

          // Définit le chapitre sélectionné par défaut
          const currentChapitre = associatedChapitres.find((chap) => chap.documentId === documentid);
          if (currentChapitre) {
            setSelectedChapitre(currentChapitre.titre);
          }
        }
      } catch (error) {
        console.error("Erreur lors de la récupération des données :", error);
      }
    }

    if (documentid) {
      fetchChapitreAndOeuvre();
    }
  }, [documentid]);

  // Gestion des boutons "Chapitre précédent" et "Chapitre suivant"
  const navigateToChapitre = (direction) => {
    const currentIndex = chapitres.findIndex((chap) => chap.documentId === documentid);
    if (direction === "next" && currentIndex < chapitres.length - 1) {
      const nextChapitre = chapitres[currentIndex + 1];
      window.location.href = `/chapitre/${nextChapitre.documentId}`;
    } else if (direction === "prev" && currentIndex > 0) {
      const prevChapitre = chapitres[currentIndex - 1];
      window.location.href = `/chapitre/${prevChapitre.documentId}`;
    }
  };

  // Gestion du clavier
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "ArrowRight") {
        navigateToChapitre("next");
      } else if (event.key === "ArrowLeft") {
        navigateToChapitre("prev");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [chapitres, documentid]);

  return (
    <div className="p-6 space-y-6 bg-gray-900 text-white min-h-screen">
      {/* Liste des chapitres liés sous forme de menu déroulant */}
      {chapitres.length > 0 && (
        <div className="relative w-64">
          <label htmlFor="chapitre-select" className="block text-gray-400 font-bold mb-2">
            Liste des chapitres
          </label>
          <div
            className="relative border border-gray-700 rounded-md bg-gray-800 text-white px-4 py-2 cursor-pointer flex justify-between items-center"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            <span>{selectedChapitre || "Sélectionner un chapitre"}</span>
            <span>{isDropdownOpen ? "▲" : "▼"}</span>
          </div>
          {isDropdownOpen && (
            <div className="absolute z-10 w-full bg-gray-800 border border-gray-700 rounded-md shadow-lg max-h-60 overflow-y-auto mt-2">
              {/* Liste déroulante */}
              {chapitres.map((chap, index) => (
                <div
                  key={index}
                  className="px-4 py-2 hover:bg-gray-700 cursor-pointer text-white"
                  onClick={() => {
                    window.location.href = `/chapitre/${chap.documentId}`;
                    setIsDropdownOpen(false);
                  }}
                >
                  {chap.titre}
                </div>
              ))}
              {chapitres.length === 0 && (
                <div className="px-4 py-2 text-gray-500">Aucun chapitre trouvé</div>
              )}
            </div>
          )}
        </div>
      )}
      {/* Boutons "Chapitre précédent" et "Chapitre suivant" */}
      <div className="flex space-x-4">
        <button
          className="px-6 py-3 bg-blue-500 text-white font-bold rounded-md hover:bg-blue-600 transition duration-300"
          onClick={() => navigateToChapitre("prev")}
        >
          Chapitre précédent
        </button>
        <button
          className="px-6 py-3 bg-blue-500 text-white font-bold rounded-md hover:bg-blue-600 transition duration-300"
          onClick={() => navigateToChapitre("next")}
        >
          Chapitre suivant
        </button>
      </div>
      {/* Affichage des informations du chapitre */}
      {chapitre ? (
        <div className="border border-gray-700 rounded-lg p-4 shadow-md bg-gray-800">
          <h1 className="text-2xl font-bold">{chapitre.data.titre || "Titre du chapitre"}</h1>
          <p className="text-gray-400">
            Publié le :{" "}
            {chapitre.data.publishedAt
              ? new Date(chapitre.data.publishedAt).toLocaleDateString()
              : "Date non disponible"}
          </p>
          {/* Affichage des textes du chapitre */}
          <div className="mt-4 space-y-2">
            {chapitre.data.texte?.map((item, index) => (
              <div
                key={index}
                className="text-gray-300"
                dangerouslySetInnerHTML={{ __html: item.children?.[0]?.text || "Texte non disponible" }}
              />
            ))}
          </div>
        </div>
      ) : (
        <p>Chargement des informations du chapitre...</p>
      )}
    </div>
  );
}
