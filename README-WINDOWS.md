# Windows Setup Guide

Follow these steps to get the application running locally on Windows.

## 1. Install Node.js 20+
1. Download the latest LTS or Current release of Node.js version 20 or newer from [nodejs.org](https://nodejs.org/).
2. Run the installer and ensure that "Add to PATH" is selected.
3. Confirm the installation by opening **Windows Terminal** or **PowerShell** and running:
   ```powershell
   node --version
   npm --version
   ```

## 2. Install LM Studio and enable the Local Server
1. Download LM Studio for Windows from the [official website](https://lmstudio.ai/).
2. Install and launch LM Studio.
3. Open **Settings → Local Server** and enable the Local Server. The defaults are:
   - Host: `127.0.0.1`
   - Port: `1234`
4. Leave LM Studio running so the local server stays available.

### (Optional) Load a text model in LM Studio
1. In LM Studio, browse the model catalog.
2. Download your preferred text model.
3. Load the model so it is available to answer chat requests.

## 3. Install Ollama for Windows
1. Open **Windows Terminal** or **PowerShell** and run:
   ```powershell
   winget install Ollama.Ollama
   ```
2. When the installer completes, restart the terminal so the `ollama` command is available.

## 4. Pull the embedding model
With Ollama installed, run:
```powershell
ollama pull nomic-embed-text
```

## 5. Clone and configure the project
1. Clone or download this repository.
2. Open a terminal in the project directory.
3. Set the `OPENAI_API_KEY` environment variable (or plan to provide it later through the `/admin` page):
   ```powershell
   setx OPENAI_API_KEY "your-api-key"
   ```
   > Note: `setx` sets the variable for new terminal sessions. For the current session, also run:
   ```powershell
   $Env:OPENAI_API_KEY = "your-api-key"
   ```

## 6. Install dependencies and start the app
1. Install Node dependencies:
   ```powershell
   npm install
   ```
2. Start the development server:
   ```powershell
   npm run dev
   ```
3. Leave the terminal running. The app will be available at http://localhost:3000.

## 7. Finish configuration in the app
1. Open http://localhost:3000 in your browser.
2. Navigate to `/admin` and fill in the required configuration values (including API keys if you did not set `OPENAI_API_KEY`).
3. Visit `/persona` to customize the persona settings.
4. Upload a document to the application.
5. Start chatting and, if configured, use the voice features.

Following these steps sets up a fully functional local environment on Windows.
