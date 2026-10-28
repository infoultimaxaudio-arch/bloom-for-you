# Bloom for You — Netlify-ready digital gift creator

A customizable, mobile-friendly digital gift inspired by the blooming-rose storytelling concept. This is an original implementation with its own interface, CSS/SVG illustration, animations and data model; it does not include copied GiftFeels source code or proprietary assets.

## Features

- Interactive seed → sprout → blooming rose reveal
- Custom recipient/sender names, headline, letter and sign-off
- Four colour themes: Rosewater, Midnight, Peach Tea and Soft Sage
- Live preview while editing
- Up to three photos, resized and compressed in the browser
- Optional background music and voice note (800 KB each max)
- Typewriter-style letter reveal
- Shareable gift URL with Copy, Open and WhatsApp actions
- Netlify Function + Netlify Blobs storage for compact share URLs that can be opened on another device
- URL-fragment fallback when the backend is not available
- Responsive design, keyboard-friendly controls and reduced-motion support

## Recommended Netlify deployment (stored/short gift links)

1. Extract the ZIP. Create a GitHub repository and upload the **contents** of the `bloom-for-you` folder (the `index.html`, `styles.css`, `app.js`, `netlify.toml`, `package.json`, and `netlify/` folder should be at the repository root).
2. In Netlify, choose **Add new site → Import an existing project** and connect that repository.
3. Keep the build command empty and set the publish directory to `.`. The included `netlify.toml` sets the Functions directory.
4. Deploy the site. Netlify installs `@netlify/blobs` from `package.json` and deploys `netlify/functions/gifts.mjs` alongside the static files.
5. Open your deployed site, customize a gift, and select **Create their gift**. With the function available, it stores the gift in the site's Blobs store and gives you a compact link like `https://your-site.netlify.app/?gift=<id>`.
6. Send that URL. The recipient can open it on another device without an app or account.

Netlify Blobs credentials are configured automatically for deployed Functions. You do not need to add a separate storage API key. Blobs is persistent across deploys for the same site.

### Static-only deploy / local preview

If you open `index.html` locally, or deploy only static files without the Netlify Function, the app falls back to a compressed `#gift=...` URL that embeds the gift data. This can be a long URL, especially when media is included. For production sharing, use the Git-connected Netlify deployment above so the function can store the gift and return a compact link.

## Run locally

Open `index.html` in a modern browser to explore the editor and URL-fragment fallback. For the full storage flow, run `npm install` and then `npx netlify dev` with the Netlify CLI; Blobs local development requires the Netlify CLI context.

## Media and privacy

- Photos are resized in-browser and compressed to JPEG before being added to a gift.
- Music and voice-note uploads are limited to 800 KB each.
- Up to 3 photos are supported.
- Server-side JSON payloads are limited to approximately 4.5 MB.
- Gift links are **unlisted, not password-protected**. Anyone with the URL can open the page and its contents.
- This is a starter project, not a hardened public service. Before promoting it broadly, add rate limiting/abuse protection, a deletion or retention policy, and any moderation you need.
- Google Fonts is loaded online. If you need an offline version, remove the Google Fonts link in `index.html` and use the system font fallbacks.
