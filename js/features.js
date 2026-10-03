/* ============================================================
   FEATURE SETTINGS (new). Everything here is optional.
   Leave a setting blank ("") and that feature simply stays hidden.
   Your Supabase settings stay in js/config.js: nothing here touches them.
   ============================================================ */
window.FEATURES = {

  /* Your live site address (only used as a fallback; share links
     are built automatically from whatever address the visitor is on). */
  SITE_URL: "https://murumbaron.github.io/mamaspick/",

  /* ----- Contact and community (shown in the footer and on the Contact page) ----- */
  CONTACT_EMAIL: "",        // e.g. "hello@yourdomain.com"
  WHATSAPP_NUMBER: "",      // digits only with country code, e.g. "254712345678"
  WHATSAPP_CHANNEL: "",     // link to your WhatsApp channel or community
  TIKTOK: "",               // full link, e.g. "https://www.tiktok.com/@yourname"
  INSTAGRAM: "",
  FACEBOOK: "",
  YOUTUBE: "",

  /* ----- Free sample chapter / email list ----- 
     Create a signup page with a free tool such as MailerLite or Brevo, then paste its link.
     A yellow "join" strip appears above the footer when this or WHATSAPP_CHANNEL is set. */
  NEWSLETTER_LINK: "",
  NEWSLETTER_BUTTON: "Get the free sample chapter",
  JOIN_TEXT: "Get new picks and helpful tips for mums, straight to your phone.",

  /* ----- Announcement bar (seasonal campaigns) -----
     Shows at the very top of every page between the start and end dates, and
     visitors can close it. Set text to "" to turn it off. */
  PROMO: {
    text: "Black Friday picks: our favourite finds for mum and baby.",
    linkText: "See trending",
    link: "index.html?cat=trending",
    start: "2026-11-15",      // first day it shows (YYYY-MM-DD)
    end:   "2026-11-30"       // last day it shows
  },

  /* ----- Analytics (optional). Fill in ONE of these. ----- */
  GA_ID: "",                  // Google Analytics 4, e.g. "G-ABCD123456"
  PLAUSIBLE_DOMAIN: "",       // Plausible Analytics, e.g. "yourdomain.com"

  /* ----- Budget filter buttons on the shop page ----- */
  BUDGETS: [
    { label: "Under KSh 1,000",    max: 1000 },
    { label: "KSh 1,000 to 3,000", min: 1000, max: 3000 },
    { label: "Over KSh 3,000",     min: 3000 }
  ],

  /* ----- Swahili (Kiswahili) text -----
     Visitors can switch between English and Swahili with the EN | SW buttons.
     Left side = the English text, right side = the Swahili shown instead.
     Product names and descriptions stay as you typed them in the dashboard.
     Tip: ask a Swahili speaker to read these once before you go live. */
  SWAHILI: {
    "Shop": "Duka",
    "Guides": "Miongozo",
    "Hospital bag list": "Orodha ya mfuko wa hospitali",
    "Due date calculator": "Kikokotoo cha tarehe ya kujifungua",
    "About": "Kuhusu sisi",
    "Contact": "Wasiliana nasi",
    "Privacy": "Faragha",
    "Menu": "Menyu",
    "Explore": "Gundua",
    "Connect": "Wasiliana",
    "Back to top": "Rudi juu",
    "Handpicked finds for bump, birth and baby": "Bidhaa tulizochagua kwa ajili ya ujauzito, uzazi na mtoto",
    "Trending and hard-to-find items for mums in Kenya, all available on Jumia. Tap a product to see the price and order.": "Bidhaa maarufu na adimu kwa akina mama nchini Kenya, zote zinapatikana Jumia. Gusa bidhaa ili uone bei na kuagiza.",
    "Search pillows, bras, carriers...": "Tafuta mito, sidiria, vibebeo...",
    "Handpicked by us": "Zimechaguliwa kwa makini",
    "Shop securely on Jumia": "Nunua kwa usalama Jumia",
    "Free to use": "Bila malipo",
    "All": "Zote",
    "Trending": "Maarufu",
    "My list": "Orodha yangu",
    "Picks of the week": "Chaguo za wiki",
    "Sort by": "Panga kwa",
    "Featured": "Zilizopendekezwa",
    "Newest": "Mpya zaidi",
    "Price: low to high": "Bei: chini hadi juu",
    "Price: high to low": "Bei: juu hadi chini",
    "Any price": "Bei yoyote",
    "Under KSh 1,000": "Chini ya KSh 1,000",
    "KSh 1,000 to 3,000": "KSh 1,000 hadi 3,000",
    "Over KSh 3,000": "Zaidi ya KSh 3,000",
    "product": "bidhaa",
    "products": "bidhaa",
    "Loading products...": "Inapakia bidhaa...",
    "Check it out": "Tazama bidhaa",
    "Save": "Hifadhi",
    "Share": "Shiriki",
    "Share on WhatsApp": "Shiriki kwenye WhatsApp",
    "Close": "Funga",
    "Expecting": "Ujauzito",
    "Hospital bag": "Mfuko wa hospitali",
    "Newborn": "Mtoto mchanga",
    "Feeding": "Kulisha",
    "Mum recovery": "Kupona kwa mama",
    "Baby gear": "Vifaa vya mtoto",
    "Staff pick": "Chaguo letu",
    "Mum tested": "Imejaribiwa na mama",
    "No products match that search.": "Hakuna bidhaa zinazolingana na utafutaji huo.",
    "Try a different word or pick another category above.": "Jaribu neno lingine au chagua kategoria nyingine hapo juu.",
    "New picks are on the way.": "Bidhaa mpya zinakuja.",
    "Please check back soon.": "Tafadhali rudi tena hivi karibuni.",
    "Your saved list is empty. Tap the heart on products you like.": "Orodha yako ni tupu. Gusa moyo kwenye bidhaa unazopenda.",
    "Someone shared a wishlist with you.": "Mtu amekushirikisha orodha ya matamanio.",
    "Share my list on WhatsApp": "Shiriki orodha yangu kwenye WhatsApp",
    "See all products": "Tazama bidhaa zote",
    "Affiliate disclosure:": "Taarifa ya ushirika:",
    "Some links on this site are affiliate links. If you buy through them, we may earn a small commission from Jumia at no extra cost to you.": "Baadhi ya viungo kwenye tovuti hii ni viungo vya ushirika. Ukinunua kupitia hivyo, tunaweza kupata kamisheni ndogo kutoka Jumia bila gharama ya ziada kwako.",
    "Prices, photos and availability are set by Jumia and can change. Check the product page before you order.": "Bei, picha na upatikanaji huamuliwa na Jumia na vinaweza kubadilika. Angalia ukurasa wa bidhaa kabla ya kuagiza.",
    "Join our WhatsApp channel": "Jiunge na chaneli yetu ya WhatsApp",
    "Get the free sample chapter": "Pata sura ya mfano bila malipo",
    "Get new picks and helpful tips for mums, straight to your phone.": "Pata bidhaa mpya na vidokezo muhimu kwa akina mama moja kwa moja kwenye simu yako."
  }
};
