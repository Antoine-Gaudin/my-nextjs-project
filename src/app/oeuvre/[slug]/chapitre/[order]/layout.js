const API_URL =
  process.env.API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "https://my-strapi-project-yysn.onrender.com";

export async function generateMetadata({ params }) {
  const { slug, order } = await params;

  try {
    const res = await fetch(
      `${API_URL}/api/oeuvres/${slug}?fields[0]=titre&populate[chapitres][fields][0]=order&populate[chapitres][fields][1]=titre`,
      { next: { revalidate: 3600 } }
    );
    const data = await res.json();
    const oeuvre = data?.data;

    if (oeuvre) {
      const chapterTitle = oeuvre.chapitres?.find(
        (ch) => String(ch.order) === String(order)
      )?.titre;

      const title = chapterTitle
        ? `${chapterTitle} — ${oeuvre.titre}`
        : `Chapitre ${order} — ${oeuvre.titre}`;
      const description = `Lisez le chapitre ${order} de ${oeuvre.titre} en traduction française sur Trad-Index.`;

      return {
        title,
        description,
        openGraph: {
          title: `${title} | Trad-Index`,
          description,
        },
        twitter: {
          card: "summary",
          title: `${title} | Trad-Index`,
          description,
        },
        alternates: {
          canonical: `https://trad-index.com/oeuvre/${slug}/chapitre/${order}`,
        },
      };
    }
  } catch {
    // Fallback silencieux
  }

  return {
    title: `Chapitre ${order}`,
    description: "Lisez ce chapitre en traduction française sur Trad-Index.",
  };
}

export default function ChapitreLayout({ children }) {
  return children;
}
