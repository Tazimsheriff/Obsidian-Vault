# 🔄 Sync Guide — Obsidian Vault

**Repo**: [github.com/Tazimsheriff/Obsidian-Vault](https://github.com/Tazimsheriff/Obsidian-Vault)

Syncing is simple: **pull before you start, push when you're done.**

---

## 🖥️ PC — Obsidian Git Plugin (Auto Sync)

> Install once. After that it's fully automatic — no manual git commands needed.

### One-Time Setup

1. Open Obsidian → **Settings → Community plugins**
2. Disable Safe Mode if asked
3. **Browse** → search **"Obsidian Git"** → Install → Enable
4. Go to **Settings → Obsidian Git** and set:

| Setting | Value |
|---------|-------|
| Auto pull interval (minutes) | `5` |
| Auto commit-and-sync interval (minutes) | `5` |
| Commit message | `sync: {{date}}` |
| Pull updates on startup | ✅ On |
| Push after commit | ✅ On |

5. Open the **Command Palette** (`Ctrl+P`) → run **"Obsidian Git: Clone an existing remote repo"** (only if vault isn't already open)

> Since the vault is already cloned locally at `t:\obsidian`, you're done. It will auto-commit + push every 5 minutes.

### Manual Sync (anytime)

Press `Ctrl+P` → type `git` → choose:
- **"Obsidian Git: Pull"** — pull latest
- **"Obsidian Git: Commit and sync"** — commit + push immediately

---

## 📱 Mobile (Android) — Obsidian Git Plugin

### One-Time Setup

1. Install **Obsidian** on Android
2. Open Obsidian → create a **new vault** (choose any local folder)
3. Settings → Community Plugins → disable Safe Mode → Browse → **Obsidian Git** → Install → Enable
4. Settings → Obsidian Git → **"Clone an existing remote repo"**
   - URL: `https://github.com/Tazimsheriff/Obsidian-Vault.git`
   - Auth: your GitHub **Personal Access Token** (see below)
5. It will clone your vault. Open `Dashboard.md` as home.

### Daily Use (Android)

Tap the **Obsidian Git sidebar button** (bottom bar) or use the Command Palette:
- Pull before editing → edit → Push when done

Or just enable auto-sync (same settings as PC above) and forget about it.

---

## 📱 Mobile (iOS) — Working Copy App

> iOS doesn't allow background git. Use **Working Copy** as your git client.

### One-Time Setup

1. Install **Working Copy** (App Store) — free tier works
2. In Working Copy: tap **+** → **Clone repository**
   - URL: `https://github.com/Tazimsheriff/Obsidian-Vault.git`
   - Authenticate with your GitHub PAT
3. Install **Obsidian** on iPhone
4. In Working Copy: long-press the vault folder → **Share** → **Link Repository to Obsidian**
   - This gives Obsidian direct access to the Working Copy folder
5. Open Obsidian → **Open folder as vault** → select the linked folder

### Daily Use (iOS)

| Step | Action |
|------|--------|
| Before editing | Open Working Copy → **Pull** |
| Edit notes | Open Obsidian normally |
| After editing | Open Working Copy → **Commit** → **Push** |

> 💡 Add a **Working Copy iOS Shortcut** widget to your home screen for one-tap push.

---

## 🔑 GitHub Personal Access Token (PAT)

Required for mobile auth (PC uses Windows Credential Manager automatically).

1. GitHub → **Settings** (top-right avatar) → **Developer Settings**
2. **Personal access tokens → Tokens (classic)**
3. **Generate new token (classic)**:
   - Note: `obsidian-mobile`
   - Expiration: `No expiration` (or 1 year)
   - Scopes: check ✅ **`repo`**
4. **Copy the token** — save it somewhere safe, you only see it once
5. Use this token as your **password** when git asks for credentials on mobile

---

## ⚡ TL;DR

| Device | How to Sync |
|--------|------------|
| **PC** | Plugin auto-syncs every 5 min. Done. |
| **Android** | Obsidian Git plugin — tap Pull/Push or auto-sync |
| **iPhone** | Working Copy → Pull → edit in Obsidian → Working Copy → Push |

---

*Vault: [github.com/Tazimsheriff/Obsidian-Vault](https://github.com/Tazimsheriff/Obsidian-Vault)*
