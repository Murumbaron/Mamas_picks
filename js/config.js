/* ============================================================
   SITE SETTINGS: the one file you edit most.
   Used by both the public site (index.html) and the dashboard (admin/).
   ============================================================ */
window.SITE = {

  SITE_NAME: "Mama Picks Kenya",

  /* Shows a yellow "demo mode" bar and dashed ad boxes.
     Set to false when you are ready to go live. */
  SHOW_SETUP_BANNER: true,

  /* Used when a product has no link of its own. */
  DEFAULT_LINK: "https://jforce.jumia.co.ke/s/Ts38kww",

  /* ----- Book banner (always visible at the bottom of the screen) ----- */
  BOOK_TITLE:  "Motherhood Journey",
  BOOK_PITCH:  "Your calm companion from pregnancy to life with baby.",
  BOOK_BUTTON: "Get the book",
  BOOK_LINK:   "",    // paste your Selar / Payhip / Gumroad link here

  /* ----- Supabase (powers the dashboard, shared wishlist counts, image storage) -----
     Leave both blank to run the site without a backend: products then come from
     js/products.js and images from the images/ folder. See README.md. */
  SUPABASE_URL: "https://dmbdurptnmuqhrezxook.supabase.co",         // e.g. "https://abcdxyz.supabase.co"
  SUPABASE_ANON_KEY: "sb_publishable_Q-spd25Usj9M6bX1frtEfQ_2qO87g5c",    // the public "anon" or "publishable" key (never the service_role key)

  /* ----- Google AdSense side banners (leave blank until Google approves you) ----- */
  ADSENSE_CLIENT: "",       // e.g. "ca-pub-1234567890123456"
  AD_SLOT_LEFT:   "",       // 160x600 ad unit ID for the left side
  AD_SLOT_RIGHT:  "",       // 160x600 ad unit ID for the right side

  /* ----- Categories (the filter buttons, always visible at the top) -----
     To ADD one, copy a line and change it:
       { id: "toys", label: "Toys", emoji: "🧸", tint: "#fde9ef" },
     id    = short lowercase word, no spaces (products use this)
     label = text on the button
     emoji = shown on a card that has no photo yet
     tint  = background colour behind that emoji
     If a product uses a category that is not listed here, a button is
     created for it automatically. */
  CATEGORIES: [
    { id: "expecting", label: "Expecting",    emoji: "🤰", tint: "#fde9ef" },
    { id: "hospital",  label: "Hospital bag", emoji: "🧳", tint: "#e6f1fb" },
    { id: "newborn",   label: "Newborn",      emoji: "🍼", tint: "#fff5d6" },
    { id: "feeding",   label: "Feeding",      emoji: "🤱", tint: "#e9f6ee" },
    { id: "mum",       label: "Mum recovery", emoji: "🌸", tint: "#f3e8fb" },
    { id: "gear",      label: "Baby gear",    emoji: "🚼", tint: "#e8eefc" }
  ]
};
