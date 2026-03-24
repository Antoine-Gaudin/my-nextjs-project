"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import TeamAnnonces from "./TeamAnnonces";
import BannerCarousel from "./BannerCarousel";

export default function FicheOeuvre({ oeuvre, onClose }) {
  const [chapitres, setChapitres] = useState(null);
  const [filteredChapitres, setFilteredChapitres] = useState([]);
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [tags, setTags] = useState([]);
  const [genres, setGenres] = useState([]);

  // Novel-Index URL
  const novelIndexUrl = useMemo(() => {
    if (!oeuvre?.novelIndexDocumentId) return null;
    const titre = oeuvre.novelIndexTitre || oeuvre.titre || "";
    const slug = titre
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return `https://novel-index.com/oeuvre/${oeuvre.novelIndexDocumentId}-${slug}`;
  }, [oeuvre]);
  const [users, setUsers] = useState([]);
  const [isLoadingChapitres, setIsLoadingChapitres] = useState(true);
  const [activeTab, setActiveTab] = useState("synopsis");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortOrder, setSortOrder] = useState("desc");
  const [showAllSynopsis, setShowAllSynopsis] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [shareTooltip, setShareTooltip] = useState(false);
  const [showOeuvreShareCard, setShowOeuvreShareCard] = useState(false);
  const [oeuvreShareCardUrl, setOeuvreShareCardUrl] = useState(null);
  const [selectedTome, setSelectedTome] = useState("all");
  
  // ─── Scan state (séparé des chapitres) ───
  const [scans, setScans] = useState([]);

  // Types d'œuvres qui supportent les scans
  const SCAN_TYPES = ['scan', 'manga', 'manhua', 'manhwa'];
  const isScanType = SCAN_TYPES.includes(oeuvre?.type?.toLowerCase());

  const router = useRouter();

  // Chapitres triés
  const sortedChapitres = useMemo(() => {
    return filteredChapitres.slice().sort((a, b) => 
      sortOrder === "asc" ? a.order - b.order : b.order - a.order
    );
  }, [filteredChapitres, sortOrder]);

  const allSortedChapitres = useMemo(() => {
    return (chapitres || []).slice().sort((a, b) => a.order - b.order);
  }, [chapitres]);

  const CHAPTERS_PER_PAGE = 50;

  const paginatedChapitres = useMemo(() => {
    const start = (currentPage - 1) * CHAPTERS_PER_PAGE;
    return sortedChapitres.slice(start, start + CHAPTERS_PER_PAGE);
  }, [sortedChapitres, currentPage]);

  const totalPages = Math.ceil(sortedChapitres.length / CHAPTERS_PER_PAGE) || 1;

  const firstChapter = allSortedChapitres[0];
  const lastChapter = allSortedChapitres[allSortedChapitres.length - 1];

  // Liste des tomes uniques
  const tomes = useMemo(() => {
    if (!chapitres) return [];
    const uniqueTomes = [...new Set(chapitres.map(c => c.tome).filter(Boolean))];
    return uniqueTomes.sort((a, b) => a - b);
  }, [chapitres]);

  // Statistiques
  const stats = useMemo(() => {
    if (!chapitres) return { total: 0, pdf: 0, online: 0, readingTime: 0 };
    const pdfCount = chapitres.filter(c => c.pdf && c.pdf.trim() !== "").length;
    const onlineCount = chapitres.length - pdfCount;
    const readingTime = chapitres.length * 3;
    return { total: chapitres.length, pdf: pdfCount, online: onlineCount, readingTime };
  }, [chapitres]);

  // Image de couverture sécurisée
  const coverUrl = oeuvre?.couverture?.[0]?.url || null;

  // Formatage du temps de lecture
  const formatReadingTime = (minutes) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  };

  // Partage lien
  const handleShare = async () => {
    const url = window.location.origin + `/oeuvre/${oeuvre.documentId}`;
    try {
      await navigator.clipboard.writeText(url);
      setShareTooltip(true);
      setTimeout(() => setShareTooltip(false), 2000);
    } catch {}
  };

  // Partage carte image
  const generateOeuvreCard = async () => {
    try {
      const canvas = document.createElement("canvas");
      const w = 1200, h = 630;
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d");

      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, "#1e1b4b"); grad.addColorStop(0.5, "#312e81"); grad.addColorStop(1, "#1e1b4b");
      ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);

      ctx.fillStyle = "rgba(99, 102, 241, 0.05)";
      for (let i = 0; i < 15; i++) {
        ctx.beginPath(); ctx.arc(Math.random() * w, Math.random() * h, Math.random() * 80 + 20, 0, Math.PI * 2); ctx.fill();
      }

      const coverSrc = oeuvre?.couverture?.[0]?.url;
      let coverLoaded = false;
      if (coverSrc) {
        try {
          const img = new window.Image();
          img.crossOrigin = "anonymous";
          await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = coverSrc; setTimeout(rej, 5000); });
          ctx.save();
          ctx.shadowColor = "rgba(0,0,0,0.5)"; ctx.shadowBlur = 30; ctx.shadowOffsetX = 5; ctx.shadowOffsetY = 5;
          const cW = 200, cH = 290, cX = 80, cY = (h - cH) / 2;
          ctx.beginPath(); ctx.roundRect(cX, cY, cW, cH, 12); ctx.clip();
          ctx.drawImage(img, cX, cY, cW, cH);
          ctx.restore();
          ctx.strokeStyle = "rgba(255,255,255,0.15)"; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.roundRect(cX, cY, cW, cH, 12); ctx.stroke();
          coverLoaded = true;
        } catch {}
      }

      const tx = coverLoaded ? 340 : 80;
      const tw = w - tx - 80;

      ctx.fillStyle = "#e0e7ff"; ctx.font = "bold 40px 'Inter', system-ui, sans-serif";
      const words = (oeuvre?.titre || "").split(" ");
      let line = "", ty = 180;
      for (const word of words) {
        const test = line ? line + " " + word : word;
        if (ctx.measureText(test).width > tw && line) { ctx.fillText(line, tx, ty); ty += 50; line = word; } else { line = test; }
      }
      if (line) { ctx.fillText(line, tx, ty); ty += 50; }

      ty += 10;
      ctx.fillStyle = "#a5b4fc"; ctx.font = "500 24px 'Inter', system-ui, sans-serif";
      const typeLabel = oeuvre?.type ? oeuvre.type.charAt(0).toUpperCase() + oeuvre.type.slice(1) : "";
      const chapCount = allSortedChapitres?.length || chapitres?.length || 0;
      ctx.fillText(`${typeLabel}${typeLabel && chapCount ? " — " : ""}${chapCount ? chapCount + " chapitres" : ""}`, tx, ty);

      if (oeuvre?.synopsis) {
        ty += 40;
        ctx.fillStyle = "rgba(199, 210, 254, 0.7)"; ctx.font = "18px 'Inter', system-ui, sans-serif";
        const synText = typeof oeuvre.synopsis === "string" ? oeuvre.synopsis : (oeuvre.synopsis?.[0]?.children?.[0]?.text || "");
        const synWords = synText.slice(0, 200).split(" ");
        let sl = ""; let lc = 0;
        for (const sw of synWords) {
          const st = sl ? sl + " " + sw : sw;
          if (ctx.measureText(st).width > tw && sl) { ctx.fillText(sl, tx, ty); ty += 26; sl = sw; lc++; if (lc >= 3) { sl += "..."; ctx.fillText(sl, tx, ty); sl = ""; break; } } else { sl = st; }
        }
        if (sl) ctx.fillText(sl, tx, ty);
      }

      ctx.fillStyle = "rgba(165, 180, 252, 0.4)"; ctx.font = "bold 18px 'Inter', system-ui, sans-serif";
      ctx.fillText("trad-index.com", w - 200, h - 30);
      const lg = ctx.createLinearGradient(0, h - 4, w, h - 4);
      lg.addColorStop(0, "transparent"); lg.addColorStop(0.3, "#818cf8"); lg.addColorStop(0.7, "#a78bfa"); lg.addColorStop(1, "transparent");
      ctx.fillStyle = lg; ctx.fillRect(0, h - 4, w, 4);

      setOeuvreShareCardUrl(canvas.toDataURL("image/png"));
      setShowOeuvreShareCard(true);
    } catch (err) { console.error("Share card error:", err); }
  };

  const downloadOeuvreCard = () => {
    if (!oeuvreShareCardUrl) return;
    const a = document.createElement("a");
    a.href = oeuvreShareCardUrl;
    a.download = "trad-index-oeuvre.png";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Tracking — enregistrer un événement
  const trackEvent = (type) => {
    if (!oeuvre?.documentId) return;
    fetch("/api/tracking", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        cibleType: "oeuvre",
        cibleId: oeuvre.documentId,
        oeuvreId: oeuvre.documentId,
      }),
    }).catch(() => {});
  };

  // Tracking — vue de la fiche œuvre (timer 5s)
  useEffect(() => {
    if (!oeuvre?.documentId) return;
    const timer = setTimeout(() => trackEvent("vue"), 5000);
    return () => clearTimeout(timer);
  }, [oeuvre?.documentId]);

  // Charger l'état favori/abonné persistant
  useEffect(() => {
    if (!oeuvre?.documentId) return;
    fetch(`/api/favoris?oeuvreId=${oeuvre.documentId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.liked) setIsFavorite(true);
        if (data.subscribed) setIsSubscribed(true);
      })
      .catch(() => {});
  }, [oeuvre?.documentId]);

  // Fetch métadonnées de l'oeuvre (tags, genres, users) — rapide, sans chapitres
  useEffect(() => {
    async function fetchMeta() {
      try {
        const response = await fetch(
          `/api/proxy/oeuvres/${oeuvre.documentId}?populate=tags&populate=genres&populate=users`
        );
        const data = await response.json();
        if (data.data) {
          setTags(data.data.tags || []);
          setGenres(data.data.genres || []);
          setUsers(data.data.users || []);
        }
      } catch (error) {
        console.error("Erreur lors de la récupération des métadonnées :", error);
      }
    }
    if (oeuvre?.documentId) fetchMeta();
  }, [oeuvre]);

  // Fetch chapitres de manière progressive (batch par batch)
  useEffect(() => {
    let cancelled = false;
    async function fetchChapitresProgressively() {
      setIsLoadingChapitres(true);
      try {
        let page = 1;
        let pageCount = 1;
        let accumulated = [];
        do {
          const res = await fetch(
            `/api/proxy/chapitres?filters[oeuvres][documentId][$eq]=${oeuvre.documentId}&fields[0]=titre&fields[1]=order&fields[2]=tome&fields[3]=pdf&fields[4]=publishedAt&fields[5]=documentId&sort=order:asc&pagination[page]=${page}&pagination[pageSize]=100`
          );
          const data = await res.json();
          if (cancelled) return;
          const batch = data.data || [];
          accumulated = [...accumulated, ...batch];
          // Mettre à jour l'état après chaque batch pour affichage progressif
          setChapitres([...accumulated]);
          setFilteredChapitres([...accumulated]);
          pageCount = data.meta?.pagination?.pageCount || 1;
          page++;
        } while (page <= pageCount);
      } catch (error) {
        console.error("Erreur lors de la récupération des chapitres :", error);
      } finally {
        if (!cancelled) setIsLoadingChapitres(false);
      }
    }
    if (oeuvre?.documentId) fetchChapitresProgressively();
    return () => { cancelled = true; };
  }, [oeuvre]);

  // Fetch scans (séparé des chapitres) — léger : pas de populate image, juste les numéros de page pour le count
  useEffect(() => {
    async function fetchScans() {
      try {
        const res = await fetch(
          `/api/proxy/scans?filters[oeuvres][documentId][$eq]=${oeuvre.documentId}&fields[0]=titre&fields[1]=order&fields[2]=tome&fields[3]=documentId&sort=order:asc&populate[pages][fields][0]=numero`
        );
        if (res.ok) {
          const data = await res.json();
          setScans(data.data || []);
        }
      } catch (err) {
        console.error("Erreur scans :", err);
      }
    }
    if (oeuvre?.documentId && isScanType) fetchScans();
  }, [oeuvre, isScanType]);

  // Filtrage des chapitres
  useEffect(() => {
    if (chapitres) {
      let filtered = [...chapitres];
      
      // Filtre par type (PDF/en ligne)
      if (filter === "pdf") {
        filtered = filtered.filter((c) => c.pdf && c.pdf.trim() !== "");
      } else if (filter === "online") {
        filtered = filtered.filter((c) => !c.pdf || c.pdf.trim() === "");
      }

      // Filtre par tome
      if (selectedTome !== "all") {
        filtered = filtered.filter((c) => c.tome === parseInt(selectedTome));
      }

      // Recherche
      if (searchTerm.trim() !== "") {
        const term = searchTerm.toLowerCase();
        filtered = filtered.filter((c) =>
          c.titre?.toLowerCase().includes(term) ||
          c.order?.toString().includes(term)
        );
      }

      setFilteredChapitres(filtered);
    }
  }, [filter, chapitres, searchTerm, selectedTome]);

  // Réinitialiser la page lors du changement de filtres
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, searchTerm, selectedTome, sortOrder]);

  // Extraction du synopsis
  const getSynopsis = () => {
    if (Array.isArray(oeuvre?.synopsis) && oeuvre.synopsis.length > 0) {
      return oeuvre.synopsis
        .map((item) => item.children?.map((child) => child.text).join(" "))
        .join("\n\n");
    }
    return "Aucun synopsis disponible.";
  };

  const synopsis = getSynopsis();
  const isSynopsisLong = synopsis.length > 500;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex justify-center items-start p-0 sm:p-4 overflow-y-auto"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative bg-gray-950 text-white w-full max-w-6xl min-h-screen sm:min-h-0 sm:max-h-[95vh] sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-fadeIn">

        {/* Image de fond ABSOLUE derrière tout le contenu */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: coverUrl
              ? `url('${coverUrl}')`
              : `url('/images/HeroHeader.webp')`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-gray-900/90 to-gray-950" />
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-900/10 to-purple-900/10" />

        {/* Actions header (partager, favori, fermer) */}
        <div className="absolute top-4 right-4 flex items-center gap-2 z-30">
          {/* Partager */}
          <div className="relative">
            <button
              className="w-10 h-10 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-sm hover:bg-indigo-600 text-white transition-all duration-300"
              onClick={handleShare}
              title="Partager"
              aria-label="Partager"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </button>
            {shareTooltip && (
              <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 px-3 py-1 bg-green-600 text-white text-xs rounded-lg whitespace-nowrap animate-fadeIn">
                Lien copié !
              </div>
            )}
          </div>

          {/* Partager carte image */}
          <button
            className="w-10 h-10 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-sm hover:bg-purple-600 text-white transition-all duration-300"
            onClick={generateOeuvreCard}
            title="Partager une image"
            aria-label="Générer une carte de partage"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </button>

          {/* Favori / Like */}
          <button
            className={`w-10 h-10 flex items-center justify-center rounded-full backdrop-blur-sm transition-all duration-300 ${
              isFavorite ? "bg-red-600 text-white" : "bg-black/40 hover:bg-red-600 text-white"
            }`}
            onClick={() => { setIsFavorite(!isFavorite); if (!isFavorite) trackEvent("like"); }}
            title={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
            aria-label={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
          >
            <svg className={`w-5 h-5 transition-transform duration-300 ${isFavorite ? "scale-110" : ""}`} fill={isFavorite ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </button>

          {/* S'abonner */}
          <button
            className={`w-10 h-10 flex items-center justify-center rounded-full backdrop-blur-sm transition-all duration-300 ${
              isSubscribed ? "bg-indigo-600 text-white" : "bg-black/40 hover:bg-indigo-600 text-white"
            }`}
            onClick={() => { setIsSubscribed(!isSubscribed); if (!isSubscribed) trackEvent("abonne"); }}
            title={isSubscribed ? "Se désabonner" : "S'abonner"}
            aria-label={isSubscribed ? "Se désabonner" : "S'abonner"}
          >
            <svg className={`w-5 h-5 transition-transform duration-300 ${isSubscribed ? "scale-110" : ""}`} fill={isSubscribed ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </button>

          {/* Page complète */}
          <button
            className="w-10 h-10 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-sm hover:bg-indigo-600 text-white transition-all duration-300"
            onClick={() => router.push(`/oeuvre/${oeuvre.documentId}`)}
            title="Voir la page complète"
            aria-label="Page complète"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </button>

          {/* Fermer */}
          <button
            className="w-10 h-10 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-sm hover:bg-red-600 text-white transition-all duration-300"
            onClick={onClose}
            title="Fermer"
            aria-label="Fermer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Contenu principal — au-dessus du background */}
        <div className="flex-1 overflow-y-auto no-scrollbar relative z-10 pt-16">
          {/* Section info avec couverture */}
          <div className="px-4 sm:px-8 pb-6">
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Couverture */}
              <div className="flex-shrink-0 mx-auto lg:mx-0">
                <div className="relative group">
                  {coverUrl ? (
                    <Image
                      src={coverUrl}
                      alt={oeuvre?.titre || "Couverture"}
                      className="w-36 h-52 sm:w-44 sm:h-64 object-cover rounded-xl shadow-2xl border-4 border-gray-800 transition-transform duration-300 group-hover:scale-105"
                      width={176}
                      height={256}
                    />
                  ) : (
                    <div className="w-36 h-52 sm:w-44 sm:h-64 rounded-xl bg-gradient-to-br from-indigo-800 to-purple-900 flex items-center justify-center border-4 border-gray-800 shadow-2xl">
                      <span className="text-6xl">📖</span>
                    </div>
                  )}
                  {/* Badge état */}
                  {oeuvre?.etat && (
                    <div className={`absolute -top-2 -right-2 px-3 py-1 rounded-full text-xs font-bold shadow-lg ${
                      oeuvre.etat === "Terminé" ? "bg-green-600" :
                      oeuvre.etat === "En cours" ? "bg-blue-600" :
                      oeuvre.etat === "En pause" ? "bg-amber-600" : "bg-gray-600"
                    }`}>
                      {oeuvre.etat}
                    </div>
                  )}
                </div>
              </div>

              {/* Informations principales */}
              <div className="flex-1 text-center lg:text-left pt-2 lg:pt-16">
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 mb-2">
                  {oeuvre?.type && (
                    <span className="px-2.5 py-0.5 bg-indigo-600/40 text-indigo-300 rounded text-xs font-medium uppercase tracking-wide">
                      {oeuvre.type}
                    </span>
                  )}
                  {oeuvre?.categorie && (
                    <span className="px-2.5 py-0.5 bg-purple-600/40 text-purple-300 rounded text-xs font-medium uppercase tracking-wide">
                      {oeuvre.categorie}
                    </span>
                  )}
                </div>

                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-2 leading-tight">
                  {oeuvre?.titre || "Titre non disponible"}
                </h2>
                
                {oeuvre?.titrealt && (
                  <p className="text-gray-400 text-sm mb-3 italic">
                    {oeuvre.titrealt}
                  </p>
                )}

                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-4 gap-y-1 text-gray-400 mb-4">
                  <span className="flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="text-white font-medium">{oeuvre?.auteur || "Auteur inconnu"}</span>
                  </span>
                  {users.length > 0 && (
                    <span className="flex items-center gap-1.5">
                      <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                      </svg>
                      <span>Traduit par <span className="text-green-400 font-medium">{users[0].username}</span></span>
                    </span>
                  )}
                  {oeuvre?.annee && (
                    <span className="flex items-center gap-1.5">
                      <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>{oeuvre.annee}</span>
                    </span>
                  )}
                </div>

                {/* Statistiques rapides */}
                <div className="flex flex-wrap justify-center lg:justify-start gap-4 mb-5">
                  <div className="flex items-center gap-2 px-3 py-2 bg-gray-800/60 rounded-lg">
                    <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    <div>
                      <div className="text-lg font-bold text-white">{stats.total}</div>
                      <div className="text-xs text-gray-400">chapitres</div>
                    </div>
                  </div>
                  {tomes.length > 1 && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-gray-800/60 rounded-lg">
                      <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                      <div>
                        <div className="text-lg font-bold text-white">{tomes.length}</div>
                        <div className="text-xs text-gray-400">tomes</div>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-2 px-3 py-2 bg-gray-800/60 rounded-lg">
                    <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <div className="text-lg font-bold text-white">{formatReadingTime(stats.readingTime)}</div>
                      <div className="text-xs text-gray-400">lecture estimée</div>
                    </div>
                  </div>
                </div>

                {/* Boutons d'action */}
                <div className="flex flex-wrap gap-3 justify-center lg:justify-start">
                  <button
                    className="group px-6 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-xl font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-600/25 hover:shadow-indigo-600/40 flex items-center gap-2"
                    onClick={() => firstChapter && router.push(`/oeuvre/${oeuvre.documentId}/chapitre/${firstChapter.order}`)}
                    disabled={!firstChapter}
                  >
                    <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Commencer
                  </button>
                  <button
                    className="group px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed border border-gray-700 hover:border-gray-600 flex items-center gap-2"
                    onClick={() => lastChapter && router.push(`/oeuvre/${oeuvre.documentId}/chapitre/${lastChapter.order}`)}
                    disabled={!lastChapter}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                    </svg>
                    Dernier chapitre
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Tags et genres */}
          <div className="px-4 sm:px-8 pb-4">
            <div className="flex flex-wrap gap-2">
              {genres.map((genre, index) => (
                <span key={`genre-${index}`} className="px-3 py-1.5 bg-gradient-to-r from-green-600/30 to-emerald-600/30 text-green-300 rounded-lg text-sm font-medium border border-green-600/20 hover:border-green-600/40 transition-colors cursor-default">
                  {genre.nom}
                </span>
              ))}
              {tags.map((tag, index) => (
                <span key={`tag-${index}`} className="px-3 py-1.5 bg-gradient-to-r from-blue-600/30 to-cyan-600/30 text-blue-300 rounded-lg text-sm font-medium border border-blue-600/20 hover:border-blue-600/40 transition-colors cursor-default">
                  {tag.nom}
                </span>
              ))}
            </div>
          </div>

          {/* Navigation par onglets */}
          <div className="px-4 sm:px-8 border-b border-gray-800">
            <div className="flex gap-1">
              <button
                className={`px-5 py-3 font-medium text-sm transition-all duration-300 relative ${
                  activeTab === "synopsis" 
                    ? "text-indigo-400" 
                    : "text-gray-400 hover:text-gray-300"
                }`}
                onClick={() => setActiveTab("synopsis")}
              >
                Synopsis
                {activeTab === "synopsis" && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full" />
                )}
              </button>
              <button
                className={`px-5 py-3 font-medium text-sm transition-all duration-300 relative flex items-center gap-2 ${
                  activeTab === "chapitres" 
                    ? "text-indigo-400" 
                    : "text-gray-400 hover:text-gray-300"
                }`}
                onClick={() => setActiveTab("chapitres")}
              >
                Chapitres
                <span className={`px-2 py-0.5 rounded-full text-xs ${
                  activeTab === "chapitres" ? "bg-indigo-600/30" : "bg-gray-800"
                }`}>
                  {stats.total}
                </span>
                {activeTab === "chapitres" && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full" />
                )}
              </button>
              <button
                className={`px-5 py-3 font-medium text-sm transition-all duration-300 relative ${
                  activeTab === "infos" 
                    ? "text-indigo-400" 
                    : "text-gray-400 hover:text-gray-300"
                }`}
                onClick={() => setActiveTab("infos")}
              >
                Informations
                {activeTab === "infos" && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full" />
                )}
              </button>
              <button
                className={`px-5 py-3 font-medium text-sm transition-all duration-300 relative flex items-center gap-2 ${
                  activeTab === "annonces" 
                    ? "text-indigo-400" 
                    : "text-gray-400 hover:text-gray-300"
                }`}
                onClick={() => setActiveTab("annonces")}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                </svg>
                Annonces
                {activeTab === "annonces" && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full" />
                )}
              </button>
              {isScanType && scans.length > 0 && (
                <button
                  className={`px-5 py-3 font-medium text-sm transition-all duration-300 relative flex items-center gap-2 ${
                    activeTab === "scans" 
                      ? "text-pink-400" 
                      : "text-gray-400 hover:text-gray-300"
                  }`}
                  onClick={() => setActiveTab("scans")}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Scans
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    activeTab === "scans" ? "bg-pink-600/30" : "bg-gray-800"
                  }`}>
                    {scans.length}
                  </span>
                  {activeTab === "scans" && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-pink-600 to-rose-600 rounded-full" />
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Contenu des onglets */}
          <div className="px-4 sm:px-8 py-6">
            {/* Onglet Synopsis */}
            {activeTab === "synopsis" && (
              <div className="animate-fadeIn">
                <div className={`relative ${!showAllSynopsis && isSynopsisLong ? "max-h-48 overflow-hidden" : ""}`}>
                  <p className="text-gray-300 leading-relaxed whitespace-pre-line text-base">
                    {synopsis}
                  </p>
                  {!showAllSynopsis && isSynopsisLong && (
                    <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-gray-900 to-transparent" />
                  )}
                </div>
                {isSynopsisLong && (
                  <button
                    className="mt-4 text-indigo-400 hover:text-indigo-300 font-medium text-sm flex items-center gap-1 transition-colors"
                    onClick={() => setShowAllSynopsis(!showAllSynopsis)}
                  >
                    {showAllSynopsis ? (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
                        </svg>
                        Réduire
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                        Lire la suite
                      </>
                    )}
                  </button>
                )}
              </div>
            )}

            {/* Onglet Chapitres */}
            {activeTab === "chapitres" && (
              <div className="animate-fadeIn">
                {/* Barre d'outils */}
                <div className="flex flex-col sm:flex-row gap-3 mb-5">
                  {/* Recherche */}
                  <div className="relative flex-1">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      placeholder="Rechercher un chapitre..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-800/80 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 text-sm transition-all"
                    />
                  </div>
                  
                  {/* Filtres */}
                  <div className="flex gap-2 flex-wrap">
                    {/* Filtre par tome */}
                    {tomes.length > 1 && (
                      <select
                        value={selectedTome}
                        onChange={(e) => setSelectedTome(e.target.value)}
                        className="px-3 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:border-indigo-500 cursor-pointer"
                      >
                        <option value="all">Tous les tomes</option>
                        {tomes.map((tome) => (
                          <option key={tome} value={tome}>Tome {tome}</option>
                        ))}
                      </select>
                    )}

                    {/* Filtre par type */}
                    <div className="flex rounded-xl overflow-hidden border border-gray-700">
                      {[
                        { key: "all", label: "Tous" },
                        { key: "online", label: "📖 En ligne" },
                        { key: "pdf", label: "📄 PDF" },
                      ].map(({ key, label }) => (
                        <button
                          key={key}
                          className={`px-3 py-2 text-sm font-medium transition-colors ${
                            filter === key 
                              ? "bg-indigo-600 text-white" 
                              : "bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700"
                          }`}
                          onClick={() => setFilter(key)}
                        >
                          {label}
                        </button>
                      ))}
                    </div>

                    {/* Tri */}
                    <button
                      className="p-2.5 rounded-xl bg-gray-800 border border-gray-700 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
                      onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                      title={sortOrder === "asc" ? "Plus récents d'abord" : "Plus anciens d'abord"}
                    >
                      <svg className={`w-5 h-5 transition-transform duration-300 ${sortOrder === "asc" ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Indicateur de résultats */}
                {searchTerm && (
                  <p className="text-sm text-gray-400 mb-3">
                    {filteredChapitres.length} résultat{filteredChapitres.length !== 1 ? "s" : ""} pour "{searchTerm}"
                  </p>
                )}

                {/* Liste des chapitres */}
                {isLoadingChapitres ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="animate-pulse bg-gray-800/50 rounded-xl p-4">
                        <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-gray-700 rounded w-1/2"></div>
                      </div>
                    ))}
                  </div>
                ) : sortedChapitres.length > 0 ? (
                  <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {paginatedChapitres.map((chapitre, index) => (
                      <div
                        key={chapitre.documentId || index}
                        className="group flex items-center gap-3 p-4 bg-gray-800/50 hover:bg-gray-800 rounded-xl cursor-pointer transition-all duration-300 border border-transparent hover:border-gray-700"
                        onClick={() => {
                          if (chapitre.pdf) {
                            window.open(chapitre.pdf, "_blank");
                          } else {
                            router.push(`/oeuvre/${oeuvre.documentId}/chapitre/${chapitre.order}`);
                          }
                        }}
                      >
                        {/* Numéro */}
                        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gray-700/50 group-hover:bg-indigo-600/30 flex items-center justify-center transition-colors">
                          <span className="text-sm font-bold text-gray-400 group-hover:text-indigo-400">
                            {chapitre.order || index + 1}
                          </span>
                        </div>

                        {/* Contenu */}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-white truncate group-hover:text-indigo-300 transition-colors">
                            {chapitre.titre || "Chapitre sans titre"}
                          </h3>
                          <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                            {chapitre.tome && (
                              <span className="text-purple-400">Tome {chapitre.tome}</span>
                            )}
                            <span>
                              {chapitre.publishedAt
                                ? new Date(chapitre.publishedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
                                : ""}
                            </span>
                          </div>
                        </div>

                        {/* Badges et flèche */}
                        <div className="flex items-center gap-2">
                          {chapitre.pdf && (
                            <span className="px-2 py-1 bg-green-600/20 text-green-400 text-xs rounded-lg font-medium">
                              PDF
                            </span>
                          )}
                          <svg className="w-4 h-4 text-gray-600 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-5 pt-4 border-t border-gray-800">
                      <p className="text-sm text-gray-400">
                        {sortedChapitres.length} chapitre{sortedChapitres.length !== 1 ? "s" : ""} — page {currentPage}/{totalPages}
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          className="px-4 py-2 rounded-xl bg-gray-800 border border-gray-700 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium"
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                        >
                          ← Précédent
                        </button>
                        <span className="text-sm text-gray-400 tabular-nums min-w-[80px] text-center">
                          {(currentPage - 1) * CHAPTERS_PER_PAGE + 1}–{Math.min(currentPage * CHAPTERS_PER_PAGE, sortedChapitres.length)}
                        </span>
                        <button
                          className="px-4 py-2 rounded-xl bg-gray-800 border border-gray-700 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium"
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                        >
                          Suivant →
                        </button>
                      </div>
                    </div>
                  )}
                  </>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-800 flex items-center justify-center">
                      <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    </div>
                    <p className="text-gray-400 font-medium">Aucun chapitre trouvé</p>
                    {searchTerm && (
                      <button
                        className="mt-3 text-indigo-400 hover:text-indigo-300 text-sm"
                        onClick={() => {
                          setSearchTerm("");
                          setFilter("all");
                          setSelectedTome("all");
                        }}
                      >
                        Réinitialiser les filtres
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Onglet Annonces */}
            {activeTab === "annonces" && (
              <TeamAnnonces oeuvreId={oeuvre?.documentId} />
            )}

            {/* Onglet Scans */}
            {activeTab === "scans" && scans.length > 0 && (
              <div className="animate-fadeIn">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {scans.map((scan) => {
                    const pageCount = scan.pages?.length || 0;
                    const readScans = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('readScans') || '{}') : {};
                    const isRead = readScans[scan.documentId];

                    return (
                      <button
                        key={scan.documentId}
                        onClick={() => router.push(`/oeuvre/${oeuvre.documentId}/scan/${scan.order}`)}
                        className="group flex items-center gap-3 p-3 rounded-xl bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700/50 hover:border-pink-600/30 transition-all text-left"
                      >
                        {/* Placeholder numéroté (images non chargées en liste pour la perf) */}
                        <div className="flex-shrink-0 w-16 h-20 rounded-lg bg-gradient-to-br from-pink-600/20 to-purple-600/20 border border-pink-600/20 flex items-center justify-center">
                          <span className="text-xl font-bold text-pink-300/70">{scan.order}</span>
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-white group-hover:text-pink-300 truncate transition-colors">
                              {scan.titre || `Scan ${scan.order}`}
                            </span>
                            {isRead && (
                              <span className="text-green-400 text-xs" title="D\u00e9j\u00e0 lu">✓</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                            {scan.tome && <span>Tome {scan.tome}</span>}
                            <span>{pageCount} page{pageCount > 1 ? 's' : ''}</span>
                          </div>
                        </div>

                        {/* Arrow */}
                        <svg className="w-4 h-4 text-gray-500 group-hover:text-pink-400 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Onglet Informations */}
            {activeTab === "infos" && (
              <div className="animate-fadeIn space-y-6">
                {/* Détails */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InfoCard 
                    icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
                    label="Auteur"
                    value={oeuvre?.auteur || "Inconnu"}
                    color="indigo"
                  />
                  {users.length > 0 && (
                    <InfoCard 
                      icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" /></svg>}
                      label="Traducteur"
                      value={users[0].username}
                      color="green"
                    />
                  )}
                  <InfoCard 
                    icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" /></svg>}
                    label="Type"
                    value={oeuvre?.type || "Non spécifié"}
                    color="purple"
                  />
                  <InfoCard 
                    icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>}
                    label="Catégorie"
                    value={oeuvre?.categorie || "Non spécifiée"}
                    color="amber"
                  />
                  <InfoCard 
                    icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                    label="État"
                    value={oeuvre?.etat || "Inconnu"}
                    color="cyan"
                  />
                  {oeuvre?.annee && (
                    <InfoCard 
                      icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
                      label="Année"
                      value={oeuvre.annee}
                      color="rose"
                    />
                  )}
                </div>

                {/* Statistiques détaillées */}
                <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700/50">
                  <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Statistiques
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-gray-900/50 rounded-lg">
                      <div className="text-2xl font-bold text-indigo-400">{stats.total}</div>
                      <div className="text-xs text-gray-400">Chapitres total</div>
                    </div>
                    <div className="text-center p-3 bg-gray-900/50 rounded-lg">
                      <div className="text-2xl font-bold text-green-400">{stats.pdf}</div>
                      <div className="text-xs text-gray-400">PDF disponibles</div>
                    </div>
                    <div className="text-center p-3 bg-gray-900/50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-400">{stats.online}</div>
                      <div className="text-xs text-gray-400">Chapitres en ligne</div>
                    </div>
                    <div className="text-center p-3 bg-gray-900/50 rounded-lg">
                      <div className="text-2xl font-bold text-amber-400">{tomes.length || 1}</div>
                      <div className="text-xs text-gray-400">Tome{tomes.length > 1 ? "s" : ""}</div>
                    </div>
                  </div>
                </div>

                {/* Titre alternatif */}
                {oeuvre?.titrealt && (
                  <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700/50">
                    <h3 className="font-semibold text-white mb-2 flex items-center gap-2">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                      </svg>
                      Titre alternatif
                    </h3>
                    <p className="text-gray-400">{oeuvre.titrealt}</p>
                  </div>
                )}
              </div>
            )}

            {/* Bannière publicitaire */}
            <div className="mt-6">
              <BannerCarousel variant="inline" novelIndexUrl={novelIndexUrl} />
            </div>
          </div>
        </div>
      </div>

      {/* Modal carte de partage oeuvre */}
      {showOeuvreShareCard && oeuvreShareCardUrl && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => { setShowOeuvreShareCard(false); setOeuvreShareCardUrl(null); }}>
          <div className="w-full max-w-2xl mx-4 bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Carte de partage</h3>
              <button onClick={() => { setShowOeuvreShareCard(false); setOeuvreShareCardUrl(null); }} className="p-1 text-gray-400 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4">
              <img src={oeuvreShareCardUrl} alt="Carte de partage" className="w-full rounded-xl shadow-lg" />
              <div className="flex gap-3 mt-4">
                <button
                  onClick={downloadOeuvreCard}
                  className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Télécharger l&apos;image
                </button>
                <button
                  onClick={() => {
                    const url = window.location.origin + `/oeuvre/${oeuvre.documentId}`;
                    navigator.clipboard.writeText(url).catch(() => {});
                    setShareTooltip(true);
                    setTimeout(() => setShareTooltip(false), 2000);
                  }}
                  className="px-4 py-2.5 rounded-lg border border-gray-600 hover:bg-gray-700 text-gray-300 text-sm font-medium transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  {shareTooltip ? "Copié !" : "Copier le lien"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Composant InfoCard
function InfoCard({ icon, label, value, color }) {
  const colorClasses = {
    indigo: "text-indigo-400 bg-indigo-500/10",
    green: "text-green-400 bg-green-500/10",
    purple: "text-purple-400 bg-purple-500/10",
    amber: "text-amber-400 bg-amber-500/10",
    cyan: "text-cyan-400 bg-cyan-500/10",
    rose: "text-rose-400 bg-rose-500/10",
  };

  return (
    <div className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-xl border border-gray-700/50">
      <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
        <p className="text-white font-medium">{value}</p>
      </div>
    </div>
  );
}
