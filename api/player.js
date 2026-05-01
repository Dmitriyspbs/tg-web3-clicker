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

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return send(res, 405, { error: "Method not allowed" });
  }

  try {
    const body = getBody(req);
    const init = validateTelegramInitData(body.initData);
    const supabase = getSupabase();

    let player = await loadOrCreatePlayer(supabase, init.user, init.startParam);
    const regenerated = regenerateEnergy(player);

    if (
      regenerated.energy !== player.energy ||
      regenerated.last_energy_at !== player.last_energy_at
    ) {
      player = await savePlayer(supabase, player.telegram_id, {
        energy: regenerated.energy,
        last_energy_at: regenerated.last_energy_at
      });
    }

    const invitedCount = await getInvitedCount(supabase, player.telegram_id);

    return send(res, 200, {
      player: normalizePlayer(player, { invitedCount }),
      config: getPublicConfig(player.telegram_id)
    });
  } catch (error) {
    return send(res, 400, { error: error.message || "Unknown error" });
  }
};
