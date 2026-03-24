"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Cookies from "js-cookie";

function timeAgo(dateStr) {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return "à l'instant";
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)}h`;
  if (diff < 2592000) return `il y a ${Math.floor(diff / 86400)}j`;
  return new Date(dateStr).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function CommentItem({ comment, currentUserId, onReply, onDelete, themeStyles: t, depth = 0, replies }) {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleReply = async () => {
    if (!replyText.trim() || submitting) return;
    setSubmitting(true);
    await onReply(replyText.trim(), comment.documentId || comment.id);
    setReplyText("");
    setShowReplyForm(false);
    setSubmitting(false);
  };

  const authorName = comment.auteur?.username || "Anonyme";
  const isOwner = currentUserId && comment.auteur?.id === currentUserId;
  const commentReplies = replies.filter((r) => r.parentId === (comment.documentId || comment.id));

  return (
    <div className={`${depth > 0 ? "ml-6 pl-4 border-l-2 " + t.cardBorder : ""}`}>
      <div className={`py-3 ${depth === 0 ? "border-b " + t.cardBorder : ""}`}>
        {/* Header */}
        <div className="flex items-center gap-2 mb-1">
          <div className={`w-7 h-7 rounded-full ${t.settingBg} flex items-center justify-center text-xs font-bold ${t.mutedText}`}>
            {authorName[0]?.toUpperCase()}
          </div>
          <span className={`text-sm font-medium ${t.titleText}`}>{authorName}</span>
          <span className={`text-xs ${t.dimText}`}>{timeAgo(comment.createdAt)}</span>
          {isOwner && (
            <button
              onClick={() => onDelete(comment.documentId || comment.id)}
              className={`ml-auto text-xs ${t.dimText} hover:text-red-400 transition-colors`}
              title="Supprimer"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>

        {/* Texte */}
        <p className={`text-sm ${t.mutedText} leading-relaxed whitespace-pre-wrap`}>{comment.texte}</p>

        {/* Actions */}
        {currentUserId && depth < 2 && (
          <button
            onClick={() => setShowReplyForm(!showReplyForm)}
            className={`mt-1.5 text-xs ${t.dimText} hover:text-indigo-400 transition-colors`}
          >
            Répondre
          </button>
        )}

        {/* Formulaire de réponse */}
        {showReplyForm && (
          <div className="mt-2 flex gap-2">
            <input
              type="text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleReply()}
              placeholder="Votre réponse..."
              maxLength={2000}
              className={`flex-1 text-sm px-3 py-1.5 rounded-lg ${t.settingBg} border ${t.settingBorder} ${t.mutedText} bg-transparent outline-none focus:ring-1 focus:ring-indigo-500`}
            />
            <button
              onClick={handleReply}
              disabled={!replyText.trim() || submitting}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {submitting ? "..." : "Envoyer"}
            </button>
          </div>
        )}
      </div>

      {/* Réponses imbriquées */}
      {commentReplies.map((reply) => (
        <CommentItem
          key={reply.documentId || reply.id}
          comment={reply}
          currentUserId={currentUserId}
          onReply={onReply}
          onDelete={onDelete}
          themeStyles={t}
          depth={depth + 1}
          replies={replies}
        />
      ))}
    </div>
  );
}

export default function CommentSection({ chapitreId, oeuvreId, themeStyles: t }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const inputRef = useRef(null);

  // Charger l'utilisateur
  useEffect(() => {
    try {
      const userInfo = Cookies.get("userInfo");
      if (userInfo) setCurrentUser(JSON.parse(userInfo));
    } catch {}
  }, []);

  // Charger les commentaires
  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(`/api/commentaires?chapitreId=${chapitreId}`);
      if (res.ok) {
        const data = await res.json();
        setComments(data.data || []);
      }
    } catch {}
    setLoading(false);
  }, [chapitreId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  // Poster un commentaire
  const postComment = useCallback(async (texte, parentId = null) => {
    const jwt = Cookies.get("jwt");
    if (!jwt) return;

    try {
      const res = await fetch("/api/commentaires", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({ texte, chapitreId, oeuvreId, parentId }),
      });

      if (res.ok) {
        const result = await res.json();
        if (result.data) {
          setComments((prev) => [...prev, result.data]);
        } else {
          await fetchComments();
        }
      }
    } catch (err) {
      console.error("Post comment error:", err);
    }
  }, [chapitreId, oeuvreId, fetchComments]);

  const handleSubmit = async () => {
    if (!newComment.trim() || submitting) return;
    setSubmitting(true);
    await postComment(newComment.trim());
    setNewComment("");
    setSubmitting(false);
  };

  // Supprimer un commentaire
  const handleDelete = useCallback(async (commentId) => {
    const jwt = Cookies.get("jwt");
    if (!jwt) return;

    try {
      const res = await fetch(`/api/commentaires?id=${commentId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${jwt}` },
      });
      if (res.ok) {
        setComments((prev) => prev.filter((c) => (c.documentId || c.id) !== commentId));
      }
    } catch (err) {
      console.error("Delete comment error:", err);
    }
  }, []);

  const rootComments = comments.filter((c) => !c.parentId);
  const replies = comments.filter((c) => c.parentId);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 mt-12">
      <div className={`border-t ${t.chapterBorder} pt-8`}>
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <svg className={`w-5 h-5 ${t.mutedText}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <h2 className={`text-lg font-semibold ${t.titleText}`}>
            Commentaires {comments.length > 0 && <span className={`text-sm font-normal ${t.dimText}`}>({comments.length})</span>}
          </h2>
        </div>

        {/* Formulaire */}
        {currentUser ? (
          <div className={`mb-6 p-4 rounded-xl ${t.cardBg} border ${t.cardBorder}`}>
            <div className="flex items-start gap-3">
              <div className={`w-8 h-8 rounded-full ${t.settingBg} flex items-center justify-center text-sm font-bold ${t.mutedText} flex-shrink-0`}>
                {currentUser.username?.[0]?.toUpperCase() || "?"}
              </div>
              <div className="flex-1">
                <textarea
                  ref={inputRef}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
                  }}
                  placeholder="Écrire un commentaire..."
                  maxLength={2000}
                  rows={2}
                  className={`w-full text-sm px-3 py-2 rounded-lg ${t.settingBg} border ${t.settingBorder} ${t.mutedText} bg-transparent outline-none focus:ring-1 focus:ring-indigo-500 resize-none`}
                />
                <div className="flex items-center justify-between mt-2">
                  <span className={`text-[10px] ${t.dimText}`}>{newComment.length}/2000</span>
                  <button
                    onClick={handleSubmit}
                    disabled={!newComment.trim() || submitting}
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                  >
                    {submitting ? "Envoi..." : "Commenter"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className={`mb-6 p-4 rounded-xl ${t.cardBg} border ${t.cardBorder} text-center`}>
            <p className={`text-sm ${t.mutedText} mb-2`}>Connectez-vous pour commenter</p>
            <a
              href="/connexion"
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Se connecter
            </a>
          </div>
        )}

        {/* Liste des commentaires */}
        {loading ? (
          <div className={`text-center py-8 ${t.dimText}`}>
            <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Chargement...
          </div>
        ) : comments.length === 0 ? (
          <div className={`text-center py-8 ${t.dimText} text-sm`}>
            Aucun commentaire pour le moment. Soyez le premier !
          </div>
        ) : (
          <div>
            {rootComments.map((comment) => (
              <CommentItem
                key={comment.documentId || comment.id}
                comment={comment}
                currentUserId={currentUser?.id}
                onReply={postComment}
                onDelete={handleDelete}
                themeStyles={t}
                replies={replies}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
