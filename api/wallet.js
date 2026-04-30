const { send, getBody, validateTelegramInitData, getSupabase, loadOrCreatePlayer, savePlayer, normalizePlayer, regenerateEnergy } = require("./_utils");

function isProbablyTonAddress(value) {
  return typeof value === "string" && value.length >= 32 && value.length <= 80;
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return send(res, 405, { error: "Method not allowed" });
  try {
    const body = getBody(req);
    const user = validateTelegramInitData(body.initData);
    const walletAddress = body.walletAddress || null;
    if (walletAddress && !isProbablyTonAddress(walletAddress)) return send(res, 400, { error: "Invalid wallet address" });

    const supabase = getSupabase();
    const player = regenerateEnergy(await loadOrCreatePlayer(supabase, user));
    const saved = await savePlayer(supabase, player.telegram_id, {
      wallet_address: walletAddress,
      energy: player.energy,
      last_energy_at: player.last_energy_at
    });
    return send(res, 200, { ok: true, player: normalizePlayer(saved) });
  } catch (error) {
    return send(res, 400, { error: error.message || "Unknown error" });
  }
};
