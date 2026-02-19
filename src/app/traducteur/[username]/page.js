"use client";

import { useState, useEffect, use } from "react";
import Image from "next/image";
import Link from "next/link";

export default function TraducteurPage({ params }) {
  const { username } = use(params);
  const decodedUsername = decodeURIComponent(username);

  const [translator, setTranslator] = useState(null);
  const [teams, setTeams] = useState([]);
  const [oeuvres, setOeuvres] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTranslatorData = async () => {
      try {
        // Chercher l'utilisateur par username
        const userRes = await fetch(
          `/api/proxy/users?filters[username][$eq]=${encodeURIComponent(decodedUsername)}&fields[0]=id&fields[1]=username&fields[2]=email&fields[3]=redacteur&fields[4]=createdAt`
        );
        const users = await userRes.json();
        const user = Array.isArray(users) ? users[0] : users?.data?.[0];
        
        if (!user) {
          setError("Traducteur introuvable");
          setIsLoading(false);
          return;
        }
        
        setTranslator(user);

        // Récupérer les teams où l'utilisateur est owner ou membre
        const teamsRes = await fetch(
          `/api/proxy/teams?filters[$or][0][owner][id][$eq]=${user.id}&filters[$or][1][membres][id][$eq]=${user.id}&filters[isPublic][$eq]=true&populate[logo][fields][0]=url&populate[oeuvres][fields][0]=titre&populate[oeuvres][fields][1]=documentId&populate[membres][fields][0]=id`
        );
        const teamsData = await teamsRes.json();
        setTeams(teamsData.data || []);

        // Récupérer les oeuvres de l'utilisateur
        const oeuvresRes = await fetch(
          `/api/proxy/oeuvres?filters[redactpitre][$eq]=${user.id}&populate[couverture][fields][0]=url&populate[chapitres][fields][0]=documentId&fields[0]=titre&fields[1]=documentId&fields[2]=synopsis&fields[3]=categorie`
        );
        const oeuvresData = await oeuvresRes.json();
        setOeuvres(oeuvresData.data || []);
      } catch (err) {
        console.error("Erreur fetch traducteur:", err);
        setError("Erreur lors du chargement du profil");
      } finally {
        setIsLoading(false);
      }
    };

    fetchTranslatorData();
  }, [decodedUsername]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400">Chargement du profil...</p>
        </div>
      </div>
    );
  }

  if (error || !translator) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-4">Traducteur introuvable</h1>
          <p className="text-gray-400 mb-8">L&apos;utilisateur &quot;{decodedUsername}&quot; n&apos;existe pas.</p>
          <Link
            href="/oeuvres"
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-colors font-medium"
          >
            Retour au catalogue
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-900 to-purple-900 py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <Link href="/" className="inline-flex items-center gap-2 text-gray-300 hover:text-white mb-6 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
            Retour
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
              <span className="text-3xl font-bold text-white">{translator.username?.[0]?.toUpperCase() || "T"}</span>
            </div>
            <div>
              <h1 className="text-4xl sm:text-5xl font-bold mb-2">{translator.username}</h1>
              <p className="text-gray-300">
                {translator.redacteur ? "Traducteur / Rédacteur" : "Membre"} 
                {translator.createdAt && ` · Membre depuis ${new Date(translator.createdAt).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' })}`}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-gray-800/30 rounded-xl p-4 text-center">
            <p className="text-3xl font-bold text-indigo-400">{teams.length}</p>
            <p className="text-gray-400 text-sm">Teams</p>
          </div>
          <div className="bg-gray-800/30 rounded-xl p-4 text-center">
            <p className="text-3xl font-bold text-purple-400">{oeuvres.length}</p>
            <p className="text-gray-400 text-sm">Œuvres</p>
          </div>
          <div className="bg-gray-800/30 rounded-xl p-4 text-center">
            <p className="text-3xl font-bold text-pink-400">
              {oeuvres.reduce((acc, o) => acc + (o.chapitres?.length || 0), 0)}
            </p>
            <p className="text-gray-400 text-sm">Chapitres</p>
          </div>
        </div>

        {/* Teams */}
        {teams.length > 0 && (
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-white mb-4">Teams</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {teams.map((team) => (
                <Link
                  key={team.documentId}
                  href={`/team/${team.slug}`}
                  className="flex items-center gap-4 p-4 bg-gray-800/30 hover:bg-gray-800/50 border border-gray-700/30 hover:border-indigo-600/30 rounded-xl transition-all"
                >
                  {team.logo?.[0]?.url ? (
                    <Image src={team.logo[0].url} alt={team.nom} className="w-12 h-12 rounded-xl object-cover" width={48} height={48} />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
                      <span className="text-lg font-bold">{team.nom?.[0]?.toUpperCase() || "T"}</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-semibold truncate">{team.nom}</h3>
                    <p className="text-gray-400 text-sm">{team.oeuvres?.length || 0} œuvres · {(team.membres?.length || 0) + 1} membres</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Oeuvres */}
        {oeuvres.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Œuvres</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {oeuvres.map((oeuvre) => (
                <Link
                  key={oeuvre.documentId}
                  href={`/oeuvre/${oeuvre.documentId}`}
                  className="group bg-gray-800/30 hover:bg-gray-800/50 border border-gray-700/30 hover:border-indigo-600/30 rounded-xl overflow-hidden transition-all"
                >
                  {oeuvre.couverture?.[0]?.url ? (
                    <Image
                      src={oeuvre.couverture[0].url}
                      alt={oeuvre.titre}
                      className="w-full h-48 object-cover"
                      width={400}
                      height={192}
                    />
                  ) : (
                    <div className="w-full h-48 bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center">
                      <span className="text-gray-500 text-4xl">📚</span>
                    </div>
                  )}
                  <div className="p-4">
                    <h3 className="text-white font-semibold group-hover:text-indigo-400 transition-colors truncate">{oeuvre.titre}</h3>
                    <div className="flex items-center gap-2 mt-2 text-sm text-gray-400">
                      {oeuvre.categorie && <span className="px-2 py-0.5 bg-gray-700/50 rounded-md text-xs">{oeuvre.categorie}</span>}
                      <span>{oeuvre.chapitres?.length || 0} chapitres</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {teams.length === 0 && oeuvres.length === 0 && (
          <div className="text-center py-16">
            <p className="text-gray-400 text-lg">Ce traducteur n&apos;a pas encore de contenu public.</p>
          </div>
        )}
      </div>
    </div>
  );
}

