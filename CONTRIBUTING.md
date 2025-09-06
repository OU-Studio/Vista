# Contributing Guidelines

Thank you for considering contributing to the Horizon Free Theme project.  
This project is structured to be consistent, token-driven, and Horizon-ready.

## How to Contribute
1. **Fork the repository** and create your branch from `main`.
2. **Follow the design token system.**  
   - All typography, spacing, color, radius, shadows, icons, and motion must reference tokens defined in `tokens.css`.
   - Avoid hardcoded pixel values or hex codes in sections.
3. **Section Standard.**  
   - Wrap sections in `<section class="sec ...">` and include settings for padding and background.
   - All new sections should include schema entries for spacing and background.
4. **Accessibility.**
   - Use semantic HTML elements.
   - Provide `aria` attributes where needed.
   - Ensure focus states are visible.
5. **Performance.**
   - Do not introduce large libraries or unnecessary JavaScript.
   - Use lazy-loading for images and media where possible.
6. **Testing.**
   - Run `shopify theme check` before submitting a PR.
   - Check Lighthouse scores (performance, accessibility).

## Pull Request Process
1. Create your PR against the `main` branch.
2. Ensure your code is formatted with Prettier and passes lint checks.
3. Provide a clear description of what the change does.
4. The maintainers will review and request changes if needed.
5. Once approved, your PR will be merged.

---

By contributing to this project, you agree to follow the Code of Conduct.
