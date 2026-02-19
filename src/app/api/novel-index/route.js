import { NextResponse } from "next/server";

// Token côté serveur uniquement — ne JAMAIS utiliser NEXT_PUBLIC_ pour les secrets
const INDEX_API_TOKEN = process.env.INDEX_API_TOKEN;
const INDEX_API_URL = "https://novel-index-strapi.onrender.com";

// ─── Rate limiting ───
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000;
const RATE_LIMIT_MAX = 200;

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

function getClientIp(request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "unknown";
}

// Routes autorisées sur novel-index
const ALLOWED_ACTIONS = ["sync-oeuvre", "sync-chapitre", "delete-chapitre", "find-oeuvre", "list-oeuvres", "list-chapitres"];

// POST — Toutes les opérations de sync novel-index
export async function POST(request) {
  try {
    const ip = getClientIp(request);
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    // Vérifier que l'utilisateur est authentifié
    const authHeader = request.headers.get("Authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!INDEX_API_TOKEN) {
      return NextResponse.json({ error: "Index API token not configured" }, { status: 500 });
    }

    const body = await request.json();
    const { action, ...data } = body;

    if (!action || !ALLOWED_ACTIONS.includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${INDEX_API_TOKEN}`,
    };

    // ─── Sync oeuvre ───
    if (action === "sync-oeuvre") {
      const { payload, couvertureData } = data;
      if (!payload) return NextResponse.json({ error: "Missing payload" }, { status: 400 });

      const res = await fetch(`${INDEX_API_URL}/api/oeuvres`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
      const result = await res.json();

      // Upload couverture si fournie (base64)
      if (couvertureData && result.data?.id) {
        try {
          const formData = new FormData();
          const buffer = Buffer.from(couvertureData.base64, "base64");
          const blob = new Blob([buffer], { type: couvertureData.mimeType });
          formData.append("files", blob, couvertureData.fileName);
          formData.append("ref", "api::oeuvre.oeuvre");
          formData.append("refId", result.data.id);
          formData.append("field", "couverture");

          await fetch(`${INDEX_API_URL}/api/upload`, {
            method: "POST",
            headers: { Authorization: `Bearer ${INDEX_API_TOKEN}` },
            body: formData,
          });
        } catch (uploadErr) {
          console.error("Novel-index cover upload error:", uploadErr);
        }
      }

      return NextResponse.json(result, { status: res.status });
    }

    // ─── Sync chapitre ───
    if (action === "sync-chapitre") {
      const { oeuvreTitre, chapitreData } = data;
      if (!oeuvreTitre || !chapitreData) {
        return NextResponse.json({ error: "Missing oeuvreTitre or chapitreData" }, { status: 400 });
      }

      // Trouver l'oeuvre sur novel-index
      const findRes = await fetch(
        `${INDEX_API_URL}/api/oeuvres?filters[titre][$eq]=${encodeURIComponent(oeuvreTitre)}`,
        { headers }
      );
      const findData = await findRes.json();
      const oeuvreIndexId = findData.data?.[0]?.documentId;

      if (!oeuvreIndexId) {
        return NextResponse.json({ message: "Oeuvre not found on index", synced: false }, { status: 200 });
      }

      const createRes = await fetch(`${INDEX_API_URL}/api/chapitres`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          data: { ...chapitreData, oeuvres: oeuvreIndexId },
        }),
      });
      const createData = await createRes.json();
      return NextResponse.json({ synced: true, data: createData }, { status: createRes.status });
    }

    // ─── Delete chapitre ───
    if (action === "delete-chapitre") {
      const { titre, order } = data;
      if (!titre) return NextResponse.json({ error: "Missing titre" }, { status: 400 });

      const findRes = await fetch(
        `${INDEX_API_URL}/api/chapitres?filters[titre][$eq]=${encodeURIComponent(titre)}&filters[order][$eq]=${order}`,
        { headers }
      );
      const findData = await findRes.json();
      const indexChapitre = findData.data?.[0];

      if (indexChapitre) {
        await fetch(`${INDEX_API_URL}/api/chapitres/${indexChapitre.documentId}`, {
          method: "DELETE",
          headers,
        });
        return NextResponse.json({ deleted: true }, { status: 200 });
      }

      return NextResponse.json({ deleted: false, message: "Not found on index" }, { status: 200 });
    }

    // ─── Find oeuvre ───
    if (action === "find-oeuvre") {
      const { titre } = data;
      if (!titre) return NextResponse.json({ error: "Missing titre" }, { status: 400 });

      const res = await fetch(
        `${INDEX_API_URL}/api/oeuvres?filters[titre][$eq]=${encodeURIComponent(titre)}`,
        { headers }
      );
      const result = await res.json();
      return NextResponse.json({ data: result.data?.[0] || null }, { status: 200 });
    }

    // ─── List oeuvres (avec pagination) ───
    if (action === "list-oeuvres") {
      const { page = 1, pageSize = 100 } = data;
      const res = await fetch(
        `${INDEX_API_URL}/api/oeuvres?populate=couverture&pagination[page]=${page}&pagination[pageSize]=${pageSize}&sort=titre:asc`,
        { headers }
      );
      const result = await res.json();
      return NextResponse.json(result, { status: res.status });
    }

    // ─── List chapitres d'une oeuvre ───
    if (action === "list-chapitres") {
      const { oeuvreDocumentId, page = 1, pageSize = 100 } = data;
      if (!oeuvreDocumentId) {
        return NextResponse.json({ error: "Missing oeuvreDocumentId" }, { status: 400 });
      }
      const res = await fetch(
        `${INDEX_API_URL}/api/chapitres?filters[oeuvres][documentId][$eq]=${oeuvreDocumentId}&fields[0]=titre&fields[1]=order&fields[2]=documentId&fields[3]=url&fields[4]=tome&sort=order:asc&pagination[page]=${page}&pagination[pageSize]=${pageSize}`,
        { headers }
      );
      const result = await res.json();
      return NextResponse.json(result, { status: res.status });
    }

  } catch (error) {
    console.error("Novel-index API error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
