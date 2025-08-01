import { DEFAULT_POLLING_SOURCE_TIMER_INTERVAL } from "@pipedream/platform";
import frontapp from "../../frontapp.app.mjs";

export default {
  props: {
    frontapp,
    db: "$.service.db",
    timer: {
      type: "$.interface.timer",
      default: {
        intervalSeconds: DEFAULT_POLLING_SOURCE_TIMER_INTERVAL,
      },
    },
  },
  methods: {
    _getLastTs() {
      return this.db.get("lastTs") ?? 1000000000;
    },
    _setLastTs(lastTs) {
      this.db.set("lastTs", lastTs);
    },
    _getItemTs(item) {
      return item.created_at * 1000;
    },
    async startEvent(maxResults = 0, filterFn = null) {
      const lastTs = this._getLastTs();
      const items = this.frontapp.paginate({
        fn: this._getFunction(),
        params: this._getParams(lastTs),
        maxResults,
      });

      let responseArray = [];

      for await (const item of items) {
        // If filterFn is provided, use it to filter items, otherwise add all items
        if (!filterFn || filterFn(item, lastTs)) {
          responseArray.push(item);
        }
      }

      if (responseArray.length) {
        if (filterFn) {
          responseArray.sort((a, b) => b.created_at - a.created_at);
        }
        this._setLastTs(this._getEmit(responseArray[0]).ts);
      }

      for (const item of responseArray.reverse()) {
        this.$emit(
          item,
          this._getEmit(item),
        );
      }
    },
  },
  hooks: {
    async deploy() {
      await this.startEvent(25);
    },
  },
  async run() {
    await this.startEvent();
  },
};
