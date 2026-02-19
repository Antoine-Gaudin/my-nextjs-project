import { notFound } from "next/navigation";
import ChapitreReader from "../../../../components/ChapitreReader";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://my-strapi-project-yysn.onrender.com";

export default async function ChapitrePage({ params }) {
  const { slug, order } = await params;

  try {
    // Fetch l'oeuvre avec tous ses chapitres (metadata légères) + couverture
    const oeuvreRes = await fetch(
      `${API_URL}/api/oeuvres/${slug}?populate[couverture]=true&populate[chapitres][fields][0]=titre&populate[chapitres][fields][1]=order&populate[chapitres][fields][2]=documentId&populate[chapitres][fields][3]=tome&populate[chapitres][fields][4]=pdf`,
      { next: { revalidate: 60 } }
    );

    if (!oeuvreRes.ok) return notFound();
    const oeuvreData = await oeuvreRes.json();
    const oeuvre = oeuvreData?.data;
    if (!oeuvre) return notFound();

    // Trouver le chapitre cible par order
    const chapitresMeta = oeuvre.chapitres || [];
    const target = chapitresMeta.find((c) => String(c.order) === String(order));
    if (!target) return notFound();

    // Fetch le chapitre complet (avec texte + pdf)
    const chapRes = await fetch(
      `${API_URL}/api/chapitres/${target.documentId}?populate=*`,
      { next: { revalidate: 60 } }
    );

    if (!chapRes.ok) return notFound();
    const chapData = await chapRes.json();
    const chapitre = chapData?.data;
    if (!chapitre) return notFound();

    return (
      <ChapitreReader
        chapitre={chapitre}
        oeuvre={oeuvre}
        chapitres={chapitresMeta}
      />
    );
  } catch (err) {
    console.error("Erreur chargement chapitre:", err);
    return notFound();
  }
}
