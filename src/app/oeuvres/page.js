"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import dynamic from "next/dynamic";
import BannerCarousel from "../components/BannerCarousel";

const FicheOeuvre = dynamic(() => import("../components/FicheOeuvre"), { ssr: false });

function OeuvresContent() {
  const [oeuvres, setOeuvres] = useState([]);
  const [selectedOeuvre, setSelectedOeuvre] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedCategorie, setSelectedCategorie] = useState("all");
  const [sortBy, setSortBy] = useState("recent");
  const [viewMode, setViewMode] = useState("grid");
  
  const searchParams = useSearchParams();

  // Extraire dynamiquement les types et catégories uniques depuis les données
  const uniqueTypes = useMemo(() => {
    const typesSet = new Set();
    oeuvres.forEach(o => {
      if (o.type) typesSet.add(o.type);
    });
    return Array.from(typesSet).sort();
  }, [oeuvres]);

  const uniqueCategories = useMemo(() => {
    const catsSet = new Set();
    oeuvres.forEach(o => {
      if (o.categorie) catsSet.add(o.categorie);
    });
    return Array.from(catsSet).sort();
  }, [oeuvres]);

  useEffect(() => {
    // Récupérer le filtre de catégorie depuis l'URL si présent
    const categoryFromUrl = searchParams.get("category");
    if (categoryFromUrl) {
      setSelectedType(categoryFromUrl);
    }
  }, [searchParams]);

  useEffect(() => {
    const fetchOeuvres = async () => {
      setIsLoading(true);
      const url = `/api/proxy/oeuvres?populate[couverture][fields][0]=url&fields[0]=titre&fields[1]=documentId&fields[2]=type&fields[3]=categorie&fields[4]=etat&fields[5]=auteur&fields[6]=annee&fields[7]=synopsis&fields[8]=createdAt&fields[9]=updatedAt&pagination[pageSize]=100`;

      try {
        const res = await fetch(url);
        const data = await res.json();
        setOeuvres(data.data || []);
      } catch (error) {
        console.error("Erreur lors de la récupération des œuvres :", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOeuvres();
  }, []);

  // Filtrage et tri des œuvres
  const filteredOeuvres = useMemo(() => {
    let result = [...oeuvres];

    // Filtre par recherche
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (o) =>
          o.titre?.toLowerCase().includes(query) ||
          o.auteur?.toLowerCase().includes(query)
      );
    }

    // Filtre par type (recherche partielle, insensible à la casse)
    if (selectedType !== "all") {
      const typeQuery = selectedType.toLowerCase();
      result = result.filter((o) => 
        o.type?.toLowerCase().includes(typeQuery) || 
        typeQuery.includes(o.type?.toLowerCase() || "")
      );
    }

    // Filtre par catégorie (recherche partielle, insensible à la casse)
    if (selectedCategorie !== "all") {
      const catQuery = selectedCategorie.toLowerCase();
      result = result.filter((o) => 
        o.categorie?.toLowerCase().includes(catQuery) || 
        catQuery.includes(o.categorie?.toLowerCase() || "")
      );
    }

    // Tri
    switch (sortBy) {
      case "recent":
        result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
      case "oldest":
        result.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        break;
      case "alpha":
        result.sort((a, b) => (a.titre || "").localeCompare(b.titre || ""));
        break;
      case "alpha-reverse":
        result.sort((a, b) => (b.titre || "").localeCompare(a.titre || ""));
        break;
      default:
        break;
    }

    return result;
  }, [oeuvres, searchQuery, selectedType, selectedCategorie, sortBy]);

  const handleOeuvreClick = (oeuvre) => {
    setSelectedOeuvre(oeuvre);
  };

  const closeFicheOeuvre = () => {
    setSelectedOeuvre(null);
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedType("all");
    setSelectedCategorie("all");
    setSortBy("recent");
  };

  const hasActiveFilters = searchQuery || selectedType !== "all" || selectedCategorie !== "all";

  return (
    <div className="bg-gray-950 min-h-screen">
      {/* Header de page */}
      <div className="bg-gradient-to-b from-gray-900 to-gray-950 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
                Catalogue
              </h1>
              <p className="text-gray-400">
                {isLoading ? "Chargement..." : `${filteredOeuvres.length} œuvre${filteredOeuvres.length > 1 ? "s" : ""} disponible${filteredOeuvres.length > 1 ? "s" : ""}`}
              </p>
            </div>
            
            {/* Toggle vue grille/liste */}
            <div className="flex items-center gap-2 bg-gray-800 rounded-lg p-1">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded-md transition-colors ${viewMode === "grid" ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white"}`}
                title="Vue grille"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 rounded-md transition-colors ${viewMode === "list" ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white"}`}
                title="Vue liste"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>

          {/* Barre de recherche */}
          <div className="relative mb-6">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher une œuvre ou un auteur..."
              className="w-full pl-12 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Filtres */}
          <div className="flex flex-wrap gap-3">
            {/* Filtre Type */}
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="all">Tous les types ({oeuvres.length})</option>
              {uniqueTypes.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>

            {/* Filtre Catégorie */}
            <select
              value={selectedCategorie}
              onChange={(e) => setSelectedCategorie(e.target.value)}
              className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="all">Toutes les catégories</option>
              {uniqueCategories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            {/* Tri */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="recent">Plus récentes</option>
              <option value="oldest">Plus anciennes</option>
              <option value="alpha">A → Z</option>
              <option value="alpha-reverse">Z → A</option>
            </select>

            {/* Bouton effacer filtres */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg text-sm hover:bg-red-500/30 transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
                Effacer les filtres
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8">
        {/* État de chargement */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-[2/3] bg-gray-800 rounded-xl mb-3"></div>
                <div className="h-4 bg-gray-800 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-800 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : filteredOeuvres.length > 0 ? (
          /* Vue grille */
          viewMode === "grid" ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
              {filteredOeuvres.map((oeuvre) => (
                <div
                  key={oeuvre.id}
                  className="group cursor-pointer"
                  onClick={() => handleOeuvreClick(oeuvre)}
                >
                  <div className="relative aspect-[2/3] rounded-xl overflow-hidden mb-3 bg-gray-800 shadow-lg">
                    {oeuvre.couverture?.[0]?.url ? (
                      <Image
                        src={oeuvre.couverture[0].url}
                        alt={oeuvre.titre || "Couverture"}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        fill
                        sizes="(max-width: 768px) 50vw, 25vw"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-700 to-gray-800">
                        <span className="text-4xl">📖</span>
                      </div>
                    )}
                    
                    {/* Overlay hover */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300">
                      <div className="absolute bottom-0 left-0 right-0 p-3">
                        <span className="inline-flex items-center gap-1 text-white text-sm font-medium">
                          Voir détails
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                          </svg>
                        </span>
                      </div>
                    </div>

                    {/* Badges */}
                    <div className="absolute top-2 left-2 flex flex-wrap gap-1">
                      {oeuvre.type && (
                        <span className="px-2 py-0.5 bg-indigo-600/90 backdrop-blur-sm text-white text-xs font-medium rounded-md">
                          {oeuvre.type}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <h3 className="font-semibold text-white text-sm line-clamp-2 group-hover:text-indigo-400 transition-colors">
                    {oeuvre.titre || "Titre non disponible"}
                  </h3>
                  <p className="text-gray-400 text-xs mt-1">
                    {oeuvre.auteur || "Auteur inconnu"}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            /* Vue liste */
            <div className="space-y-3">
              {filteredOeuvres.map((oeuvre) => (
                <div
                  key={oeuvre.id}
                  className="flex items-center gap-4 p-4 bg-gray-900 hover:bg-gray-800 rounded-xl cursor-pointer transition-colors group"
                  onClick={() => handleOeuvreClick(oeuvre)}
                >
                  {/* Image */}
                  <div className="relative w-16 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-gray-800">
                    {oeuvre.couverture?.[0]?.url ? (
                      <Image
                        src={oeuvre.couverture[0].url}
                        alt={oeuvre.titre || "Couverture"}
                        className="object-cover"
                        fill
                        sizes="64px"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-700 to-gray-800">
                        <span className="text-2xl">📖</span>
                      </div>
                    )}
                  </div>

                  {/* Infos */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white group-hover:text-indigo-400 transition-colors truncate">
                      {oeuvre.titre || "Titre non disponible"}
                    </h3>
                    <p className="text-gray-400 text-sm">
                      {oeuvre.auteur || "Auteur inconnu"}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {oeuvre.type && (
                        <span className="px-2 py-0.5 bg-indigo-600/20 text-indigo-400 text-xs rounded">
                          {oeuvre.type}
                        </span>
                      )}
                      {oeuvre.categorie && (
                        <span className="px-2 py-0.5 bg-purple-600/20 text-purple-400 text-xs rounded">
                          {oeuvre.categorie}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Flèche */}
                  <svg className="w-5 h-5 text-gray-400 group-hover:text-indigo-400 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              ))}
            </div>
          )
        ) : (
          /* État vide */
          <div className="text-center py-20">
            <div className="w-24 h-24 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-12 h-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              Aucune œuvre trouvée
            </h3>
            <p className="text-gray-400 mb-6 max-w-md mx-auto">
              {hasActiveFilters 
                ? "Aucune œuvre ne correspond à vos critères de recherche. Essayez de modifier vos filtres."
                : "Il n'y a pas encore d'œuvres dans le catalogue."}
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors"
              >
                Réinitialiser les filtres
              </button>
            )}
          </div>
        )}
      </div>

      {/* Bannière publicitaire */}
      <div className="py-10 px-4 sm:px-8">
        <div className="max-w-4xl mx-auto">
          <BannerCarousel variant="inline" />
        </div>
      </div>

      {/* Fiche Oeuvre (Pop-up) */}
      {selectedOeuvre && (
        <FicheOeuvre oeuvre={selectedOeuvre} onClose={closeFicheOeuvre} />
      )}
    </div>
  );
}

export default function Oeuvres() {
  return (
    <Suspense fallback={
      <div className="bg-gray-950 min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    }>
      <OeuvresContent />
    </Suspense>
  );
}
