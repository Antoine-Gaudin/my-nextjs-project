"use client";

import DOMPurify from "dompurify";

export default function TeamCustomSections({ team }) {
  // Parse les sections personnalisées depuis le JSON
  let sections = [];
  try {
    sections = team.sectionsCustom
      ? typeof team.sectionsCustom === "string"
        ? JSON.parse(team.sectionsCustom)
        : team.sectionsCustom
      : [];
  } catch (e) {
    console.error("Erreur parsing sectionsCustom:", e);
    return null;
  }

  if (!Array.isArray(sections) || sections.length === 0) {
    return null;
  }

  return (
    <div className="space-y-8">
      {sections.map((section, index) => (
        <CustomSection key={section.id || index} section={section} index={index} />
      ))}
    </div>
  );
}

function CustomSection({ section, index }) {
  const { type, title, content } = section;

  // Normaliser content : peut être un objet ou une string
  const parsedContent =
    typeof content === "string" ? (() => { try { return JSON.parse(content); } catch { return content; } })() : content;

  // Section de texte
  if (type === "text") {
    const textHtml = typeof parsedContent === "object" ? parsedContent?.text : parsedContent;
    return (
      <div className="bg-gray-800/30 border border-gray-700/30 rounded-xl p-6">
        {title && (
          <h2 className="text-2xl font-bold text-white mb-4">{title}</h2>
        )}
        {textHtml && (
          <div
            className="prose prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(textHtml) }}
          />
        )}
      </div>
    );
  }

  // Section galerie
  if (type === "gallery") {
    const images = typeof parsedContent === "object" ? (parsedContent?.images || []) : [];
    return (
      <div className="space-y-4">
        {title && (
          <h2 className="text-2xl font-bold text-white">{title}</h2>
        )}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((img, idx) => (
            <div
              key={idx}
              className="aspect-square rounded-xl overflow-hidden bg-gray-800 hover:scale-105 transition-transform cursor-pointer"
            >
              <img
                src={img.url}
                alt={img.alt || `Image ${idx + 1}`}
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Section bannière / call-to-action
  if (type === "cta") {
    const ctaContent = typeof parsedContent === "object" ? parsedContent : {};
    return (
      <div className="relative overflow-hidden rounded-xl p-8 md:p-12 text-center bg-gradient-to-r from-indigo-900 to-purple-900">
        {title && (
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            {title}
          </h2>
        )}
        {ctaContent.text && (
          <p className="text-lg text-gray-200 mb-6 max-w-2xl mx-auto">
            {ctaContent.text}
          </p>
        )}
        {ctaContent.buttonText && ctaContent.buttonLink && (
          <a
            href={ctaContent.buttonLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-gray-900 font-bold rounded-lg hover:bg-gray-100 transition-all"
          >
            {ctaContent.buttonText}
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </a>
        )}
      </div>
    );
  }

  // Section stats
  if (type === "stats") {
    const stats = typeof parsedContent === "object" ? (parsedContent?.stats || []) : [];
    return (
      <div className="space-y-4">
        {title && (
          <h2 className="text-2xl font-bold text-white">{title}</h2>
        )}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat, idx) => (
            <div
              key={idx}
              className="bg-gray-800/30 border border-gray-700/30 rounded-xl p-6 text-center"
            >
              <div className="text-3xl md:text-4xl font-bold text-[var(--team-accent,#ec4899)] mb-2">
                {stat.value}
              </div>
              <div className="text-sm text-gray-400">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Section timeline / événements
  if (type === "timeline") {
    const events = typeof parsedContent === "object" ? (parsedContent?.events || []) : [];
    return (
      <div className="space-y-4">
        {title && (
          <h2 className="text-2xl font-bold text-white mb-6">{title}</h2>
        )}
        <div className="space-y-4">
          {events.map((event, idx) => (
            <div
              key={idx}
              className="flex gap-4 bg-gray-800/30 border border-gray-700/30 rounded-xl p-4 hover:border-indigo-600/30 transition-all"
            >
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-[var(--team-primary,#6366f1)] flex items-center justify-center text-white font-bold">
                  {event.icon || "📅"}
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-white">{event.title}</h3>
                  {event.date && (
                    <span className="text-sm text-gray-400">{event.date}</span>
                  )}
                </div>
                {event.description && (
                  <p className="text-gray-400 text-sm">{event.description}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Section recrutement
  if (type === "recruitment") {
    const recruitContent = typeof parsedContent === "object" ? parsedContent : {};
    const positions = recruitContent?.positions || [];
    return (
      <div className="bg-gradient-to-r from-indigo-900/30 to-purple-900/30 border border-indigo-600/30 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0">
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-white mb-2">
              {title || "🔥 Nous recrutons !"}
            </h2>
            {recruitContent.contactInfo && (
              <p className="text-gray-300 mb-4">{recruitContent.contactInfo}</p>
            )}
            {positions.length > 0 && (
              <div className="space-y-3 mt-4">
                {positions.map((position, idx) => (
                  <div key={idx} className="bg-gray-800/30 rounded-lg p-4">
                    <h3 className="font-semibold text-white mb-1">
                      {typeof position === "string" ? position : position.role}
                    </h3>
                    {position.description && (
                      <p className="text-gray-400 text-sm mb-2">{position.description}</p>
                    )}
                    {position.requirements?.length > 0 && (
                      <ul className="text-sm text-gray-500 list-disc pl-4">
                        {position.requirements.map((req, ri) => (
                          <li key={ri}>{req}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Défaut : rendu basique
  return (
    <div className="bg-gray-800/30 border border-gray-700/30 rounded-xl p-6">
      {title && <h2 className="text-2xl font-bold text-white mb-4">{title}</h2>}
      {typeof parsedContent === "string" && <div className="text-gray-400">{parsedContent}</div>}
      {typeof parsedContent === "object" && parsedContent?.text && <div className="text-gray-400">{parsedContent.text}</div>}
    </div>
  );
}
