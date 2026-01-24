# AidGap - Requirements & Setup

## System Requirements

- **Node.js**: v18.x or higher (v20+ recommended)
- **npm**: v9.x or higher
- **OS**: Windows, macOS, or Linux

## Dependencies

### Production Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `next` | 15.1.4 | React framework with App Router |
| `react` | ^18.3.1 | UI library |
| `react-dom` | ^18.3.1 | React DOM renderer |
| `@deck.gl/core` | ^9.0.16 | High-performance WebGL visualization |
| `@deck.gl/layers` | ^9.0.16 | deck.gl layer types |
| `@deck.gl/react` | ^9.0.16 | React bindings for deck.gl |
| `maplibre-gl` | ^4.5.0 | Open-source map rendering |
| `react-map-gl` | ^7.1.7 | React wrapper for MapLibre |
| `zustand` | ^4.5.4 | Lightweight state management |
| `@supabase/supabase-js` | ^2.45.0 | Supabase client (optional) |

### Development Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `typescript` | ^5.5.0 | TypeScript compiler |
| `@types/node` | ^20.14.0 | Node.js type definitions |
| `@types/react` | ^18.3.3 | React type definitions |
| `@types/react-dom` | ^18.3.0 | React DOM type definitions |
| `tailwindcss` | ^3.4.17 | CSS framework |
| `autoprefixer` | ^10.4.23 | CSS vendor prefixing |
| `eslint` | ^8.57.0 | Code linting |
| `eslint-config-next` | 14.2.5 | Next.js ESLint config |

## Quick Setup

```bash
# 1. Clone the repository
git clone <repo-url>
cd Shafaf-Aid

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev

# 4. Open browser
# http://localhost:3000
```

## Environment Variables (Optional)

Create a `.env.local` file for custom configuration:

```env
# Data mode: 'static' (default) or 'supabase'
NEXT_PUBLIC_DATA_MODE=static

# Supabase (only needed for supabase mode)
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key

# Custom map tiles (optional)
NEXT_PUBLIC_MAP_TILES_URL=https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json
```

## Troubleshooting

### Cache Issues
If you encounter webpack cache errors:
```bash
# Windows
rmdir /s /q .next
rmdir /s /q node_modules
del package-lock.json
npm install

# macOS/Linux
rm -rf .next node_modules package-lock.json
npm install
```

### Port Already in Use
The dev server will automatically try ports 3000, 3001, 3002, etc. Check the terminal output for the actual port.

### Map Not Displaying
1. Check browser console for errors
2. Ensure you have internet connection (for map tiles)
3. Try hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
