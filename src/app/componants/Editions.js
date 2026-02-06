"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import AddOeuvreForm from "../componants/AddOeuvreForm";
import PanelOeuvre from "../componants/PanelOeuvre";
import MoOeuvre from "./MoOeuvre";

export default function Editions({ user }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [oeuvres, setOeuvres] = useState([]);
  const [selectedOeuvre, setSelectedOeuvre] = useState(null);
  const [editOeuvre, setEditOeuvre] = useState(null);

  const fetchOeuvres = async () => {
    const jwt = Cookies.get("jwt");
    if (!jwt) {
      router.push("/connexion");
      return;
    }

    try {
      const res = await fetch(
        `/api/proxy/oeuvres?populate=couverture&filters[users][id][$eq]=${user.id}`,
        { headers: { Authorization: `Bearer ${jwt}` } }
      );

      if (!res.ok) {
        console.error("Erreur recuperation oeuvres :", res.status);
        return;
      }

      const oeuvresData = await res.json();
      setOeuvres(oeuvresData.data || []);
      setLoading(false);
    } catch (error) {
      console.error("Erreur fetch :", error);
      router.push("/connexion");
    }
  };

  useEffect(() => {
    if (!user?.redacteur) {
      router.push("/profil");
      return;
    }
    fetchOeuvres();
  }, [user, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400">Chargement des oeuvres...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-gray-950 text-white min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 tracking-tight">
            Page Edition
          </h1>
          <p className="text-gray-400">
            Bienvenue, {user.username}. Cette section est reservee aux
            redacteurs pour gerer leurs oeuvres.
          </p>
        </div>

        <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
          <h2 className="text-2xl font-semibold">Mes oeuvres</h2>
          <button
            onClick={() => setShowForm(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-2 rounded-lg shadow transition"
          >
            + Ajouter une oeuvre
          </button>
        </div>

        {selectedOeuvre ? (
          <PanelOeuvre
            oeuvre={selectedOeuvre}
            onBack={() => setSelectedOeuvre(null)}
          />
        ) : (
          <>
            {oeuvres.length === 0 ? (
              <div className="text-center mt-16 py-12 bg-gray-900 rounded-2xl border border-gray-800">
                <div className="text-5xl mb-4 opacity-30">0</div>
                <p className="text-lg text-gray-400">Aucune oeuvre ajoutee pour le moment.</p>
                <p className="text-sm text-gray-500 mt-1">Cliquez sur "Ajouter une oeuvre" pour commencer.</p>
              </div>
            ) : (
              <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {oeuvres.map((oeuvre) => {
                  const { id, titre, couverture, documentId, etat, type } = oeuvre;
                  const couvertureUrl =
                    couverture?.length > 0 ? couverture[0]?.url : null;

                  const handleDelete = async (e) => {
                    e.stopPropagation();
                    const confirmDelete = window.confirm(
                      `Supprimer "${titre}" ?`
                    );
                    if (!confirmDelete) return;

                    const jwt = Cookies.get("jwt");
                    try {
                      const res = await fetch(
                        `/api/proxy/oeuvres/${documentId}`,
                        {
                          method: "DELETE",
                          headers: { Authorization: `Bearer ${jwt}` },
                        }
                      );

                      if (res.ok) {
                        setOeuvres((prev) =>
                          prev.filter((o) => o.documentId !== documentId)
                        );
                      } else {
                        console.error("Erreur suppression :", res.status);
                      }
                    } catch (error) {
                      console.error("Erreur reseau :", error);
                    }
                  };

                  return (
                    <div
                      key={id}
                      onClick={() => setSelectedOeuvre(oeuvre)}
                      className="relative cursor-pointer bg-gray-800 hover:bg-gray-700 transition-all duration-200 rounded-2xl shadow-lg overflow-hidden group"
                    >
                      <button
                        onClick={handleDelete}
                        className="absolute top-2 right-2 bg-red-600 hover:bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm z-10 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Supprimer"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>

                      {couvertureUrl ? (
                        <img
                          src={couvertureUrl}
                          alt={titre}
                          className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-48 bg-gray-700 flex items-center justify-center">
                          <span className="text-gray-500">
                            Pas de couverture
                          </span>
                        </div>
                      )}

                      <div className="p-4">
                        <h3 className="text-lg font-semibold truncate mb-2">
                          {titre || "Titre indisponible"}
                        </h3>
                        <div className="flex flex-wrap gap-2 mb-3">
                          {etat && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-600/30 text-indigo-300 border border-indigo-700">
                              {etat}
                            </span>
                          )}
                          {type && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-600/30 text-gray-300 border border-gray-600">
                              {type}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditOeuvre(oeuvre);
                          }}
                          className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm px-4 py-1.5 rounded-lg transition w-full"
                        >
                          Modifier
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {showForm && (
        <AddOeuvreForm
          onClose={() => setShowForm(false)}
          onOeuvreAdded={fetchOeuvres}
        />
      )}

      {editOeuvre && (
        <MoOeuvre
          oeuvre={editOeuvre}
          onClose={() => setEditOeuvre(null)}
          onUpdate={() => {
            setEditOeuvre(null);
            fetchOeuvres();
          }}
        />
      )}
    </div>
  );
}
