# Setting up Reelhouse (free version)

This guide gets Reelhouse running on your own computer with **free, open-source AI**:

- **Ollama** writes the stories, using an open model (Qwen 2.5) that runs on your computer.
- **Piper** reads the stories aloud (narrator and character voices), also on your computer.

Nothing here needs an account or a credit card. Claude is optional (see the end).

**What your computer needs:** Windows 10/11 or a Mac, about 8 GB of memory (16 GB is better), and about 8 GB of free disk space. The first time takes about 20 to 30 minutes, mostly downloads.

---

## 1. Install the tools (one time)

Install these three free programs. Use the default options in each installer.

| Program | Why | Where |
| --- | --- | --- |
| **Node.js** (the "LTS" version) | Runs the Reelhouse app | https://nodejs.org |
| **Ollama** | Runs the story-writing AI | https://ollama.com/download |
| **Python 3** | Needed to install the voices | https://www.python.org/downloads/ (on Windows, tick **"Add python.exe to PATH"** on the first screen) |

## 2. Get Reelhouse

On the GitHub page for this repository, click the green **Code** button, then **Download ZIP**. Unzip it somewhere easy, like your Documents folder.

## 3. Start Reelhouse

Open the Reelhouse folder and double-click:

- **Windows:** `Start Reelhouse.bat`. If Windows shows "Windows protected your PC", click **More info**, then **Run anyway**.
- **Mac:** `Start Reelhouse.command`. The first time, right-click it and choose **Open**, then **Open** again (Macs ask this for files downloaded from the internet).

A window opens and Reelhouse gets everything ready by itself: it installs the app, downloads the story-writing model (about 4.7 GB), installs the voices (about 200 MB) and opens **http://localhost:3000** in your browser. The first time takes 20 to 30 minutes, mostly downloads. After that it starts in under a minute.

The badge in the top right should say **"Ollama · qwen2.5:7b · Voice on"**. If the window shows a line starting with `!!`, it tells you what's missing and what to install.

**Keep that window open** while you use Reelhouse. Autopilot only works while it's open. To stop Reelhouse, close the window.

**Start it automatically when your computer turns on (optional):**

- **Windows:** press `Windows + R`, type `shell:startup` and press Enter. Right-click `Start Reelhouse.bat`, choose **Create shortcut**, and move the shortcut into the folder that opened.
- **Mac:** open **System Settings**, then **General**, then **Login Items**. Click **+** and choose `Start Reelhouse.command`.

Also set your computer not to sleep while plugged in, or autopilot pauses when it sleeps.

<details>
<summary>Prefer typing commands?</summary>

In a terminal in the Reelhouse folder: `npm install`, `npm run setup:ollama`, `npm run setup:voice`, `npm run build`, then `npm start`.

</details>

## 4. Make stories

- **By hand:** click the **Research Desk**, type a theme, press **Pitch stories**, then **Produce** one.
- **On autopilot:** click the **Producer's Office**, write a channel brief (for example "cozy, funny stories about animals and friendship"), pick stories per day, and switch **Autopilot** on.

- **Story style:** in the Producer's Office, **Hook** makes 60 to 90 second "in a world where..." stories with an underdog reveal and a Part 2 cliffhanger. **Cozy** makes gentle 30 to 45 second tales.
- **Trends:** click the **Trend Lookout** on the roof and press **Check trends now** to see what's popular this week. Autopilot uses these trends in its pitches on its own.

- **Music:** every story gets its own background tune automatically. To use your own songs, put MP3 files in the `music` folder (see `music/README.md`). Only use music you have the rights to post.

Finished videos appear in the `output` folder inside Reelhouse, each with a `caption.txt` ready to paste when you post.


---

## If something isn't working

The **Producer's Office** has a "Studio setup" section that shows what Reelhouse can see.

- **"Ollama not running":** open the Ollama app, then refresh the page.
- **"Ollama running, model not downloaded":** start Reelhouse again (it downloads the model), or run `npm run setup:ollama`.
- **"Voiceover off":** run `npm run setup:voice` again and read any error it prints. Usually Python isn't installed or wasn't added to PATH.
- **Stories are weak or don't follow the format:** small local models make more mistakes than big ones. If your computer has 16 GB or more of memory, try a bigger model: run `ollama pull qwen2.5:14b`, and add the line `OLLAMA_MODEL=qwen2.5:14b` to a file named `.env.local` in the Reelhouse folder. Then restart.

## Optional: use Claude instead

Claude writes stronger stories but costs a few cents per story. Get a key at https://platform.claude.com (API Keys), put `ANTHROPIC_API_KEY=your-key` in `.env.local`, restart, and choose **Claude** under "Story writer" in the Producer's Office.

## Settings you can put in `.env.local`

| Setting | What it does | Default |
| --- | --- | --- |
| `OLLAMA_MODEL` | Which Ollama model writes stories | `qwen2.5:7b` |
| `OLLAMA_HOST` | Where Ollama is running | `http://127.0.0.1:11434` |
| `REELHOUSE_ENGINE` | Force `ollama`, `claude` or `demo` | chosen in the app |
| `PIPER_NARRATOR_VOICE` | Narrator voice ([list of voices](https://rhasspy.github.io/piper-samples/)) | `en_US-lessac-medium` |
| `PIPER_CHARACTER_VOICE` | Multi-speaker voice for characters | `en_US-libritts_r-medium` |
| `REELHOUSE_VOICE` | `0` turns voiceover off | on |
| `REELHOUSE_OUTPUT_DIR` | Where finished stories are saved | `./output` |
| `REELHOUSE_PASSWORD` | Asks for a password before showing the studio (for servers; user name `reelhouse` or `REELHOUSE_USER`) | off |
| `REELHOUSE_STYLE` | Force `hook` or `cozy` | chosen in the app |
| `REELHOUSE_MUSIC` | `0` turns background music off | on |
| `REELHOUSE_SUBREDDITS` | Reddit communities the Trend Lookout reads, separated by commas | `aivideo,animation,WritingPrompts,shortstories` |
| `REELHOUSE_TRENDS_RSS` | Google Trends feed (set it empty to skip Google Trends) | US daily trends |

If you change a voice, run `npm run setup:voice` again to download it.
