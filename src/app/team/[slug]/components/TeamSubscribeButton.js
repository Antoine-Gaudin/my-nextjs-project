"use client";

import { useState, useEffect, useCallback } from "react";
import Cookies from "js-cookie";

export default function TeamSubscribeButton({ team, currentUser }) {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isToggling, setIsToggling] = useState(false);

  // Vérifier si l'utilisateur est abonné et compter les abonnés
  const checkSubscription = useCallback(async () => {
    try {
      // Récupérer la team avec ses abonnés
      const res = await fetch(
        `/api/proxy/teams/${team.documentId}?populate=abonnes`
      );
      const data = await res.json();
      const teamData = data.data;

      if (teamData?.abonnes) {
        setSubscriberCount(teamData.abonnes.length);
        if (currentUser) {
          setIsSubscribed(teamData.abonnes.some((u) => u.id === currentUser.id));
        }
      }
    } catch (err) {
      console.error("Erreur check subscription:", err);
    } finally {
      setIsLoading(false);
    }
  }, [team.documentId, currentUser]);

  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  const handleToggle = async () => {
    if (!currentUser) {
      window.location.href = "/connexion";
      return;
    }

    const jwt = Cookies.get("jwt");
    if (!jwt) return;

    if (isToggling) return; // Prevent double-click
    setIsToggling(true);

    // Optimistic UI update BEFORE the API call
    const wasSubscribed = isSubscribed;
    setIsSubscribed(!wasSubscribed);
    setSubscriberCount((prev) => (wasSubscribed ? prev - 1 : prev + 1));

    try {
      // Récupérer la liste actuelle des abonnés
      const res = await fetch(
        `/api/proxy/teams/${team.documentId}?populate=abonnes`
      );
      const data = await res.json();
      const currentAbonnes = data.data?.abonnes || [];
      const currentIds = currentAbonnes.map((u) => u.id);

      let newIds;
      if (wasSubscribed) {
        newIds = currentIds.filter((id) => id !== currentUser.id);
      } else {
        newIds = [...currentIds, currentUser.id];
      }

      const updateRes = await fetch(`/api/proxy/teams/${team.documentId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({
          data: { abonnes: newIds },
        }),
      });

      if (!updateRes.ok) throw new Error("Erreur de mise à jour");
    } catch (err) {
      console.error("Erreur toggle subscription:", err);
      // Revert optimistic update
      setIsSubscribed(wasSubscribed);
      setSubscriberCount((prev) => (wasSubscribed ? prev + 1 : prev - 1));
    } finally {
      setIsToggling(false);
    }
  };

  // Ne pas afficher si c'est le owner
  const isOwner = currentUser?.id && team?.owner?.id && currentUser.id === team.owner.id;

  return (
    <div className="flex items-center gap-3">
      {/* Compteur d'abonnés */}
      <div className="flex items-center gap-1.5 text-gray-400">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <span className="text-sm font-medium">
          {isLoading ? "..." : subscriberCount} abonné{subscriberCount !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Bouton s'abonner / se désabonner */}
      {!isOwner && (
        <button
          onClick={handleToggle}
          disabled={isToggling || isLoading}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all disabled:cursor-not-allowed ${
            isSubscribed
              ? "bg-gray-700/50 hover:bg-red-600/20 text-gray-300 hover:text-red-400 border border-gray-600/50 hover:border-red-600/30 group"
              : "bg-[var(--team-primary,#6366f1)] hover:opacity-90 text-white shadow-lg"
          }`}
        >
          {isToggling ? (
            <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
          ) : isSubscribed ? (
            <>
              <svg className="w-4 h-4 group-hover:hidden" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 22c1.1 0 2-.9 2-2h-4a2 2 0 002 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
              </svg>
              <svg className="w-4 h-4 hidden group-hover:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span className="group-hover:hidden">Abonné</span>
              <span className="hidden group-hover:inline">Se désabonner</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              S&apos;abonner
            </>
          )}
        </button>
      )}

      {/* Badge owner */}
      {isOwner && (
        <span className="px-3 py-1.5 bg-amber-600/20 text-amber-400 text-xs font-medium rounded-full border border-amber-600/30">
          Votre team
        </span>
      )}
    </div>
  );
}
