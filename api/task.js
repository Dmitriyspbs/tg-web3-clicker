const { TASKS, send, getBody, validateTelegramInitData, getSupabase, loadOrCreatePlayer, savePlayer, normalizePlayer, regenerateEnergy } = require("./_utils");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return send(res, 405, { error: "Method not allowed" });
  try {
    const body = getBody(req);
    const user = validateTelegramInitData(body.initData);
    const taskId = body.taskId;
    if (!TASKS[taskId]) return send(res, 400, { error: "Unknown task" });

    const supabase = getSupabase();
    const player = regenerateEnergy(await loadOrCreatePlayer(supabase, user));
    const tasks = player.tasks || {};
    const task = TASKS[taskId];

    if (tasks[taskId]) {
      const saved = await savePlayer(supabase, player.telegram_id, { energy: player.energy, last_energy_at: player.last_energy_at });
      return send(res, 200, { ok: true, alreadyDone: true, player: normalizePlayer(saved) });
    }

    if (task.requiresWallet && !player.wallet_address) return send(res, 400, { error: "Connect TON Wallet first" });

    const saved = await savePlayer(supabase, player.telegram_id, {
      coins: player.coins + task.reward,
      energy: player.energy,
      last_energy_at: player.last_energy_at,
      tasks: { ...tasks, [taskId]: true }
    });
    return send(res, 200, { ok: true, player: normalizePlayer(saved) });
  } catch (error) {
    return send(res, 400, { error: error.message || "Unknown error" });
  }
};
