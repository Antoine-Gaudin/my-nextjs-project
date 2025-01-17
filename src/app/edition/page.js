"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import AddOeuvreForm from "../componants/AddOeuvreForm"; // Importation du composant externe

export default function EditionPage() {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [oeuvres, setOeuvres] = useState([]); // Stocker les œuvres de l'utilisateur

  useEffect(() => {
    const fetchUserData = async () => {
      const jwt = Cookies.get("jwt");
      if (!jwt) {
        console.log("Pas de JWT trouvé, redirection vers /connexion");
        router.push("/connexion");
        return;
      }

      try {
        // Récupérer les données utilisateur
        const userRes = await fetch("http://127.0.0.1:1337/api/users/me", {
          headers: {
            Authorization: `Bearer ${jwt}`,
          },
        });

        if (!userRes.ok) {
          console.log("Erreur lors de la récupération de l'utilisateur :", userRes.status);
          router.push("/connexion");
          return;
        }

        const userData = await userRes.json();
        console.log("Données utilisateur :", userData);

        if (!userData.redacteur) {
          console.log("Utilisateur non autorisé (pas rédacteur) :", userData);
          router.push("/profil");
          return;
        }

        // Récupérer les œuvres de l'utilisateur
        const res = await fetch(
          `http://127.0.0.1:1337/api/oeuvres?populate=couverture&filters[users][id][$eq]=${userData.id}`,
          {
            headers: {
              Authorization: `Bearer ${jwt}`,
            },
          }
        );

        if (!res.ok) {
          console.error("Erreur lors de la récupération des œuvres :", res.status);
          return;
        }

        const oeuvresData = await res.json();
        console.log("Œuvres récupérées :", oeuvresData.data);
        setOeuvres(oeuvresData.data || []);
        setLoading(false);
      } catch (error) {
        console.error("Erreur avec fetch :", error);
        router.push("/connexion");
      }
    };

    fetchUserData();
  }, [router]);

  if (loading) {
    return <p>Chargement...</p>;
  }

  return (
    <div className="p-8 bg-gray-900 text-white min-h-screen">
      <h1 className="text-2xl font-bold mb-4">Page Édition</h1>
      <p>Bienvenue dans la page d'édition réservée aux rédacteurs.</p>

      <button
        onClick={() => setShowForm(!showForm)}
        className="bg-blue-500 text-white px-4 py-2 rounded mt-4"
      >
        Ajouter une œuvre
      </button>

      {showForm && <AddOeuvreForm onClose={() => setShowForm(false)} />}

      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Mes œuvres</h2>
        {oeuvres.length === 0 ? (
          <p>Aucune œuvre ajoutée pour le moment.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {oeuvres.map((oeuvre) => {
              const { id, titre, couverture, documentId } = oeuvre; // Inclure documentId pour la redirection

              // Extraire la première URL de couverture si elle existe
              const couvertureUrl =
                couverture?.length > 0 ? couverture[0]?.url : null;

              // Gestion du clic pour rediriger vers adminfiche avec documentId
              const handleClick = () => {
                router.push(`/adminfiche/${documentId}`);
              };

              return (
                <div
                  key={id}
                  className="bg-gray-800 p-4 rounded shadow text-center cursor-pointer hover:bg-gray-700 transition duration-200"
                  onClick={handleClick} // Redirige lors du clic
                >
                  <h3 className="text-lg font-bold mb-2">{titre || "Titre indisponible"}</h3>
                  {couvertureUrl ? (
                    <img
                      src={`http://127.0.0.1:1337${couvertureUrl}`}
                      alt={titre}
                      className="w-full h-48 object-cover rounded"
                    />
                  ) : (
                    <div className="w-full h-48 bg-gray-700 flex items-center justify-center rounded">
                      <span className="text-gray-500">Pas de couverture</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
