"use client";

import { useState, useEffect, useRef } from "react";
import Cookies from "js-cookie";
import PanelView from "./PanelView";
import AjouterChapitre from "./AjouterChapitre";
import ImportWord from "./ImportWord";

export default function PanelOeuvre({ oeuvre, onBack }) {
  const { documentId, couverture, titre } = oeuvre;
  const couvertureUrl = couverture?.length > 0 ? couverture[0]?.url : null;
  const apiToken = process.env.NEXT_PUBLIC_INDEX_API_TOKEN;

  const [chapitres, setChapitres] = useState([]);
  const [orderedChapitres, setOrderedChapitres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [isReordering, setIsReordering] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [showAjouterChapitre, setShowAjouterChapitre] = useState(false);
  const [showImportWord, setShowImportWord] = useState(false);

  const menuRef = useRef(null);

  const fetchChapitres = async () => {
    const jwt = Cookies.get("jwt");
    if (!jwt) return;

    try {
      const res = await fetch(
        `/api/proxy/chapitres?filters[oeuvres][documentId][$eq]=${documentId}&sort=order:desc`,
        {
          headers: {
            Authorization: `Bearer ${jwt}`,
          },
        }
      );

      const data = await res.json();
      const result = data.data || [];
      setChapitres(result);
      setOrderedChapitres(result);
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

  useEffect(() => {
    fetchChapitres();
  }, [documentId]);

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
    const confirmDelete = window.confirm(`Supprimer le chapitre "${chapitre.titre}" ?`);
    if (!confirmDelete) return;

    const jwt = Cookies.get("jwt");
    if (!jwt) return;

    try {
      // Suppression locale
      const res = await fetch(`/api/proxy/chapitres/${chapitre.documentId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${jwt}`,
        },
      });

      if (!res.ok) {
        alert("Erreur lors de la suppression du chapitre.");
        return;
      }

      // Suppression sur novel-index
      try {
        const indexRes = await fetch(
          `https://novel-index-strapi.onrender.com/api/chapitres?filters[titre][$eq]=${encodeURIComponent(chapitre.titre)}&filters[order][$eq]=${chapitre.order}`,
          {
            headers: {
              Authorization: `Bearer ${apiToken}`,
            },
          }
        );
        const indexData = await indexRes.json();
        const indexChapitre = indexData.data?.[0];

        if (indexChapitre) {
          await fetch(
            `https://novel-index-strapi.onrender.com/api/chapitres/${indexChapitre.documentId}`,
            {
              method: "DELETE",
              headers: {
                Authorization: `Bearer ${apiToken}`,
              },
            }
          );
        }
      } catch (err) {
        console.error("Erreur sync suppression novel-index :", err);
      }

      setMessage("Chapitre supprime avec succes !");
      setOpenMenuId(null);
      fetchChapitres();
    } catch (error) {
      console.error("Erreur suppression chapitre :", error);
      alert("Impossible de supprimer le chapitre.");
    }
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
    </>
  );
}
