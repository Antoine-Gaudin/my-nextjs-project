"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import axios from "axios";
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

  useEffect(() => {
    const fetchUserId = async () => {
      const jwt = Cookies.get("jwt");
      if (!jwt) {
        setMessage({ text: "JWT manquant. Veuillez vous reconnecter.", type: "error" });
        return;
      }

      try {
        const res = await axios.get(`/api/proxy/users/me`, {
          headers: { Authorization: `Bearer ${jwt}` },
        });
        if (res.status === 200) setUserId(res.data.id);
      } catch (err) {
        console.error("Erreur recuperation utilisateur :", err);
        setMessage({ text: "Erreur lors de la recuperation utilisateur.", type: "error" });
      }
    };

    fetchUserId();
  }, []);

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
        },
      };

      const response = await axios.post(`/api/proxy/oeuvres`, payload, {
        headers: { Authorization: `Bearer ${jwt}` },
      });

      const newOeuvre = response.data;

      if (couverture) {
        const uploadData = new FormData();
        uploadData.append("files", couverture);
        uploadData.append("ref", "api::oeuvre.oeuvre");
        uploadData.append("refId", newOeuvre.data.id);
        uploadData.append("field", "couverture");

        await axios.post(`/api/proxy/upload`, uploadData, {
          headers: { Authorization: `Bearer ${jwt}` },
        });
      }

      const userRes = await axios.get(`/api/proxy/users/me`, {
        headers: { Authorization: `Bearer ${jwt}` },
      });
      const userName = userRes.data.username || "Anonyme";

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
      console.error("Erreur :", err.response?.data || err);
      setMessage({ text: "Erreur lors de l'ajout ou de la synchronisation.", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 animate-fadeIn">
      <div className="relative bg-gray-900 text-white p-8 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
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
            <input type="text" name="type" value={formData.type} onChange={handleInputChange}
              className="w-full p-3 rounded-lg bg-gray-800 border border-gray-700 focus:ring-2 focus:ring-indigo-500 outline-none transition" />
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
