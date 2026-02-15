export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/profil", "/chapitreadmin/", "/mochapitre/"],
      },
      {
        userAgent: "GPTBot",
        disallow: ["/"],
      },
    ],
    sitemap: "https://trad-index.com/sitemap.xml",
    host: "https://trad-index.com",
  };
}
