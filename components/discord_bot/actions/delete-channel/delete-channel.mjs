import common from "../common.mjs";

export default {
  ...common,
  key: "discord_bot-delete-channel",
  name: "Delete Channel",
  description: "Delete a Channel.",
  type: "action",
  version: "1.0.0",
  async run({ $ }) {
    return this.discord.deleteChannel({
      $,
      channelId: this.channelId,
    });
  },
};
