const API_URL =
  process.env.API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "https://my-strapi-project-yysn.onrender.com";

const BASE_URL = "https://trad-index.com";

export default async function sitemap() {
  // Pages statiques
  const staticPages = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/oeuvres`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/documentation/editeur`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/connexion`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/inscription`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];

  // Récupérer toutes les oeuvres avec leurs chapitres et scans
  let oeuvrePages = [];
  let chapterPages = [];
  let scanPages = [];

  try {
    let allOeuvres = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const res = await fetch(
        `${API_URL}/api/oeuvres?fields[0]=documentId&fields[1]=titre&fields[2]=updatedAt&populate[chapitres][fields][0]=order&populate[chapitres][fields][1]=updatedAt&populate[scans][fields][0]=order&populate[scans][fields][1]=updatedAt&pagination[page]=${page}&pagination[pageSize]=100`,
        { next: { revalidate: 3600 } }
      );
      const data = await res.json();
      allOeuvres = [...allOeuvres, ...(data.data || [])];
      hasMore =
        data.meta?.pagination?.page < data.meta?.pagination?.pageCount;
      page++;
    }

    for (const oeuvre of allOeuvres) {
      if (!oeuvre.documentId) continue;

      // Page de l'oeuvre
      oeuvrePages.push({
        url: `${BASE_URL}/oeuvre/${oeuvre.documentId}`,
        lastModified: oeuvre.updatedAt
          ? new Date(oeuvre.updatedAt)
          : new Date(),
        changeFrequency: "weekly",
        priority: 0.8,
      });

      if (!oeuvre.chapitres) continue;

      for (const chapitre of oeuvre.chapitres) {
        chapterPages.push({
          url: `${BASE_URL}/oeuvre/${oeuvre.documentId}/chapitre/${chapitre.order}`,
          lastModified: chapitre.updatedAt
            ? new Date(chapitre.updatedAt)
            : new Date(),
          changeFrequency: "monthly",
          priority: 0.6,
        });
      }

      // Pages de scans
      if (oeuvre.scans) {
        for (const scan of oeuvre.scans) {
          scanPages.push({
            url: `${BASE_URL}/oeuvre/${oeuvre.documentId}/scan/${scan.order}`,
            lastModified: scan.updatedAt
              ? new Date(scan.updatedAt)
              : new Date(),
            changeFrequency: "monthly",
            priority: 0.6,
          });
        }
      }
    }
  } catch (err) {
    console.error("Erreur génération sitemap:", err);
  }

  // Récupérer les teams publiques
  let teamPages = [];
  try {
    let allTeams = [];
    let teamPage = 1;
    let hasMoreTeams = true;

    while (hasMoreTeams) {
      const teamsRes = await fetch(
        `${API_URL}/api/teams?filters[isPublic][$eq]=true&fields[0]=slug&fields[1]=updatedAt&pagination[page]=${teamPage}&pagination[pageSize]=100`,
        { next: { revalidate: 3600 } }
      );
      const teamsData = await teamsRes.json();
      allTeams = [...allTeams, ...(teamsData.data || [])];
      hasMoreTeams = teamsData.meta?.pagination?.page < teamsData.meta?.pagination?.pageCount;
      teamPage++;
    }

    teamPages = allTeams
      .filter((t) => t.slug)
      .map((team) => ({
        url: `${BASE_URL}/team/${team.slug}`,
        lastModified: team.updatedAt ? new Date(team.updatedAt) : new Date(),
        changeFrequency: "weekly",
        priority: 0.6,
      }));
  } catch (err) {
    console.error("Erreur sitemap teams:", err);
  }

  // Récupérer les traducteurs (rédacteurs)
  let traducteurPages = [];
  try {
    let allUsers = [];
    let userPage = 1;
    let hasMoreUsers = true;

    while (hasMoreUsers) {
      const usersRes = await fetch(
        `${API_URL}/api/users?filters[redacteur][$eq]=true&fields[0]=username&fields[1]=updatedAt&pagination[start]=${(userPage - 1) * 100}&pagination[limit]=100`,
        { next: { revalidate: 3600 } }
      );
      const usersData = await usersRes.json();
      const batch = Array.isArray(usersData) ? usersData : usersData.data || [];
      allUsers = [...allUsers, ...batch];
      hasMoreUsers = batch.length === 100;
      userPage++;
    }

    traducteurPages = allUsers
      .filter((u) => u.username)
      .map((user) => ({
        url: `${BASE_URL}/traducteur/${encodeURIComponent(user.username)}`,
        lastModified: user.updatedAt ? new Date(user.updatedAt) : new Date(),
        changeFrequency: "weekly",
        priority: 0.5,
      }));
  } catch (err) {
    console.error("Erreur sitemap traducteurs:", err);
  }

  return [
    ...staticPages,
    ...oeuvrePages,
    ...chapterPages,
    ...scanPages,
    ...teamPages,
    ...traducteurPages,
  ];
}
