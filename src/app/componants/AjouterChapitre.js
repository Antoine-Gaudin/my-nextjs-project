"use client";

import React, { useState, useEffect } from "react";
import Cookies from "js-cookie";
import dynamic from "next/dynamic";

const RichEditor = dynamic(() => import("./RichEditor"), { ssr: false });

const AjouterChapitre = ({ oeuvreId, onClose, onChapitreAdded, oeuvreTitre }) => {
  const [titre, setTitre] = useState("");
  const [order, setOrder] = useState("");
  const [tome, setTome] = useState("");
  const [texte, setTexte] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  useEffect(() => {
    const fetchNextOrder = async () => {
      const jwt = Cookies.get("jwt");
      if (!jwt) return;

      try {
        const res = await fetch(
          `/api/proxy/chapitres?filters[oeuvres][documentId][$eq]=${oeuvreId}&sort=order:desc&pagination[limit]=1`,
          { headers: { Authorization: `Bearer ${jwt}` } }
        );
        const data = await res.json();
        const lastOrder = data.data?.[0]?.order || 0;
        setOrder(String(lastOrder + 1));
      } catch (err) {
        console.error("Erreur recuperation ordre :", err);
        setOrder("1");
      }
    };

    fetchNextOrder();
  }, [oeuvreId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage({ text: "", type: "" });

    const plainText = texte.replace(/<[^>]+>/g, "").trim();

    const formattedTexte = [
      {
        type: "paragraph",
        children: [{ type: "text", text: plainText }],
      },
    ];

    if (!titre || !order || !plainText) {
      setMessage({ text: "Veuillez remplir tous les champs obligatoires.", type: "error" });
      setSubmitting(false);
      return;
    }

    const jwt = Cookies.get("jwt");
    if (!jwt) {
      setMessage({ text: "JWT manquant. Veuillez vous reconnecter.", type: "error" });
      setSubmitting(false);
      return;
    }

    try {
      const requestBody = {
        data: {
          titre,
          order: parseInt(order, 10),
          tome: tome || null,
          texte: formattedTexte,
          oeuvres: oeuvreId,
        },
      };

      const res = await fetch(`/api/proxy/chapitres`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!res.ok) {
        console.error("Erreur lors de l'ajout du chapitre :", res.status);
        setMessage({ text: "Erreur lors de l'ajout du chapitre.", type: "error" });
        setSubmitting(false);
        return;
      }

      const createData = await res.json();
      const documentId = createData.data.documentId;
      const chapitreUrl = `https://trad-index.com/chapitre/${documentId}`;

      const apiToken = process.env.NEXT_PUBLIC_INDEX_API_TOKEN;

      const oeuvreRes = await fetch(
        `https://novel-index-strapi.onrender.com/api/oeuvres?filters[titre][$eq]=${encodeURIComponent(oeuvreTitre)}`,
        { headers: { Authorization: `Bearer ${apiToken}` } }
      );

      const oeuvreData = await oeuvreRes.json();
      const oeuvreIndexId = oeuvreData.data?.[0]?.documentId;

      if (!oeuvreIndexId) {
        setMessage({ text: "Chapitre ajoute localement, mais oeuvre non trouvee sur novel-index.", type: "error" });
        setSubmitting(false);
        return;
      }

      const indexPayload = {
        data: {
          titre,
          order: parseInt(order, 10),
          tome: tome || null,
          url: chapitreUrl,
          oeuvres: oeuvreIndexId,
        },
      };

      const indexRes = await fetch("https://novel-index-strapi.onrender.com/api/chapitres", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiToken}`,
        },
        body: JSON.stringify(indexPayload),
      });

      if (!indexRes.ok) {
        setMessage({ text: "Chapitre ajoute localement, mais erreur de synchro novel-index.", type: "error" });
        setSubmitting(false);
        return;
      }

      setMessage({ text: "Chapitre ajoute et synchronise avec succes !", type: "success" });
      setTimeout(() => {
        onChapitreAdded(oeuvreData);
        onClose();
      }, 1200);
    } catch (error) {
      console.error("Erreur lors de l'ajout du chapitre :", error);
      setMessage({ text: "Une erreur est survenue.", type: "error" });
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

        <h2 className="text-2xl font-bold mb-8 border-b border-gray-700 pb-2">Ajouter un chapitre</h2>

        {message.text && (
          <div className={`mb-6 p-3 rounded-lg text-sm font-medium ${message.type === "error" ? "bg-red-900/50 text-red-400 border border-red-800" : "bg-green-900/50 text-green-400 border border-green-800"}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1">Titre</label>
              <input type="text" value={titre} onChange={(e) => setTitre(e.target.value)}
                className="w-full p-3 rounded-lg bg-gray-800 border border-gray-700 focus:ring-2 focus:ring-indigo-500 outline-none transition"
                placeholder="Titre du chapitre" />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Ordre</label>
              <input type="number" value={order} onChange={(e) => setOrder(e.target.value)}
                className="w-full p-3 rounded-lg bg-gray-800 border border-gray-700 focus:ring-2 focus:ring-indigo-500 outline-none transition"
                placeholder="Auto" />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Tome</label>
              <input type="text" value={tome} onChange={(e) => setTome(e.target.value)}
                className="w-full p-3 rounded-lg bg-gray-800 border border-gray-700 focus:ring-2 focus:ring-indigo-500 outline-none transition"
                placeholder="Optionnel" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Texte</label>
            <RichEditor value={texte} onChange={setTexte} height={350} placeholder="Contenu du chapitre..." />
          </div>

          <div className="flex justify-end gap-4 pt-2">
            <button type="button" onClick={onClose}
              className="bg-gray-700 hover:bg-gray-600 text-white px-5 py-2 rounded-lg font-semibold transition">
              Annuler
            </button>
            <button type="submit" disabled={submitting}
              className="bg-green-600 hover:bg-green-500 text-white px-5 py-2 rounded-lg font-semibold transition disabled:opacity-50 flex items-center gap-2">
              {submitting && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {submitting ? "Ajout en cours..." : "Ajouter"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AjouterChapitre;
