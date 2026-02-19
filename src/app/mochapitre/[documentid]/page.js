import { notFound } from "next/navigation";
import ChapitreReader from "../../components/ChapitreReader";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://my-strapi-project-yysn.onrender.com";

export default async function MoChapitrePage({ params }) {
  const { documentid } = await params;

  try {
    // Fetch le chapitre complet par documentId
    const chapRes = await fetch(
      `${API_URL}/api/chapitres/${documentid}?populate=oeuvres`,
      { cache: "no-store" }
    );

    if (!chapRes.ok) return notFound();
    const chapData = await chapRes.json();
    const chapitre = chapData?.data;
    if (!chapitre) return notFound();

    // Récupérer l'oeuvre associée
    const oeuvreDocId = chapitre.oeuvres?.[0]?.documentId;
    if (!oeuvreDocId) return notFound();

    const oeuvreRes = await fetch(
      `${API_URL}/api/oeuvres/${oeuvreDocId}?populate[couverture]=true&populate[chapitres][fields][0]=titre&populate[chapitres][fields][1]=order&populate[chapitres][fields][2]=documentId&populate[chapitres][fields][3]=tome`,
      { cache: "no-store" }
    );

    if (!oeuvreRes.ok) return notFound();
    const oeuvreData = await oeuvreRes.json();
    const oeuvre = oeuvreData?.data;
    if (!oeuvre) return notFound();

    const chapitresMeta = oeuvre.chapitres || [];

    return (
      <ChapitreReader
        chapitre={chapitre}
        oeuvre={oeuvre}
        chapitres={chapitresMeta}
      />
    );
  } catch (err) {
    console.error("Erreur chargement mochapitre:", err);
    return notFound();
  }
}
