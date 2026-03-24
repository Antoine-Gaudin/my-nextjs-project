"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Suspense } from "react";

const FicheOeuvre = dynamic(() => import("../components/FicheOeuvre"), { ssr: false });

function RechercheContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const q = searchParams.get("q") || "";

  const [query, setQuery] = useState(q);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [selectedOeuvre, setSelectedOeuvre] = useState(null);
  const [selectedType, setSelectedType] = useState("all");
  const [selectedCategorie, setSelectedCategorie] = useState("all");
  const [sortBy, setSortBy] = useState("pertinence");
  const inputRef = useRef(null);

  const fetchResults = useCallback(async (searchQuery) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    setSearched(true);
    try {
      const encoded = encodeURIComponent(searchQuery.trim());
      const url = `/api/proxy/oeuvres?filters[$or][0][titre][$containsi]=${encoded}&filters[$or][1][titrealt][$containsi]=${encoded}&populate[couverture][fields][0]=url&fields[0]=titre&fields[1]=documentId&fields[2]=type&fields[3]=categorie&fields[4]=etat&fields[5]=auteur&fields[6]=annee&fields[7]=synopsis&fields[8]=createdAt&fields[9]=updatedAt&pagination[pageSize]=50`;
      const res = await fetch(url);
      const data = await res.json();
      setResults(data.data || []);
    } catch (error) {
      console.error("Erreur recherche:", error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Lancer la recherche initiale depuis l'URL
  useEffect(() => {
    if (q) {
      setQuery(q);
      fetchResults(q);
    }
  }, [q, fetchResults]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      router.replace(`/recherche?q=${encodeURIComponent(query.trim())}`, { scroll: false });
      fetchResults(query);
    }
  };

  // Filtres dynamiques
  const uniqueTypes = useMemo(() => {
    const s = new Set();
    results.forEach(o => { if (o.type) s.add(o.type); });
    return Array.from(s).sort();
  }, [results]);

  const uniqueCategories = useMemo(() => {
    const s = new Set();
    results.forEach(o => { if (o.categorie) s.add(o.categorie); });
    return Array.from(s).sort();
  }, [results]);

  const filteredResults = useMemo(() => {
    let filtered = results;
    if (selectedType !== "all") filtered = filtered.filter(o => o.type === selectedType);
    if (selectedCategorie !== "all") filtered = filtered.filter(o => o.categorie === selectedCategorie);

    if (sortBy === "titre") {
      filtered = [...filtered].sort((a, b) => (a.titre || "").localeCompare(b.titre || ""));
    } else if (sortBy === "recent") {
      filtered = [...filtered].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    }
    // "pertinence" = default API order
    return filtered;
  }, [results, selectedType, selectedCategorie, sortBy]);

  return (
    <main className="min-h-screen bg-gray-950 pt-24 pb-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Header + Search */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Rechercher une œuvre</h1>
          <p className="text-gray-400 mb-6">Trouvez des light novels, web novels, mangas et plus encore.</p>

          <form onSubmit={handleSubmit} className="flex gap-3">
            <div className="flex-1 relative">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Titre, auteur, mot-clé..."
                className="w-full pl-12 pr-4 py-3.5 bg-gray-900 border border-gray-800 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors text-lg"
                autoFocus
              />
            </div>
            <button
              type="submit"
              className="px-8 py-3.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold rounded-xl transition-all shadow-lg shadow-indigo-500/25"
            >
              Rechercher
            </button>
          </form>
        </div>

        {/* Filtres */}
        {searched && results.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <span className="text-gray-400 text-sm font-medium">Filtres :</span>
            {uniqueTypes.length > 1 && (
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="bg-gray-900 border border-gray-800 text-gray-300 text-sm rounded-lg px-3 py-2 focus:border-indigo-500 outline-none"
              >
                <option value="all">Tous les types</option>
                {uniqueTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            )}
            {uniqueCategories.length > 1 && (
              <select
                value={selectedCategorie}
                onChange={(e) => setSelectedCategorie(e.target.value)}
                className="bg-gray-900 border border-gray-800 text-gray-300 text-sm rounded-lg px-3 py-2 focus:border-indigo-500 outline-none"
              >
                <option value="all">Toutes les catégories</option>
                {uniqueCategories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            )}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-gray-900 border border-gray-800 text-gray-300 text-sm rounded-lg px-3 py-2 focus:border-indigo-500 outline-none"
            >
              <option value="pertinence">Pertinence</option>
              <option value="titre">Titre A-Z</option>
              <option value="recent">Plus récent</option>
            </select>
            <span className="text-gray-500 text-sm ml-auto">
              {filteredResults.length} résultat{filteredResults.length > 1 ? "s" : ""}
            </span>
          </div>
        )}

        {/* Résultats */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="ml-3 text-gray-400">Recherche en cours...</span>
          </div>
        ) : searched && filteredResults.length === 0 ? (
          <div className="text-center py-20">
            <svg className="w-16 h-16 text-gray-700 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-xl font-semibold text-gray-400 mb-2">Aucun résultat</h2>
            <p className="text-gray-500">Aucune œuvre trouvée pour &quot;{q}&quot;. Essayez avec d&apos;autres mots-clés.</p>
          </div>
        ) : searched ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
            {filteredResults.map((oeuvre) => {
              const coverUrl = oeuvre.couverture?.[0]?.url || oeuvre.couverture?.url;
              return (
                <article
                  key={oeuvre.documentId}
                  onClick={() => setSelectedOeuvre(oeuvre)}
                  className="group cursor-pointer"
                  itemScope
                  itemType="https://schema.org/Book"
                >
                  <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-gray-800 mb-3 ring-1 ring-gray-800 group-hover:ring-indigo-500/50 transition-all">
                    {coverUrl ? (
                      <Image
                        src={coverUrl}
                        alt={oeuvre.titre}
                        fill
                        sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        itemProp="image"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                        <svg className="w-12 h-12 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                      </div>
                    )}
                    {/* Badge type */}
                    {oeuvre.type && (
                      <span className="absolute top-2 left-2 px-2 py-0.5 bg-black/70 backdrop-blur-sm text-xs font-medium text-gray-200 rounded-md">
                        {oeuvre.type}
                      </span>
                    )}
                    {/* Badge état */}
                    {oeuvre.etat && (
                      <span className={`absolute top-2 right-2 px-2 py-0.5 backdrop-blur-sm text-xs font-medium rounded-md ${
                        oeuvre.etat === "En cours" ? "bg-green-500/20 text-green-300" :
                        oeuvre.etat === "Terminé" ? "bg-blue-500/20 text-blue-300" :
                        oeuvre.etat === "En pause" ? "bg-yellow-500/20 text-yellow-300" :
                        "bg-gray-500/20 text-gray-300"
                      }`}>
                        {oeuvre.etat}
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-semibold text-white group-hover:text-indigo-400 transition-colors line-clamp-2 leading-snug" itemProp="name">
                    {oeuvre.titre}
                  </h3>
                  {oeuvre.auteur && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-1" itemProp="author">{oeuvre.auteur}</p>
                  )}
                  <meta itemProp="url" content={`https://trad-index.com/oeuvre/${oeuvre.documentId}`} />
                </article>
              );
            })}
          </div>
        ) : (
          /* État initial — suggestions */
          <div className="text-center py-16">
            <svg className="w-20 h-20 text-gray-800 mx-auto mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <h2 className="text-xl font-semibold text-gray-500 mb-2">Recherchez parmi nos œuvres</h2>
            <p className="text-gray-600 max-w-md mx-auto">
              Entrez un titre, un nom d&apos;auteur ou un mot-clé pour trouver des light novels, web novels, mangas et plus.
            </p>
          </div>
        )}
      </div>

      {/* Modal FicheOeuvre */}
      {selectedOeuvre && (
        <FicheOeuvre
          oeuvre={selectedOeuvre}
          onClose={() => setSelectedOeuvre(null)}
        />
      )}
    </main>
  );
}

export default function RecherchePage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-gray-950 pt-24 pb-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        </div>
      </main>
    }>
      <RechercheContent />
    </Suspense>
  );
}
