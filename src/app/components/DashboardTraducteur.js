"use client";

import { useState, useEffect, useCallback } from "react";
import Cookies from "js-cookie";

export default function DashboardTraducteur({ user }) {
  const [oeuvres, setOeuvres] = useState([]);
  const [trackingData, setTrackingData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState("30"); // jours
  const [selectedOeuvre, setSelectedOeuvre] = useState("all");

  const fetchData = useCallback(async () => {
    const jwt = Cookies.get("jwt");
    if (!jwt || !user?.id) return;

    setIsLoading(true);
    try {
      // 1. Récupérer les œuvres de l'utilisateur (sans populate complet de chapitres pour éviter 502)
      const oRes = await fetch(
        `/api/proxy/oeuvres?filters[users][id][$eq]=${user.id}&populate[couverture][fields][0]=url&populate[chapitres][fields][0]=documentId&populate[chapitres][fields][1]=publishedAt&pagination[pageSize]=100`,
        { headers: { Authorization: `Bearer ${jwt}` } }
      );
      const oData = await oRes.json();
      const userOeuvres = oData.data || [];
      setOeuvres(userOeuvres);

      // 2. Récupérer les stats de tracking pour toutes les œuvres
      if (userOeuvres.length > 0) {
        const oeuvreIds = userOeuvres.map((o) => o.documentId);
        const params = oeuvreIds.map((id) => `oeuvreId=${id}`).join("&");
        const tRes = await fetch(`/api/tracking?${params}`, {
          headers: { Authorization: `Bearer ${jwt}` },
        });
        const tData = await tRes.json();
        setTrackingData(tData.data || []);
      }
    } catch (err) {
      console.error("Erreur dashboard:", err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filtrer par période
  const filterByPeriod = (data) => {
    if (period === "all") return data;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - parseInt(period));
    return data.filter((d) => new Date(d.createdAt) >= cutoff);
  };

  // Calculs des stats
  const filteredTracking = filterByPeriod(trackingData);

  const getStatsForOeuvre = (oeuvreDocId) => {
    const data = oeuvreDocId === "all"
      ? filteredTracking
      : filteredTracking.filter((d) => d.oeuvreId === oeuvreDocId);

    return {
      vues: data.filter((d) => d.type === "vue").length,
      likes: data.filter((d) => d.type === "like").length,
      abonnes: data.filter((d) => d.type === "abonne").length,
    };
  };

  // Stats par jour pour le graphique
  const getDailyStats = () => {
    const days = parseInt(period) || 30;
    const dailyMap = {};
    
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      dailyMap[key] = { vues: 0, likes: 0, abonnes: 0 };
    }

    const data = selectedOeuvre === "all"
      ? filteredTracking
      : filteredTracking.filter((d) => d.oeuvreId === selectedOeuvre);

    data.forEach((item) => {
      const key = new Date(item.createdAt).toISOString().split("T")[0];
      if (dailyMap[key]) {
        if (item.type === "vue") dailyMap[key].vues++;
        else if (item.type === "like") dailyMap[key].likes++;
        else if (item.type === "abonne") dailyMap[key].abonnes++;
      }
    });

    return Object.entries(dailyMap).map(([date, stats]) => ({
      date,
      label: new Date(date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }),
      ...stats,
    }));
  };

  // Stats globales
  const globalStats = getStatsForOeuvre(selectedOeuvre);
  const totalChapitres = oeuvres.reduce((acc, o) => acc + (o.chapitres?.length || 0), 0);
  const dailyStats = period !== "all" ? getDailyStats() : [];

  // Max pour le graphique
  const maxValue = Math.max(1, ...dailyStats.map((d) => d.vues + d.likes + d.abonnes));

  // Top œuvres par vues
  const topOeuvres = oeuvres
    .map((o) => ({
      ...o,
      stats: getStatsForOeuvre(o.documentId),
    }))
    .sort((a, b) => b.stats.vues - a.stats.vues);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400">Chargement du dashboard...</p>
        </div>
      </div>
    );
  }

  if (oeuvres.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gray-800 flex items-center justify-center">
          <svg className="w-10 h-10 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">Pas encore de données</h3>
        <p className="text-gray-400">Créez votre première œuvre pour voir vos statistiques ici</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            Dashboard
          </h2>
          <p className="text-gray-400 mt-1">Statistiques de vos œuvres</p>
        </div>

        <div className="flex gap-3">
          {/* Filtre œuvre */}
          <select
            value={selectedOeuvre}
            onChange={(e) => setSelectedOeuvre(e.target.value)}
            className="px-3 py-2 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white text-sm outline-none cursor-pointer"
          >
            <option value="all">Toutes les œuvres</option>
            {oeuvres.map((o) => (
              <option key={o.documentId} value={o.documentId}>
                {o.titre || o.Titre || "Sans titre"}
              </option>
            ))}
          </select>

          {/* Filtre période */}
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-3 py-2 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white text-sm outline-none cursor-pointer"
          >
            <option value="7">7 jours</option>
            <option value="30">30 jours</option>
            <option value="90">90 jours</option>
            <option value="all">Tout</option>
          </select>
        </div>
      </div>

      {/* Cartes stats globales */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-gray-800/30 border border-gray-700/40 rounded-xl p-4 hover:border-blue-500/40 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{globalStats.vues}</p>
              <p className="text-xs text-gray-400">Vues</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-800/30 border border-gray-700/40 rounded-xl p-4 hover:border-pink-500/40 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-pink-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{globalStats.likes}</p>
              <p className="text-xs text-gray-400">Likes</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-800/30 border border-gray-700/40 rounded-xl p-4 hover:border-green-500/40 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{globalStats.abonnes}</p>
              <p className="text-xs text-gray-400">Abonnés</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-800/30 border border-gray-700/40 rounded-xl p-4 hover:border-amber-500/40 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{totalChapitres}</p>
              <p className="text-xs text-gray-400">Chapitres</p>
            </div>
          </div>
        </div>
      </div>

      {/* Graphique d'activité */}
      {period !== "all" && dailyStats.length > 0 && (
        <div className="bg-gray-800/30 border border-gray-700/40 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
            Activité sur {period} jours
          </h3>

          {/* Légende */}
          <div className="flex gap-4 mb-4 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-blue-500"></span>
              Vues
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-pink-500"></span>
              Likes
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-green-500"></span>
              Abonnés
            </span>
          </div>

          {/* Barres */}
          <div className="flex items-end gap-[2px] h-40 overflow-x-auto">
            {dailyStats.map((day, i) => {
              const total = day.vues + day.likes + day.abonnes;
              const heightPct = (total / maxValue) * 100;
              const vuesPct = total > 0 ? (day.vues / total) * heightPct : 0;
              const likesPct = total > 0 ? (day.likes / total) * heightPct : 0;
              const abonnesPct = total > 0 ? (day.abonnes / total) * heightPct : 0;

              return (
                <div
                  key={day.date}
                  className="flex-1 min-w-[8px] flex flex-col justify-end group relative"
                  title={`${day.label}: ${day.vues} vues, ${day.likes} likes, ${day.abonnes} abonnés`}
                >
                  {total > 0 ? (
                    <div className="flex flex-col rounded-t-sm overflow-hidden">
                      <div
                        className="bg-green-500"
                        style={{ height: `${(abonnesPct / 100) * 160}px` }}
                      />
                      <div
                        className="bg-pink-500"
                        style={{ height: `${(likesPct / 100) * 160}px` }}
                      />
                      <div
                        className="bg-blue-500"
                        style={{ height: `${(vuesPct / 100) * 160}px` }}
                      />
                    </div>
                  ) : (
                    <div className="bg-gray-700/30 rounded-t-sm" style={{ height: "2px" }} />
                  )}

                  {/* Label jour — afficher tous les N jours selon la période */}
                  {(parseInt(period) <= 7 || i % Math.ceil(dailyStats.length / 7) === 0) && (
                    <span className="text-[9px] text-gray-600 text-center mt-1 truncate">
                      {day.label}
                    </span>
                  )}

                  {/* Tooltip on hover */}
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block z-10">
                    <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs whitespace-nowrap shadow-xl">
                      <p className="text-gray-300 font-medium mb-1">{day.label}</p>
                      <p className="text-blue-400">👁 {day.vues} vues</p>
                      <p className="text-pink-400">❤ {day.likes} likes</p>
                      <p className="text-green-400">➕ {day.abonnes} abonnés</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Classement des œuvres */}
      <div className="bg-gray-800/30 border border-gray-700/40 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-700/40 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-white">Performance par œuvre</h3>
        </div>

        <div className="divide-y divide-gray-700/30">
          {topOeuvres.map((oeuvre, index) => {
            const coverUrl = Array.isArray(oeuvre.couverture)
              ? oeuvre.couverture?.[0]?.url
              : oeuvre.couverture?.url;

            return (
              <div
                key={oeuvre.documentId}
                className="flex items-center gap-4 px-6 py-4 hover:bg-gray-800/30 transition-colors"
              >
                {/* Rang */}
                <div className="w-8 text-center">
                  {index === 0 ? (
                    <span className="text-xl" role="img" aria-label="Premier">🥇</span>
                  ) : index === 1 ? (
                    <span className="text-xl" role="img" aria-label="Deuxième">🥈</span>
                  ) : index === 2 ? (
                    <span className="text-xl" role="img" aria-label="Troisième">🥉</span>
                  ) : (
                    <span className="text-gray-400 font-mono text-sm">#{index + 1}</span>
                  )}
                </div>

                {/* Couverture */}
                {coverUrl ? (
                  <img
                    src={coverUrl}
                    alt={oeuvre.titre || oeuvre.Titre}
                    className="w-12 h-16 rounded-lg object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-12 h-16 rounded-lg bg-gray-700/50 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                )}

                {/* Infos */}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">
                    {oeuvre.titre || oeuvre.Titre || "Sans titre"}
                  </p>
                  <p className="text-gray-400 text-sm">
                    {oeuvre.chapitres?.length || 0} chapitres
                  </p>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1 text-blue-400" title="Vues">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    {oeuvre.stats.vues}
                  </span>
                  <span className="flex items-center gap-1 text-pink-400" title="Likes">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    {oeuvre.stats.likes}
                  </span>
                  <span className="flex items-center gap-1 text-green-400" title="Abonnés">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                    {oeuvre.stats.abonnes}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dernières activités */}
      <div className="bg-gray-800/30 border border-gray-700/40 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-700/40 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-white">Dernières interactions</h3>
        </div>

        <div className="divide-y divide-gray-700/30 max-h-[300px] overflow-y-auto">
          {filteredTracking.slice(0, 20).map((event, i) => {
            const oeuvre = oeuvres.find((o) => o.documentId === event.oeuvreId);
            const typeConfig = {
              vue: { icon: "👁", label: "Vue", color: "text-blue-400" },
              like: { icon: "❤️", label: "Like", color: "text-pink-400" },
              abonne: { icon: "➕", label: "Abonnement", color: "text-green-400" },
            };
            const config = typeConfig[event.type] || typeConfig.vue;

            return (
              <div key={event.id || i} className="flex items-center gap-3 px-6 py-3">
                <span className="text-lg">{config.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-300">
                    <span className={config.color}>{config.label}</span>
                    {" sur "}
                    <span className="text-white font-medium">
                      {oeuvre?.titre || oeuvre?.Titre || event.oeuvreId}
                    </span>
                    {event.cibleType === "chapitre" && (
                      <span className="text-gray-400"> (chapitre)</span>
                    )}
                  </p>
                </div>
                <span className="text-gray-600 text-xs whitespace-nowrap">
                  {new Date(event.createdAt).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            );
          })}

          {filteredTracking.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-400 text-sm">Aucune interaction sur cette période</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
