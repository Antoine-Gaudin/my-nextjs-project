"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import dynamic from "next/dynamic";

const RichEditor = dynamic(() => import("./RichEditor"), { ssr: false });

const MoOeuvre = ({ oeuvre, onClose, onUpdate }) => {
  const [formData, setFormData] = useState({
    titre: "",
    titrealt: "",
    auteur: "",
    annee: "",
    type: "",
    categorie: "",
    etat: "",
  });
  const [couverture, setCouverture] = useState(null);
  const [couverturePreview, setCouverturePreview] = useState(null);
  const [existingCouverture, setExistingCouverture] = useState("");
  const [synopsis, setSynopsis] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });
  const apiToken = process.env.NEXT_PUBLIC_INDEX_API_TOKEN;

  useEffect(() => {
    if (oeuvre) {
      if (oeuvre.synopsis) {
        const synopsisHtml = oeuvre.synopsis
          .map((item) => item.children.map((child) => child.text).join(""))
          .join("<br>");
        setSynopsis(synopsisHtml);
      }

      setFormData({
        titre: oeuvre.titre || "",
        titrealt: oeuvre.titrealt || "",
        auteur: oeuvre.auteur || "",
        annee: oeuvre.annee || "",
        type: oeuvre.type || "",
        categorie: oeuvre.categorie || "",
        etat: oeuvre.etat || "",
      });

      if (oeuvre.couverture?.length > 0 && oeuvre.couverture[0]?.url) {
        setExistingCouverture(oeuvre.couverture[0].url);
      } else if (oeuvre.couverture?.url) {
        setExistingCouverture(`${apiUrl}${oeuvre.couverture.url}`);
      }
    }
  }, [oeuvre]);

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

    const plainText = synopsis.replace(/<[^>]+>/g, "").trim();
    const formattedSynopsis = [
      {
        type: "paragraph",
        children: [{ type: "text", text: plainText }],
      },
    ];

    try {
      const jwt = Cookies.get("jwt");
      if (!jwt) {
        setMessage({ text: "JWT manquant. Veuillez vous reconnecter.", type: "error" });
        setSubmitting(false);
        return;
      }

      const payload = {
        data: {
          ...formData,
          synopsis: formattedSynopsis,
        },
      };

      const response = await axios.put(
        `/api/proxy/oeuvres/${oeuvre.documentId}`,
        payload,
        { headers: { Authorization: `Bearer ${jwt}` } }
      );

      const updatedOeuvre = response.data;

      if (couverture) {
        const uploadData = new FormData();
        uploadData.append("files", couverture);
        uploadData.append("ref", "api::oeuvre.oeuvre");
        uploadData.append("refId", updatedOeuvre.data.id);
        uploadData.append("field", "couverture");

        await axios.post(`/api/proxy/upload`, uploadData, {
          headers: { Authorization: `Bearer ${jwt}` },
        });
      }

      // Sync novel-index
      try {
        const indexSearchRes = await axios.get(
          `https://novel-index-strapi.onrender.com/api/oeuvres?filters[titre][$eq]=${encodeURIComponent(oeuvre.titre)}`,
          { headers: { Authorization: `Bearer ${apiToken}` } }
        );

        const indexOeuvre = indexSearchRes.data.data?.[0];
        if (indexOeuvre) {
          await axios.put(
            `https://novel-index-strapi.onrender.com/api/oeuvres/${indexOeuvre.documentId}`,
            {
              data: {
                titre: formData.titre,
                titrealt: formData.titrealt,
                auteur: formData.auteur,
                annee: formData.annee,
                type: formData.type,
                categorie: formData.categorie,
                etat: formData.etat,
                synopsis: plainText,
              },
            },
            { headers: { Authorization: `Bearer ${apiToken}` } }
          );

          if (couverture) {
            const uploadDataIndex = new FormData();
            uploadDataIndex.append("files", couverture, couverture.name);
            uploadDataIndex.append("ref", "api::oeuvre.oeuvre");
            uploadDataIndex.append("refId", indexOeuvre.id);
            uploadDataIndex.append("field", "couverture");

            await axios.post(
              "https://novel-index-strapi.onrender.com/api/upload",
              uploadDataIndex,
              { headers: { Authorization: `Bearer ${apiToken}` } }
            );
          }
        }
      } catch (syncErr) {
        console.error("Erreur sync novel-index :", syncErr);
      }

      setMessage({ text: "Oeuvre modifiee avec succes !", type: "success" });
      if (onUpdate) onUpdate();
      setTimeout(() => onClose(), 1200);
    } catch (err) {
      console.error("Erreur lors de la modification :", err.response?.data || err);
      setMessage({ text: "Erreur lors de la modification.", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="relative bg-gray-900 text-white p-8 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-gray-800 hover:bg-red-600 text-gray-400 hover:text-white transition"
          aria-label="Fermer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>

        <h3 className="text-2xl font-bold mb-8 border-b border-gray-700 pb-2">Modifier une oeuvre</h3>

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
            {(couverturePreview || (existingCouverture && !couverture)) && (
              <img
                src={couverturePreview || existingCouverture}
                alt="Couverture"
                className="mb-3 max-h-32 object-cover rounded-lg"
              />
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

export default MoOeuvre;
