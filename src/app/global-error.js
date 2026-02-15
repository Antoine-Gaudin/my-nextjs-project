"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    console.error("Erreur globale attrapée:", error);
  }, [error]);

  return (
    <html lang="fr">
      <body className="bg-gray-900">
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-500/10 flex items-center justify-center">
              <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Erreur critique</h2>
            <p className="text-gray-400 mb-6">
              Une erreur inattendue s&apos;est produite. Veuillez rafraîchir la page.
            </p>
            <button
              onClick={() => reset()}
              className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-colors font-medium"
            >
              Rafraîchir
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
