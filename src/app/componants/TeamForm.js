"use client";

import { useState } from "react";
import Cookies from "js-cookie";

const TEAMS_API = "http://localhost:1337/api";

export default function TeamForm({ user, team, onClose, onSuccess }) {
  const isEditing = !!team;

  const [formData, setFormData] = useState({
    nom: team?.nom || "",
    description: team?.description || "",
    slug: team?.slug || "",
    discord: team?.discord || "",
    website: team?.website || "",
    isPublic: team?.isPublic ?? true,
  });
  const [logo, setLogo] = useState(null);
  const [logoPreview, setLogoPreview] = useState(team?.logo?.[0]?.url || null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    // Auto-génération du slug
    if (name === "nom" && !isEditing) {
      const slug = value
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      setFormData((prev) => ({ ...prev, slug }));
    }
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setLogo(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const jwt = Cookies.get("jwt");
    if (!jwt) {
      setError("Vous devez être connecté");
      setIsLoading(false);
      return;
    }

    try {
      // Préparer les données de la team (sans logo pour l'instant)
      const teamData = {
        nom: formData.nom,
        description: formData.description,
        slug: formData.slug,
        discord: formData.discord || null,
        website: formData.website || null,
        isPublic: formData.isPublic,
      };

      // Si création, ajouter le owner
      if (!isEditing) {
        teamData.owner = user.id;
      }

      // Créer ou mettre à jour la team
      const url = isEditing
        ? `${TEAMS_API}/teams/${team.documentId}`
        : `${TEAMS_API}/teams`;

      const res = await fetch(url, {
        method: isEditing ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({ data: teamData }),
      });

      const responseData = await res.json();

      if (!res.ok) {
        throw new Error(responseData.error?.message || "Erreur lors de la sauvegarde");
      }

      const savedTeam = responseData;

      // Upload du logo si nouveau (après création de la team)
      if (logo) {
        const uploadData = new FormData();
        uploadData.append("files", logo);
        uploadData.append("ref", "api::team.team");
        uploadData.append("refId", savedTeam.data.id);
        uploadData.append("field", "logo");

        const uploadRes = await fetch(`${TEAMS_API}/upload`, {
          method: "POST",
          headers: { Authorization: `Bearer ${jwt}` },
          body: uploadData,
        });

        if (!uploadRes.ok) {
          console.error("Erreur upload logo, mais la team a été créée");
        }
      }

      onSuccess();
    } catch (err) {
      console.error("Erreur création team:", err);
      setError(err.message || "Une erreur est survenue");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={onClose}
          className="p-2 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 text-gray-400 hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white">
            {isEditing ? "Modifier la Team" : "Créer une Team"}
          </h1>
          <p className="text-gray-500">
            {isEditing
              ? "Modifiez les informations de votre équipe"
              : "Créez une équipe pour collaborer sur vos projets"}
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-4 bg-red-600/20 border border-red-600/30 rounded-xl text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Logo */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Logo</label>
          <div className="flex items-center gap-4">
            <div
              className="relative w-20 h-20 rounded-xl overflow-hidden bg-gray-800 border-2 border-dashed border-gray-700 hover:border-indigo-600/50 transition-colors cursor-pointer"
              onClick={() => document.getElementById("logo-input").click()}
            >
              {logoPreview ? (
                <img src={logoPreview} alt="Logo preview" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-500">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
              <input
                type="file"
                id="logo-input"
                accept="image/*"
                onChange={handleLogoChange}
                className="hidden"
              />
            </div>
            <div className="text-sm text-gray-500">
              <p>Cliquez pour ajouter un logo</p>
              <p>PNG, JPG • Max 2MB</p>
            </div>
          </div>
        </div>

        {/* Nom */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Nom de la team <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            name="nom"
            value={formData.nom}
            onChange={handleChange}
            required
            placeholder="Ex: Scan Trad FR"
            className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 focus:border-indigo-600/50 rounded-xl text-white placeholder-gray-500 outline-none transition-colors"
          />
        </div>

        {/* Slug */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Slug (URL) <span className="text-red-400">*</span>
          </label>
          <div className="flex items-center">
            <span className="px-4 py-3 bg-gray-900 border border-r-0 border-gray-700/50 rounded-l-xl text-gray-500 text-sm">
              /team/
            </span>
            <input
              type="text"
              name="slug"
              value={formData.slug}
              onChange={handleChange}
              required
              placeholder="scan-trad-fr"
              className="flex-1 px-4 py-3 bg-gray-800/50 border border-gray-700/50 focus:border-indigo-600/50 rounded-r-xl text-white placeholder-gray-500 outline-none transition-colors"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={4}
            placeholder="Décrivez votre équipe et ses activités..."
            className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 focus:border-indigo-600/50 rounded-xl text-white placeholder-gray-500 outline-none transition-colors resize-none"
          />
        </div>

        {/* Liens */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Discord</label>
            <input
              type="url"
              name="discord"
              value={formData.discord}
              onChange={handleChange}
              placeholder="https://discord.gg/..."
              className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 focus:border-indigo-600/50 rounded-xl text-white placeholder-gray-500 outline-none transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Site web</label>
            <input
              type="url"
              name="website"
              value={formData.website}
              onChange={handleChange}
              placeholder="https://..."
              className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 focus:border-indigo-600/50 rounded-xl text-white placeholder-gray-500 outline-none transition-colors"
            />
          </div>
        </div>

        {/* Visibilité */}
        <div className="p-4 bg-gray-800/30 rounded-xl">
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <p className="text-white font-medium">Team publique</p>
              <p className="text-sm text-gray-500">
                La team et ses œuvres seront visibles par tous
              </p>
            </div>
            <div className="relative">
              <input
                type="checkbox"
                name="isPublic"
                checked={formData.isPublic}
                onChange={handleChange}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-700 rounded-full peer peer-checked:bg-indigo-600 transition-colors" />
              <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow peer-checked:translate-x-5 transition-transform" />
            </div>
          </label>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-6 py-3 bg-gray-800/50 hover:bg-gray-700/50 text-gray-300 rounded-xl font-semibold transition-colors"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {isEditing ? "Mise à jour..." : "Création..."}
              </span>
            ) : isEditing ? (
              "Mettre à jour"
            ) : (
              "Créer la Team"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
