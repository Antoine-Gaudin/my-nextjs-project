"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Cookies from "js-cookie";
import dynamic from "next/dynamic";

const RichEditor = dynamic(() => import("./RichEditor"), { ssr: false });

const AddOeuvreForm = ({ onClose, onOeuvreAdded }) => {
  const [formData, setFormData] = useState({
    titre: "",
    titrealt: "",
    auteur: "",
    annee: "",
    type: "",
    categorie: "",
    etat: "En cours",
  });
  const [couverture, setCouverture] = useState(null);
  const [couverturePreview, setCouverturePreview] = useState(null);
  const [userId, setUserId] = useState(null);
  const [synopsis, setSynopsis] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  // Novel-index linking
  const [niSearch, setNiSearch] = useState("");
  const [niResults, setNiResults] = useState([]);
  const [niSelected, setNiSelected] = useState(null);
  const [niLoading, setNiLoading] = useState(false);
  const [niDropdownOpen, setNiDropdownOpen] = useState(false);
  const niRef = useRef(null);
  const niTimerRef = useRef(null);

  useEffect(() => {
    const fetchUserId = async () => {
      const jwt = Cookies.get("jwt");
      if (!jwt) {
        setMessage({ text: "JWT manquant. Veuillez vous reconnecter.", type: "error" });
        return;
      }

      try {
        const res = await fetch(`/api/proxy/users/me`, {
          headers: { Authorization: `Bearer ${jwt}` },
        });
        const userData = await res.json();
        if (res.ok) setUserId(userData.id);
      } catch (err) {
        console.error("Erreur recuperation utilisateur :", err);
        setMessage({ text: "Erreur lors de la recuperation utilisateur.", type: "error" });
      }
    };

    fetchUserId();
  }, []);

  // Close novel-index dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (niRef.current && !niRef.current.contains(e.target)) setNiDropdownOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced search for novel-index oeuvres
  const searchNovelIndex = useCallback((query) => {
    if (niTimerRef.current) clearTimeout(niTimerRef.current);
    if (!query || query.length < 1) { setNiResults([]); setNiDropdownOpen(false); return; }
    niTimerRef.current = setTimeout(async () => {
      setNiLoading(true);
      try {
        const jwt = Cookies.get("jwt");
        const res = await fetch("/api/novel-index", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
          body: JSON.stringify({ action: "search-oeuvres", data: { query, pageSize: 20 } }),
        });
        const json = await res.json();
        setNiResults(json.data || []);
        setNiDropdownOpen(true);
      } catch { setNiResults([]); }
      finally { setNiLoading(false); }
    }, 350);
  }, []);

  const handleNiSearchChange = (e) => {
    const val = e.target.value;
    setNiSearch(val);
    if (niSelected) setNiSelected(null);
    searchNovelIndex(val);
  };

  const handleNiSelect = (item) => {
    setNiSelected({ documentId: item.documentId, titre: item.titre });
    setNiSearch(item.titre);
    setNiDropdownOpen(false);
  };

  const handleNiClear = () => {
    setNiSelected(null);
    setNiSearch("");
    setNiResults([]);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setCouverture(file);
    if (file) {
      setCouverturePreview(URL.createObjectURL(file));
    } else {
      setCouverturePreview(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage({ text: "", type: "" });

    const jwt = Cookies.get("jwt");
    if (!jwt) {
      setMessage({ text: "JWT manquant. Veuillez vous reconnecter.", type: "error" });
      setSubmitting(false);
      return;
    }

    if (!userId) {
      setMessage({ text: "Impossible d'ajouter l'oeuvre. Utilisateur non identifie.", type: "error" });
      setSubmitting(false);
      return;
    }

    const plainText = synopsis.replace(/<[^>]+>/g, "").trim();
    const formattedSynopsis = [
      {
        type: "paragraph",
        children: [{ type: "text", text: plainText }],
      },
    ];

    try {
      const payload = {
        data: {
          ...formData,
          synopsis: formattedSynopsis,
          users: [userId],
          ...(niSelected ? {
            novelIndexDocumentId: niSelected.documentId,
            novelIndexTitre: niSelected.titre,
          } : {}),
        },
      };

      const response = await fetch(`/api/proxy/oeuvres`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify(payload),
      });
      const newOeuvre = await response.json();

      if (couverture) {
        const uploadData = new FormData();
        uploadData.append("files", couverture);
        uploadData.append("ref", "api::oeuvre.oeuvre");
        uploadData.append("refId", newOeuvre.data.id);
        uploadData.append("field", "couverture");

        await fetch(`/api/proxy/upload`, {
          method: "POST",
          headers: { Authorization: `Bearer ${jwt}` },
          body: uploadData,
        });
      }

      const userRes = await fetch(`/api/proxy/users/me`, {
        headers: { Authorization: `Bearer ${jwt}` },
      });
      const userResData = await userRes.json();
      const userName = userResData.username || "Anonyme";

      const indexPayload = {
        data: {
          titre: formData.titre,
          titrealt: formData.titrealt,
          auteur: formData.auteur,
          annee: formData.annee,
          type: formData.type,
          categorie: formData.categorie,
          etat: formData.etat,
          synopsis: plainText,
          traduction: userName,
          langage: "Francais",
          licence: false,
        },
      };

      // Sync via server route (token gardé côté serveur)
      const syncBody = { action: 'sync-oeuvre', payload: indexPayload };

      // Si couverture, convertir en base64 pour envoi serveur
      if (couverture) {
        const reader = new FileReader();
        const base64 = await new Promise((resolve) => {
          reader.onload = () => resolve(reader.result.split(',')[1]);
          reader.readAsDataURL(couverture);
        });
        syncBody.couvertureData = {
          base64,
          mimeType: couverture.type,
          fileName: couverture.name,
        };
      }

      await fetch('/api/novel-index', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify(syncBody),
      });

      setMessage({ text: "Oeuvre ajoutee et synchronisee avec succes !", type: "success" });
      if (onOeuvreAdded) onOeuvreAdded();
      setTimeout(() => onClose(), 1200);
    } catch (err) {
      console.error("Erreur :", err);
      setMessage({ text: "Erreur lors de l'ajout ou de la synchronisation.", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 animate-fadeIn">
      <div role="dialog" aria-modal="true" aria-label="Ajouter une oeuvre" className="relative bg-gray-900 text-white p-8 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-gray-800 hover:bg-red-600 text-gray-400 hover:text-white transition"
          aria-label="Fermer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>

        <h3 className="text-2xl font-bold mb-8 border-b border-gray-700 pb-2">Ajouter une oeuvre</h3>

        {message.text && (
          <div className={`mb-6 p-3 rounded-lg text-sm font-medium ${message.type === "error" ? "bg-red-900/50 text-red-400 border border-red-800" : "bg-green-900/50 text-green-400 border border-green-800"}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold mb-1">Titre</label>
            <input type="text" name="titre" value={formData.titre} onChange={handleInputChange}
              className="w-full p-3 rounded-lg bg-gray-800 border border-gray-700 focus:ring-2 focus:ring-indigo-500 outline-none transition" required />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Titre alternatif</label>
            <input type="text" name="titrealt" value={formData.titrealt} onChange={handleInputChange}
              className="w-full p-3 rounded-lg bg-gray-800 border border-gray-700 focus:ring-2 focus:ring-indigo-500 outline-none transition" />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Auteur</label>
            <input type="text" name="auteur" value={formData.auteur} onChange={handleInputChange}
              className="w-full p-3 rounded-lg bg-gray-800 border border-gray-700 focus:ring-2 focus:ring-indigo-500 outline-none transition" />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Annee</label>
            <input type="number" name="annee" value={formData.annee} onChange={handleInputChange}
              className="w-full p-3 rounded-lg bg-gray-800 border border-gray-700 focus:ring-2 focus:ring-indigo-500 outline-none transition" />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Type</label>
            <select name="type" value={formData.type} onChange={handleInputChange}
              className="w-full p-3 rounded-lg bg-gray-800 border border-gray-700 focus:ring-2 focus:ring-indigo-500 outline-none transition">
              <option value="">— Sélectionner un type —</option>
              <option value="Novel">Novel</option>
              <option value="Light Novel">Light Novel</option>
              <option value="Web Novel">Web Novel</option>
              <option value="Manga">Manga</option>
              <option value="Manhwa">Manhwa</option>
              <option value="Manhua">Manhua</option>
              <option value="Scan">Scan</option>
              <option value="Fanfiction">Fanfiction</option>
              <option value="Autre">Autre</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Categorie</label>
            <input type="text" name="categorie" value={formData.categorie} onChange={handleInputChange}
              className="w-full p-3 rounded-lg bg-gray-800 border border-gray-700 focus:ring-2 focus:ring-indigo-500 outline-none transition" />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-semibold mb-2">Synopsis</label>
            <RichEditor value={synopsis} onChange={setSynopsis} height={250} placeholder="Ecrivez le synopsis..." />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Etat</label>
            <select name="etat" value={formData.etat} onChange={handleInputChange}
              className="w-full p-3 rounded-lg bg-gray-800 border border-gray-700 focus:ring-2 focus:ring-indigo-500 outline-none transition">
              <option value="En cours">En cours</option>
              <option value="Arreter">Arreter</option>
              <option value="En pause">En pause</option>
              <option value="Terminer">Terminer</option>
              <option value="Libre">Libre</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Couverture</label>
            {couverturePreview && (
              <Image src={couverturePreview} alt="Aperçu de la couverture" className="mb-3 max-h-32 object-cover rounded-lg" width={200} height={128} unoptimized />
            )}
            <input type="file" accept="image/*" onChange={handleFileChange}
              className="w-full p-3 rounded-lg bg-gray-800 border border-gray-700 focus:ring-2 focus:ring-indigo-500 outline-none transition" />
          </div>

          <div className="md:col-span-2" ref={niRef}>
            <label className="block text-sm font-semibold mb-1">Lier à une oeuvre Novel-Index <span className="text-gray-500 font-normal">(optionnel)</span></label>
            <div className="relative">
              <input
                type="text"
                value={niSearch}
                onChange={handleNiSearchChange}
                placeholder="Rechercher une oeuvre sur Novel-Index..."
                className="w-full p-3 rounded-lg bg-gray-800 border border-gray-700 focus:ring-2 focus:ring-indigo-500 outline-none transition pr-10"
              />
              {niLoading && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
              )}
              {niSelected && !niLoading && (
                <button type="button" onClick={handleNiClear} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-400 transition">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              )}
              {niDropdownOpen && niResults.length > 0 && (
                <ul className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg max-h-48 overflow-y-auto shadow-xl">
                  {niResults.map((item) => (
                    <li key={item.documentId} onClick={() => handleNiSelect(item)}
                      className="px-4 py-2 hover:bg-indigo-600/30 cursor-pointer text-sm flex items-center gap-3 transition">
                      {item.couverture?.url && (
                        <Image src={item.couverture.url} alt="" width={28} height={40} className="rounded object-cover" unoptimized />
                      )}
                      <div className="flex-1 min-w-0">
                        <span className="block truncate">{item.titre}</span>
                        {item.titrealt && <span className="block text-xs text-gray-500 truncate">{item.titrealt}</span>}
                      </div>
                      {item.type && <span className="ml-auto text-xs text-gray-500 flex-shrink-0">{item.type}</span>}
                    </li>
                  ))}
                </ul>
              )}
              {niDropdownOpen && niResults.length === 0 && !niLoading && niSearch.length >= 1 && (
                <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm text-gray-400">
                  Aucune oeuvre trouvée sur Novel-Index
                </div>
              )}
            </div>
            {niSelected && (
              <p className="mt-1 text-xs text-green-400">✓ Liée à : {niSelected.titre}</p>
            )}
          </div>

          <div className="md:col-span-2 flex justify-end gap-4 pt-4">
            <button type="button" onClick={onClose}
              className="bg-gray-700 hover:bg-gray-600 text-white px-5 py-2 rounded-lg font-semibold transition">
              Annuler
            </button>
            <button type="submit" disabled={submitting}
              className="bg-green-600 hover:bg-green-500 text-white px-5 py-2 rounded-lg font-semibold transition disabled:opacity-50 flex items-center gap-2">
              {submitting && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {submitting ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddOeuvreForm;
