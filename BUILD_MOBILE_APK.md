# 📱 Build Spentee Mobile APK Guide

## ✅ What's Been Updated

1. **App Configuration** (`mobile/app.json`):
   - App name: "Spentee"
   - Version: 1.0.1
   - Dark theme enabled
   - Splash screen: Black background (#000000)
   - Android adaptive icon: Black background

2. **Login Screen** (`mobile/src/screens/LoginScreen.js`):
   - Dark theme with black background
   - Glassmorphism-style inputs
   - Updated branding to "Spentee"
   - Professional styling

3. **Logo Assets**: All logo files should be in `mobile/assets/`

## 🚀 Build APK - Choose Your Method

### Method 1: EAS Build (Easiest - Cloud Build)

```powershell
cd mobile
npm install -g eas-cli
eas login
eas build --platform android --profile preview
```

**What happens:**
- Builds APK in the cloud (no local setup needed)
- Takes 15-30 minutes
- Provides download link when complete
- Free tier available

### Method 2: Local Build with Gradle

```powershell
cd mobile
npm install
npx expo prebuild --platform android
cd android
.\gradlew assembleRelease
```

**APK Location:** `mobile/android/app/build/outputs/apk/release/app-release.apk`

**Note:** Requires Android Studio and Android SDK installed

### Method 3: EAS Local Build

```powershell
cd mobile
npm install -g eas-cli
eas build --platform android --local
```

**Note:** Requires Docker and Android SDK

## 📋 Pre-Build Checklist

- [ ] Logo files in `mobile/assets/`:
  - `icon.png` (1024x1024px)
  - `adaptive-icon.png` (1024x1024px)
  - `splash.png` (1242x2436px or larger)
  - `favicon.png` (48x48px)

- [ ] API URL configured in `mobile/src/config/api.js`
  - Current: `https://spendee-qkf8.onrender.com/api`
  - Update if needed

- [ ] Dependencies installed:
  ```powershell
  cd mobile
  npm install
  ```

## 🎨 Current Theme

- **Background**: Black (#000000)
- **Primary Color**: Purple (#667eea)
- **Accent**: Purple gradient
- **Text**: White
- **Inputs**: Semi-transparent with glassmorphism effect

## 📦 After Build

1. **Download APK** from EAS dashboard (if using EAS)
2. **Install on device**:
   ```powershell
   adb install app-release.apk
   ```
3. **Or share** via email/cloud storage

## 🔧 Troubleshooting

### Build fails?
- Check `mobile/package.json` dependencies
- Run `npm install` in mobile directory
- Ensure Node.js version is compatible (v16+)

### Logo not showing?
- Verify logo files are in `mobile/assets/`
- Check file names match exactly (case-sensitive)
- Ensure PNG format

### Theme not applied?
- Clear Expo cache: `expo start -c`
- Rebuild: Delete `mobile/android` and run `npx expo prebuild`

## 📝 Notes

- First build takes longer (20-30 min)
- Subsequent builds are faster (cached dependencies)
- APK size: ~30-50 MB typical
- Minimum Android version: API 21 (Android 5.0)

