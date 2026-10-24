# 🚀 Instagram Comment Automator (Reels & Posts)

<div align="center">

![Instagram Comment Automator](public/AppIcon.png)

### The Free, Open-Source Alternative to Hypello & ManyChat.
**Automate comments, enforce Follow-Gates, and dispatch instant DMs on Instagram Reels and Posts — 24/7, with zero monthly subscription fees.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D22.0.0-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Deploy to Render](https://img.shields.io/badge/Deploy%20to-Render-46E3B7?style=flat-square&logo=render&logoColor=black)](https://render.com/deploy?repo=https://github.com/udhawan007/instagram-automator)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](http://makeapullrequest.com)
[![Status](https://img.shields.io/badge/Cost-%240%20%2F%20Free%20Forever-emerald?style=flat-square)](#)

<br/>

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/udhawan007/instagram-automator)

</div>

---

## 🌟 Why This Exists

Commercial tools like **Hypello**, **ManyChat**, and **Buffer** charge steep monthly subscriptions ($20 – $100+/month) while placing artificial caps on the number of comments and DMs you can send.

**Instagram Comment Automator** gives creators, marketers, and businesses the same powerful Reels & Posts automation capabilities for **$0/month** by connecting directly to Meta’s official, free Graph API.

---

## ✨ Features

- 🎯 **Comment-to-DM Automation:** Automatically send direct messages with guide links, discount codes, or files whenever someone comments on your Reel or Post.
- 🔒 **Follow-Gate (Follow to Unlock):** Require commenters to follow your profile before unlocking their DM link. Non-followers receive a follow prompt with a quick-action unlock button.
- 🛡️ **Anti-Spam Rotating Public Replies:** Rotate between multiple comment reply variations (with `@username` tagging) so your account never triggers Instagram spam filters.
- ⚠️ **Negative Keyword Filters:** Exclude comments containing words like `scam`, `fake`, `bot`, or `refund` from triggering responses.
- 📱 **Interactive Reels Simulator:** Built-in iPhone sandbox to test keyword triggers, follow gates, and DMs without needing an Instagram account connected.
- ☁️ **24/7 Cloud Ready:** Deploy to [Render.com](https://render.com) in 60 seconds with zero configuration. Runs 24/7 even when your laptop is turned off.
- 📲 **Mobile-First & PWA UI:** Sleek mobile bottom navigation bar, touch-friendly sheets, and "Add to Home Screen" support so you can operate it on your iPhone or Android.
- ⚡ **Zero External Dependencies:** Built with pure Node.js and persistent native `node:sqlite` for sub-15ms execution and instant startup.

---

## 📊 How It Works

```mermaid
flowchart LR
    A["Follower Comments on Reel\n(e.g. 'SEND LINK')"] --> B["Meta Webhook Event\n(POST /api/webhook)"]
    B --> C{"Negative Filter Check\n('fake', 'scam' ?)"}
    C -- Yes --> D["Ignore & Skip"]
    C -- No --> E{"Keyword Trigger Check"}
    E -- Match --> F{"Follow-Gate Enabled?"}
    F -- "User Not Following" --> G["🔒 Send Follow-Check DM\n+ 'Follow First' Public Reply"]
    F -- "User Following" --> H["⚡ Send Unlocked Resource DM\n+ Rotating Public Reply"]
```

---

## 🚀 Quick Start (Run Locally in 60 Seconds)

### Prerequisites
- [Node.js](https://nodejs.org/) `>= 22.0.0`

### 1. Clone & Run
```bash
git clone https://github.com/udhawan007/instagram-automator.git
cd instagram-automator

# Start the server (zero external npm installs needed!)
node server.js
```

### 2. Open Dashboard
Visit **`http://localhost:3750`** in your browser.

---

## ☁️ 24/7 Free Cloud Deployment (Render.com)

To run your automation continuously around the clock without keeping your computer on:

1. Click the **Deploy to Render** button below:
   
   [![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/udhawan007/instagram-automator)

2. Sign in with your GitHub account.
3. Render will read the included `render.yaml` blueprint and deploy on the **Free Tier**.
4. You will receive a permanent HTTPS URL (e.g., `https://instagram-automator-xxxx.onrender.com`).

> **Tip:** To keep the free instance awake 24/7 without idle spin-down, add a free 5-minute health check at [cron-job.org](https://cron-job.org) pointing to `https://your-app.onrender.com/api/status`.

---

## 🔑 Connecting Your Instagram Account (Live Mode)

1. **Switch Instagram Account to Professional:**
   * In your Instagram app: `Settings` &rarr; `Account type and tools` &rarr; `Switch to Professional Account` (select **Creator** or **Business**).
   * Link it to any Facebook Page.
2. **Generate a Meta Graph API Token:**
   * Go to [developers.facebook.com](https://developers.facebook.com/) and create a free App.
   * In the [Graph API Explorer](https://developers.facebook.com/tools/explorer/), add permissions:
     * `instagram_manage_comments`
     * `instagram_manage_messages`
   * Generate your token and convert it to a **Permanent Token** via [Access Token Debugger](https://developers.facebook.com/tools/debug/accesstoken/).
3. **Configure Settings:**
   * In the app dashboard, go to the **Settings** tab.
   * Paste your **Page Access Token** and toggle **Live Mode**.
4. **Subscribe to Webhooks:**
   * In your Meta App &rarr; **Webhooks** &rarr; Select **Instagram**.
   * Callback URL: `https://your-app.onrender.com/api/webhook`
   * Verify Token: Copy your verify token from the **Settings** tab.
   * Click **Subscribe** next to the `comments` field.

---

## 📱 Mobile App Installation (PWA)

Operate your automations on the go directly from your phone:

* **iPhone (Safari):** Open your cloud URL &rarr; Tap the **Share** button &rarr; Tap **Add to Home Screen**.
* **Android (Chrome):** Open your cloud URL &rarr; Tap the three dots **(⋮)** &rarr; Tap **Add to Home Screen**.

---

## 🛠️ Tech Stack

* **Runtime:** Node.js (v22+)
* **Database:** Native SQLite via `node:sqlite` (zero compilation, zero native bindings)
* **Frontend:** Tailwind CSS, Lucide Icons, Plus Jakarta Sans
* **APIs:** Meta Instagram Graph API (v19.0+), Webhooks Hub Protocol

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).

---

<div align="center">
Made with ❤️ by <a href="https://github.com/udhawan007">Udit Dhawan</a>. Stars and contributions are welcome!
</div>
