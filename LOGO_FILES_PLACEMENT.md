# 📍 Logo Files Placement Guide

## ✅ Web UI Logo Files (client/public/)

All logo files should be placed in `client/public/` directory:

### Required Files:
1. **favicon.ico** ✅
   - Size: 32x32px (or 16x16, 32x32, 48x48 multi-size)
   - Usage: Browser tab icon
   - Status: Already in place

2. **logo192.png** ✅
   - Size: 192x192px
   - Usage: PWA icon, Sidebar logo, Android home screen
   - Status: Already in place

3. **logo512.png** ✅
   - Size: 512x512px
   - Usage: Login page logo, high-resolution displays
   - Status: Already in place

4. **logo518.png** ✅
   - Size: 518x518px (or custom size)
   - Usage: Additional high-res icon
   - Status: Already in place

5. **apple-touch-icon.png** ✅
   - Size: 180x180px
   - Usage: iOS home screen icon
   - Status: Already in place

## ✅ Mobile App Logo Files (mobile/assets/)

All logo files should be placed in `mobile/assets/` directory:

### Required Files:
1. **icon.png** ✅
   - Size: 1024x1024px (recommended)
   - Usage: Main app icon (iOS & Android)
   - Status: Already in place
   - Referenced in: `mobile/app.json` → `icon`

2. **adaptive-icon.png** ✅
   - Size: 1024x1024px (recommended)
   - Usage: Android adaptive icon (foreground)
   - Status: Already in place
   - Referenced in: `mobile/app.json` → `android.adaptiveIcon.foregroundImage`

3. **splash.png** ✅
   - Size: 1242x2436px (recommended for iOS)
   - Usage: App splash screen
   - Status: Already in place
   - Referenced in: `mobile/app.json` → `splash.image`

4. **favicon.png** ✅
   - Size: 48x48px or larger
   - Usage: Web version of mobile app favicon
   - Status: Already in place
   - Referenced in: `mobile/app.json` → `web.favicon`

## 📱 Mobile App Configuration

The mobile app configuration is in `mobile/app.json`:

```json
{
  "expo": {
    "name": "Spentee",
    "icon": "./assets/icon.png",
    "splash": {
      "image": "./assets/splash.png",
      "backgroundColor": "#10b981"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#10b981"
      }
    },
    "web": {
      "favicon": "./assets/favicon.png"
    }
  }
}
```

## 🌐 Web UI Configuration

### HTML Head (client/public/index.html)
- Favicon link: `/favicon.ico`
- Apple touch icons: `/apple-touch-icon.png`, `/logo192.png`, `/logo512.png`
- Manifest: `/manifest.json`

### Manifest (client/public/manifest.json)
- Icons: `favicon.ico`, `logo192.png`, `logo512.png`, `logo518.png`
- Theme color: `#10b981` (green to match logo)

### Components
- **Login.js**: Uses `/logo512.png` (200px width, rounded corners)
- **Sidebar.js**: Uses `/logo192.png` (120px width, rounded corners)

## 🎨 Design Specifications

### Colors
- **Background Green**: #10b981 (vibrant green from logo)
- **Logo Black**: #000000 (pure black)
- **Text**: White (#ffffff) for dark backgrounds

### Rounded Edges
- **Login logo**: 16px border-radius
- **Sidebar logo**: 12px border-radius
- **All icons**: Should have rounded corners applied

### Logo Composition
- **S Icon**: Stylized black "S" with splatter effects
- **Background**: Vibrant green (#10b981)
- **Text**: "SPENTEE" in bold black (optional for smaller icons)

## ✅ Verification Checklist

### Web UI
- [ ] Favicon appears in browser tab
- [ ] Logo displays on login page
- [ ] Logo displays in sidebar
- [ ] PWA icon shows when installing app
- [ ] iOS home screen icon works
- [ ] All images have rounded edges

### Mobile App
- [ ] App icon shows in app stores
- [ ] Splash screen displays correctly
- [ ] Android adaptive icon works
- [ ] Web favicon for mobile web version
- [ ] All assets are properly sized

## 🚀 Next Steps

1. **Replace logo files** with your actual logo images:
   - Ensure all files have the correct dimensions
   - Apply rounded edges (8-12px border radius)
   - Use green background (#10b981)

2. **Test the application**:
   - Check web UI displays logos correctly
   - Test mobile app builds
   - Verify PWA installation

3. **Build and deploy**:
   - Web: `npm run build` in client directory
   - Mobile: `expo build` or `eas build` in mobile directory

