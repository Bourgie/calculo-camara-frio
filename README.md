# Cálculo Cámara de Frío ❄️

PWA instalable (Android/iOS) para vendedores — estimado rápido + ajuste pro de cámara frigorífica.

**Stack:** Vite + React + TypeScript + Tailwind 4 + vite-plugin-pwa + jsPDF

## Cálculo

- **Modo rápido (a ojo):** `HP = Volumen/12 (MT ≥0°C) o /6 (BT) × factor servicio` → snap a catálogo `[0.5, 0.75, 1, 1.5, 2, 3, 4, 5, 7.5, 10]` — paridad exacta con `Calculadora_Camara_Frigorifica.xlsx` (B31/B32).
- **Modo Pro (opcional):** suma cargas por transmisión (U según espesor 60mm MT / 100mm BT), infiltración puerta, producto, personas, iluminación y ajusta HP por `kcal/h / 2200 (MT) o 1100 (BT)`.
- **Equipos:** condensadora/evaporadora genérica por HP + gas, válvula Danfoss/Copeland + tobera por HP.
- **Paneles:** `m²` y cant. estimada (ancho 1.16m) — muros + techo (+ piso si aislado).

## Uso

```bash
npm install
npm run dev     # http://localhost:5173
npm run build   # dist/
npm run preview
```

## PWA

- `manifest.webmanifest` + `sw.js` (Workbox) — instalable, offline.
- Iconos en `public/icons/` (192/512) + `apple-touch-icon.png`.
- En iOS: Compartir → Agregar a pantalla de inicio.

## Deploy gratis

### GitHub

```bash
git init
git add .
git commit -m "feat: PWA cálculo cámara frío"
git remote add origin https://github.com/TU_USUARIO/calculo-camara-frio.git
git push -u origin main
```

### Cloudflare Pages

1. Cloudflare Dashboard → Pages → Create project → Connect to Git
2. Repo: `calculo-camara-frio`
3. Build: `npm run build`, Output: `dist`
4. Variables: none. Deploy → URL `*.pages.dev`

Vercel/Netlify también funcionan con mismo build.

## Estructura

```
src/lib/calc.ts     # motor
src/lib/pdf.ts      # jsPDF
src/lib/storage.ts  # historial localStorage (10 últimos)
src/App.tsx         # wizard mobile 3 pasos + resultado
```

## Disclaimer

Predimensionamiento orientativo. Verificar con carga térmica completa y capacidad del fabricante a Tevap/Tcond reales. R290 requiere equipo certificado.
