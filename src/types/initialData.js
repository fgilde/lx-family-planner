export const DEFAULT_MEMBERS = [
  {
    id: 'mem-1',
    name: 'Patrick (Papa)',
    role: 'Eltern',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
    color: '#2563eb', // Blue
    bgColor: '#eff6ff',
    stars: 120
  },
  {
    id: 'mem-2',
    name: 'Sarah (Mama)',
    role: 'Eltern',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
    color: '#ec4899', // Pink
    bgColor: '#fdf2f8',
    stars: 150
  },
  {
    id: 'mem-3',
    name: 'Mia',
    role: 'Kind',
    avatar: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=150&q=80',
    color: '#f59e0b', // Gold
    bgColor: '#fffbe6',
    stars: 45
  },
  {
    id: 'mem-4',
    name: 'Lukas',
    role: 'Kind',
    avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&q=80',
    color: '#10b981', // Emerald
    bgColor: '#ecfdf5',
    stars: 30
  }
];

export const INITIAL_BRING_CATALOG = [
  // Obst & Gemüse
  { id: 'b-1', name: 'Äpfel', icon: '🍎', category: 'Obst & Gemüse', inCart: false, isSelected: true, quantity: '1 kg' },
  { id: 'b-2', name: 'Bananen', icon: '🍌', category: 'Obst & Gemüse', inCart: false, isSelected: true, quantity: '1 Stauden' },
  { id: 'b-3', name: 'Tomaten', icon: '🍅', category: 'Obst & Gemüse', inCart: false, isSelected: false, quantity: '500g' },
  { id: 'b-4', name: 'Gurke', icon: '🥒', category: 'Obst & Gemüse', inCart: false, isSelected: true, quantity: '1 Stk' },
  { id: 'b-5', name: 'Möhren', icon: '🥕', category: 'Obst & Gemüse', inCart: false, isSelected: false, quantity: '1 Beutel' },

  // Kühlung & Milch
  { id: 'b-6', name: 'Vollmilch', icon: '🥛', category: 'Kühlung & Milch', inCart: false, isSelected: true, quantity: '2 Liter' },
  { id: 'b-7', name: 'Butter', icon: '🧈', category: 'Kühlung & Milch', inCart: false, isSelected: true, quantity: '1 Pck' },
  { id: 'b-8', name: 'Käse', icon: '🧀', category: 'Kühlung & Milch', inCart: false, isSelected: true, quantity: '1 Pck' },
  { id: 'b-9', name: 'Naturjoghurt', icon: '🥣', category: 'Kühlung & Milch', inCart: false, isSelected: false, quantity: '2 Becher' },
  { id: 'b-10', name: 'Eier', icon: '🥚', category: 'Kühlung & Milch', inCart: false, isSelected: true, quantity: '10er Pck' },

  // Bäckerei
  { id: 'b-11', name: 'Vollkornbrot', icon: '🍞', category: 'Bäckerei', inCart: false, isSelected: true, quantity: '1 Laib' },
  { id: 'b-12', name: 'Brötchen', icon: '🥖', category: 'Bäckerei', inCart: false, isSelected: false, quantity: '6 Stk' },
  
  // Vorräte
  { id: 'b-13', name: 'Nudeln (Spaghetti)', icon: '🍝', category: 'Vorräte', inCart: false, isSelected: true, quantity: '2 Pck' },
  { id: 'b-14', name: 'Passierte Tomaten', icon: '🥫', category: 'Vorräte', inCart: false, isSelected: true, quantity: '3 Dosen' },
  { id: 'b-15', name: 'Haferflocken', icon: '🌾', category: 'Vorräte', inCart: false, isSelected: false, quantity: '1 Pck' },

  // Getränke
  { id: 'b-16', name: 'Mineralwasser', icon: '💧', category: 'Getränke', inCart: false, isSelected: true, quantity: '1 Kasten' },
  { id: 'b-17', name: 'Apfelsaft', icon: '🧃', category: 'Getränke', inCart: false, isSelected: false, quantity: '2 Flaschen' },

  // Drogerie & Haushalt
  { id: 'b-18', name: 'Küchenrolle', icon: '🧻', category: 'Drogerie & Haushalt', inCart: false, isSelected: true, quantity: '1 Pck' },
  { id: 'b-19', name: 'Geschirrspültabs', icon: '🧼', category: 'Drogerie & Haushalt', inCart: false, isSelected: false, quantity: '1 Pck' }
];

export const INITIAL_EVENTS = [
  {
    id: 'evt-1',
    title: 'Kinderarzt Vorsorge u9',
    date: new Date().toISOString().split('T')[0],
    time: '10:30',
    memberId: 'mem-3', // Mia
    category: 'Arzt',
    location: 'Praxis Dr. Weber',
    notes: 'Impfpass nicht vergessen!'
  },
  {
    id: 'evt-2',
    title: 'Fußball-Training Lukas',
    date: new Date().toISOString().split('T')[0],
    time: '16:00',
    memberId: 'mem-4', // Lukas
    category: 'Sport',
    location: 'Sportplatz TSV',
    notes: 'Sportsachen & Trinken mitnehmen'
  },
  {
    id: 'evt-3',
    title: 'Familien-Ausflug Zoo',
    date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
    time: '11:00',
    memberId: 'all',
    category: 'Freizeit',
    location: 'Erlebnis-Zoo',
    notes: 'Picknickkorb packen'
  },
  {
    id: 'evt-4',
    title: 'Elternabend Grundschule',
    date: new Date(Date.now() + 86400000 * 4).toISOString().split('T')[0],
    time: '19:30',
    memberId: 'mem-2', // Sarah
    category: 'Schule',
    location: 'Klasse 3b',
    notes: 'Spendenliste besprechen'
  }
];

export const INITIAL_MEALS = [
  { id: 'm-1', day: 'Montag', meal: 'Mittagessen', recipe: 'Spaghetti Bolognese mit grünem Salat', ingredients: ['Nudeln (Spaghetti)', 'Passierte Tomaten', 'Hackfleisch', 'Gurke'] },
  { id: 'm-2', day: 'Dienstag', meal: 'Abendessen', recipe: 'Selbstgemachte Pizza', ingredients: ['Hefe', 'Mehl', 'Passierte Tomaten', 'Käse', 'Salami'] },
  { id: 'm-3', day: 'Mittwoch', meal: 'Abendessen', recipe: 'Gemüse-Pfanne mit Reis', ingredients: ['Möhren', 'Paprika', 'Reis', 'Sojasauce'] },
  { id: 'm-4', day: 'Donnerstag', meal: 'Abendessen', recipe: 'Kartoffel-Möhren-Stampf mit Würstchen', ingredients: ['Kartoffeln', 'Möhren', 'Butter', 'Wiener Würstchen'] },
  { id: 'm-5', day: 'Freitag', meal: 'Abendessen', recipe: 'Fischstäbchen mit Kartoffelpüree & Erbsen', ingredients: ['Fischstäbchen', 'Kartoffeln', 'Erbsen'] },
  { id: 'm-6', day: 'Samstag', meal: 'Mittagessen', recipe: 'Pfannkuchen mit Apfelmus', ingredients: ['Eier', 'Vollmilch', 'Mehl', 'Äpfel'] },
  { id: 'm-7', day: 'Sonntag', meal: 'Mittagessen', recipe: 'Sonntagsbraten mit Klößen & Rotkohl', ingredients: ['Rinderbraten', 'Klöße', 'Rotkohl'] }
];

export const INITIAL_TASKS = [
  { id: 'tsk-1', title: 'Müll rausbringen (Gelber Sack & Bio)', memberId: 'mem-4', stars: 10, completed: false, category: 'Haushalt' },
  { id: 'tsk-2', title: 'Kinderzimmer aufräumen', memberId: 'mem-3', stars: 15, completed: false, category: 'Zimmer' },
  { id: 'tsk-3', title: 'Spülmaschine ausräumen', memberId: 'mem-4', stars: 10, completed: true, category: 'Küche' },
  { id: 'tsk-4', title: 'Wäsche zusammenlegen', memberId: 'mem-2', stars: 15, completed: false, category: 'Haushalt' },
  { id: 'tsk-5', title: 'Rasen mähen', memberId: 'mem-1', stars: 20, completed: false, category: 'Garten' }
];

export const INITIAL_REWARDS = [
  { id: 'rwd-1', title: '1x XXL Kugel Eis im Park', costStars: 30, icon: '🍦' },
  { id: 'rwd-2', title: '30 Min extra Medienzeit', costStars: 50, icon: '🎮' },
  { id: 'rwd-3', title: 'Wunschfilm am Familien-Kinoabend wählen', costStars: 75, icon: '🍿' },
  { id: 'rwd-4', title: 'Ausflug in die Trampolinhalle', costStars: 150, icon: '🎪' }
];

export const INITIAL_NOTES = [
  { id: 'nte-1', title: 'WLAN für Gäste', content: 'Netzwerk: LX-Home\nPasswort: Familie2026-SuperFast', color: '#fef08a' },
  { id: 'nte-2', title: 'Notfallnummern', content: 'Kinderarzt Dr. Weber: 0123-456789\nOma & Opa: 0987-654321', color: '#bbf7d0' },
  { id: 'nte-3', title: 'Müllabfuhr Hinweis', content: 'Donnerstag wird die Papiertonne abgeholt.', color: '#bfdbfe' }
];
