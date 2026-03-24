"use client";

import { useState } from "react";
import Cookies from "js-cookie";
import { useRouter } from "next/navigation";

const MENU_SECTIONS = [
  {
    label: null,
    items: [
      {
        key: "profil",
        label: "Profil",
        icon: (
          <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        ),
        show: () => true,
      },
      {
        key: "teams",
        label: "Mes Teams",
        icon: (
          <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        ),
        show: () => true,
      },
      {
        key: "parametre",
        label: "Paramètres",
        icon: (
          <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        ),
        show: () => true,
      },
    ],
  },
  {
    label: "Rédaction",
    items: [
      {
        key: "editions",
        label: "Page Édition",
        icon: (
          <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        ),
        show: (user) => !!user?.redacteur,
      },
      {
        key: "dashboard",
        label: "Dashboard",
        icon: (
          <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        ),
        show: (user) => !!user?.redacteur,
      },
      {
        key: "documentation",
        label: "Documentation",
        icon: (
          <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        ),
        show: (user) => !!user?.redacteur,
        href: "/documentation/editeur",
      },
    ],
  },
  {
    label: "Administration",
    items: [
      {
        key: "comparatif",
        label: "Comparatif Index",
        icon: (
          <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
        ),
        show: (user) => user?.email === "agaudin76@gmail.com",
      },
    ],
  },
];

export default function NavProfil({ onMenuSelect, user, activeMenu }) {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    Cookies.remove("jwt");
    Cookies.remove("userInfo");
    window.dispatchEvent(new Event("auth-change"));
    setTimeout(() => {
      router.push("/");
    }, 100);
  };

  const handleSelect = (item) => {
    if (item.href) {
      router.push(item.href);
    } else {
      onMenuSelect(item.key);
    }
    setMobileOpen(false);
  };

  const initials = user?.username
    ? user.username.slice(0, 2).toUpperCase()
    : "?";

  const visibleSections = MENU_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => item.show(user)),
  })).filter((section) => section.items.length > 0);

  const sidebarContent = (
    <>
      {/* User card */}
      <div className="p-5 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 flex-shrink-0">
            <span className="text-white font-bold text-sm">{initials}</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{user?.username || "Utilisateur"}</p>
            <p className="text-xs text-gray-400 truncate">{user?.email || ""}</p>
          </div>
        </div>
      </div>

      <div className="h-px bg-gradient-to-r from-transparent via-gray-700/60 to-transparent mx-4" />

      {/* Menu sections */}
      <nav aria-label="Menu profil" className="p-3 flex-1 space-y-1">
        {visibleSections.map((section, si) => (
          <div key={si}>
            {section.label && (
              <p className="px-3 pt-4 pb-1.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                {section.label}
              </p>
            )}
            {section.items.map((item) => {
              const isActive = !item.href && activeMenu === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => handleSelect(item)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group ${
                    isActive
                      ? "bg-indigo-500/15 text-indigo-300"
                      : "text-gray-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <span className={`flex-shrink-0 transition-colors ${isActive ? "text-indigo-400" : "text-gray-500 group-hover:text-gray-300"}`}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                  {isActive && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400" />
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Logout */}
      <div className="p-3 pt-0">
        <div className="h-px bg-gradient-to-r from-transparent via-gray-700/60 to-transparent mb-3" />
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-150 group"
        >
          <svg className="w-[18px] h-[18px] text-gray-500 group-hover:text-red-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span>Déconnexion</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile toggle */}
      <div className="md:hidden mb-4">
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="w-full flex items-center justify-between px-4 py-3 bg-gray-800/60 border border-gray-700/50 rounded-xl text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-800/80 transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <span className="text-white font-bold text-xs">{initials}</span>
            </div>
            <span>Menu Profil</span>
          </div>
          <svg className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${mobileOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-gray-900/50 border-r border-gray-800/60 min-h-[calc(100vh-4rem)]">
        {sidebarContent}
      </aside>

      {/* Mobile panel */}
      {mobileOpen && (
        <div className="md:hidden mb-4 bg-gray-900/80 border border-gray-700/50 rounded-xl overflow-hidden backdrop-blur-sm">
          {sidebarContent}
        </div>
      )}
    </>
  );
}
