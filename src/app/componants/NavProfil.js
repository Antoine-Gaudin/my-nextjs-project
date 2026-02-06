"use client";

import { useState } from "react";
import Cookies from "js-cookie";
import { useRouter } from "next/navigation";

export default function NavProfil({ onMenuSelect, user }) {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = () => {
    Cookies.remove("jwt");
    Cookies.remove("userInfo");
    setTimeout(() => {
      router.push("/");
      window.location.reload();
    }, 100);
  };

  return (
    <div className="relative">
      {/* Mobile toggle */}
      <div className="md:hidden flex justify-end mb-4">
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg shadow transition duration-200"
        >
          {isMenuOpen ? "✖ Fermer" : "☰ Menu"}
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={`w-full md:w-64 bg-gray-900 text-white shadow-xl rounded-lg overflow-hidden md:block transition-all duration-300 ${
          isMenuOpen ? "block" : "hidden md:block"
        }`}
      >
        <div className="bg-gray-800 py-4 px-6 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-center">Menu Profil</h2>
        </div>

        <nav className="p-4 space-y-2">
          <button
            onClick={() => onMenuSelect("profil")}
            className="w-full text-left px-4 py-2 rounded-lg hover:bg-indigo-600 transition"
          >
            👤 Profil
          </button>
          {/* ✅ Bouton Édition si rédacteur */}
          {user?.redacteur && (
            <button
              onClick={() => onMenuSelect("editions")}
              className="w-full text-left px-4 py-2 rounded-lg hover:bg-indigo-600 transition"
            >
              ✍️ Page Édition
            </button>
          )}

          <button
            onClick={() => onMenuSelect("teams")}
            className="w-full text-left px-4 py-2 rounded-lg hover:bg-indigo-600 transition"
          >
            👥 Mes Teams
          </button>
          <button
            onClick={() => onMenuSelect("parametre")}
            className="w-full text-left px-4 py-2 rounded-lg hover:bg-indigo-600 transition"
          >
            ⚙️ Paramètre
          </button>
          <hr className="border-gray-700 my-2" />

          <button
            onClick={handleLogout}
            className="w-full text-left px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-semibold transition"
          >
            🚪 Déconnexion
          </button>
        </nav>
      </aside>
    </div>
  );
}
