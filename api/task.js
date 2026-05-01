const {
  TASKS,
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
} = require("./_utils");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return send(res, 405, { error: "Method not allowed" });
  }

  try {
    const body = getBody(req);
    const init = validateTelegramInitData(body.initData);
    const taskId = body.taskId;

    if (!TASKS[taskId]) {
      return send(res, 400, { error: "Unknown task" });
    }

    const supabase = getSupabase();
    const player = regenerateEnergy(await loadOrCreatePlayer(supabase, init.user, init.startParam));
    const tasks = player.tasks || {};
    const task = TASKS[taskId];

    if (tasks[taskId]) {
      const invitedCount = await getInvitedCount(supabase, player.telegram_id);
      const saved = await savePlayer(supabase, player.telegram_id, {
        energy: player.energy,
        last_energy_at: player.last_energy_at
      });

      return send(res, 200, {
        ok: true,
        alreadyDone: true,
        player: normalizePlayer(saved, { invitedCount }),
        config: getPublicConfig(player.telegram_id)
      });
    }

    if (taskId === "channel") {
      const isMember = await verifyRequiredChannelMembership(player.telegram_id);

      if (!isMember) {
        return send(res, 400, { error: "Join the required Telegram channel first, then press CHECK again." });
      }
    }

    if (taskId === "friend") {
      const invitedCount = await getInvitedCount(supabase, player.telegram_id);

      if (invitedCount < 1) {
        return send(res, 400, { error: "No invited friend has launched CoderX yet." });
      }
    }

    if (task.requiresWallet && !player.wallet_address) {
      return send(res, 400, { error: "Connect TON Wallet first" });
    }

    const nextTasks = {
      ...tasks,
      [taskId]: true
    };

    const saved = await savePlayer(supabase, player.telegram_id, {
      coins: player.coins + task.reward,
      energy: player.energy,
      last_energy_at: player.last_energy_at,
      tasks: nextTasks
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
