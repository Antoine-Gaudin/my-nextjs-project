const API_URL =
  process.env.API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "https://my-strapi-project-yysn.onrender.com";

// ─── SSG : pré-génération des pages scan ───
export async function generateStaticParams() {
  try {
    let allParams = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const res = await fetch(
        `${API_URL}/api/oeuvres?fields[0]=documentId&populate[scans][fields][0]=order&pagination[page]=${page}&pagination[pageSize]=100`
      );
      if (!res.ok) break;
      const data = await res.json();
      for (const oeuvre of data.data || []) {
        if (!oeuvre.documentId || !oeuvre.scans) continue;
        for (const scan of oeuvre.scans) {
          allParams.push({ slug: oeuvre.documentId, order: String(scan.order) });
        }
      }
      hasMore = data.meta?.pagination?.page < data.meta?.pagination?.pageCount;
      page++;
    }

    return allParams;
  } catch {
    return [];
  }
}

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

export default async function ScanLayout({ children, params }) {
  const { slug, order } = await params;

  let jsonLd = null;
  try {
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

      jsonLd = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Accueil",
            item: "https://trad-index.com",
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Œuvres",
            item: "https://trad-index.com/oeuvres",
          },
          {
            "@type": "ListItem",
            position: 3,
            name: oeuvre.titre,
            item: `https://trad-index.com/oeuvre/${slug}`,
          },
          {
            "@type": "ListItem",
            position: 4,
            name: scanTitle,
            item: `https://trad-index.com/oeuvre/${slug}/scan/${order}`,
          },
        ],
      };
    }
  } catch {}

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      {children}
    </>
  );
}
