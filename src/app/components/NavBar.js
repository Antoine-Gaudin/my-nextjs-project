"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Cookies from "js-cookie";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

export default function NavBar() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isRedacteur, setIsRedacteur] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchInputRef = useRef(null);
  const mobileSearchRef = useRef(null);
  const searchContainerRef = useRef(null);
  const searchTimerRef = useRef(null);
  const profileRef = useRef(null);
  const router = useRouter();
  const pathname = usePathname();

  // Vérifier l'état d'authentification
  const checkAuth = useCallback(() => {
    const jwt = Cookies.get("jwt");
    setIsLoggedIn(!!jwt);

    if (jwt) {
      // Utiliser le cookie userInfo en cache pour éviter un appel API à chaque navigation
      const userInfoCookie = Cookies.get("userInfo");
      if (userInfoCookie) {
        try {
          const user = JSON.parse(userInfoCookie);
          setIsRedacteur(!!user?.redacteur);
          return;
        } catch {}
      }
      // Fallback : appel API si pas de cookie userInfo
      fetch("/api/proxy/users/me", {
        headers: { Authorization: `Bearer ${jwt}` },
      })
        .then((res) => res.ok ? res.json() : null)
        .then((user) => {
          if (user) {
            setIsRedacteur(!!user.redacteur);
            // Mettre en cache pour les prochaines navigations
            Cookies.set("userInfo", JSON.stringify(user), { expires: 7, sameSite: "strict", secure: window.location.protocol === "https:" });
          }
        })
        .catch(() => {});
    } else {
      setIsRedacteur(false);
    }
  }, []);

  // Re-vérifier à chaque changement de route (couvre la connexion/déconnexion)
  useEffect(() => {
    checkAuth();
  }, [pathname, checkAuth]);

  // Écouter les événements d'auth personnalisés (login/logout depuis d'autres composants)
  useEffect(() => {
    const handleAuthChange = () => checkAuth();
    window.addEventListener("auth-change", handleAuthChange);
    return () => window.removeEventListener("auth-change", handleAuthChange);
  }, [checkAuth]);

  const handleLogout = () => {
    Cookies.remove("jwt");
    Cookies.remove("userInfo");
    setIsLoggedIn(false);
    setIsRedacteur(false);
    window.dispatchEvent(new Event("auth-change"));
    router.push("/connexion");
  };

  // Recherche avec suggestions
  const fetchSuggestions = useCallback((text) => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (!text || text.trim().length < 1) {
      setSuggestions([]);
      setSuggestionsLoading(false);
      return;
    }
    setSuggestionsLoading(true);
    searchTimerRef.current = setTimeout(async () => {
      try {
        const encoded = encodeURIComponent(text.trim());
        const url = `/api/proxy/oeuvres?filters[$or][0][titre][$containsi]=${encoded}&filters[$or][1][titrealt][$containsi]=${encoded}&populate[couverture][fields][0]=url&fields[0]=titre&fields[1]=documentId&fields[2]=type&fields[3]=auteur&pagination[limit]=6`;
        const res = await fetch(url);
        const data = await res.json();
        setSuggestions(data.data || []);
      } catch {
        setSuggestions([]);
      } finally {
        setSuggestionsLoading(false);
      }
    }, 250);
  }, []);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    setSelectedIndex(-1);
    fetchSuggestions(val);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (selectedIndex >= 0 && suggestions[selectedIndex]) {
      navigateToOeuvre(suggestions[selectedIndex]);
    } else if (searchQuery.trim()) {
      router.push(`/recherche?q=${encodeURIComponent(searchQuery.trim())}`);
      closeSearch();
    }
  };

  const navigateToOeuvre = (oeuvre) => {
    router.push(`/oeuvre/${oeuvre.documentId}`);
    closeSearch();
  };

  const closeSearch = () => {
    setSearchQuery("");
    setSearchOpen(false);
    setSuggestions([]);
    setSelectedIndex(-1);
    setMenuOpen(false);
    setProfileOpen(false);
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === "Escape") {
      closeSearch();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, -1));
    }
  };

  // Fermer les suggestions / profile dropdown quand on clique en dehors
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setSuggestions([]);
        if (searchOpen && !searchQuery) setSearchOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [searchOpen, searchQuery]);

  // Fermer la recherche quand on change de page
  useEffect(() => {
    closeSearch();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-gray-950/80 backdrop-blur-xl border-b border-gray-800/50">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25 group-hover:shadow-indigo-500/40 transition-shadow">
              <span className="text-white font-bold text-lg">T</span>
            </div>
            <span className="text-xl font-bold text-white group-hover:text-indigo-400 transition-colors">
              Trad-Index
            </span>
          </Link>

          {/* Navigation Desktop */}
          <div className="hidden md:flex items-center gap-1">
            <Link
              href="/"
              className="px-4 py-2 text-gray-300 hover:text-white hover:bg-white/5 rounded-lg font-medium transition-all"
            >
              Accueil
            </Link>
            <Link
              href="/oeuvres"
              className="px-4 py-2 text-gray-300 hover:text-white hover:bg-white/5 rounded-lg font-medium transition-all"
            >
              Catalogue
            </Link>
            <Link
              href="/teams"
              className="px-4 py-2 text-gray-300 hover:text-white hover:bg-white/5 rounded-lg font-medium transition-all flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Teams
            </Link>
            <a
              href="https://novel-index.com"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 text-gray-300 hover:text-white hover:bg-white/5 rounded-lg font-medium transition-all flex items-center gap-1"
            >
              Novel-Index
              <svg className="w-3.5 h-3.5 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>

          {/* Search Desktop */}
          <div className="hidden md:block relative" ref={searchContainerRef}>
            <form onSubmit={handleSearchSubmit} className="flex items-center">
              <div className={`flex items-center transition-all duration-300 ${searchOpen ? "w-72 bg-white/10 border border-gray-700" : "w-10"} rounded-lg overflow-hidden`}>
                <button
                  type="button"
                  onClick={() => {
                    setSearchOpen(!searchOpen);
                    if (!searchOpen) setTimeout(() => searchInputRef.current?.focus(), 100);
                    else closeSearch();
                  }}
                  className="flex-shrink-0 w-10 h-10 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                  aria-label="Rechercher"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
                {searchOpen && (
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={handleSearchChange}
                    onKeyDown={handleSearchKeyDown}
                    placeholder="Rechercher une œuvre..."
                    className="w-full bg-transparent text-white text-sm px-2 py-2 outline-none placeholder-gray-500"
                  />
                )}
              </div>
            </form>

            {/* Dropdown suggestions desktop */}
            {searchOpen && (searchQuery.trim().length >= 1) && (
              <div className="absolute top-full right-0 mt-2 w-80 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl shadow-black/50 overflow-hidden z-50">
                {suggestionsLoading ? (
                  <div className="flex items-center gap-2 px-4 py-3 text-gray-400 text-sm">
                    <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    Recherche...
                  </div>
                ) : suggestions.length > 0 ? (
                  <>
                    {suggestions.map((oeuvre, i) => {
                      const coverUrl = oeuvre.couverture?.[0]?.url || oeuvre.couverture?.url;
                      return (
                        <button
                          key={oeuvre.documentId}
                          type="button"
                          onClick={() => navigateToOeuvre(oeuvre)}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${i === selectedIndex ? "bg-indigo-500/20 text-white" : "text-gray-300 hover:bg-white/5 hover:text-white"}`}
                        >
                          <div className="w-8 h-11 rounded overflow-hidden bg-gray-800 flex-shrink-0">
                            {coverUrl ? (
                              <Image src={coverUrl} alt="" width={32} height={44} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{oeuvre.titre}</p>
                            <p className="text-xs text-gray-500 truncate">{[oeuvre.type, oeuvre.auteur].filter(Boolean).join(" — ")}</p>
                          </div>
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => { router.push(`/recherche?q=${encodeURIComponent(searchQuery.trim())}`); closeSearch(); }}
                      className="w-full px-4 py-2.5 text-sm text-indigo-400 hover:bg-white/5 text-center border-t border-gray-800 transition-colors"
                    >
                      Voir tous les résultats
                    </button>
                  </>
                ) : searchQuery.trim().length >= 1 ? (
                  <div className="px-4 py-3 text-sm text-gray-500">
                    Aucun résultat pour &quot;{searchQuery}&quot;
                  </div>
                ) : null}
              </div>
            )}
          </div>

          {/* Actions Desktop */}
          <div className="hidden md:flex items-center gap-3">
            {!isLoggedIn ? (
              <>
                <Link
                  href="/connexion"
                  className="px-4 py-2 text-gray-300 hover:text-white font-medium transition-colors"
                >
                  Connexion
                </Link>
                <Link
                  href="/connexion#inscription"
                  className="px-5 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-medium rounded-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all"
                >
                  S&apos;inscrire
                </Link>
              </>
            ) : (
              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${profileOpen ? "bg-white/10 text-white" : "text-gray-300 hover:text-white hover:bg-white/5"}`}
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center ring-2 ring-transparent group-hover:ring-indigo-500/30 transition-all">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <svg className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${profileOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Profile Dropdown */}
                {profileOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-gray-900/95 backdrop-blur-xl border border-gray-700/80 rounded-xl shadow-2xl shadow-black/50 overflow-hidden z-50">
                    {/* Header */}
                    <div className="px-4 py-3 border-b border-gray-800/80">
                      <p className="text-sm font-medium text-white">Mon compte</p>
                      <p className="text-xs text-gray-400 mt-0.5">Gérer mon profil</p>
                    </div>

                    <div className="py-1.5">
                      <Link
                        href="/profil"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
                      >
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Mon Profil
                      </Link>

                      {isRedacteur && (
                        <Link
                          href="/documentation/editeur"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
                        >
                          <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                          </svg>
                          Documentation
                        </Link>
                      )}
                    </div>

                    <div className="border-t border-gray-800/80 py-1.5">
                      <button
                        onClick={() => { handleLogout(); setProfileOpen(false); }}
                        className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Déconnexion
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bouton Menu Mobile */}
          <button
            className="md:hidden relative w-10 h-10 flex items-center justify-center rounded-lg hover:bg-white/5 transition-colors"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Menu de navigation"
            aria-expanded={menuOpen}
          >
            <div className="w-5 h-4 flex flex-col justify-between">
              <span className={`block h-0.5 bg-white rounded-full transition-all duration-300 ${menuOpen ? "rotate-45 translate-y-[7px]" : ""}`}></span>
              <span className={`block h-0.5 bg-white rounded-full transition-all duration-300 ${menuOpen ? "opacity-0 scale-0" : ""}`}></span>
              <span className={`block h-0.5 bg-white rounded-full transition-all duration-300 ${menuOpen ? "-rotate-45 -translate-y-[7px]" : ""}`}></span>
            </div>
          </button>
        </div>

        {/* Menu Mobile */}
        <div className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${menuOpen ? "max-h-[80vh] pb-4" : "max-h-0"}`}>
          <div className="pt-2 space-y-1">
            <Link href="/" className="block px-4 py-3 text-gray-300 hover:text-white hover:bg-white/5 rounded-lg font-medium transition-all" onClick={() => setMenuOpen(false)}>
              Accueil
            </Link>
            <Link href="/oeuvres" className="block px-4 py-3 text-gray-300 hover:text-white hover:bg-white/5 rounded-lg font-medium transition-all" onClick={() => setMenuOpen(false)}>
              Catalogue
            </Link>
            <Link href="/teams" className="flex items-center gap-2 px-4 py-3 text-gray-300 hover:text-white hover:bg-white/5 rounded-lg font-medium transition-all" onClick={() => setMenuOpen(false)}>
              <svg className="w-3.5 h-3.5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Teams
            </Link>
            <a href="https://novel-index.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-3 text-gray-300 hover:text-white hover:bg-white/5 rounded-lg font-medium transition-all">
              Novel-Index
              <svg className="w-3.5 h-3.5 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
            {/* Search Mobile */}
            <div className="px-4 py-2">
              <form onSubmit={handleSearchSubmit}>
                <div className="flex items-center bg-white/10 border border-gray-700 rounded-lg overflow-hidden">
                  <svg className="w-4 h-4 text-gray-400 ml-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    ref={mobileSearchRef}
                    type="text"
                    value={searchQuery}
                    onChange={handleSearchChange}
                    onKeyDown={handleSearchKeyDown}
                    placeholder="Rechercher une œuvre..."
                    className="w-full bg-transparent text-white text-sm px-3 py-2.5 outline-none placeholder-gray-500"
                  />
                </div>
              </form>
              {/* Suggestions Mobile */}
              {searchQuery.trim().length >= 1 && (
                <div className="mt-2 bg-gray-800/80 border border-gray-700 rounded-lg overflow-hidden">
                  {suggestionsLoading ? (
                    <div className="flex items-center gap-2 px-4 py-3 text-gray-400 text-sm">
                      <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                      Recherche...
                    </div>
                  ) : suggestions.length > 0 ? (
                    <>
                      {suggestions.map((oeuvre, i) => {
                        const coverUrl = oeuvre.couverture?.[0]?.url || oeuvre.couverture?.url;
                        return (
                          <button
                            key={oeuvre.documentId}
                            type="button"
                            onClick={() => navigateToOeuvre(oeuvre)}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${i === selectedIndex ? "bg-indigo-500/20 text-white" : "text-gray-300 hover:bg-white/5"}`}
                          >
                            <div className="w-8 h-11 rounded overflow-hidden bg-gray-800 flex-shrink-0">
                              {coverUrl ? (
                                <Image src={coverUrl} alt="" width={32} height={44} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{oeuvre.titre}</p>
                              <p className="text-xs text-gray-500 truncate">{[oeuvre.type, oeuvre.auteur].filter(Boolean).join(" — ")}</p>
                            </div>
                          </button>
                        );
                      })}
                      <button
                        type="button"
                        onClick={() => { router.push(`/recherche?q=${encodeURIComponent(searchQuery.trim())}`); closeSearch(); }}
                        className="w-full px-4 py-2.5 text-sm text-indigo-400 hover:bg-white/5 text-center border-t border-gray-700 transition-colors"
                      >
                        Voir tous les résultats
                      </button>
                    </>
                  ) : (
                    <div className="px-4 py-3 text-sm text-gray-500">
                      Aucun résultat pour &quot;{searchQuery}&quot;
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="border-t border-gray-800 my-2"></div>

            {!isLoggedIn ? (
              <div className="space-y-2 px-4">
                <Link href="/connexion" className="block py-3 text-gray-300 hover:text-white font-medium transition-all text-center" onClick={() => setMenuOpen(false)}>
                  Connexion
                </Link>
                <Link href="/connexion#inscription" className="block py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium rounded-lg text-center" onClick={() => setMenuOpen(false)}>
                  S&apos;inscrire
                </Link>
              </div>
            ) : (
              <div className="mx-3 rounded-xl bg-gray-800/50 border border-gray-700/50 overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-700/50">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                    <svg className="w-4.5 h-4.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">Mon compte</p>
                    <p className="text-xs text-gray-400">Gérer mon profil</p>
                  </div>
                </div>
                <Link href="/profil" className="flex items-center gap-3 px-4 py-3 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors" onClick={() => setMenuOpen(false)}>
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Mon Profil
                </Link>
                {isRedacteur && (
                  <Link href="/documentation/editeur" className="flex items-center gap-3 px-4 py-3 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors" onClick={() => setMenuOpen(false)}>
                    <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    Documentation
                  </Link>
                )}
                <div className="border-t border-gray-700/50">
                  <button
                    onClick={() => { handleLogout(); setMenuOpen(false); }}
                    className="flex items-center gap-3 w-full px-4 py-3 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Déconnexion
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}
