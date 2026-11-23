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

## 3. Open a terminal in the Reelhouse folder

- **Windows:** open the unzipped folder, click the address bar at the top, type `cmd`, and press Enter.
- **Mac:** open **Terminal**, type `cd ` (with a space), drag the Reelhouse folder into the Terminal window, and press Enter.

Type each of the commands below and press Enter. Wait for one to finish before typing the next.

## 4. Install and download everything

```
npm install
```
Installs the app (a few minutes).

```
npm run setup:ollama
```
Downloads the story-writing model, about 4.7 GB. Ollama must be installed and open (on Mac, the llama icon is in the menu bar; on Windows, it's in the tray by the clock).

```
npm run setup:voice
```
Installs Piper and downloads two voices: a narrator and a set of character voices (about 200 MB).

## 5. Start Reelhouse

```
npm run build
npm start
```

Open **http://localhost:3000** in your browser. The badge in the top right should say **"Ollama · qwen2.5:7b · Voice on"**.

The first video takes a little longer while Reelhouse downloads a small browser it uses to draw the video frames.

## 6. Make stories

- **By hand:** click the **Research Desk**, type a theme, press **Pitch stories**, then **Produce** one.
- **On autopilot:** click the **Producer's Office**, write a channel brief (for example "cozy, funny stories about animals and friendship"), pick stories per day, and switch **Autopilot** on.

Finished videos appear in the `output` folder inside Reelhouse, each with a `caption.txt` ready to paste when you post.

Reelhouse only works while the terminal from step 5 stays open. To stop it, press `Ctrl + C` in that terminal. To start it again later, open a terminal in the folder (step 3) and type `npm start`.

---

## If something isn't working

The **Producer's Office** has a "Studio setup" section that shows what Reelhouse can see.

- **"Ollama not running":** open the Ollama app, then refresh the page.
- **"Ollama running, model not downloaded":** run `npm run setup:ollama` again.
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

If you change a voice, run `npm run setup:voice` again to download it.
