import { NextResponse } from 'next/server';

// Routes qui nécessitent une authentification
const PROTECTED_ROUTES = ['/profil', '/chapitreadmin', '/mochapitre'];

export function middleware(request) {
  const { pathname } = request.nextUrl;

  // Vérifier si la route est protégée
  const isProtected = PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + '/')
  );

  if (isProtected) {
    const jwt = request.cookies.get('jwt')?.value;

    if (!jwt) {
      const loginUrl = new URL('/connexion', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Vérifier Origin/Referer pour les mutations via le proxy (protection CSRF basique)
  if (pathname.startsWith('/api/proxy/') && ['POST', 'PUT', 'DELETE'].includes(request.method)) {
    const origin = request.headers.get('origin');
    const referer = request.headers.get('referer');
    const allowedOrigin = process.env.NEXT_PUBLIC_SITE_URL || 'https://trad-index.com';

    if (origin && !origin.startsWith(allowedOrigin) && !origin.startsWith('http://localhost')) {
      return NextResponse.json({ error: 'CSRF: origin mismatch' }, { status: 403 });
    }
    if (!origin && referer && !referer.startsWith(allowedOrigin) && !referer.startsWith('http://localhost')) {
      return NextResponse.json({ error: 'CSRF: referer mismatch' }, { status: 403 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/profil/:path*', '/chapitreadmin/:path*', '/mochapitre/:path*', '/api/proxy/:path*'],
};
