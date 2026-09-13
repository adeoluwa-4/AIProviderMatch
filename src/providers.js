export const providers = [
  {
    id: "prairie-pipe",
    name: "Prairie Pipe Works",
    category: "Plumbing",
    specialties: ["leak", "faucet", "sink", "toilet", "pipe"],
    serviceAreas: ["66502", "66503"],
    distanceMiles: 2.1,
    availabilityHours: 3,
    qualityScore: 94,
    jobsCompleted: 128,
    summary: "Residential plumbing team focused on leaks, fixtures, and same-day repairs.",
    nextSlot: "Today, 2–4 PM"
  },
  {
    id: "blue-river-drain",
    name: "Blue River Drain Lab",
    category: "Plumbing",
    specialties: ["drain", "clog", "sink", "sewer", "backup"],
    serviceAreas: ["66502", "66503", "66506"],
    distanceMiles: 4.6,
    availabilityHours: 1,
    qualityScore: 91,
    jobsCompleted: 97,
    summary: "Drain-focused crew for kitchen, bath, and main-line blockages.",
    nextSlot: "Today, 12–2 PM"
  },
  {
    id: "sunflower-home",
    name: "Sunflower Home Repair",
    category: "Handyman",
    specialties: ["faucet", "fixture", "drywall", "door", "assembly"],
    serviceAreas: ["66502", "66503"],
    distanceMiles: 1.8,
    availabilityHours: 26,
    qualityScore: 88,
    jobsCompleted: 164,
    summary: "General home repairs and small fixture replacements for planned jobs.",
    nextSlot: "Tomorrow, 9–11 AM"
  },
  {
    id: "little-apple-climate",
    name: "Little Apple Climate Care",
    category: "HVAC",
    specialties: ["no heat", "air conditioner", "thermostat", "furnace", "airflow"],
    serviceAreas: ["66502", "66503", "66506"],
    distanceMiles: 3.2,
    availabilityHours: 2,
    qualityScore: 93,
    jobsCompleted: 141,
    summary: "Heating and cooling diagnostics with priority scheduling for loss of service.",
    nextSlot: "Today, 1–3 PM"
  },
  {
    id: "tallgrass-electric",
    name: "Tallgrass Electric Desk",
    category: "Electrical",
    specialties: ["outlet", "breaker", "light", "sparking", "wiring"],
    serviceAreas: ["66502", "66503"],
    distanceMiles: 5.4,
    availabilityHours: 4,
    qualityScore: 96,
    jobsCompleted: 112,
    summary: "Residential electrical troubleshooting for fixtures, circuits, and outlets.",
    nextSlot: "Today, 3–5 PM"
  },
  {
    id: "konza-appliance",
    name: "Konza Appliance Bench",
    category: "Appliance",
    specialties: ["refrigerator", "washer", "dryer", "dishwasher", "oven"],
    serviceAreas: ["66502", "66503", "66506"],
    distanceMiles: 6.1,
    availabilityHours: 22,
    qualityScore: 90,
    jobsCompleted: 86,
    summary: "In-home diagnosis for major kitchen and laundry appliances.",
    nextSlot: "Tomorrow, 8–10 AM"
  },
  {
    id: "wamego-home-response",
    name: "Wamego Home Response",
    category: "Handyman",
    specialties: ["leak", "door", "drywall", "assembly", "fixture"],
    serviceAreas: ["66502", "66547"],
    distanceMiles: 14.8,
    availabilityHours: 5,
    qualityScore: 84,
    jobsCompleted: 73,
    summary: "Multi-trade support for small repairs and urgent temporary fixes.",
    nextSlot: "Today, 4–6 PM"
  }
];

export const exampleRequests = [
  {
    label: "Leaking sink",
    text: "My kitchen sink is leaking underneath the cabinet and getting worse. I need someone today if possible.",
    zip: "66502"
  },
  {
    label: "No heat",
    text: "The furnace turns on but the house is still cold. No heat is coming from the vents.",
    zip: "66503"
  },
  {
    label: "Dead outlet",
    text: "Two outlets in the living room stopped working after the breaker tripped. No smoke or sparks.",
    zip: "66502"
  }
];
