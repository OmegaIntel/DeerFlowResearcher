# DeerFlow Meeting Browser Extension

This Chrome extension demonstrates a lightweight integration of
[meeting-minutes](https://github.com/Zackriya-Solutions/meeting-minutes)
and [nanobrowser](https://github.com/nanobrowser/nanobrowser).

 - **Meeting Recorder**: records audio from the microphone and transcribes it with
   the OpenAI Whisper API when `OPENAI_API_KEY` is provided in `background.js`.
   If no key is set, the audio is sent to a local backend (`POST /transcribe`).
- **Summary Generation**: after transcription you can send the text to
  `/process-transcript` and poll `/get-summary/{meeting_id}` to retrieve
  a meeting summary similar to the original project.
- **Automation Prompt**: send a prompt to a local backend (`POST /prompt`) or use
  built-in commands (`open:<url>`, `search:<query>`, `click:<selector>`,
  `fill:<selector>|<text>`, `scrape:<selector>` or `screenshot`) to automate and
  capture information from the browser. If you set `TAVILY_API_KEY` in
  `background.js`, `search:` will return results from the Tavily API instead of
  just opening Google.
- **Agent Mode**: prefix a prompt with `agent:` to let the extension use OpenAI
  functions to plan multi-step browser actions with the commands above.
- **Conversation History**: previous transcripts, summaries and automation
  results are stored locally and shown in the popup.
  - **Download Summary/Transcript/History**: export the latest meeting summary,
    transcript or the full history as JSON files. Screenshots can also be
    downloaded when captured.
- **Clear History**: remove all saved transcripts and automation results from the
  popup.

## Usage

1. Set your API keys in `background.js`:
   - `OPENAI_API_KEY` enables Whisper transcription and multi-agent planning.
     Without it, audio is sent to `/transcribe` on your backend.
   - `TAVILY_API_KEY` lets the `search:` command return Tavily results.
   You may still need a backend providing `/process-transcript`, `/get-summary/{meeting_id}`
   and `/prompt` endpoints.
2. Load the `chrome-extension` folder as an unpacked extension in Chrome.
3. Click the toolbar icon to open the popup, record a meeting and generate a
   summary. Run automation prompts with the built-in commands (`search:`,
   `open:`, `click:`, `fill:`, `scrape:`, `screenshot`) or use `agent:` for
   automatic planning.
4. Use the **Clear History** button to wipe local history or the **Download
   History** button to save it as a file. When a screenshot is taken, a
   **Download Screenshot** button will appear to save the image.

This project is still a simplified integration. For full functionality you will
need to expand the backend services and UI further.
Add your API keys in `background.js` for Whisper transcription (`OPENAI_API_KEY`)
and Tavily search (`TAVILY_API_KEY`).
