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
        {/* Header */}
        <header className="bg-black bg-opacity-80 text-white py-4">
          <nav className="max-w-7xl mx-auto px-4 flex justify-between items-center">
            <h1
              className="text-xl font-bold cursor-pointer hover:text-gray-400 transition duration-300"
              onClick={() => router.push("/")}
            >
              Trad-Index
            </h1>
            {/* Menu pour écrans larges */}
            <ul className={`hidden md:flex space-x-4 items-center`}>
              <li>
                <a
                  href="/"
                  className="text-white font-bold no-underline hover:text-gray-400 transition duration-300"
                >
                  Accueil
                </a>
              </li>
              <li>
                <a
                  href="/oeuvres"
                  className="text-white font-bold no-underline hover:text-gray-400 transition duration-300"
                >
                  Œuvres
                </a>
              </li>
              {!isLoggedIn ? (
                <>
                  <li>
                    <a
                      href="/inscription"
                      className="text-white font-bold no-underline hover:text-gray-400 transition duration-300"
                    >
                      Inscription
                    </a>
                  </li>
                  <li>
                    <a
                      href="/connexion"
                      className="text-white font-bold no-underline hover:text-gray-400 transition duration-300"
                    >
                      Connexion
                    </a>
                  </li>
                </>
              ) : (
                <>
                  <li>
                    <a
                      href="/profil"
                      className="text-white font-bold no-underline hover:text-gray-400 transition duration-300"
                    >
                      Profil
                    </a>
                  </li>
                  <li>
                    <button
                      onClick={handleLogout}
                      className="bg-red-500 hover:bg-red-600 text-white py-1 px-3 rounded transition duration-300"
                    >
                      Déconnexion
                    </button>
                  </li>
                </>
              )}
            </ul>

            {/* Menu hamburger pour petits écrans */}
            <button
              className="md:hidden text-white focus:outline-none"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? "✖" : "☰"}
            </button>
          </nav>

          {/* Menu déroulant pour petits écrans */}
          {menuOpen && (
            <ul className="md:hidden flex flex-col space-y-2 mt-2 px-4">
              <li>
                <a
                  href="/"
                  className="block text-white font-bold no-underline hover:text-gray-400 transition duration-300"
                >
                  Accueil
                </a>
              </li>
              <li>
                <a
                  href="/oeuvres"
                  className="block text-white font-bold no-underline hover:text-gray-400 transition duration-300"
                >
                  Œuvres
                </a>
              </li>
              {!isLoggedIn ? (
                <>
                  <li>
                    <a
                      href="/inscription"
                      className="block text-white font-bold no-underline hover:text-gray-400 transition duration-300"
                    >
                      Inscription
                    </a>
                  </li>
                  <li>
                    <a
                      href="/connexion"
                      className="block text-white font-bold no-underline hover:text-gray-400 transition duration-300"
                    >
                      Connexion
                    </a>
                  </li>
                </>
              ) : (
                <>
                  <li>
                    <a
                      href="/profil"
                      className="block text-white font-bold no-underline hover:text-gray-400 transition duration-300"
                    >
                      Profil
                    </a>
                  </li>
                  <li>
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left bg-red-500 hover:bg-red-600 text-white py-1 px-3 rounded transition duration-300"
                    >
                      Déconnexion
                    </button>
                  </li>
                </>
              )}
            </ul>
          )}
        </header>

        {/* Main content */}
        <main className="min-h-screen">{children}</main>

        {/* Footer */}
        <footer className="bg-gray-800 text-gray-400 py-4 mt-8">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center">
            <p>&copy; {new Date().getFullYear()} Trad-Index. Tous droits réservés.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
