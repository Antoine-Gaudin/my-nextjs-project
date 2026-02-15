"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import FicheOeuvre from "./componants/FicheOeuvre";
import BannerCarousel from "./componants/BannerCarousel";

export default function Home() {
  const [searchText, setSearchText] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [popularOeuvres, setPopularOeuvres] = useState([]);
  const [selectedOeuvre, setSelectedOeuvre] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [stats, setStats] = useState({ oeuvres: 0, chapitres: 0, traducteurs: 0 });
  const searchTimerRef = useRef(null);
  const router = useRouter();

  // Catégories disponibles
  const categories = [
    { name: "Light Novel", icon: "📖", color: "from-purple-500 to-indigo-600" },
    { name: "Web Novel", icon: "🌐", color: "from-blue-500 to-cyan-600" },
    { name: "Manga", icon: "📚", color: "from-pink-500 to-rose-600" },
    { name: "Manhua", icon: "🎨", color: "from-orange-500 to-amber-600" },
    { name: "Manhwa", icon: "✨", color: "from-green-500 to-emerald-600" },
    { name: "Fan Fiction", icon: "✍️", color: "from-red-500 to-pink-600" },
  ];

  useEffect(() => {
    const fetchPopularOeuvres = async () => {
      try {
        const url = `/api/proxy/oeuvres?populate=couverture&pagination[limit]=8&sort=createdAt:desc`;
        const res = await fetch(url);
        const data = await res.json();
        setPopularOeuvres(data.data || []);
      } catch (error) {
        console.error("Erreur lors de la récupération des œuvres populaires :", error);
      }
    };

    const fetchStats = async () => {
      try {
        const [oeuvresRes, chapitresRes, traducteursRes] = await Promise.all([
          fetch(`/api/proxy/oeuvres?pagination[limit]=1&pagination[withCount]=true`),
          fetch(`/api/proxy/chapitres?pagination[limit]=1&pagination[withCount]=true`),
          fetch(`/api/proxy/users?filters[redacteur][$eq]=true&pagination[limit]=1&pagination[withCount]=true`),
        ]);
        const [oeuvresData, chapitresData, traducteursData] = await Promise.all([
          oeuvresRes.json(),
          chapitresRes.json(),
          traducteursRes.json(),
        ]);
        setStats({
          oeuvres: oeuvresData?.meta?.pagination?.total || 0,
          chapitres: chapitresData?.meta?.pagination?.total || 0,
          traducteurs: traducteursData?.meta?.pagination?.total || traducteursData?.length || 0,
        });
      } catch (error) {
        console.error("Erreur lors de la récupération des stats :", error);
      }
    };

    fetchPopularOeuvres();
    fetchStats();
  }, []);

  // Debounced live search
  const debouncedSearch = useCallback((text) => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (!text.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    searchTimerRef.current = setTimeout(async () => {
      try {
        const url = `/api/proxy/oeuvres?filters[titre][$containsi]=${encodeURIComponent(text)}&populate=couverture&pagination[limit]=10`;
        const res = await fetch(url);
        const data = await res.json();
        setSearchResults(data.data || []);
      } catch (error) {
        console.error("Erreur lors de la recherche :", error);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  }, []);

  useEffect(() => {
    if (isSearchOpen) {
      debouncedSearch(searchText);
    }
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [searchText, isSearchOpen, debouncedSearch]);

  const handleKeyPress = (e) => {
    if (e.key === "Escape") {
      setIsSearchOpen(false);
    }
  };

  const handleOeuvreClick = (oeuvre) => {
    setSelectedOeuvre(oeuvre);
  };

  const closeFicheOeuvre = () => {
    setSelectedOeuvre(null);
  };

  const closeSearch = () => {
    setIsSearchOpen(false);
    setSearchText("");
    setSearchResults([]);
  };

  return (
    <div className="relative bg-gray-950">
      {/* Hero Header - Redesigned */}
      <div className="relative min-h-screen w-full">
        {/* Image de fond optimisée */}
        <Image
          src="/images/HeroHeader.webp"
          alt="Trad-Index — Plateforme de traductions françaises de light novels, web novels et mangas"
          fill
          priority
          className="object-cover object-center"
          sizes="100vw"
        />
        {/* Overlay avec gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-gray-950"></div>

        {/* Contenu Hero */}
        <div className="relative z-10 flex flex-col justify-center items-center min-h-screen text-center text-white px-4 py-20">
          {/* Badge */}
          <div className="mb-6 animate-fade-in">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-sm font-medium">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              Plateforme active • Mises à jour quotidiennes
            </span>
          </div>

          {/* Titre principal */}
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold mb-6 tracking-tight">
            <span className="bg-gradient-to-r from-white via-purple-200 to-indigo-300 bg-clip-text text-transparent">
              Trad-Index
            </span>
          </h1>

          {/* Sous-titre */}
          <p className="text-lg sm:text-xl md:text-2xl text-gray-300 mb-4 max-w-2xl leading-relaxed">
            Votre portail vers les meilleures traductions françaises
          </p>
          <p className="text-base text-gray-400 mb-10 max-w-xl">
            Light novels, web novels, manhwas et plus encore — découvrez des milliers de chapitres traduits par la communauté.
          </p>

          {/* Barre de recherche */}
          <div 
            className="w-full max-w-xl group cursor-pointer"
            onClick={() => setIsSearchOpen(true)}
          >
            <div className="relative flex items-center bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 transition-all duration-300 hover:bg-white/15 hover:border-white/30 hover:scale-[1.02]">
              <div className="pl-5 text-gray-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Rechercher une œuvre, un auteur..."
                className="w-full px-4 py-4 bg-transparent text-white placeholder-gray-400 focus:outline-none cursor-pointer"
                readOnly
                aria-label="Rechercher une œuvre"
              />
              <div className="pr-4">
                <kbd className="hidden sm:inline-flex items-center px-2 py-1 text-xs text-gray-400 bg-white/10 rounded-lg border border-white/20">
                  Entrée
                </kbd>
              </div>
            </div>
          </div>

          {/* Boutons CTA */}
          <div className="flex flex-col sm:flex-row gap-4 mt-10">
            <Link
              href="/oeuvres"
              className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl font-semibold text-white shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-all duration-300 hover:scale-105"
            >
              Explorer le catalogue
            </Link>
            <Link
              href="/inscription"
              className="px-8 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl font-semibold text-white hover:bg-white/20 transition-all duration-300"
            >
              Rejoindre la communauté
            </Link>
          </div>

          {/* Stats rapides */}
          <div className="flex flex-wrap justify-center gap-8 mt-16 pt-8 border-t border-white/10">
            <div className="text-center">
              <p className="text-3xl font-bold text-white">{stats.oeuvres.toLocaleString("fr-FR")}</p>
              <p className="text-sm text-gray-400">Œuvres indexées</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-white">{stats.chapitres.toLocaleString("fr-FR")}</p>
              <p className="text-sm text-gray-400">Chapitres traduits</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-white">{stats.traducteurs.toLocaleString("fr-FR")}</p>
              <p className="text-sm text-gray-400">Traducteurs actifs</p>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <svg className="w-6 h-6 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </div>

      {/* Sorties du jour - Redirection vers novel-index.com */}
      <section className="bg-gray-950 py-16 px-4 sm:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-900/50 via-purple-900/50 to-pink-900/50 border border-white/10 p-8 sm:p-12">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl"></div>
            
            <div className="relative z-10 text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/20 text-green-400 text-sm font-medium mb-6">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                Mises à jour quotidiennes
              </div>
              
              <h2 className="text-2xl sm:text-4xl font-bold text-white mb-4">
                Sorties du jour
              </h2>
              
              <p className="text-gray-300 text-lg mb-8 max-w-xl mx-auto">
                Retrouvez toutes nos sorties quotidiennes sur notre plateforme principale pour ne rien manquer des derniers chapitres.
              </p>
              
              <a
                href="https://novel-index.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl font-semibold text-white shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-all duration-300 hover:scale-105 group"
              >
                <span>Voir les sorties sur novel-index.com</span>
                <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Catégories */}
      <section className="bg-gray-900 py-16 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">Explorez par catégorie</h2>
            <p className="text-gray-400">Trouvez exactement ce que vous cherchez</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {categories.map((cat) => (
              <Link
                key={cat.name}
                href={`/oeuvres?category=${encodeURIComponent(cat.name)}`}
                className={`group relative overflow-hidden p-6 rounded-2xl bg-gradient-to-br ${cat.color} transition-all duration-300 hover:scale-105 hover:shadow-lg`}
              >
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors"></div>
                <div className="relative text-center">
                  <span className="text-3xl mb-2 block">{cat.icon}</span>
                  <span className="text-white font-semibold text-sm">{cat.name}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Œuvres populaires */}
      {popularOeuvres.length > 0 && (
        <section className="bg-gray-950 py-16 px-4 sm:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-1 h-8 bg-gradient-to-b from-orange-500 to-red-500 rounded-full"></div>
                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-white">Récemment ajoutées</h2>
                  <p className="text-gray-400 text-sm mt-1">Les dernières œuvres sur la plateforme</p>
                </div>
              </div>
              <Link
                href="/oeuvres"
                className="text-indigo-400 hover:text-indigo-300 font-medium text-sm flex items-center gap-1 transition-colors"
              >
                Voir tout
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-6">
              {popularOeuvres.slice(0, 8).map((oeuvre) => (
                <Link
                  key={oeuvre.id}
                  href={`/oeuvre/${oeuvre.documentId}`}
                  className="group cursor-pointer"
                  onClick={(e) => { e.preventDefault(); handleOeuvreClick(oeuvre); }}
                >
                  <div className="relative aspect-[2/3] rounded-xl overflow-hidden mb-3 bg-gray-800">
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
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg text-white font-medium text-sm">
                        Voir détails
                      </span>
                    </div>
                  </div>
                  <h3 className="font-semibold text-white text-sm line-clamp-2 group-hover:text-indigo-300 transition-colors">
                    {oeuvre.titre}
                  </h3>
                  {oeuvre.type && (
                    <p className="text-gray-400 text-xs mt-1">{oeuvre.type}</p>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Bannière publicitaire */}
      <section className="py-10 px-4 sm:px-8 bg-gray-950">
        <div className="max-w-4xl mx-auto">
          <BannerCarousel variant="inline" />
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-indigo-900 via-purple-900 to-indigo-900 py-20 px-4 sm:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Prêt à contribuer ?
          </h2>
          <p className="text-gray-300 text-lg mb-8 max-w-2xl mx-auto">
            Rejoignez notre communauté de passionnés. Partagez vos traductions, découvrez de nouvelles œuvres et connectez-vous avec d'autres fans.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/inscription"
              className="px-8 py-4 bg-white text-indigo-900 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
            >
              Créer un compte gratuit
            </Link>
            <Link
              href="/oeuvres"
              className="px-8 py-4 bg-white/10 border border-white/30 text-white rounded-xl font-semibold hover:bg-white/20 transition-all duration-300"
            >
              Parcourir les œuvres
            </Link>
          </div>
        </div>
      </section>

      {/* Fiche Oeuvre (Pop-up) */}
      {selectedOeuvre && (
        <FicheOeuvre oeuvre={selectedOeuvre} onClose={closeFicheOeuvre} />
      )}

      {/* Recherche Plein Écran - Redesigned */}
      {isSearchOpen && (
        <div 
          className="fixed inset-0 bg-black/95 backdrop-blur-xl z-50 flex flex-col items-center pt-20 px-4"
          onClick={(e) => e.target === e.currentTarget && closeSearch()}
        >
          {/* Bouton fermer */}
          <button
            onClick={closeSearch}
            className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            aria-label="Fermer la recherche"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Contenu recherche */}
          <div className="w-full max-w-2xl">
            <div className="relative mb-6">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Rechercher une œuvre..."
                className="w-full pl-14 pr-4 py-4 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-lg"
                autoFocus
              />
              {searchText && (
                <button
                  onClick={() => setSearchText("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Hint */}
            <p className="text-gray-400 text-sm text-center mb-6">
              Tapez pour rechercher • <kbd className="px-2 py-1 bg-white/10 rounded text-gray-400">Échap</kbd> pour fermer
            </p>

            {/* Résultats */}
            <div className="max-h-[60vh] overflow-y-auto rounded-2xl">
              {isSearching ? (
                <div className="text-center py-12">
                  <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-400">Recherche en cours...</p>
                </div>
              ) : searchResults.length > 0 ? (
                <div className="space-y-2">
                  {searchResults.map((oeuvre) => (
                    <div
                      key={oeuvre.id}
                      className="flex items-center gap-4 p-4 bg-white/5 hover:bg-white/10 rounded-xl cursor-pointer transition-colors"
                      onClick={() => {
                        handleOeuvreClick(oeuvre);
                        closeSearch();
                      }}
                    >
                      {oeuvre.couverture?.[0]?.url ? (
                        <Image
                          src={oeuvre.couverture[0].url}
                          alt={oeuvre.titre || "Couverture"}
                          className="w-16 h-20 object-cover rounded-lg"
                          width={64}
                          height={80}
                        />
                      ) : (
                        <div className="w-16 h-20 bg-gray-800 rounded-lg flex items-center justify-center">
                          <span className="text-2xl">📖</span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-white font-semibold truncate">{oeuvre.titre}</h3>
                        <p className="text-gray-400 text-sm">
                          {oeuvre.auteur || "Auteur inconnu"} • {oeuvre.type || "Type inconnu"}
                        </p>
                      </div>
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  ))}
                </div>
              ) : searchText && !isSearching ? (
                <div className="text-center py-12 bg-white/5 rounded-2xl">
                  <div className="text-4xl mb-4">🔍</div>
                  <p className="text-gray-400">Aucun résultat pour "{searchText}"</p>
                  <p className="text-gray-400 text-sm mt-2">Essayez avec d'autres mots-clés</p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
