"use client";

import { useState, useEffect } from "react";

export default function TeamCustomizationPanel({ team, onUpdate, onClose }) {
  const [formData, setFormData] = useState({
    themeCouleurPrimaire: team.themeCouleurPrimaire || "#6366f1",
    themeCouleurSecondaire: team.themeCouleurSecondaire || "#8b5cf6",
    themeCouleurAccent: team.themeCouleurAccent || "#ec4899",
    themePolice: team.themePolice || "",
    messageAccueil: team.messageAccueil || "",
    twitter: team.twitter || "",
    youtube: team.youtube || "",
    instagram: team.instagram || "",
    tiktok: team.tiktok || "",
    bannierePosition: team.bannierePosition || "center",
    sectionsCustom: team.sectionsCustom || [],
  });

  const [activeSection, setActiveSection] = useState("theme");
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState(null); // { type: 'success'|'error', message }
  const [newSection, setNewSection] = useState({
    type: "text",
    title: "",
    content: "",
  });

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const handleColorChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSocialChange = (platform, value) => {
    setFormData((prev) => ({ ...prev, [platform]: value }));
  };

  const handleAddSection = () => {
    if (!newSection.title || !newSection.content) {
      setToast({ type: "error", message: "Veuillez remplir tous les champs de la section" });
      return;
    }

    const section = {
      id: Date.now().toString(),
      ...newSection,
    };

    setFormData((prev) => ({
      ...prev,
      sectionsCustom: [...prev.sectionsCustom, section],
    }));

    setNewSection({ type: "text", title: "", content: "" });
  };

  const handleRemoveSection = (sectionId) => {
    setFormData((prev) => ({
      ...prev,
      sectionsCustom: prev.sectionsCustom.filter((s) => s.id !== sectionId),
    }));
  };

  const handleMoveSectionUp = (index) => {
    if (index === 0) return;
    const newSections = [...formData.sectionsCustom];
    [newSections[index - 1], newSections[index]] = [
      newSections[index],
      newSections[index - 1],
    ];
    setFormData((prev) => ({ ...prev, sectionsCustom: newSections }));
  };

  const handleMoveSectionDown = (index) => {
    if (index === formData.sectionsCustom.length - 1) return;
    const newSections = [...formData.sectionsCustom];
    [newSections[index], newSections[index + 1]] = [
      newSections[index + 1],
      newSections[index],
    ];
    setFormData((prev) => ({ ...prev, sectionsCustom: newSections }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onUpdate(formData);
      setToast({ type: "success", message: "Modifications enregistrées avec succès !" });
    } catch (error) {
      console.error("Erreur lors de l'enregistrement:", error);
      setToast({ type: "error", message: "Erreur lors de l'enregistrement des modifications" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <h2 className="text-2xl font-bold text-white">Personnalisation de la page</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Navigation */}
        <div className="flex gap-2 px-6 py-3 border-b border-gray-700 overflow-x-auto">
          <button
            onClick={() => setActiveSection("theme")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
              activeSection === "theme"
                ? "bg-indigo-600 text-white"
                : "text-gray-400 hover:text-white hover:bg-gray-800"
            }`}
          >
            Thème & Couleurs
          </button>
          <button
            onClick={() => setActiveSection("banner")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
              activeSection === "banner"
                ? "bg-indigo-600 text-white"
                : "text-gray-400 hover:text-white hover:bg-gray-800"
            }`}
          >
            Bannière
          </button>
          <button
            onClick={() => setActiveSection("social")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
              activeSection === "social"
                ? "bg-indigo-600 text-white"
                : "text-gray-400 hover:text-white hover:bg-gray-800"
            }`}
          >
            Réseaux sociaux
          </button>
          <button
            onClick={() => setActiveSection("content")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
              activeSection === "content"
                ? "bg-indigo-600 text-white"
                : "text-gray-400 hover:text-white hover:bg-gray-800"
            }`}
          >
            Contenu
          </button>
          <button
            onClick={() => setActiveSection("sections")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
              activeSection === "sections"
                ? "bg-indigo-600 text-white"
                : "text-gray-400 hover:text-white hover:bg-gray-800"
            }`}
          >
            Sections personnalisées
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {/* Theme Section */}
          {activeSection === "theme" && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Couleur primaire
                </label>
                <div className="flex gap-3 items-center">
                  <input
                    type="color"
                    value={formData.themeCouleurPrimaire}
                    onChange={(e) => handleColorChange("themeCouleurPrimaire", e.target.value)}
                    className="w-16 h-16 rounded-lg cursor-pointer border-2 border-gray-700"
                  />
                  <input
                    type="text"
                    value={formData.themeCouleurPrimaire}
                    onChange={(e) => handleColorChange("themeCouleurPrimaire", e.target.value)}
                    className="flex-1 bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-700"
                    placeholder="#6366f1"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Utilisée pour les boutons principaux, liens, etc.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Couleur secondaire
                </label>
                <div className="flex gap-3 items-center">
                  <input
                    type="color"
                    value={formData.themeCouleurSecondaire}
                    onChange={(e) => handleColorChange("themeCouleurSecondaire", e.target.value)}
                    className="w-16 h-16 rounded-lg cursor-pointer border-2 border-gray-700"
                  />
                  <input
                    type="text"
                    value={formData.themeCouleurSecondaire}
                    onChange={(e) => handleColorChange("themeCouleurSecondaire", e.target.value)}
                    className="flex-1 bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-700"
                    placeholder="#8b5cf6"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Utilisée pour les dégradés et accents</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Couleur d&apos;accent
                </label>
                <div className="flex gap-3 items-center">
                  <input
                    type="color"
                    value={formData.themeCouleurAccent}
                    onChange={(e) => handleColorChange("themeCouleurAccent", e.target.value)}
                    className="w-16 h-16 rounded-lg cursor-pointer border-2 border-gray-700"
                  />
                  <input
                    type="text"
                    value={formData.themeCouleurAccent}
                    onChange={(e) => handleColorChange("themeCouleurAccent", e.target.value)}
                    className="flex-1 bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-700"
                    placeholder="#ec4899"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Utilisée pour les éléments spéciaux et badges
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Police personnalisée (optionnel)
                </label>
                <input
                  type="text"
                  value={formData.themePolice}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, themePolice: e.target.value }))
                  }
                  className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-700"
                  placeholder="Nom de la police (ex: 'Montserrat')"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Utilisez une police Google Fonts ou une police système
                </p>
              </div>

              {/* Preview */}
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h3 className="text-lg font-medium text-white mb-4">Aperçu</h3>
                <div className="space-y-3">
                  <button
                    style={{ backgroundColor: formData.themeCouleurPrimaire }}
                    className="px-4 py-2 text-white rounded-lg font-medium"
                  >
                    Bouton primaire
                  </button>
                  <div
                    style={{
                      background: `linear-gradient(to right, ${formData.themeCouleurPrimaire}, ${formData.themeCouleurSecondaire})`,
                    }}
                    className="h-16 rounded-lg flex items-center justify-center text-white font-medium"
                  >
                    Dégradé primaire → secondaire
                  </div>
                  <div className="flex gap-2">
                    <span
                      style={{
                        backgroundColor: formData.themeCouleurAccent + "20",
                        color: formData.themeCouleurAccent,
                      }}
                      className="px-3 py-1 rounded-full text-sm font-medium"
                    >
                      Badge accent
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Banner Section */}
          {activeSection === "banner" && (
            <div className="space-y-6">
              <div className="bg-amber-900/20 border border-amber-600/30 rounded-lg p-4">
                <p className="text-amber-400 text-sm">
                  ⚠️ L&apos;upload de bannière nécessite une intégration avec votre système de
                  fichiers. Cette fonctionnalité sera ajoutée prochainement.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Position de la bannière
                </label>
                <select
                  value={formData.bannierePosition}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, bannierePosition: e.target.value }))
                  }
                  className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-700"
                >
                  <option value="top">Haut</option>
                  <option value="center">Centre</option>
                  <option value="bottom">Bas</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Détermine la partie de l&apos;image visible dans la bannière
                </p>
              </div>
            </div>
          )}

          {/* Social Section */}
          {activeSection === "social" && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                  </svg>
                  Twitter / X
                </label>
                <input
                  type="url"
                  value={formData.twitter}
                  onChange={(e) => handleSocialChange("twitter", e.target.value)}
                  className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-700"
                  placeholder="https://twitter.com/votre_compte"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                  </svg>
                  YouTube
                </label>
                <input
                  type="url"
                  value={formData.youtube}
                  onChange={(e) => handleSocialChange("youtube", e.target.value)}
                  className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-700"
                  placeholder="https://youtube.com/@votre_chaine"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                  Instagram
                </label>
                <input
                  type="url"
                  value={formData.instagram}
                  onChange={(e) => handleSocialChange("instagram", e.target.value)}
                  className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-700"
                  placeholder="https://instagram.com/votre_compte"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
                  </svg>
                  TikTok
                </label>
                <input
                  type="url"
                  value={formData.tiktok}
                  onChange={(e) => handleSocialChange("tiktok", e.target.value)}
                  className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-700"
                  placeholder="https://tiktok.com/@votre_compte"
                />
              </div>
            </div>
          )}

          {/* Content Section */}
          {activeSection === "content" && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Message d&apos;accueil
                </label>
                <textarea
                  value={formData.messageAccueil}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, messageAccueil: e.target.value }))
                  }
                  rows={8}
                  className="w-full bg-gray-800 text-white px-4 py-3 rounded-lg border border-gray-700 resize-none"
                  placeholder="Écrivez un message d'accueil pour vos visiteurs..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  Ce message apparaîtra sur l&apos;onglet &quot;À propos&quot;
                </p>
              </div>

              <div className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-4">
                <p className="text-blue-400 text-sm">
                  💡 Astuce : Vous pouvez utiliser du HTML simple pour mettre en forme votre
                  message (italique, gras, listes, liens, etc.)
                </p>
              </div>
            </div>
          )}

          {/* Custom Sections */}
          {activeSection === "sections" && (
            <div className="space-y-6">
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h3 className="text-lg font-medium text-white mb-4">Ajouter une section</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Type de section
                    </label>
                    <select
                      value={newSection.type}
                      onChange={(e) => setNewSection({ ...newSection, type: e.target.value })}
                      className="w-full bg-gray-900 text-white px-4 py-2 rounded-lg border border-gray-700"
                    >
                      <option value="text">Texte</option>
                      <option value="gallery">Galerie d&apos;images</option>
                      <option value="cta">Appel à l&apos;action</option>
                      <option value="stats">Statistiques</option>
                      <option value="timeline">Chronologie</option>
                      <option value="recruitment">Recrutement</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Titre</label>
                    <input
                      type="text"
                      value={newSection.title}
                      onChange={(e) => setNewSection({ ...newSection, title: e.target.value })}
                      className="w-full bg-gray-900 text-white px-4 py-2 rounded-lg border border-gray-700"
                      placeholder="Titre de la section"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Contenu (JSON)
                    </label>
                    <textarea
                      value={newSection.content}
                      onChange={(e) => setNewSection({ ...newSection, content: e.target.value })}
                      rows={4}
                      className="w-full bg-gray-900 text-white px-4 py-2 rounded-lg border border-gray-700 font-mono text-sm"
                      placeholder='{"text": "Contenu de votre section..."}'
                    />
                    <p className="text-xs text-gray-500 mt-1">Format JSON selon le type choisi</p>
                  </div>

                  <button
                    onClick={handleAddSection}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    Ajouter la section
                  </button>
                </div>
              </div>

              {/* Existing Sections */}
              {formData.sectionsCustom.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium text-white mb-4">Sections existantes</h3>
                  <div className="space-y-3">
                    {formData.sectionsCustom.map((section, index) => (
                      <div
                        key={section.id}
                        className="bg-gray-800 rounded-lg p-4 border border-gray-700"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="px-2 py-1 bg-indigo-600/20 text-indigo-400 text-xs font-medium rounded">
                                {section.type}
                              </span>
                              <h4 className="font-medium text-white">{section.title}</h4>
                            </div>
                            <p className="text-sm text-gray-400 line-clamp-2">
                              {JSON.stringify(section.content).substring(0, 100)}...
                            </p>
                          </div>

                          <div className="flex gap-1">
                            <button
                              onClick={() => handleMoveSectionUp(index)}
                              disabled={index === 0}
                              className="p-2 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                              title="Monter"
                            >
                              <svg
                                className="w-5 h-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M5 15l7-7 7 7"
                                />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleMoveSectionDown(index)}
                              disabled={index === formData.sectionsCustom.length - 1}
                              className="p-2 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                              title="Descendre"
                            >
                              <svg
                                className="w-5 h-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M19 9l-7 7-7-7"
                                />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleRemoveSection(section.id)}
                              className="p-2 text-red-400 hover:text-red-300 transition-colors"
                              title="Supprimer"
                            >
                              <svg
                                className="w-5 h-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-6 py-2 text-gray-400 hover:text-white transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? "Enregistrement..." : "Enregistrer les modifications"}
          </button>
        </div>
      </div>

      {/* Toast notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[60] flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl border transition-all animate-slide-in ${
          toast.type === "success"
            ? "bg-green-900/90 border-green-600/40 text-green-300"
            : "bg-red-900/90 border-red-600/40 text-red-300"
        }`}>
          {toast.type === "success" ? (
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
          <span className="text-sm font-medium">{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 opacity-60 hover:opacity-100">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
