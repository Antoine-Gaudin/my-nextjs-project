export const metadata = {
  title: "Catalogue des œuvres",
  description:
    "Parcourez le catalogue complet des traductions françaises de light novels, web novels, mangas et manhwas disponibles sur Trad-Index.",
  openGraph: {
    title: "Catalogue des œuvres | Trad-Index",
    description:
      "Parcourez le catalogue complet des traductions françaises de light novels, web novels, mangas et manhwas.",
    images: ["/images/HeroHeader.webp"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Catalogue des œuvres | Trad-Index",
    description:
      "Parcourez le catalogue complet des traductions françaises de light novels, web novels, mangas et manhwas.",
    images: ["/images/HeroHeader.webp"],
  },
  alternates: {
    canonical: "https://trad-index.com/oeuvres",
  },
};

export default function OeuvresLayout({ children }) {
  return children;
}
