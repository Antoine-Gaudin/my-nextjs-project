"use client";

import Image from "next/image";

export default function TeamCard({ team, user, onClick }) {
  const isOwner = team.owner?.id === user?.id || team.owner === user?.id;
  const ownerId = team.owner?.id || team.owner;
  // Eviter de compter le owner en double s'il est aussi dans membres
  const membersWithoutOwner = (team.membres || []).filter((m) => m.id !== ownerId);
  const membersCount = membersWithoutOwner.length + 1; // +1 pour le owner
  const oeuvresCount = team.oeuvres?.length || 0;
  const logoUrl = Array.isArray(team.logo) ? team.logo?.[0]?.url : team.logo?.url;

  return (
    <div
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick?.(); } }}
      role="button"
      tabIndex={0}
      className="group relative bg-gray-900/50 hover:bg-gray-800/70 border border-gray-800/50 hover:border-indigo-600/30 rounded-2xl p-4 cursor-pointer transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-600/50"
    >
      {/* Header avec logo */}
      <div className="flex items-start gap-3 mb-4">
        {logoUrl ? (
          <Image
            src={logoUrl}
            alt={team.nom}
            className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
            width={56}
            height={56}
          />
        ) : (
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center flex-shrink-0">
            <span className="text-2xl font-bold text-white">
              {team.nom?.[0]?.toUpperCase() || "T"}
            </span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-white truncate">{team.nom}</h3>
            {isOwner && (
              <span className="px-2 py-0.5 bg-amber-600/20 text-amber-400 text-xs font-medium rounded-full flex-shrink-0">
                Fondateur
              </span>
            )}
          </div>
          <p className="text-sm text-gray-400 truncate">
            @{team.slug || team.nom?.toLowerCase().replace(/\s+/g, "-")}
          </p>
        </div>
      </div>

      {/* Description */}
      {team.description && (
        <p className="text-gray-400 text-sm line-clamp-2 mb-4">
          {team.description}
        </p>
      )}

      {/* Stats */}
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-1.5 text-gray-400">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
          </svg>
          <span>{membersCount} membres</span>
        </div>
        <div className="flex items-center gap-1.5 text-gray-400">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <span>{oeuvresCount} œuvres</span>
        </div>
      </div>

      {/* Visibility badge */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-800/50">
        <div className={`flex items-center gap-1.5 text-xs ${team.isPublic ? "text-green-400" : "text-gray-400"}`}>
          {team.isPublic ? (
            <>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Publique</span>
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span>Privée</span>
            </>
          )}
        </div>

        {/* Liens sociaux */}
        <div className="flex items-center gap-2">
          {team.discord && (
            <div className="w-6 h-6 rounded-md bg-indigo-600/20 flex items-center justify-center text-indigo-400">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
              </svg>
            </div>
          )}
          {team.website && (
            <div className="w-6 h-6 rounded-md bg-gray-700/50 flex items-center justify-center text-gray-400">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
          )}
        </div>
      </div>

      {/* Hover arrow indicator */}
      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
        <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </div>
  );
}
