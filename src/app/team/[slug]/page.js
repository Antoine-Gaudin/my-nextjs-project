"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

export default function TeamDetailPage() {
  const params = useParams();
  const { slug } = params;

  const [team, setTeam] = useState(null);
  const [members, setMembers] = useState([]);
  const [oeuvres, setOeuvres] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("oeuvres");
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTeam = async () => {
      try {
        // Récupérer la team par slug
        const res = await fetch(
          `/api/proxy/teams?filters[slug][$eq]=${slug}&filters[isPublic][$eq]=true&populate=logo&populate=owner&populate=membres&populate=oeuvres.couverture&populate=oeuvres.genres`
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
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Banner */}
      <div className="bg-gradient-to-r from-indigo-900 to-purple-900 py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-gray-300 hover:text-white mb-6 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
            Retour à l&apos;accueil
          </Link>

          <div className="flex flex-col sm:flex-row gap-6 items-start">
            {/* Logo */}
            {team.logo?.[0]?.url ? (
              <img
                src={team.logo[0].url}
                alt={team.nom}
                className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl object-cover shadow-xl"
              />
            ) : (
              <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-xl">
                <span className="text-4xl sm:text-5xl font-bold text-white">
                  {team.nom?.[0]?.toUpperCase() || "T"}
                </span>
              </div>
            )}

            {/* Info */}
            <div className="flex-1">
              <h1 className="text-3xl sm:text-4xl font-bold mb-2">{team.nom}</h1>
              <p className="text-gray-300 text-lg mb-4">@{team.slug}</p>
              {team.description && (
                <p className="text-gray-400 max-w-2xl">{team.description}</p>
              )}

              {/* Social Links */}
              <div className="flex flex-wrap gap-3 mt-4">
                {team.discord && (
                  <a
                    href={team.discord}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
                    </svg>
                    Rejoindre Discord
                  </a>
                )}
                {team.website && (
                  <a
                    href={team.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    Site web
                  </a>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="flex sm:flex-col gap-4 sm:gap-2 text-center sm:text-right">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3">
                <p className="text-2xl font-bold">{members.length + 1}</p>
                <p className="text-sm text-gray-300">Membres</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3">
                <p className="text-2xl font-bold">{oeuvres.length}</p>
                <p className="text-sm text-gray-300">Œuvres</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-gray-800">
          <button
            onClick={() => setActiveTab("oeuvres")}
            className={`px-4 py-3 font-medium transition-all relative ${
              activeTab === "oeuvres" ? "text-indigo-400" : "text-gray-400 hover:text-gray-300"
            }`}
          >
            Œuvres ({oeuvres.length})
            {activeTab === "oeuvres" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("members")}
            className={`px-4 py-3 font-medium transition-all relative ${
              activeTab === "members" ? "text-indigo-400" : "text-gray-400 hover:text-gray-300"
            }`}
          >
            Membres ({members.length + 1})
            {activeTab === "members" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full" />
            )}
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === "oeuvres" ? (
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
                    <div className="aspect-[3/4] relative">
                      {oeuvre.couverture?.[0]?.url ? (
                        <img
                          src={oeuvre.couverture[0].url}
                          alt={oeuvre.titre}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
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
      </div>
    </div>
  );
}
