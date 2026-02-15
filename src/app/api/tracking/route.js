import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://my-strapi-project-yysn.onrender.com";
const COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes de cooldown par session+cible

// ─── Rate limiting ───
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 60; // 60 requêtes / minute / IP

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now - entry.start > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(ip, { start: now, count: 1 });
    return true;
  }
  entry.count++;
  return entry.count <= RATE_LIMIT_MAX;
}

// Nettoyage périodique
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap) {
    if (now - entry.start > RATE_LIMIT_WINDOW) rateLimitMap.delete(ip);
  }
}, 5 * 60 * 1000);

function getClientIp(request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "unknown";
}

// Générer ou récupérer un sessionId anonyme
async function getSessionId() {
  const cookieStore = await cookies();
  let sessionId = cookieStore.get("tracking_session")?.value;
  if (!sessionId) {
    sessionId = crypto.randomUUID();
  }
  return sessionId;
}

// POST — Enregistrer un événement (vue, like, abonné)
export async function POST(request) {
  try {
    // Rate limiting
    const ip = getClientIp(request);
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await request.json();
    const { type, cibleType, cibleId, oeuvreId } = body;

    // Validation
    if (!type || !cibleType || !cibleId || !oeuvreId) {
      return NextResponse.json({ error: "Missing fields: type, cibleType, cibleId, oeuvreId" }, { status: 400 });
    }
    if (!["vue", "like", "abonne"].includes(type)) {
      return NextResponse.json({ error: "type must be vue, like, or abonne" }, { status: 400 });
    }
    if (!["oeuvre", "chapitre"].includes(cibleType)) {
      return NextResponse.json({ error: "cibleType must be oeuvre or chapitre" }, { status: 400 });
    }

    const sessionId = await getSessionId();
    const authHeader = request.headers.get("Authorization");

    // Vérifier le cooldown : chercher si un événement récent existe déjà
    const cooldownDate = new Date(Date.now() - COOLDOWN_MS).toISOString();
    const checkUrl = `${API_URL}/api/suivis?` +
      `filters[type][$eq]=${type}` +
      `&filters[cibleId][$eq]=${cibleId}` +
      `&filters[sessionId][$eq]=${sessionId}` +
      `&filters[createdAt][$gte]=${cooldownDate}` +
      `&pagination[pageSize]=1`;

    const headers = { "Content-Type": "application/json" };
    if (authHeader) headers["Authorization"] = authHeader;

    try {
      const checkRes = await fetch(checkUrl, { headers, cache: "no-store" });
      if (checkRes.ok) {
        const checkData = await checkRes.json();
        if (checkData.data && checkData.data.length > 0) {
          return NextResponse.json({ message: "Already tracked (cooldown)", duplicate: true }, { status: 200 });
        }
      }
    } catch {
      // Si la collection n'existe pas, on tente quand même de créer
    }

    // Créer l'événement dans Strapi
    const createRes = await fetch(`${API_URL}/api/suivis`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        data: {
          type,
          cibleType,
          cibleId,
          oeuvreId,
          sessionId,
        },
      }),
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      console.error("Tracking create error:", createRes.status, errText.substring(0, 300));
      return NextResponse.json(
        { error: "Failed to record tracking event", status: createRes.status },
        { status: createRes.status >= 400 ? createRes.status : 500 }
      );
    }

    const result = await createRes.json();

    // Répondre avec le cookie session
    const response = NextResponse.json({ success: true, id: result.data?.id }, { status: 201 });
    response.cookies.set("tracking_session", sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 365 * 24 * 60 * 60, // 1 an
      path: "/",
    });
    return response;
  } catch (error) {
    console.error("Tracking POST error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// GET — Récupérer les stats agrégées pour des œuvres
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const oeuvreIds = searchParams.getAll("oeuvreId");

    if (!oeuvreIds || oeuvreIds.length === 0) {
      return NextResponse.json({ error: "Missing oeuvreId params" }, { status: 400 });
    }

    const authHeader = request.headers.get("Authorization");
    const headers = { "Content-Type": "application/json" };
    if (authHeader) headers["Authorization"] = authHeader;

    const filters = oeuvreIds.map((id, i) => `filters[oeuvreId][$in][${i}]=${id}`).join("&");
    const url = `${API_URL}/api/suivis?${filters}&fields[0]=type&fields[1]=cibleType&fields[2]=cibleId&fields[3]=oeuvreId&fields[4]=createdAt&pagination[pageSize]=10000&sort=createdAt:desc`;

    const res = await fetch(url, { headers, cache: "no-store" });

    if (!res.ok) {
      return NextResponse.json({ error: "Strapi error", available: false }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json({ data: data.data || [], available: true }, { status: 200 });
  } catch (error) {
    console.error("Tracking GET error:", error);
    return NextResponse.json({ error: "Internal error", available: false }, { status: 500 });
  }
}
