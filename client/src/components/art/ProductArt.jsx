import { useState } from "react";
import { assetUrl } from "../../lib/api";

/*
 * Flat furniture drawings used when a product has no photo.
 * The drawing is picked from words in the product name, the backdrop from its room (category).
 */

const ROOM_BG = {
  "living room": "var(--color-room-living)",
  bedroom: "var(--color-room-bedroom)",
  "dining & kitchen": "var(--color-room-dining)",
  workspace: "var(--color-room-work)",
  "kids & baby": "var(--color-room-kids)",
  lighting: "var(--color-room-light)",
  bathroom: "var(--color-room-bath)",
  outdoor: "var(--color-room-outdoor)",
};
const FALLBACK_BG = ["var(--color-room-living)", "var(--color-room-bedroom)", "var(--color-room-dining)", "var(--color-room-work)"];

const FABRICS = ["#7d8f6a", "#c4a37f", "#5f7486", "#a8664a", "#d6c6a5", "#7f6a8e", "#4f6b5a", "#8a9aa6"];
const WOOD = "#b98455";
const WOOD_DARK = "#8c5a35";
const METAL = "#2f3530";
const LIGHT = "#f6f1e4";

function hash(text = "") {
  let h = 0;
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

// Order matters: more specific words first.
const KINDS = [
  ["hanging chair", "hanging"],
  ["rocking", "rocker"],
  ["armchair", "armchair"],
  ["sofa", "sofa"],
  ["lounger", "lounger"],
  ["dining set", "diningSet"],
  ["dining table", "diningTable"],
  ["coffee table", "coffeeTable"],
  ["side table", "sideTable"],
  ["kids desk", "kidsDesk"],
  ["standing desk", "desk"],
  ["desk", "desk"],
  ["office chair", "officeChair"],
  ["chair", "chair"],
  ["stool", "stool"],
  ["garden bench", "gardenBench"],
  ["bench", "bench"],
  ["crib", "crib"],
  ["bed", "bed"],
  ["wardrobe", "wardrobe"],
  ["nightstand", "nightstand"],
  ["dresser", "dresser"],
  ["filing cabinet", "dresser"],
  ["sideboard", "sideboard"],
  ["media cabinet", "sideboard"],
  ["bathroom cabinet", "wallCabinet"],
  ["bookcase", "bookcase"],
  ["toy storage", "toyShelf"],
  ["wall shelf", "wallShelf"],
  ["floor lamp", "floorLamp"],
  ["pendant", "pendant"],
  ["table lamp", "tableLamp"],
  ["sconce", "sconce"],
  ["round mirror", "roundMirror"],
  ["mirror", "mirror"],
  ["rug", "rug"],
  ["trolley", "trolley"],
  ["planter", "planter"],
  ["towel ladder", "ladder"],
];

export function artKind(name = "") {
  const lower = name.toLowerCase();
  return KINDS.find(([word]) => lower.includes(word))?.[1] || "sideboard";
}

const shadow = (rx = 62) => <ellipse cx="100" cy="131" rx={rx} ry="5" fill="#000" opacity="0.08" />;

// Each drawing gets the fabric colour `f` and returns SVG shapes in a 200 x 150 box.
const DRAW = {
  sofa: (f) => (
    <>
      {shadow(70)}
      <rect x="40" y="62" width="120" height="34" rx="10" fill={f} />
      <rect x="30" y="80" width="140" height="34" rx="9" fill={f} />
      <rect x="44" y="84" width="54" height="16" rx="6" fill="#fff" opacity="0.18" />
      <rect x="102" y="84" width="54" height="16" rx="6" fill="#fff" opacity="0.18" />
      <rect x="22" y="72" width="20" height="44" rx="9" fill={f} />
      <rect x="158" y="72" width="20" height="44" rx="9" fill={f} />
      <rect x="22" y="72" width="20" height="44" rx="9" fill="#000" opacity="0.08" />
      <rect x="158" y="72" width="20" height="44" rx="9" fill="#000" opacity="0.08" />
      <rect x="34" y="114" width="5" height="16" rx="2" fill={WOOD_DARK} />
      <rect x="161" y="114" width="5" height="16" rx="2" fill={WOOD_DARK} />
    </>
  ),
  armchair: (f) => (
    <>
      {shadow(40)}
      <path d="M62 112 Q60 52 100 50 Q140 52 138 112 Z" fill={WOOD} />
      <path d="M70 108 Q70 62 100 60 Q130 62 130 108 Z" fill={WOOD_DARK} opacity="0.25" />
      <rect x="66" y="94" width="68" height="18" rx="8" fill={f} />
      <rect x="66" y="112" width="5" height="18" rx="2" fill={WOOD_DARK} />
      <rect x="129" y="112" width="5" height="18" rx="2" fill={WOOD_DARK} />
    </>
  ),
  hanging: (f) => (
    <>
      {shadow(30)}
      <path d="M150 128 L150 20 Q150 12 142 12 L100 12" fill="none" stroke={METAL} strokeWidth="4" strokeLinecap="round" />
      <rect x="132" y="126" width="36" height="4" rx="2" fill={METAL} />
      <line x1="100" y1="12" x2="100" y2="30" stroke={METAL} strokeWidth="2" />
      <ellipse cx="100" cy="72" rx="30" ry="42" fill={WOOD} />
      <ellipse cx="100" cy="80" rx="22" ry="30" fill={WOOD_DARK} opacity="0.35" />
      <rect x="80" y="88" width="40" height="16" rx="8" fill={f} />
    </>
  ),
  rocker: (f) => (
    <>
      {shadow(42)}
      <path d="M58 122 Q100 138 142 122" fill="none" stroke={WOOD_DARK} strokeWidth="5" strokeLinecap="round" />
      <rect x="72" y="50" width="8" height="70" rx="3" fill={WOOD} transform="rotate(-8 76 85)" />
      <rect x="70" y="92" width="62" height="10" rx="4" fill={WOOD} />
      <rect x="74" y="56" width="10" height="38" rx="4" fill={f} transform="rotate(-8 79 75)" />
      <rect x="76" y="86" width="50" height="8" rx="4" fill={f} />
      <rect x="120" y="100" width="6" height="24" rx="2" fill={WOOD} />
      <rect x="76" y="100" width="6" height="24" rx="2" fill={WOOD} />
    </>
  ),
  lounger: (f) => (
    <>
      {shadow(72)}
      <path d="M30 102 L130 102 L160 62" fill="none" stroke={WOOD_DARK} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M34 96 L128 96 L156 58" fill="none" stroke={f} strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="36" y="104" width="6" height="24" rx="2" fill={WOOD_DARK} />
      <rect x="120" y="104" width="6" height="24" rx="2" fill={WOOD_DARK} />
      <circle cx="39" cy="126" r="5" fill={METAL} />
    </>
  ),
  chair: (f) => (
    <>
      {shadow(32)}
      <rect x="78" y="42" width="8" height="88" rx="3" fill={WOOD} />
      <path d="M80 46 Q100 40 120 46 L120 66 Q100 62 80 66 Z" fill={WOOD_DARK} />
      <rect x="76" y="88" width="52" height="10" rx="4" fill={f} />
      <rect x="120" y="92" width="7" height="38" rx="3" fill={WOOD} />
      <rect x="86" y="96" width="5" height="34" rx="2" fill={WOOD_DARK} opacity="0.6" />
    </>
  ),
  officeChair: (f) => (
    <>
      {shadow(36)}
      <rect x="78" y="34" width="44" height="52" rx="14" fill={METAL} />
      <rect x="84" y="40" width="32" height="40" rx="10" fill={f} opacity="0.85" />
      <rect x="72" y="86" width="56" height="14" rx="7" fill={METAL} />
      <rect x="97" y="100" width="6" height="18" fill={METAL} />
      <path d="M70 126 L100 116 L130 126" fill="none" stroke={METAL} strokeWidth="5" strokeLinecap="round" />
      <circle cx="70" cy="127" r="4" fill={METAL} />
      <circle cx="130" cy="127" r="4" fill={METAL} />
      <circle cx="100" cy="128" r="4" fill={METAL} />
    </>
  ),
  stool: (f) => (
    <>
      {shadow(26)}
      <ellipse cx="100" cy="52" rx="24" ry="7" fill={f} />
      <path d="M84 56 L76 128 M116 56 L124 128 M96 58 L94 128 M104 58 L106 128" stroke={WOOD} strokeWidth="5" strokeLinecap="round" />
      <ellipse cx="100" cy="100" rx="20" ry="4" fill="none" stroke={WOOD_DARK} strokeWidth="3" />
    </>
  ),
  bench: (f) => (
    <>
      {shadow(66)}
      <rect x="36" y="84" width="128" height="16" rx="6" fill={f} />
      <rect x="36" y="96" width="128" height="6" rx="3" fill={WOOD_DARK} />
      <rect x="44" y="102" width="7" height="28" rx="2" fill={WOOD} />
      <rect x="149" y="102" width="7" height="28" rx="2" fill={WOOD} />
    </>
  ),
  gardenBench: () => (
    <>
      {shadow(66)}
      {[0, 1, 2].map((i) => (
        <rect key={i} x="44" y={46 + i * 12} width="112" height="8" rx="3" fill={WOOD} />
      ))}
      <rect x="36" y="88" width="128" height="10" rx="4" fill={WOOD} />
      <rect x="40" y="40" width="8" height="90" rx="3" fill={WOOD_DARK} />
      <rect x="152" y="40" width="8" height="90" rx="3" fill={WOOD_DARK} />
      <rect x="34" y="74" width="20" height="6" rx="3" fill={WOOD_DARK} />
      <rect x="146" y="74" width="20" height="6" rx="3" fill={WOOD_DARK} />
    </>
  ),
  kidsDesk: (f) => (
    <>
      {shadow(60)}
      <rect x="40" y="78" width="80" height="9" rx="4" fill={f} />
      <rect x="46" y="87" width="7" height="43" rx="3" fill={WOOD} />
      <rect x="107" y="87" width="7" height="43" rx="3" fill={WOOD} />
      <rect x="128" y="66" width="7" height="64" rx="3" fill={WOOD} />
      <rect x="128" y="96" width="34" height="8" rx="3" fill={f} />
      <rect x="156" y="100" width="6" height="30" rx="3" fill={WOOD} />
      <circle cx="62" cy="70" r="7" fill={FABRICS[3]} />
      <rect x="76" y="64" width="16" height="14" rx="2" fill={FABRICS[2]} />
    </>
  ),
  coffeeTable: () => (
    <>
      {shadow(64)}
      <ellipse cx="100" cy="86" rx="62" ry="12" fill={WOOD} />
      <ellipse cx="100" cy="84" rx="62" ry="12" fill={WOOD} />
      <ellipse cx="100" cy="82" rx="56" ry="9" fill="#fff" opacity="0.12" />
      <rect x="56" y="92" width="8" height="38" rx="3" fill={WOOD_DARK} />
      <rect x="136" y="92" width="8" height="38" rx="3" fill={WOOD_DARK} />
      <ellipse cx="100" cy="112" rx="40" ry="5" fill={WOOD_DARK} opacity="0.6" />
    </>
  ),
  sideTable: () => (
    <>
      {shadow(30)}
      <ellipse cx="100" cy="64" rx="30" ry="7" fill={WOOD} />
      <rect x="97" y="68" width="6" height="58" fill={METAL} />
      <ellipse cx="100" cy="128" rx="20" ry="4" fill={METAL} />
    </>
  ),
  diningTable: () => (
    <>
      {shadow(74)}
      <rect x="26" y="70" width="148" height="12" rx="4" fill={WOOD} />
      <rect x="34" y="82" width="9" height="48" rx="3" fill={WOOD_DARK} />
      <rect x="157" y="82" width="9" height="48" rx="3" fill={WOOD_DARK} />
    </>
  ),
  diningSet: (f) => (
    <>
      {shadow(78)}
      <rect x="50" y="76" width="100" height="10" rx="4" fill={METAL} />
      <rect x="96" y="86" width="8" height="42" fill={METAL} />
      <rect x="20" y="58" width="6" height="72" rx="2" fill={METAL} />
      <rect x="20" y="92" width="34" height="8" rx="3" fill={f} />
      <rect x="48" y="96" width="5" height="34" rx="2" fill={METAL} />
      <rect x="174" y="58" width="6" height="72" rx="2" fill={METAL} />
      <rect x="146" y="92" width="34" height="8" rx="3" fill={f} />
      <rect x="147" y="96" width="5" height="34" rx="2" fill={METAL} />
    </>
  ),
  desk: (f) => (
    <>
      {shadow(68)}
      <rect x="30" y="62" width="140" height="10" rx="3" fill={WOOD} />
      <rect x="38" y="72" width="8" height="58" fill={METAL} />
      <rect x="154" y="72" width="8" height="58" fill={METAL} />
      <rect x="112" y="72" width="40" height="18" rx="2" fill={WOOD_DARK} />
      <rect x="128" y="80" width="10" height="3" rx="1.5" fill={LIGHT} />
      <rect x="62" y="40" width="30" height="20" rx="2" fill={METAL} />
      <rect x="65" y="43" width="24" height="14" rx="1" fill={f} />
      <rect x="75" y="58" width="4" height="4" fill={METAL} />
    </>
  ),
  bed: (f) => (
    <>
      {shadow(78)}
      <rect x="26" y="44" width="18" height="86" rx="4" fill={WOOD_DARK} />
      <rect x="32" y="82" width="142" height="22" rx="4" fill={WOOD} />
      <rect x="40" y="70" width="130" height="16" rx="6" fill={LIGHT} />
      <rect x="46" y="62" width="30" height="12" rx="6" fill="#fff" />
      <rect x="96" y="70" width="74" height="18" rx="6" fill={f} />
      <rect x="160" y="104" width="8" height="26" rx="2" fill={WOOD_DARK} />
      <rect x="36" y="104" width="8" height="26" rx="2" fill={WOOD_DARK} />
    </>
  ),
  crib: (f) => (
    <>
      {shadow(60)}
      <rect x="40" y="56" width="120" height="8" rx="3" fill={WOOD} />
      <rect x="40" y="100" width="120" height="10" rx="3" fill={WOOD} />
      {Array.from({ length: 11 }, (_, i) => (
        <rect key={i} x={46 + i * 10.5} y="62" width="4" height="40" rx="2" fill={WOOD} />
      ))}
      <rect x="36" y="48" width="9" height="82" rx="3" fill={WOOD_DARK} />
      <rect x="155" y="48" width="9" height="82" rx="3" fill={WOOD_DARK} />
      <rect x="48" y="92" width="104" height="8" rx="3" fill={f} opacity="0.8" />
    </>
  ),
  wardrobe: () => (
    <>
      {shadow(56)}
      <rect x="44" y="18" width="112" height="108" rx="4" fill={WOOD} />
      <line x1="81" y1="22" x2="81" y2="122" stroke={WOOD_DARK} strokeWidth="2" />
      <line x1="119" y1="22" x2="119" y2="122" stroke={WOOD_DARK} strokeWidth="2" />
      <rect x="74" y="64" width="3" height="16" rx="1.5" fill={METAL} />
      <rect x="85" y="64" width="3" height="16" rx="1.5" fill={METAL} />
      <rect x="123" y="64" width="3" height="16" rx="1.5" fill={METAL} />
      <rect x="50" y="126" width="6" height="5" fill={WOOD_DARK} />
      <rect x="144" y="126" width="6" height="5" fill={WOOD_DARK} />
    </>
  ),
  dresser: () => (
    <>
      {shadow(58)}
      <rect x="44" y="42" width="112" height="82" rx="4" fill={WOOD} />
      {[0, 1, 2].map((r) =>
        [0, 1].map((c) => (
          <g key={`${r}${c}`}>
            <rect x={50 + c * 52} y={48 + r * 25} width="48" height="21" rx="2" fill={WOOD_DARK} opacity="0.18" />
            <rect x={68 + c * 52} y={57 + r * 25} width="12" height="3" rx="1.5" fill={METAL} />
          </g>
        ))
      )}
      <rect x="50" y="124" width="6" height="7" fill={WOOD_DARK} />
      <rect x="144" y="124" width="6" height="7" fill={WOOD_DARK} />
    </>
  ),
  nightstand: () => (
    <>
      {shadow(30)}
      <rect x="72" y="66" width="56" height="54" rx="4" fill={WOOD} />
      <rect x="78" y="72" width="44" height="18" rx="2" fill={WOOD_DARK} opacity="0.2" />
      <rect x="94" y="79" width="12" height="3" rx="1.5" fill={METAL} />
      <rect x="78" y="96" width="44" height="18" rx="2" fill={WOOD_DARK} opacity="0.35" />
      <rect x="76" y="120" width="5" height="10" fill={WOOD_DARK} />
      <rect x="119" y="120" width="5" height="10" fill={WOOD_DARK} />
      <rect x="90" y="46" width="20" height="20" rx="3" fill={LIGHT} />
      <rect x="98" y="58" width="4" height="8" fill={METAL} />
    </>
  ),
  sideboard: () => (
    <>
      {shadow(72)}
      <rect x="26" y="62" width="148" height="56" rx="4" fill={WOOD} />
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={31 + i * 36} y="67" width="32" height="46" rx="2" fill={WOOD_DARK} opacity={i % 2 ? 0.28 : 0.16} />
      ))}
      <rect x="34" y="118" width="6" height="12" rx="2" fill={METAL} />
      <rect x="160" y="118" width="6" height="12" rx="2" fill={METAL} />
    </>
  ),
  wallCabinet: () => (
    <>
      <rect x="62" y="28" width="76" height="76" rx="4" fill={WOOD} />
      <rect x="68" y="34" width="64" height="64" rx="3" fill="#cfe0e4" />
      <path d="M78 44 L96 62 M86 40 L114 68" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity="0.7" />
      <rect x="62" y="104" width="76" height="6" rx="2" fill={WOOD_DARK} />
    </>
  ),
  bookcase: (f) => (
    <>
      {shadow(40)}
      <rect x="62" y="14" width="76" height="114" rx="3" fill={WOOD} />
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <rect x="68" y={20 + i * 26} width="64" height="20" fill={WOOD_DARK} opacity="0.25" />
          <rect x={72 + (i % 2) * 8} y={24 + i * 26} width="6" height="16" fill={FABRICS[(i + 1) % FABRICS.length]} />
          <rect x={80 + (i % 2) * 8} y={22 + i * 26} width="5" height="18" fill={f} />
          <rect x={87 + (i % 2) * 8} y={26 + i * 26} width="7" height="14" fill={FABRICS[(i + 4) % FABRICS.length]} />
        </g>
      ))}
    </>
  ),
  toyShelf: (f) => (
    <>
      {shadow(50)}
      <rect x="50" y="56" width="100" height="72" rx="4" fill={WOOD} />
      {[0, 1].map((r) =>
        [0, 1, 2].map((c) => (
          <rect key={`${r}${c}`} x={56 + c * 31} y={62 + r * 32} width="27" height="27" rx="3" fill={FABRICS[(r * 3 + c + 2) % FABRICS.length]} />
        ))
      )}
      <circle cx="132" cy="48" r="8" fill={f} />
    </>
  ),
  wallShelf: (f) => (
    <>
      <rect x="40" y="76" width="120" height="8" rx="2" fill={WOOD} />
      <rect x="54" y="52" width="16" height="24" rx="3" fill={f} />
      <rect x="74" y="58" width="10" height="18" rx="2" fill={FABRICS[2]} />
      <path d="M126 76 Q126 54 138 50 Q150 54 150 76 Z" fill="#6f8b5e" />
      <rect x="128" y="66" width="20" height="10" rx="2" fill={WOOD_DARK} />
    </>
  ),
  floorLamp: (f) => (
    <>
      {shadow(24)}
      <path d="M76 22 L124 22 L134 56 L66 56 Z" fill={f} />
      <rect x="98" y="56" width="4" height="70" fill={METAL} />
      <ellipse cx="100" cy="128" rx="18" ry="4" fill={METAL} />
      <ellipse cx="100" cy="62" rx="26" ry="5" fill="#fff6c9" opacity="0.7" />
    </>
  ),
  tableLamp: (f) => (
    <>
      {shadow(30)}
      <path d="M78 44 L122 44 L130 72 L70 72 Z" fill={LIGHT} stroke={f} strokeWidth="2" />
      <path d="M86 128 Q80 100 92 84 L108 84 Q120 100 114 128 Z" fill={f} />
      <rect x="98" y="72" width="4" height="12" fill={METAL} />
    </>
  ),
  pendant: (f) => (
    <>
      <line x1="100" y1="0" x2="100" y2="40" stroke={METAL} strokeWidth="2" />
      <path d="M60 86 Q60 40 100 40 Q140 40 140 86 Z" fill={f} />
      {[0, 1, 2, 3, 4].map((i) => (
        <circle key={i} cx={72 + i * 14} cy={70 - Math.abs(2 - i) * 6} r="3" fill={LIGHT} opacity="0.7" />
      ))}
      <ellipse cx="100" cy="88" rx="16" ry="5" fill="#fff6c9" />
      <ellipse cx="100" cy="120" rx="54" ry="8" fill="#fff6c9" opacity="0.45" />
    </>
  ),
  sconce: (f) => (
    <>
      <rect x="92" y="40" width="16" height="40" rx="6" fill="#c9a548" />
      <path d="M108 60 L130 54 L130 66 Z" fill="#c9a548" />
      <path d="M120 40 L146 40 L150 70 L116 70 Z" fill={f} />
      <ellipse cx="133" cy="86" rx="24" ry="8" fill="#fff6c9" opacity="0.6" />
    </>
  ),
  mirror: () => (
    <>
      {shadow(34)}
      <rect x="72" y="12" width="56" height="116" rx="28" fill={WOOD} />
      <rect x="78" y="18" width="44" height="104" rx="22" fill="#d5e3e8" />
      <path d="M88 36 L110 58 M90 50 L104 64" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity="0.8" />
    </>
  ),
  roundMirror: () => (
    <>
      <circle cx="100" cy="72" r="46" fill={METAL} />
      <circle cx="100" cy="72" r="41" fill="#d5e3e8" />
      <path d="M80 56 L104 80 M84 70 L98 84" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity="0.8" />
      <line x1="100" y1="10" x2="100" y2="26" stroke={METAL} strokeWidth="2" />
    </>
  ),
  rug: (f) => (
    <>
      <path d="M26 112 L60 70 L174 70 L140 112 Z" fill={f} />
      <path d="M38 106 L64 76 L162 76 L136 106 Z" fill="none" stroke={LIGHT} strokeWidth="3" />
      <path d="M52 98 L70 82 L150 82 L132 98 Z" fill={LIGHT} opacity="0.25" />
    </>
  ),
  trolley: (f) => (
    <>
      {shadow(36)}
      {[50, 78, 106].map((y) => (
        <rect key={y} x="68" y={y} width="64" height="8" rx="3" fill={f} />
      ))}
      <rect x="68" y="44" width="4" height="78" fill={METAL} />
      <rect x="128" y="44" width="4" height="78" fill={METAL} />
      <circle cx="70" cy="126" r="4" fill={METAL} />
      <circle cx="130" cy="126" r="4" fill={METAL} />
    </>
  ),
  planter: (f) => (
    <>
      {shadow(56)}
      <path d="M60 96 Q48 60 66 36 M66 96 Q72 54 92 40 M62 96 Q82 70 100 66" fill="none" stroke="#5e7d4f" strokeWidth="5" strokeLinecap="round" />
      <path d="M48 96 L84 96 L80 128 L52 128 Z" fill={f} />
      <path d="M100 108 L128 108 L125 128 L103 128 Z" fill={FABRICS[(FABRICS.indexOf(f) + 2) % FABRICS.length] || "#c4a37f"} />
      <path d="M136 112 L156 112 L154 128 L138 128 Z" fill={f} opacity="0.7" />
      <path d="M112 108 Q110 90 118 82 M146 112 Q148 100 154 96" fill="none" stroke="#5e7d4f" strokeWidth="4" strokeLinecap="round" />
    </>
  ),
  ladder: (f) => (
    <>
      {shadow(26)}
      <path d="M86 128 L104 14 M122 128 L140 14" stroke={WOOD} strokeWidth="6" strokeLinecap="round" />
      {[0, 1, 2, 3, 4].map((i) => (
        <rect key={i} x={88 + i * 3.6} y={110 - i * 22} width="36" height="5" rx="2" fill={WOOD_DARK} />
      ))}
      <path d="M96 68 L128 68 L126 94 L98 94 Z" fill={f} />
    </>
  ),
};

/** Colours and drawing for a product, without rendering anything. */
export function artFor(product) {
  const kind = artKind(product?.name);
  const h = hash(product?.name);
  const room = String(product?.category?.name || product?.category || "").toLowerCase();
  return { kind, fabric: FABRICS[h % FABRICS.length], bg: ROOM_BG[room] || FALLBACK_BG[h % FALLBACK_BG.length] };
}

/** Just the drawing, for compositions like the home page hero. */
export function Drawing({ kind, fabric = FABRICS[0], className = "" }) {
  return (
    <svg viewBox="0 0 200 150" className={className} aria-hidden="true">
      {(DRAW[kind] || DRAW.sideboard)(fabric)}
    </svg>
  );
}

/**
 * Product picture: the first uploaded photo if there is one, otherwise a drawing.
 * `image` overrides which photo to show (used by the product gallery).
 */
export default function ProductArt({ product, image, className = "", rounded = "rounded-2xl" }) {
  const [broken, setBroken] = useState(false);
  const src = assetUrl(image ?? product?.images?.[0]?.url ?? product?.image);
  const { kind, fabric, bg } = artFor(product);

  if (src && !broken) {
    return (
      <div className={`overflow-hidden bg-line ${rounded} ${className}`}>
        <img src={src} alt="" loading="lazy" onError={() => setBroken(true)} className="h-full w-full object-cover" />
      </div>
    );
  }
  return (
    <div className={`flex items-center justify-center overflow-hidden ${rounded} ${className}`} style={{ background: bg }}>
      <Drawing kind={kind} fabric={fabric} className="h-[78%] w-[78%]" />
    </div>
  );
}
