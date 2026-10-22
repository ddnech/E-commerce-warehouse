// Demo catalogue. Every name and description here is made up for this project.
// Products have no photos on purpose; the shop draws an illustration for each one.
// Fields: [name, price (IDR), weight (grams), description]

const categories = [
  "Living Room",
  "Bedroom",
  "Dining & Kitchen",
  "Workspace",
  "Kids & Baby",
  "Lighting",
  "Bathroom",
  "Outdoor",
];

const products = {
  "Living Room": [
    ["Jepara Teak Coffee Table", 2_450_000, 18000, "Solid teak from Central Java with a low, rounded top and a shelf underneath for books and trays. Oiled, not lacquered, so it ages to a warm honey colour."],
    ["Bantul Linen 3-Seat Sofa", 6_900_000, 45000, "Deep seat, firm foam cushions and a washable linen-blend cover in sand grey. The legs screw off for tight doorways."],
    ["Lombok Rattan Armchair", 1_850_000, 9000, "Hand-woven rattan on a mahogany frame, with a loose seat cushion. Light enough to move around the house."],
    ["Kudus Oak Side Table", 650_000, 5000, "A small round table that fits next to a sofa or bed. Oak veneer on a steel base."],
    ["Toba Low Media Cabinet", 2_900_000, 32000, "160 cm wide with two sliding doors and a cable hole at the back. Holds TVs up to 65 inches."],
    ["Sumba Woven Rug 160×230", 1_200_000, 6000, "Flat-woven cotton and jute in an earthy stripe. Reversible, so it lasts twice as long."],
    ["Flores 5-Shelf Bookcase", 1_750_000, 28000, "Tall and narrow at 60 cm wide. Comes with a wall anchor so it stays put."],
  ],
  Bedroom: [
    ["Merapi Queen Bed Frame", 5_400_000, 52000, "Mango wood frame with a slatted base for 160×200 mattresses. No box spring needed."],
    ["Dieng Nightstand with Drawer", 890_000, 9000, "One soft-close drawer and an open shelf. Pairs with the Merapi bed frame."],
    ["Bromo 3-Door Wardrobe", 4_600_000, 78000, "Two hanging sections and adjustable shelves behind three doors. 150 cm wide, 200 cm tall."],
    ["Kawi 6-Drawer Dresser", 3_200_000, 41000, "Six deep drawers on metal runners. The top is wide enough for a mirror and a lamp."],
    ["Ijen Full-Length Mirror", 790_000, 7000, "160 cm tall in a thin teak frame. Lean it on a wall or hang it."],
    ["Semeru Upholstered Bench", 1_400_000, 12000, "Padded bench for the end of the bed, with a cotton cover that zips off for washing."],
  ],
  "Dining & Kitchen": [
    ["Garut 6-Seat Dining Table", 4_200_000, 48000, "180 cm solid acacia table that seats six. Rounded corners, so fewer bumped hips."],
    ["Garut Dining Chair, Set of 2", 1_600_000, 11000, "Curved backrest and a woven seat. Stackable when you need the space."],
    ["Cirebon Bar Stool", 720_000, 5000, "75 cm seat height for kitchen counters, with a footrest ring."],
    ["Tegal Kitchen Trolley", 980_000, 14000, "Three trays on lockable wheels. Rolls between the stove and the table."],
    ["Pekalongan Sideboard", 3_600_000, 38000, "Four doors with batik-inspired carving and adjustable shelves inside."],
  ],
  Workspace: [
    ["Bandung Standing Desk", 4_900_000, 30000, "Electric height adjustment from 70 to 120 cm, with three memory buttons."],
    ["Cikini Writing Desk", 1_900_000, 22000, "Compact 110 cm desk with one drawer. Fits in a bedroom corner."],
    ["Menteng Ergonomic Office Chair", 2_750_000, 15000, "Mesh back, adjustable lumbar support and 4D armrests."],
    ["Kemang Filing Cabinet", 1_300_000, 21000, "Three lockable drawers that fit A4 folders. Slides under most desks."],
    ["Braga Wall Shelf", 420_000, 3000, "80 cm floating shelf with hidden brackets. Holds up to 15 kg."],
  ],
  "Kids & Baby": [
    ["Solo Convertible Crib", 3_100_000, 26000, "A crib with a three-height base that later turns into a toddler bed."],
    ["Klaten Kids Desk & Chair", 1_250_000, 13000, "Sized for ages 3 to 8, with rounded corners and a wipe-clean top."],
    ["Magelang Toy Storage Shelf", 890_000, 12000, "Low shelf with nine fabric bins kids can reach themselves."],
    ["Boyolali Rocking Chair", 1_100_000, 7000, "A small wooden rocker with curved runners that stop it tipping over."],
  ],
  Lighting: [
    ["Batik Pendant Lamp", 850_000, 2000, "Laser-cut shade that throws a batik pattern on the ceiling. E27 bulb."],
    ["Kalimantan Rattan Floor Lamp", 1_350_000, 5000, "150 cm floor lamp with a woven rattan shade and a foot switch."],
    ["Minahasa Table Lamp", 480_000, 2000, "Ceramic base with a linen shade. Warm light for a bedside table."],
    ["Ubud Wall Sconce", 390_000, 1000, "Brass-finish wall light that can be wired in or plugged in."],
  ],
  Bathroom: [
    ["Lombok Teak Bath Stool", 380_000, 3000, "Small teak stool that's fine in the shower. Slatted so it drains."],
    ["Sanur Bathroom Cabinet", 1_450_000, 15000, "Wall cabinet with a mirrored door and two glass shelves."],
    ["Kuta Towel Ladder", 520_000, 4000, "Leans against the wall and holds five towels. Bamboo."],
    ["Nusa Round Mirror", 690_000, 6000, "60 cm round mirror with a thin black steel frame."],
  ],
  Outdoor: [
    ["Bunaken Teak Lounger", 4_400_000, 34000, "Adjustable back and wheels on one end. Teak that can stay outside all year."],
    ["Wakatobi Outdoor Dining Set", 7_200_000, 60000, "A table and four chairs in powder-coated aluminium and synthetic rattan."],
    ["Raja Ampat Hanging Chair", 2_300_000, 14000, "Egg-shaped hanging chair with a stand and a weatherproof cushion."],
    ["Komodo Planter Set", 450_000, 8000, "Three fibre-clay planters in different sizes, with drainage holes."],
    ["Belitung Garden Bench", 1_950_000, 24000, "Two-seat bench in acacia hardwood with armrests."],
  ],
};

module.exports = { categories, products };
