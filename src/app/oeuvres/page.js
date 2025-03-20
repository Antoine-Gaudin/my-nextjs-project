"use client";

import { useState, useEffect } from "react";
import FicheOeuvre from "../componants/FicheOeuvre"; // Import du composant FicheOeuvre

export default function Oeuvres() {
  const [oeuvres, setOeuvres] = useState([]);
  const [selectedOeuvre, setSelectedOeuvre] = useState(null); // Oeuvre sélectionnée pour afficher FicheOeuvre
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  useEffect(() => {
    const fetchOeuvres = async () => {
      const url = `${apiUrl}/api/oeuvres?populate=couverture`;
     

      try {
        const res = await fetch(url);
        const data = await res.json();
    

        setOeuvres(data.data); // Met à jour les œuvres récupérées
      } catch (error) {
        console.error("Erreur lors de la récupération des œuvres :", error);
      }
    };

    fetchOeuvres();
  }, []);

  const handleOeuvreClick = (oeuvre) => {
    setSelectedOeuvre(oeuvre); // Définit l'œuvre sélectionnée pour afficher FicheOeuvre
  };

  const closeFicheOeuvre = () => {
    setSelectedOeuvre(null); // Réinitialise l'œuvre sélectionnée pour fermer FicheOeuvre
  };

  console.log(oeuvres)
  return (
    <div className="bg-gray-900 text-white p-8 min-h-screen">
      <h2 className="text-3xl font-bold mb-6">Liste des œuvres</h2>
      {oeuvres.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {oeuvres.map((oeuvre) => (
            <div
              key={oeuvre.id}
              className="relative bg-gray-800 rounded-lg shadow-lg overflow-hidden cursor-pointer"
              onClick={() => handleOeuvreClick(oeuvre)} // Mettre à jour l'œuvre sélectionnée
            >
              {/* Image de couverture */}
                <div
                  className="h-64 bg-cover bg-center"
                  style={{
                    backgroundImage: `url('${oeuvre.couverture[0].url}')`,
                  }}
                ></div>

              {/* Type, Catégorie, et Titre */}
              <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black via-gray-900 opacity-90 px-4 py-2">
                <div className="flex space-x-2 mb-2">
                  <span className="bg-black bg-opacity-70 text-white px-3 py-1 text-sm rounded-md">
                    {oeuvre.type || "Type non spécifié"}
                  </span>
                  <span className="bg-black bg-opacity-70 text-white px-3 py-1 text-sm rounded-md">
                    {oeuvre.categorie || "Catégorie non spécifiée"}
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
        <p className="text-gray-400">Aucune œuvre disponible pour le moment.</p>
      )}

      {/* Fiche Oeuvre (Pop-up) */}
      {selectedOeuvre && (
        <FicheOeuvre oeuvre={selectedOeuvre} onClose={closeFicheOeuvre} />
      )}
    </div>
  );
}
