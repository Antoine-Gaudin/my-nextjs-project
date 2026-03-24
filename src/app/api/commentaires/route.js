import { NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://my-strapi-project-yysn.onrender.com";

// Rate limiting
const rateLimitMap = new Map();
function checkRateLimit(ip, max = 30) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now - entry.start > 60000) {
    rateLimitMap.set(ip, { start: now, count: 1 });
    return true;
  }
  entry.count++;
  return entry.count <= max;
}

function getClientIp(request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "unknown";
}

// GET — Récupérer les commentaires d'un chapitre
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const chapitreId = searchParams.get("chapitreId");

    if (!chapitreId) {
      return NextResponse.json({ error: "Missing chapitreId" }, { status: 400 });
    }

    const url = `${API_URL}/api/commentaires?` +
      `filters[chapitreId][$eq]=${chapitreId}` +
      `&sort=createdAt:asc` +
      `&pagination[pageSize]=200` +
      `&populate[auteur][fields][0]=username` +
      `&populate[auteur][fields][1]=avatar`;

    const res = await fetch(url, {
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Strapi error", available: false }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json({ data: data.data || [], available: true });
  } catch (error) {
    console.error("Commentaires GET error:", error);
    return NextResponse.json({ error: "Internal error", available: false }, { status: 500 });
  }
}

// POST — Créer un commentaire (auth requise)
export async function POST(request) {
  try {
    const ip = getClientIp(request);
    if (!checkRateLimit(ip, 10)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const authHeader = request.headers.get("Authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await request.json();
    const { texte, chapitreId, oeuvreId, parentId } = body;

    if (!texte || !chapitreId || !oeuvreId) {
      return NextResponse.json({ error: "Missing fields: texte, chapitreId, oeuvreId" }, { status: 400 });
    }

    if (texte.trim().length < 1 || texte.length > 2000) {
      return NextResponse.json({ error: "Comment must be 1-2000 characters" }, { status: 400 });
    }

    // Récupérer l'ID utilisateur depuis Strapi
    const meRes = await fetch(`${API_URL}/api/users/me`, {
      headers: { Authorization: authHeader },
    });
    if (!meRes.ok) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    const user = await meRes.json();

    const createRes = await fetch(`${API_URL}/api/commentaires`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify({
        data: {
          texte: texte.trim(),
          chapitreId,
          oeuvreId,
          parentId: parentId || null,
          auteur: user.id,
        },
      }),
    });

    if (!createRes.ok) {
      const err = await createRes.text();
      console.error("Commentaire create error:", createRes.status, err.substring(0, 300));
      return NextResponse.json({ error: "Failed to create comment" }, { status: 500 });
    }

    const result = await createRes.json();
    return NextResponse.json({
      success: true,
      data: {
        ...result.data,
        auteur: { username: user.username, avatar: user.avatar },
      },
    }, { status: 201 });
  } catch (error) {
    console.error("Commentaires POST error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// DELETE — Supprimer son propre commentaire (auth requise)
export async function DELETE(request) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const commentId = searchParams.get("id");

    if (!commentId) {
      return NextResponse.json({ error: "Missing comment id" }, { status: 400 });
    }

    // Vérifier que le commentaire appartient à l'utilisateur
    const meRes = await fetch(`${API_URL}/api/users/me`, {
      headers: { Authorization: authHeader },
    });
    if (!meRes.ok) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    const user = await meRes.json();

    const commentRes = await fetch(`${API_URL}/api/commentaires/${commentId}?populate[auteur][fields][0]=id`, {
      headers: { Authorization: authHeader },
    });
    if (!commentRes.ok) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }
    const comment = await commentRes.json();
    const authorId = comment.data?.auteur?.id;

    if (authorId !== user.id) {
      return NextResponse.json({ error: "Not your comment" }, { status: 403 });
    }

    const deleteRes = await fetch(`${API_URL}/api/commentaires/${commentId}`, {
      method: "DELETE",
      headers: { Authorization: authHeader },
    });

    if (!deleteRes.ok) {
      return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Commentaires DELETE error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
