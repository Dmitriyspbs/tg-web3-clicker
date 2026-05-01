const {
  send,
  getBody,
  validateTelegramInitData,
  getSupabase,
  loadOrCreatePlayer,
  savePlayer,
  normalizePlayer,
  regenerateEnergy,
  getInvitedCount,
  getPublicConfig
} = require("./_utils");

function isProbablyTonAddress(value) {
  return typeof value === "string" && value.length >= 32 && value.length <= 80;
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return send(res, 405, { error: "Method not allowed" });
  }

  try {
    const body = getBody(req);
    const init = validateTelegramInitData(body.initData);
    const walletAddress = body.walletAddress || null;

    if (walletAddress && !isProbablyTonAddress(walletAddress)) {
      return send(res, 400, { error: "Invalid wallet address" });
    }

    const supabase = getSupabase();
    const player = regenerateEnergy(await loadOrCreatePlayer(supabase, init.user, init.startParam));

    const saved = await savePlayer(supabase, player.telegram_id, {
      wallet_address: walletAddress,
      energy: player.energy,
      last_energy_at: player.last_energy_at
    });

    const invitedCount = await getInvitedCount(supabase, player.telegram_id);

    return send(res, 200, {
      ok: true,
      player: normalizePlayer(saved, { invitedCount }),
      config: getPublicConfig(player.telegram_id)
    });
  } catch (error) {
    return send(res, 400, { error: error.message || "Unknown error" });
  }
};
