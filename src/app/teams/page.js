"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";

export default function TeamsPage() {
  const [teams, setTeams] = useState([]);
  const [filteredTeams, setFilteredTeams] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("recent");
  const [filterActive, setFilterActive] = useState("all");

  useEffect(() => {
    fetchTeams();
  }, []);

  useEffect(() => {
    filterAndSortTeams();
  }, [teams, searchTerm, sortBy, filterActive]);

  const fetchTeams = async () => {
    try {
      const res = await fetch(
        `/api/proxy/teams?filters[isPublic][$eq]=true&populate=logo&populate=owner&populate=membres&populate=oeuvres&pagination[pageSize]=100`
      );
      const data = await res.json();
      setTeams(data.data || []);
    } catch (error) {
      console.error("Erreur lors du chargement des teams:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterAndSortTeams = () => {
    let result = [...teams];

    // Recherche
    if (searchTerm) {
      result = result.filter(
        (team) =>
          team.nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          team.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtrage par activité
    if (filterActive === "active") {
      result = result.filter((team) => team.oeuvres?.length > 0);
    }

    // Tri
    result.sort((a, b) => {
      switch (sortBy) {
        case "recent":
          return new Date(b.createdAt) - new Date(a.createdAt);
        case "popular":
          return (b.membres?.length || 0) - (a.membres?.length || 0);
        case "works":
          return (b.oeuvres?.length || 0) - (a.oeuvres?.length || 0);
        case "name":
          return (a.nom || "").localeCompare(b.nom || "");
        default:
          return 0;
      }
    });

    setFilteredTeams(result);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400">Chargement des teams...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-900 via-purple-900 to-pink-900 py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Découvrez les Teams
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl">
            Explorez les équipes de traduction et plongez dans leurs univers uniques
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Barre de recherche et filtres */}
        <div className="mb-8 space-y-4">
          {/* Recherche */}
          <div className="relative">
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher une team..."
              className="w-full pl-12 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
            />
          </div>

          {/* Filtres et tri */}
          <div className="flex flex-wrap gap-3">
            {/* Filtre activité */}
            <div className="flex gap-2">
              <button
                onClick={() => setFilterActive("all")}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  filterActive === "all"
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                Toutes
              </button>
              <button
                onClick={() => setFilterActive("active")}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  filterActive === "active"
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                Actives
              </button>
            </div>

            {/* Tri */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer"
            >
              <option value="recent">Plus récentes</option>
              <option value="popular">Plus populaires</option>
              <option value="works">Plus d'œuvres</option>
              <option value="name">Par nom</option>
            </select>

            {/* Compteur */}
            <div className="ml-auto flex items-center text-gray-400">
              <span className="text-sm">
                {filteredTeams.length} team{filteredTeams.length > 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </div>

        {/* Grille des teams */}
        {filteredTeams.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gray-800 flex items-center justify-center">
              <svg
                className="w-10 h-10 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              Aucune team trouvée
            </h3>
            <p className="text-gray-400">
              Essayez de modifier vos critères de recherche
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTeams.map((team) => (
              <TeamCard key={team.documentId} team={team} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TeamCard({ team }) {
  const membersCount = (team.membres?.length || 0) + 1; // +1 pour l'owner
  const worksCount = team.oeuvres?.length || 0;
  const logoUrl = Array.isArray(team.logo)
    ? team.logo?.[0]?.url
    : team.logo?.url;

  return (
    <Link
      href={`/team/${team.slug}`}
      className="group bg-gray-800/30 hover:bg-gray-800/50 border border-gray-700/30 hover:border-indigo-600/30 rounded-xl overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-indigo-900/20"
    >
      {/* Logo / Avatar */}
      <div className="p-6 pb-4">
        <div className="flex items-start gap-4 mb-4">
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt={team.nom}
              width={64}
              height={64}
              className="w-16 h-16 rounded-xl object-cover"
            />
          ) : (
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
              <span className="text-2xl font-bold text-white">
                {team.nom?.[0]?.toUpperCase() || "T"}
              </span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-white truncate group-hover:text-indigo-400 transition-colors">
              {team.nom}
            </h3>
            <p className="text-sm text-gray-400 truncate">@{team.slug}</p>
          </div>
        </div>

        {/* Description */}
        {team.description && (
          <p className="text-gray-400 text-sm line-clamp-2 mb-4">
            {team.description}
          </p>
        )}

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5 text-gray-400">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <span>{membersCount}</span>
          </div>
          <div className="flex items-center gap-1.5 text-gray-400">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
            <span>{worksCount}</span>
          </div>
        </div>
      </div>

      {/* Footer avec liens sociaux */}
      {(team.discord || team.website) && (
        <div className="px-6 py-3 bg-gray-900/30 border-t border-gray-700/30 flex gap-2">
          {team.discord && (
            <div className="flex items-center gap-1.5 text-xs text-indigo-400">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
              </svg>
              Discord
            </div>
          )}
          {team.website && (
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                />
              </svg>
              Site
            </div>
          )}
        </div>
      )}
    </Link>
  );
}
