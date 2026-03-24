export async function generateMetadata({ params }) {
  const { username } = await params;
  const decodedName = decodeURIComponent(username);

  return {
    title: `${decodedName} — Traducteur`,
    description: `Découvrez les traductions de ${decodedName} sur Trad-Index. Parcourez ses œuvres traduites en français.`,
    keywords: [decodedName, "traducteur", "traduction française", "light novel", "web novel", "Trad-Index"],
    openGraph: {
      title: `${decodedName} — Traducteur | Trad-Index`,
      description: `Découvrez les traductions de ${decodedName} sur Trad-Index.`,
      type: "profile",
      url: `https://trad-index.com/traducteur/${username}`,
    },
    twitter: {
      card: "summary",
      title: `${decodedName} — Traducteur | Trad-Index`,
      description: `Découvrez les traductions de ${decodedName} sur Trad-Index.`,
    },
    alternates: {
      canonical: `https://trad-index.com/traducteur/${username}`,
    },
  };
}

export default async function TraducteurLayout({ children, params }) {
  const { username } = await params;
  const decodedName = decodeURIComponent(username);

  const personJsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: decodedName,
    url: `https://trad-index.com/traducteur/${username}`,
    description: `Traducteur sur Trad-Index`,
    knowsLanguage: ["fr", "ja", "ko", "zh"],
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
        name: "Traducteurs",
        item: "https://trad-index.com/oeuvres",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: decodedName,
        item: `https://trad-index.com/traducteur/${username}`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      {children}
    </>
  );
}
