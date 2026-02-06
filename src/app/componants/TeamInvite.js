"use client";

import { useState } from "react";
import Cookies from "js-cookie";

const TEAMS_API = "http://localhost:1337/api";

export default function TeamInvite({ team, onClose, onSuccess }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedRole, setSelectedRole] = useState("member");
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSearch = async () => {
    if (searchQuery.length < 2) return;

    setIsSearching(true);
    setError("");

    const jwt = Cookies.get("jwt");
    if (!jwt) return;

    try {
      // Rechercher par username ou email
      const res = await fetch(
        `/api/proxy/users?filters[$or][0][username][$containsi]=${searchQuery}&filters[$or][1][email][$containsi]=${searchQuery}`,
        { headers: { Authorization: `Bearer ${jwt}` } }
      );

      const data = await res.json();
      
      // Filtrer les membres existants et le owner
      const existingIds = [
        team.owner?.id || team.owner,
        ...(team.membres?.map((m) => m.id) || []),
      ];

      const filtered = (data || []).filter(
        (u) => !existingIds.includes(u.id)
      );

      setSearchResults(filtered);
    } catch (err) {
      console.error("Erreur recherche:", err);
      setError("Erreur lors de la recherche");
    } finally {
      setIsSearching(false);
    }
  };

  const handleInvite = async () => {
    if (!selectedUser) {
      setError("Veuillez sélectionner un utilisateur");
      return;
    }

    setIsLoading(true);
    setError("");
    setSuccess("");

    const jwt = Cookies.get("jwt");
    if (!jwt) return;

    try {
      // Vérifier si une invitation existe déjà
      const existingRes = await fetch(
        `${TEAMS_API}/team-invitations?filters[team][documentId][$eq]=${team.documentId}&filters[user][id][$eq]=${selectedUser.id}&filters[status][$eq]=pending`,
        { headers: { Authorization: `Bearer ${jwt}` } }
      );
      const existingData = await existingRes.json();

      if (existingData.data?.length > 0) {
        setError("Une invitation est déjà en attente pour cet utilisateur");
        setIsLoading(false);
        return;
      }

      // Créer l'invitation
      const res = await fetch(`${TEAMS_API}/team-invitations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({
          data: {
            team: team.documentId,
            user: selectedUser.id,
            status: "pending",
            role: selectedRole,
          },
        }),
      });

      if (!res.ok) {
        throw new Error("Erreur lors de l'envoi de l'invitation");
      }

      setSuccess(`Invitation envoyée à ${selectedUser.username}`);
      setSelectedUser(null);
      setSearchQuery("");
      setSearchResults([]);

      // Auto-fermer après succès
      setTimeout(() => {
        onSuccess();
      }, 1500);

    } catch (err) {
      console.error("Erreur invitation:", err);
      setError(err.message || "Une erreur est survenue");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Inviter un membre</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Success */}
        {success && (
          <div className="mb-4 p-3 bg-green-600/20 border border-green-600/30 rounded-xl text-green-400 text-sm flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
            {success}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 bg-red-600/20 border border-red-600/30 rounded-xl text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Search */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Rechercher un utilisateur
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Username ou email..."
              className="flex-1 px-4 py-2.5 bg-gray-800/50 border border-gray-700/50 focus:border-indigo-600/50 rounded-xl text-white placeholder-gray-500 outline-none transition-colors"
            />
            <button
              onClick={handleSearch}
              disabled={isSearching || searchQuery.length < 2}
              className="px-4 py-2.5 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 text-white disabled:text-gray-500 rounded-xl transition-colors"
            >
              {isSearching ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="mb-4 max-h-40 overflow-y-auto space-y-2">
            {searchResults.map((user) => (
              <button
                key={user.id}
                onClick={() => {
                  setSelectedUser(user);
                  setSearchResults([]);
                }}
                className="w-full flex items-center gap-3 p-3 bg-gray-800/30 hover:bg-gray-800/50 rounded-xl transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                  {user.username?.[0]?.toUpperCase() || "?"}
                </div>
                <div className="min-w-0">
                  <p className="text-white font-medium truncate">{user.username}</p>
                  <p className="text-gray-500 text-sm truncate">{user.email}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {searchResults.length === 0 && searchQuery.length >= 2 && !isSearching && (
          <p className="text-gray-500 text-sm text-center mb-4">Aucun utilisateur trouvé</p>
        )}

        {/* Selected User */}
        {selectedUser && (
          <div className="mb-4 p-4 bg-indigo-600/10 border border-indigo-600/30 rounded-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold">
                  {selectedUser.username?.[0]?.toUpperCase() || "?"}
                </div>
                <div>
                  <p className="text-white font-medium">{selectedUser.username}</p>
                  <p className="text-gray-500 text-sm">{selectedUser.email}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Role Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">Rôle</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: "member", label: "Membre", desc: "Peut voir" },
              { value: "editor", label: "Éditeur", desc: "Peut modifier" },
              { value: "admin", label: "Admin", desc: "Peut gérer" },
            ].map((role) => (
              <button
                key={role.value}
                onClick={() => setSelectedRole(role.value)}
                className={`p-3 rounded-xl border transition-all text-center ${
                  selectedRole === role.value
                    ? "bg-indigo-600/20 border-indigo-600/50 text-indigo-400"
                    : "bg-gray-800/30 border-gray-700/50 text-gray-400 hover:border-gray-600"
                }`}
              >
                <p className="font-medium text-sm">{role.label}</p>
                <p className="text-xs opacity-70">{role.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-gray-800/50 hover:bg-gray-700/50 text-gray-300 rounded-xl font-medium transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleInvite}
            disabled={!selectedUser || isLoading}
            className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 text-white disabled:text-gray-500 rounded-xl font-medium transition-colors disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Envoi...
              </span>
            ) : (
              "Envoyer l'invitation"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
