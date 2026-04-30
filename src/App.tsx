import { useEffect, useMemo, useRef, useState } from "react";
import { TonConnectButton, useTonAddress } from "@tonconnect/ui-react";

const MAX_ENERGY = 100;
type Screen = "dashboard" | "profile";
type Task = { id: string; title: string; description: string; reward: number; done: boolean };
type Player = { telegramId: string; username: string | null; firstName: string | null; walletAddress: string | null; coins: number; energy: number; level: number; xp: number; tasks: Record<string, boolean>; lastEnergyAt: string; updatedAt: string };

const DEFAULT_TASKS: Task[] = [
  { id: "wallet", title: "CONNECT TON WALLET", description: "Link your wallet to start hacking.", reward: 2000, done: false },
  { id: "channel", title: "JOIN CHANNEL", description: "Join our official channel.", reward: 500, done: false },
  { id: "friend", title: "INVITE FRIEND", description: "Invite a friend to CoderX.", reward: 1000, done: false }
];

function getTelegramUser() { return window.Telegram?.WebApp.initDataUnsafe?.user; }
function getTelegramUserName() { const user = getTelegramUser(); if (!user) return "@operator"; return user.username ? `@${user.username}` : user.first_name || "@operator"; }
function getTelegramId() { const user = getTelegramUser(); return user?.id ? String(user.id) : "local-test"; }
function getInitData() { return window.Telegram?.WebApp.initData || ""; }

async function apiRequest<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, initData: getInitData() }) });
  const data = await response.json();
  if (!response.ok || data.error) throw new Error(data.error || "API error");
  return data;
}

function applyPlayerToTasks(player: Player) {
  return DEFAULT_TASKS.map((task) => ({ ...task, done: Boolean(player.tasks?.[task.id]) }));
}

export default function App() {
  const walletAddress = useTonAddress();
  const [screen, setScreen] = useState<Screen>("dashboard");
  const [isLoading, setIsLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState("BOOTING...");
  const [apiError, setApiError] = useState("");
  const [coins, setCoins] = useState(0);
  const [energy, setEnergy] = useState(MAX_ENERGY);
  const [level, setLevel] = useState(1);
  const [xp, setXp] = useState(0);
  const maxXp = 1500;
  const [tasks, setTasks] = useState<Task[]>(DEFAULT_TASKS);
  const [terminalLines, setTerminalLines] = useState<string[]>(["> Booting CoderX core...", "> Connecting database...", "> Waiting for access token..."]);
  const lastSavedWalletRef = useRef<string | null>(null);
  const userName = useMemo(() => getTelegramUserName(), []);
  const telegramId = useMemo(() => getTelegramId(), []);

  function applyPlayer(player: Player) {
    setCoins(player.coins);
    setEnergy(player.energy);
    setLevel(player.level);
    setXp(player.xp);
    setTasks(applyPlayerToTasks(player));
    lastSavedWalletRef.current = player.walletAddress || null;
  }

  function addTerminal(line: string) {
    setTerminalLines((prev) => [...prev, line].slice(-7));
  }

  async function loadPlayer() {
    setSyncStatus("SYNCING...");
    setApiError("");

    try {
      const data = await apiRequest<{ player: Player }>("/api/player", {});
      applyPlayer(data.player);
      setSyncStatus("DATABASE ONLINE");
      addTerminal("> Supabase sync complete");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown API error";
      setApiError(message);
      setSyncStatus("DATABASE OFFLINE");
      addTerminal(`> sync error: ${message}`);
    }
  }

  useEffect(() => {
    window.Telegram?.WebApp.ready();
    window.Telegram?.WebApp.expand();

    const timer = window.setTimeout(() => {
      setIsLoading(false);
      loadPlayer();
    }, 1200);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!walletAddress) return;
    if (lastSavedWalletRef.current === walletAddress) return;

    apiRequest<{ player: Player }>("/api/wallet", { walletAddress })
      .then((data) => {
        applyPlayer(data.player);
        setSyncStatus("WALLET LINKED");
        addTerminal("> TON wallet linked");
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : "Wallet sync failed";
        setApiError(message);
        addTerminal(`> wallet error: ${message}`);
      });
  }, [walletAddress]);

  async function tap() {
    if (energy <= 0) return;
    setApiError("");

    try {
      const data = await apiRequest<{ ok: boolean; player: Player; reason?: string }>("/api/tap", {});
      applyPlayer(data.player);

      if (data.ok) {
        addTerminal("> packet captured: +1 CXR");
        window.Telegram?.WebApp.HapticFeedback?.impactOccurred("light");
      } else {
        addTerminal(`> tap rejected: ${data.reason || "unknown"}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Tap failed";
      setApiError(message);
      setSyncStatus("DATABASE OFFLINE");
      addTerminal(`> tap error: ${message}`);
    }
  }

  async function claimTask(taskId: string) {
    setApiError("");

    try {
      const data = await apiRequest<{ ok: boolean; player: Player; alreadyDone?: boolean }>("/api/task", { taskId });
      applyPlayer(data.player);
      addTerminal(data.alreadyDone ? "> mission already completed" : `> mission complete: ${taskId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Task failed";
      setApiError(message);
      addTerminal(`> mission error: ${message}`);
    }
  }

  const completedTasks = tasks.filter((task) => task.done).length;
  const xpPercent = Math.min(100, Math.round((xp / maxXp) * 100));
  const energyPercent = Math.min(100, Math.round((energy / MAX_ENERGY) * 100));
  const rank = coins >= 10000 ? "ROOT OPERATOR" : coins >= 3000 ? "GHOST NODE" : "JUNIOR OPERATOR";

  if (isLoading) {
    return (
      <main className="splash-screen">
        <div className="splash-grid" />
        <div className="splash-logo">
          <div className="splash-mark">CX</div>
          <h1>CODER<span>X</span></h1>
          <p>BLACKHAT CLICKER PROTOCOL</p>
          <div className="loading-bar"><div /></div>
          <code>{">"} database bridge initializing...</code>
        </div>
      </main>
    );
  }

  return (
    <main className="app">
      <header className="topbar">
        <div className="mini-panel">
          <div className="mini-title">{">"} {syncStatus}</div>
          <div className="mini-text">NODE 07 • SUPABASE</div>
          <div className="mini-text">// CXR DB PROTOCOL V2.0</div>
        </div>

        <div className="logo-wrap">
          <h1 className="logo">CODER<span>X</span></h1>
          <p className="subtitle">BLACKHAT CLICKER PROTOCOL</p>
        </div>

        <div className="mini-panel alert">
          <div className="mini-title">⚠ TRACE RISK</div>
          <div className="mini-text">LOW 12%</div>
          <div className="trace-bar"><span /></div>
        </div>
      </header>

      {apiError && <div className="sync-banner"><b>SYNC ERROR:</b> {apiError}</div>}

      {screen === "dashboard" ? (
        <>
          <section className="hero-grid">
            <div className="panel operator-panel">
              <div className="avatar-box"><div className="avatar-glow">⌘</div></div>
              <div className="operator-info">
                <p className="section-label">WELCOME, OPERATOR</p>
                <h2>{userName}</h2>
                <div className="xp-row"><span>OPERATOR LV. {level}</span><span>{xp} / {maxXp} XP</span></div>
                <div className="progress"><div style={{ width: `${xpPercent}%` }} /></div>
              </div>
            </div>

            <div className="panel wallet-panel">
              <p className="section-label">WALLET</p>
              {walletAddress ? <p className="wallet-address">{walletAddress.slice(0, 8)}...{walletAddress.slice(-6)}</p> : <p className="wallet-address">NOT CONNECTED</p>}
              <div className="wallet-btn-wrap"><TonConnectButton /></div>
            </div>
          </section>

          <section className="stats-grid">
            <div className="panel stat-card">
              <p className="section-label">// COINS</p>
              <div className="stat-value">{coins.toLocaleString("ru-RU")}</div>
              <div className="stat-sub">SAVED IN SUPABASE</div>
            </div>

            <div className="panel stat-card">
              <p className="section-label">// ENERGY</p>
              <div className="stat-value">{energy} / {MAX_ENERGY}</div>
              <div className="energy-bar"><div style={{ width: `${energyPercent}%` }} /></div>
              <div className="stat-sub">SERVER REGEN ACTIVE</div>
            </div>
          </section>

          <section className="main-grid">
            <div className="panel terminal-panel">
              <p className="section-label">TERMINAL FEED</p>
              <div className="terminal-output">
                {terminalLines.map((line, index) => <div key={index}>{line}</div>)}
                <div className="cursor">{"> _"}</div>
              </div>
            </div>

            <div className="tap-panel">
              <button className="tap-button" onClick={tap} disabled={energy <= 0 || syncStatus === "SYNCING..."}>
                <span className="tap-title">{energy > 0 ? "TAP" : "NO ENERGY"}</span>
                <span className="tap-sub">{"> SERVER HACK"}</span>
              </button>
            </div>

            <div className="panel network-panel">
              <p className="section-label">GLOBAL NETWORK</p>
              <div className="world-box">010101011001010</div>
              <div className="network-stat"><span>PLAYER ID</span><strong>{telegramId}</strong></div>
              <div className="network-stat"><span>DATABASE</span><strong>{syncStatus.includes("ONLINE") ? "ONLINE" : "CHECK"}</strong></div>
            </div>
          </section>

          <section className="panel tasks-panel">
            <div className="tasks-header">
              <p className="section-label">// TASKS</p>
              <span className="refresh-text">SERVER VERIFIED</span>
            </div>

            <div className="tasks-list">
              {tasks.map((task) => (
                <div className="task-row" key={task.id}>
                  <div className="task-left">
                    <div className="task-icon">⬢</div>
                    <div>
                      <div className="task-title">{task.title}</div>
                      <div className="task-desc">{task.description}</div>
                      <div className="task-reward">+ {task.reward.toLocaleString("ru-RU")} CXR</div>
                    </div>
                  </div>
                  <button className="claim-btn" onClick={() => claimTask(task.id)} disabled={task.done}>
                    {task.done ? "DONE" : "CLAIM"}
                  </button>
                </div>
              ))}
            </div>

            <div className="tasks-footer">COMPLETE TASKS • SAVE CXR • UPGRADE • DOMINATE</div>
          </section>
        </>
      ) : (
        <section className="profile-screen">
          <div className="panel profile-card">
            <div className="profile-avatar">CX</div>
            <p className="section-label">OPERATOR PROFILE</p>
            <h2>{userName}</h2>
            <p className="profile-rank">{rank}</p>

            <div className="profile-grid">
              <div><span>Telegram ID</span><strong>{telegramId}</strong></div>
              <div><span>Coins</span><strong>{coins.toLocaleString("ru-RU")}</strong></div>
              <div><span>Energy</span><strong>{energy} / {MAX_ENERGY}</strong></div>
              <div><span>Tasks</span><strong>{completedTasks} / {tasks.length}</strong></div>
            </div>

            <div className="profile-wallet">
              <span>TON Wallet</span>
              <strong>{walletAddress ? `${walletAddress.slice(0, 12)}...${walletAddress.slice(-8)}` : "NOT CONNECTED"}</strong>
            </div>

            <div className="profile-wallet">
              <span>Database status</span>
              <strong>{syncStatus}</strong>
            </div>

            <div className="profile-actions">
              <TonConnectButton />
              <button className="reset-btn compact" onClick={loadPlayer}>RESYNC DATABASE</button>
            </div>
          </div>

          <div className="panel profile-log">
            <p className="section-label">ACCESS LOG</p>
            <div className="terminal-output">
              <div>{">"} operator profile loaded</div>
              <div>{">"} rank calculated: {rank}</div>
              <div>{">"} wallet status: {walletAddress ? "connected" : "offline"}</div>
              <div>{">"} database bridge: {syncStatus}</div>
            </div>
          </div>
        </section>
      )}

      <nav className="bottom-nav">
        <button className={`nav-item ${screen === "dashboard" ? "active" : ""}`} onClick={() => setScreen("dashboard")}>DASHBOARD</button>
        <button className="nav-item disabled" type="button">UPGRADES</button>
        <button className="nav-item disabled" type="button">LEADERBOARD</button>
        <button className="nav-item disabled" type="button">MISSIONS</button>
        <button className={`nav-item ${screen === "profile" ? "active" : ""}`} onClick={() => setScreen("profile")}>PROFILE</button>
      </nav>
    </main>
  );
}
