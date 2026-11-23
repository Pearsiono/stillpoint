# STILLPOINT

A neon cyber-void bullet-hell roguelike built for iPhone (portrait one-thumb + Lift-to-Focus time-dilation).

## Signature Mechanic — Lift-to-Focus & Parry Shockwave
- **Touch & Drag** anywhere on the screen to steer via a dynamic floating joystick. Moving and **grazing** close to enemy fire builds **Kinetic Charge**.
- **Lift your thumb** (or hold **Space** on desktop) to enter **STILLPOINT**:
  - Time slows to ~17% speed while your hitbox shrinks to a glowing pinpoint diamond core.
  - A **Parry Shockwave** erupts around you, transmuting nearby enemy bullets into homing cyan counter-shards.
  - Parrying **magenta ringed Boss/Elite orbs** triggers massive **Overparry** damage and refunds Kinetic Charge!
- **Dual-State Time Weapons & Catalyst Evolutions**: All 6 weapons transform behavior between Normal Time and Stillpoint Slow-Mo, and fuse with matching passive modules at Lv.5 into evolved super-forms.
- **Neon Containment Boss Enclosures**: Every ~2 minutes, a containment arena locks around you for multi-phase bullet-hell boss duels (*Vortex Weaver*, *Prism Seraph*, *Chrono Archon*), followed by optional **Endless Overdrive**.

## Installing on iPhone via Sideloadly
1. Download `STILLPOINT-unsigned.ipa` from the **Releases** page (or the latest **Actions** workflow artifact).
2. Open [Sideloadly](https://sideloadly.io/) on Windows or macOS and connect your iPhone.
3. Drag `STILLPOINT-unsigned.ipa` into Sideloadly, enter your Apple ID, and click **Start**.
4. On iPhone: go to **Settings → General → VPN & Device Management** and trust your Apple ID developer certificate, then launch **STILLPOINT**!

## Local Browser Playtesting (Windows / macOS)
```bash
npm install
npm run dev
```
Drag with mouse (release to enter Stillpoint) or use **WASD / Arrow keys** + **Space** (Stillpoint).
