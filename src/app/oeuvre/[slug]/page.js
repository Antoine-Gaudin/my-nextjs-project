import FicheOeuvre from "../../components/FicheOeuvre";

const API_URL =
  process.env.API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "https://my-strapi-project-yysn.onrender.com";

export default async function OeuvrePage({ params }) {
  const { slug } = await params;

  let oeuvre = null;
  try {
    const res = await fetch(
      `${API_URL}/api/oeuvres?filters[documentId][$eq]=${slug}&populate[couverture][fields][0]=url&populate[genres][fields][0]=nom&populate[tags][fields][0]=nom&populate[chapitres][fields][0]=titre&populate[chapitres][fields][1]=order&populate[chapitres][fields][2]=publishedAt&populate[autpitre][fields][3]=documentId`,
      { next: { revalidate: 60 } }
    );
    const data = await res.json();
    oeuvre = data?.data?.[0] || null;
  } catch {
    // Fallback
  }

  if (!oeuvre) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-4">Œuvre introuvable</h1>
          <p className="text-gray-400 mb-8">Cette œuvre n&apos;existe pas ou a été supprimée.</p>
          <a
            href="/oeuvres"
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-colors font-medium"
          >
            Retour au catalogue
          </a>
        </div>
      </div>
    );
  }

  // Server component renders FicheOeuvre client component with initial data
  return <FicheOeuvre oeuvre={oeuvre} isFullPage={true} />;
}
