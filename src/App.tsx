import { useEffect, useMemo, useState } from "react";
import { TonConnectButton, useTonAddress } from "@tonconnect/ui-react";

const MAX_ENERGY = 100;

type Screen = "dashboard" | "profile";

type Task = {
  id: string;
  title: string;
  description: string;
  reward: number;
  done: boolean;
};

function getTelegramUser() {
  return window.Telegram?.WebApp.initDataUnsafe?.user;
}

function getTelegramUserName() {
  const user = getTelegramUser();
  if (!user) return "@operator";
  return user.username ? `@${user.username}` : user.first_name || "@operator";
}

function getTelegramId() {
  const user = getTelegramUser();
  return user?.id ? String(user.id) : "local-test";
}

export default function App() {
  const walletAddress = useTonAddress();

  const [screen, setScreen] = useState<Screen>("dashboard");
  const [isLoading, setIsLoading] = useState(true);

  const [coins, setCoins] = useState(() => Number(localStorage.getItem("coins") || 0));
  const [energy, setEnergy] = useState(() => Number(localStorage.getItem("energy") || MAX_ENERGY));
  const [level] = useState(3);
  const [xp] = useState(780);
  const [maxXp] = useState(1500);

  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem("tasks");
    if (saved) return JSON.parse(saved);

    return [
      {
        id: "wallet",
        title: "CONNECT TON WALLET",
        description: "Link your wallet to start hacking.",
        reward: 2000,
        done: false
      },
      {
        id: "channel",
        title: "JOIN CHANNEL",
        description: "Join our official channel.",
        reward: 500,
        done: false
      },
      {
        id: "friend",
        title: "INVITE FRIEND",
        description: "Invite a friend to CoderX.",
        reward: 1000,
        done: false
      }
    ];
  });

  const [terminalLines, setTerminalLines] = useState<string[]>([
    "> Booting CoderX core...",
    "> Scanning node...",
    "> Bypassing sandbox...",
    "> Access granted."
  ]);

  const userName = useMemo(() => getTelegramUserName(), []);
  const telegramId = useMemo(() => getTelegramId(), []);

  useEffect(() => {
    window.Telegram?.WebApp.ready();
    window.Telegram?.WebApp.expand();

    const timer = window.setTimeout(() => {
      setIsLoading(false);
    }, 1800);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    localStorage.setItem("coins", String(coins));
  }, [coins]);

  useEffect(() => {
    localStorage.setItem("energy", String(energy));
  }, [energy]);

  useEffect(() => {
    localStorage.setItem("tasks", JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setEnergy((current) => Math.min(MAX_ENERGY, current + 1));
    }, 3000);

    return () => window.clearInterval(interval);
  }, []);

  function tap() {
    if (energy <= 0) return;

    setCoins((current) => current + 1);
    setEnergy((current) => current - 1);

    setTerminalLines((prev) => {
      const next = [...prev, `> packet captured: +1 CXR`];
      return next.slice(-7);
    });

    window.Telegram?.WebApp.HapticFeedback?.impactOccurred("light");
  }

  function claimTask(taskId: string) {
    setTasks((currentTasks) =>
      currentTasks.map((task) => {
        if (task.id !== taskId || task.done) return task;

        if (task.id === "wallet" && !walletAddress) {
          alert("Сначала подключи TON Wallet");
          return task;
        }

        setCoins((currentCoins) => currentCoins + task.reward);

        setTerminalLines((prev) => {
          const next = [...prev, `> mission complete: ${task.title}`, `> reward received: +${task.reward} CXR`];
          return next.slice(-7);
        });

        return { ...task, done: true };
      })
    );
  }

  function resetGame() {
    setCoins(0);
    setEnergy(MAX_ENERGY);
    setTasks([
      {
        id: "wallet",
        title: "CONNECT TON WALLET",
        description: "Link your wallet to start hacking.",
        reward: 2000,
        done: false
      },
      {
        id: "channel",
        title: "JOIN CHANNEL",
        description: "Join our official channel.",
        reward: 500,
        done: false
      },
      {
        id: "friend",
        title: "INVITE FRIEND",
        description: "Invite a friend to CoderX.",
        reward: 1000,
        done: false
      }
    ]);
    setTerminalLines([
      "> System rebooted...",
      "> Reconnecting...",
      "> Access granted."
    ]);
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
          <h1>
            CODER<span>X</span>
          </h1>
          <p>BLACKHAT CLICKER PROTOCOL</p>
          <div className="loading-bar">
            <div />
          </div>
          <code>{">"} boot sequence initialized...</code>
        </div>
      </main>
    );
  }

  return (
    <main className="app">
      <header className="topbar">
        <div className="mini-panel">
          <div className="mini-title">{">"} SYSTEM ONLINE</div>
          <div className="mini-text">NODE 07 • UTC+0</div>
          <div className="mini-text">// CXR PROTOCOL V1.3.7</div>
        </div>

        <div className="logo-wrap">
          <h1 className="logo">
            CODER<span>X</span>
          </h1>
          <p className="subtitle">BLACKHAT CLICKER PROTOCOL</p>
        </div>

        <div className="mini-panel alert">
          <div className="mini-title">⚠ TRACE RISK</div>
          <div className="mini-text">LOW 12%</div>
          <div className="trace-bar">
            <span />
          </div>
        </div>
      </header>

      {screen === "dashboard" ? (
        <>
          <section className="hero-grid">
            <div className="panel operator-panel">
              <div className="avatar-box">
                <div className="avatar-glow">⌘</div>
              </div>

              <div className="operator-info">
                <p className="section-label">WELCOME, OPERATOR</p>
                <h2>{userName}</h2>

                <div className="xp-row">
                  <span>OPERATOR LV. {level}</span>
                  <span>
                    {xp} / {maxXp} XP
                  </span>
                </div>

                <div className="progress">
                  <div style={{ width: `${xpPercent}%` }} />
                </div>
              </div>
            </div>

            <div className="panel wallet-panel">
              <p className="section-label">WALLET</p>
              {walletAddress ? (
                <p className="wallet-address">
                  {walletAddress.slice(0, 8)}...{walletAddress.slice(-6)}
                </p>
              ) : (
                <p className="wallet-address">NOT CONNECTED</p>
              )}
              <div className="wallet-btn-wrap">
                <TonConnectButton />
              </div>
            </div>
          </section>

          <section className="stats-grid">
            <div className="panel stat-card">
              <p className="section-label">// COINS</p>
              <div className="stat-value">{coins.toLocaleString("ru-RU")}</div>
              <div className="stat-sub">TOTAL HACKED VALUE</div>
            </div>

            <div className="panel stat-card">
              <p className="section-label">// ENERGY</p>
              <div className="stat-value">
                {energy} / {MAX_ENERGY}
              </div>
              <div className="energy-bar">
                <div style={{ width: `${energyPercent}%` }} />
              </div>
              <div className="stat-sub">REGEN ACTIVE</div>
            </div>
          </section>

          <section className="main-grid">
            <div className="panel terminal-panel">
              <p className="section-label">TERMINAL FEED</p>
              <div className="terminal-output">
                {terminalLines.map((line, index) => (
                  <div key={index}>{line}</div>
                ))}
                <div className="cursor">{"> _"}</div>
              </div>
            </div>

            <div className="tap-panel">
              <button className="tap-button" onClick={tap} disabled={energy <= 0}>
                <span className="tap-title">{energy > 0 ? "TAP" : "NO ENERGY"}</span>
                <span className="tap-sub">{"> INITIATE HACK"}</span>
              </button>
            </div>

            <div className="panel network-panel">
              <p className="section-label">GLOBAL NETWORK</p>
              <div className="world-box">010101011001010</div>
              <div className="network-stat">
                <span>ACTIVE NODES</span>
                <strong>24,893</strong>
              </div>
              <div className="network-stat">
                <span>NETWORK STATUS</span>
                <strong>STABLE</strong>
              </div>
            </div>
          </section>

          <section className="panel tasks-panel">
            <div className="tasks-header">
              <p className="section-label">// TASKS</p>
              <span className="refresh-text">REFRESH IN 11:23:45</span>
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

                  <button
                    className="claim-btn"
                    onClick={() => claimTask(task.id)}
                    disabled={task.done}
                  >
                    {task.done ? "DONE" : "CLAIM"}
                  </button>
                </div>
              ))}
            </div>

            <div className="tasks-footer">
              COMPLETE TASKS • EARN CXR • UPGRADE • DOMINATE
            </div>
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
              <div>
                <span>Telegram ID</span>
                <strong>{telegramId}</strong>
              </div>
              <div>
                <span>Coins</span>
                <strong>{coins.toLocaleString("ru-RU")}</strong>
              </div>
              <div>
                <span>Energy</span>
                <strong>
                  {energy} / {MAX_ENERGY}
                </strong>
              </div>
              <div>
                <span>Tasks</span>
                <strong>
                  {completedTasks} / {tasks.length}
                </strong>
              </div>
            </div>

            <div className="profile-wallet">
              <span>TON Wallet</span>
              <strong>
                {walletAddress
                  ? `${walletAddress.slice(0, 12)}...${walletAddress.slice(-8)}`
                  : "NOT CONNECTED"}
              </strong>
            </div>

            <div className="profile-actions">
              <TonConnectButton />
              <button className="reset-btn compact" onClick={resetGame}>
                RESET SYSTEM
              </button>
            </div>
          </div>

          <div className="panel profile-log">
            <p className="section-label">ACCESS LOG</p>
            <div className="terminal-output">
              <div>{">"} operator profile loaded</div>
              <div>{">"} rank calculated: {rank}</div>
              <div>{">"} wallet status: {walletAddress ? "connected" : "offline"}</div>
              <div>{">"} session secured</div>
            </div>
          </div>
        </section>
      )}

      <nav className="bottom-nav">
        <button
          className={`nav-item ${screen === "dashboard" ? "active" : ""}`}
          onClick={() => setScreen("dashboard")}
        >
          DASHBOARD
        </button>
        <button className="nav-item disabled" type="button">UPGRADES</button>
        <button className="nav-item disabled" type="button">LEADERBOARD</button>
        <button className="nav-item disabled" type="button">MISSIONS</button>
        <button
          className={`nav-item ${screen === "profile" ? "active" : ""}`}
          onClick={() => setScreen("profile")}
        >
          PROFILE
        </button>
      </nav>
    </main>
  );
}
