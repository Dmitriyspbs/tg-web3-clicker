const { send, getBody, validateTelegramInitData, getSupabase, loadOrCreatePlayer, savePlayer, normalizePlayer, regenerateEnergy } = require("./_utils");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return send(res, 405, { error: "Method not allowed" });
  try {
    const user = validateTelegramInitData(getBody(req).initData);
    const supabase = getSupabase();
    let player = await loadOrCreatePlayer(supabase, user);
    const regenerated = regenerateEnergy(player);
    if (regenerated.energy !== player.energy || regenerated.last_energy_at !== player.last_energy_at) {
      player = await savePlayer(supabase, player.telegram_id, { energy: regenerated.energy, last_energy_at: regenerated.last_energy_at });
    }
    return send(res, 200, { player: normalizePlayer(player) });
  } catch (error) {
    return send(res, 400, { error: error.message || "Unknown error" });
  }
};
