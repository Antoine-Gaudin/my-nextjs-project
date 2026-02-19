"use client";

import { useState } from "react";
import Cookies from "js-cookie";
import { useRouter } from "next/navigation";

export default function NavProfil({ onMenuSelect, user, activeMenu }) {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const isAdmin = user?.email === "agaudin76@gmail.com";

  const menuItems = [
    { key: "profil", label: "Profil", icon: "👤", show: true },
    { key: "editions", label: "Page Édition", icon: "✍️", show: !!user?.redacteur },
    { key: "dashboard", label: "Dashboard", icon: "📊", show: !!user?.redacteur },
    { key: "teams", label: "Mes Teams", icon: "👥", show: true },
    { key: "comparatif", label: "Comparatif Index", icon: "📋", show: isAdmin },
    { key: "parametre", label: "Paramètre", icon: "⚙️", show: true },
  ];

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
          aria-label={isMenuOpen ? "Fermer le menu profil" : "Ouvrir le menu profil"}
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

        <nav aria-label="Menu profil" className="p-4 space-y-2">
          {menuItems.filter((item) => item.show).map((item) => (
            <button
              key={item.key}
              onClick={() => onMenuSelect(item.key)}
              className={`w-full text-left px-4 py-2 rounded-lg transition ${
                activeMenu === item.key
                  ? "bg-indigo-600 text-white"
                  : "hover:bg-indigo-600/50 text-gray-300"
              }`}
            >
              {item.icon} {item.label}
            </button>
          ))}
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
