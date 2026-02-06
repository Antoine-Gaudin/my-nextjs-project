"use client";

import React, { useState } from "react";
import Cookies from "js-cookie";
import mammoth from "mammoth/mammoth.browser";

const ImportWord = ({ oeuvreId, oeuvreTitre, onClose, onImportDone }) => {
  const [mode, setMode] = useState("basic"); // "basic" | "multi" | "batch"
  const [files, setFiles] = useState([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState("");
  const [results, setResults] = useState([]);

  const apiToken = process.env.NEXT_PUBLIC_INDEX_API_TOKEN;

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files);
    setFiles(selected);
  };

  const convertDocxToHtml = async (file) => {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.convertToHtml({ arrayBuffer });
    return result.value;
  };

  const splitByHeadings = (html) => {
    const parts = html.split(/<h[12][^>]*>/i);
    const titles = [];
    const regex = /<h[12][^>]*>(.*?)<\/h[12]>/gi;
    let match;
    while ((match = regex.exec(html)) !== null) {
      titles.push(match[1].replace(/<[^>]+>/g, "").trim());
    }

    const chapters = [];
    for (let i = 0; i < titles.length; i++) {
      const content = parts[i + 1];
      if (content) {
        const cleanContent = content.replace(/<\/h[12]>/i, "").trim();
        if (cleanContent) {
          chapters.push({ titre: titles[i], html: cleanContent });
        }
      }
    }
    return chapters;
  };

  const getNextOrder = async () => {
    const jwt = Cookies.get("jwt");
    try {
      const res = await fetch(
        `/api/proxy/chapitres?filters[oeuvres][documentId][$eq]=${oeuvreId}&sort=order:desc&pagination[limit]=1`,
        { headers: { Authorization: `Bearer ${jwt}` } }
      );
      const data = await res.json();
      const lastOrder = data.data?.[0]?.order || 0;
      return lastOrder + 1;
    } catch {
      return 1;
    }
  };

  const getNovelIndexOeuvreId = async () => {
    try {
      const res = await fetch(
        `https://novel-index-strapi.onrender.com/api/oeuvres?filters[titre][$eq]=${encodeURIComponent(oeuvreTitre)}`,
        { headers: { Authorization: `Bearer ${apiToken}` } }
      );
      const data = await res.json();
      return data.data?.[0]?.documentId || null;
    } catch {
      return null;
    }
  };

  const createChapitre = async (titre, html, order) => {
    const jwt = Cookies.get("jwt");

    const formattedTexte = [
      {
        type: "paragraph",
        children: [{ type: "text", text: html }],
      },
    ];

    // 1. Local
    const res = await fetch(`/api/proxy/chapitres`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({
        data: {
          titre,
          order,
          texte: formattedTexte,
          oeuvres: oeuvreId,
        },
      }),
    });

    if (!res.ok) throw new Error(`Erreur locale: ${res.status}`);

    const createData = await res.json();
    const documentId = createData.data.documentId;
    const chapitreUrl = `https://trad-index.com/chapitre/${documentId}`;

    // 2. Novel-index sync
    const oeuvreIndexId = await getNovelIndexOeuvreId();
    if (oeuvreIndexId) {
      await fetch("https://novel-index-strapi.onrender.com/api/chapitres", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiToken}`,
        },
        body: JSON.stringify({
          data: {
            titre,
            order,
            url: chapitreUrl,
            oeuvres: oeuvreIndexId,
          },
        }),
      });
    }

    return titre;
  };

  const handleImport = async () => {
    if (files.length === 0) {
      alert("Veuillez selectionner au moins un fichier .docx");
      return;
    }

    setImporting(true);
    setResults([]);
    const importResults = [];

    try {
      let startOrder = await getNextOrder();

      if (mode === "basic") {
        // 1 fichier = 1 chapitre
        const file = files[0];
        setProgress(`Conversion de ${file.name}...`);
        const html = await convertDocxToHtml(file);
        const titre = file.name.replace(/\.docx$/i, "");
        await createChapitre(titre, html, startOrder);
        importResults.push({ titre, status: "ok" });
      } else if (mode === "multi") {
        // 1 fichier, decoupage par headings
        const file = files[0];
        setProgress(`Analyse de ${file.name}...`);
        const html = await convertDocxToHtml(file);
        const chapters = splitByHeadings(html);

        if (chapters.length === 0) {
          // Pas de headings trouves, importer comme un seul chapitre
          const titre = file.name.replace(/\.docx$/i, "");
          await createChapitre(titre, html, startOrder);
          importResults.push({ titre, status: "ok (aucun heading trouve, import basique)" });
        } else {
          for (let i = 0; i < chapters.length; i++) {
            setProgress(`Import chapitre ${i + 1}/${chapters.length} : ${chapters[i].titre}`);
            await createChapitre(chapters[i].titre, chapters[i].html, startOrder + i);
            importResults.push({ titre: chapters[i].titre, status: "ok" });
          }
        }
      } else if (mode === "batch") {
        // Plusieurs fichiers, chaque fichier = 1 chapitre
        const sortedFiles = [...files].sort((a, b) => a.name.localeCompare(b.name));
        for (let i = 0; i < sortedFiles.length; i++) {
          const file = sortedFiles[i];
          setProgress(`Import ${i + 1}/${sortedFiles.length} : ${file.name}`);
          const html = await convertDocxToHtml(file);
          const titre = file.name.replace(/\.docx$/i, "");
          await createChapitre(titre, html, startOrder + i);
          importResults.push({ titre, status: "ok" });
        }
      }

      setResults(importResults);
      setProgress("Import termine !");

      if (onImportDone) onImportDone();
    } catch (err) {
      console.error("Erreur import Word :", err);
      setProgress(`Erreur : ${err.message}`);
    } finally {
      setImporting(false);
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

        <h2 className="text-2xl font-bold mb-8 border-b border-gray-700 pb-2">Import Word (.docx)</h2>

        {/* Mode selection */}
        <div className="mb-6">
          <label className="block text-sm font-semibold mb-3">Mode d'import :</label>
          <div className="grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setMode("basic")}
              className={`p-3 rounded-lg border-2 text-sm font-medium transition ${
                mode === "basic"
                  ? "border-indigo-500 bg-indigo-600"
                  : "border-gray-700 bg-gray-800 hover:border-gray-500"
              }`}
            >
              <div className="font-bold mb-1">Basique</div>
              <div className="text-xs text-gray-300">1 fichier = 1 chapitre</div>
            </button>
            <button
              type="button"
              onClick={() => setMode("multi")}
              className={`p-3 rounded-lg border-2 text-sm font-medium transition ${
                mode === "multi"
                  ? "border-indigo-500 bg-indigo-600"
                  : "border-gray-700 bg-gray-800 hover:border-gray-500"
              }`}
            >
              <div className="font-bold mb-1">Multi-chapitres</div>
              <div className="text-xs text-gray-300">Decoupe par titres H1/H2</div>
            </button>
            <button
              type="button"
              onClick={() => setMode("batch")}
              className={`p-3 rounded-lg border-2 text-sm font-medium transition ${
                mode === "batch"
                  ? "border-indigo-500 bg-indigo-600"
                  : "border-gray-700 bg-gray-800 hover:border-gray-500"
              }`}
            >
              <div className="font-bold mb-1">Batch</div>
              <div className="text-xs text-gray-300">Plusieurs fichiers = chapitres</div>
            </button>
          </div>
        </div>

        {/* File input */}
        <div className="mb-6">
          <label className="block text-sm font-semibold mb-2">
            {mode === "batch" ? "Fichiers .docx :" : "Fichier .docx :"}
          </label>
          <input
            type="file"
            accept=".docx"
            multiple={mode === "batch"}
            onChange={handleFileChange}
            className="w-full p-3 rounded-lg bg-gray-800 border border-gray-700"
          />
          {files.length > 0 && (
            <p className="text-sm text-gray-400 mt-2">
              {files.length} fichier(s) selectionne(s)
            </p>
          )}
        </div>

        {/* Progress */}
        {progress && (
          <div className="mb-4 p-3 bg-gray-800 rounded-lg">
            <p className="text-sm text-indigo-400">{progress}</p>
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div className="mb-4 p-3 bg-gray-800 rounded-lg max-h-40 overflow-y-auto">
            <p className="text-sm font-semibold mb-2">Resultats :</p>
            {results.map((r, i) => (
              <p key={i} className="text-sm text-green-400">
                {r.titre} - {r.status}
              </p>
            ))}
          </div>
        )}

        {/* Buttons */}
        <div className="flex justify-end gap-4 pt-4">
          <button
            onClick={onClose}
            className="bg-gray-700 hover:bg-gray-600 text-white px-5 py-2 rounded-lg font-semibold transition"
          >
            Fermer
          </button>
          <button
            onClick={handleImport}
            disabled={importing || files.length === 0}
            className="bg-green-600 hover:bg-green-500 text-white px-5 py-2 rounded-lg font-semibold transition disabled:opacity-50 flex items-center gap-2"
          >
            {importing && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {importing ? "Import en cours..." : "Importer"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImportWord;
