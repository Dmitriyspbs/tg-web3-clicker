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

    const player = await loadOrCreatePlayer(supabase, init.user, init.startParam);
    const regenerated = regenerateEnergy(player);

    if (regenerated.energy <= 0) {
      const saved = await savePlayer(supabase, player.telegram_id, {
        energy: 0,
        last_energy_at: regenerated.last_energy_at
      });

      const invitedCount = await getInvitedCount(supabase, player.telegram_id);

      return send(res, 200, {
        ok: false,
        reason: "NO_ENERGY",
        player: normalizePlayer(saved, { invitedCount }),
        config: getPublicConfig(player.telegram_id)
      });
    }

    const earned = 1;

    const saved = await savePlayer(supabase, player.telegram_id, {
      coins: regenerated.coins + earned,
      energy: regenerated.energy - 1,
      last_energy_at: new Date().toISOString(),
      xp: regenerated.xp + earned,
      level: Math.max(regenerated.level, Math.floor((regenerated.xp + earned) / 1500) + 1)
    });

    const rpcResult = await supabase.rpc("apply_referral_bonus", {
      invitee_telegram_id: player.telegram_id,
      earned
    });

    if (rpcResult.error) throw rpcResult.error;

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
