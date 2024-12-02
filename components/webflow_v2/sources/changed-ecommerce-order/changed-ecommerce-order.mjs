import common from "../common/common.mjs";

export default {
  type: "source",
  key: "webflow_v2-changed-ecommerce-order",
  name: "E-commerce Order Updated",
  description: "Emit new event when an e-commerce order is changed. [See the docs here](https://developers.webflow.com/#order-model)",
  version: "0.0.1",
  ...common,
  methods: {
    ...common.methods,
    getWebhookTriggerType() {
      return "ecomm_order_changed";
    },
    generateMeta({ orderId }) {
      const ts = Date.now();
      return {
        id: `${orderId}-${ts}`,
        summary: `E-comm order updated: ${orderId}`,
        ts,
      };
    },
  },
};
