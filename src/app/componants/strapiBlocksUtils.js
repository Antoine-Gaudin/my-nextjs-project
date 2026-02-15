/**
 * ═══════════════════════════════════════════════════════════════
 *  Strapi Blocks ↔ HTML — Utilitaires de conversion unifiés
 * ═══════════════════════════════════════════════════════════════
 *
 * Utilisé par : AjouterChapitre, ImportWord, PanelView (inline editor)
 *
 * Format Strapi blocks v5 :
 *   [{ type: "paragraph", children: [{ type: "text", text: "...", bold?: true, italic?: true }] }]
 */

// ─── HTML → Strapi Blocks ─────────────────────────────────────

/**
 * Convertit du HTML (issu de TinyMCE, mammoth, ou collé) en tableau de blocs Strapi.
 * Gère : <p>, <h1-h6>, <ul>/<ol>/<li>, <blockquote>, <br>, bold/italic/underline/strikethrough/code, liens.
 */
export function htmlToStrapiBlocks(html) {
  if (!html || typeof html !== "string") return [];

  // Nettoyer le HTML
  let cleaned = html
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/&nbsp;/g, " ")
    .trim();

  if (!cleaned) return [];

  // Si c'est du texte brut (pas de balises HTML), convertir en paragraphes
  if (!/<[a-z][\s\S]*>/i.test(cleaned)) {
    return cleaned
      .split(/\n+/)
      .filter((line) => line.trim())
      .map((line) => ({
        type: "paragraph",
        children: [{ type: "text", text: line.trim() }],
      }));
  }

  // Parser le HTML avec DOMParser (navigateur)
  if (typeof window === "undefined") {
    // Côté serveur : fallback simple basé sur regex
    return parseHtmlFallback(cleaned);
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(cleaned, "text/html");
  const body = doc.body;

  const blocks = [];
  processNodes(body.childNodes, blocks);

  // Filtre les blocs vides
  return blocks.filter(
    (b) =>
      b.type !== "paragraph" ||
      b.children.some((c) => (c.text || "").trim() !== "")
  );
}

function processNodes(nodes, blocks) {
  for (const node of nodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent;
      if (text.trim()) {
        // Texte brut hors de tout bloc → paragraphe
        blocks.push({
          type: "paragraph",
          children: [{ type: "text", text: text }],
        });
      }
      continue;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) continue;

    const tag = node.tagName.toLowerCase();

    switch (tag) {
      case "p":
      case "div": {
        const children = parseInlineChildren(node);
        if (children.length > 0) {
          blocks.push({ type: "paragraph", children });
        } else {
          // Paragraphe vide = espacement
          blocks.push({
            type: "paragraph",
            children: [{ type: "text", text: "" }],
          });
        }
        break;
      }

      case "h1":
      case "h2":
      case "h3":
      case "h4":
      case "h5":
      case "h6": {
        const level = parseInt(tag[1], 10);
        const children = parseInlineChildren(node);
        if (children.length > 0) {
          blocks.push({ type: "heading", level, children });
        }
        break;
      }

      case "ul":
      case "ol": {
        const listItems = [];
        for (const li of node.querySelectorAll(":scope > li")) {
          const children = parseInlineChildren(li);
          if (children.length > 0) {
            listItems.push({ type: "list-item", children });
          }
        }
        if (listItems.length > 0) {
          blocks.push({
            type: "list",
            format: tag === "ol" ? "ordered" : "unordered",
            children: listItems,
          });
        }
        break;
      }

      case "blockquote": {
        const children = parseInlineChildren(node);
        if (children.length > 0) {
          blocks.push({ type: "quote", children });
        }
        break;
      }

      case "pre": {
        const code = node.querySelector("code");
        const text = code ? code.textContent : node.textContent;
        blocks.push({
          type: "code",
          children: [{ type: "text", text: text || "" }],
        });
        break;
      }

      case "br": {
        // <br> isolé → paragraphe vide
        blocks.push({
          type: "paragraph",
          children: [{ type: "text", text: "" }],
        });
        break;
      }

      case "hr": {
        // Séparateur → paragraphe vide (Strapi n'a pas de type HR)
        blocks.push({
          type: "paragraph",
          children: [{ type: "text", text: "" }],
        });
        break;
      }

      case "table": {
        // Strapi n'a pas de table blocks, convertir chaque cellule en paragraphe
        for (const row of node.querySelectorAll("tr")) {
          const cells = row.querySelectorAll("td, th");
          const texts = [];
          for (const cell of cells) {
            texts.push(cell.textContent.trim());
          }
          if (texts.join("").trim()) {
            blocks.push({
              type: "paragraph",
              children: [
                { type: "text", text: texts.join(" | ") },
              ],
            });
          }
        }
        break;
      }

      default: {
        // Tout autre élément : traiter les enfants récursivement
        if (node.childNodes.length > 0) {
          processNodes(node.childNodes, blocks);
        }
        break;
      }
    }
  }
}

/**
 * Parse les enfants inline d'un élément (bold, italic, liens, code, etc.)
 * Retourne un tableau de children Strapi.
 */
function parseInlineChildren(element) {
  const children = [];

  function walk(node, formatting) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent;
      if (text) {
        const child = { type: "text", text };
        if (formatting.bold) child.bold = true;
        if (formatting.italic) child.italic = true;
        if (formatting.underline) child.underline = true;
        if (formatting.strikethrough) child.strikethrough = true;
        if (formatting.code) child.code = true;
        children.push(child);
      }
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const tag = node.tagName.toLowerCase();
    const newFormatting = { ...formatting };

    switch (tag) {
      case "strong":
      case "b":
        newFormatting.bold = true;
        break;
      case "em":
      case "i":
        newFormatting.italic = true;
        break;
      case "u":
        newFormatting.underline = true;
        break;
      case "s":
      case "del":
      case "strike":
        newFormatting.strikethrough = true;
        break;
      case "code":
        newFormatting.code = true;
        break;
      case "a": {
        const href = node.getAttribute("href") || "#";
        const linkChildren = [];
        for (const child of node.childNodes) {
          if (child.nodeType === Node.TEXT_NODE && child.textContent) {
            const linkChild = { type: "text", text: child.textContent };
            if (formatting.bold) linkChild.bold = true;
            if (formatting.italic) linkChild.italic = true;
            children.push({
              type: "link",
              url: href,
              children: [linkChild],
            });
          }
        }
        if (linkChildren.length === 0 && node.textContent) {
          children.push({
            type: "link",
            url: href,
            children: [{ type: "text", text: node.textContent }],
          });
        }
        return;
      }
      case "br":
        children.push({ type: "text", text: "\n" });
        return;
      case "span":
        // Ignore les spans décoratifs, garder le contenu
        break;
      default:
        break;
    }

    for (const child of node.childNodes) {
      walk(child, newFormatting);
    }
  }

  walk(element, {});

  // Fusionner les children adjacents avec le même formatage
  return mergeAdjacentChildren(children);
}

/**
 * Fusionne les children text adjacents qui ont le même formatage.
 */
function mergeAdjacentChildren(children) {
  if (children.length <= 1) return children;

  const merged = [children[0]];
  for (let i = 1; i < children.length; i++) {
    const prev = merged[merged.length - 1];
    const curr = children[i];

    if (
      prev.type === "text" &&
      curr.type === "text" &&
      !!prev.bold === !!curr.bold &&
      !!prev.italic === !!curr.italic &&
      !!prev.underline === !!curr.underline &&
      !!prev.strikethrough === !!curr.strikethrough &&
      !!prev.code === !!curr.code
    ) {
      prev.text += curr.text;
    } else {
      merged.push(curr);
    }
  }
  return merged;
}

/**
 * Fallback pour le parsing côté serveur (sans DOMParser).
 */
function parseHtmlFallback(html) {
  const blocks = [];

  // Remplacer les balises de bloc par des séparateurs
  const normalized = html
    .replace(/<\/?(div|p)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<h([1-6])[^>]*>(.*?)<\/h[1-6]>/gi, (_, level, content) => {
      blocks.push({
        type: "heading",
        level: parseInt(level, 10),
        children: [
          {
            type: "text",
            text: content.replace(/<[^>]+>/g, "").trim(),
          },
        ],
      });
      return "";
    });

  const lines = normalized.split(/\n+/);
  for (const line of lines) {
    const text = line.replace(/<[^>]+>/g, "").trim();
    if (text) {
      blocks.push({
        type: "paragraph",
        children: [{ type: "text", text }],
      });
    }
  }

  return blocks;
}

// ─── Strapi Blocks → HTML ─────────────────────────────────────

/**
 * Convertit un tableau de blocs Strapi en HTML pour l'éditeur TinyMCE.
 * Gère : paragraph, heading, list, quote, code, image + formatage inline.
 */
export function strapiBlocksToHtml(blocks) {
  if (!blocks || !Array.isArray(blocks)) return "";
  return blocks.map(blockToHtml).join("");
}

function blockToHtml(block) {
  const { type, children } = block;

  switch (type) {
    case "paragraph": {
      const inner = childrenToHtml(children);
      return `<p>${inner}</p>`;
    }

    case "heading": {
      const level = block.level || 2;
      const inner = childrenToHtml(children);
      return `<h${level}>${inner}</h${level}>`;
    }

    case "list": {
      const tag = block.format === "ordered" ? "ol" : "ul";
      const items = (children || [])
        .map((item) => `<li>${childrenToHtml(item.children)}</li>`)
        .join("");
      return `<${tag}>${items}</${tag}>`;
    }

    case "quote": {
      const inner = childrenToHtml(children);
      return `<blockquote>${inner}</blockquote>`;
    }

    case "code": {
      const text = children?.map((c) => c.text || "").join("") || "";
      return `<pre><code>${escapeHtml(text)}</code></pre>`;
    }

    case "image": {
      const url = block.image?.url || block.url || "";
      const alt =
        block.image?.alternativeText || block.alt || "Image";
      const width = block.image?.width || block.width || "";
      const height = block.image?.height || block.height || "";
      const dims = width && height ? ` width="${width}" height="${height}"` : "";
      return `<img src="${url}" alt="${escapeHtml(alt)}" loading="lazy"${dims} />`;
    }

    default: {
      if (children) {
        const inner = childrenToHtml(children);
        return `<p>${inner}</p>`;
      }
      return "";
    }
  }
}

function childrenToHtml(children) {
  if (!children || !Array.isArray(children)) return "";

  return children
    .map((child) => {
      if (child.type === "link") {
        const href = child.url || "#";
        const inner = childrenToHtml(child.children);
        return `<a href="${escapeHtml(href)}">${inner}</a>`;
      }

      if (child.type === "text" || !child.type) {
        let text = child.text || "";
        // Ne pas échapper si ça ressemble à du HTML brut déjà
        if (!/<(div|p|br|h[1-6])[\s>]/i.test(text)) {
          text = escapeHtml(text);
        }

        if (child.code) text = `<code>${text}</code>`;
        if (child.bold) text = `<strong>${text}</strong>`;
        if (child.italic) text = `<em>${text}</em>`;
        if (child.underline) text = `<u>${text}</u>`;
        if (child.strikethrough) text = `<s>${text}</s>`;

        return text;
      }

      return "";
    })
    .join("");
}

function escapeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ─── Utilitaires ──────────────────────────────────────────────

/**
 * Compte les mots d'un contenu HTML.
 */
export function countWords(html) {
  if (!html) return 0;
  const text = html.replace(/<[^>]+>/g, " ").trim();
  if (!text) return 0;
  return text.split(/\s+/).filter(Boolean).length;
}

/**
 * Compte les caractères d'un contenu HTML (hors balises).
 */
export function countChars(html) {
  if (!html) return 0;
  return html.replace(/<[^>]+>/g, "").length;
}
