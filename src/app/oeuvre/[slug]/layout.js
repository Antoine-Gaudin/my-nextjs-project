const API_URL =
  process.env.API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "https://my-strapi-project-yysn.onrender.com";

export async function generateMetadata({ params }) {
  const { slug } = await params;

  try {
    const res = await fetch(
      `${API_URL}/api/oeuvres?filters[documentId][$eq]=${slug}&fields[0]=titre&fields[1]=synopsis&fields[2]=auteur&fields[3]=annee&populate[couverture][fields][0]=url`,
      { next: { revalidate: 3600 } }
    );
    const data = await res.json();
    const oeuvre = data?.data?.[0];

    if (oeuvre) {
      const description = oeuvre.synopsis
        ? oeuvre.synopsis.replace(/<[^>]+>/g, "").substring(0, 160)
        : `Lisez ${oeuvre.titre} en traduction française sur Trad-Index.`;
      const image = oeuvre.couverture?.[0]?.url || oeuvre.couverture?.url || null;

      return {
        title: oeuvre.titre,
        description,
        openGraph: {
          title: `${oeuvre.titre} | Trad-Index`,
          description,
          ...(image && { images: [{ url: image, width: 400, height: 600, alt: oeuvre.titre }] }),
        },
        twitter: {
          card: image ? "summary_large_image" : "summary",
          title: oeuvre.titre,
          description,
          ...(image && { images: [image] }),
        },
        alternates: {
          canonical: `https://trad-index.com/oeuvre/${slug}`,
        },
      };
    }
  } catch {
    // Fallback silencieux
  }

  return {
    title: "Œuvre",
    description: "Lisez cette œuvre en traduction française sur Trad-Index.",
  };
}

export default async function OeuvreSlugLayout({ children, params }) {
  const { slug } = await params;

  // Fetch data for JSON-LD
  let jsonLd = null;
  try {
    const res = await fetch(
      `${API_URL}/api/oeuvres?filters[documentId][$eq]=${slug}&fields[0]=titre&fields[1]=synopsis&fields[2]=auteur&fields[3]=annee&populate[couverture][fields][0]=url`,
      { next: { revalidate: 3600 } }
    );
    const data = await res.json();
    const oeuvre = data?.data?.[0];

    if (oeuvre) {
      const plainSynopsis = Array.isArray(oeuvre.synopsis)
        ? oeuvre.synopsis.map(b => b.children?.map(c => c.text).join("")).join(" ")
        : typeof oeuvre.synopsis === "string"
          ? oeuvre.synopsis.replace(/<[^>]+>/g, "")
          : "";
      const image = oeuvre.couverture?.[0]?.url || oeuvre.couverture?.url || null;

      jsonLd = {
        "@context": "https://schema.org",
        "@type": "Book",
        name: oeuvre.titre,
        ...(oeuvre.auteur && { author: { "@type": "Person", name: oeuvre.auteur } }),
        ...(plainSynopsis && { description: plainSynopsis.substring(0, 500) }),
        ...(image && { image }),
        ...(oeuvre.annee && { datePublished: String(oeuvre.annee) }),
        url: `https://trad-index.com/oeuvre/${slug}`,
        inLanguage: "fr",
      };
    }
  } catch {
    // Silencieux
  }

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
