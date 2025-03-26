"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Cookies from "js-cookie";
import AjouterChapitre from "../../componants/AjouterChapitre"; // Composant pour ajouter un chapitre
import TéléchargerChapitre from "../../componants/TéléchargerChapitre"; // Composant pour télécharger un PDF

const ChapitreAdmin = () => {
  const router = useRouter();
  const { documentid } = useParams(); // Récupération de documentid depuis l'URL
  const [chapitres, setChapitres] = useState([]);
  const [filteredChapitres, setFilteredChapitres] = useState([]); // Chapitres filtrés
  const [oeuvre, setOeuvre] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("all"); // Valeur par défaut : tout afficher
  const [showAjouterModal, setShowAjouterModal] = useState(false);
  const [showTéléchargerModal, setShowTéléchargerModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState({}); // Stocke les valeurs d'ordre en cours d'édition
  const apiUrl = process.env.NEXT_PUBLIC_API_URL; 
  useEffect(() => {
    const fetchOeuvreEtChapitres = async () => {
      const jwt = Cookies.get("jwt");
      if (!jwt) {
        router.push("/connexion");
        return;
      }

      try {
        const res = await fetch(
          `${apiUrl}/api/oeuvres/${documentid}?populate=chapitres`,
          {
            headers: {
              Authorization: `Bearer ${jwt}`,
            },
          }
        );

        if (!res.ok) {
          console.error("Erreur HTTP lors de la récupération de l'œuvre :", res.status);
          setLoading(false);
          return;
        }

        const data = await res.json();
        setOeuvre(data.data);

        const sortedChapitres =
          data.data?.chapitres?.map((chapitre) => ({
            ...chapitre,
            documentId: chapitre.documentId || chapitre.id,
          }))?.sort((a, b) => b.order - a.order) || [];

        setChapitres(sortedChapitres);
        setFilteredChapitres(sortedChapitres); // Par défaut, tous les chapitres sont affichés
        setLoading(false);
      } catch (error) {
        console.error("Erreur lors de la récupération des données :", error);
        router.push("/connexion");
      }
    };

    fetchOeuvreEtChapitres();
  }, [documentid, router]);

  const handleOrderChange = (chapterDocumentId, value) => {
    setEditingOrder((prev) => ({
      ...prev,
      [chapterDocumentId]: value,
    }));
  };

  const updateOrder = async (chapterDocumentId) => {
    const newOrder = editingOrder[chapterDocumentId];
    if (!newOrder) {
      console.warn("No new order provided for chapter:", chapterDocumentId);
      return;
    }

    const jwt = Cookies.get("jwt");
    try {
      const res = await fetch(`${apiUrl}/api/chapitres/${chapterDocumentId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({
          data: {
            order: parseInt(newOrder, 10),
          },
        }),
      });

      if (!res.ok) {
        console.error("Erreur HTTP lors de la mise à jour de l'ordre :", res.status);
        alert("Erreur lors de la mise à jour de l'ordre.");
        return;
      }

      const updatedChapitre = await res.json();

      setChapitres((prev) =>
        prev.map((chapitre) =>
          chapitre.documentId === chapterDocumentId
            ? { ...chapitre, order: updatedChapitre.data.order }
            : chapitre
        )
      );
      setFilteredChapitres((prev) =>
        prev.map((chapitre) =>
          chapitre.documentId === chapterDocumentId
            ? { ...chapitre, order: updatedChapitre.data.order }
            : chapitre
        )
      );
      setEditingOrder((prev) => {
        const newState = { ...prev };
        delete newState[chapterDocumentId];
        return newState;
      });
    } catch (error) {
      console.error("Erreur lors de la mise à jour :", error);
    }
  };

  const deleteChapitre = async (chapterDocumentId) => {
    const jwt = Cookies.get("jwt");
    if (!confirm("Voulez-vous vraiment supprimer ce chapitre ?")) return;

    try {
      const res = await fetch(`${apiUrl}/api/chapitres/${chapterDocumentId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${jwt}`,
        },
      });

      if (!res.ok) {
        alert("Erreur lors de la suppression du chapitre.");
        return;
      }

      setChapitres((prev) => prev.filter((chapitre) => chapitre.documentId !== chapterDocumentId));
      setFilteredChapitres((prev) =>
        prev.filter((chapitre) => chapitre.documentId !== chapterDocumentId)
      );
    } catch (error) {
      console.error("Erreur lors de la suppression :", error);
    }
  };

  const handleRedirectToChapter = (chapitre) => {
    if (chapitre.pdf) {
      // Redirige vers une page pour afficher le PDF
      window.open(`${apiUrl}${chapitre.pdf}`, "_blank");
    } else {
      // Redirige vers la page de contenu texte
      router.push(`/mochapitre/${chapitre.documentId}`);
    }
  };

  const handleFilterChange = (type) => {
    setFilterType(type);
    if (type === "pdf") {
      setFilteredChapitres(chapitres.filter((chapitre) => chapitre.pdf));
    } else if (type === "text") {
      setFilteredChapitres(chapitres.filter((chapitre) => chapitre.texte && chapitre.texte.length > 0));
    } else {
      setFilteredChapitres(chapitres);
    }
  };

  if (loading) {
    return <p className="text-white text-center">Chargement...</p>;
  }

  return (
    <div className="p-8 bg-gray-900 text-white min-h-screen flex flex-col items-center">
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="bg-blue-500 hover:bg-blue-400 text-white px-4 py-2 rounded"
        >
          Retour
        </button>
      </div>
      <div className="w-full max-w-6xl bg-gray-800 p-6 rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold text-center mb-4">
          Gestion des Chapitres pour l'œuvre : {oeuvre?.titre || "Titre indisponible"}
        </h1>

        <div className="flex justify-between items-center mt-6">
          <div className="flex space-x-4">
            <button
              onClick={() => setShowAjouterModal(true)}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-400 transition"
            >
              Ajouter un Chapitre
            </button>
            <button
              onClick={() => setShowTéléchargerModal(true)}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-400 transition"
            >
              Télécharger un Chapitre
            </button>
          </div>
          <select
            value={filterType}
            onChange={(e) => handleFilterChange(e.target.value)}
            className="bg-gray-700 text-white px-4 py-2 rounded"
          >
            <option value="all">Tous les Chapitres</option>
            <option value="pdf">Chapitres PDF</option>
            <option value="text">Chapitres Texte</option>
          </select>
        </div>

        <div className="mt-6">
          <h2 className="text-2xl font-bold mb-4">Chapitres</h2>
          {filteredChapitres.length > 0 ? (
            <ul className="space-y-4">
              {filteredChapitres.map((chapitre, index) => (
                <li key={chapitre.documentId || index} className="bg-gray-700 p-4 rounded shadow">
                  <h3 className="text-xl font-bold">{chapitre.titre || "Titre non spécifié"}</h3>
                  <p className="text-gray-400">Tome : {chapitre.tome || "Non spécifié"}</p>
                  <p className="text-gray-400">Ordre : {chapitre.order || "Non spécifié"}</p>

                  <div className="mt-2 flex items-center space-x-2">
                    <input
                      type="number"
                      value={editingOrder[chapitre.documentId] || chapitre.order}
                      onChange={(e) => handleOrderChange(chapitre.documentId, e.target.value)}
                      className="w-20 p-1 rounded bg-gray-800 border border-gray-600 text-white"
                    />
                    <button
                      onClick={() => updateOrder(chapitre.documentId)}
                      className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-400 transition"
                    >
                      Valider
                    </button>
                  </div>

                  <div className="mt-4">
                    <button
                      onClick={() => handleRedirectToChapter(chapitre)}
                      className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-400 transition"
                    >
                      Voir Chapitre
                    </button>
                  </div>

                  <div className="mt-4">
                    <button
                      onClick={() => deleteChapitre(chapitre.documentId)}
                      className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-400 transition"
                    >
                      Supprimer
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-400">Aucun chapitre trouvé pour cette œuvre.</p>
          )}
        </div>
      </div>

      {showAjouterModal && (
        <AjouterChapitre
          oeuvreId={documentid}
          onClose={() => setShowAjouterModal(false)}
          onChapitreAdded={() => setShowAjouterModal(false)}
          oeuvreTitre={oeuvre.titre} // 👈 ici
        />
      )}

      {showTéléchargerModal && (
        <TéléchargerChapitre
          oeuvreId={documentid}
          onClose={() => setShowTéléchargerModal(false)}
          onChapitreUploaded={() => setShowTéléchargerModal(false)}
        />
      )}
    </div>
  );
};

export default ChapitreAdmin;
