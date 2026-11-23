# STILLPOINT — App Store 1.0 Release Checklist

Everything in the codebase is now configured for both **Sideloadly testing** (automatic on every push to `main`) and **signed App Store / TestFlight releases** (manual trigger via GitHub Actions, no Mac required).

---

## 1. Enable GitHub Pages (Privacy & Support URLs)
1. Open your GitHub repo **Settings -> Pages**.
2. Set **Source** to **Deploy from a branch**, branch **`main`**, folder **`/docs`**, and save.
3. Paste these URLs into App Store Connect:
   - Privacy Policy URL: `https://pearsiono.github.io/stillpoint/privacy.html`
   - Support URL: `https://pearsiono.github.io/stillpoint/support.html`

---

## 2. Apple Developer Portal & App Store Connect Setup
1. Register App ID **`com.pearsiono.stillpoint`** in Apple Developer Portal with capabilities:
   - **Game Center**
   - **iCloud -> Key-Value Storage**
2. Create an **Apple Distribution** certificate (export as `.p12` with a password) and an **App Store Connect** provisioning profile for `com.pearsiono.stillpoint`.
3. Create an **App Store Connect API Key** (Users and Access -> Integrations -> App Store Connect API -> Role: App Manager) and download the `.p8` file.
4. Create the app **STILLPOINT** in App Store Connect:
   - Bundle ID: `com.pearsiono.stillpoint`
   - App Privacy: **Data Not Collected** (matches `ios/Stillpoint/PrivacyInfo.xcprivacy`)
   - Export Compliance: `ITSAppUsesNonExemptEncryption` is already set to `NO` in `Info.plist`.

### Game Center IDs (wired in `src/bridge.ts` & `src/data/meta.ts`)
Create these in App Store Connect -> Services -> Game Center (optional; uncreated IDs are safely ignored):

**Leaderboards (Integer, High-to-Low):**
- `stillpoint_lb_overall` — Overall High Score
- `stillpoint_lb_drift` — Ash Flats High Score
- `stillpoint_lb_helix` — Sunken Metro High Score
- `stillpoint_lb_furnace` — Slag Foundry High Score
- `stillpoint_lb_singularity` — The Monolith High Score

**Achievements (mapped to Trials):**
- `stillpoint_ach_first_blood` (Initiate — 50 kills)
- `stillpoint_ach_slayer_500` (Reaper — 500 kills)
- `stillpoint_ach_boss_1` (Weaver Fall — 1 boss)
- `stillpoint_ach_boss_3` (Archon Fall — 3 bosses)
- `stillpoint_ach_no_hit_boss` (Untouched — No-hit boss)
- `stillpoint_ach_sync_20` (Cadence — 20 Perfect Syncs)
- `stillpoint_ach_sync_streak_4` (Metronome — 4x Sync streak)
- `stillpoint_ach_sector_drift` (Ash Clear)
- `stillpoint_ach_sector_helix` (Metro Clear)
- `stillpoint_ach_sector_furnace` (Foundry Clear)
- `stillpoint_ach_sector_singularity` (Monolith Clear)
- `stillpoint_ach_heat_clear_2` (Pressure Test — Clear at 2+ Heat)
- `stillpoint_ach_trophies_8` (Ascendant — 12 trials)

---

## 3. Add GitHub Secrets for 1-Click TestFlight Uploads
In GitHub Repo **Settings -> Secrets and variables -> Actions**, add:
- `APPLE_CERTIFICATE_BASE64`: base64 of your `.p12` distribution cert
- `APPLE_CERTIFICATE_PASSWORD`: password used to export the `.p12`
- `APPLE_PROVISIONING_PROFILE_BASE64`: base64 of your `.mobileprovision` file
- `KEYCHAIN_PASSWORD`: any random string for the temporary CI keychain
- `APP_STORE_CONNECT_API_KEY_ID`: Key ID from App Store Connect
- `APP_STORE_CONNECT_ISSUER_ID`: Issuer UUID from App Store Connect
- `APP_STORE_CONNECT_PRIVATE_KEY`: full contents of your `AuthKey_XXXXXX.p8` file

Then open **Actions -> Release to TestFlight / App Store -> Run workflow**!
That workflow compiles with `STILLPOINT_APP_STORE_SERVICES=YES` and `ios/Stillpoint/Stillpoint.entitlements`, enabling iCloud KVS and Game Center automatically, while regular pushes keep generating unsigned Sideloadly IPAs with `STILLPOINT_APP_STORE_SERVICES=NO`.

---

## 4. Screenshots & Store Listing
Capture 4 to 6 portrait screenshots on your iPhone (6.9" / 6.5" display class):
1. Mid-combat Stillpoint Active-Reload Sync golden sweep arc
2. Boss fight with bullet curtain & weapon evolutions firing
3. Level-up 3-card upgrade / Evolution draft
4. Hangar & Pick-10 Loadout buildcrafting screen
5. Armory Crate / Coating inspect showcase
