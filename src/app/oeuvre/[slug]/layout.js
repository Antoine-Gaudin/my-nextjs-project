const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://my-strapi-project-yysn.onrender.com";

export async function generateMetadata({ params }) {
  const { slug } = await params;

  try {
    const res = await fetch(
      `${API_URL}/api/oeuvres?filters[documentId][$eq]=${slug}&fields[0]=titre&fields[1]=synopsis&populate[couverture][fields][0]=url`,
      { next: { revalidate: 3600 } }
    );
    const data = await res.json();
    const oeuvre = data?.data?.[0];

    if (oeuvre) {
      const description = oeuvre.synopsis
        ? oeuvre.synopsis.replace(/<[^>]+>/g, "").substring(0, 160)
        : `Lisez ${oeuvre.titre} en traduction française sur Trad-Index.`;
      const image = oeuvre.couverture?.url || null;

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

export default function OeuvreSlugLayout({ children }) {
  return children;
}
