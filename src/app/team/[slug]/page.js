"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import Cookies from "js-cookie";
import DOMPurify from "dompurify";
import TeamTheme from "./components/TeamTheme";
import TeamBanner from "./components/TeamBanner";
import TeamCustomSections from "./components/TeamCustomSections";
import TeamCustomizationPanel from "./components/TeamCustomizationPanel";
import TeamPageAnnonces from "./components/TeamPageAnnonces";
import TeamSubscribeButton from "./components/TeamSubscribeButton";

export default function TeamDetailPage() {
  const params = useParams();
  const { slug } = params;

  const [team, setTeam] = useState(null);
  const [members, setMembers] = useState([]);
  const [oeuvres, setOeuvres] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("about");
  const [error, setError] = useState(null);
  const [showCustomizationPanel, setShowCustomizationPanel] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const fetchTeam = async () => {
      try {
        // Récupérer la team par slug avec tous les champs de personnalisation
        const res = await fetch(
          `/api/proxy/teams?filters[slug][$eq]=${slug}&filters[isPublic][$eq]=true&populate=logo&populate=banniere&populate=owner&populate=membres&populate=oeuvres.couverture&populate=oeuvres.genres`
        );
        const data = await res.json();

        if (!data.data || data.data.length === 0) {
          setError("Team non trouvée");
          setIsLoading(false);
          return;
        }

        const teamData = data.data[0];
        setTeam(teamData);
        setMembers(teamData.membres || []);
        setOeuvres(teamData.oeuvres || []);
      } catch (err) {
        console.error("Erreur fetch team:", err);
        setError("Erreur lors du chargement");
      } finally {
        setIsLoading(false);
      }
    };

    if (slug) {
      fetchTeam();
    }
  }, [slug]);

  // Récupérer l'utilisateur connecté
  useEffect(() => {
    const fetchCurrentUser = async () => {
      const jwt = Cookies.get("jwt");
      if (!jwt) return;
      try {
        const res = await fetch("/api/proxy/users/me", {
          headers: { Authorization: `Bearer ${jwt}` },
          cache: "no-store",
        });
        if (res.ok) {
          const data = await res.json();
          setCurrentUser(data);
        }
      } catch (err) {
        console.error("Erreur fetch user:", err);
      }
    };
    fetchCurrentUser();
  }, []);

  // Fonction pour mettre à jour la team
  const handleUpdateTeam = async (updates) => {
    const jwt = Cookies.get("jwt");
    if (!jwt) throw new Error("Non authentifié");
    try {
      const res = await fetch(`/api/proxy/teams/${team.documentId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({ data: updates }),
      });

      if (!res.ok) throw new Error("Erreur lors de la mise à jour");

      setTeam({ ...team, ...updates });
      setShowCustomizationPanel(false);
    } catch (error) {
      console.error("Erreur lors de la mise à jour:", error);
      throw error;
    }
  };

  // Vérifier si l'utilisateur est le propriétaire de la team
  const isOwner = currentUser?.id && team?.owner?.id && currentUser.id === team.owner.id;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400">Chargement de la team...</p>
        </div>
      </div>
    );
  }

  if (error || !team) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gray-800 flex items-center justify-center">
            <svg className="w-10 h-10 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">{error || "Team non trouvée"}</h2>
          <p className="text-gray-400 mb-6">Cette team n'existe pas ou n'est pas publique</p>
          <Link
            href="/"
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold transition-colors"
          >
            Retour à l&apos;accueil
          </Link>
        </div>
      </div>
    );
  }

  return (
    <TeamTheme team={team}>
      <div className="min-h-screen bg-gray-900 text-white">
        {/* Retour */}
        <div className="absolute top-4 left-4 z-20">
          <Link
            href="/teams"
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900/80 hover:bg-gray-900 backdrop-blur-sm text-white rounded-lg transition-all shadow-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
            Retour aux teams
          </Link>
        </div>

        {/* Bouton de personnalisation (visible uniquement pour le propriétaire) */}
        {isOwner && (
          <div className="absolute top-4 right-4 z-20">
            <button
              onClick={() => setShowCustomizationPanel(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-all shadow-lg font-medium"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                />
              </svg>
              Personnaliser
            </button>
          </div>
        )}

        {/* Bouton d'abonnement */}

        {/* Bannière personnalisée */}
        <TeamBanner team={team} />

        {/* Content */}
        <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Subscribe bar */}
        <div className="flex justify-end mb-4">
          <TeamSubscribeButton team={team} currentUser={currentUser} />
        </div>
        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-gray-800 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setActiveTab("about")}
            className={`px-4 py-3 font-medium transition-all relative ${
              activeTab === "about" 
                ? "text-[var(--team-primary)] border-b-2 border-[var(--team-primary)]" 
                : "text-gray-400 hover:text-gray-300"
            }`}
          >
            À propos
          </button>
          <button
            onClick={() => setActiveTab("annonces")}
            className={`px-4 py-3 font-medium transition-all relative ${
              activeTab === "annonces" 
                ? "text-[var(--team-primary)] border-b-2 border-[var(--team-primary)]" 
                : "text-gray-400 hover:text-gray-300"
            }`}
          >
            Annonces
          </button>
          <button
            onClick={() => setActiveTab("oeuvres")}
            className={`px-4 py-3 font-medium transition-all relative ${
              activeTab === "oeuvres" 
                ? "text-[var(--team-primary)] border-b-2 border-[var(--team-primary)]" 
                : "text-gray-400 hover:text-gray-300"
            }`}
          >
            Œuvres ({oeuvres.length})
          </button>
          <button
            onClick={() => setActiveTab("members")}
            className={`px-4 py-3 font-medium transition-all relative ${
              activeTab === "members" 
                ? "text-[var(--team-primary)] border-b-2 border-[var(--team-primary)]" 
                : "text-gray-400 hover:text-gray-300"
            }`}
          >
            Membres ({members.length + 1})
          </button>
        </div>

        {/* Tab Content */}
        <div className="team-content">
        {activeTab === "annonces" ? (
          <TeamPageAnnonces team={team} isOwner={isOwner} currentUser={currentUser} oeuvres={oeuvres} />
        ) : activeTab === "about" ? (
          <div>
            {/* Description */}
            {team.description && (
              <div className="bg-gray-800/30 rounded-xl p-6 mb-6">
                <h2 className="text-2xl font-bold mb-4 text-[var(--team-primary)]">
                  Présentation
                </h2>
                <p className="text-gray-300 leading-relaxed">{team.description}</p>
              </div>
            )}

            {/* Message d'accueil */}
            {team.messageAccueil && (
              <div className="bg-gray-800/30 rounded-xl p-6 mb-6">
                <h2 className="text-2xl font-bold mb-4 text-[var(--team-primary)]">
                  Message de la team
                </h2>
                <div 
                  className="prose prose-invert max-w-none team-content"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(team.messageAccueil) }}
                />
              </div>
            )}

            {/* Stats rapides */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-800/30 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-[var(--team-primary)]">{oeuvres.length}</p>
                <p className="text-gray-400 text-sm mt-1">Œuvres</p>
              </div>
              <div className="bg-gray-800/30 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-[var(--team-primary)]">{members.length + 1}</p>
                <p className="text-gray-400 text-sm mt-1">Membres</p>
              </div>
              <div className="bg-gray-800/30 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-[var(--team-primary)]">
                  {new Date(team.createdAt).getFullYear()}
                </p>
                <p className="text-gray-400 text-sm mt-1">Créée en</p>
              </div>
            </div>

            {/* Sections personnalisées */}
            <TeamCustomSections team={team} />
          </div>
        ) : activeTab === "oeuvres" ? (
          <div>
            {oeuvres.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <p>Cette team n'a pas encore d'œuvres publiées</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {oeuvres.map((oeuvre) => (
                  <Link
                    key={oeuvre.documentId}
                    href={`/oeuvre/${oeuvre.documentId}`}
                    className="group bg-gray-800/30 hover:bg-gray-800/50 rounded-xl overflow-hidden transition-all"
                  >
                    <div className="aspect-[3/4] relative overflow-hidden">
                      {oeuvre.couverture?.[0]?.url ? (
                        <Image
                          src={oeuvre.couverture[0].url}
                          alt={oeuvre.titre}
                          fill
                          sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center">
                          <svg className="w-12 h-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                          </svg>
                        </div>
                      )}
                      {/* Overlay gradient */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="p-3">
                      <h3 className="font-semibold text-white text-sm line-clamp-2 group-hover:text-indigo-400 transition-colors">
                        {oeuvre.titre}
                      </h3>
                      {oeuvre.genres?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {oeuvre.genres.slice(0, 2).map((genre) => (
                            <span
                              key={genre.id}
                              className="px-2 py-0.5 bg-gray-700/50 text-gray-400 text-xs rounded"
                            >
                              {genre.nom}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Members Tab */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Owner */}
            <div className="bg-gradient-to-r from-amber-900/30 to-orange-900/30 border border-amber-600/30 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-bold text-lg">
                  {team.owner?.username?.[0]?.toUpperCase() || "?"}
                </div>
                <div>
                  <p className="font-semibold text-white">{team.owner?.username || "Inconnu"}</p>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-600/30 text-amber-400 text-xs font-medium rounded-full">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z" clipRule="evenodd" />
                    </svg>
                    Fondateur
                  </span>
                </div>
              </div>
            </div>

            {/* Other Members */}
            {members.map((member) => (
              <div
                key={member.id}
                className="bg-gray-800/30 border border-gray-700/30 rounded-xl p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                    {member.username?.[0]?.toUpperCase() || "?"}
                  </div>
                  <div>
                    <p className="font-semibold text-white">{member.username}</p>
                    <span className="text-gray-400 text-sm">Membre</span>
                  </div>
                </div>
              </div>
            ))}

            {members.length === 0 && (
              <div className="col-span-full text-center py-8 text-gray-400">
                Aucun autre membre pour le moment
              </div>
            )}
          </div>
        )}
        </div> {/* End team-content */}
        </div>
      </div>

      {/* Panneau de personnalisation */}
      {showCustomizationPanel && (
        <TeamCustomizationPanel
          team={team}
          onUpdate={handleUpdateTeam}
          onClose={() => setShowCustomizationPanel(false)}
        />
      )}
    </TeamTheme>
  );
}
