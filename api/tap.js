const { send, getBody, validateTelegramInitData, getSupabase, loadOrCreatePlayer, savePlayer, normalizePlayer, regenerateEnergy } = require("./_utils");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return send(res, 405, { error: "Method not allowed" });
  try {
    const user = validateTelegramInitData(getBody(req).initData);
    const supabase = getSupabase();
    const player = await loadOrCreatePlayer(supabase, user);
    const regenerated = regenerateEnergy(player);

    if (regenerated.energy <= 0) {
      const saved = await savePlayer(supabase, player.telegram_id, { energy: 0, last_energy_at: regenerated.last_energy_at });
      return send(res, 200, { ok: false, reason: "NO_ENERGY", player: normalizePlayer(saved) });
    }

    const saved = await savePlayer(supabase, player.telegram_id, {
      coins: regenerated.coins + 1,
      energy: regenerated.energy - 1,
      last_energy_at: new Date().toISOString(),
      xp: regenerated.xp + 1,
      level: Math.max(regenerated.level, Math.floor((regenerated.xp + 1) / 1500) + 1)
    });
    return send(res, 200, { ok: true, player: normalizePlayer(saved) });
  } catch (error) {
    return send(res, 400, { error: error.message || "Unknown error" });
  }
};
