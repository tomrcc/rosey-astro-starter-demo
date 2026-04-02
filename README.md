# Rosey Astro Starter

A multilingual Astro starter for [CloudCannon](https://cloudcannon.com/) using [Rosey](https://rosey.app/) for translation management and the [Rosey CloudCannon Connector](https://github.com/CloudCannon/rcc) (RCC v2) for inline visual editing of translations.

> **TODO:** The `rosey-cloudcannon-connector` dependency currently installs from GitHub (`github:tomrcc/rcc-v2`). Once the package is published to npm, update `package.json` to use the published version (e.g. `"rosey-cloudcannon-connector": "^2.0.0"`).

## Features

- **Multilingual with Rosey** — tag content with `data-rosey` attributes, and Rosey builds translated copies of your site from locale JSON files
- **Inline locale editing** — the RCC v2 injects a floating locale switcher in CloudCannon's Visual Editor, with ProseMirror editors on every translated element
- **Stale translation detection** — when source text changes, stale translations are flagged with an amber border and a count badge
- **Split-by-directory blog translation** — blog posts are translated via per-locale content collections (`blog_fr/`, `blog_de/`), giving editors full CMS control over translated articles
- **Visitor-facing locale picker** — a build-time component that lets visitors switch between language versions of the current page
- **Visual editing with [Editable Regions](https://cloudcannon.com/documentation/developer-guides/set-up-visual-editing/an-overview-of-editable-regions/)** — text, image, array, source, and component regions for editing original (source language) content
- **Page building** with reusable components (Hero, LeftRight, TextBlock)
- **Blog** with pagination and tags
- **[Tailwind CSS v4](https://tailwindcss.com/)** with CSS-first configuration
- **SEO** controls via `astro-seo`
- **[Pagefind](https://pagefind.app/)** search

## Getting Started

Click `Use this template` to make your own copy of the repository.

### Local Development

```bash
npm install
npm run dev
```

## How Multilingual Works

This starter uses a three-layer approach:

1. **Rosey** scans the built HTML for `data-rosey` attributes and generates `rosey/base.json` with all translatable keys. In postbuild, it builds translated copies of the site from locale JSON files.
2. **The RCC** (`rosey-cloudcannon-connector`) runs inside CloudCannon's Visual Editor. It injects a floating locale switcher that lets editors pick a locale, see translated content inline, and edit translations directly on the page.
3. **Split-by-directory** blog collections (`src/content/blog_fr/`, `src/content/blog_de/`) provide native CMS editing for long-form translated content. Rosey merges with these pages in postbuild, translating only the shared UI strings (`data-rosey` elements).

### The Postbuild Pipeline

The `.cloudcannon/postbuild` script runs after every CloudCannon build:

```bash
npx -y pagefind --site dist
npx rosey generate --source dist
npx rosey-cloudcannon-connector write-locales --source rosey --dest dist --locales fr,de
mv ./dist ./_untranslated_site
npx rosey build --source _untranslated_site --dest dist --default-language en --default-language-at-root --exclusions "\.(html?)$"
```

The `--exclusions "\.(html?)$"` flag overrides Rosey's default so that JSON files (`_rcc/locales.json`, `_cloudcannon/info.json`) pass through the build as assets.

### Tagging Content

Add `data-rosey` attributes to elements that should be translated:

```html
<h1 data-rosey="title">Welcome</h1>
```

Use `data-rosey-root` and `data-rosey-ns` for namespacing:

```html
<main data-rosey-root="index">
  <section data-rosey-ns="hero">
    <h1 data-rosey="title">Welcome</h1>  <!-- key: index:hero:title -->
  </section>
</main>
```

### Stable Translation Keys

Translation keys must be unique and stable across builds — if keys change when items are reordered or inserted, translations silently map to the wrong content. This starter demonstrates two strategies:

#### UUIDs for CMS-managed arrays (content blocks)

Content blocks use CloudCannon's `instance_value: UUID` to auto-assign a stable UUID when an array item is created. The UUID is used as a `data-rosey-ns` segment:

```astro
{content_blocks.map((block) => (
  <section data-rosey-ns={block._uuid}>
    <Component {...block} />
  </section>
))}
<!-- key: index:3f43d721-9c23-...:heading -->
```

The `_uuid` input is configured as `hidden: true` in `cloudcannon.config.yml` — editors never see it. Reordering, inserting, or deleting blocks has no effect on existing translation keys. See the `_structures.content_blocks` values and `Page.astro`.

#### Content-as-key for short strings (nav/footer links)

Navigation and footer links use the link text itself (slugified) as the key:

```astro
{header.links.map((link) => (
  <a href={link.link} data-rosey={link.text.toLowerCase().replace(/\s+/g, "-")}>
    {link.text}
  </a>
))}
<!-- key: nav:about, nav:blog, etc. -->
```

This is simpler — no hidden `_uuid` field needed. The trade-off: if an editor renames "About" to "Company", the old `nav:about` key is cleaned up by `write-locales` and a new `nav:company` entry appears with no translation, forcing a fresh translation. For short nav labels this is ideal. See `header.astro` and `footer.astro`.

#### When to use which

| Strategy | Best for | Stale detection | Key readability |
|----------|----------|-----------------|-----------------|
| UUID (`instance_value`) | CMS arrays (page builder blocks, feature lists) | Full | Low (UUIDs in keys) |
| Content-as-key (slugified text) | Short stable strings (nav, footer, buttons) | None (forces re-translation) | High |
| Static descriptive | Hand-authored templates, single elements | Full | High |

All three are valid — see the [RCC tagging docs](https://github.com/CloudCannon/rcc/blob/main/docs/tagging-content.md) for full details.

### RCC Import

The connector loads only inside CloudCannon's Visual Editor:

```html
<script>
  if (window.inEditorMode) {
    import("rosey-cloudcannon-connector");
  }
</script>
```

## Adding a New Locale

1. Add the locale code to the `write-locales` command in `.cloudcannon/postbuild` (e.g. `--locales fr,de,es`)
2. Add a `data_config` entry in `cloudcannon.config.yml`:
   ```yaml
   data_config:
     locales_es:
       path: rosey/locales/es.json
   ```
3. If using split-by-directory blog translation, create the content collection (`src/content/blog_es/`) and add the locale to `src/lib/locales.ts`
4. Rebuild — `write-locales` creates the new locale file and the RCC picks it up automatically

## Split-by-Directory Blog

Blog posts use per-locale content collections instead of Rosey for body content:

- `src/content/blog/` — English (source)
- `src/content/blog_fr/` — French
- `src/content/blog_de/` — German

Each collection is a full CMS collection in CloudCannon. Editors create and manage translated posts like any normal content. The SSG builds locale pages to `/fr/blog/[slug]/` and `/de/blog/[slug]/` via dynamic `[locale]` routes.

Locale configuration lives in `src/lib/locales.ts`:

```typescript
export const locales = {
  fr: { collection: "blog_fr", label: "French", dateLocale: "fr-FR" },
  de: { collection: "blog_de", label: "German", dateLocale: "de-DE" },
};
```

Shared UI strings on blog pages (breadcrumbs, sidebar headings, etc.) still use `data-rosey` and are translated via Rosey.

## Working with Content

### Adding content to a landing page

Landing pages are built from a `hero_block` and a `content_blocks` array of reusable components (Hero, LeftRight, TextBlock). To add content, add a new block via the CloudCannon Visual Editor or edit the page's front matter in `src/content/pages/*.md` directly.

No code changes are needed — the existing components already have `data-rosey` attributes on their translatable elements (`heading`, `text_content`, `button_text`, `subheading`). New blocks inherit this automatically.

**Translation flow:** CloudCannon auto-assigns a `_uuid` to each new block. On the next build, Rosey detects the new `data-rosey` keys under that UUID's namespace, and `write-locales` adds untranslated entries to each locale file (seeded with the original text as a fallback). The new content then needs translating — either inline via the RCC's locale switcher, in the Locales collection sidebar, or with the [AI translation skill](#ai-powered-translation).

For strategies on rolling out translations progressively rather than all at once, see the [Incremental Translation guide](https://github.com/CloudCannon/rcc/blob/main/docs/incremental-translation.md).

### Adding a new landing page

Add a new `.md` file in `src/content/pages/` (or use CloudCannon's "Add New Page" button). The `[...slug].astro` catch-all route picks it up automatically — no new route files or code changes needed.

**Rosey key namespacing** is handled automatically. `Layout.astro` sets `data-rosey-root` on `<main>` to the page's URL slug, and `Page.astro` applies `data-rosey-ns="hero"` to the hero and `data-rosey-ns={_uuid}` to each content block. For example, a page at `src/content/pages/services.md` gets keys like `services:hero:heading`, `services:<uuid>:text_content`, etc.

**Translation flow** is the same as adding content to an existing page — after a build, `write-locales` adds all new keys to each locale file, and they need translating. Until translated, locale pages show the original-language text as a fallback. See the [Incremental Translation guide](https://github.com/CloudCannon/rcc/blob/main/docs/incremental-translation.md) for strategies on translating new pages progressively.

### Adding a new blog post

Blog posts use the [split-by-directory](#split-by-directory-blog) approach. The English post and each translated version are separate content files.

**English post:** Create a new `.mdx` file in `src/content/blog/`. The `blog/[slug].astro` route picks it up. The post hero heading is tagged with `data-rosey="heading"` for Rosey translation, and the body is edited inline as MDX.

**Translated posts:** For each locale, create a matching `.mdx` file with the **same filename** in the locale's blog collection (`src/content/blog_fr/`, `src/content/blog_de/`, etc.). The filename must match because locale routes resolve posts by slug. Each translated post has its own frontmatter and body content, fully managed as a CMS collection — editors work with them like any normal blog post.

**What Rosey handles vs. what the locale post handles:**

| Layer | What it covers |
|-------|----------------|
| Locale post (split-by-directory) | Title, hero, body content, tags, author — everything in the post's own frontmatter and MDX body |
| Rosey (locale JSON files) | Shared UI strings — "Recent Posts", nav links, footer text, and any other `data-rosey` elements in the layout |

The `Post.astro` layout passes `suppressRosey={!!locale}` to `PostHero`, which prevents the heading from being double-tagged on locale posts. Locale pages also set `roseyRoot` to `blog/{slug}` (matching the English path) so that shared Rosey keys align correctly across all language versions.

## AI-Powered Translation

This starter includes agent skills in the `skills/` directory that guide AI coding assistants through translation and other multilingual workflows. Tell your AI assistant:

> "Read skills/translate-locale-files/SKILL.md and skills/translate-content-collections/SKILL.md. Use them to translate any untranslated content on this site."

The agent reads both skills, identifies untranslated entries in Rosey locale JSON files and in split-by-directory content collections, translates them in context-aware batches, and writes back valid files — without re-translating existing work.

### Available Skills

| Skill | Purpose |
|-------|---------|
| `translate-locale-files` | Translate untranslated and stale entries in Rosey locale JSON files |
| `translate-content-collections` | Translate split-by-directory content collection files (blog posts, etc.) |
| `make-site-multilingual` | Set up Rosey/RCC/CloudCannon from scratch on a single-language site |
| `migrate-i18n-to-rosey` | Replace an existing i18n system with Rosey |
| `migrate-rcc-v1-to-v2` | Upgrade from RCC v1 to v2 |

For custom script and manual LLM workflows, see the [AI Translation docs](https://github.com/CloudCannon/rcc/blob/main/docs/ai-translation.md) in the RCC repo.

## CloudCannon Setup

This site is pre-configured for CloudCannon. Connect your repository and CloudCannon will detect the configuration in `.cloudcannon/initial-site-settings.json` and build your site automatically.

Key config files:
- `cloudcannon.config.yml` — collections, data config, editing UI, input definitions
- `.cloudcannon/postbuild` — the Rosey build pipeline
- `.cloudcannon/initial-site-settings.json` — build settings (includes `CLOUDCANNON_SYNC_PATHS=/rosey/` so locale files persist between builds)

### Editable Regions

This starter uses [Editable Regions](https://cloudcannon.com/documentation/developer-guides/set-up-visual-editing/an-overview-of-editable-regions/) for visual editing of source-language content:

- **Text** (`data-editable="text"`) — inline editing of front matter text values
- **Image** (`data-editable="image"`) — inline editing of front matter image values
- **Array** (`data-editable="array"`) — page building with reorderable content blocks
- **Source** (`data-editable="source"`) — editing standalone `.astro` pages directly
- **Component** (`<editable-component>`) — live re-rendering of Astro components

Components are registered in `src/scripts/register-components.ts` and loaded conditionally in the Visual Editor.

## Project Structure

```
├── .cloudcannon/              # CloudCannon schemas and postbuild
├── cloudcannon.config.yml     # CloudCannon configuration
├── data/                      # Site-wide data files (navigation, site settings, tags)
├── public/                    # Static assets
├── rosey/                     # Rosey translation files
│   ├── base.json              # Generated: all translatable keys from the build
│   └── locales/               # Locale files (fr.json, de.json)
└── src/
    ├── components/            # Astro components (heroes, navigation, blog, etc.)
    ├── content/
    │   ├── pages/             # Page content (Markdown + Astro source pages)
    │   ├── blog/              # English blog posts (MDX)
    │   ├── blog_fr/           # French blog posts
    │   └── blog_de/           # German blog posts
    ├── layouts/               # Page layouts (Layout, Page, Post, Paginated)
    ├── lib/locales.ts         # Locale configuration for split-by-directory blog
    ├── pages/                 # Astro routes (includes [locale]/ dynamic routes)
    ├── scripts/               # Component registration for visual editing
    └── styles/                # Global CSS (Tailwind v4)
```
