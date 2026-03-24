const API_URL =
  process.env.API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "https://my-strapi-project-yysn.onrender.com";

// ─── SSG : pré-génération des pages chapitre ───
export async function generateStaticParams() {
  try {
    let allParams = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const res = await fetch(
        `${API_URL}/api/oeuvres?fields[0]=documentId&populate[chapitres][fields][0]=order&pagination[page]=${page}&pagination[pageSize]=100`
      );
      if (!res.ok) break;
      const data = await res.json();
      for (const oeuvre of data.data || []) {
        if (!oeuvre.documentId || !oeuvre.chapitres) continue;
        for (const ch of oeuvre.chapitres) {
          allParams.push({ slug: oeuvre.documentId, order: String(ch.order) });
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
    const res = await fetch(
      `${API_URL}/api/oeuvres/${slug}?fields[0]=titre&fields[1]=titrealt&fields[2]=auteur&fields[3]=type&populate[couverture][fields][0]=url&populate[chapitres][fields][0]=order&populate[chapitres][fields][1]=titre`,
      { next: { revalidate: 60 } }
    );
    if (!res.ok) return { title: `Chapitre ${order}` };
    const data = await res.json();
    const oeuvre = data?.data;
    if (!oeuvre) return { title: `Chapitre ${order}` };

    const chapitre = oeuvre.chapitres?.find((ch) => String(ch.order) === String(order));
    const chapTitre = chapitre?.titre || `Chapitre ${order}`;
    const title = `${chapTitre} — ${oeuvre.titre}`;
    const description = `Lisez ${chapTitre} de ${oeuvre.titre} en traduction française sur Trad-Index.`;
    const coverUrl = oeuvre.couverture?.[0]?.url || null;

    return {
      title,
      description,
      keywords: [oeuvre.titre, oeuvre.titrealt, oeuvre.auteur, chapTitre, oeuvre.type, "traduction française", "lecture en ligne", "light novel", "web novel"].filter(Boolean),
      openGraph: {
        title: `${title} | Trad-Index`,
        description,
        type: "article",
        url: `https://trad-index.com/oeuvre/${slug}/chapitre/${order}`,
        ...(coverUrl && { images: [{ url: coverUrl, width: 400, height: 600, alt: oeuvre.titre }] }),
      },
      twitter: {
        card: coverUrl ? "summary_large_image" : "summary",
        title: `${title} | Trad-Index`,
        description,
        ...(coverUrl && { images: [coverUrl] }),
      },
      alternates: {
        canonical: `https://trad-index.com/oeuvre/${slug}/chapitre/${order}`,
      },
    };
  } catch {
    return { title: `Chapitre ${order}` };
  }
}

export default async function ChapitreLayout({ children, params }) {
  const { slug, order } = await params;

  let jsonLd = null;
  try {
    const res = await fetch(
      `${API_URL}/api/oeuvres/${slug}?fields[0]=titre&fields[1]=auteur&populate[couverture][fields][0]=url&populate[chapitres][fields][0]=order&populate[chapitres][fields][1]=titre`,
      { next: { revalidate: 60 } }
    );
    if (res.ok) {
      const data = await res.json();
      const oeuvre = data?.data;
      if (oeuvre) {
        const chapitre = oeuvre.chapitres?.find((ch) => String(ch.order) === String(order));
        const chapTitre = chapitre?.titre || `Chapitre ${order}`;
        jsonLd = [
          {
            "@context": "https://schema.org",
            "@type": "Chapter",
            name: chapTitre,
            position: parseInt(order),
            isPartOf: {
              "@type": "Book",
              name: oeuvre.titre,
              ...(oeuvre.auteur && { author: { "@type": "Person", name: oeuvre.auteur } }),
              url: `https://trad-index.com/oeuvre/${slug}`,
            },
            inLanguage: "fr",
            url: `https://trad-index.com/oeuvre/${slug}/chapitre/${order}`,
          },
          {
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
                name: chapTitre,
                item: `https://trad-index.com/oeuvre/${slug}/chapitre/${order}`,
              },
            ],
          },
        ];
      }
    }
  } catch {}

  return (
    <>
      {jsonLd && jsonLd.map((ld, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }}
        />
      ))}
      {children}
    </>
  );
}
