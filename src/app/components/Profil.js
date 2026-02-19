"use client";

import { useState, useEffect } from "react";

export default function Profil({ user }) {
  const [stats, setStats] = useState({ oeuvres: 0, chapitres: 0 });
  const [isLoading, setIsLoading] = useState(true);

  // Récupérer les statistiques de l'utilisateur
  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Récupérer les œuvres de l'utilisateur (sans populate chapitres, trop lourd)
        const oeuvresRes = await fetch(`/api/proxy/oeuvres?filters[users][id][$eq]=${user.id}&fields[0]=titre&fields[1]=documentId&pagination[pageSize]=100`);
        const oeuvresData = await oeuvresRes.json();
        const oeuvresList = oeuvresData.data || [];

        // Compter les chapitres par oeuvre en parallèle (au lieu de séquentiel)
        const chapPromises = oeuvresList.map((oeuvre) =>
          fetch(`/api/proxy/chapitres?filters[oeuvres][documentId][$eq]=${oeuvre.documentId}&pagination[pageSize]=1&fields[0]=documentId`)
            .then((r) => r.json())
            .then((d) => d.meta?.pagination?.total || 0)
            .catch(() => 0)
        );
        const chapCounts = await Promise.all(chapPromises);
        const totalChapitres = chapCounts.reduce((sum, c) => sum + c, 0);

        setStats({
          oeuvres: oeuvresList.length,
          chapitres: totalChapitres
        });
      } catch (error) {
        console.error("Erreur lors de la récupération des stats:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (user?.id) {
      fetchStats();
    }
  }, [user?.id]);

  // Générer les initiales pour l'avatar
  const getInitials = (name) => {
    if (!name) return "?";
    const words = name.split(" ");
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Formater la date d'inscription
  const formatDate = (dateString) => {
    if (!dateString) return "Inconnue";
    const date = new Date(dateString);
    return date.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  };

  // Calculer l'ancienneté
  const getAccountAge = (dateString) => {
    if (!dateString) return "";
    const created = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - created);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 30) return `${diffDays} jour${diffDays > 1 ? "s" : ""}`;
    if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return `${months} mois`;
    }
    const years = Math.floor(diffDays / 365);
    const remainingMonths = Math.floor((diffDays % 365) / 30);
    return remainingMonths > 0 
      ? `${years} an${years > 1 ? "s" : ""} et ${remainingMonths} mois`
      : `${years} an${years > 1 ? "s" : ""}`;
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header avec bannière */}
      <div className="relative rounded-2xl overflow-hidden mb-6">
        {/* Bannière gradient */}
        <div className="h-32 sm:h-40 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500"></div>
        
        {/* Avatar */}
        <div className="absolute -bottom-12 left-6 sm:left-8">
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-3xl sm:text-4xl font-bold text-white shadow-xl border-4 border-gray-900">
            {getInitials(user?.username)}
          </div>
        </div>

        {/* Badges superposés */}
        <div className="absolute bottom-4 right-4 sm:right-6 flex gap-2">
          {user?.redacteur && (
            <span className="px-3 py-1 bg-amber-500/90 backdrop-blur-sm text-white text-xs font-semibold rounded-full shadow-lg flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
              </svg>
              Rédacteur
            </span>
          )}
          <span className="px-3 py-1 bg-green-500/90 backdrop-blur-sm text-white text-xs font-semibold rounded-full shadow-lg flex items-center gap-1">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
            Actif
          </span>
        </div>
      </div>

      {/* Informations utilisateur */}
      <div className="pl-2 sm:pl-4 pt-14 pb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">
          {user?.username || "Utilisateur"}
        </h1>
        <p className="text-gray-400 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          {user?.email}
        </p>
      </div>

      {/* Grille de statistiques */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50 hover:border-indigo-500/50 transition-colors">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {isLoading ? "..." : stats.oeuvres}
              </p>
              <p className="text-xs text-gray-400">Œuvres</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50 hover:border-purple-500/50 transition-colors">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {isLoading ? "..." : stats.chapitres}
              </p>
              <p className="text-xs text-gray-400">Chapitres</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50 hover:border-green-500/50 transition-colors">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-white leading-tight">
                {formatDate(user?.createdAt)}
              </p>
              <p className="text-xs text-gray-400">Inscription</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50 hover:border-amber-500/50 transition-colors">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-white leading-tight">
                {getAccountAge(user?.createdAt) || "Nouveau"}
              </p>
              <p className="text-xs text-gray-400">Ancienneté</p>
            </div>
          </div>
        </div>
      </div>

      {/* Section informations détaillées */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Carte Informations personnelles */}
        <div className="bg-gray-800/30 backdrop-blur-sm rounded-xl border border-gray-700/50 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-700/50 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
              <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-white">Informations personnelles</h2>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-gray-700/30">
              <span className="text-gray-400">Nom d&apos;utilisateur</span>
              <span className="text-white font-medium">{user?.username}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-700/30">
              <span className="text-gray-400">Email</span>
              <span className="text-white font-medium">{user?.email}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-700/30">
              <span className="text-gray-400">Identifiant</span>
              <span className="text-gray-400 font-mono text-sm">#{user?.id}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-400">Statut email</span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                user?.confirmed 
                  ? "bg-green-500/20 text-green-400" 
                  : "bg-yellow-500/20 text-yellow-400"
              }`}>
                {user?.confirmed ? "Vérifié" : "Non vérifié"}
              </span>
            </div>
          </div>
        </div>

        {/* Carte Rôles et permissions */}
        <div className="bg-gray-800/30 backdrop-blur-sm rounded-xl border border-gray-700/50 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-700/50 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-white">Rôles et permissions</h2>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {/* Badge Lecteur (toujours affiché) */}
              <div className="flex items-center gap-3 p-3 bg-gray-700/30 rounded-lg">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
                <div>
                  <p className="text-white font-medium">Lecteur</p>
                  <p className="text-gray-400 text-sm">Accès en lecture aux œuvres</p>
                </div>
                <span className="ml-auto px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full">Actif</span>
              </div>

              {/* Badge Rédacteur (si applicable) */}
              {user?.redacteur && (
                <div className="flex items-center gap-3 p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                    <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-white font-medium">Rédacteur</p>
                    <p className="text-gray-400 text-sm">Création et édition de contenu</p>
                  </div>
                  <span className="ml-auto px-2 py-1 bg-amber-500/20 text-amber-400 text-xs rounded-full">Actif</span>
                </div>
              )}

              {!user?.redacteur && (
                <div className="flex items-center gap-3 p-3 bg-gray-700/20 rounded-lg border border-dashed border-gray-600">
                  <div className="w-10 h-10 rounded-lg bg-gray-600/30 flex items-center justify-center">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-gray-400 font-medium">Rédacteur</p>
                    <p className="text-gray-400 text-sm">Permission non attribuée</p>
                  </div>
                  <span className="ml-auto px-2 py-1 bg-gray-600/30 text-gray-400 text-xs rounded-full">Verrouillé</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Actions rapides */}
      <div className="mt-8 p-6 bg-gradient-to-r from-indigo-600/10 to-purple-600/10 rounded-xl border border-indigo-500/20">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Actions rapides
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {user?.redacteur && (
            <button 
              onClick={() => window.location.href = '/profil'}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Nouvelle œuvre
            </button>
          )}
          <button 
            onClick={() => window.location.href = '/oeuvres'}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Explorer le catalogue
          </button>
          <button 
            className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            Partager le profil
          </button>
        </div>
      </div>
    </div>
  );
}
