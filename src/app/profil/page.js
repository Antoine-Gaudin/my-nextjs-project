"use client";

import { useState, useEffect } from "react";
import Cookies from "js-cookie";
import { useRouter } from "next/navigation";

import dynamic from "next/dynamic";
import NavProfil from "../components/NavProfil";
import Profil from "../components/Profil";

// Dynamic imports — ces composants lourds ne sont chargés que quand l'onglet est actif
const Parametre = dynamic(() => import("../components/Parametres"), { ssr: false });
const Editions = dynamic(() => import("../components/Editions"), { ssr: false });
const Teams = dynamic(() => import("../components/Teams"), { ssr: false });
const DashboardTraducteur = dynamic(() => import("../components/DashboardTraducteur"), { ssr: false });
const AdminComparatif = dynamic(() => import("../components/AdminComparatif"), { ssr: false });

export default function ProfilPage() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeMenu, setActiveMenu] = useState("profil");

  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      const jwt = Cookies.get("jwt");
      if (!jwt) {
        router.push("/");
        return;
      }

      try {
        const res = await fetch(`/api/proxy/users/me`, {
          headers: {
            Authorization: `Bearer ${jwt}`,
          },
          cache: "no-store",
        });

        if (!res.ok) {
          router.push("/");
          return;
        }

        const data = await res.json();
        setUser(data);
      } catch (err) {
        console.error("Erreur utilisateur :", err);
        router.push("/");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, [router]);

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-gray-900 text-white gap-4">
        <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
        <p className="text-gray-400">Chargement du profil...</p>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeMenu) {
      case "parametre":
        return <Parametre user={user} setUser={setUser} onMenuSelect={setActiveMenu} />;
      case "editions":
        return <Editions user={user} />;
      case "dashboard":
        return <DashboardTraducteur user={user} />;
      case "teams":
        return <Teams user={user} />;
      case "comparatif":
        return <AdminComparatif user={user} />;
      case "profil":
      default:
        return <Profil user={user} />;
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-full">
      <div>
        <NavProfil onMenuSelect={setActiveMenu} user={user} activeMenu={activeMenu} />
      </div>
      <main className="flex-grow bg-gray-900 text-white p-8">
        {renderContent()}
      </main>
    </div>
  );
}
