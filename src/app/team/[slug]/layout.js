const API_URL =
  process.env.API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "https://my-strapi-project-yysn.onrender.com";

export async function generateMetadata({ params }) {
  const { slug } = await params;

  try {
    const res = await fetch(
      `${API_URL}/api/teams?filters[slug][$eq]=${slug}&fields[0]=nom&fields[1]=description&populate[logo][fields][0]=url`,
      { next: { revalidate: 3600 } }
    );
    const data = await res.json();
    const team = data?.data?.[0];

    if (team) {
      const description = team.description
        ? team.description.substring(0, 160)
        : `Découvrez l'équipe de traduction ${team.nom} sur Trad-Index.`;
      const image = team.logo?.[0]?.url || null;

      return {
        title: team.nom,
        description,
        openGraph: {
          title: `${team.nom} | Trad-Index`,
          description,
          ...(image && { images: [{ url: image, alt: team.nom }] }),
        },
        twitter: {
          card: "summary",
          title: `${team.nom} | Trad-Index`,
          description,
          ...(image && { images: [image] }),
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

export default async function TeamSlugLayout({ children, params }) {
  const { slug } = await params;

  // JSON-LD for Organization
  let jsonLd = null;
  try {
    const res = await fetch(
      `${API_URL}/api/teams?filters[slug][$eq]=${slug}&fields[0]=nom&fields[1]=description&populate[logo][fields][0]=url`,
      { next: { revalidate: 3600 } }
    );
    const data = await res.json();
    const team = data?.data?.[0];

    if (team) {
      jsonLd = {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: team.nom,
        ...(team.description && { description: team.description.substring(0, 500) }),
        ...(team.logo?.[0]?.url && { logo: team.logo[0].url }),
        url: `https://trad-index.com/team/${slug}`,
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
