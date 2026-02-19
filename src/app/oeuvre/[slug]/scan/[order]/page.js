import { notFound } from "next/navigation";
import ScanReader from "../../../../components/ScanReader";

const API_URL =
  process.env.API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "https://my-strapi-project-yysn.onrender.com";

export default async function ScanPage({ params }) {
  const { slug, order } = await params;

  try {
    // Fetch l'œuvre (titre) + tous les scans de cette œuvre en parallèle
    const scansUrl = `${API_URL}/api/scans?filters[oeuvres][documentId][$eq]=${slug}&fields[0]=titre&fields[1]=order&fields[2]=documentId&fields[3]=tome&sort=order:asc`;

    const [oeuvreRes, scansListRes] = await Promise.all([
      fetch(`${API_URL}/api/oeuvres/${slug}?fields[0]=titre`, { next: { revalidate: 60 } }),
      fetch(scansUrl, { next: { revalidate: 60 } }),
    ]);

    if (!oeuvreRes.ok) return notFound();
    const oeuvre = (await oeuvreRes.json())?.data;
    if (!oeuvre) return notFound();

    const scansRaw = scansListRes.ok ? await scansListRes.json() : null;

    // Liste des scans (métadonnées) pour la navigation
    const scansMeta = scansRaw?.data || [];

    // Trouver le scan ciblé par order
    const target = scansMeta.find((s) => String(s.order) === String(order));
    if (!target) return notFound();

    // Récupérer le scan complet avec ses pages (images)
    const scanRes = await fetch(
      `${API_URL}/api/scans/${target.documentId}?populate[pages][populate]=image`,
      { next: { revalidate: 60 } }
    );
    if (!scanRes.ok) return notFound();
    const scan = (await scanRes.json())?.data;
    if (!scan) return notFound();

    return (
      <ScanReader
        scan={scan}
        oeuvreSlug={slug}
        allScans={scansMeta}
      />
    );
  } catch (err) {
    console.error("Erreur chargement scan:", err);
    return notFound();
  }
}
