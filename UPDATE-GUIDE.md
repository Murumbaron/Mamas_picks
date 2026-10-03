# Update guide: what is new and how to add it

This is an **update pack**. It adds new features to your existing site and does
not touch your Supabase connection. Your `js/config.js`, `js/products.js`,
`ads.txt` and `supabase-setup.sql` are NOT in this pack, so they stay exactly as
they are.

## 1. Upload the update (5 minutes)

1. Unzip `mama-picks-update.zip` on your computer.
2. Open your repository on github.com, click **Add file > Upload files**.
3. Open the unzipped folder, select **everything inside it** (the files AND the
   `admin`, `css`, `images` and `js` folders) and drag it all into the upload box.
   Dragging folders works in Chrome. The "choose your files" link does not take folders.
4. Wait until the list shows paths such as `js/shared.js` and `css/styles.css`, then
   click **Commit changes**. GitHub will replace files with the same name and add the new ones.
5. Wait a minute, then open your site and press **Ctrl + Shift + R**.

## 2. Optional database upgrade (needed for badges and Insights)

Open Supabase > **SQL Editor > New query**, paste the contents of `supabase-upgrade.sql`, click **Run**.
It adds the "Extra badge" field and anonymous click counting. It does not change your
existing products, photos or login. Without it, everything else still works.

## 3. Fill in your details (all optional)

Open `js/features.js` on GitHub (pencil icon) and fill in what you have:

- `CONTACT_EMAIL`, `WHATSAPP_NUMBER`, `WHATSAPP_CHANNEL`, `TIKTOK`, `INSTAGRAM`, `FACEBOOK`, `YOUTUBE`
- `NEWSLETTER_LINK`: a signup page for your free sample chapter (MailerLite or Brevo both have free plans)
- `PROMO`: the announcement bar. It is pre-filled for Black Friday and shows between the dates you set
- `GA_ID` or `PLAUSIBLE_DOMAIN`: analytics (use one)

Anything left blank is simply hidden.

## 4. What is new

| Feature | Where |
|---|---|
| Navigation bar, footer, back-to-top button on every page | all pages |
| Sort (featured, newest, price) and budget buttons | shop page |
| "Picks of the week" strip (shows when 3 or more products are marked Trending) | shop page |
| Quick view popup: tap any photo or product name | shop page |
| WhatsApp share on every product, plus shareable product links | shop page |
| "My list": saved hearts, with a button to share the list on WhatsApp | shop page |
| English / Swahili switch (EN \| SW) | navigation bar |
| Extra badges such as "Staff pick" and "Mum tested" | dashboard > product form |
| Copy product, and move up / down to reorder | dashboard > Products |
| Insights: clicks and shares per product | dashboard > Insights |
| Hospital bag checklist (saves ticks, prints) | `hospital-bag-checklist.html` |
| Due date calculator | `due-date-calculator.html` |
| Two guides: newborn essentials, baby shower gifts | `guides.html` |
| About, Contact and Privacy pages | footer links |
| Logo, favicon, link-preview image, sitemap, robots file | automatic |

## 5. Things to check or edit

- **Your site address.** The link-preview tags and the sitemap currently use
  `https://murumbaron.github.io/mamaspick/`. If your address is different, or when you
  move to your own domain, those lines need changing: the `og:image` line in each `.html`
  file, `sitemap.xml` and `robots.txt`. Tell me the new address and I will redo them for you.
- **Link previews are cached.** After the first share, WhatsApp and Facebook may keep showing
  the old preview for a while. The Facebook Sharing Debugger can refresh it.
- **Swahili.** I wrote the translations carefully, but please have a Swahili speaker read them
  once. They live in `SWAHILI` inside `js/features.js` and are easy to edit.
- **About page.** It says you only use the "Mum tested" label on products someone has really used.
  Please keep to that, or edit the sentence.
- **Privacy page.** It is a sensible general template, not legal advice. Update it if you add
  tools that collect more information. If many visitors come from Europe or the UK, Google may
  also require a cookie consent banner for ads and analytics.
- **Anonymous click counts.** The counting table accepts new records from any visitor, which is
  how a public site works. Someone could inflate the counts on purpose. Use "Clear all click
  data" in the dashboard if that ever happens.
- **Broken link checking** is not included. Browsers do not allow a web page to test other
  websites' links, so it would need a separate server.

## 6. Where to change things

| I want to change... | Edit |
|---|---|
| Site name, book banner, categories, ads, Supabase | `js/config.js` (unchanged by this update) |
| Contact, social links, announcement bar, analytics, budgets, Swahili | `js/features.js` |
| Colours and fonts | top of `css/styles.css` |
| Guide text | the matching `.html` file |
| Hospital bag items | the list at the top of `js/hospital-bag.js` |
