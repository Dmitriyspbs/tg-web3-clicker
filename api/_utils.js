const crypto = require("crypto");
const { createClient } = require("@supabase/supabase-js");

const TASKS = {
  wallet: {
    reward: 2000,
    requiresWallet: true
  },
  channel: {
    reward: 500,
    requiresWallet: false
  },
  friend: {
    reward: 1000,
    requiresWallet: false
  }
};

const MAX_ENERGY = 100;
const ENERGY_REGEN_SECONDS = 3;

function send(res, status, data) {
  res.status(status).json(data);
}

function getBody(req) {
  if (!req.body) return {};
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return req.body;
}

function validateTelegramInitData(initData) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!botToken) {
    throw new Error("TELEGRAM_BOT_TOKEN is missing in Vercel environment variables");
  }

  if (!initData) {
    if (process.env.ALLOW_DEV_AUTH === "true") {
      return {
        user: {
          id: 777000,
          first_name: "Local",
          username: "local_operator"
        },
        startParam: ""
      };
    }

    throw new Error("Telegram initData is missing. Open the app inside Telegram.");
  }

  const params = new URLSearchParams(initData);
  const hash = params.get("hash");

  if (!hash) {
    throw new Error("Telegram initData hash is missing");
  }

  params.delete("hash");

  const dataCheckString = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const secretKey = crypto
    .createHmac("sha256", "WebAppData")
    .update(botToken)
    .digest();

  const calculatedHash = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

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

  if (!userRaw) {
    throw new Error("Telegram user is missing in initData");
  }

  return {
    user: JSON.parse(userRaw),
    startParam: params.get("start_param") || ""
  };
}

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing in Vercel");
  }

  return createClient(url, serviceKey, {
    auth: {
      persistSession: false
    }
  });
}

function parseReferrerTelegramId(startParam, currentTelegramId) {
  if (!startParam) return null;

  const match = String(startParam).match(/^ref_(\d+)$/);
  if (!match) return null;

  const referrerId = Number(match[1]);

  if (!Number.isSafeInteger(referrerId)) return null;
  if (referrerId === Number(currentTelegramId)) return null;

  return referrerId;
}

function normalizePlayer(row, extra = {}) {
  const regenerated = regenerateEnergy(row);

  return {
    telegramId: String(regenerated.telegram_id),
    username: regenerated.username,
    firstName: regenerated.first_name,
    walletAddress: regenerated.wallet_address,
    coins: regenerated.coins,
    energy: regenerated.energy,
    level: regenerated.level,
    xp: regenerated.xp,
    tasks: regenerated.tasks || {},
    referredByTelegramId: regenerated.referred_by_telegram_id ? String(regenerated.referred_by_telegram_id) : null,
    invitedCount: extra.invitedCount || 0,
    referralBonusTotal: regenerated.referral_bonus_total || 0,
    referralBonusRemainder: regenerated.referral_bonus_remainder || 0,
    lastEnergyAt: regenerated.last_energy_at,
    updatedAt: regenerated.updated_at
  };
}

function regenerateEnergy(player) {
  if (!player.last_energy_at || player.energy >= MAX_ENERGY) {
    return player;
  }

  const last = new Date(player.last_energy_at).getTime();
  const now = Date.now();
  const diffSeconds = Math.max(0, Math.floor((now - last) / 1000));
  const gained = Math.floor(diffSeconds / ENERGY_REGEN_SECONDS);

  if (gained <= 0) return player;

  const nextEnergy = Math.min(MAX_ENERGY, player.energy + gained);

  return {
    ...player,
    energy: nextEnergy,
    last_energy_at: nextEnergy >= MAX_ENERGY ? new Date().toISOString() : new Date(last + gained * ENERGY_REGEN_SECONDS * 1000).toISOString()
  };
}

async function loadOrCreatePlayer(supabase, user, startParam = "") {
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
      .update({
        username: user.username || existing.username || null,
        first_name: user.first_name || existing.first_name || null
      })
      .eq("telegram_id", telegramId)
      .select("*")
      .single();

    if (error) throw error;
    return data;
  }

  const referrerTelegramId = parseReferrerTelegramId(startParam, telegramId);

  const { data: created, error: insertError } = await supabase
    .from("players")
    .insert({
      telegram_id: telegramId,
      username: user.username || null,
      first_name: user.first_name || null,
      referred_by_telegram_id: referrerTelegramId,
      first_start_param: startParam || null,
      coins: 0,
      energy: MAX_ENERGY,
      level: 1,
      xp: 0,
      tasks: {}
    })
    .select("*")
    .single();

  if (insertError) throw insertError;

  return created;
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

async function getInvitedCount(supabase, telegramId) {
  const { count, error } = await supabase
    .from("players")
    .select("id", { count: "exact", head: true })
    .eq("referred_by_telegram_id", telegramId);

  if (error) throw error;
  return count || 0;
}

function getPublicConfig(telegramId) {
  const botUsername = (process.env.TELEGRAM_BOT_USERNAME || "").replace("@", "");
  const channelChatId = process.env.REQUIRED_CHANNEL_CHAT_ID || process.env.REQUIRED_CHANNEL_USERNAME || "";
  const channelUrl = process.env.REQUIRED_CHANNEL_URL ||
    (channelChatId.startsWith("@") ? `https://t.me/${channelChatId.slice(1)}` : "");

  return {
    botUsername,
    inviteLink: botUsername ? `https://t.me/${botUsername}?startapp=ref_${telegramId}` : "",
    requiredChannelChatId: channelChatId,
    requiredChannelUrl: channelUrl
  };
}

async function verifyRequiredChannelMembership(userId) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.REQUIRED_CHANNEL_CHAT_ID || process.env.REQUIRED_CHANNEL_USERNAME;

  if (!chatId) {
    throw new Error("REQUIRED_CHANNEL_CHAT_ID is missing in Vercel");
  }

  const url = new URL(`https://api.telegram.org/bot${botToken}/getChatMember`);
  url.searchParams.set("chat_id", chatId);
  url.searchParams.set("user_id", String(userId));

  const response = await fetch(url);
  const data = await response.json();

  if (!data.ok) {
    throw new Error(data.description || "Telegram channel membership check failed");
  }

  const member = data.result;
  const status = member.status;

  if (status === "creator" || status === "owner" || status === "administrator" || status === "member") {
    return true;
  }

  if (status === "restricted" && member.is_member === true) {
    return true;
  }

  return false;
}

module.exports = {
  TASKS,
  MAX_ENERGY,
  send,
  getBody,
  validateTelegramInitData,
  getSupabase,
  loadOrCreatePlayer,
  savePlayer,
  normalizePlayer,
  regenerateEnergy,
  getInvitedCount,
  getPublicConfig,
  verifyRequiredChannelMembership
};
