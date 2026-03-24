import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://my-strapi-project-yysn.onrender.com";

// GET — Vérifier si l'utilisateur/session a liké ou est abonné à une œuvre
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const oeuvreId = searchParams.get("oeuvreId");

    if (!oeuvreId) {
      return NextResponse.json({ error: "Missing oeuvreId" }, { status: 400 });
    }

    const authHeader = request.headers.get("Authorization");
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("tracking_session")?.value;

    if (!authHeader && !sessionId) {
      return NextResponse.json({ liked: false, subscribed: false });
    }

    const headers = { "Content-Type": "application/json" };
    if (authHeader) headers["Authorization"] = authHeader;

    // Chercher les événements like et abonne pour cette session/utilisateur
    const identifier = sessionId || "none";
    const url = `${API_URL}/api/suivis?` +
      `filters[oeuvreId][$eq]=${oeuvreId}` +
      `&filters[sessionId][$eq]=${identifier}` +
      `&filters[$or][0][type][$eq]=like` +
      `&filters[$or][1][type][$eq]=abonne` +
      `&fields[0]=type` +
      `&pagination[pageSize]=10` +
      `&sort=createdAt:desc`;

    const res = await fetch(url, { headers, cache: "no-store" });

    if (!res.ok) {
      return NextResponse.json({ liked: false, subscribed: false, available: false });
    }

    const data = await res.json();
    const events = data.data || [];

    const liked = events.some((e) => e.type === "like");
    const subscribed = events.some((e) => e.type === "abonne");

    return NextResponse.json({ liked, subscribed, available: true });
  } catch (error) {
    console.error("Favoris GET error:", error);
    return NextResponse.json({ liked: false, subscribed: false, available: false }, { status: 500 });
  }
}
