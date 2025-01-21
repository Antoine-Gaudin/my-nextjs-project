"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Cookies from "js-cookie";
import MoOeuvre from "../../componants/MoOeuvre"; // Importation du composant MoOeuvre
import GenreModal from "../../componants/GenreModal"; // Importation du composant GenreModal
import TagModal from "../../componants/TagModal"; // Importation du composant TagModal

const AdminFichePage = () => {
  const router = useRouter();
  const { id } = useParams(); // Récupération de documentId (passé via l'URL)
  const [oeuvre, setOeuvre] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showEditForm, setShowEditForm] = useState(false); // État pour afficher le formulaire d'édition
  const [showGenreModal, setShowGenreModal] = useState(false); // État pour afficher le modal des genres
  const [showTagModal, setShowTagModal] = useState(false); // État pour afficher le modal des tags
  const [message, setMessage] = useState("");
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    const fetchOeuvreDetails = async () => {
      const jwt = Cookies.get("jwt");
      if (!jwt) {
        console.log("JWT manquant. Redirection...");
        router.push("/connexion");
        return;
      }

      try {
        console.log("Tentative de récupération de l'œuvre avec le documentId :", id);

        // Requête : Récupérer l'œuvre en utilisant documentId
        const oeuvreRes = await fetch(
          `${apiUrl}/api/oeuvres/${id}?populate=couverture`,
          {
            headers: {
              Authorization: `Bearer ${jwt}`,
            },
          }
        );

        if (!oeuvreRes.ok) {
          console.error("Erreur lors de la récupération de l'œuvre :", oeuvreRes.status);
          return;
        }

        const oeuvreData = await oeuvreRes.json();
        console.log("Données de l'œuvre récupérées :", oeuvreData);
        setOeuvre(oeuvreData.data);
        setLoading(false);
      } catch (error) {
        console.error("Erreur lors de la récupération des données :", error);
        router.push("/connexion");
      }
    };

    fetchOeuvreDetails();
  }, [id, router]);

  const handleDelete = async () => {
    const jwt = Cookies.get("jwt");
    if (!jwt) {
      console.log("JWT manquant. Redirection...");
      router.push("/connexion");
      return;
    }

    try {
      const res = await fetch(`${apiUrl}/api/oeuvres/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${jwt}`,
        },
      });

      if (res.ok) {
        setMessage("Œuvre supprimée avec succès !");
        setTimeout(() => router.push("/edition"), 2000); // Redirige après 2 secondes
      } else {
        console.error("Erreur lors de la suppression :", res.status);
        setMessage("Erreur lors de la suppression de l'œuvre.");
      }
    } catch (error) {
      console.error("Erreur avec la requête DELETE :", error);
      setMessage("Erreur lors de la suppression de l'œuvre.");
    }
  };

  const handleEdit = () => {
    setShowEditForm(true); // Afficher le formulaire d'édition
  };

  const handleUpdate = () => {
    setShowEditForm(false); // Fermer le formulaire d'édition
    // Actualiser les données après modification
    setLoading(true);
    const fetchUpdatedOeuvre = async () => {
      const jwt = Cookies.get("jwt");
      try {
        const res = await fetch(`${apiUrl}/api/oeuvres/${id}?populate=couverture`, {
          headers: {
            Authorization: `Bearer ${jwt}`,
          },
        });
        if (res.ok) {
          const updatedData = await res.json();
          setOeuvre(updatedData.data);
          setLoading(false);
        }
      } catch (error) {
        console.error("Erreur lors de l'actualisation de l'œuvre :", error);
        setLoading(false);
      }
    };
    fetchUpdatedOeuvre();
  };

  const handleAddGenre = () => setShowGenreModal(true); // Ouvre le modal pour ajouter un genre

  const handleAddTag = () => setShowTagModal(true); // Ouvre le modal pour ajouter un tag

  const handleRedirectToChapters = () => {
    // Redirige vers la page ChapitreAdmin en passant le documentId dans l'URL
    router.push(`/chapitreadmin/${id}`);
  };

  if (loading) {
    return <p className="text-white text-center">Chargement...</p>;
  }

  if (!oeuvre) {
    return <p className="text-white text-center">Aucune œuvre trouvée.</p>;
  }

  // Déstructuration des données de l'œuvre
  const { titre, auteur, annee, couverture } = oeuvre;

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
      <div className="w-full max-w-4xl bg-gray-800 p-6 rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold text-center mb-4">{titre || "Titre non disponible"}</h1>

        {couverture?.length > 0 ? (
          <img
            src={`${apiUrl}${couverture[0]?.url}`}
            alt={titre}
            className="w-full h-64 object-cover rounded-lg mb-6"
          />
        ) : (
          <div className="w-full h-64 bg-gray-700 flex items-center justify-center rounded-lg mb-6">
            <span className="text-gray-500">Pas de couverture</span>
          </div>
        )}

        <div className="text-center space-y-2">
          <p className="text-lg">
            <span className="font-semibold">Auteur :</span> {auteur || "Non spécifié"}
          </p>
          <p className="text-lg">
            <span className="font-semibold">Année :</span> {annee || "Non spécifiée"}
          </p>
        </div>

        <div className="flex justify-center mt-6 space-x-4">
         {/* <button
            onClick={handleEdit}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-400 transition"
          >
            Modifier
          </button>*/}
          <button
            onClick={handleDelete}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-400 transition"
          >
            Supprimer
          </button>
          <button
            onClick={handleAddGenre}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-400 transition"
          >
            Ajouter un Genre
          </button>
          <button
            onClick={handleAddTag}
            className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-400 transition"
          >
            Ajouter un Tag
          </button>
          <button
            onClick={handleRedirectToChapters}
            className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-400 transition"
          >
            Gérer les Chapitres
          </button>
        </div>

        {message && <p className="mt-4 text-center text-green-400">{message}</p>}
      </div>

      {/* Formulaire d'édition en pop-up */}
      {showEditForm && (
        <MoOeuvre
          oeuvre={oeuvre}
          onClose={() => setShowEditForm(false)}
          onUpdate={handleUpdate}
        />
      )}

      {/* Modal pour gérer les genres */}
      {showGenreModal && (
        <GenreModal
          oeuvreId={id}
          onClose={() => setShowGenreModal(false)}
          onSelect={(genre) => console.log("Genre sélectionné :", genre)}
        />
      )}

      {/* Modal pour gérer les tags */}
      {showTagModal && (
        <TagModal
          oeuvreId={id}
          onClose={() => setShowTagModal(false)}
          onSelect={(tag) => console.log("Tag sélectionné :", tag)}
        />
      )}
    </div>
  );
};

export default AdminFichePage;
