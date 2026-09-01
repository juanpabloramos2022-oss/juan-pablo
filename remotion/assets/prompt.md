# 🎬 High-End Data Visualization (Remotion, 3 Scenes)

## ❗ Creative Direction (STRICT)

This must look like a **premium SaaS dashboard animation**, not a basic chart demo.

Avoid:

* plain charts
* flat colors only
* static layouts
* basic fade-in text

Every scene must feel like a **designed UI system with motion**.

---

## 🎯 Goal

Create a **3-scene animated data visualization video** using Remotion.

The result must feel like:

* a startup dashboard (Stripe / Linear / modern SaaS)
* visually dense but clean
* highly polished and professional

---

## 📁 Data Source (MANDATORY)

Use:

`/assets/data.json`

All content must come from this file:

* title
* subtitle
* kpis[]
* bars[]
* lineChart[]
* highlight

Do NOT hardcode any data.

---

## 🎨 Color System (PROFESSIONAL)

Use a **modern gradient-based palette**:

* Background: dark gradient (e.g. deep navy → dark purple)
* Primary: vibrant blue or cyan
* Accent: purple / green for highlights
* Text: white with opacity hierarchy

Use:

* gradients (linear or radial)
* soft glow effects
* subtle shadows

Avoid flat, lifeless colors.

---

## 🧩 UI Elements (MANDATORY)

Include:

* cards (rounded, soft shadow)
* icons for KPIs (trending up, users, revenue)
* separators / dividers
* subtle grid or background texture

Everything must feel like a **real product UI**, not raw SVG charts.

---

## 🎞️ Scene Structure

Each scene:

* 6–10 seconds
* includes overlapping animations
* must have depth and layering

---

## 🟢 Scene 1 — KPI Overview (Impact)

### Layout:

* Title + subtitle from JSON
* 3 KPI cards (from kpis[])
* each card includes:

  * icon
  * label
  * animated value

### Animation:

* cards enter with:

  * translateY + scale + fade
* values animate with **count-up effect**
* slight overshoot (e.g. 100 → 110 → 100)

### Style:

* cards with gradient accents
* glow on active numbers

---

## 🔵 Scene 2 — Data Breakdown (Charts)

### Layout:

Split screen or grid:

* left: bar chart (bars[])
* right: line chart (lineChart[])

### Bar Chart:

* bars grow from 0 height
* rounded edges
* gradient fill

### Line Chart:

* line draws progressively
* include:

  * dots on points
  * glow effect
  * area fill with gradient (optional)

### Animation:

* charts DO NOT appear instantly
* they must **build over time**
* overlapping animation between bars and line

---

## 🟣 Scene 3 — Insight Highlight (WOW)

### Layout:

* centered composition
* big highlight number (from highlight.value)

### Animation:

* number:

  * count-up with overshoot
  * scale pop (1 → 1.1 → 1)
* text:

  * fade + upward motion
* background:

  * gradient shift or light pulse

### Extra Polish:

* radial glow behind number
* subtle particle or light sweep effect

---

## 🔤 Typography & Legibility (STRICT)

Use:

👉 Satoshi (Variable)
https://www.fontshare.com/fonts/satoshi

Rules for Maximum Visibility:

* **High Contrast**: Ensure text has a clear contrast ratio against the background. Avoid very thin weights on dark backgrounds.
* **Minimum Opacity**: Secondary labels must NEVER drop below 70% opacity (e.g., `text-white/70`).
* **Depth & Pop**: Use subtle `text-shadow` or `drop-shadow` to separate text from complex gradient backgrounds.
* **Hierarchy**:
  * **Title**: Bold, massive (e.g., `text-8xl` or `text-9xl`), 100% white.
  * **KPI values**: Extra Bold, massive size (e.g., `text-7xl`+), 100% white or vibrant accent color.
  * **Labels**: Medium weight, large size (minimum `text-2xl`), 80% white, clearly readable.
* **No Motion Blur on Critical Text**: Ensure text is sharp and legible even during transitions.

---

## 🎨 Motion Principles (STRICT)

* No linear animations

* Use easing (easeOut, easeInOut)

* Combine multiple properties:

  * scale
  * translate
  * opacity
  * blur

* Use **animation overlap**, not just sequences

---

## ⚙️ Technical Rules

* Use `useCurrentFrame()`
* Use `interpolate()`
* Data must be mapped dynamically
* No hardcoded values
* Clean reusable structure

---

## 🚫 Forbidden

* basic charts without styling
* flat UI
* empty layouts
* static text
* no icon usage

---

## 🚀 Output

Generate:

* `DataVideo.tsx`
* modular scene components
* reusable system

---

## 💡 Core Principle

> This is not a chart animation
> It is a **data storytelling system**

Changing `/assets/data.json` should generate a new video automatically.
