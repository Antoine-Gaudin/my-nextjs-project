"use client";

import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import { useRouter } from "next/navigation";

// Polices personnalisées
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({ children }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false); // État de connexion
  const [menuOpen, setMenuOpen] = useState(false); // État du menu responsive
  const router = useRouter();

  useEffect(() => {
    // Vérifie si le JWT est présent dans les cookies
    const jwt = Cookies.get("jwt");
    setIsLoggedIn(!!jwt);
  }, []);

  const handleLogout = () => {
    // Supprime le JWT des cookies
    Cookies.remove("jwt");
    setIsLoggedIn(false);
    router.push("/connexion"); // Redirige vers la page de connexion
  };

  return (
    <html lang="fr" className={`${geistSans.variable} ${geistMono.variable}`}>
      <head>
        {/* Balises meta de base */}
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="description" content="Trad-Index - Plateforme d'indexation collaborative des traductions." />
        <meta name="keywords" content="traductions, index, œuvres, Trad-Index" />
        <meta name="author" content="Trad-Index" />
        <title>Trad-Index</title>
      </head>
      <body className="bg-gray-900 text-white">
        {/* Header - Navbar Moderne */}
        <header className="fixed top-0 left-0 right-0 z-50 bg-gray-950/80 backdrop-blur-xl border-b border-gray-800/50">
          <nav className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex justify-between items-center h-16">
              {/* Logo */}
              <div 
                className="flex items-center gap-3 cursor-pointer group"
                onClick={() => router.push("/")}
              >
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25 group-hover:shadow-indigo-500/40 transition-shadow">
                  <span className="text-white font-bold text-lg">T</span>
                </div>
                <span className="text-xl font-bold text-white group-hover:text-indigo-400 transition-colors">
                  Trad-Index
                </span>
              </div>

              {/* Navigation Desktop */}
              <div className="hidden md:flex items-center gap-1">
                <a
                  href="/"
                  className="px-4 py-2 text-gray-300 hover:text-white hover:bg-white/5 rounded-lg font-medium transition-all"
                >
                  Accueil
                </a>
                <a
                  href="/oeuvres"
                  className="px-4 py-2 text-gray-300 hover:text-white hover:bg-white/5 rounded-lg font-medium transition-all"
                >
                  Catalogue
                </a>
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

              {/* Actions Desktop */}
              <div className="hidden md:flex items-center gap-3">
                {!isLoggedIn ? (
                  <>
                    <a
                      href="/connexion"
                      className="px-4 py-2 text-gray-300 hover:text-white font-medium transition-colors"
                    >
                      Connexion
                    </a>
                    <a
                      href="/inscription"
                      className="px-5 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-medium rounded-lg shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all"
                    >
                      S&apos;inscrire
                    </a>
                  </>
                ) : (
                  <>
                    <a
                      href="/profil"
                      className="flex items-center gap-2 px-4 py-2 text-gray-300 hover:text-white hover:bg-white/5 rounded-lg font-medium transition-all"
                    >
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      Mon Profil
                    </a>
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
                aria-label="Menu"
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
                <a
                  href="/"
                  className="block px-4 py-3 text-gray-300 hover:text-white hover:bg-white/5 rounded-lg font-medium transition-all"
                  onClick={() => setMenuOpen(false)}
                >
                  Accueil
                </a>
                <a
                  href="/oeuvres"
                  className="block px-4 py-3 text-gray-300 hover:text-white hover:bg-white/5 rounded-lg font-medium transition-all"
                  onClick={() => setMenuOpen(false)}
                >
                  Catalogue
                </a>
                <a
                  href="https://novel-index.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-3 text-gray-300 hover:text-white hover:bg-white/5 rounded-lg font-medium transition-all"
                >
                  Novel-Index
                  <svg className="w-3.5 h-3.5 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
                
                <div className="border-t border-gray-800 my-2"></div>
                
                {!isLoggedIn ? (
                  <>
                    <a
                      href="/connexion"
                      className="block px-4 py-3 text-gray-300 hover:text-white hover:bg-white/5 rounded-lg font-medium transition-all"
                      onClick={() => setMenuOpen(false)}
                    >
                      Connexion
                    </a>
                    <a
                      href="/inscription"
                      className="block mx-4 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium rounded-lg text-center"
                      onClick={() => setMenuOpen(false)}
                    >
                      S&apos;inscrire
                    </a>
                  </>
                ) : (
                  <>
                    <a
                      href="/profil"
                      className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:text-white hover:bg-white/5 rounded-lg font-medium transition-all"
                      onClick={() => setMenuOpen(false)}
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      Mon Profil
                    </a>
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

        {/* Spacer pour compenser le header fixe */}
        <div className="h-16"></div>

        {/* Main content */}
        <main className="min-h-screen">{children}</main>

        {/* Footer Moderne */}
        <footer className="bg-gray-950 border-t border-gray-800/50">
          {/* Section principale */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
              
              {/* Colonne Marque */}
              <div className="lg:col-span-1">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
                    <span className="text-white font-bold text-xl">T</span>
                  </div>
                  <span className="text-xl font-bold text-white">Trad-Index</span>
                </div>
                <p className="text-gray-400 text-sm leading-relaxed mb-4">
                  Plateforme d&apos;indexation collaborative dédiée aux traductions de light novels, web novels et mangas.
                </p>
                {/* Réseaux sociaux */}
                <div className="flex gap-3">
                  <a 
                    href="https://discord.gg/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-9 h-9 rounded-lg bg-gray-800 hover:bg-indigo-600 flex items-center justify-center text-gray-400 hover:text-white transition-all"
                    aria-label="Discord"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                    </svg>
                  </a>
                  <a 
                    href="https://twitter.com/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-9 h-9 rounded-lg bg-gray-800 hover:bg-sky-500 flex items-center justify-center text-gray-400 hover:text-white transition-all"
                    aria-label="Twitter"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                  </a>
                  <a 
                    href="https://github.com/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-9 h-9 rounded-lg bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition-all"
                    aria-label="GitHub"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
                    </svg>
                  </a>
                </div>
              </div>

              {/* Colonne Navigation */}
              <div>
                <h3 className="text-white font-semibold mb-4">Navigation</h3>
                <ul className="space-y-3">
                  <li>
                    <a href="/" className="text-gray-400 hover:text-white text-sm transition-colors">
                      Accueil
                    </a>
                  </li>
                  <li>
                    <a href="/oeuvres" className="text-gray-400 hover:text-white text-sm transition-colors">
                      Catalogue
                    </a>
                  </li>
                  <li>
                    <a href="/profil" className="text-gray-400 hover:text-white text-sm transition-colors">
                      Mon Profil
                    </a>
                  </li>
                </ul>
              </div>

              {/* Colonne Catégories */}
              <div>
                <h3 className="text-white font-semibold mb-4">Catégories</h3>
                <ul className="space-y-3">
                  <li>
                    <a href="/oeuvres?category=Light Novel" className="text-gray-400 hover:text-white text-sm transition-colors">
                      Light Novels
                    </a>
                  </li>
                  <li>
                    <a href="/oeuvres?category=Web Novel" className="text-gray-400 hover:text-white text-sm transition-colors">
                      Web Novels
                    </a>
                  </li>
                  <li>
                    <a href="/oeuvres?category=Manga" className="text-gray-400 hover:text-white text-sm transition-colors">
                      Mangas
                    </a>
                  </li>
                  <li>
                    <a href="/oeuvres?category=Manhwa" className="text-gray-400 hover:text-white text-sm transition-colors">
                      Manhwa
                    </a>
                  </li>
                </ul>
              </div>

              {/* Colonne Partenaires */}
              <div>
                <h3 className="text-white font-semibold mb-4">Partenaires</h3>
                <ul className="space-y-3">
                  <li>
                    <a 
                      href="https://novel-index.com" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-white text-sm transition-colors inline-flex items-center gap-1"
                    >
                      Novel-Index
                      <svg className="w-3 h-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Barre inférieure */}
          <div className="border-t border-gray-800/50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <p className="text-gray-500 text-sm">
                  © {new Date().getFullYear()} Trad-Index. Tous droits réservés.
                </p>
                <div className="flex items-center gap-6">
                  <a href="#" className="text-gray-500 hover:text-gray-300 text-sm transition-colors">
                    Mentions légales
                  </a>
                  <a href="#" className="text-gray-500 hover:text-gray-300 text-sm transition-colors">
                    Confidentialité
                  </a>
                  <a href="#" className="text-gray-500 hover:text-gray-300 text-sm transition-colors">
                    Contact
                  </a>
                </div>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
