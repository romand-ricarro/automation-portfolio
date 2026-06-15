# InsightPulse Design System Specification

## Vision

Transform InsightPulse from a standard admin dashboard into a premium, high-performance AI analytics platform. The aesthetic is **"Modern High-Contrast Bento"**—clean, precise, and energetic, inspired by tools like Linear, Vercel, and Supabase.

---

## 🎨 Color Palette

### Base (Dark Mode - Primary)

- **Deep Background**: `#020617` (Slate 950) - The primary canvas.
- **Surface/Card**: `#0f172a` (Slate 900) or `#1e293b` (Slate 800) for nested elements.
- **Borders**: `rgba(255, 255, 255, 0.05)` or `Slate 800`.

### Accents (The "Pulse")

- **Primary Pulse**: `Linear-Gradient(#6366f1, #a855f7)` (Indigo to Purple).
- **Success/Exceeds**: `#10b981` (Emerald 500) with subtle glow.
- **Warning**: `#f59e0b` (Amber 500).
- **Error/Needs Review**: `#ef4444` (Red 500).

---

## 🧱 Component Styles

### 1. The "Bento" Card

- **Background**: Solid `#0f172a` (Slate 900).
- **Border**: 1px solid `rgba(255, 255, 255, 0.05)`.
- **Corner Radius**: `12px` or `16px` (Rounded-2xl).
- **Shadow**: Subtle outer glow `shadow-2xl shadow-blue-500/5`.

### 2. Interactive States (Buttons & Links)

- **Hover Transitions**: All interactive elements must have `transition-all duration-300 ease-in-out`.
- **Lift Effect**: Cards and buttons should `transform: translateY(-2px)` or `scale(1.01)` on hover.
- **Primary Buttons**: High-contrast gradient with a white drop-shadow for depth.

### 3. Data Visualization (Metrics & Charts)

- **Metric Text**: Use `font-black` or `font-extrabold`.
- **Progress Bars**: 8px thickness, rounded-full, using vibrant gradients instead of solid colors.
- **Trends**: Line charts should use a "Glow" effect (stroke with a filtered shadow).

---

## 🔤 Typography

- **Primary Font**: 'Inter' or 'Outfit' (Sans-serif).
- **Headings**: `tracking-tight` and `font-bold`.
- **Metric Values**: High-readability mono-space (optional for scores) or bold sans-serif.

---

## ⚡ Animations & Micro-interactions

- **Page Transitions**: Subtle fade-in + slide-up for content area.
- **Pulse Effect**: Crucial metrics (like AI analysis in progress) should have a soft breathing animation `animate-pulse`.
- **Loading**: Use a custom, high-speed spinner that matches the Indigo/Purple gradient.

---

## 🗺️ Layout Architecture

- **Sidebar**: Glassmorphism effect `backdrop-blur-md bg-slate-950/50`.
- **Navbar**: Fixed height (h-16), border-bottom `Slate 800`.
- **Empty States**: Use generated AI-themed icons with gradients to maintain interest.

---

## 📄 Reference for Implementation

When building, prioritize **depth** and **contrast**. Avoid using mid-tone greys. Stick to the extremes (very dark surfaces, very bright accents).
