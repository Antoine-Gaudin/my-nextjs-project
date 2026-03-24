import PageOeuvre from "../../components/PageOeuvre";
import { notFound } from "next/navigation";

const API_URL =
  process.env.API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "https://my-strapi-project-yysn.onrender.com";

// Strapi v5 rich text = tableau de blocs, pas une string
function extractText(synopsis) {
  if (typeof synopsis === "string") return synopsis;
  if (Array.isArray(synopsis)) {
    return synopsis
      .map((b) => (b.children || []).map((c) => c.text || "").join(""))
      .join(" ")
      .trim();
  }
  return "";
}

async function getOeuvre(slug) {
  try {
    const res = await fetch(
      `${API_URL}/api/oeuvres?filters[documentId][$eq]=${slug}&populate[couverture][fields][0]=url&populate[genres][fields][0]=nom&populate[tags][fields][0]=nom&populate[chapitres][fields][0]=titre&populate[chapitres][fields][1]=order&populate[chapitres][fields][2]=publishedAt&populate[chapitres][fields][3]=documentId&fields[0]=titre&fields[1]=titrealt&fields[2]=synopsis&fields[3]=auteur&fields[4]=type&fields[5]=categorie&fields[6]=etat&fields[7]=annee&fields[8]=documentId&fields[9]=createdAt&fields[10]=updatedAt&fields[11]=novelIndexDocumentId&fields[12]=novelIndexTitre`,
      { next: { revalidate: 60 } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data?.data?.[0] || null;
  } catch {
    return null;
  }
}

// ─── SSG : pré-génération des pages oeuvre ───
export async function generateStaticParams() {
  try {
    let allSlugs = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const res = await fetch(
        `${API_URL}/api/oeuvres?fields[0]=documentId&pagination[page]=${page}&pagination[pageSize]=100`
      );
      if (!res.ok) break;
      const data = await res.json();
      const batch = (data.data || []).map((o) => o.documentId).filter(Boolean);
      allSlugs = [...allSlugs, ...batch];
      hasMore = data.meta?.pagination?.page < data.meta?.pagination?.pageCount;
      page++;
    }

    return allSlugs.map((slug) => ({ slug }));
  } catch {
    return [];
  }
}

// ─── SEO : generateMetadata ───
export async function generateMetadata({ params }) {
  const { slug } = await params;
  const oeuvre = await getOeuvre(slug);

  if (!oeuvre) {
    return {
      title: "Œuvre introuvable",
      description: "Cette œuvre n'existe pas ou a été supprimée.",
    };
  }

  const titre = oeuvre.titre || "Œuvre";
  const titreAlt = oeuvre.titrealt ? ` (${oeuvre.titrealt})` : "";
  const synopsisText = extractText(oeuvre.synopsis);
  const synopsis = synopsisText
    ? synopsisText.substring(0, 160).replace(/\n/g, " ")
    : `Lisez ${titre} en français sur Trad-Index.`;
  const coverUrl = oeuvre.couverture?.[0]?.url || null;
  const nbChapitres = oeuvre.chapitres?.length || 0;
  const type = oeuvre.type || "Œuvre";

  const description = `${type}${titreAlt} — ${synopsis}${nbChapitres > 0 ? ` | ${nbChapitres} chapitres disponibles` : ""}`;

  const keywords = [
    titre,
    oeuvre.titrealt,
    oeuvre.auteur,
    oeuvre.type,
    oeuvre.categorie,
    "traduction française",
    "lecture en ligne",
    "light novel",
    "web novel",
    ...(oeuvre.genres || []).map((g) => g.nom),
    ...(oeuvre.tags || []).map((t) => t.nom),
  ].filter(Boolean);

  return {
    title: titre,
    description: description.substring(0, 200),
    keywords,
    openGraph: {
      title: `${titre}${titreAlt} — Trad-Index`,
      description,
      type: "book",
      url: `https://trad-index.com/oeuvre/${slug}`,
      ...(coverUrl && {
        images: [
          {
            url: coverUrl,
            width: 400,
            height: 600,
            alt: titre,
          },
        ],
      }),
    },
    twitter: {
      card: coverUrl ? "summary_large_image" : "summary",
      title: titre,
      description: synopsis,
      ...(coverUrl && { images: [coverUrl] }),
    },
    alternates: {
      canonical: `https://trad-index.com/oeuvre/${slug}`,
    },
  };
}

// ─── Structured Data JSON-LD ───
function OeuvreJsonLd({ oeuvre }) {
  const coverUrl = oeuvre.couverture?.[0]?.url || null;
  const synopsisText = extractText(oeuvre.synopsis);
  const bookJsonLd = {
    "@context": "https://schema.org",
    "@type": "Book",
    name: oeuvre.titre,
    ...(oeuvre.titrealt && { alternateName: oeuvre.titrealt }),
    ...(oeuvre.auteur && { author: { "@type": "Person", name: oeuvre.auteur } }),
    ...(synopsisText && { description: synopsisText.substring(0, 500) }),
    ...(coverUrl && { image: coverUrl }),
    ...(oeuvre.annee && { datePublished: String(oeuvre.annee) }),
    inLanguage: "fr",
    url: `https://trad-index.com/oeuvre/${oeuvre.documentId}`,
    ...(oeuvre.genres?.length > 0 && { genre: oeuvre.genres.map((g) => g.nom) }),
    ...(oeuvre.chapitres?.length > 0 && {
      numberOfPages: oeuvre.chapitres.length,
    }),
  };

  const breadcrumbJsonLd = {
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
        item: `https://trad-index.com/oeuvre/${oeuvre.documentId}`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(bookJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
    </>
  );
}

export default async function OeuvrePage({ params }) {
  const { slug } = await params;
  const oeuvre = await getOeuvre(slug);

  if (!oeuvre) {
    notFound();
  }

  return (
    <>
      <OeuvreJsonLd oeuvre={oeuvre} />
      <PageOeuvre oeuvre={oeuvre} />
    </>
  );
}
