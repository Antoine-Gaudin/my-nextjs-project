import { NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://my-strapi-project-yysn.onrender.com';

// ─── Allowlist des routes autorisées via le proxy ───
const ALLOWED_ROUTES = [
  'oeuvres',
  'chapitres',
  'genres',
  'tags',
  'users',
  'users/me',
  'auth/local',
  'auth/local/register',
  'upload',
  'teams',
  'team-invitations',
  'team-tasks',
  'team-annonces',
  'suivis',
];

function isRouteAllowed(pathStr) {
  // Autoriser les routes dans la liste + les sous-routes (ex: oeuvres/abc123)
  return ALLOWED_ROUTES.some((route) => {
    if (pathStr === route) return true;
    if (pathStr.startsWith(route + '/')) return true;
    return false;
  });
}

// ─── Rate limiting simple en mémoire ───
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 120; // 120 requêtes par minute par IP

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  
  if (!entry || now - entry.start > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(ip, { start: now, count: 1 });
    return true;
  }
  
  entry.count++;
  if (entry.count > RATE_LIMIT_MAX) return false;
  return true;
}

// Nettoyage périodique du rate limit map
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap) {
    if (now - entry.start > RATE_LIMIT_WINDOW) rateLimitMap.delete(ip);
  }
}, 5 * 60 * 1000);

function getClientIp(request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
    || request.headers.get('x-real-ip') 
    || 'unknown';
}

export async function GET(request, { params }) {
  try {
    const { path } = await params;
    const pathStr = Array.isArray(path) ? path.join('/') : path;

    // Vérifier l'allowlist
    if (!isRouteAllowed(pathStr)) {
      return NextResponse.json({ error: 'Route not allowed' }, { status: 403 });
    }

    // Rate limiting
    const ip = getClientIp(request);
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }
    
    // Récupérer les query params
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    
    const url = `${API_URL}/api/${pathStr}${queryString ? `?${queryString}` : ''}`;
    
    // Récupérer le token d'autorisation s'il existe
    const authHeader = request.headers.get('Authorization');
    
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }
    
    const response = await fetch(url, {
      headers,
      cache: 'no-store',
    });
    
    const text = await response.text();
    try {
      const data = JSON.parse(text);
      return NextResponse.json(data, {
        status: response.status,
      });
    } catch {
      console.error('Proxy: réponse non-JSON de Strapi, status:', response.status, 'body:', text.substring(0, 200));
      return NextResponse.json(
        { error: 'Strapi returned non-JSON response', status: response.status },
        { status: response.status >= 400 ? response.status : 502 }
      );
    }
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data' },
      { status: 500 }
    );
  }
}

export async function POST(request, { params }) {
  try {
    const { path } = await params;
    const pathStr = Array.isArray(path) ? path.join('/') : path;

    if (!isRouteAllowed(pathStr)) {
      return NextResponse.json({ error: 'Route not allowed' }, { status: 403 });
    }
    const ip = getClientIp(request);
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }
    
    const url = `${API_URL}/api/${pathStr}`;
    const authHeader = request.headers.get('Authorization');
    const contentType = request.headers.get('Content-Type') || '';
    
    // Gérer les uploads FormData (multipart/form-data)
    if (contentType.includes('multipart/form-data') || pathStr === 'upload') {
      const formData = await request.formData();
      
      const headers = {};
      if (authHeader) {
        headers['Authorization'] = authHeader;
      }
      
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
      });
      
      const data = await response.json();
      return NextResponse.json(data, { status: response.status });
    }
    
    // Gérer les requêtes JSON normales
    const body = await request.json();
    
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }
    
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    
    const data = await response.json();
    
    return NextResponse.json(data, {
      status: response.status,
    });
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data' },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    const { path } = await params;
    const pathStr = Array.isArray(path) ? path.join('/') : path;

    if (!isRouteAllowed(pathStr)) {
      return NextResponse.json({ error: 'Route not allowed' }, { status: 403 });
    }
    const ip = getClientIp(request);
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }
    
    const body = await request.json();
    const url = `${API_URL}/api/${pathStr}`;
    
    const authHeader = request.headers.get('Authorization');
    
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }
    
    const response = await fetch(url, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body),
    });
    
    const data = await response.json();
    
    return NextResponse.json(data, {
      status: response.status,
    });
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data' },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const { path } = await params;
    const pathStr = Array.isArray(path) ? path.join('/') : path;

    if (!isRouteAllowed(pathStr)) {
      return NextResponse.json({ error: 'Route not allowed' }, { status: 403 });
    }
    const ip = getClientIp(request);
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }
    
    const url = `${API_URL}/api/${pathStr}`;
    
    const authHeader = request.headers.get('Authorization');
    
    const headers = {};
    
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }
    
    const response = await fetch(url, {
      method: 'DELETE',
      headers,
    });
    
    // Strapi renvoie 204 No Content sur DELETE réussi (pas de body)
    if (response.status === 204 || response.headers.get('content-length') === '0') {
      return new NextResponse(null, { status: 200 });
    }
    
    const text = await response.text();
    if (!text) {
      return new NextResponse(null, { status: response.ok ? 200 : response.status });
    }
    
    try {
      const data = JSON.parse(text);
      return NextResponse.json(data, { status: response.status });
    } catch {
      return new NextResponse(null, { status: response.ok ? 200 : response.status });
    }
  } catch (error) {
    console.error('Proxy DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete' },
      { status: 500 }
    );
  }
}
