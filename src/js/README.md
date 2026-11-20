# Homepage frontend modules

The homepage remains a static site using native HTML, CSS and JavaScript ES modules.
No framework or runtime bundler is required.

## JavaScript entry

- `main.js`: page bootstrap and coordination only.
- `core/`: locale detection, browser helpers, config loading and data normalization.
- `components/`: DOM rendering for profile, cards, social links, quotes and presence.
- `features/`: clipboard, likes/analytics and progressive avatar loading.
- `animations/`: page intro sequence and avatar flair animation.

## Startup sequence

1. Resolve the visitor locale.
2. Load the matching JSON config, then fall back to the other locale.
3. Apply profile labels and normalize configured links.
4. Initialize avatar media, likes and quote state.
5. Render social links.
6. Start the intro sequence, then reveal cards and quotes.
7. Bind quote interactions and resize handling.

## CSS entry

`../css/main.css` imports the ordered CSS partials:

- `base.css`
- `components.css`
- `avatar.css`
- `animations.css`
- `layout.css`

The import order is intentional and preserves the previous cascade.

## Conventions

- Keep business state inside the feature/controller that owns it.
- Pass cross-module dependencies explicitly.
- Avoid importing `main.js` from feature modules.
- Keep page-specific orchestration in `main.js`.
- Preserve static deployment: all module and stylesheet paths are relative to the site root.
- Run `npm run validate` before merging. It checks JavaScript syntax, rebuilds Tailwind CSS and verifies the generated stylesheet is up to date.
