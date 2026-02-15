"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

// ─── Reproduction de classifyLine pour la démo interactive ───
function classifyLine(text) {
  const trimmed = text.trim();
  if (!trimmed) return "empty";
  if (/^\[.+\]$/.test(trimmed)) return "game-badge";
  if (/^["«»\u201C\u201D\u00AB\u00BB]/.test(trimmed)) return "dialogue";
  if (/^[''\u2018\u2019]/.test(trimmed) && /[''\u2018\u2019]$/.test(trimmed)) return "thought";
  if (
    trimmed.length < 40 &&
    (/^([A-ZÀ-Úa-zà-ú][a-zà-ú]*[.!]\s*){2,}$/.test(trimmed) ||
      /^[A-ZÀ-ÚÉÈ\s!?~*─—]+$/.test(trimmed) ||
      (/!{1,}$/.test(trimmed) && trimmed.length < 25) ||
      /^\.{3,}$/.test(trimmed) ||
      /^─+\s*!?$/.test(trimmed))
  ) return "sfx";
  if (trimmed.length < 12 && /^[A-ZÀ-Úa-zà-ú]+[.!]+$/.test(trimmed)) return "sfx";
  if (trimmed.length < 15 && /^[.…!?─—]+$/.test(trimmed)) return "sfx";
  if (trimmed.length < 100 && /\?$/.test(trimmed) && !/^["«»\u201C\u201D]/.test(trimmed)) return "thought";
  return "narration";
}

const TYPE_CONFIG = {
  dialogue: {
    label: "Dialogue",
    color: "blue",
    dotClass: "bg-blue-400",
    textClass: "text-blue-300",
    bgClass: "bg-blue-950/30 border-blue-500/30",
    description: "Paroles prononcées par les personnages",
    rules: [
      "Commence par des guillemets français « » ou anglais \" \"",
      "Inclut aussi les guillemets typographiques \u201C \u201D",
      "Le contenu après les guillemets est libre",
    ],
    examples: [
      "« Je ne comprends pas ce que tu veux dire. »",
      "\"Attention, quelqu'un approche !\"",
      "« Très bien, allons-y. »",
    ],
    cssDescription: "Bordure gauche colorée + indentation + couleur douce",
  },
  thought: {
    label: "Pensées",
    color: "purple",
    dotClass: "bg-purple-400",
    textClass: "text-purple-300",
    bgClass: "bg-purple-950/30 border-purple-500/30",
    description: "Monologue intérieur et réflexions des personnages",
    rules: [
      "Texte entre apostrophes simples : 'comme ceci'",
      "Phrase courte (< 100 caractères) terminée par un ?",
      "Les questions ne doivent pas commencer par des guillemets",
    ],
    examples: [
      "'Je devrais peut-être partir d'ici...'",
      "Pourquoi est-ce que ça m'arrive ?",
      "Que faire maintenant ?",
    ],
    cssDescription: "Italique + opacité réduite + retrait léger",
  },
  sfx: {
    label: "Effets sonores",
    color: "amber",
    dotClass: "bg-amber-400",
    textClass: "text-amber-300",
    bgClass: "bg-amber-950/30 border-amber-500/30",
    description: "Onomatopées, bruits, interjections courtes",
    rules: [
      "Mots courts répétés avec ponctuation : Huff. Huff.",
      "Texte tout en majuscules court : BOOM!",
      "Interjections < 12 caractères : Tsk. Hmm. Ohh!",
      "Points de suspension seuls : ...",
      "Exclamations très courtes (< 25 chars) terminées par !",
    ],
    examples: [
      "Boom!",
      "Huff. Huff.",
      "CRASH!",
      "Tsk.",
      "...",
    ],
    cssDescription: "Centré + gras + espacement de lettres + léger halo",
  },
  "game-badge": {
    label: "Système / Badge",
    color: "cyan",
    dotClass: "bg-cyan-400",
    textClass: "text-cyan-300",
    bgClass: "bg-cyan-950/30 border-cyan-500/30",
    description: "Notifications système, alertes, interfaces de jeu",
    rules: [
      "Le texte doit être entièrement entre crochets [ ]",
      "Le contenu entre crochets est libre",
      "Idéal pour les isekai / LitRPG avec fenêtres de statuts",
    ],
    examples: [
      "[Compétence acquise : Vision nocturne]",
      "[Alerte : Intrus détecté]",
      "[Niveau augmenté !]",
    ],
    cssDescription: "Police monospace + centré + point lumineux + espacement",
  },
  narration: {
    label: "Narration",
    color: "gray",
    dotClass: "bg-gray-400",
    textClass: "text-gray-300",
    bgClass: "bg-gray-800/50 border-gray-600/30",
    description: "Prose narrative, descriptions, tout le reste",
    rules: [
      "Tout texte qui ne correspond à aucun autre type",
      "C'est le style par défaut appliqué",
      "Aucun formatage spécial requis",
    ],
    examples: [
      "Le soleil se couchait lentement derrière les montagnes, teintant le ciel de nuances orangées.",
      "Il traversa la salle sans un regard pour les gardes postés de chaque côté de la porte.",
    ],
    cssDescription: "Texte justifié + interligne généreux + couleur neutre",
  },
};

// ─── Bloc de démo visuel ───
function DemoBlock({ text, type }) {
  const styleMap = {
    dialogue: "pl-5 border-l-2 border-indigo-400/30 text-indigo-200 ml-2",
    thought: "italic opacity-90 pl-4 text-gray-400",
    sfx: "text-center font-bold tracking-wider text-white text-lg",
    "game-badge": "text-center font-mono font-semibold text-indigo-300 tracking-wide",
    narration: "text-gray-200 text-justify",
  };

  return (
    <div className={`py-2 px-3 rounded-lg bg-gray-900/60 ${styleMap[type] || ""}`}>
      {type === "game-badge" && (
        <span className="inline-block w-1.5 h-1.5 bg-indigo-400 rounded-full mr-2 shadow-[0_0_8px_rgba(129,140,248,0.5)]" />
      )}
      {text}
    </div>
  );
}

export default function DocumentationEditeur() {
  const [testText, setTestText] = useState("");
  const [activeTab, setActiveTab] = useState("types");

  // Classification en temps réel
  const classifiedLines = useMemo(() => {
    if (!testText.trim()) return [];
    return testText.split("\n").map((line) => ({
      text: line,
      type: classifyLine(line),
    }));
  }, [testText]);

  const defaultTestText = `Le vent soufflait doucement à travers les arbres.
« Tu es prêt ? » demanda-t-elle en serrant son épée.
'Je ne suis pas sûr de pouvoir y arriver...'
Boom!
[Compétence débloquée : Frappe éclair Niv. 3]
Pourquoi moi ?
Huff. Huff.
Il se releva péniblement, la poussière collant à ses vêtements.
"Ne baisse pas les bras !" cria son compagnon.
...
[Alerte : HP critique — 12/350]`;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="bg-gradient-to-b from-indigo-950/40 to-gray-950 border-b border-gray-800/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-24 pb-12">
          <Link
            href="/oeuvres"
            className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-gray-300 transition-colors mb-6"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Retour au catalogue
          </Link>

          <div className="flex items-start gap-4 mb-4">
            <div className="p-3 bg-indigo-600/20 rounded-2xl border border-indigo-500/20">
              <svg className="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold mb-2">
                Classification intelligente du texte
              </h1>
              <p className="text-gray-400 text-lg max-w-2xl">
                Le lecteur Trad-Index analyse automatiquement chaque ligne de votre texte pour lui appliquer 
                un style visuel adapté. Écrivez naturellement — le système fait le reste.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation par onglets */}
      <div className="sticky top-0 z-30 bg-gray-950/95 backdrop-blur-md border-b border-gray-800/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="flex gap-1 overflow-x-auto no-scrollbar">
            {[
              { key: "types", label: "Types de contenu", icon: "M4 6h16M4 10h16M4 14h16M4 18h16" },
              { key: "test", label: "Zone de test", icon: "M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" },
              { key: "html", label: "Import HTML", icon: "M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" },
              { key: "faq", label: "FAQ", icon: "M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
              { key: "perso", label: "Personnalisation", icon: "M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" },
            ].map(({ key, label, icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                  activeTab === key
                    ? "border-indigo-500 text-indigo-300"
                    : "border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-700"
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={icon} />
                </svg>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">

        {/* ═══════ ONGLET : Types de contenu ═══════ */}
        {activeTab === "types" && (
          <div className="space-y-8">
            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
              <h2 className="text-xl font-bold mb-3">Comment ça fonctionne</h2>
              <p className="text-gray-400 leading-relaxed mb-4">
                Chaque paragraphe de votre texte est analysé individuellement. Le système examine les premiers 
                caractères, la longueur, la ponctuation et certains patterns pour déterminer le <strong className="text-white">type de contenu</strong>. 
                Un style CSS unique est ensuite appliqué automatiquement lors de la lecture.
              </p>
              <div className="flex flex-wrap gap-3">
                {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
                  <span key={key} className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${cfg.bgClass}`}>
                    <span className={`w-2 h-2 rounded-full ${cfg.dotClass}`} />
                    <span className={`text-sm font-medium ${cfg.textClass}`}>{cfg.label}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Détail de chaque type */}
            {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
              <div key={key} className={`rounded-2xl border overflow-hidden ${cfg.bgClass}`}>
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <span className={`w-3 h-3 rounded-full ${cfg.dotClass}`} />
                    <h3 className={`text-xl font-bold ${cfg.textClass}`}>{cfg.label}</h3>
                    <span className="text-xs text-gray-400 bg-gray-800/80 px-2 py-0.5 rounded-full font-mono">
                      .{key}
                    </span>
                  </div>
                  <p className="text-gray-400 mb-4">{cfg.description}</p>

                  {/* Règles de détection */}
                  <div className="mb-5">
                    <h4 className="text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                      Règles de détection
                    </h4>
                    <ul className="space-y-1.5">
                      {cfg.rules.map((rule, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-400">
                          <span className="text-gray-600 mt-0.5">•</span>
                          {rule}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Exemples visuels */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      Rendu dans le lecteur
                    </h4>
                    <div className="space-y-2">
                      {cfg.examples.map((ex, i) => (
                        <DemoBlock key={i} text={ex} type={key} />
                      ))}
                    </div>
                    <p className="text-xs text-gray-600 mt-2 italic">CSS : {cfg.cssDescription}</p>
                  </div>
                </div>
              </div>
            ))}

            {/* Ordre de priorité */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Ordre de priorité de détection
              </h3>
              <p className="text-gray-400 text-sm mb-4">
                Si un texte pourrait correspondre à plusieurs types, le premier qui match est appliqué :
              </p>
              <ol className="space-y-2">
                {[
                  { num: 1, type: "game-badge", desc: "Crochets [...]" },
                  { num: 2, type: "dialogue", desc: "Guillemets en début" },
                  { num: 3, type: "thought", desc: "Apostrophes encadrantes" },
                  { num: 4, type: "sfx", desc: "Onomatopées / exclamations courtes" },
                  { num: 5, type: "thought", desc: "Questions courtes (< 100 chars)" },
                  { num: 6, type: "narration", desc: "Tout le reste (défaut)" },
                ].map(({ num, type, desc }) => (
                  <li key={num} className="flex items-center gap-3 p-2 rounded-lg bg-gray-800/30">
                    <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-gray-800 flex items-center justify-center text-sm font-bold text-gray-400">
                      {num}
                    </span>
                    <span className={`w-2 h-2 rounded-full ${TYPE_CONFIG[type].dotClass}`} />
                    <span className={`text-sm font-medium ${TYPE_CONFIG[type].textClass}`}>
                      {TYPE_CONFIG[type].label}
                    </span>
                    <span className="text-xs text-gray-400">— {desc}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}

        {/* ═══════ ONGLET : Zone de test interactive ═══════ */}
        {activeTab === "test" && (
          <div className="space-y-6">
            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
              <h2 className="text-xl font-bold mb-2">Zone de test interactive</h2>
              <p className="text-gray-400 text-sm mb-4">
                Tapez ou collez du texte ci-dessous pour voir comment le système le classifie en temps réel.
                Chaque ligne est analysée indépendamment.
              </p>
              <button
                onClick={() => setTestText(defaultTestText)}
                className="text-sm px-3 py-1.5 bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 rounded-lg hover:bg-indigo-600/30 transition-colors"
              >
                Charger un exemple complet
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Entrée */}
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  Votre texte (une ligne = un paragraphe)
                </label>
                <textarea
                  value={testText}
                  onChange={(e) => setTestText(e.target.value)}
                  rows={16}
                  className="w-full p-4 rounded-xl bg-gray-900 border border-gray-700 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all font-mono text-sm resize-none"
                  placeholder={"Tapez votre texte ici...\n\nExemples :\n« Bonjour ! »\n'Que faire ?'\nBoom!\n[Notification]\nDu texte narratif normal."}
                />
              </div>

              {/* Résultat classifié */}
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  Classification en temps réel
                </label>
                <div className="p-4 rounded-xl bg-gray-900 border border-gray-700 min-h-[384px]">
                  {classifiedLines.length === 0 ? (
                    <p className="text-gray-600 italic text-sm">
                      Le résultat apparaîtra ici...
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {classifiedLines.map((line, i) => {
                        if (line.type === "empty") return <div key={i} className="h-3" />;
                        const cfg = TYPE_CONFIG[line.type];
                        return (
                          <div key={i} className="flex items-start gap-3">
                            <div className="flex-shrink-0 mt-1">
                              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg?.bgClass || "bg-gray-800/50 border-gray-600/30"}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${cfg?.dotClass || "bg-gray-400"}`} />
                                <span className={cfg?.textClass || "text-gray-300"}>{cfg?.label || line.type}</span>
                              </span>
                            </div>
                            <div className="flex-1">
                              <DemoBlock text={line.text} type={line.type} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════ ONGLET : Import HTML ═══════ */}
        {activeTab === "html" && (
          <div className="space-y-6">
            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
              <h2 className="text-xl font-bold mb-3">Import de contenu HTML</h2>
              <p className="text-gray-400 leading-relaxed">
                Vous pouvez coller du HTML brut dans l&apos;éditeur. Le système le détecte automatiquement 
                et le convertit en blocs classifiés.
              </p>
            </div>

            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 space-y-4">
              <h3 className="text-lg font-semibold">Comment ça marche</h3>
              <ol className="space-y-4">
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-indigo-600/30 text-indigo-300 flex items-center justify-center text-sm font-bold">1</span>
                  <div>
                    <p className="font-medium text-white">Détection automatique</p>
                    <p className="text-sm text-gray-400">
                      Si un bloc de texte contient des balises HTML comme <code className="text-indigo-300">&lt;div&gt;</code>, <code className="text-indigo-300">&lt;p&gt;</code> ou <code className="text-indigo-300">&lt;br&gt;</code>, 
                      il est traité comme du HTML brut.
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-indigo-600/30 text-indigo-300 flex items-center justify-center text-sm font-bold">2</span>
                  <div>
                    <p className="font-medium text-white">Extraction du texte</p>
                    <p className="text-sm text-gray-400">
                      Les balises HTML sont supprimées. Les <code className="text-indigo-300">&lt;div&gt;</code>, <code className="text-indigo-300">&lt;p&gt;</code> et <code className="text-indigo-300">&lt;br&gt;</code> sont 
                      convertis en sauts de ligne pour séparer les paragraphes.
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-indigo-600/30 text-indigo-300 flex items-center justify-center text-sm font-bold">3</span>
                  <div>
                    <p className="font-medium text-white">Classification intelligente</p>
                    <p className="text-sm text-gray-400">
                      Chaque paragraphe extrait passe par le même système <code className="text-indigo-300">classifyLine()</code> 
                      pour obtenir son type et son style.
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-indigo-600/30 text-indigo-300 flex items-center justify-center text-sm font-bold">4</span>
                  <div>
                    <p className="font-medium text-white">Séparateurs de scène</p>
                    <p className="text-sm text-gray-400">
                      2+ lignes vides consécutives dans le HTML génèrent un <strong className="text-white">séparateur de scène</strong> visuel (✦). 
                      Une seule ligne vide crée un espacement simple.
                    </p>
                  </div>
                </li>
              </ol>
            </div>

            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
              <h3 className="text-lg font-semibold mb-3">Exemple de HTML supporté</h3>
              <pre className="bg-gray-950 rounded-xl p-4 overflow-x-auto text-sm font-mono text-gray-300 border border-gray-800">
{`<p>Le soleil se levait sur la vallée.</p>
<p>« Dépêchons-nous ! » cria le capitaine.</p>
<p>'Cet endroit me donne la chair de poule...'</p>
<br><br><br>
<div>BOOM!</div>
<p>[Compétence activée : Bouclier magique]</p>`}
              </pre>
              <p className="text-xs text-gray-400 mt-3 italic">
                Ce HTML sera parsé en 6 blocs : narration, dialogue, pensée, séparateur de scène, sfx et game-badge.
              </p>
            </div>

            <div className="bg-amber-950/30 border border-amber-500/30 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-amber-300 mb-2 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                Bonnes pratiques
              </h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 mt-0.5">•</span>
                  Privilégiez un paragraphe par idée ou réplique pour une meilleure classification
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 mt-0.5">•</span>
                  Utilisez des <code className="text-amber-300">&lt;br&gt;</code> ou <code className="text-amber-300">&lt;p&gt;</code> pour séparer les lignes — pas des espaces
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 mt-0.5">•</span>
                  Les styles inline CSS sont ignorés lors du parsing — seul le texte brut est conservé
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* ═══════ ONGLET : FAQ ═══════ */}
        {activeTab === "faq" && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold mb-4">Questions fréquentes</h2>
            {[
              {
                q: "Est-ce que la classification modifie mon texte original ?",
                a: "Non. Le texte stocké dans Strapi reste intact. La classification est appliquée uniquement à l'affichage, au moment de la lecture. Votre texte original n'est jamais modifié.",
              },
              {
                q: "Pourquoi ma ligne est détectée comme le mauvais type ?",
                a: "Le système utilise des règles basées sur les patterns de ponctuation et la longueur. Si une ligne de narration se termine par '?' et fait moins de 100 caractères, elle sera classée comme 'pensée'. Ajustez la ponctuation ou reformulez si nécessaire.",
              },
              {
                q: "Comment forcer un type spécifique ?",
                a: "Utilisez les conventions de formatage correspondantes. Pour un dialogue, commencez par des guillemets. Pour un badge système, entourez le texte de crochets [comme ceci]. Le système ne supporte pas encore les annotations manuelles de type.",
              },
              {
                q: "Les images et liens sont-ils supportés ?",
                a: "Oui. Les images (bloc image Strapi) sont rendues en pleine largeur avec légende optionnelle. Les liens sont cliquables et s'ouvrent dans un nouvel onglet.",
              },
              {
                q: "Comment les sauts de ligne sont-ils gérés ?",
                a: "Les paragraphes vides consécutifs sont réduits à un seul espacement. Deux ou plus lignes vides dans du HTML brut créent un séparateur de scène visuel (✦).",
              },
              {
                q: "Je colle du HTML et rien ne s'affiche correctement ?",
                a: "Assurez-vous que le HTML contient des balises structurelles (<p>, <div>, <br>). Le texte brut sans balises est traité comme un seul bloc de narration.",
              },
              {
                q: "Puis-je désactiver la classification ?",
                a: "Oui ! Dans les paramètres de lecture du lecteur de chapitre, vous pouvez activer/désactiver la classification. Le texte sera alors affiché de manière uniforme.",
              },
              {
                q: "Les paramètres de lecture sont-ils sauvegardés ?",
                a: "Oui, tous les paramètres (taille, police, interligne, couleurs, classification) sont sauvegardés dans le navigateur (localStorage) et restaurés automatiquement à chaque visite.",
              },
            ].map(({ q, a }, i) => (
              <details key={i} className="group bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
                <summary className="flex items-center gap-3 px-5 py-4 cursor-pointer select-none hover:bg-gray-800/50 transition-colors">
                  <svg className="w-5 h-5 text-indigo-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-white font-medium text-sm">{q}</span>
                  <svg className="w-4 h-4 text-gray-400 ml-auto transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="px-5 pb-4 text-sm text-gray-400 border-t border-gray-800 pt-3">
                  {a}
                </div>
              </details>
            ))}
          </div>
        )}

        {/* ═══════ ONGLET : Personnalisation ═══════ */}
        {activeTab === "perso" && (
          <div className="space-y-6">
            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
              <h2 className="text-xl font-bold mb-3">Personnalisation du lecteur</h2>
              <p className="text-gray-400 leading-relaxed">
                Le lecteur de chapitres dispose de paramètres avancés pour adapter l&apos;expérience de lecture 
                à vos préférences. Tous les réglages sont sauvegardés automatiquement dans votre navigateur.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                {
                  icon: "M4 6h16M4 12h16M4 18h7",
                  title: "Interligne",
                  desc: "Ajustez l'espacement entre les lignes (1.4 à 2.4) pour un confort de lecture optimal.",
                  detail: "Les textes denses bénéficient d'un interligne plus généreux. La valeur par défaut est 1.8.",
                },
                {
                  icon: "M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01",
                  title: "Couleurs de classification",
                  desc: "Personnalisez la couleur de chaque type : dialogue, pensées, SFX, badges système.",
                  detail: "Chaque type a sa propre couleur de texte que vous pouvez modifier via un sélecteur de couleur.",
                },
                {
                  icon: "M15 12a3 3 0 11-6 0 3 3 0 016 0z",
                  title: "Activer/Désactiver la classification",
                  desc: "Basculez entre le rendu classifié et un affichage uniforme du texte.",
                  detail: "Utile si vous préférez un rendu sobre sans distinction visuelle entre dialogues, pensées, etc.",
                },
                {
                  icon: "M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z",
                  title: "Style des dialogues",
                  desc: "Choisissez le rendu des dialogues : bordure gauche, italique ou surligné.",
                  detail: "Le style 'bordure gauche' (défaut) offre une séparation visuelle claire avec le texte narratif.",
                },
                {
                  icon: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z",
                  title: "Style des pensées",
                  desc: "Choisissez comment sont rendues les pensées : italique, atténué ou bordure.",
                  detail: "L'italique (défaut) est la convention la plus courante pour les pensées intérieures.",
                },
              ].map(({ icon, title, desc, detail }, i) => (
                <div key={i} className="bg-gray-900/50 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-colors">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="p-2 bg-indigo-600/15 rounded-lg">
                      <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={icon} />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{title}</h3>
                      <p className="text-sm text-gray-400 mt-1">{desc}</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 pl-11">{detail}</p>
                </div>
              ))}
            </div>

            <div className="bg-indigo-950/30 border border-indigo-500/30 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-indigo-300 mb-2 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Accès aux paramètres
              </h3>
              <p className="text-gray-400 text-sm">
                Les paramètres de personnalisation sont accessibles depuis l&apos;icône 
                <span className="inline-flex items-center mx-1 px-1.5 py-0.5 bg-gray-800 rounded text-xs text-gray-300 border border-gray-700">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                </span>
                dans la barre de navigation du lecteur de chapitre. Vous pouvez aussi y accéder via le lien 
                <strong className="text-indigo-300"> Personnalisation</strong> dans la navbar principale.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 border-t border-gray-800/50">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-400">
          <p>Documentation Trad-Index — Système de classification intelligente</p>
          <div className="flex items-center gap-4">
            <Link href="/oeuvres" className="hover:text-white transition-colors">Catalogue</Link>
            <Link href="/" className="hover:text-white transition-colors">Accueil</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
