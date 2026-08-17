# 🔄 GitHub Sync Guide

Complete step-by-step guide to sync your Obsidian vault via GitHub across **Desktop (Windows)** and **Mobile (iOS/Android)**.

---

## 📋 Prerequisites

- A **GitHub account** (free) → [github.com](https://github.com)
- **Git** installed on Windows → [git-scm.com](https://git-scm.com)
- **Obsidian** installed on all devices

---

## PART 1 — Desktop Setup (Windows)

### Step 1: Create a GitHub Repository

1. Go to [github.com/new](https://github.com/new)
2. Name it something like `obsidian-vault`
3. Set it to **Private** (recommended — your notes are personal)
4. **Do NOT** initialize with README (we'll push the existing vault)
5. Click **Create repository**
6. Copy the repo URL — e.g. `https://github.com/YOUR_USERNAME/obsidian-vault.git`

---

### Step 2: Initialize Git in the Vault

Open **PowerShell** and run:

```powershell
cd t:\obsidian
git init
git add .
git commit -m "Initial vault setup"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/obsidian-vault.git
git push -u origin main
```

> Replace `YOUR_USERNAME` with your actual GitHub username and the URL with your repo URL.

---

### Step 3: Install Obsidian Git Plugin (Desktop)

1. Open Obsidian → **Settings → Community plugins**
2. Turn off **Safe mode** if prompted
3. Click **Browse** → Search for **"Obsidian Git"**
4. Install and **Enable** it

---

### Step 4: Configure Obsidian Git

Go to **Settings → Obsidian Git** and set:

| Setting | Recommended Value |
|---------|------------------|
| Auto pull interval | `10` minutes |
| Auto commit interval | `10` minutes |
| Commit message | `vault backup: {{date}}` |
| Pull on startup | ✅ Enabled |
| Push after commit | ✅ Enabled |
| Show status bar | ✅ Enabled |

Now Obsidian will **automatically commit and push** every 10 minutes in the background.

---

### Step 5: Authenticate with GitHub (HTTPS)

When you first push, Git will prompt for credentials.  
Use a **Personal Access Token (PAT)** instead of your password:

1. GitHub → **Settings → Developer Settings → Personal Access Tokens → Tokens (classic)**
2. Generate new token → check `repo` scope → Set expiry → Copy token
3. When Git prompts for password, **paste the token**

To avoid re-entering it:
```powershell
git config --global credential.helper manager-core
```
Windows Credential Manager will store it securely.

---

## PART 2 — Mobile Setup (iOS / Android)

### Option A: Obsidian Git Plugin (Recommended for Android)

1. Install Obsidian on Android
2. Open Obsidian → create a new vault (point to a folder)
3. Go to **Settings → Community Plugins → Browse** → Install **Obsidian Git**
4. Configure with your GitHub HTTPS URL and PAT token
5. Tap **Pull** to clone your vault

> ⚠️ iOS has filesystem restrictions. Use **Option B** for iPhone/iPad.

---

### Option B: Working Copy + Obsidian (Recommended for iOS)

1. Install **Working Copy** (free tier works) from the App Store
2. In Working Copy: **+** → **Clone repository** → paste your GitHub repo URL
3. Authenticate with your GitHub PAT
4. Tap **Clone**
5. Open **Obsidian** on iOS → **Open folder as vault**
6. Navigate to the **Working Copy** shared folder → select your vault

**To sync on iOS:**
- Open **Working Copy** → Pull before editing
- After editing in Obsidian → return to Working Copy → **Commit & Push**

> 💡 Shortcut: Add a Working Copy widget or use iOS Shortcuts app to automate pull/push with one tap.

---

### Option C: iSH + Git (Advanced iOS)

For power users — install [iSH](https://ish.app) (Linux shell for iOS) and run standard git commands.

---

## 🔁 Daily Sync Workflow

### Desktop
Everything is automatic once Obsidian Git is configured. Just use Obsidian normally.

Manual sync via Command Palette (`Ctrl+P`):
- `Obsidian Git: Pull` — pull latest changes
- `Obsidian Git: Commit and push` — push immediately

### Mobile
- **Android**: Tap the Git pull button in Obsidian before starting, push when done
- **iOS**: Open Working Copy → Pull → Open Obsidian → edit → return to Working Copy → Commit & Push

---

## ⚠️ Conflict Resolution

If you get merge conflicts:
1. Open the conflicted file — Git marks conflicts with `<<<<<<`, `=======`, `>>>>>>>`
2. Decide which version to keep, remove conflict markers
3. Save → commit again

**Best practice**: Always **pull before editing**, especially when switching devices.

---

## 🔐 Security Notes

- Keep your repo **Private** on GitHub
- **Never commit** sensitive passwords or tokens to the vault
- Your `.gitignore` already excludes Obsidian local state files
- Rotate your PAT every 90 days for security

---

## 📱 Recommended Mobile Plugins

Once synced, install these in Obsidian Mobile:
- **Obsidian Git** (Android) — auto sync
- **Calendar** — visual daily note navigation
- **Tasks** — enhanced task management

---

*→ [[README|Back to README]] · [[Dashboard|Dashboard]]*
