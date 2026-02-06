"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const TEAMS_API = "http://localhost:1337/api";

export default function TeamsPage() {
  const [teams, setTeams] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("recent");

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        // Récupérer toutes les teams publiques
        const res = await fetch(
          `${TEAMS_API}/teams?filters[isPublic][$eq]=true&populate=logo&populate=owner&populate=membres&populate=oeuvres`
        );
        const data = await res.json();
        setTeams(data.data || []);
      } catch (error) {
        console.error("Erreur fetch teams:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTeams();
  }, []);

  // Filtrer et trier les teams
  const filteredTeams = teams
    .filter((team) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        team.nom?.toLowerCase().includes(query) ||
        team.description?.toLowerCase().includes(query) ||
        team.slug?.toLowerCase().includes(query)
      );
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "name":
          return (a.nom || "").localeCompare(b.nom || "");
        case "members":
          return (b.membres?.length || 0) - (a.membres?.length || 0);
        case "oeuvres":
          return (b.oeuvres?.length || 0) - (a.oeuvres?.length || 0);
        case "recent":
        default:
          return new Date(b.createdAt) - new Date(a.createdAt);
      }
    });

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-900 to-purple-900 py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <Link href="/" className="inline-flex items-center gap-2 text-gray-300 hover:text-white mb-6 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
            Retour à l'accueil
          </Link>
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">Teams de Traduction</h1>
          <p className="text-xl text-gray-300 max-w-2xl">
            Découvrez les équipes de traduction qui travaillent sur vos œuvres préférées
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          {/* Search */}
          <div className="flex-1 relative">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher une team..."
              className="w-full pl-12 pr-4 py-3 bg-gray-800/50 border border-gray-700/50 focus:border-indigo-600/50 rounded-xl text-white placeholder-gray-500 outline-none transition-colors"
            />
          </div>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-3 bg-gray-800/50 border border-gray-700/50 focus:border-indigo-600/50 rounded-xl text-white outline-none cursor-pointer"
          >
            <option value="recent">Plus récentes</option>
            <option value="name">Nom (A-Z)</option>
            <option value="members">Plus de membres</option>
            <option value="oeuvres">Plus d'œuvres</option>
          </select>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-800/30 rounded-xl p-4 text-center">
            <p className="text-3xl font-bold text-indigo-400">{teams.length}</p>
            <p className="text-gray-500 text-sm">Teams actives</p>
          </div>
          <div className="bg-gray-800/30 rounded-xl p-4 text-center">
            <p className="text-3xl font-bold text-purple-400">
              {teams.reduce((acc, t) => acc + (t.membres?.length || 0) + 1, 0)}
            </p>
            <p className="text-gray-500 text-sm">Traducteurs</p>
          </div>
          <div className="bg-gray-800/30 rounded-xl p-4 text-center">
            <p className="text-3xl font-bold text-pink-400">
              {teams.reduce((acc, t) => acc + (t.oeuvres?.length || 0), 0)}
            </p>
            <p className="text-gray-500 text-sm">Œuvres traduites</p>
          </div>
          <div className="bg-gray-800/30 rounded-xl p-4 text-center">
            <p className="text-3xl font-bold text-green-400">
              {teams.filter(t => t.discord).length}
            </p>
            <p className="text-gray-500 text-sm">Avec Discord</p>
          </div>
        </div>

        {/* Loading */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-gray-400">Chargement des teams...</p>
            </div>
          </div>
        ) : filteredTeams.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gray-800 flex items-center justify-center">
              <svg className="w-10 h-10 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            {searchQuery ? (
              <>
                <h3 className="text-xl font-semibold text-white mb-2">Aucun résultat</h3>
                <p className="text-gray-500">Essayez avec d'autres termes de recherche</p>
              </>
            ) : (
              <>
                <h3 className="text-xl font-semibold text-white mb-2">Aucune team publique</h3>
                <p className="text-gray-500">Soyez les premiers à créer une team !</p>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTeams.map((team) => (
              <Link
                key={team.documentId}
                href={`/team/${team.slug}`}
                className="group bg-gray-800/30 hover:bg-gray-800/50 border border-gray-700/30 hover:border-indigo-600/30 rounded-2xl p-5 transition-all duration-200"
              >
                {/* Header avec logo */}
                <div className="flex items-start gap-4 mb-4">
                  {team.logo?.[0]?.url ? (
                    <img
                      src={team.logo[0].url}
                      alt={team.nom}
                      className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center flex-shrink-0">
                      <span className="text-2xl font-bold text-white">
                        {team.nom?.[0]?.toUpperCase() || "T"}
                      </span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-bold text-white truncate group-hover:text-indigo-400 transition-colors">
                      {team.nom}
                    </h3>
                    <p className="text-gray-500 text-sm">@{team.slug}</p>
                  </div>
                </div>

                {/* Description */}
                {team.description && (
                  <p className="text-gray-400 text-sm line-clamp-2 mb-4">
                    {team.description}
                  </p>
                )}

                {/* Stats */}
                <div className="flex items-center gap-5 text-sm">
                  <div className="flex items-center gap-1.5 text-gray-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                    <span>{(team.membres?.length || 0) + 1}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    <span>{team.oeuvres?.length || 0}</span>
                  </div>
                </div>

                {/* Liens */}
                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-700/30">
                  {team.discord && (
                    <span className="px-2 py-1 bg-indigo-600/20 text-indigo-400 text-xs rounded-md">
                      Discord
                    </span>
                  )}
                  {team.website && (
                    <span className="px-2 py-1 bg-gray-700/50 text-gray-400 text-xs rounded-md">
                      Site web
                    </span>
                  )}
                  <div className="flex-1" />
                  <svg className="w-5 h-5 text-gray-500 group-hover:text-indigo-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
