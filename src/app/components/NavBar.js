"use client";

import { useEffect, useState, useCallback } from "react";
import Cookies from "js-cookie";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

export default function NavBar() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isRedacteur, setIsRedacteur] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
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
            {isRedacteur && (
              <Link
                href="/documentation/editeur"
                className="px-4 py-2 text-gray-300 hover:text-white hover:bg-white/5 rounded-lg font-medium transition-all flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                Documentation
              </Link>
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
              <>
                <Link
                  href="/profil"
                  className="flex items-center gap-2 px-4 py-2 text-gray-300 hover:text-white hover:bg-white/5 rounded-lg font-medium transition-all"
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  Mon Profil
                </Link>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg font-medium transition-all"
                >
                  Déconnexion
                </button>
              </>
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
        <div className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${menuOpen ? "max-h-96 pb-4" : "max-h-0"}`}>
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
            {isRedacteur && (
              <Link href="/documentation/editeur" className="flex items-center gap-2 px-4 py-3 text-gray-300 hover:text-white hover:bg-white/5 rounded-lg font-medium transition-all" onClick={() => setMenuOpen(false)}>
                <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                Documentation
              </Link>
            )}
            <div className="border-t border-gray-800 my-2"></div>

            {!isLoggedIn ? (
              <>
                <Link href="/connexion" className="block px-4 py-3 text-gray-300 hover:text-white hover:bg-white/5 rounded-lg font-medium transition-all" onClick={() => setMenuOpen(false)}>
                  Connexion
                </Link>
                <Link href="/connexion#inscription" className="block mx-4 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium rounded-lg text-center" onClick={() => setMenuOpen(false)}>
                  S&apos;inscrire
                </Link>
              </>
            ) : (
              <>
                <Link href="/profil" className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:text-white hover:bg-white/5 rounded-lg font-medium transition-all" onClick={() => setMenuOpen(false)}>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  Mon Profil
                </Link>
                <button
                  onClick={() => { handleLogout(); setMenuOpen(false); }}
                  className="w-full text-left px-4 py-3 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg font-medium transition-all"
                >
                  Déconnexion
                </button>
              </>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}
