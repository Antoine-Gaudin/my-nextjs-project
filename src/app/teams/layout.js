export const metadata = {
  title: "Découvrez les Teams | Trad-Index",
  description:
    "Explorez toutes les équipes de traduction sur Trad-Index. Découvrez leurs projets, rejoignez leurs communautés et plongez dans des univers uniques.",
  openGraph: {
    title: "Découvrez toutes les Teams de traduction | Trad-Index",
    description:
      "Explorez les équipes de traduction, leurs œuvres et leurs univers uniques.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Découvrez les Teams | Trad-Index",
    description:
      "Explorez les équipes de traduction et découvrez leurs projets.",
  },
  alternates: {
    canonical: "https://trad-index.com/teams",
  },
};

export default function TeamsLayout({ children }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Teams de traduction",
    description:
      "Découvrez toutes les équipes de traduction et leurs projets sur Trad-Index",
    url: "https://trad-index.com/teams",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {children}
    </>
  );
}
