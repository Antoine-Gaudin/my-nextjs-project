"use client";

export default function TeamTheme({ team, children }) {
  // Extraction des couleurs personnalisées
  const primaryColor = team.themeCouleurPrimaire || "#6366f1";
  const secondaryColor = team.themeCouleurSecondaire || "#8b5cf6";
  const accentColor = team.themeCouleurAccent || "#ec4899";

  return (
    <>
      <style jsx global>{`
        .team-themed {
          --team-primary: ${primaryColor};
          --team-secondary: ${secondaryColor};
          --team-accent: ${accentColor};
          
          --team-primary-rgb: ${hexToRgb(primaryColor)};
          --team-secondary-rgb: ${hexToRgb(secondaryColor)};
          --team-accent-rgb: ${hexToRgb(accentColor)};
        }

        /* Boutons */
        .team-themed .team-btn-primary {
          background: var(--team-primary);
        }
        
        .team-themed .team-btn-primary:hover {
          background: color-mix(in srgb, var(--team-primary) 80%, white);
        }

        .team-themed .team-btn-secondary {
          background: var(--team-secondary);
        }

        .team-themed .team-btn-accent {
          background: var(--team-accent);
        }

        /* Badges */
        .team-themed .team-badge {
          background: rgba(var(--team-accent-rgb), 0.1);
          color: var(--team-accent);
        }

        /* Bordures et accents */
        .team-themed .team-border-accent {
          border-color: var(--team-accent);
        }

        .team-themed .team-text-accent {
          color: var(--team-accent);
        }

        .team-themed .team-bg-primary {
          background: var(--team-primary);
        }

        .team-themed .team-gradient {
          background: linear-gradient(
            135deg,
            var(--team-primary),
            var(--team-secondary),
            var(--team-accent)
          );
        }

        /* Liens et hover (scoped pour ne pas affecter la nav) */
        .team-themed .team-content a:hover {
          color: var(--team-accent);
        }

        /* Focus ring */
        .team-themed *:focus-visible {
          outline-color: var(--team-accent);
          outline-offset: 2px;
        }
      `}</style>
      <div className="team-themed">{children}</div>
    </>
  );
}

// Utilitaire pour convertir hex en rgb
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(
        result[3],
        16
      )}`
    : "99, 102, 241";
}
