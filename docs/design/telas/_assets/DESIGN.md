---
name: Health Marketplace System
colors:
  surface: '#f9f9ff'
  surface-dim: '#d3daef'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f1f3ff'
  surface-container: '#e9edff'
  surface-container-high: '#e1e8fd'
  surface-container-highest: '#dce2f7'
  on-surface: '#141b2b'
  on-surface-variant: '#4a4453'
  inverse-surface: '#293040'
  inverse-on-surface: '#edf0ff'
  outline: '#7b7485'
  outline-variant: '#ccc3d6'
  surface-tint: '#713dcc'
  primary: '#420093'
  on-primary: '#ffffff'
  primary-container: '#5b21b6'
  on-primary-container: '#c7aaff'
  inverse-primary: '#d3bbff'
  secondary: '#006b5f'
  on-secondary: '#ffffff'
  secondary-container: '#6df5e1'
  on-secondary-container: '#006f64'
  tertiary: '#00306f'
  on-tertiary: '#ffffff'
  tertiary-container: '#00469a'
  on-tertiary-container: '#98b8ff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ebddff'
  primary-fixed-dim: '#d3bbff'
  on-primary-fixed: '#250059'
  on-primary-fixed-variant: '#581db3'
  secondary-fixed: '#71f8e4'
  secondary-fixed-dim: '#4fdbc8'
  on-secondary-fixed: '#00201c'
  on-secondary-fixed-variant: '#005048'
  tertiary-fixed: '#d8e2ff'
  tertiary-fixed-dim: '#adc6ff'
  on-tertiary-fixed: '#001a42'
  on-tertiary-fixed-variant: '#004395'
  background: '#f9f9ff'
  on-background: '#141b2b'
  surface-variant: '#dce2f7'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  title-md:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
  caption:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-sm: 0.75rem
  gutter-lg: 1.5rem
  margin: 1rem
  margin-sm: 0.75rem
  margin-lg: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

This design system delivers a contemporary, human-centered medical marketplace interface tailored for mobile-first workflows in Next.js and Tailwind CSS. Built to connect certified healthcare practitioners with patients and institutional care contractors, the aesthetic balances clinical credibility with warmth, accessibility, and modern software clarity.

The visual style blends **Corporate Modern** rigor with **Tactile Softness** inspired by shadcn/ui and Tailwind UI patterns. Key stylistic hallmarks include:
- High typographic legibility with tight layout cadence and generous tap boundaries (minimum 44px hit targets).
- Warm curved geometries (`rounded-xl` and `rounded-2xl`) that soften typical clinical coldness without sacrificing seriousness.
- Prominent semantic validation signals (verification checks, review rating pills, availability tags) that reinforce trust instantly.
- Calibrated visual contrast to ensure clarity under varying environmental lighting common in home care and hospital contexts.

## Colors

The color palette establishes an authoritative violet foundation paired with a medical teal secondary and serene sky blue accents:

- **Primary Violet (`#5B21B6`)**: Anchors primary buttons, key header actions, active state transitions, and high-impact identity surfaces.
- **Violet Accent Tiers**:
  - Light Violet (`#A78BFA`): Icon highlights, active borders, secondary badges, and subtle outlines.
  - Soft Violet Tint (`#E9D5FF`): Gentle background containers, chip fills, and active segmented tab backings.
- **Secondary Teal (`#14B8A6`)**: Dedicated to verified credential badges, certified clinician seals, confirmed status indicators, and positive success cues.
- **Tertiary Blue (`#3B82F6` / `#DBEAFE`)**: Used for contextual informational states, booking dates, and interactive calendar selections.
- **Neutrals**:
  - `Cinza 900` (`#111827`): High-contrast titles, principal body text, and structural focal points.
  - `Cinza 600` (`#4B5563`): Secondary descriptions, council registration tags (e.g., COREN/CRM), and timestamps.
  - `Cinza 300` (`#CBD5E1`): Subtle component borders, disabled boundaries, and divider rules.
  - `Cinza 100` (`#F1F5F9`): Inactive button fills, container backplates, and overall canvas backgrounds.
  - White (`#FFFFFF`): Primary card surfaces, modal dialogs, and input backgrounds.
- **Semantic Accents**:
  - Success: `#10B981` (tint: `#D1FAE5`)
  - Warning: `#F59E0B` (tint: `#FEF3C7`)
  - Error: `#EF4444` (tint: `#FEE2E2`)
  - Info: `#3B82F6` (tint: `#DBEAFE`)

## Typography

The typography leverages **Inter** across all touchpoints, optimized for dense mobile displays and fast optical scanning.

- **Scale & Hierarchy**:
  - `H1 / headline-xl` (32/40px, Semibold): Screen hero headers and primary value propositions.
  - `H2 / headline-lg` (24/32px, Semibold): Section titles, modal headings, and clinician full names.
  - `H3 / headline-md` (20/28px, Semibold): Card group titles, form block titles, and drawer headers.
  - `Body / body-lg` (16/24px, Regular): Long-form practitioner biographies and service requirements.
  - `Small / label-md` (14/20px, Medium): Form labels, professional registry credentials, and button labels.
  - `Caption / label-sm` (12/16px, Medium/Regular): Badge text, status tags, rating counters, and helper captions.
- **Legibility Rules**: Tight letter spacing (-0.01em to -0.02em) on headlines guarantees high editorial punch, while positive letter spacing on all 12px tags enhances legibility on OLED mobile screens.

## Layout & Spacing

The layout is built on a 4px baseline system within a 4-column fluid mobile grid (expanding to 8 columns on tablet and 12 columns on desktop frames).

- **Mobile Viewport Boundary**: Standard edge margin is `1rem` (16px), giving maximum screen real estate to clinician profiles and action forms while preventing edge touch collisions.
- **Rhythm & Stacking**:
  - `space-xs` (4px): Gap between badge icons and copy.
  - `space-sm` (8px): Spacing inside chips, pill buttons, and vertical label-to-input associations.
  - `space-md` (16px): Standard internal card padding, input internal padding, and inter-item list row separation.
  - `space-lg` (24px): Structural section spacing within scrollable views.
  - `space-xl` (32px): Separation between complete workflow steps or hero banner containers.
- **Mobile Action Bar Safe Zone**: Sticky bottom CTA containers incorporate a constant `env(safe-area-inset-bottom)` buffer with `16px` lateral and top interior padding.

## Elevation & Depth

Visual depth combines clean surface-layer separation with subtle, cool-toned ambient shadows to ensure cards pop without appearing cluttered:

- **Level 0 (Flat Canvas)**: Pure neutral-100 (`#F1F5F9`) or White background for high-focus form screens.
- **Level 1 (Card & Surface Elevation)**: Applied to professional search results and form blocks:
  - `box-shadow: 0 1px 3px 0 rgba(17, 24, 39, 0.05), 0 1px 2px -1px rgba(17, 24, 39, 0.05)`
  - Border: 1px solid `#E2E8F0` / `Cinza 300` at 60% opacity.
- **Level 2 (Dropdowns, Popovers & Floating Actions)**:
  - `box-shadow: 0 4px 6px -1px rgba(91, 33, 182, 0.08), 0 2px 4px -2px rgba(17, 24, 39, 0.05)`
- **Level 3 (Modals, Bottom Sheets & Critical Overlays)**:
  - `box-shadow: 0 20px 25px -5px rgba(17, 24, 39, 0.1), 0 8px 10px -6px rgba(17, 24, 39, 0.08)`
  - Backdrop: `rgba(17, 24, 39, 0.4)` with 4px backdrop blur (`backdrop-blur-sm`).

## Shapes

The design system embraces balanced, friendly curvature to communicate approachability and care:

- **Pill Shapes (`rounded-full`)**: Exclusively reserved for status badges (e.g., "Verificado", "Disponível hoje"), rating tags ("★ 4.9"), quick-filter chips, and practitioner avatar containers.
- **Secondary Large (`rounded-2xl` / 16px)**: Applied to high-level content cards, modal sheets, and clinician profile summary blocks.
- **Standard Controls (`rounded-xl` / 12px)**: Applied to interactive inputs, textareas, select menus, primary CTA buttons, and secondary action wrappers.
- **Nested Inner Items (`rounded-lg` / 8px)**: Applied to internal date tiles, segmented control indicators, and child alert banners.

## Components

### Buttons
- **Primary**: Background `#5B21B6`, text `#FFFFFF`, font weight 600, height 48px, `rounded-xl`. Hover/active transition to `#4C1D95` with active scale `0.98`.
- **Secondary / Outlined**: Border `1.5px solid #5B21B6`, text `#5B21B6`, background `#FFFFFF`. Hover uses `#F5F3FF`.
- **Ghost / Text**: Transparent background, text `#5B21B6`, hover background `#F5F3FF`.
- **Disabled**: Background `#F1F5F9`, text `#94A3B8`, border `1px solid #CBD5E1`, pointer-events disabled.

### Badges & Status Chips
- **Verificado**: Background `#CCFBF1`, text `#0F766E`, border `1px solid #99F6E4`, leading verified icon checkmark.
- **Disponível Hoje**: Background `#EDE9FE`, text `#6D28D9`, border `1px solid #DDD6FE`, clock or status dot indicator.
- **Rating**: Background `#FEF3C7`, text `#B45309`, border `1px solid #FDE68A`, leading filled star.
- **Category Tag (e.g. 'Home Care', 'Pós-operatório')**: Background `#F1F5F9`, text `#4B5563`, border `1px solid #E2E8F0`, pill curvature.

### Inputs & Form Elements
- **Text Inputs & Selects**: Height 48px, background `#FFFFFF`, border `1px solid #CBD5E1`, corner radius `12px` (`rounded-xl`), text `#111827`, placeholder `#9CA3AF`. Focus ring `2px solid #5B21B6` with 0px outline offset.
- **Search Bar**: Prepended with a search icon `#6B7280`, optional clear action, integrated directly into hero and listing tops.

### Cards (Clinician & Demands)
- White background (`#FFFFFF`), `1px solid #E2E8F0` border, `rounded-2xl` corner radius, `16px` padding.
- Structure: Avatar (56px circular) aligned with clinician name, category (e.g., "Enfermeira • COREN 123456"), rating badge, geographic distance indicator, and favorite bookmark toggle button.
- Bottom card metadata hosts category badges and a full-width primary contact CTA.

### Tabs & Segmented Navigation
- Inset pill container with `#F1F5F9` background, `rounded-xl` shape, with active tab styled in `#FFFFFF` with `Level 1` elevation and `#111827` active text. Inactive tabs use `#6B7280`.

### Alert Banners
- `rounded-xl` container with subtle border (`1px`) and pale semantic fill:
  - Success: `#D1FAE5` surface, `#065F46` copy, `#10B981` leading icon.
  - Warning: `#FEF3C7` surface, `#92400E` copy, `#F59E0B` leading icon.
  - Error: `#FEE2E2` surface, `#991B1B` copy, `#EF4444` leading icon.
  - Info: `#DBEAFE` surface, `#1E40AF` copy, `#3B82F6` leading icon.