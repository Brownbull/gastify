# Platform Notes — Web · Mobile Web (PWA) · Native Mobile

**Status:** Phase 1 baseline — desktop + mobile web frames shipped · native mobile specs documented here for P5-P12 implementation · full native render passes deferred to platform-specific engineering

**Scope:** 3 platforms × feature deltas. Consumers: P5-P12 authors (screen implementations), P13 audit (handoff + cross-platform consistency check), frontend engineers building the React + React Native codebases.

---

## 1. Platform Matrix

| Capability | Desktop Web | Mobile Web (PWA) | Native Mobile (iOS + Android) |
|------------|-------------|------------------|-------------------------------|
| Viewport | 1440×900 (responsive 1920-640) | 390×844 (390-320 fallback) | 390×844 + safe-area insets |
| Theme runtime | `data-theme` × `data-mode` on `<html>` | same | theme tokens via `Appearance` API + `useColorScheme` |
| Wordmark | `Baloo 2 700 @ 24px` | `Baloo 2 700 @ 22px` | `Baloo 2 700 @ 22pt` (scaled for density) |
| Navigation | Sidebar (240) + top bar (60) | Bottom-tab (5 items) + top bar (56) | Native tab bar (5) + native header (44pt iOS / 56dp Android) |
| Modals | Centered overlay + backdrop | Full-sheet slide-up | `<Modal>` sheet-presentation (iOS) / bottom-sheet (Android) |
| Gestures | Click + hover + keyboard | Tap + swipe-to-dismiss | Tap + swipe + long-press + 3D-touch/haptic |
| Camera | File input `capture="environment"` | Same + PWA media-capture | Native `expo-camera` / `react-native-vision-camera` |
| Biometrics | None (password + Firebase Auth web) | Platform-biometrics limited (WebAuthn) | Full — Face ID / Touch ID / fingerprint via `expo-local-authentication` |
| Push | Web Push (VAPID) | Same + install prompt | APNs (iOS) + FCM (Android) via `expo-notifications` |
| Haptics | None | Limited (Android vibration API) | Full — `expo-haptics` (impact / notification / selection) |
| Offline | Service Worker cache | Same + install-as-app | AsyncStorage + SQLite + platform sync |
| File upload | `<input type="file" multiple>` + drag-drop | Same (no drag-drop) | Native picker + `expo-document-picker` + `expo-image-picker` |
| Print / PDF | `window.print()` + PDF download | Same | `expo-print` native dialog |

## 2. Frame Conventions

### Desktop Web — 1440×900

```
┌────────────────────────────────────────────────────────┐
│ ☰  gastify       [search]  [⌘K escanear]  [🔔] [JG]   │ 60px top bar
├──────────────┬──────────────────────────────┬──────────┤
│ Sidebar 240  │ MAIN 1fr (max 1440 centered) │ Rail 340 │
└──────────────┴──────────────────────────────┴──────────┘
```

Breakpoints: 1440 canonical · 1280 drop rail (main 1fr) · 1024 collapse sidebar to icon-only 60px · 640 mobile fallback.

### Mobile Web (PWA) — 390×844

```
┌─────────────────────┐
│ gastify       🔔 JG │  56 top bar
├─────────────────────┤
│                     │
│     MAIN            │
│     (scrollable)    │
│                     │
├─────────────────────┤
│ 🏠 📜 📷 📈 ⚙  │  64 bottom tab
└─────────────────────┘
```

Constraints (browser API limits — document per screen at P5-P12):
- No biometric Face/Touch ID — fallback to password
- No haptics — fallback to visual transition
- Camera = WebRTC, no direct raw sensor
- Push = Web Push only (iOS 16.4+)
- Install prompt = `beforeinstallprompt` event, manual UI
- File system = limited to user-initiated downloads

### Native Mobile — iOS 390×844 + Android 390×844

Shared layout with mobile web. Platform-specific surface deltas:

| Surface | iOS delta | Android delta |
|---------|-----------|---------------|
| Top bar | 44pt, large-title variant on root screens, back-chevron + title | 56dp, elevation 4, hamburger/back-arrow + title + overflow |
| Tab bar | 49pt, SF Symbols, hairline divider | 56dp, Material icons, optional FAB-merge |
| Modal | Sheet presentation w/ drag handle, dismissive gesture enabled | Bottom-sheet w/ scrim, back-button dismiss |
| Alerts | `UIAlertController` action sheet | `AlertDialog` + Material buttons |
| Long-press | Context menu (iOS 13+) | Tooltip / popup menu |
| Scan flow | `expo-camera` + Vision framework hints (rect detection) | `expo-camera` + MLKit text-recognition hints |
| Biometric unlock | Face ID / Touch ID — `LAContext.canEvaluatePolicy` | BiometricPrompt — fingerprint / face / iris |
| Haptic feedback | `UIImpactFeedbackGenerator` on tap, success, error | Vibration API + platform haptic (Android 10+) |
| Safe area | Insets top/bottom for notch + home indicator | Insets top for status bar + bottom for nav bar |
| Push notification | APNs, `alert+sound+badge`, app-badge count | FCM, channel-based, heads-up priority |

## 3. Feature Support — Required by REQ

| REQ | Web | PWA | Native | Notes |
|-----|-----|-----|--------|-------|
| REQ-01 Scan boleta | ✅ file upload | ✅ media-capture | ✅ expo-camera | Native adds real-time rect detection hints |
| REQ-02 QR/CAF boleta | ⚠ manual capture | ⚠ same | ✅ live QR scanner | Web requires user to aim + snap |
| REQ-09 Biometric unlock | ❌ | ⚠ WebAuthn (newer browsers) | ✅ Face/Touch ID | Fallback: PIN + email OTP |
| REQ-13 Offline capture | ⚠ SW cache | ✅ install-as-app | ✅ AsyncStorage + sync queue | Native has the strongest offline story |
| REQ-17 Push alerts | ✅ Web Push | ✅ same (iOS 16.4+) | ✅ APNs + FCM | Native = channels + actions + badge |
| REQ-19 Haptic feedback | ❌ | ⚠ Android only | ✅ full | Cosmetic — no REQ blocker |
| REQ-20 4-jurisdiction consent | ✅ | ✅ | ✅ | Same copy across platforms; App Store additional PERMISSIONS strings required |
| REQ-21 Per-run telemetry | ✅ | ✅ | ✅ | Native adds battery + network-type metadata |

## 4. Shipped Mockup Coverage (Phase 1 baseline)

| Screen | Desktop | Mobile Web | Native Mobile |
|--------|---------|------------|---------------|
| Dashboard | ✅ `-desktop.html` | ✅ `gastify-dashboard.html` | 📋 spec in §2 + platform deltas above, render at P5 |
| History | ✅ | ✅ | 📋 |
| Transaction Editor | ✅ | ✅ | 📋 |
| Settings | ✅ | ✅ | 📋 |
| Trends | ✅ | ✅ | 📋 |
| Insights | ✅ | ✅ | 📋 |
| Reports | ✅ | ✅ | 📋 |
| Items | ✅ | ✅ | 📋 |
| Scan (3 screens) | ✅×3 | ✅×3 | 📋×3 |
| Quicksave | ✅ | ✅ | 📋 |
| Group Hub | ✅ | ✅×5 legacy | 📋 |
| Auth | ✅ | ✅ (gastify-login.html) | 📋 native biometric path |
| Consent | ✅ 4-jurisdiction | ✅ same | 📋 + permission-string copy |

📋 = spec-only at Phase 1 · renders authored in P5-P12 per-feature phases using platform deltas above.

## 5. Native Mobile — Open Questions (deferred to P5-P12)

- React Native + Expo or bare RN? — default: Expo (per BEHAVIOR.md tech list)
- Shared component library between web + native? — Tamagui / NativeWind candidates; decide at P2 Atomic
- Over-the-air update strategy? — EAS Update vs. App Store bundle
- In-app purchase flow? — App Store + Play Billing separate from web Stripe flow
- Deep-link scheme? — `gastify://` universal link / app link for shared group invite codes

## 6. Related Artifacts

- `STRESS-TEST-SPEC.md` — canonical platform frame specs (desktop / mobile web / native mobile)
- `assets/css/desktop-shell.css` — shared desktop shell
- `assets/tokens/tokens.json` — Design Tokens Community Group format (same tokens drive web + native)
- `design-system.html` — 7-section reference including platform matrix

## 7. Review Trigger

Revisit this doc when:

- A new REQ lands that cannot be served by web/PWA and forces native (e.g. background location)
- A platform adds support for a capability that was previously platform-only (e.g. WebAuthn reaches parity with native biometrics)
- P5-P12 implementation surfaces a platform delta not captured here
