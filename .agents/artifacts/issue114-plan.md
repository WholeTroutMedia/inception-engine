# The Operator Creative Studio � Immersive Portal Rebuild

**Phase:** PLAN
**Origin:** NAVD ideation session (Issue #113) + live site audit
**Replaces:** operator-photography.vercel.app + justinaharoni.com (SquareSpace)
**Target domain:** operator.com / justinaharoni.com

---

## Vision

This is not a photography portfolio. It is a **creative director's immersive studio** � a living, breathing portal to photography, video, AI-generated media, and application development. The site is the public proof of Creative Liberation Engine's capability, orchestrated by Justin.

The internet is splintering. This site is the counter � a place people come to and **stay**.

---

## Identity

- **Name:** The Operator
- **Title:** Creative Director (not "Photographer")
- **Mediums:** Photography, Video, AI Creations, Application Development
- **Tagline direction:** Something that communicates orchestration across visual mediums � not a single discipline

---

## Architecture: Rooms, Not Pages

The site is structured as connected spaces in a studio, not traditional navigation pages.

### 1. The Gallery Floor (Entry Point)
- Full-screen immersive media wall
- Photography, video, AI creations � **all mixed together**
- Filterable by medium: Photo / Video / AI / Mixed
- Scroll-driven transitions between pieces
- Each piece expands into immersive detail view:
  - Photos: full-bleed lightbox
  - Video: inline playback with ambient audio
  - AI art: prompt/process story alongside the piece
- **This is where the D: drive and NAS media trove lives**
- Content fed dynamically from Firebase Storage via admin panel

### 2. The Shop (Layer, Not Page)
- Integrated directly into the gallery � not a separate destination
- Any piece can carry an "Available as Print" or "Digital Download" tag
- Click-through to size/format selection and purchase
- AI creations become purchasable art
- Photography becomes limited edition prints
- Commerce: Stripe checkout or Shopify Buy Button
- The shop is a **layer on top of the gallery** � browse art, see something, buy it without leaving the experience

### 3. The Screening Room
- Dedicated space for video work
- Dark-room experience � autoplay with ambient sound
- Reel, projects, behind-the-scenes, commercial work, event coverage
- Scroll through like a film festival program
- Not YouTube embeds � native video player with custom controls matching the site aesthetic

### 4. The Journal (Essays)
- Editorial longform with embedded media
- Each essay is a full-page magazine spread with parallax images, pull quotes, photography woven through text
- Essays surface within the main stream AND accessible from nav
- Builds authority + SEO simultaneously
- Content from existing essay archive (Finding Light in Chaos, etc.)

### 5. The Studio (About)
- Not a traditional about page
- Show the workspace, the process, the tools
- Where Creative Liberation Engine gets its subtle reveal:
  > "This entire site � its galleries, its shop, its dynamic content � is powered by a system I built called Creative Liberation Engine."
- Not a sales pitch. A demonstration. The site IS the proof.
- Visitors experience it before they understand it

### 6. Collaborate (Contact)
- Positioned as collaboration inquiry, not "hire me for a shoot"
- "Let's build something together"
- Contact form with project type selector (existing form is solid)
- Communicates full creative director range: photography, video, AI media, custom applications

---

## Atmosphere & Experience Design

### Visual Language
- **Dark theme** � the existing glassmorphism palette with mustard yellow (#d4a017) accents is strong
- Dark is the **stage**, not a container � black gallery walls, single spot-lit media
- Subtle film grain texture on background (darkroom feel)
- Media is the only source of light on the page

### Motion & Interaction
- **Ambient motion:** subtle particle effects, smooth scroll-triggered animations
- **WebGL background canvas** responding to cursor position (not flashy � atmospheric)
- **Transition design:** moving between rooms is a spatial transition (dissolve, pan, ambient color shift) � not a page load
- **Cursor interaction:** custom cursor that reacts to content � grows over clickable elements, reveals previews on hover
- **Intersection Observer** driven lazy-loading for the continuous stream

### Sound Design
- Optional, off by default
- SOUND [OFF/ON] toggle (reference: Phantom Studios)
- Ambient layer that shifts based on what's on screen
- The ones who turn it on will stay longer than anywhere else on the internet

---

## Security Plan

### Authentication
- [ ] Re-enable Firebase Authentication on /admin routes
- [ ] Create admin user in Firebase Console
- [ ] ProtectedRoute.tsx restored with Firebase auth checks
- [ ] /admin is NEVER publicly accessible without auth

### Firebase Security Rules
- [ ] Firestore rules: read-only for public, write requires auth
- [ ] Storage rules: public read for published media, write requires auth
- [ ] Apply rules documented in FIREBASE_SECURITY_SETUP.md

### Environment & Secrets
- [ ] All Firebase config in Vercel environment variables (not committed)
- [ ] Stripe API keys in environment variables only
- [ ] No secrets in client-side bundle

### Content Security
- [ ] Image hotlink protection via Firebase Storage rules
- [ ] Rate limiting on contact form API
- [ ] CORS configured for operator.com domain only
- [ ] CSP headers configured in vercel.json

### Domain & DNS
- [ ] operator.com DNS pointed to Vercel (when ready)
- [ ] SSL/TLS via Vercel automatic certificates
- [ ] SquareSpace subscription cancelled AFTER DNS propagation confirmed

---

## Technical Architecture

### Existing Infrastructure (Keep)
- **Firebase:** Firestore (content DB) + Storage (media files) + Auth
- **Vercel:** Hosting + deployment pipeline
- **Next.js:** Framework (already deployed)
- **Admin Panel:** Dashboard, Media, Backgrounds, Gallery, Essays, Shop, Homepage, Settings sections already built
- **GitHub repo:** Creative Liberation Engine Community/operator-photography

### Front-End Rebuild
- Strip current "app-like" UI (cards, widgets, weather, multilingual greeting, AI search bar)
- Replace with full-bleed, scroll-driven, immersive presentation
- Single continuous scroll experience with room transitions
- Custom cursor + WebGL ambient canvas
- Responsive: mobile-first but desktop is the flagship experience
- Framework: Next.js 14 App Router (already in place)
- Animation: Framer Motion + GSAP for scroll-driven effects
- 3D/WebGL: Three.js or React Three Fiber for ambient background

### Media Pipeline
- NAS/D: drive media ? Firebase Storage (bulk upload via admin)
- Admin panel tags media: medium (photo/video/AI), category, availability (for sale/display only), price
- Front-end queries Firestore for curated stream, pulls media from Storage
- Video: hosted on Firebase Storage or Mux for adaptive streaming

### Commerce Layer
- Stripe Checkout for print purchases + digital downloads
- Product records in Firestore (linked to media items)
- Order confirmation via Firebase Cloud Functions
- Print fulfillment: manual initially, Prodigi/Printful API later

### AI Search (Repurposed)
- The existing AI search bar concept makes sense here � not on the homepage, but as a **stream navigator**
- "Show me night photography" / "Find AI art" / "Video work"
- Implemented as filtered search over Firestore tags, not a chatbot
- Optional: Creative Liberation Engine semantic search over media descriptions

---

## Content Migration Plan

### Phase 1: Seed Content (Before Launch)
- [ ] Select 30-50 strongest pieces from NAS/D: drive
- [ ] Mix: ~15 photos, ~10 AI creations, ~5 videos, ~5 mixed/experimental
- [ ] Upload to Firebase Storage via admin panel
- [ ] Tag each piece: medium, category, title, description, purchasable (y/n), price
- [ ] Migrate essay content from current site (Finding Light in Chaos + others)

### Phase 2: SquareSpace Archive
- [ ] Export all media from justinaharoni.com SquareSpace
- [ ] Catalog and tag
- [ ] Upload to Firebase Storage
- [ ] Map existing galleries to new filter categories

### Phase 3: Ongoing Pipeline
- [ ] New work flows from creative process ? NAS ? admin panel ? live site
- [ ] Creative Liberation Engine automates tagging and classification (future)
- [ ] Site is always fresh because the engine feeds it

---

## Execution Sequence

| Step | What | Depends On | Agent |
|------|-------|-----------|-------|
| 1 | Seed content: upload 30-50 pieces to Firebase Storage via admin | Access to NAS/D: | Justin + NAVD |
| 2 | Re-enable Firebase auth on /admin | Firebase Console access | NAVD |
| 3 | Apply Firebase security rules | Firebase Console access | NAVD |
| 4 | Front-end rebuild: strip current UI, build immersive stream | Step 1 (needs real content to design against) | Creative Liberation Engine + NAVD |
| 5 | Commerce integration: Stripe checkout on media items | Step 4 | Creative Liberation Engine |
| 6 | Sound design: ambient audio layer | Step 4 | Justin (creative direction) |
| 7 | WebGL ambient canvas + cursor interactions | Step 4 | Creative Liberation Engine |
| 8 | AI search / stream navigator | Step 4 | NAVD |
| 9 | QA: responsive, performance, accessibility | Steps 4-8 | NAVD + LOGD |
| 10 | DNS: point operator.com to Vercel | Step 9 | Justin |
| 11 | Cancel SquareSpace | Step 10 confirmed | Justin |

---

## Reference Sites

- **Phantom Studios** (phantom.land) � immersive dark grid, filter tags, sound toggle, studio energy
- **Immersive Garden** (immersive-g.com) � scroll-driven experience, minimal chrome, work speaks
- **Clevershot** (clevershot.co.uk) � full-screen mega menu, brand color accents
- **Zenn's Photo** � background changes on hover over service links, cursor shapeshifts
- **Pixieset dark templates** (Onyx, Berlin, Sedona, Vienna) � cinematic dark photography showcase

---

## What This Is NOT

- Not a photography portfolio template
- Not a blog with a gallery sidebar
- Not a SquareSpace clone with a dark theme
- Not an app with nav bars and cards and widgets
- Not a static site that needs manual updates

## What This IS

- An immersive studio space where people come and stay
- A living portal powered by Creative Liberation Engine
- A showcase across ALL mediums: photo, video, AI, applications
- A storefront where art is purchased inside the experience
- The front door to everything The Operator creates
- Proof that the internet doesn't have to be splintered

---

*Filed by NAVD � March 10, 2026*
*Origin: IDEATE session on Issue #113 ? Google Core Coding Experience ? site audit ? creative direction session*