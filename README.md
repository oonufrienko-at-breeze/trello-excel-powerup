# Excel Preview — Trello Power-Up

Preview `.xlsx`, `.xls`, `.xlsm` attachments directly in a Trello modal.  
Files are rendered in-browser via **SheetJS** — nothing is uploaded to any server.

---

## Project structure

```
trello-excel-powerup/
├── manifest.json       ← Power-Up descriptor (register in Trello)
├── client.html         ← Power-Up iframe entry point
├── viewer.html         ← Full Excel viewer (opened as modal)
├── section.html        ← Attachment-sections content iframe
├── picker.html         ← File picker popup (multiple Excel files)
├── settings.html       ← Optional settings popup
├── styles.css          ← All styles
├── index.html          ← Info page (GitHub Pages root)
├── icons/
│   └── icon.svg        ← Power-Up icon
└── js/
    └── client.js       ← Power-Up capabilities & logic
```

---

## Deployment guide (step by step)

### Step 1 — Create GitHub repository

1. Go to [github.com](https://github.com) → click **New repository**.
2. Name it: `trello-excel-powerup`
3. Set it **Public** (required for GitHub Pages free tier).
4. Click **Create repository**.
5. In your terminal, from the project folder:

```bash
cd /path/to/trello-excel-powerup
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/trello-excel-powerup.git
git push -u origin main
```

---

### Step 2 — Enable GitHub Pages

1. In your repo on GitHub → **Settings** → **Pages** (left sidebar).
2. Under **Source** → select **Deploy from a branch**.
3. Branch: `main`, folder: `/ (root)` → click **Save**.
4. Wait ~1 minute. GitHub will show your URL:
   ```
   https://YOUR_GITHUB_USERNAME.github.io/trello-excel-powerup/
   ```
5. Copy this URL — it is your `YOUR_GH_PAGES_DOMAIN` value.

---

### Step 3 — Replace placeholders in the code

Search for `YOUR_GH_PAGES_DOMAIN` in these files and replace with the real domain:

| File | Placeholder |
|------|------------|
| `manifest.json` | `https://YOUR_GH_PAGES_DOMAIN/trello-excel-powerup/...` |
| `js/client.js`  | `var POWERUP_BASE_URL = 'https://YOUR_GH_PAGES_DOMAIN/trello-excel-powerup'` |
| `picker.html`   | `var POWERUP_BASE_URL = ...` |
| `section.html`  | `var POWERUP_BASE_URL = ...` |

**Example** — if your GitHub username is `johndoe`:
```
YOUR_GH_PAGES_DOMAIN  →  johndoe.github.io
```

So every URL becomes: `https://johndoe.github.io/trello-excel-powerup/...`

After replacing, commit & push again:

```bash
git add .
git commit -m "Set GitHub Pages domain"
git push
```

---

### Step 4 — Register Power-Up in Trello

1. Go to [https://trello.com/power-ups/admin](https://trello.com/power-ups/admin)
2. Click **New Power-Up** (top right).
3. Fill in:
   - **Power-Up name**: `Excel Preview`
   - **Workspace**: choose your Trello workspace
   - **Iframe connector URL**:
     ```
     https://YOUR_GITHUB_USERNAME.github.io/trello-excel-powerup/client.html
     ```
   - **Privacy policy URL**: you can put your GitHub repo URL here temporarily
4. Under **Capabilities**, enable:
   - `card-buttons`
   - `attachment-sections`
   - `show-settings`
5. Click **Save**.
6. On the next screen you will see your **API key** — copy it.
   - If you need it in code, put it where `YOUR_TRELLO_API_KEY` is referenced.
   - For this Power-Up, the API key is not required in the frontend code itself (Trello injects it automatically via the SDK).

---

### Step 5 — Add Power-Up to your board

1. Open the Trello board where you want to use it.
2. Click **Power-Ups** button (top menu, looks like a lightning bolt or plug icon).
3. Click **Custom Power-Ups** tab.
4. Search for `Excel Preview` (the name you entered in Step 4).
5. Click **Add**.
6. Confirm the permissions dialog.

---

### Step 6 — Test it

1. Open any card on the board.
2. Add an Excel file (`.xlsx`, `.xls`, or `.xlsm`) as an attachment.
3. You will see:
   - A **"Excel Preview"** button in the card actions area (right column).
   - An **"Excel Previews"** section below the attachments list showing "Open preview" next to each Excel file.
4. Click either button → a modal opens with the rendered spreadsheet.
5. Use **sheet tabs** at the top to switch between sheets.
6. Click **✕** to close.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| Button doesn't appear | Power-Up not enabled on board | Step 5 |
| "Could not load file" error | CORS issue with attachment URL | Check browser console; Trello CDN URLs are usually CORS-safe |
| Modal opens blank | Wrong `POWERUP_BASE_URL` | Recheck Step 3 replacements |
| Power-Up not found in search | Not saved or wrong workspace | Repeat Step 4 |

---

## Architecture note — why frontend-only (no Vercel backend)?

- Trello serves all attachment files from its CDN with permissive CORS headers, so `fetch()` works from any browser directly.
- SheetJS can parse `.xlsx`, `.xls`, `.xlsm` entirely in the browser with no server round-trip.
- No backend = no cold starts, no API costs, no auth tokens to manage, zero infrastructure.
- A Vercel backend would only be needed if you wanted server-side PDF export or if Trello changed its CORS policy — neither applies here.
