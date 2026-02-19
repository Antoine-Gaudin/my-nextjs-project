"use client";

import { useState, useCallback } from "react";
import Cookies from "js-cookie";

// ─── Normalise un titre pour matching non-strict ───
function normalize(str) {
  return (str || "")
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // supprime accents
    .replace(/[^\w\s]/g, "")          // supprime ponctuation
    .replace(/\s+/g, " ");            // collapse espaces
}

export default function AdminComparatif({ user }) {
  const [comparison, setComparison] = useState(null);
  const [loadingData, setLoadingData] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState("");
  const [expandedOeuvre, setExpandedOeuvre] = useState(null);
  const [filter, setFilter] = useState("all");
  const [chapterFilter, setChapterFilter] = useState("problems");

  // ─── Fetch toutes les oeuvres locales (Strapi) ───
  const fetchAllLocalOeuvres = useCallback(async () => {
    const jwt = Cookies.get("jwt");
    let all = [];
    let page = 1;
    let hasMore = true;
    while (hasMore) {
      const res = await fetch(
        `/api/proxy/oeuvres?populate=couverture&pagination[page]=${page}&pagination[pageSize]=100&sort=titre:asc`,
        { headers: { Authorization: `Bearer ${jwt}` } }
      );
      const data = await res.json();
      if (data.data) all = [...all, ...data.data];
      const pagination = data.meta?.pagination;
      hasMore = pagination && page < pagination.pageCount;
      page++;
    }
    return all;
  }, []);

  // ─── Fetch toutes les oeuvres Novel-Index ───
  const fetchAllIndexOeuvres = useCallback(async () => {
    const jwt = Cookies.get("jwt");
    let all = [];
    let page = 1;
    let hasMore = true;
    while (hasMore) {
      const res = await fetch("/api/novel-index", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({ action: "list-oeuvres", page, pageSize: 100 }),
      });
      const data = await res.json();
      if (data.data) all = [...all, ...data.data];
      const pagination = data.meta?.pagination;
      hasMore = pagination && page < pagination.pageCount;
      page++;
    }
    return all;
  }, []);

  // ─── Fetch chapitres locaux d'une oeuvre ───
  const fetchLocalChapters = useCallback(async (oeuvreDocId) => {
    const jwt = Cookies.get("jwt");
    let all = [];
    let page = 1;
    let hasMore = true;
    while (hasMore) {
      const res = await fetch(
        `/api/proxy/chapitres?filters[oeuvres][documentId][$eq]=${oeuvreDocId}&fields[0]=titre&fields[1]=order&fields[2]=documentId&fields[3]=tome&sort=order:asc&pagination[page]=${page}&pagination[pageSize]=100`,
        { headers: { Authorization: `Bearer ${jwt}` } }
      );
      const data = await res.json();
      if (data.data) all = [...all, ...data.data];
      const pagination = data.meta?.pagination;
      hasMore = pagination && page < pagination.pageCount;
      page++;
    }
    return all;
  }, []);

  // ─── Fetch chapitres Novel-Index d'une oeuvre ───
  const fetchIndexChapters = useCallback(async (oeuvreDocId) => {
    const jwt = Cookies.get("jwt");
    let all = [];
    let page = 1;
    let hasMore = true;
    while (hasMore) {
      const res = await fetch("/api/novel-index", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({
          action: "list-chapitres",
          oeuvreDocumentId: oeuvreDocId,
          page,
          pageSize: 100,
        }),
      });
      const data = await res.json();
      if (data.data) all = [...all, ...data.data];
      const pagination = data.meta?.pagination;
      hasMore = pagination && page < pagination.pageCount;
      page++;
    }
    return all;
  }, []);

  // ─── Construire l'URL locale d'un chapitre (nouveau format) ───
  const buildLocalUrl = (oeuvreDocId, order) => {
    return `https://trad-index.com/oeuvre/${oeuvreDocId}/chapitre/${order}`;
  };

  // ─── Ancien format d'URL (pour matching rétrocompatible) ───
  const buildOldUrl = (chapterDocId) => {
    return `https://trad-index.com/chapitre/${chapterDocId}`;
  };

  // ─── Comparer les chapitres d'une paire d'oeuvres ───
  const compareChapters = (localChapters, indexChapters, oeuvreDocId) => {
    // Indexer les chapitres Novel-Index par leur URL
    const indexByUrl = new Map();
    const indexByOrder = new Map();
    for (const ch of indexChapters) {
      if (ch.url) indexByUrl.set(ch.url, ch);
      if (ch.order != null) indexByOrder.set(ch.order, ch);
    }

    // Pour chaque chapitre local, vérifier si Novel-Index a une correspondance par URL
    const results = [];
    const matchedIndexIds = new Set();

    for (const localCh of localChapters) {
      const localUrl = buildLocalUrl(oeuvreDocId, localCh.order);
      const oldUrl = buildOldUrl(localCh.documentId);

      // Chercher par URL actuelle (nouveau format)
      let indexMatch = indexByUrl.get(localUrl);
      let urlMatchType = "exact";

      // Chercher par ancien format d'URL
      if (!indexMatch) {
        indexMatch = indexByUrl.get(oldUrl);
        urlMatchType = "old-format";
      }

      // Fallback: chercher par order
      if (!indexMatch && localCh.order != null) {
        indexMatch = indexByOrder.get(localCh.order);
        urlMatchType = "order-only";
      }

      if (indexMatch) {
        matchedIndexIds.add(indexMatch.documentId);
        const urlOk = indexMatch.url === localUrl;
        results.push({
          order: localCh.order,
          titre: localCh.titre,
          localChapter: localCh,
          indexChapter: indexMatch,
          localUrl,
          indexUrl: indexMatch.url || null,
          status: "both",
          urlMatch: urlOk,
          urlMatchType: urlOk ? "exact" : urlMatchType,
        });
      } else {
        results.push({
          order: localCh.order,
          titre: localCh.titre,
          localChapter: localCh,
          indexChapter: null,
          localUrl,
          indexUrl: null,
          status: "missing-index",
          urlMatch: false,
          urlMatchType: "absent",
        });
      }
    }

    // Chapitres sur Novel-Index qui n'ont pas de match local
    for (const indexCh of indexChapters) {
      if (!matchedIndexIds.has(indexCh.documentId)) {
        results.push({
          order: indexCh.order,
          titre: indexCh.titre,
          localChapter: null,
          indexChapter: indexCh,
          localUrl: null,
          canonicalUrl: null,
          indexUrl: indexCh.url || null,
          status: "missing-local",
          urlMatch: false,
          urlMatchType: "absent",
        });
      }
    }

    results.sort((a, b) => (a.order || 0) - (b.order || 0));
    return results;
  };

  // ─── Lancer la comparaison complète ───
  const runComparison = useCallback(async () => {
    setLoadingData(true);
    setComparison(null);
    setExpandedOeuvre(null);
    setLoadingProgress("Récupération des œuvres…");
    try {
      const [local, index] = await Promise.all([
        fetchAllLocalOeuvres(),
        fetchAllIndexOeuvres(),
      ]);

      setLoadingProgress(`${local.length} œuvres locales, ${index.length} sur Novel-Index. Matching…`);

      // ─── Matching non-strict par titre normalisé ───
      const localByNorm = new Map();
      for (const o of local) {
        const key = normalize(o.titre);
        if (!localByNorm.has(key)) localByNorm.set(key, []);
        localByNorm.get(key).push(o);
      }

      const indexByNorm = new Map();
      for (const o of index) {
        const key = normalize(o.titre);
        if (!indexByNorm.has(key)) indexByNorm.set(key, []);
        indexByNorm.get(key).push(o);
      }

      const allKeys = new Set([...localByNorm.keys(), ...indexByNorm.keys()]);
      const oeuvreResults = [];

      for (const key of allKeys) {
        const locs = localByNorm.get(key) || [];
        const idxs = indexByNorm.get(key) || [];
        const loc = locs[0] || null;
        const idx = idxs[0] || null;

        oeuvreResults.push({
          normalizedKey: key,
          titre: loc?.titre || idx?.titre,
          localTitre: loc?.titre || null,
          indexTitre: idx?.titre || null,
          titresDifferent: loc && idx && loc.titre !== idx.titre,
          local: loc,
          index: idx,
          status: !loc ? "missing-local" : !idx ? "missing-index" : "both",
          chapters: null,
          chaptersError: null,
        });
      }

      oeuvreResults.sort((a, b) => a.titre.localeCompare(b.titre));

      // ─── Auto-load chapitres pour toutes les oeuvres "both" ───
      const bothOeuvres = oeuvreResults.filter((o) => o.status === "both");
      setLoadingProgress(`Vérification des chapitres pour ${bothOeuvres.length} œuvres…`);

      // Charger par batch de 3 pour ne pas surcharger
      for (let i = 0; i < bothOeuvres.length; i += 3) {
        const batch = bothOeuvres.slice(i, i + 3);
        setLoadingProgress(
          `Chapitres… ${Math.min(i + 3, bothOeuvres.length)}/${bothOeuvres.length}`
        );

        const batchResults = await Promise.all(
          batch.map(async (item) => {
            try {
              const [localCh, indexCh] = await Promise.all([
                fetchLocalChapters(item.local.documentId),
                fetchIndexChapters(item.index.documentId),
              ]);
              const chapterComparison = compareChapters(localCh, indexCh, item.local.documentId);
              return {
                key: item.normalizedKey,
                chapters: {
                  local: localCh,
                  index: indexCh,
                  comparison: chapterComparison,
                },
              };
            } catch (err) {
              console.error(`Erreur chapitres ${item.titre}:`, err);
              return {
                key: item.normalizedKey,
                chaptersError: err.message,
              };
            }
          })
        );

        for (const br of batchResults) {
          const oeuvre = oeuvreResults.find((o) => o.normalizedKey === br.key);
          if (oeuvre) {
            if (br.chapters) oeuvre.chapters = br.chapters;
            if (br.chaptersError) oeuvre.chaptersError = br.chaptersError;
          }
        }
      }

      setComparison(oeuvreResults);
    } catch (err) {
      console.error("Erreur comparaison:", err);
    } finally {
      setLoadingData(false);
      setLoadingProgress("");
    }
  }, [fetchAllLocalOeuvres, fetchAllIndexOeuvres, fetchLocalChapters, fetchIndexChapters]);

  // ─── Calcul des stats ───
  const stats = comparison
    ? {
        total: comparison.length,
        both: comparison.filter((i) => i.status === "both").length,
        missingIndex: comparison.filter((i) => i.status === "missing-index").length,
        missingLocal: comparison.filter((i) => i.status === "missing-local").length,
        totalChaptersLocal: comparison.reduce((sum, o) => sum + (o.chapters?.local?.length || 0), 0),
        totalChaptersIndex: comparison.reduce((sum, o) => sum + (o.chapters?.index?.length || 0), 0),
        chaptersUrlOk: comparison.reduce(
          (sum, o) => sum + (o.chapters?.comparison?.filter((c) => c.urlMatch).length || 0), 0
        ),
        chaptersUrlMismatch: comparison.reduce(
          (sum, o) => sum + (o.chapters?.comparison?.filter((c) => c.status === "both" && !c.urlMatch).length || 0), 0
        ),
        chaptersMissingIndex: comparison.reduce(
          (sum, o) => sum + (o.chapters?.comparison?.filter((c) => c.status === "missing-index").length || 0), 0
        ),
        chaptersMissingLocal: comparison.reduce(
          (sum, o) => sum + (o.chapters?.comparison?.filter((c) => c.status === "missing-local").length || 0), 0
        ),
      }
    : null;

  // ─── Helper: compte les problèmes d'une oeuvre ───
  const countProblems = (item) => {
    if (!item.chapters) return 0;
    return item.chapters.comparison.filter((c) => c.status !== "both" || !c.urlMatch).length;
  };

  // ─── Filtrage oeuvres ───
  const filteredComparison = comparison
    ? comparison
        .filter((item) => item.status !== "missing-local") // Jamais afficher les absentes de Trad-Index
        .filter((item) => {
          if (filter === "all") return true;
          if (filter === "missing-index") return item.status === "missing-index";
          if (filter === "problems") {
            if (item.status === "missing-index") return true;
            return countProblems(item) > 0;
          }
          return true;
        })
    : [];

  // ─── Vérification admin ───
  if (user?.email !== "agaudin76@gmail.com") {
    return (
      <div className="text-center text-red-400 py-12">Accès non autorisé.</div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Comparaison Trad-Index / Novel-Index</h1>
            <p className="text-sm text-gray-400">
              Matching non-strict des œuvres + vérification URLs de tous les chapitres
            </p>
          </div>
        </div>
      </div>

      {/* Bouton lancer */}
      {!comparison && (
        <div className="flex flex-col items-center gap-4">
          <button
            onClick={runComparison}
            disabled={loadingData}
            className="px-8 py-4 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 text-lg"
          >
            {loadingData ? (
              <>
                <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                Analyse en cours…
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Lancer la comparaison complète
              </>
            )}
          </button>
          {loadingProgress && (
            <p className="text-sm text-gray-400 animate-pulse">{loadingProgress}</p>
          )}
        </div>
      )}

      {/* Stats Oeuvres */}
      {stats && (
        <>
          <h2 className="text-lg font-semibold text-white mb-3">Œuvres</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-white">{stats.total}</div>
              <div className="text-sm text-gray-400 mt-1">Œuvres total</div>
            </div>
            <div className="bg-gray-800 border border-emerald-800/50 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-emerald-400">{stats.both}</div>
              <div className="text-sm text-gray-400 mt-1">Des 2 côtés</div>
            </div>
            <div className="bg-gray-800 border border-amber-800/50 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-amber-400">{stats.missingIndex}</div>
              <div className="text-sm text-gray-400 mt-1">Absentes Novel-Index</div>
            </div>
          </div>

          {/* Stats Chapitres */}
          <h2 className="text-lg font-semibold text-white mb-3">Chapitres (URLs)</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-800 border border-emerald-800/50 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-emerald-400">{stats.chaptersUrlOk}</div>
              <div className="text-sm text-gray-400 mt-1">URL OK</div>
            </div>
            <div className="bg-gray-800 border border-orange-800/50 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-orange-400">{stats.chaptersUrlMismatch}</div>
              <div className="text-sm text-gray-400 mt-1">URL différente</div>
            </div>
            <div className="bg-gray-800 border border-amber-800/50 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-amber-400">{stats.chaptersMissingIndex}</div>
              <div className="text-sm text-gray-400 mt-1">Absents Novel-Index</div>
            </div>
          </div>
        </>
      )}

      {/* Filtres */}
      {comparison && (
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="flex gap-2 flex-wrap">
            {[
              { key: "problems", label: "Avec problèmes", count: comparison.filter((i) => i.status !== "missing-local" && (i.status === "missing-index" || countProblems(i) > 0)).length },
              { key: "all", label: "Toutes", count: comparison.filter((i) => i.status !== "missing-local").length },
              { key: "missing-index", label: "Absentes Novel-Index", count: stats?.missingIndex },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  filter === f.key
                    ? "bg-indigo-500 text-white"
                    : "bg-gray-700 text-gray-400 hover:text-white hover:bg-gray-600"
                }`}
              >
                {f.label} ({f.count})
              </button>
            ))}
          </div>
          <button
            onClick={() => {
              setComparison(null);
              setExpandedOeuvre(null);
              setFilter("all");
              setTimeout(() => runComparison(), 100);
            }}
            disabled={loadingData}
            className="ml-auto px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white rounded-lg text-sm font-medium transition-all disabled:opacity-50 flex items-center gap-2"
          >
            <svg className={`w-4 h-4 ${loadingData ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Actualiser
          </button>
        </div>
      )}

      {/* Liste des oeuvres */}
      {comparison && (
        <div className="space-y-2">
          {filteredComparison.map((item) => {
            const problems = countProblems(item);
            const isExpanded = expandedOeuvre === item.normalizedKey;

            return (
              <div key={item.normalizedKey} className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
                {/* Oeuvre header */}
                <button
                  onClick={() => setExpandedOeuvre(isExpanded ? null : item.normalizedKey)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left transition-all hover:bg-gray-700/50 cursor-pointer"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                      item.status !== "both"
                        ? "bg-red-500"
                        : problems === 0
                        ? "bg-emerald-500"
                        : "bg-amber-500"
                    }`}></div>
                    <div className="min-w-0">
                      <span className="text-white font-medium truncate block">{item.titre}</span>
                      {item.titresDifferent && (
                        <span className="text-xs text-orange-400 truncate block">
                          Titres différents : &quot;{item.localTitre}&quot; vs &quot;{item.indexTitre}&quot;
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {item.status === "both" && item.chapters && (
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                        problems === 0
                          ? "bg-emerald-500/20 text-emerald-300"
                          : "bg-amber-500/20 text-amber-300"
                      }`}>
                        {problems === 0
                          ? `${item.chapters.local.length} ch. OK`
                          : `${problems} problème${problems > 1 ? "s" : ""}`}
                      </span>
                    )}
                    {item.status !== "both" && (
                      <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                        item.status === "missing-index"
                          ? "bg-amber-500/20 text-amber-300"
                          : "bg-red-500/20 text-red-300"
                      }`}>
                        {item.status === "missing-index" ? "Absent Novel-Index" : "Absent Trad-Index"}
                      </span>
                    )}
                    <svg className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {/* Détails chapitres */}
                {isExpanded && (
                  <div className="border-t border-gray-700 px-5 py-4">
                    {item.status !== "both" ? (
                      <div className="text-sm text-gray-400">
                        {item.status === "missing-index"
                          ? "Cette œuvre n'existe pas sur Novel-Index."
                          : "Cette œuvre n'existe pas sur Trad-Index (présente uniquement sur Novel-Index)."}
                      </div>
                    ) : item.chaptersError ? (
                      <div className="text-red-400 text-sm">Erreur : {item.chaptersError}</div>
                    ) : item.chapters ? (
                      <>
                        {/* Résumé chapitres */}
                        <div className="flex flex-wrap gap-4 mb-4 text-sm">
                          <span className="text-indigo-300">
                            Trad-Index : <span className="font-bold text-white">{item.chapters.local.length}</span> ch.
                          </span>
                          <span className="text-purple-300">
                            Novel-Index : <span className="font-bold text-white">{item.chapters.index.length}</span> ch.
                          </span>
                          {(() => {
                            const urlOk = item.chapters.comparison.filter((c) => c.urlMatch).length;
                            const urlBad = item.chapters.comparison.filter((c) => c.status === "both" && !c.urlMatch).length;
                            const missing = item.chapters.comparison.filter((c) => c.status !== "both").length;
                            return (
                              <>
                                {urlOk > 0 && <span className="text-emerald-300">{urlOk} URL OK</span>}
                                {urlBad > 0 && <span className="text-orange-300">{urlBad} URL différente</span>}
                                {missing > 0 && <span className="text-amber-300">{missing} absent{missing > 1 ? "s" : ""}</span>}
                              </>
                            );
                          })()}
                        </div>

                        {/* Filtre chapitres */}
                        <div className="flex gap-2 mb-3">
                          <button
                            onClick={() => setChapterFilter("problems")}
                            className={`px-3 py-1 rounded text-xs font-medium transition ${
                              chapterFilter === "problems" ? "bg-indigo-500 text-white" : "bg-gray-700 text-gray-400"
                            }`}
                          >
                            Problèmes
                          </button>
                          <button
                            onClick={() => setChapterFilter("all")}
                            className={`px-3 py-1 rounded text-xs font-medium transition ${
                              chapterFilter === "all" ? "bg-indigo-500 text-white" : "bg-gray-700 text-gray-400"
                            }`}
                          >
                            Tous
                          </button>
                        </div>

                        {/* Liste chapitres */}
                        <div className="max-h-[600px] overflow-y-auto space-y-1">
                          {item.chapters.comparison
                            .filter((c) => c.status !== "missing-local") // Pas d'absent Trad-Index
                            .filter((c) => chapterFilter === "all" || c.status !== "both" || !c.urlMatch)
                            .map((c, idx) => (
                              <div
                                key={`${c.order}-${idx}`}
                                className={`px-3 py-3 rounded-lg text-sm ${
                                  c.status === "missing-index"
                                    ? "bg-amber-500/10 border border-amber-800/30"
                                    : c.urlMatch
                                    ? "bg-emerald-500/5 border border-emerald-800/20"
                                    : "bg-orange-500/10 border border-orange-800/30"
                                }`}
                              >
                                {/* Ligne principale : order + titre + tome + badge statut */}
                                <div className="flex items-center gap-3">
                                  <span className="font-mono text-xs text-gray-500 w-10 flex-shrink-0">
                                    #{c.order}
                                  </span>
                                  <span className={`font-medium ${
                                    c.urlMatch ? "text-gray-300" : "text-white"
                                  }`}>
                                    {c.titre || `Chapitre ${c.order}`}
                                  </span>
                                  {c.localChapter?.tome && (
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 flex-shrink-0">
                                      Tome {c.localChapter.tome}
                                    </span>
                                  )}
                                  <span className={`ml-auto text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                                    c.status === "missing-index"
                                      ? "bg-amber-900/50 text-amber-300"
                                      : c.urlMatch
                                      ? "bg-emerald-900/50 text-emerald-300"
                                      : "bg-orange-900/50 text-orange-300"
                                  }`}>
                                    {c.status === "missing-index"
                                      ? "Absent Novel-Index"
                                      : c.urlMatch
                                      ? "URL OK"
                                      : "URL ≠"}
                                  </span>
                                </div>

                                {/* URL du chapitre (toujours visible) */}
                                <div className="mt-1.5 ml-10 text-xs space-y-0.5">
                                  {c.localUrl && (
                                    <div className="flex gap-2">
                                      <span className="text-gray-500 w-28 flex-shrink-0">URL Trad-Index :</span>
                                      <a href={c.localUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 break-all hover:underline">
                                        {c.localUrl}
                                      </a>
                                    </div>
                                  )}
                                  {c.status === "both" && (
                                    <div className="flex gap-2">
                                      <span className="text-gray-500 w-28 flex-shrink-0">URL Novel-Index :</span>
                                      <span className={`break-all ${
                                        c.urlMatch ? "text-emerald-400" : c.indexUrl ? "text-orange-400" : "text-red-400 italic"
                                      }`}>
                                        {c.indexUrl || "Aucune URL"}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          {item.chapters.comparison
                            .filter((c) => c.status !== "missing-local")
                            .filter((c) => chapterFilter === "all" || c.status !== "both" || !c.urlMatch)
                            .length === 0 && (
                            <div className="text-emerald-400 text-sm flex items-center gap-2 py-2">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                              </svg>
                              Tous les chapitres sont synchronisés avec les bonnes URLs
                            </div>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="text-gray-400 text-sm">Données non chargées.</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {filteredComparison.length === 0 && (
            <div className="text-center text-gray-500 py-12">
              Aucune œuvre ne correspond au filtre sélectionné.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
