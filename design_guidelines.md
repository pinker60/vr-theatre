# VR Theatre - Design Guidelines

## Design Approach
**Reference-Based Strategy**: Drawing inspiration from premium streaming platforms (Netflix, Vimeo) and immersive VR experiences, balanced with theatrical sophistication. The design prioritizes visual storytelling while maintaining professional credibility for theatre content creators and vendors.

**Key Principles**:
- Cinematic immersion with theatrical elegance
- Content-first approach with minimal UI interference
- Professional trust-building for seller registration
- Seamless transition between 2D browsing and VR mode

---

## Core Design Elements

### A. Color Palette

**Primary Colors**:
- Deep Theatre Blue: 230 45% 15% (headers, navigation, primary CTAs)
- Stage Indigo: 245 35% 25% (secondary elements, cards hover states)

**Neutral Foundation**:
- Light Background: 240 10% 97% (main background)
- Card Surface: 0 0% 100% (content cards, forms)
- Text Primary: 230 20% 20% (body text)
- Text Secondary: 230 10% 50% (supporting text)

**Accent Colors**:
- Spotlight Gold: 45 85% 55% (premium features, VR mode indicators - use sparingly)
- Success Green: 145 65% 45% (verified badges, successful actions)
- Alert Red: 0 70% 55% (errors, critical actions)

**VR Mode Overlay**: 270 40% 10% with 85% opacity for immersive dark UI over VR content

### B. Typography

**Font Families**:
- Headlines: 'Playfair Display' (theatrical sophistication) - weights 600, 700
- Body & UI: 'Inter' (modern readability) - weights 400, 500, 600
- Monospace: 'JetBrains Mono' (technical data like duration, IDs) - weight 400

**Type Scale**:
- Hero Headline: text-6xl (3.75rem) / text-5xl mobile
- Section Headers: text-4xl (2.25rem) / text-3xl mobile
- Card Titles: text-xl (1.25rem)
- Body Text: text-base (1rem)
- Captions: text-sm (0.875rem)

### C. Layout System

**Spacing Primitives**: Use Tailwind units of 4, 6, 8, 12, 16, 20, 24 for consistent rhythm
- Component padding: p-6 (cards), p-8 (sections mobile), p-16 (sections desktop)
- Vertical spacing: space-y-8 (card grids), space-y-12 (page sections)
- Container max-width: max-w-7xl with px-4 md:px-8 for edge breathing

**Grid System**:
- Content Feed: grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6
- Feature Sections: grid-cols-1 lg:grid-cols-2 gap-12
- Seller Dashboard: grid-cols-1 md:grid-cols-3 gap-6 (stats cards)

### D. Component Library

**Navigation**:
- Fixed top navbar with backdrop-blur-lg bg-white/90
- Logo left, main nav center, profile/auth right
- Mobile: hamburger menu with full-screen overlay

**Content Cards**:
- Aspect ratio 16:9 for preview images
- Hover: subtle scale-105 transform with shadow-xl
- Overlay gradient from transparent to black/80 for text legibility
- Play icon centered, info badge top-right, duration bottom-left

**VR Player Controls**:
- Floating bottom bar with glass-morphism (backdrop-blur-md bg-black/40)
- Large circular play/pause button center
- VR toggle prominent top-right with pulsing indicator when active
- Timeline scrubber with preview thumbnails on hover

**Forms (Auth/Profile/Seller)**:
- Input fields: border-2 border-gray-200 focus:border-indigo-500 rounded-lg p-3
- Labels: text-sm font-medium text-gray-700 mb-2
- GDPR checkbox: custom styled with checkmark animation
- Submit buttons: w-full gradient from primary to secondary blue

**Authentication Pages**:
- Split layout: 50% form, 50% hero image (theatrical stage imagery)
- Form container: max-w-md with p-8, shadow-2xl, rounded-2xl

**Seller Registration**:
- Multi-step wizard with progress indicator
- Stripe integration shown with trust badges (lock icons, "Test Mode" indicator)
- Success state: animated checkmark with confetti micro-interaction

### E. Images & Media

**Hero Section** (Home):
- Full-width cinematic banner: h-screen with parallax scroll effect
- Featured VR theatre performance with dark gradient overlay
- Headline overlay: centered, white text with text-shadow for depth
- CTA: dual buttons (Browse Content / Become a Seller) with glass-morphism

**Content Cards**:
- High-quality theatre stills, 16:9 ratio
- On hover: slight zoom + play icon fade-in
- Category badge overlay (Drama, Comedy, Ballet, Opera)

**Profile Section**:
- Circular avatar: w-32 h-32 with ring-4 ring-indigo-500
- Upload area: dashed border-2 with camera icon placeholder

**VR Mode Page**:
- Immersive black background
- 360° video/3D scene occupies 80% viewport
- Minimal UI: translucent controls appear on mouse movement, fade after 3s

### F. Interactive States

**Hover Effects**:
- Cards: transform scale-105 transition-transform duration-300
- Buttons: brightness-110 with subtle shadow expansion
- Links: underline decoration-2 underline-offset-4

**Loading States**:
- Content feed: skeleton cards with shimmer animation
- VR player: spinning theatre curtain icon
- Forms: disabled state with opacity-60 and cursor-not-allowed

**Empty States**:
- No content: illustrated theatrical mask with "No performances yet"
- No search results: spotlight illustration with suggestion text

---

## Page-Specific Layouts

**Home/Feed**:
- Hero: full-viewport with featured VR content (h-screen)
- Filter bar: sticky top-20, flex justify-between with dropdowns
- Infinite scroll grid with intersection observer triggers

**VR Mode**:
- Fullscreen takeover with ESC to exit indicator
- Controls: bottom-anchored, auto-hide after 3s of inactivity
- Info panel: slide-in from right with production details

**Profile**:
- Two-column: Avatar/bio left (33%), settings/preferences right (66%)
- Tab navigation: History, Favorites, Preferences
- Verification badge prominent next to name

**Seller Registration**:
- Centered card layout: max-w-2xl
- Progress steps: 1) Theatre Info, 2) Tax Details, 3) Stripe Connect
- Each step: slide-in animation with back/next navigation

**Privacy/Legal**:
- Single column: max-w-4xl, prose styling for readability
- Sticky ToC sidebar on desktop for quick navigation

---

## Accessibility & Responsiveness

- Focus states: ring-2 ring-offset-2 ring-indigo-500 for all interactive elements
- ARIA labels for icon-only buttons, role="region" for VR player
- Keyboard navigation: tab order optimized, VR controls accessible via spacebar
- Color contrast: all text meets WCAG AA (4.5:1 for body, 3:1 for large text)
- Mobile breakpoints: 640px (sm), 768px (md), 1024px (lg), 1280px (xl)
- Touch targets: min 44x44px for all clickable elements