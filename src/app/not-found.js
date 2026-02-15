import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <h1 className="text-7xl font-bold bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent mb-4">
          404
        </h1>
        <h2 className="text-xl font-semibold text-white mb-2">Page introuvable</h2>
        <p className="text-gray-400 mb-8">
          La page que vous recherchez n&apos;existe pas ou a été déplacée.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-colors font-medium"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Retour à l&apos;accueil
        </Link>
      </div>
    </div>
  );
}
