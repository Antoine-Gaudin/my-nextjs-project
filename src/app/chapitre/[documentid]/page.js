import { permanentRedirect } from "next/navigation";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://my-strapi-project-yysn.onrender.com";

// ─── Redirection permanente vers la nouvelle URL ───
// /chapitre/{documentId} → /oeuvre/{oeuvreDocumentId}/chapitre/{order}
export default async function ChapitreRedirect({ params }) {
  const { documentid } = await params;

  try {
    const res = await fetch(
      `${API_URL}/api/chapitres/${documentid}?populate=oeuvres`,
      { cache: "no-store" }
    );
    const data = await res.json();

    if (data?.data) {
      const order = data.data.order;
      const oeuvreDocId = data.data.oeuvres?.[0]?.documentId;
      if (oeuvreDocId && order) {
        permanentRedirect(`/oeuvre/${oeuvreDocId}/chapitre/${order}`);
      }
    }
  } catch (err) {
    console.error("Redirect error:", err);
  }

  // Fallback
  permanentRedirect("/oeuvres");
}
