# Mama Picks Kenya

A Jumia Kenya affiliate site for pregnancy and motherhood products, with free guides and
tools, a book banner, heart counters, category filters, Google ad banners and a dashboard
for managing products and photos.

## What is in this folder

| Path | What it is |
|---|---|
| `index.html` | The shop page |
| `guides.html`, `newborn-essentials-guide.html`, `baby-shower-gift-guide.html` | Guides |
| `hospital-bag-checklist.html`, `due-date-calculator.html` | Free tools |
| `about.html`, `contact.html`, `privacy.html` | Trust pages |
| `css/styles.css` | Styling (colours and fonts are at the top) |
| `js/config.js` | Main settings: site name, book link, categories, AdSense, Supabase |
| `js/features.js` | Optional settings: contact, social links, announcement bar, analytics, Swahili |
| `js/products.js` | Product list used when the dashboard is NOT connected |
| `js/app.js`, `js/shared.js` | Site logic (you rarely need to touch these) |
| `images/` | Logo files, link-preview image, and room for your own photos |
| `admin/` | The dashboard |
| `supabase-setup.sql` | One-time database setup |
| `supabase-upgrade.sql` | Optional: badges and click insights |
| `sitemap.xml`, `robots.txt`, `ads.txt` | For search engines and AdSense |

See `UPDATE-GUIDE.md` for how to add the latest features to an existing site.

## Put it on GitHub (free)

1. Create a public repository on github.com.
2. **Add file > Upload files**, then drag in everything inside the unzipped folder, including the folders.
3. **Settings > Pages**: choose **Deploy from a branch**, `main`, `/ (root)`, and Save.
4. After a minute your site is live at the address GitHub shows.

To change a file later, open it on GitHub, click the pencil icon, edit, and **Commit changes**.

## Set up the dashboard (Supabase, free plan)

1. Create a free project at supabase.com.
2. In `supabase-setup.sql` replace `PUT_YOUR_ADMIN_EMAIL_HERE` with your email, then run the whole file in **SQL Editor**.
3. **Authentication > Users > Add user**: your email, a strong password, **Auto Confirm User** ticked.
4. Turn off "Allow new users to sign up" in Authentication settings.
5. Copy the **Project URL** and public key from **Project Settings > API** into `js/config.js`.
   The public key is meant to be public. Never put the `service_role` key in any file.
6. Optional: run `supabase-upgrade.sql` for badges and click insights.
7. Visit `/admin/` on your site and log in with the user from step 3.

### Using the dashboard

- **Products:** add, edit, copy, delete, and move products up or down.
- **Images:** upload photos. Each is automatically made into a square 800 x 800 picture.
- **Insights:** clicks and shares per product (needs `supabase-upgrade.sql`).
- **Heart counts:** shown on the site = real taps + the adjustment you set. Please use the adjustment honestly.

## Troubleshooting

- **"Invalid path specified in request URL":** the `SUPABASE_URL` in `js/config.js` must be only `https://xxxx.supabase.co`.
- **"This account is not the dashboard admin":** the email in `supabase-setup.sql` does not match your login. Fix it, run the SQL again.
- **Page looks unstyled:** the `css` and `js` folders did not upload. Re-upload them by dragging the folders.
- **Changes not showing:** wait a minute, then press Ctrl + Shift + R.
- **Site shows sample products:** `SUPABASE_URL` is blank, or the database could not be reached.

## Good to know

- Only the admin account can change anything. Product names, links and photos are public, as on any website.
- The dashboard loads Tailwind CSS from the web, so there is nothing to install or build.
- Check Jumia's affiliate terms about photos and link use, and keep the affiliate disclosure visible.
