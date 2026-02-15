const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://my-strapi-project-yysn.onrender.com";

export async function generateMetadata({ params }) {
  const { slug } = await params;

  try {
    const res = await fetch(
      `${API_URL}/api/teams?filters[slug][$eq]=${slug}&fields[0]=nom&fields[1]=description`,
      { next: { revalidate: 3600 } }
    );
    const data = await res.json();
    const team = data?.data?.[0];

    if (team) {
      const description = team.description
        ? team.description.substring(0, 160)
        : `Découvrez l'équipe de traduction ${team.nom} sur Trad-Index.`;

      return {
        title: team.nom,
        description,
        openGraph: {
          title: `${team.nom} | Trad-Index`,
          description,
        },
        twitter: {
          card: "summary",
          title: `${team.nom} | Trad-Index`,
          description,
        },
        alternates: {
          canonical: `https://trad-index.com/team/${slug}`,
        },
      };
    }
  } catch {
    // Fallback silencieux
  }

  return {
    title: "Team de traduction",
    description: "Découvrez cette équipe de traduction sur Trad-Index.",
  };
}

export default function TeamSlugLayout({ children }) {
  return children;
}
