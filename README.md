# Assets Directory

- `Aaron_Koshy_Parayil_Resume.pdf` — the resume, linked from the header and hero.
- `images/aaron-portrait.webp` — hero player-card photo (4:5 crop, ~29 KB).

> Original iPhone photos (`.HEIC`) are git-ignored — browsers can't show them.
> Convert to `.webp` before using a new photo on the site.

When you change `css/style.css` or anything in `js/`, bump the `?v=` number on its
`<link>` / `<script>` tag in `index.html` so browsers fetch the new file instead of a cached one.
