"use client";

import { useState, useEffect } from "react";
import Cookies from "js-cookie";
import { useRouter } from "next/navigation";

import NavProfil from "../componants/NavProfil";
import Profil from "../componants/Profil";
import Parametre from "../componants/Parametres";
import Editions from "../componants/Editions";
import Teams from "../componants/Teams";

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
      case "teams":
        return <Teams user={user} />;
      case "profil":
      default:
        return <Profil user={user} />;
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-full">
      <div>
        <NavProfil onMenuSelect={setActiveMenu} user={user} />
      </div>
      <main className="flex-grow bg-gray-900 text-white p-8">
        {renderContent()}
      </main>
    </div>
  );
}
