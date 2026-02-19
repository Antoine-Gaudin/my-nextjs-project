"use client";

import { useState, useEffect, useRef } from "react";
import Cookies from "js-cookie";
import PanelView from "./PanelView";
import AjouterChapitre from "./AjouterChapitre";
import AjouterScan from "./AjouterScan";
import ModifierScan from "./ModifierScan";
import ImportWord from "./ImportWord";
import { useToast } from "./Toast";
import ConfirmDialog from "./ConfirmDialog";

export default function PanelOeuvre({ oeuvre, onBack, addedBy, embedded }) {
  const { documentId, couverture, titre } = oeuvre;
  const couvertureUrl = couverture?.length > 0 ? couverture[0]?.url : null;
  const toast = useToast();
  const [confirmState, setConfirmState] = useState({ open: false, message: "", onConfirm: null });

  const [chapitres, setChapitres] = useState([]);
  const [orderedChapitres, setOrderedChapitres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [isReordering, setIsReordering] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [showAjouterChapitre, setShowAjouterChapitre] = useState(false);
  const [showImportWord, setShowImportWord] = useState(false);

  // ─── Scan state (complètement séparé des chapitres) ───
  const [scans, setScans] = useState([]);
  const [showAjouterScan, setShowAjouterScan] = useState(false);
  const [editScan, setEditScan] = useState(null);

  const menuRef = useRef(null);

  const fetchChapitres = async () => {
    const jwt = Cookies.get("jwt");
    if (!jwt) return;

    try {
      let allChapitres = [];
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        // Exclure texte pour éviter des payloads trop lourds (500 Strapi)
        const baseParams = `filters[oeuvres][documentId][$eq]=${documentId}&sort=order:desc&pagination[page]=${page}&pagination[pageSize]=100&fields[0]=titre&fields[1]=order&fields[2]=documentId&fields[3]=createdAt&fields[4]=updatedAt&fields[5]=publishedAt`;
        const res = await fetch(
          `/api/proxy/chapitres?${baseParams}`,
          {
            headers: {
              Authorization: `Bearer ${jwt}`,
            },
          }
        );

        if (!res.ok) {
          console.error("Erreur chapitres HTTP:", res.status);
          // Retry without auth (public access)
          const pubRes = await fetch(
            `/api/proxy/chapitres?${baseParams}`
          );
          if (pubRes.ok) {
            const pubData = await pubRes.json();
            allChapitres = [...allChapitres, ...(pubData.data || [])];
            hasMore = pubData.meta?.pagination?.page < pubData.meta?.pagination?.pageCount;
            page++;
            continue;
          }
          break;
        }

        const data = await res.json();
        const pageData = data.data || [];
        allChapitres = [...allChapitres, ...pageData];
        hasMore = data.meta?.pagination?.page < data.meta?.pagination?.pageCount;
        page++;
      }

      setChapitres(allChapitres);
      setOrderedChapitres(allChapitres);
      setLoading(false);
    } catch (err) {
      console.error("Erreur chapitres :", err);
      setLoading(false);
    }
  };

  const updateOrderInDB = async (updatedList) => {
    const jwt = Cookies.get("jwt");
    if (!jwt) return;

    try {
      for (let i = 0; i < updatedList.length; i++) {
        const chapitre = updatedList[i];
        const res = await fetch(`/api/proxy/chapitres/${chapitre.documentId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${jwt}`,
          },
          body: JSON.stringify({
            data: {
              order: updatedList.length - i,
            },
          }),
        });

        if (!res.ok) {
          console.error("Erreur mise a jour ordre pour", chapitre.documentId);
        }
      }

      setMessage("Ordre des chapitres mis a jour !");
    } catch (err) {
      console.error("Erreur lors de la mise a jour de l'ordre :", err);
      setMessage("Impossible de mettre a jour l'ordre.");
    }
  };

  // ─── Fetch scans (séparé des chapitres) — léger : pas de populate image ───
  const fetchScans = async () => {
    const jwt = Cookies.get("jwt");
    try {
      const headers = jwt ? { Authorization: `Bearer ${jwt}` } : {};
      const res = await fetch(
        `/api/proxy/scans?filters[oeuvres][documentId][$eq]=${documentId}&sort=order:desc&fields[0]=titre&fields[1]=order&fields[2]=documentId&fields[3]=tome&fields[4]=createdAt&fields[5]=updatedAt&populate[pages][fields][0]=numero`,
        { headers }
      );
      if (res.ok) {
        const data = await res.json();
        setScans(data.data || []);
      }
      // 404 = la collection scans n'existe pas encore sur Strapi (pas déployé)
    } catch (err) {
      // Silencieux — le endpoint scans peut ne pas exister encore
    }
  };

  const handleDeleteScan = async (scan) => {
    setConfirmState({
      open: true,
      message: `Supprimer le scan "${scan.titre}" ?`,
      onConfirm: async () => {
        setConfirmState({ open: false, message: "", onConfirm: null });
        const jwt = Cookies.get("jwt");
        if (!jwt) return;
        try {
          const res = await fetch(`/api/proxy/scans/${scan.documentId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${jwt}` },
          });
          if (!res.ok) {
            toast.error("Erreur lors de la suppression du scan.");
            return;
          }
          toast.success("Scan supprimé avec succès !");
          fetchScans();
        } catch (error) {
          console.error("Erreur suppression scan :", error);
          toast.error("Impossible de supprimer le scan.");
        }
      },
    });
  };

  // Types d'œuvres qui supportent les scans
  const SCAN_TYPES = ['scan', 'manga', 'manhua', 'manhwa'];
  const isScanType = SCAN_TYPES.includes(oeuvre?.type?.toLowerCase());

  useEffect(() => {
    fetchChapitres();
    if (isScanType) fetchScans();
  }, [documentId, isScanType]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleDrop = (index) => {
    if (draggedIndex === null) return;
    const newList = [...orderedChapitres];
    const [moved] = newList.splice(draggedIndex, 1);
    newList.splice(index, 0, moved);

    const updatedList = newList.map((chap, i) => ({
      ...chap,
      order: newList.length - i,
    }));

    setOrderedChapitres(updatedList);
    setDraggedIndex(null);
    updateOrderInDB(updatedList);
  };

  const handleDeleteChapitre = async (chapitre) => {
    setConfirmState({
      open: true,
      message: `Supprimer le chapitre "${chapitre.titre}" ?`,
      onConfirm: async () => {
        setConfirmState({ open: false, message: "", onConfirm: null });
        const jwt = Cookies.get("jwt");
        if (!jwt) return;

        try {
          const res = await fetch(`/api/proxy/chapitres/${chapitre.documentId}`, {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${jwt}`,
            },
          });

          if (!res.ok) {
            toast.error("Erreur lors de la suppression du chapitre.");
            return;
          }

          try {
            await fetch('/api/novel-index', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${jwt}`,
              },
              body: JSON.stringify({
                action: 'delete-chapitre',
                titre: chapitre.titre,
                order: chapitre.order,
              }),
            });
          } catch (err) {
            console.error("Erreur sync suppression novel-index :", err);
          }

          setMessage("Chapitre supprimé avec succès !");
          setOpenMenuId(null);
          fetchChapitres();
        } catch (error) {
          console.error("Erreur suppression chapitre :", error);
          toast.error("Impossible de supprimer le chapitre.");
        }
      },
    });
  };

  const handleCancelReorder = () => {
    setOrderedChapitres([...chapitres]);
    setIsReordering(false);
    setMessage("");
  };

  return (
    <>
      <PanelView
        oeuvre={oeuvre}
        couvertureUrl={couvertureUrl}
        chapitres={chapitres}
        loading={loading}
        onBack={onBack}
        addedBy={addedBy}
        embedded={embedded}
        message={message}
        isReordering={isReordering}
        setIsReordering={setIsReordering}
        openMenuId={openMenuId}
        setOpenMenuId={setOpenMenuId}
        orderedChapitres={orderedChapitres}
        setOrderedChapitres={setOrderedChapitres}
        draggedIndex={draggedIndex}
        setDraggedIndex={setDraggedIndex}
        handleDrop={handleDrop}
        handleDeleteChapitre={handleDeleteChapitre}
        handleCancelReorder={handleCancelReorder}
        onAddChapitre={() => setShowAjouterChapitre(true)}
        onImportWord={() => setShowImportWord(true)}
        menuRef={menuRef}
        onChapitreUpdated={fetchChapitres}
        scans={isScanType ? scans : null}
        onAddScan={isScanType ? () => setShowAjouterScan(true) : null}
        handleDeleteScan={isScanType ? handleDeleteScan : null}
        onEditScan={isScanType ? (scan) => setEditScan(scan) : null}
      />

      {showAjouterChapitre && (
        <AjouterChapitre
          oeuvreId={documentId}
          oeuvreTitre={titre}
          onClose={() => setShowAjouterChapitre(false)}
          onChapitreAdded={() => {
            setShowAjouterChapitre(false);
            fetchChapitres();
          }}
        />
      )}

      {showImportWord && (
        <ImportWord
          oeuvreId={documentId}
          oeuvreTitre={titre}
          onClose={() => setShowImportWord(false)}
          onImportDone={() => {
            fetchChapitres();
          }}
        />
      )}

      {showAjouterScan && (
        <AjouterScan
          oeuvreId={documentId}
          onClose={() => setShowAjouterScan(false)}
          onScanAdded={() => {
            setShowAjouterScan(false);
            fetchScans();
          }}
        />
      )}

      {editScan && (
        <ModifierScan
          scan={editScan}
          onClose={() => setEditScan(null)}
          onScanUpdated={() => {
            setEditScan(null);
            fetchScans();
          }}
        />
      )}

      {confirmState.open && (
        <ConfirmDialog
          open={confirmState.open}
          message={confirmState.message}
          onConfirm={confirmState.onConfirm}
          onCancel={() => setConfirmState({ open: false, message: "", onConfirm: null })}
        />
      )}
    </>
  );
}
