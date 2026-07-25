import BringApi from 'bring-shopping';

const CATALOG_TTL_MS = 12 * 60 * 60 * 1000;
const CATALOG_TIMEOUT_MS = 8_000;

const SECTION_ICONS = [
  [/obst|gemüse|früchte/i, '🥦'],
  [/brot|gebäck/i, '🥨'],
  [/milch|käse/i, '🥛'],
  [/fleisch|fisch/i, '🐟'],
  [/zutaten|gewürze/i, '🫙'],
  [/fertig|tiefkühl/i, '❄️'],
  [/getreide/i, '🌾'],
  [/snacks|süss|süß/i, '🍫'],
  [/getränke|tabak/i, '🧃'],
  [/haushalt/i, '🧽'],
  [/pflege|gesundheit/i, '🧴'],
  [/tierbedarf/i, '🐾'],
  [/baumarkt|garten/i, '🌿']
];

const FALLBACK_SECTIONS = [
  {
    name: 'Obst & Gemüse',
    icon: '🥦',
    items: [
      'Äpfel', 'Bananen', 'Birnen', 'Erdbeeren', 'Weintrauben', 'Zitronen',
      'Orangen', 'Avocado', 'Tomaten', 'Gurken', 'Paprika', 'Kartoffeln',
      'Zwiebeln', 'Knoblauch', 'Karotten', 'Brokkoli', 'Blumenkohl',
      'Champignons', 'Salat', 'Spinat', 'Lauch', 'Schnittlauch'
    ]
  },
  {
    name: 'Brot & Gebäck',
    icon: '🥨',
    items: [
      'Brot', 'Brötchen', 'Toastbrot', 'Baguette', 'Knäckebrot',
      'Croissants', 'Wraps'
    ]
  },
  {
    name: 'Milch & Käse',
    icon: '🥛',
    items: [
      'Milch', 'Hafermilch', 'Butter', 'Margarine', 'Eier', 'Joghurt',
      'Quark', 'Sahne', 'Crème fraîche', 'Käse', 'Frischkäse', 'Mozzarella',
      'Feta'
    ]
  },
  {
    name: 'Fleisch & Fisch',
    icon: '🐟',
    items: [
      'Hackfleisch', 'Hähnchen', 'Würstchen', 'Aufschnitt', 'Schinken',
      'Lachs', 'Thunfisch'
    ]
  },
  {
    name: 'Zutaten & Gewürze',
    icon: '🫙',
    items: [
      'Mehl', 'Zucker', 'Salz', 'Pfeffer', 'Öl', 'Essig', 'Ketchup',
      'Mayonnaise', 'Senf', 'Tomatenmark', 'Dosentomaten', 'Brühe',
      'Backpulver'
    ]
  },
  {
    name: 'Fertig- & Tiefkühlprodukte',
    icon: '❄️',
    items: [
      'Tiefkühlpizza', 'Pommes', 'Tiefkühlgemüse', 'Fischstäbchen',
      'Eis', 'Fertiggericht'
    ]
  },
  {
    name: 'Getreideprodukte',
    icon: '🌾',
    items: [
      'Nudeln', 'Reis', 'Haferflocken', 'Müsli', 'Cornflakes', 'Couscous',
      'Linsen'
    ]
  },
  {
    name: 'Snacks & Süsswaren',
    icon: '🍫',
    items: [
      'Nougatcreme', 'Schokolade', 'Kekse', 'Chips', 'Nüsse', 'Gummibärchen',
      'Müsliriegel'
    ]
  },
  {
    name: 'Getränke',
    icon: '🧃',
    items: [
      'Mineralwasser', 'Saft', 'Kaffee', 'Tee', 'Kakao', 'Limonade',
      'Bier', 'Wein'
    ]
  },
  {
    name: 'Haushalt',
    icon: '🧽',
    items: [
      'Spülmittel', 'Spülmaschinentabs', 'Waschmittel', 'Küchenrolle',
      'Toilettenpapier', 'Müllbeutel', 'Alufolie', 'Backpapier',
      'Allzweckreiniger', 'Schwämme'
    ]
  },
  {
    name: 'Pflege & Gesundheit',
    icon: '🧴',
    items: [
      'Zahnpasta', 'Zahnbürsten', 'Duschgel', 'Shampoo', 'Seife',
      'Deo', 'Taschentücher', 'Pflaster'
    ]
  },
  {
    name: 'Tierbedarf',
    icon: '🐾',
    items: ['Hundefutter', 'Katzenfutter', 'Katzenstreu', 'Leckerlis']
  }
];

let cachedCatalog = null;
let pendingCatalog = null;

function cleanLabel(value, fallback = '') {
  return String(value || fallback).trim().slice(0, 120);
}

function sectionIcon(name) {
  return (
    SECTION_ICONS.find(([pattern]) => pattern.test(name))?.[1] ||
    '🛒'
  );
}

function makeSectionId(name, index) {
  const slug = name
    .toLocaleLowerCase('de-DE')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return slug || `bereich-${index + 1}`;
}

export function normalizeBringCatalog(payload, source = 'bring') {
  const sourceSections = Array.isArray(payload?.catalog?.sections)
    ? payload.catalog.sections
    : [];
  const seen = new Set();
  const sections = sourceSections
    .map((section, sectionIndex) => {
      const name = cleanLabel(
        section?.name || section?.sectionId,
        `Bereich ${sectionIndex + 1}`
      );
      const icon = sectionIcon(name);
      const items = (Array.isArray(section?.items) ? section.items : [])
        .map((item, itemIndex) => {
          const itemName = cleanLabel(item?.name || item?.itemId);
          const normalizedName = itemName.toLocaleLowerCase('de-DE');
          if (!itemName || seen.has(normalizedName)) return null;
          seen.add(normalizedName);
          return {
            id: cleanLabel(item?.itemId, `${sectionIndex}-${itemIndex}`),
            name: itemName,
            category: name,
            icon
          };
        })
        .filter(Boolean);
      return {
        id: makeSectionId(name, sectionIndex),
        name,
        icon,
        items
      };
    })
    .filter(section => section.items.length > 0);

  return {
    locale: cleanLabel(payload?.language, 'de-DE'),
    source,
    sections,
    total: sections.reduce((sum, section) => sum + section.items.length, 0),
    updatedAt: Date.now()
  };
}

function fallbackCatalog() {
  return normalizeBringCatalog(
    {
      language: 'de-DE',
      catalog: {
        sections: FALLBACK_SECTIONS.map(section => ({
          sectionId: section.name,
          name: section.name,
          items: section.items.map(name => ({ itemId: name, name }))
        }))
      }
    },
    'fallback'
  );
}

async function fetchLiveCatalog() {
  const client = new BringApi({ mail: '', password: '' });
  let timer;
  try {
    return await Promise.race([
      client.loadCatalog('de-DE'),
      new Promise((_, reject) => {
        timer = setTimeout(
          () => reject(new Error('Bring!-Katalog Zeitüberschreitung')),
          CATALOG_TIMEOUT_MS
        );
      })
    ]);
  } finally {
    clearTimeout(timer);
  }
}

export async function loadBringCatalog() {
  if (
    cachedCatalog &&
    Date.now() - cachedCatalog.updatedAt < CATALOG_TTL_MS
  ) {
    return cachedCatalog;
  }
  if (pendingCatalog) return pendingCatalog;

  pendingCatalog = (async () => {
    try {
      const liveCatalog = normalizeBringCatalog(
        await fetchLiveCatalog(),
        'bring'
      );
      if (liveCatalog.total === 0) {
        throw new Error('Bring!-Katalog ist leer');
      }
      cachedCatalog = liveCatalog;
    } catch (error) {
      if (!cachedCatalog) {
        cachedCatalog = fallbackCatalog();
      }
      console.warn(`Bring!-Katalog nicht erreichbar: ${error.message}`);
    } finally {
      pendingCatalog = null;
    }
    return cachedCatalog;
  })();

  return pendingCatalog;
}
