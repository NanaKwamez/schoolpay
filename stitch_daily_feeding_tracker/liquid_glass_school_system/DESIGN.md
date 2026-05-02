---
name: Liquid Glass School System
colors:
  surface: '#f8f9fa'
  surface-dim: '#d9dadb'
  surface-bright: '#f8f9fa'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f4f5'
  surface-container: '#edeeef'
  surface-container-high: '#e7e8e9'
  surface-container-highest: '#e1e3e4'
  on-surface: '#191c1d'
  on-surface-variant: '#404943'
  inverse-surface: '#2e3132'
  inverse-on-surface: '#f0f1f2'
  outline: '#707973'
  outline-variant: '#bfc9c1'
  surface-tint: '#2c694e'
  primary: '#0f5238'
  on-primary: '#ffffff'
  primary-container: '#2d6a4f'
  on-primary-container: '#a8e7c5'
  inverse-primary: '#95d4b3'
  secondary: '#865300'
  on-secondary: '#ffffff'
  secondary-container: '#fea520'
  on-secondary-container: '#694000'
  tertiary: '#00478a'
  on-tertiary: '#ffffff'
  tertiary-container: '#235fa8'
  on-tertiary-container: '#c7daff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#b1f0ce'
  primary-fixed-dim: '#95d4b3'
  on-primary-fixed: '#002114'
  on-primary-fixed-variant: '#0e5138'
  secondary-fixed: '#ffddb9'
  secondary-fixed-dim: '#ffb961'
  on-secondary-fixed: '#2b1700'
  on-secondary-fixed-variant: '#663e00'
  tertiary-fixed: '#d5e3ff'
  tertiary-fixed-dim: '#a7c8ff'
  on-tertiary-fixed: '#001b3c'
  on-tertiary-fixed-variant: '#004689'
  background: '#f8f9fa'
  on-background: '#191c1d'
  surface-variant: '#e1e3e4'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  touch-target-min: 60px
  base-unit: 8px
  margin-mobile: 20px
  margin-tablet: 32px
  gutter: 16px
---

## Brand & Style
The brand personality for this design system is academic, organized, and encouraging. It targets a multi-generational user base—from tech-savvy students to busy administrators and parents—demanding a UI that feels both authoritative and approachable. 

The visual style employs a **"Liquid Glass"** aesthetic. This is a refined evolution of Material Design 3, blending the structured logic of Android with the organic depth of glassmorphism. It prioritizes clarity through whitespace while using translucent layers and subtle background blurs to suggest a physical stack of information. The result is an interface that feels lightweight and modern, reducing the cognitive load of complex data management through perceived depth and softness.

## Colors
The palette is rooted in institutional trust and vibrant energy.
*   **Primary Green:** A deep, scholarly green used for main navigation, primary actions, and branding. It signifies growth and stability.
*   **Warm Orange:** Reserved for credits, financial alerts, and motivational "high-five" moments. It provides a warm contrast to the cooler primary tones.
*   **Trust Blue:** Used for information, links, and secondary interactive elements to signify reliability.
*   **Soft Grey & White:** The foundation of the "Liquid Glass" effect. Backgrounds remain clean white, while containers use ultra-soft greys and translucent white overlays to create the glass effect.

## Typography
This design system utilizes **Inter** for all typographic needs. Its neutral and systematic nature ensures that dense school data (schedules, grades, rosters) remains highly legible across various screen sizes.

Headlines use tight letter spacing and heavier weights to provide clear section anchors. Body text is set with generous line height to improve readability during long reading sessions. Labels utilize a slight uppercase tracking for better differentiation when used in navigation and data metadata.

## Layout & Spacing
The layout follows a fluid 8dp grid system adapted for high-frequency touch interactions. A strict **60px minimum height** is enforced for all interactive targets—buttons, list items, and input fields—to accommodate users on the move or with varying motor precision.

The spacing rhythm uses multiples of 8px. Layouts should utilize "safe zones" with 20px side margins on mobile, expanding as the viewport grows. Content is organized into "Glass Cards" that span the full width of the container minus margins, creating a consistent vertical flow.

## Elevation & Depth
Depth is the core of this design system. Unlike traditional material shadows, "Liquid Glass" depth is achieved through three layers:
1.  **Backdrop Blur:** Surfaces use a 12px to 20px Gaussian blur on the content behind them.
2.  **Translucency:** Backgrounds are white with 70-85% opacity, allowing a hint of color to bleed through from underlying elements.
3.  **Soft Ambient Shadows:** Instead of dark, hard shadows, we use multi-layered, ultra-diffused shadows with a low alpha (e.g., `rgba(0,0,0,0.04)`) to create a "floating" effect rather than a "heavy" one.
4.  **Glass Stroke:** All glass containers feature a 1px inner border in semi-transparent white to define the edges against light backgrounds.

## Shapes
The shape language is friendly and modern, utilizing a **Rounded (Level 2)** logic. 
*   Standard components (buttons, inputs) use a **16px (1rem)** radius.
*   Large containers and cards (Glass Cards) use a **24px (1.5rem)** radius.
*   Small decorative elements (chips, tags) use a fully rounded/pill shape.

This consistency in soft corners reinforces the "liquid" aspect of the glass metaphor, avoiding harsh angles that could feel intimidating or overly corporate.

## Components
### Buttons
Primary buttons are solid Green with white text, maintaining the 60px height. Secondary buttons use the "Glass" effect with a Trust Blue text and a subtle 1px border.

### Input Fields
Fields are represented as "hollow" glass containers. When focused, the 1px border transitions from soft grey to Primary Green, and the backdrop blur intensifies. Labels remain visible above the field to ensure clarity in complex forms.

### Lists & Rosters
List items must maintain a 60px minimum height. They feature a subtle divider line or are housed within individual Glass Cards with 8px of vertical spacing between them.

### Credits & Badges
Student credits or attendance points are highlighted using the Warm Orange color. These appear as small, pill-shaped chips with white text, providing a high-contrast visual "pop" against the white and green interface.

### The Glass Card
The primary vessel for information. It is a white container with 80% opacity, a 20px backdrop blur, a 24px corner radius, and a 1px white inner stroke. It is used to group related school data, such as a student's daily schedule or recent grades.