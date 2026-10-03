# Mama Picks Kenya

A Jumia Kenya affiliate site for pregnancy and motherhood products, with a
book banner, heart counters, category filters, Google ad banners and a
dashboard for managing products and photos.

## What is in this folder

| Path | What it is |
|---|---|
| `index.html` | The public website |
| `css/styles.css` | Site styling (colours and fonts are at the top) |
| `js/config.js` | **Your main settings**: site name, book link, categories, AdSense, Supabase |
| `js/products.js` | Product list used when you are NOT using the dashboard |
| `js/app.js` | Site logic (you rarely need to touch this) |
| `images/` | Put product photos here if you are NOT using the dashboard |
| `admin/` | The dashboard (login, add/edit/delete products, upload/delete photos) |
| `supabase-setup.sql` | One-time database setup for the dashboard |
| `ads.txt` | Replace with the line Google AdSense gives you |

## Two ways to run it

**A. Simple (no dashboard).** Edit `js/products.js`, drop photos in `images/`,
upload to GitHub. Every change means editing a file.

**B. With the dashboard (recommended).** You add, edit and delete products and
photos from a web page. Setup is a one-time job (see below).

You can start with A and switch to B later: nothing needs rebuilding.

---

## 1. Put it on GitHub and make it live (free)

1. Unzip this folder on your computer.
2. On github.com click **New repository**, name it (for example `mama-picks`), keep it **Public**, and create it.
3. Click **uploading an existing file**, drag in **everything inside the unzipped folder** (the files and folders, not the zip itself), and click **Commit changes**.
   Check that `index.html`, `css`, `js`, `admin` and `images` all appear in the repository.
4. Go to **Settings > Pages**. Under **Build and deployment** choose **Deploy from a branch**, pick `main` and `/ (root)`, then **Save**.
5. After a minute or two GitHub shows your address, usually `https://YOUR-NAME.github.io/mama-picks/`.
   The dashboard will be at that address plus `/admin/`.

To change a file later: open it on GitHub, click the pencil icon, edit, and **Commit changes**. The site updates in a minute or so.

To use your own domain, add it in **Settings > Pages > Custom domain** and follow GitHub's DNS instructions.

---

## 2. Set up the dashboard (Supabase, free plan is enough)

1. Create a free account and a **New project** at supabase.com. Save the database password somewhere safe.
2. Open `supabase-setup.sql`, find the line marked `<<< CHANGE THIS`, and replace `PUT_YOUR_ADMIN_EMAIL_HERE` with **your own email**. Only that email will be able to change anything.
3. In Supabase open **SQL Editor > New query**, paste the whole file, and click **Run**.
4. Open **Authentication > Users > Add user > Create new user**. Use the same email, choose a strong password, and tick **Auto Confirm User**.
5. Open **Authentication** settings (Sign In / Providers) and **turn off "Allow new users to sign up"** so nobody else can create accounts.
6. Open **Project Settings > API**. Copy the **Project URL** and the **anon / publishable key**.
7. Paste them into `js/config.js` as `SUPABASE_URL` and `SUPABASE_ANON_KEY`, and commit.
   The anon key is meant to be public. **Never** put the `service_role` key in any file.
8. Visit `/admin/` on your site and log in.

### Using the dashboard

- **Images tab:** upload any photos. Each one is automatically turned into a square 800 x 800 picture (small files, fast pages). Choose "Show the whole photo" (white borders if the photo is not square) or "Fill the square" (trims the edges). You can copy a photo's link or delete it. Deleting a photo used by a product warns you first.
- **Products tab:** add or edit a product with name, short description, category, photo (pick from the library or upload new), affiliate link, price, trending badge, visible/hidden, display order and **heart count adjustment**.
- **Heart counts:** visitors' taps are counted for real. The number shown on the site is real taps plus your adjustment. Please use the adjustment honestly, for example to correct a number or give a brand-new product a modest start.
- **New categories:** add a line in `CATEGORIES` in `js/config.js`, or just type a new category name on a product and a filter button appears automatically.

Photos you put in the `images/` folder on GitHub are separate from dashboard photos. Dashboard photos live in Supabase.

---

## 3. Book banner and ads

- **Book banner:** in `js/config.js` set `BOOK_LINK` to your Selar / Payhip / Gumroad page, and edit `BOOK_TITLE` and `BOOK_PITCH`.
- **Google AdSense:** after Google approves your site, create two 160 x 600 ad units, then fill in `ADSENSE_CLIENT`, `AD_SLOT_LEFT` and `AD_SLOT_RIGHT`, and put Google's line in `ads.txt`. Ads show only on wide, tall screens.
- Set `SHOW_SETUP_BANNER` to `false` when you go live.

---

## Troubleshooting

- **Dashboard says "not connected":** `SUPABASE_URL` or `SUPABASE_ANON_KEY` is blank in `js/config.js`.
- **"This account is not the dashboard admin":** the email in `supabase-setup.sql` does not match the email you log in with. Fix the email in the SQL, run it again, and log in again.
- **Upload fails with a permission error:** the SQL did not finish. Run `supabase-setup.sql` again and read any red error message.
- **Site shows sample products:** `SUPABASE_URL` is blank, or the database could not be reached. Once connected, the site shows only products you add in the dashboard.
- **Changes not showing:** hard refresh (Ctrl + Shift + R) and wait a minute after committing.
- **Products added but the site is empty:** make sure "Visible on the site" is ticked on the product.

## Good to know

- Everyone can see a product's data (name, link, photo) because that is how a public site works. Only the admin account can change anything.
- The dashboard styling loads Tailwind CSS from the web, so there is nothing to install or build. The public site uses plain CSS in `css/styles.css`.
- Always check Jumia's affiliate terms about photos and link use, and keep the affiliate disclosure in the footer.
