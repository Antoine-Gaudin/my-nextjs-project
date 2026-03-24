import { NextResponse } from "next/server";

const INDEX_API_TOKEN = process.env.INDEX_API_TOKEN;
const INDEX_API_URL = "https://novel-index-strapi.onrender.com";

// Rate limiting
const rateLimitMap = new Map();

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now - entry.start > 60000) {
    rateLimitMap.set(ip, { start: now, count: 1 });
    return true;
  }
  entry.count++;
  return entry.count <= 10;
}

function getClientIp(request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "unknown";
}

// POST — Envoyer un signalement d'erreur vers Novel-Index (table administration)
export async function POST(request) {
  try {
    const ip = getClientIp(request);
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    if (!INDEX_API_TOKEN) {
      return NextResponse.json({ error: "Index API token not configured" }, { status: 500 });
    }

    const body = await request.json();
    const { type, description, paragraphe, chapitreOrder, chapitreTitre, oeuvreTitre } = body;

    if (!description || !type) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Construire le titre et contenu pour la table administration
    const titre = `[Signalement ${type}] ${oeuvreTitre || "?"} — Ch.${chapitreOrder || "?"}: ${chapitreTitre || ""}`;
    const contenu = [
      `Type: ${type}`,
      `Oeuvre: ${oeuvreTitre || "N/A"}`,
      `Chapitre: ${chapitreOrder || "?"} — ${chapitreTitre || "N/A"}`,
      paragraphe ? `Passage: "${paragraphe}"` : null,
      `Description: ${description}`,
    ].filter(Boolean).join("\n");

    const res = await fetch(`${INDEX_API_URL}/api/administrations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${INDEX_API_TOKEN}`,
      },
      body: JSON.stringify({
        data: {
          titre,
          contenu,
          signalement: true,
          origine: "trad-index",
        },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Signalement create error:", res.status, err.substring(0, 300));
      return NextResponse.json({ error: "Failed to create report" }, { status: 500 });
    }

    const result = await res.json();
    return NextResponse.json({ success: true, data: result.data }, { status: 201 });
  } catch (error) {
    console.error("Signalements POST error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
