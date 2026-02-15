export async function generateMetadata({ params }) {
  const { username } = await params;
  const decodedName = decodeURIComponent(username);

  return {
    title: `${decodedName} — Traducteur`,
    description: `Découvrez les traductions de ${decodedName} sur Trad-Index. Parcourez ses œuvres traduites en français.`,
    openGraph: {
      title: `${decodedName} — Traducteur | Trad-Index`,
      description: `Découvrez les traductions de ${decodedName} sur Trad-Index.`,
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

export default function TraducteurLayout({ children }) {
  return children;
}
