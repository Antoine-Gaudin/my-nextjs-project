"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import axios from "axios";
import Cookies from "js-cookie";
import dynamic from "next/dynamic";

const RichEditor = dynamic(() => import("../../componants/RichEditor"), { ssr: false });

const MoChapitre = () => {
  const router = useRouter();
  const { documentid } = useParams();
  const [formData, setFormData] = useState({
    titre: "",
    order: "",
    tome: "",
  });
  const [texte, setTexte] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const fetchChapitre = async () => {
      try {
        const jwt = Cookies.get("jwt");
        if (!jwt) {
          setMessage("JWT manquant. Veuillez vous reconnecter.");
          return;
        }

        const res = await axios.get(`/api/proxy/chapitres/${documentid}`, {
          headers: {
            Authorization: `Bearer ${jwt}`,
          },
        });

        const chapitre = res.data.data;

        setFormData({
          titre: chapitre.titre || "",
          order: chapitre.order || "",
          tome: chapitre.tome || "",
        });

        // Convert Strapi format to HTML for TinyMCE
        const texteHTML = chapitre.texte
          ? chapitre.texte
              .map((t) => `<p>${t.children?.[0]?.text || ""}</p>`)
              .join("")
          : "";
        setTexte(texteHTML);
      } catch (error) {
        console.error("Erreur lors de la recuperation du chapitre :", error);
        setMessage("Erreur lors de la recuperation du chapitre.");
      }
    };

    fetchChapitre();
  }, [documentid]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const formattedTexte = texte
      .split(/<p>|<\/p>/)
      .filter((line) => line.trim() !== "")
      .map((line) => ({
        type: "paragraph",
        children: [{ type: "text", text: line.replace(/<br>/g, "\n").trim() }],
      }));

    if (formattedTexte.length === 0) {
      formattedTexte.push({
        type: "paragraph",
        children: [{ type: "text", text: texte.replace(/<[^>]+>/g, "") }],
      });
    }

    if (!formData.titre || !formData.order || !texte) {
      alert("Veuillez remplir tous les champs obligatoires !");
      return;
    }

    try {
      const jwt = Cookies.get("jwt");
      if (!jwt) {
        setMessage("JWT manquant. Veuillez vous reconnecter.");
        return;
      }

      const payload = {
        data: {
          titre: formData.titre,
          order: parseInt(formData.order, 10),
          texte: formattedTexte,
          tome: formData.tome || null,
        },
      };

      await axios.put(`/api/proxy/chapitres/${documentid}`, payload, {
        headers: {
          Authorization: `Bearer ${jwt}`,
        },
      });

      setMessage("Chapitre modifie avec succes !");
      router.back();
    } catch (error) {
      console.error("Erreur lors de la modification :", error);
      setMessage("Erreur lors de la modification.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col p-6">
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="bg-blue-500 hover:bg-blue-400 text-white px-4 py-2 rounded"
        >
          Retour
        </button>
      </div>
      <h1 className="text-3xl font-bold mb-6">Modifier le Chapitre</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-1">Titre :</label>
          <input
            type="text"
            name="titre"
            value={formData.titre}
            onChange={handleInputChange}
            className="block w-full p-2 bg-gray-700 border border-gray-600 rounded focus:outline-none"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Ordre :</label>
          <input
            type="number"
            name="order"
            value={formData.order}
            onChange={handleInputChange}
            className="block w-full p-2 bg-gray-700 border border-gray-600 rounded focus:outline-none"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Tome :</label>
          <input
            type="text"
            name="tome"
            value={formData.tome}
            onChange={handleInputChange}
            className="block w-full p-2 bg-gray-700 border border-gray-600 rounded focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Texte :</label>
          <RichEditor
            value={texte}
            onChange={setTexte}
            height={400}
            placeholder="Contenu du chapitre..."
          />
        </div>
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="bg-red-600 px-4 py-2 rounded hover:bg-red-500"
          >
            Annuler
          </button>
          <button
            type="submit"
            className="bg-green-600 px-4 py-2 rounded hover:bg-green-500"
          >
            Enregistrer
          </button>
        </div>
      </form>
      {message && <p className="mt-6 text-green-400">{message}</p>}
    </div>
  );
};

export default MoChapitre;
