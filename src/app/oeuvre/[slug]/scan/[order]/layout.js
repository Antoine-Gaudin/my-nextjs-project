const API_URL =
  process.env.API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "https://my-strapi-project-yysn.onrender.com";

export async function generateMetadata({ params }) {
  const { slug, order } = await params;

  try {
    // Fetch œuvre + scans séparément (la relation inverse n'est pas configurée dans Strapi)
    const [oeuvreRes, scansRes] = await Promise.all([
      fetch(`${API_URL}/api/oeuvres/${slug}?fields[0]=titre`, { next: { revalidate: 60 } }),
      fetch(
        `${API_URL}/api/scans?filters[oeuvres][documentId][$eq]=${slug}&fields[0]=titre&fields[1]=order&sort=order:asc`,
        { next: { revalidate: 60 } }
      ),
    ]);
    const oeuvre = oeuvreRes.ok ? (await oeuvreRes.json())?.data : null;

    if (oeuvre) {
      const scansMeta = scansRes.ok ? ((await scansRes.json())?.data || []) : [];
      const target = scansMeta.find((s) => String(s.order) === String(order));
      const scanTitle = target?.titre || `Scan ${order}`;

      return {
        title: `${scanTitle} — ${oeuvre.titre} | Trad-Index`,
        description: `Lisez le scan "${scanTitle}" de ${oeuvre.titre} en traduction française sur Trad-Index.`,
        openGraph: {
          title: `${scanTitle} — ${oeuvre.titre}`,
          description: `Lisez le scan "${scanTitle}" de ${oeuvre.titre} sur Trad-Index.`,
        },
        twitter: {
          card: "summary",
          title: `${scanTitle} — ${oeuvre.titre}`,
        },
        alternates: {
          canonical: `https://trad-index.com/oeuvre/${slug}/scan/${order}`,
        },
      };
    }
  } catch {
    /* Fallback silencieux */
  }

  return {
    title: `Scan ${order} | Trad-Index`,
    description: "Lisez ce scan en traduction française sur Trad-Index.",
  };
}

export default function ScanLayout({ children }) {
  return children;
}
