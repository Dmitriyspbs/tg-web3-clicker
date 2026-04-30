import { useEffect, useMemo, useState } from "react";
import { TonConnectButton, useTonAddress } from "@tonconnect/ui-react";

const MAX_ENERGY = 100;

type Task = {
  id: string;
  title: string;
  reward: number;
  done: boolean;
};

function getTelegramUserName() {
  const user = window.Telegram?.WebApp.initDataUnsafe?.user;
  if (!user) return "Игрок";
  return user.first_name || user.username || "Игрок";
}

export default function App() {
  const walletAddress = useTonAddress();
  const [coins, setCoins] = useState(() => Number(localStorage.getItem("coins") || 0));
  const [energy, setEnergy] = useState(() => Number(localStorage.getItem("energy") || MAX_ENERGY));
  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem("tasks");
    if (saved) return JSON.parse(saved);

    return [
      { id: "wallet", title: "Подключить TON Wallet", reward: 2000, done: false },
      { id: "channel", title: "Подписаться на канал", reward: 500, done: false },
      { id: "friend", title: "Пригласить друга", reward: 1000, done: false }
    ];
  });

  const userName = useMemo(() => getTelegramUserName(), []);

  useEffect(() => {
    window.Telegram?.WebApp.ready();
    window.Telegram?.WebApp.expand();
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
        return { ...task, done: true };
      })
    );
  }

  function resetGame() {
    setCoins(0);
    setEnergy(MAX_ENERGY);
    setTasks([
      { id: "wallet", title: "Подключить TON Wallet", reward: 2000, done: false },
      { id: "channel", title: "Подписаться на канал", reward: 500, done: false },
      { id: "friend", title: "Пригласить друга", reward: 1000, done: false }
    ]);
  }

  return (
    <main className="app">
      <section className="card hero">
        <p className="eyebrow">Telegram Web3 Mini App</p>
        <h1>Привет, {userName} 👋</h1>
        <p className="muted">Нажимай кнопку, копи монеты и подключай TON Wallet.</p>

        <div className="walletBox">
          <TonConnectButton />
          {walletAddress && <p className="walletText">Wallet: {walletAddress.slice(0, 8)}...{walletAddress.slice(-6)}</p>}
        </div>
      </section>

      <section className="card stats">
        <div>
          <span className="label">Coins</span>
          <strong>{coins.toLocaleString("ru-RU")}</strong>
        </div>
        <div>
          <span className="label">Energy</span>
          <strong>{energy} / {MAX_ENERGY}</strong>
        </div>
      </section>

      <button className="tapButton" onClick={tap} disabled={energy <= 0}>
        {energy > 0 ? "TAP" : "Энергия закончилась"}
      </button>

      <section className="card">
        <h2>Задания</h2>
        <div className="tasks">
          {tasks.map((task) => (
            <button
              key={task.id}
              className="task"
              onClick={() => claimTask(task.id)}
              disabled={task.done}
            >
              <span>
                <b>{task.title}</b>
                <small>+{task.reward.toLocaleString("ru-RU")} coins</small>
              </span>
              <em>{task.done ? "Готово" : "Claim"}</em>
            </button>
          ))}
        </div>
      </section>

      <button className="reset" onClick={resetGame}>Сбросить игру</button>
    </main>
  );
}
