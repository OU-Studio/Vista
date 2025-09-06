# Vista Shopify Theme v1

Vista is a Shopify Online Store 2.0 / Horizon-ready theme.  
It ships with a lean set of core sections (15–20), a global design token system, and an optional Pro Blocks app for advanced features.

---

## Overview
- Free base theme: clean, fast, accessible.  
- Core sections: hero, image/text, testimonials, FAQ, featured product, featured collection, blog grid, gallery, contact form, header/footer, etc.  
- Design system: everything (typography, colors, spacing, icons) runs on tokens defined in `tokens.css` and mapped to theme settings.  
- Pro App: optional companion app that unlocks advanced blocks (bundles, carousels, countdowns, UGC, etc.).

---

## Development Setup
1. Install [Shopify CLI](https://shopify.dev/docs/themes/tools/cli).  
2. Clone the repository.  
3. Run the theme locally:

   ```bash
   shopify theme dev
   ```

4. Deploy to a development store:

   ```bash
   shopify theme push
   ```

---

## Design Tokens
Tokens are global CSS variables defined in `assets/tokens.css`.  
They are updated via `config/settings_schema.json` and injected into `<style>` in `theme.liquid`.

- Typography: fonts, scale, line height, letter spacing  
- Colors: background, surface, text, muted, primary, secondary  
- Layout: container width, gutter, spacing scale  
- Shape: corner radius, shadow depth  
- Icons: icon pack, stroke width  
- Motion: animation speed, reduced motion support

All sections must reference tokens. Avoid hard-coded colors, pixel values, or fonts.

---

## Sections
Each section:
- Wraps content in `<section class="sec …">` with padding/background controls  
- Respects tokens for spacing, typography, and colors  
- Lives in `sections/` with a matching schema  

**Core MVP sections:**
- Header  
- Footer  
- Hero banner  
- Image with text  
- Rich text / heading  
- Video with text  
- Testimonials  
- FAQ accordion  
- About/team grid  
- Featured product  
- Featured collection  
- Collection list  
- Product carousel  
- Announcement bar  
- Newsletter signup  
- Blog posts grid  
- Gallery / image grid  
- Contact form  

---

## License
- Based on [Shopify Dawn](https://github.com/Shopify/dawn) (MIT license).  
- All custom work © 2025 [Your Studio].  
- See `LICENSE` for details.

---

## Roadmap
- Base theme skeleton  
- Token system + global settings  
- Core MVP sections  
- Pro Blocks App (recurring revenue)  
- Horizon compound block groups  
- Style kits and presets
