const crypto = require("crypto");
const { createClient } = require("@supabase/supabase-js");

const TASKS = {
  wallet: { reward: 2000, requiresWallet: true },
  channel: { reward: 500, requiresWallet: false },
  friend: { reward: 1000, requiresWallet: false }
};

const MAX_ENERGY = 100;
const ENERGY_REGEN_SECONDS = 3;

function send(res, status, data) {
  res.status(status).json(data);
}

function getBody(req) {
  if (!req.body) return {};
  if (typeof req.body === "string") {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return req.body;
}

function validateTelegramInitData(initData) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) throw new Error("TELEGRAM_BOT_TOKEN is missing in Vercel environment variables");

  if (!initData) {
    if (process.env.ALLOW_DEV_AUTH === "true") {
      return { id: 777000, first_name: "Local", username: "local_operator" };
    }
    throw new Error("Telegram initData is missing. Open the app inside Telegram.");
  }

  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) throw new Error("Telegram initData hash is missing");
  params.delete("hash");

  const dataCheckString = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const secretKey = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
  const calculatedHash = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  const expected = Buffer.from(hash, "hex");
  const actual = Buffer.from(calculatedHash, "hex");
  if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) {
    throw new Error("Telegram initData is invalid");
  }

  const authDate = Number(params.get("auth_date") || 0);
  const ageSeconds = Math.floor(Date.now() / 1000) - authDate;
  if (authDate && ageSeconds > 60 * 60 * 24) {
    throw new Error("Telegram initData is too old. Reopen the Mini App.");
  }

  const userRaw = params.get("user");
  if (!userRaw) throw new Error("Telegram user is missing in initData");
  return JSON.parse(userRaw);
}

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing in Vercel");
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

function regenerateEnergy(player) {
  if (!player.last_energy_at || player.energy >= MAX_ENERGY) return player;
  const last = new Date(player.last_energy_at).getTime();
  const diffSeconds = Math.max(0, Math.floor((Date.now() - last) / 1000));
  const gained = Math.floor(diffSeconds / ENERGY_REGEN_SECONDS);
  if (gained <= 0) return player;
  const nextEnergy = Math.min(MAX_ENERGY, player.energy + gained);
  return {
    ...player,
    energy: nextEnergy,
    last_energy_at: nextEnergy >= MAX_ENERGY
      ? new Date().toISOString()
      : new Date(last + gained * ENERGY_REGEN_SECONDS * 1000).toISOString()
  };
}

function normalizePlayer(row) {
  const p = regenerateEnergy(row);
  return {
    telegramId: String(p.telegram_id),
    username: p.username,
    firstName: p.first_name,
    walletAddress: p.wallet_address,
    coins: p.coins,
    energy: p.energy,
    level: p.level,
    xp: p.xp,
    tasks: p.tasks || {},
    lastEnergyAt: p.last_energy_at,
    updatedAt: p.updated_at
  };
}

async function loadOrCreatePlayer(supabase, user) {
  const telegramId = user.id;
  const { data: existing, error: selectError } = await supabase
    .from("players")
    .select("*")
    .eq("telegram_id", telegramId)
    .maybeSingle();
  if (selectError) throw selectError;

  if (existing) {
    const { data, error } = await supabase
      .from("players")
      .update({ username: user.username || existing.username || null, first_name: user.first_name || existing.first_name || null })
      .eq("telegram_id", telegramId)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from("players")
    .insert({ telegram_id: telegramId, username: user.username || null, first_name: user.first_name || null })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

async function savePlayer(supabase, telegramId, patch) {
  const { data, error } = await supabase
    .from("players")
    .update(patch)
    .eq("telegram_id", telegramId)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

module.exports = { TASKS, send, getBody, validateTelegramInitData, getSupabase, loadOrCreatePlayer, savePlayer, normalizePlayer, regenerateEnergy };
