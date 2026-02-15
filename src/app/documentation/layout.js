export const metadata = {
  title: "Documentation éditeur",
  description:
    "Guide complet pour les éditeurs et traducteurs sur Trad-Index : comment ajouter des œuvres, publier des chapitres et gérer vos traductions.",
  openGraph: {
    title: "Documentation éditeur | Trad-Index",
    description:
      "Guide complet pour les éditeurs et traducteurs sur Trad-Index.",
    images: ["/images/og-default.jpg"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Documentation éditeur | Trad-Index",
    description:
      "Guide complet pour les éditeurs et traducteurs sur Trad-Index.",
    images: ["/images/og-default.jpg"],
  },
  alternates: {
    canonical: "https://trad-index.com/documentation/editeur",
  },
};

export default function DocumentationLayout({ children }) {
  return children;
}
