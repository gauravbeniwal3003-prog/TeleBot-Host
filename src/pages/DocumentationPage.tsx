import React, { useState } from 'react';
import {
  BookOpen,
  Search,
  Code2,
  Terminal,
  Copy,
  Check,
  Database,
  KeyRound,
  Shield,
  Layers,
  ArrowRight,
  ExternalLink,
  Bot,
  Sparkles,
  Zap,
  HelpCircle,
  FileCode2,
  Cpu,
  RefreshCw,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

interface DocumentationPageProps {
  navigate: (path: string) => void;
}

export const DocumentationPage: React.FC<DocumentationPageProps> = ({ navigate }) => {
  const [activeCategory, setActiveCategory] = useState('quickstart');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  const handleCopyCode = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  const navCategories = [
    { id: 'quickstart', label: '🚀 60-Second Quickstart', icon: Zap },
    { id: 'telebot', label: '🤖 PyTelegramBotAPI', icon: Code2 },
    { id: 'ptb', label: '⚡ Python-Telegram-Bot (Async)', icon: Code2 },
    { id: 'database', label: '💾 SQLite & File Persistence', icon: Database },
    { id: 'envvars', label: '🔐 Secrets & Env Variables', icon: KeyRound },
    { id: 'troubleshooting', label: '🛠️ Troubleshooting & Fixes', icon: HelpCircle },
  ];

  const codeSnippets: Record<string, { title: string; desc: string; filename: string; code: string }> = {
    telebot: {
      title: 'PyTelegramBotAPI (TeleBot)',
      desc: 'Simple and synchronous Telegram Bot API framework.',
      filename: 'main.py',
      code: `import telebot
import os

# Fetch Bot Token safely from TeleBot Host environment variables
BOT_TOKEN = os.getenv("TELEGRAM_TOKEN", "YOUR_TELEGRAM_BOT_TOKEN")

bot = telebot.TeleBot(BOT_TOKEN)

@bot.message_handler(commands=['start', 'help'])
def send_welcome(message):
    bot.reply_to(message, "Hello! Bot is running 24/7 on TeleBot Host!")

@bot.message_handler(func=lambda message: True)
def echo_all(message):
    bot.reply_to(message, message.text)

print("[TeleBot Host] TeleBot starting polling...")
bot.infinity_polling()`,
    },
    ptb: {
      title: 'Python-Telegram-Bot (v20+ / v21+ / v22+)',
      desc: 'Async framework with resilient HTTPX connection pooling and custom timeouts.',
      filename: 'main.py',
      code: `import os
from telegram import Update
from telegram.ext import Application, CommandHandler, ContextTypes
from telegram.request import HTTPXRequest

BOT_TOKEN = os.getenv("TELEGRAM_TOKEN", "YOUR_TELEGRAM_BOT_TOKEN")

# Resilient connection settings (Prevents httpx.ConnectTimeout errors)
request_config = HTTPXRequest(
    connect_timeout=60.0,
    read_timeout=60.0,
    write_timeout=60.0,
    pool_timeout=60.0,
    connection_pool_size=8,
)

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text("Hello! Bot is running 24/7 on TeleBot Host.")

def main():
    app = (
        Application.builder()
        .token(BOT_TOKEN)
        .request(request_config)
        .get_updates_request(request_config)
        .build()
    )

    app.add_handler(CommandHandler("start", start))

    print("[TeleBot Host] Python-Telegram-Bot starting with resilient timeouts...")
    app.run_polling(drop_pending_updates=True)

if __name__ == "__main__":
    main()`,
    },
    database: {
      title: 'SQLite & Persistent Storage',
      desc: 'How SQLite databases (.db) and JSON files persist safely across bot restarts.',
      filename: 'db_example.py',
      code: `import sqlite3
import os

# Files persist automatically across container restarts!
DB_PATH = "bot_database.db"

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            user_id INTEGER PRIMARY KEY,
            username TEXT,
            joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()
    print("[TeleBot Host] SQLite database initialized")

init_db()`,
    },
  };

  const filteredCategories = navCategories.filter(cat =>
    cat.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-12 text-slate-900 max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="bg-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 bg-[#24A1DE]/20 text-sky-300 px-3 py-1 rounded-full text-xs font-bold border border-sky-400/20">
              <BookOpen className="w-3.5 h-3.5" />
              Developer Knowledge Base
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              TeleBot Host Documentation & Tutorials
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm">
              Learn how to host, configure environment secrets, handle SQLite databases, and run Telegram bots 24/7.
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search docs & topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-800 text-white placeholder-slate-400 text-xs rounded-xl pl-9 pr-4 py-2.5 border border-slate-700 focus:outline-none focus:border-[#24A1DE]"
            />
          </div>
        </div>
      </div>

      {/* Main Content Layout: Left Nav + Right Tutorial Card */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
        {/* Left Nav Panel */}
        <div className="md:col-span-1 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs space-y-1 sticky top-4">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 py-1.5">
            Topics & Frameworks
          </div>
          {filteredCategories.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2.5 cursor-pointer ${
                  isActive
                    ? 'bg-[#24A1DE] text-white shadow-xs font-bold'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right Main Content Panel */}
        <div className="md:col-span-3 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
          {/* Quickstart View */}
          {activeCategory === 'quickstart' && (
            <div className="space-y-6">
              <div>
                <span className="text-xs font-bold text-[#0088cc] uppercase tracking-wider">Fast Setup Guide</span>
                <h2 className="text-xl font-extrabold text-slate-900">How to Host Your Bot in 60 Seconds</h2>
                <p className="text-slate-600 text-xs mt-1">
                  Follow these 3 simple steps to get your bot running continuously 24/7.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="w-7 h-7 rounded-lg bg-sky-100 text-[#0088cc] flex items-center justify-center font-bold text-xs">
                    1
                  </div>
                  <h3 className="font-bold text-slate-900 text-xs">Create Bot on Telegram</h3>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    Open Telegram and message <code>@BotFather</code>. Send <code>/newbot</code>, choose a name, and copy your API Bot Token.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="w-7 h-7 rounded-lg bg-sky-100 text-[#0088cc] flex items-center justify-center font-bold text-xs">
                    2
                  </div>
                  <h3 className="font-bold text-slate-900 text-xs">Upload Script File</h3>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    In TeleBot Host dashboard, click <strong>"Deploy New Bot"</strong>, paste your token, and upload your <code>main.py</code> or <code>bot.js</code>.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                    3
                  </div>
                  <h3 className="font-bold text-slate-900 text-xs">Run 24/7 Autopilot</h3>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    Click <strong>"Start Bot"</strong>. TeleBot Host watchdog automatically monitors process health and restarts on crashes.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-sky-50 border border-sky-200 text-xs text-sky-900 flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-[#0088cc] shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Zero Server Configuration Required: </span>
                  You don't need to manually configure VPS SSH keys, Systemd services, or Python virtual environments. TeleBot Host handles all dependencies automatically!
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => navigate('/dashboard')}
                  className="inline-flex items-center gap-2 bg-[#24A1DE] hover:bg-[#1e8cc3] text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer"
                >
                  <span>Go to Bot Manager & Deploy Now</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Code Snippets View */}
          {codeSnippets[activeCategory] && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    {codeSnippets[activeCategory].title}
                  </h2>
                  <p className="text-slate-500 text-xs">
                    {codeSnippets[activeCategory].desc}
                  </p>
                </div>
                <button
                  onClick={() => handleCopyCode(activeCategory, codeSnippets[activeCategory].code)}
                  className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 cursor-pointer"
                >
                  {copiedCodeId === activeCategory ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span className="text-emerald-700 font-bold">Copied to Clipboard!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-slate-500" />
                      <span>Copy Code Snippet</span>
                    </>
                  )}
                </button>
              </div>

              <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
                <div className="bg-slate-900 px-4 py-2 flex items-center justify-between border-b border-slate-800 text-xs text-slate-400 font-mono">
                  <span>{codeSnippets[activeCategory].filename}</span>
                  <span className="text-[11px] text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                    TeleBot Host Ready
                  </span>
                </div>
                <pre className="p-4 text-slate-200 font-mono text-xs overflow-x-auto leading-relaxed">
                  <code>{codeSnippets[activeCategory].code}</code>
                </pre>
              </div>
            </div>
          )}

          {/* Secrets & Environment Variables */}
          {activeCategory === 'envvars' && (
            <div className="space-y-4 text-xs">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Environment Variables & Secrets</h2>
                <p className="text-slate-500">Keep your Bot Tokens and API keys safe without hardcoding them in Python files.</p>
              </div>

              <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Security Best Practice: </span>
                  Never commit or share your Telegram Bot Token in public repositories! Always use Environment Variables.
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <h3 className="font-bold text-slate-800">How to set Environment Variables in TeleBot Host:</h3>
                <ol className="list-decimal list-inside space-y-2 text-slate-700 pl-1">
                  <li>Go to <strong>Bot Management</strong> and select your bot card.</li>
                  <li>Click <strong>"Environment & Secrets"</strong>.</li>
                  <li>Add your keys like <code>BOT_TOKEN</code>, <code>API_ID</code>, <code>DATABASE_URL</code>.</li>
                  <li>In your Python code, read them using <code>os.getenv("BOT_TOKEN")</code>.</li>
                </ol>
              </div>
            </div>
          )}

          {/* Webhooks vs Long Polling */}
          {activeCategory === 'webhooks' && (
            <div className="space-y-4 text-xs">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Webhooks vs Long Polling</h2>
                <p className="text-slate-500">Choose how Telegram sends updates to your bot.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Long Polling (Recommended)
                  </span>
                  <p className="text-slate-600 leading-relaxed">
                    Default mode for most bots. Your bot continuously requests updates from Telegram. Works automatically out of the box with zero SSL domain setup!
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <span className="text-xs font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                    HTTPS Webhooks
                  </span>
                  <p className="text-slate-600 leading-relaxed">
                    Telegram pushes HTTP requests directly to your bot endpoint when events occur. Requires HTTPS SSL endpoint configuration.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Troubleshooting */}
          {activeCategory === 'troubleshooting' && (
            <div className="space-y-4 text-xs">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Troubleshooting & Common Fixes</h2>
                <p className="text-slate-500">Quick solutions for common Telegram bot hosting issues.</p>
              </div>

              <div className="space-y-3 pt-2">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="font-bold text-slate-900">Q: httpx.ConnectTimeout or Network Retry Loop: Timed out</span>
                  <p className="text-slate-600 leading-relaxed">
                    By default, <code>python-telegram-bot</code> uses a 5.0-second timeout during bootstrap. To avoid connection drops, pass <code>HTTPXRequest(connect_timeout=60.0, read_timeout=60.0)</code> to <code>Application.builder().request(request_config)</code> and set <code>app.run_polling(drop_pending_updates=True)</code>.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="font-bold text-slate-900">Q: ModuleNotFoundError: No module named 'aiogram'</span>
                  <p className="text-slate-600">
                    TeleBot Host automatically installs common frameworks (Aiogram, Pyrogram, Telethon, Telegraf). If you are using specialized packages, include a <code>requirements.txt</code> file in your bot directory.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="font-bold text-slate-900">Q: What happens if my bot crashes?</span>
                  <p className="text-slate-600">
                    TeleBot Host includes an automated restart watchdog. If your bot crashes due to an unhandled exception or network timeout, the system automatically restarts it within seconds.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="font-bold text-slate-900">Q: Are SQLite database files saved?</span>
                  <p className="text-slate-600">
                    Yes! All files in your bot directory (including <code>.db</code>, <code>.sqlite</code>, and <code>.json</code> storage files) are stored in persistent volume storage and survive bot restarts.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
