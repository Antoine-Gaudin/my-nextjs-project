import { NextResponse } from 'next/server';

const API_URL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'https://my-strapi-project-yysn.onrender.com';

// ─── Allowlist des routes autorisées via le proxy ───
const ALLOWED_ROUTES = [
  'oeuvres',
  'chapitres',
  'scans',
  'genres',
  'tags',
  'users',
  'users/me',
  'auth/local',
  'auth/local/register',
  'auth/change-password',
  'forgot-password',
  'upload',
  'teams',
  'team-invitations',
  'team-tasks',
  'team-annonces',
  'suivis',
];

// ─── Champs modifiables par l'utilisateur (protection contre self-promotion) ───
const USER_WRITABLE_FIELDS = ['username', 'email', 'bio', 'avatar'];

function isRouteAllowed(pathStr) {
  // Autoriser les routes dans la liste + les sous-routes (ex: oeuvres/abc123)
  return ALLOWED_ROUTES.some((route) => {
    if (pathStr === route) return true;
    if (pathStr.startsWith(route + '/')) return true;
    return false;
  });
}

// ─── Rate limiting en mémoire avec nettoyage inline (sans setInterval) ───
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 120; // 120 requêtes par minute par IP
const AUTH_RATE_LIMIT_MAX = 10; // 10 requêtes par minute pour auth
let lastCleanup = Date.now();

function checkRateLimit(ip, isAuthRoute = false) {
  const now = Date.now();
  // Nettoyage inline (au lieu de setInterval qui fuit en serverless)
  if (now - lastCleanup > RATE_LIMIT_WINDOW * 2) {
    for (const [key, entry] of rateLimitMap) {
      if (now - entry.start > RATE_LIMIT_WINDOW) rateLimitMap.delete(key);
    }
    lastCleanup = now;
  }
  
  const limitKey = isAuthRoute ? `auth:${ip}` : ip;
  const maxReqs = isAuthRoute ? AUTH_RATE_LIMIT_MAX : RATE_LIMIT_MAX;
  const entry = rateLimitMap.get(limitKey);
  
  if (!entry || now - entry.start > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(limitKey, { start: now, count: 1 });
    return true;
  }
  
  entry.count++;
  if (entry.count > maxReqs) return false;
  return true;
}

function getClientIp(request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
    || request.headers.get('x-real-ip') 
    || 'unknown';
}

/**
 * Vérifie que l'utilisateur authentifié est propriétaire d'une œuvre donnée.
 * Retourne { ok: true } ou { ok: false, response: NextResponse }.
 */
async function verifyOeuvreOwnership(authHeader, oeuvreDocumentId) {
  try {
    // Récupérer l'utilisateur courant
    const meRes = await fetch(`${API_URL}/api/users/me`, {
      headers: { Authorization: authHeader },
    });
    if (!meRes.ok) return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
    const me = await meRes.json();

    // Vérifier que l'œuvre appartient à cet utilisateur
    const oeuvreRes = await fetch(
      `${API_URL}/api/oeuvres/${oeuvreDocumentId}?populate[users][fields][0]=id`,
      { headers: { Authorization: authHeader } }
    );
    if (!oeuvreRes.ok) return { ok: false, response: NextResponse.json({ error: 'Oeuvre not found' }, { status: 404 }) };
    const oeuvreData = await oeuvreRes.json();
    const owners = oeuvreData?.data?.users || [];
    if (!owners.some(u => u.id === me.id)) {
      return { ok: false, response: NextResponse.json({ error: 'Forbidden: you do not own this oeuvre' }, { status: 403 }) };
    }
    return { ok: true };
  } catch {
    return { ok: false, response: NextResponse.json({ error: 'Ownership check failed' }, { status: 500 }) };
  }
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

    // Determiner si la requête est publique (sans auth) pour activer le cache
    const isPublicRoute = !authHeader && ['oeuvres', 'genres', 'tags', 'scans'].some(r => pathStr.startsWith(r));
    
    const response = await fetch(url, {
      headers,
      ...(isPublicRoute ? { next: { revalidate: 60 } } : { cache: 'no-store' }),
    });
    
    const text = await response.text();
    try {
      const data = JSON.parse(text);
      const res = NextResponse.json(data, {
        status: response.status,
      });
      // Ajouter des headers de cache pour les routes publiques
      if (isPublicRoute) {
        res.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');
      }
      return res;
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
    const isAuthRoute = pathStr.startsWith('auth/');
    if (!checkRateLimit(ip, isAuthRoute)) {
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
    
    // ─── Ownership check pour création de scan ───
    if (pathStr === 'scans' && body?.data?.oeuvres?.connect?.length > 0) {
      if (!authHeader) {
        return NextResponse.json({ error: 'Authorization required' }, { status: 401 });
      }
      const oeuvreId = body.data.oeuvres.connect[0];
      const check = await verifyOeuvreOwnership(authHeader, oeuvreId);
      if (!check.ok) return check.response;
    }
    
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
    
    let body = await request.json();
    const url = `${API_URL}/api/${pathStr}`;
    
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization required' }, { status: 401 });
    }

    // ─── Ownership check pour modification de scan ───
    const scanMatch = pathStr.match(/^scans\/(.+)$/);
    if (scanMatch) {
      // Récupérer le scan existant pour vérifier l'oeuvre associée
      const scanRes = await fetch(`${API_URL}/api/scans/${scanMatch[1]}?populate[oeuvres][fields][0]=documentId`, {
        headers: { Authorization: authHeader },
      });
      if (scanRes.ok) {
        const scanData = await scanRes.json();
        const oeuvreId = scanData?.data?.oeuvres?.[0]?.documentId;
        if (oeuvreId) {
          const check = await verifyOeuvreOwnership(authHeader, oeuvreId);
          if (!check.ok) return check.response;
        }
      }
    }

    // Ownership check for users — strip sensitive fields
    const usersMatch = pathStr.match(/^users\/(\d+)$/);
    if (usersMatch) {
      // Verify the user is modifying their own profile
      const meRes = await fetch(`${API_URL}/api/users/me`, {
        headers: { Authorization: authHeader },
      });
      if (!meRes.ok) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      const me = await meRes.json();
      if (String(me.id) !== usersMatch[1]) {
        return NextResponse.json({ error: 'Forbidden: cannot modify another user' }, { status: 403 });
      }
      // Filter body to only writable fields (prevent self-promotion to redacteur)
      const filtered = {};
      for (const key of USER_WRITABLE_FIELDS) {
        if (key in body) filtered[key] = body[key];
      }
      body = filtered;
    }
    
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': authHeader,
    };
    
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
    
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization required' }, { status: 401 });
    }
    
    // ─── Ownership check pour suppression de scan ───
    const scanDeleteMatch = pathStr.match(/^scans\/(.+)$/);
    if (scanDeleteMatch) {
      const scanDocId = scanDeleteMatch[1];
      try {
        // Récupérer le scan avec son œuvre liée
        const scanRes = await fetch(
          `${API_URL}/api/scans/${scanDocId}?populate[oeuvres][fields][0]=documentId&populate[oeuvres][populate][users][fields][0]=id`,
          { headers: { Authorization: authHeader } }
        );
        if (scanRes.ok) {
          const scanData = await scanRes.json();
          const meRes = await fetch(`${API_URL}/api/users/me`, { headers: { Authorization: authHeader } });
          if (meRes.ok) {
            const me = await meRes.json();
            const oeuvres = scanData?.data?.oeuvres || [];
            const isOwner = oeuvres.some(o => (o.users || []).some(u => u.id === me.id));
            if (!isOwner) {
              return NextResponse.json({ error: 'Forbidden: you do not own this scan' }, { status: 403 });
            }
          }
        }
      } catch (err) {
        console.error('Scan ownership check error:', err);
      }
    }
    
    const url = `${API_URL}/api/${pathStr}`;
    
    const headers = {
      'Authorization': authHeader,
    };
    
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
