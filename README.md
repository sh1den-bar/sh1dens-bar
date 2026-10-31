# SH1DEN'S Bar: setup guide

A PS1-style bar for the sh1denfps community. Visitors make a character, hang out, chat, and watch YouTube together on the TV on the wall.

It runs as a free static website (GitHub Pages) with a free Firebase database for the chat, the TV queue and saved characters. There's no server to run.

Setup takes about 15 minutes. You'll need a Google account (for Firebase) and a GitHub account.

## What's in this folder

| File | What it does |
|---|---|
| `index.html` | The page |
| `bar.js` | The 3D bar, characters, dances and music |
| `net.js` | Room chat, the shared TV and saving characters |
| `config.js` | Your Firebase settings (you fill this in) |
| `database.rules.json` | Security rules you paste into Firebase |

---

## 1. Create the Firebase project

1. Go to <https://console.firebase.google.com> and click **Create a project**. Call it something like `sh1dens-bar`. You can turn off Google Analytics.
2. In the left menu, open **Build → Authentication**, click **Get started**, then on the **Sign-in method** tab enable **Anonymous**. Visitors join the room without making an account.
3. Open **Build → Realtime Database** and click **Create database**.
   - Location: **Belgium (europe-west1)** is closest to you.
   - Choose **Start in locked mode**.
4. On the Realtime Database page, open the **Rules** tab, delete what's there, paste everything from `database.rules.json`, then click **Publish**.

## 2. Connect the site to Firebase

1. Click the gear icon next to **Project Overview**, then **Project settings**.
2. Under **Your apps**, click the web icon `</>`. Give it a nickname (like `bar`) and click **Register app**. You don't need Firebase Hosting.
3. Firebase shows a `firebaseConfig` block. Copy these values into `config.js`:
   - `apiKey`
   - `authDomain`
   - `databaseURL`. If it's missing from the block, copy the address shown at the top of the Realtime Database **Data** tab. It looks like `https://sh1dens-bar-default-rtdb.europe-west1.firebasedatabase.app`.
   - `projectId`
   - `appId`

The API key in `config.js` is meant to be public. Your data is protected by the rules you published, not by hiding the key.

## 3. Put the site on GitHub Pages

1. Sign in at <https://github.com> and create a **New repository** named `sh1dens-bar`. Set it to **Public**.
2. On the repository page, click **Add file → Upload files**, drag in all five files (with your edited `config.js`), then click **Commit changes**.
3. Open **Settings → Pages**. Under **Build and deployment**, set Source to **Deploy from a branch**, branch **main**, folder **/ (root)**, then click **Save**.
4. After a minute or two the bar is live at:
   `https://YOUR-GITHUB-NAME.github.io/sh1dens-bar/`

Then go back to Firebase, open **Authentication → Settings → Authorized domains**, click **Add domain** and add `YOUR-GITHUB-NAME.github.io`.

## 4. Make yourself the host

1. Open your bar, click **Enter the bar**, then open **Room ID & host tools** at the bottom of the chat panel and click **Copy**.
2. In Firebase, open **Realtime Database → Data**. Hover over the top line and click **+**:
   - Key: `admins`, then add a child under it with key = your room ID and value = `true`.
3. Reload the bar. The host tools now show: delete messages, ban, skip videos, remove queue items and clear chat.
4. Click **Create your character** and use the name `sh1denfps`. Only a host can take that name. You'll appear as the bartender, and your chat messages pop up over his head.

Your room ID is tied to the browser. If you clear its site data or use a different browser or device, you'll get a new ID, and you'll need to add that one under `admins` too.

## 5. Add it to Twitch

On your Twitch channel, go to **About → Edit panels**, add a panel with an image or text, and set the link to your bar's address.

---

## How it works for visitors

- **Enter the bar**: music starts (or **Enter without sound**).
- **Create your character**: they type their Twitch name and pick a look, dance move and hangout spot. Once they click **Walk in**, everyone sees them.
- **Room chat**: only people with a character can post. Messages also pop up over their character's head.
- **The TV**: paste a YouTube link in the TV box, or in chat as `/tv <link>`. Videos play in order for everyone at the same time, and late joiners jump in at the current point. Chat messages with a YouTube link get a **Queue on TV** button.
- **Jukebox**: four original tracks rotate on their own. Clicking the jukebox button switches tracks. The music fades out while the TV is playing and comes back after.

## Moderation and limits

- **Slow mode**: one message or TV link per 3 seconds per person. The database enforces this.
- **Queue**: up to 25 videos, 3 per person. You can change this in `config.js`.
- **Video length**: videos over 15 minutes get skipped after 30 seconds, except ones a host queues. To change the limit, edit `900` (seconds) in the `dur` rule of `database.rules.json` and publish the rules again.
- **Blocked words**: add them to `blockedWords` in `config.js`, in lowercase.
- **Bans**: **Ban** next to a message removes that person's character, messages and queued videos and stops them posting. To unban, delete their entry under `bans` in the Firebase Data tab.
- **Names**: names are first come, first served. If someone takes a viewer's name, ban them, and the name frees up.
- **Firebase free plan**: about 100 people connected at once. That's plenty to start. If the bar gets bigger, the pay-as-you-go plan raises it.

## Troubleshooting

| You see | Fix |
|---|---|
| "Room offline" | `config.js` still has the placeholder values, or `databaseURL` is missing. |
| "Couldn't join the room (auth/operation-not-allowed)" | Anonymous sign-in isn't enabled (step 1.2). |
| "Couldn't join the room (auth/unauthorized-domain)" | Add your github.io domain under Authorized domains (end of step 3). |
| Chat says "Not allowed right now" for everyone | The rules weren't published (step 1.4). |
| The TV says a video can't play | That video's owner has blocked embedding. It gets skipped automatically. |
| No sound on a phone | Tap **Sound on**. Phones only play audio after a tap. |

Changes to the files go live a minute after you upload them to GitHub again.
