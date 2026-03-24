import { NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://my-strapi-project-yysn.onrender.com";

function getClientIp(request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "unknown";
}

// GET — Récupérer les signets de l'utilisateur pour une œuvre
export async function GET(request) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const oeuvreId = searchParams.get("oeuvreId");

    // Récupérer l'utilisateur
    const meRes = await fetch(`${API_URL}/api/users/me`, {
      headers: { Authorization: authHeader },
    });
    if (!meRes.ok) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    const user = await meRes.json();

    let url = `${API_URL}/api/signets?` +
      `filters[utilisateurId][$eq]=${user.id}` +
      `&sort=createdAt:desc` +
      `&pagination[pageSize]=100`;

    if (oeuvreId) {
      url += `&filters[oeuvreId][$eq]=${oeuvreId}`;
    }

    const res = await fetch(url, {
      headers: { "Content-Type": "application/json", Authorization: authHeader },
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Strapi error", available: false }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json({ data: data.data || [], available: true });
  } catch (error) {
    console.error("Signets GET error:", error);
    return NextResponse.json({ error: "Internal error", available: false }, { status: 500 });
  }
}

// POST — Créer un signet
export async function POST(request) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await request.json();
    const { nom, chapitreId, oeuvreId, chapitreOrder, chapitreTitre, position } = body;

    if (!chapitreId || !oeuvreId) {
      return NextResponse.json({ error: "Missing chapitreId or oeuvreId" }, { status: 400 });
    }

    const meRes = await fetch(`${API_URL}/api/users/me`, {
      headers: { Authorization: authHeader },
    });
    if (!meRes.ok) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    const user = await meRes.json();

    const createRes = await fetch(`${API_URL}/api/signets`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify({
        data: {
          nom: nom || `Chapitre ${chapitreOrder || ""}`,
          chapitreId,
          oeuvreId,
          chapitreOrder: chapitreOrder || null,
          chapitreTitre: chapitreTitre || "",
          position: position || 0,
          utilisateurId: user.id,
        },
      }),
    });

    if (!createRes.ok) {
      const err = await createRes.text();
      console.error("Signet create error:", createRes.status, err.substring(0, 300));
      return NextResponse.json({ error: "Failed to create bookmark" }, { status: 500 });
    }

    const result = await createRes.json();
    return NextResponse.json({ success: true, data: result.data }, { status: 201 });
  } catch (error) {
    console.error("Signets POST error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// DELETE — Supprimer un signet
export async function DELETE(request) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const signetId = searchParams.get("id");

    if (!signetId) {
      return NextResponse.json({ error: "Missing signet id" }, { status: 400 });
    }

    // Vérifier ownership
    const meRes = await fetch(`${API_URL}/api/users/me`, {
      headers: { Authorization: authHeader },
    });
    if (!meRes.ok) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    const user = await meRes.json();

    const signetRes = await fetch(`${API_URL}/api/signets/${signetId}`, {
      headers: { Authorization: authHeader },
    });
    if (!signetRes.ok) {
      return NextResponse.json({ error: "Bookmark not found" }, { status: 404 });
    }
    const signet = await signetRes.json();
    if (signet.data?.utilisateurId !== user.id) {
      return NextResponse.json({ error: "Not your bookmark" }, { status: 403 });
    }

    const deleteRes = await fetch(`${API_URL}/api/signets/${signetId}`, {
      method: "DELETE",
      headers: { Authorization: authHeader },
    });

    if (!deleteRes.ok) {
      return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Signets DELETE error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
