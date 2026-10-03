# Blog update: what is new and how to add it

This pack adds a **blog** that you manage from your dashboard. It does not touch your
Supabase connection. Your `js/config.js`, `js/features.js`, `js/products.js` and `ads.txt`
are NOT in this pack, so anything you have already filled in stays exactly as it is.

## Guides vs Blog

- **Guides** are fixed pages (hospital bag checklist, due date calculator, two articles).
  To change them you edit the page files.
- **Blog** posts are written, edited, scheduled and deleted from the dashboard, with no code.

Keep both: the Guides page is a home for tools and evergreen help, the blog is for fresh posts.

## 1. Upload the files (5 minutes)

1. Unzip `mama-picks-blog-update.zip`.
2. In your repository on github.com click **Add file > Upload files**.
3. Select **everything inside the unzipped folder** (files AND the `admin`, `css` and `js`
   folders) and drag it all into the upload box. Dragging folders works in Chrome.
4. Wait until paths like `js/post.js` and `admin/admin.js` appear, then **Commit changes**.
5. Wait a minute and press **Ctrl + Shift + R** on your site.

## 2. Database setup (required, one time)

In Supabase open **SQL Editor > New query**, paste the whole of `supabase-blog.sql`, and click **Run**.
It only adds a table for blog posts. Your products, photos, hearts and login are untouched.
Until you do this, the dashboard's Blog tab shows a reminder instead of the editor.

## 3. Write your first post

1. Go to `/admin/` and log in, then open the **Blog** tab and click **New post**.
2. Type a title (the web address is made for you), a short summary and a category.
3. Add a cover image: **Choose from library** or **Upload new image**.
4. Write in the editor. The toolbar has headings, bold, italic, lists, links, quotes,
   images, a divider line, undo and redo. **Preview** shows how it will look.
5. Choose **Draft** (hidden) or **Published**. Pick a date in the future to schedule a post.
6. Click **Save post**.

You can edit, unpublish or delete any post later from the same list.

### Tips

- **Affiliate links:** use the **Link** button. Jumia links are automatically marked as
  sponsored links, which is the honest and Google-friendly way.
- **Images:** the Images tab now has two sections. Product photos are made square.
  Blog images keep their own shape and are shrunk to at most 1200 pixels wide.
- **Pasting from Word or a web page** is cleaned automatically, so no strange fonts or colours come along.
- Posts show on the **Blog** page, in a "From the blog" strip on your home page (latest 3),
  and are shareable on WhatsApp.

## What is new

| Feature | Where |
|---|---|
| Blog list with category buttons and "load more" | `blog.html` |
| Single post page with share buttons and "more to read" | `post.html?slug=...` |
| "From the blog" strip on the home page (appears once you publish posts) | home page |
| Blog tab: new, edit, update, delete, schedule, draft, preview | dashboard |
| Writing editor with toolbar, image insert, link button, auto-clean | dashboard |
| Blog image uploads (keep their shape) and a second image library | dashboard > Images |
| "Blog" in the main menu (Hospital bag list and Due date calculator move to the Guides page and the footer) | all pages |
| Swahili for the new blog words | EN \| SW switch |

## Good to know

- **Link previews for single posts.** Your site is a static GitHub site, so when someone shares a
  post on WhatsApp or Facebook the preview shows the general site image and title, not the
  post's own. The post itself reads fine. Making each post have its own preview needs a
  server-side step, which I can help with later if it matters.
- **Search engines.** Google can read posts, and the Blog page links to every post. Posts are not
  listed in `sitemap.xml` because they live in the database. Linking to your posts from the
  home page strip and from social posts helps them get found.
- **Security.** Only your admin login can create or change posts. Everything is also cleaned
  again before a post is shown, so only safe formatting can ever appear.
- **Sitemap and address.** `sitemap.xml` is included again with the Blog page added. It still
  uses `https://murumbaron.github.io/mamaspick/`. If your address is different, tell me and I will fix it.
- This update also fixes a small display issue where some hidden buttons could appear
  when they should not.
