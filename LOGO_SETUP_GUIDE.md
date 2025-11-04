# 🎨 Logo Setup Guide for Spentee

## Logo Description
The Spentee logo features:
- **Stylized black "S"** with rounded, fluid design
- **Splatter/drip effects** at top-right and bottom-left
- **Vibrant green background** (#10b981 or similar)
- **"SPENTEE" text** in bold black below the S
- **Rounded edges** for all elements

## Required Logo Files

Place the following logo files in `client/public/` directory:

### 1. Favicon (favicon.ico)
- **Size:** 32x32 pixels (or 16x16, 32x32, 48x48 multi-size)
- **Format:** ICO
- **Content:** The stylized "S" logo with rounded edges on green background
- **Usage:** Browser tab icon

### 2. Logo 192x192 (logo192.png)
- **Size:** 192x192 pixels
- **Format:** PNG with transparency or green background
- **Content:** Full logo (S + SPENTEE text) with rounded edges
- **Usage:** PWA icon, Android home screen

### 3. Logo 512x512 (logo512.png)
- **Size:** 512x512 pixels
- **Format:** PNG with transparency or green background
- **Content:** Full logo (S + SPENTEE text) with rounded edges
- **Usage:** PWA splash screen, high-resolution displays

### 4. Apple Touch Icon (apple-touch-icon.png)
- **Size:** 180x180 pixels
- **Format:** PNG
- **Content:** Logo with rounded edges (iOS will add corner radius automatically)
- **Usage:** iOS home screen icon

## Design Specifications

### Colors
- **Background Green:** #10b981 (vibrant green from logo)
- **Logo Black:** #000000 (pure black)
- **Alternative:** Use the exact green from your logo design

### Rounded Edges
- Ensure all logo elements have rounded corners
- Recommended border radius: 8-12px for square icons
- The "S" shape should already have rounded curves

### Logo Composition
- **S Icon:** The stylized black "S" with splatter effects
- **Text:** "SPENTEE" in bold black below (if including in icon)
- **Or:** Just the "S" icon for smaller sizes (favicon)

## Quick Setup Steps

1. **Create/Prepare Logo Files:**
   - Export your logo at different sizes:
     - 32x32px → `favicon.ico`
     - 192x192px → `logo192.png`
     - 512x512px → `logo512.png`
     - 180x180px → `apple-touch-icon.png`

2. **Apply Rounded Edges:**
   - Use image editing software (Photoshop, GIMP, Figma, etc.)
   - Apply border radius: 8-12px to all square icons
   - Ensure the logo looks good with rounded corners

3. **Place Files:**
   ```
   client/public/
   ├── favicon.ico
   ├── logo192.png
   ├── logo512.png
   ├── apple-touch-icon.png
   └── manifest.json (already created)
   ```

4. **Verify:**
   - Check browser tab shows favicon
   - Test PWA installation shows correct icon
   - Verify mobile home screen icons

## Online Tools for Creating Favicons

1. **Favicon Generator:**
   - https://realfavicongenerator.net/
   - Upload your logo and generate all sizes

2. **ICO Converter:**
   - https://convertio.co/png-ico/
   - Convert PNG to ICO format

3. **Image Resizer:**
   - https://www.iloveimg.com/resize-image
   - Resize your logo to required dimensions

## Notes

- The HTML and manifest.json are already configured
- Just place the logo files in `client/public/` directory
- Files will be automatically picked up by React build process
- The theme color is set to green (#10b981) to match logo background

## Testing

After placing logo files:
1. Restart the development server
2. Check browser tab for favicon
3. Inspect page source to verify links are correct
4. Test "Add to Home Screen" on mobile devices

