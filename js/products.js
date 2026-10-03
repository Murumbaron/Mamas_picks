/* ============================================================
   PRODUCTS used when the dashboard / Supabase is NOT connected.
   (When Supabase is connected in js/config.js, products come from the
   dashboard instead and this list is ignored.)

   Add one block per product. Copy this pattern:

   {
     name:     "Product name",
     desc:     "One or two short sentences on why a mum would want it.",
     category: "expecting",                  // an id from CATEGORIES in js/config.js
     image:    "images/my-photo.jpg",        // a file you put in the images/ folder, or a full web address
     link:     "https://...",                // your Jumia affiliate link (blank = DEFAULT_LINK)
     price:    "KSh 2,499",                  // optional, "" hides it
     trending: true,                         // optional, shows a "Trending" badge
     wishlist: 0                             // optional starting heart count
   },

   Do not rename a product after launch: its heart count follows its name.
   To rename safely, first add  id: "old-name-in-lowercase-with-dashes"
   ============================================================ */
window.STATIC_PRODUCTS = [
  {
    name: "Full-body maternity pillow",
    desc: "U-shaped support for your back, belly and hips so you can sleep more comfortably in the later months.",
    category: "expecting",
    image: "",
    link: "",
    price: "",
    trending: true
  },
  {
    name: "Stretch mark cream",
    desc: "Rich daily moisturiser for the belly, hips and thighs. Start early and use it every day.",
    category: "expecting",
    image: "",
    link: "",
    price: ""
  },
  {
    name: "Ready-to-go hospital bag",
    desc: "A roomy bag to pack for mum and baby so you are not rushing around when labour starts.",
    category: "hospital",
    image: "",
    link: "",
    price: "",
    trending: true
  },
  {
    name: "Maternity pads",
    desc: "Extra-absorbent pads made for the first days after birth.",
    category: "hospital",
    image: "",
    link: "",
    price: ""
  },
  {
    name: "Newborn baby clothing set",
    desc: "Soft cotton bodysuits, hats and mittens in the smallest sizes.",
    category: "newborn",
    image: "",
    link: "",
    price: ""
  },
  {
    name: "Baby swaddle blankets",
    desc: "Light, stretchy wraps that help babies settle and sleep.",
    category: "newborn",
    image: "",
    link: "",
    price: "",
    trending: true
  },
  {
    name: "Nursing bra",
    desc: "Comfortable, wire-free support with clip-down cups for easy feeding.",
    category: "feeding",
    image: "",
    link: "",
    price: ""
  },
  {
    name: "Breast pump",
    desc: "Express milk at home or at work and let someone else take a feed.",
    category: "feeding",
    image: "",
    link: "",
    price: ""
  },
  {
    name: "Postpartum belly wrap",
    desc: "Gentle compression for your tummy and back as your body recovers.",
    category: "mum",
    image: "",
    link: "",
    price: ""
  },
  {
    name: "Baby carrier wrap",
    desc: "Keep your baby close and your hands free around the house or on errands.",
    category: "gear",
    image: "",
    link: "",
    price: "",
    trending: true
  },
  {
    name: "Foldable baby bath tub",
    desc: "Compact tub that folds flat for storage and fits in most small bathrooms.",
    category: "gear",
    image: "",
    link: "",
    price: ""
  },
  {
    name: "Baby monitor",
    desc: "Keep an eye and ear on your little one from another room.",
    category: "gear",
    image: "",
    link: "",
    price: ""
  }
];
