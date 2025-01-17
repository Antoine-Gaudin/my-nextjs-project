"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";

export default function ProfilPage() {
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false); // État pour afficher la fenêtre pop-up
  const router = useRouter();

  useEffect(() => {
    const fetchUserData = async () => {
      const jwt = Cookies.get("jwt");
      if (!jwt) {
        console.log("Pas de JWT trouvé, redirection vers /connexion");
        router.push("/connexion");
        return;
      }

      try {
        const res = await fetch("http://127.0.0.1:1337/api/users/me", {
          headers: {
            Authorization: `Bearer ${jwt}`,
          },
          cache: "no-store",
        });

        if (!res.ok) {
          console.log("Erreur HTTP :", res.status);
          router.push("/connexion");
          return;
        }

        const userData = await res.json();
        setUser(userData);
      } catch (error) {
        console.error("Erreur avec fetch :", error);
        router.push("/connexion");
      }
    };

    fetchUserData();
  }, [router]);

  const handleUpdateRedacteur = async () => {
    const jwt = Cookies.get("jwt");
    if (!jwt) {
      console.log("Pas de JWT trouvé, redirection vers /connexion");
      router.push("/connexion");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`http://127.0.0.1:1337/api/users/${user.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({
          redacteur: true, // Met à jour le champ rédacteur à true
        }),
      });

      if (!res.ok) {
        throw new Error("Erreur lors de la mise à jour de l'utilisateur");
      }

      const updatedUser = await res.json();
      setUser(updatedUser);
      console.log("Utilisateur mis à jour :", updatedUser);
      setShowConsentModal(false); // Ferme la fenêtre pop-up après confirmation
    } catch (error) {
      console.error("Erreur avec fetch :", error);
      setError("Erreur lors de la mise à jour. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return <div>Chargement...</div>;
  }

  return (
    <div className="p-8 bg-gray-900 text-white min-h-screen">
      <h1 className="text-2xl font-bold mb-4">Profil Utilisateur</h1>
      <div className="mb-4">
        <p>
          <strong>Nom d'utilisateur :</strong> {user.username}
        </p>
        <p>
          <strong>Email :</strong> {user.email}
        </p>
        <p>
          <strong>Rédacteur :</strong> {user.redacteur ? "Oui" : "Non"}
        </p>
      </div>
      {error && <p className="text-red-500">{error}</p>}
      <button
        onClick={() => setShowConsentModal(true)} // Ouvre la fenêtre pop-up
        disabled={loading || user.redacteur}
        className={`mt-4 py-2 px-4 ${
          user.redacteur
            ? "bg-gray-400"
            : "bg-indigo-600 hover:bg-indigo-700"
        } text-white rounded-md`}
      >
        {loading
          ? "Mise à jour..."
          : user.redacteur
          ? "Déjà Rédacteur"
          : "Devenir Rédacteur"}
      </button>
      {/* Lien vers la page Édition */}
      {user.redacteur && (
        <div className="mt-4">
          <a
            href="/edition"
            className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md inline-block"
          >
            Accéder à la page Édition
          </a>
        </div>
      )}

{/* Fenêtre pop-up pour confirmation */}
{showConsentModal && (
  <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
    <div className="bg-gray-800 text-white p-6 rounded-lg shadow-lg w-full max-w-md">
      <h2 className="text-xl font-bold mb-4">Confirmation</h2>
      <p className="mb-4">
        Veuillez lire et accepter les règles suivantes avant de devenir rédacteur :
      </p>
      <ul className="mb-4 space-y-2 list-decimal list-inside">
        <li>
          Tout Novel/Scan/Webtoon licencié en France est strictement interdit sur la plateforme.
        </li>
        <li>
          Tout contenu de +18 sera contrôlé et ne sera pas mis en avant par le site.
        </li>
        <li>
          Toute diffusion de liens vers des réseaux/sites potentiellement frauduleux entraînera des sanctions.
        </li>
        <li>
          Trad-index, en tant qu'espace communautaire, n'interviendra pas dans la qualité de vos œuvres.
        </li>
        <li>
          En acceptant le rôle de Traducteur, vous acceptez que vos actualités soient maintenues par Novel-index.com.
        </li>
      </ul>
      <div className="flex justify-end space-x-4">
        <button
          onClick={() => setShowConsentModal(false)}
          className="bg-red-500 px-4 py-2 rounded hover:bg-red-400"
        >
          Annuler
        </button>
        <button
          onClick={handleUpdateRedacteur}
          className="bg-green-500 px-4 py-2 rounded hover:bg-green-400"
        >
          Confirmer
        </button>
      </div>
    </div>
  </div>
)}

    </div>
  );
}
