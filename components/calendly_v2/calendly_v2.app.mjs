import { axios } from "@pipedream/platform";
import constants from "./common/constants.mjs";

export default {
  type: "app",
  app: "calendly_v2",
  propDefinitions: {
    organization: {
      type: "string",
      label: "Organization UUID",
      description: "An organization UUID",
      async options({ prevContext }) {
        return await this._makeAsyncOptionsRequest({
          prevContext,
          requestType: "getUserOrganizations",
          optionsCallbackFn: this._getOrganizationOptions,
        });
      },
    },
    user: {
      type: "string",
      label: "User UUID",
      description: "An user UUID",
      async options({
        prevContext, organization,
      }) {
        prevContext.organization = organization;
        return await this._makeAsyncOptionsRequest({
          prevContext,
          requestType: "listOrganizationMembers",
          optionsCallbackFn: this._getUserOptions,
        });
      },
    },
    eventId: {
      type: "string",
      label: "Event ID",
      description: "An event UUID",
      async options({ prevContext }) {
        return await this._makeAsyncOptionsRequest({
          prevContext,
          requestType: "listEvents",
          optionsCallbackFn: this._getNameOptions,
        });
      },
    },
    eventType: {
      type: "string",
      label: "Event Type",
      description: "An event type UUID",
      async options({ prevContext }) {
        return await this._makeAsyncOptionsRequest({
          prevContext,
          requestType: "listEventTypes",
          optionsCallbackFn: this._getNameOptions,
        });
      },
    },
    groupId: {
      type: "string",
      label: "Group ID",
      description: "A group UUID",
      async options({
        prevContext, organization,
      }) {
        prevContext.organization = organization;
        return await this._makeAsyncOptionsRequest({
          prevContext,
          requestType: "listGroups",
          optionsCallbackFn: this._getNameOptions,
        });
      },
    },
    inviteeEmail: {
      type: "string",
      label: "Inviteee Email",
      description: "The invitee's email",
      optional: true,
    },
    status: {
      type: "string",
      label: "Event Status",
      description: "Whether the scheduled event is `active` or `canceled`",
      optional: true,
      options: constants.statuses,
    },
    maxEventCount: {
      type: "integer",
      label: "Max Event Count",
      description: "The max number of events that can be scheduled using this scheduling link",
    },
    paginate: {
      type: "boolean",
      label: "Paginate",
      description: "Whether to paginate or not",
      default: true,
      optional: true,
    },
    maxResults: {
      type: "integer",
      label: "Max Results",
      description: "The number of rows to return",
      optional: true,
    },
    scope: {
      type: "string",
      label: "Scope",
      description: "Indicates if the webhook subscription scope will be `organization` or `user`",
      options: constants.scopes,
    },
    listEventsScope: {
      type: "string",
      label: "Scope",
      description: "The scope to fetch events for",
      options: constants.listEventsScopes,
      default: "authenticatedUser",
    },
    listEventsAlert: {
      type: "alert",
      alertType: "info",
      content: `
      Select "authenticatedUser" scope to return events for the authenticated user
      Select "organization" scope to return events for that organization (requires admin/owner privilege)
      Select "user" scope to return events for a specific User in your organization (requires admin/owner privilege)
      Select "group" scope to return events for a specific Group (requires organization admin/owner or group admin privilege)`,
    },
  },
  methods: {
    _baseUri() {
      return "https://api.calendly.com";
    },
    _buildUserUri(user) {
      return `${this._baseUri()}/users/${user}`;
    },
    _buildGroupUri(group) {
      return `${this._baseUri()}/groups/${group}`;
    },
    _buildEventType(eventType) {
      return `${this._baseUri()}/event_types/${eventType}`;
    },
    _getDefaultResponse() {
      return {
        collection: [],
        pagination: {
          count: 0,
        },
      };
    },
    _extractNextPageToken(nextPage) {
      return nextPage
        ? nextPage.split("page_token=")[1].split("&")[0]
        : null;
    },
    _getOptions(collection, nextPage, isUser = false) {
      return {
        options: collection.map((e) => ({
          label: isUser
            ? e.user.name
            : e.name,
          value: isUser
            ? e.user.uri.split("/").pop()
            : e.uri.split("/").pop(),
        })),
        context: {
          nextPageParameters: nextPage,
        },
      };
    },
    _getNameOptions(collection, nextPage) {
      return this._getOptions(collection, nextPage);
    },
    _getOrganizationOptions(collection, nextPage) {
      return {
        options: collection.map((e) => ({
          label: e.organization.split("/").pop(),
          value: e.organization,
        })),
        context: {
          nextPageParameters: nextPage,
        },
      };
    },
    _getUserOptions(collection, nextPage) {
      return this._getOptions(collection, nextPage, true);
    },
    _makeRequestOpts(opts) {
      const path = opts.path ?? "";
      const method = opts.method ?? "get";
      const params = opts.params ?? {};
      const headers = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.$auth.oauth_access_token}`,
      };
      return {
        url: this._baseUri() + path,
        method,
        headers,
        params,
        data: opts.data,
      };
    },
    async _makeAsyncOptionsRequest({
      prevContext = {
        count: 20,
      },
      requestType,
      optionsCallbackFn,
    }) {
      const response = await this[requestType](prevContext);
      return optionsCallbackFn(response.collection, response.pagination.next_page);
    },
    async _makeRequest(opts, $) {
      const response = this._getDefaultResponse();
      const {
        paginate = false,
        maxResults = 1000,
      } = opts.params;
      delete opts.params.paginate;
      delete opts.params.maxResults;

      try {
        do {
          const res = await axios(
            $ ?? this,
            this._makeRequestOpts(opts),
          );
          response.collection.push(...res.collection);
          response.pagination.count += res.pagination.count;
          response.pagination.next_page = res.pagination.next_page;
          opts.params.page_token = this._extractNextPageToken(res.pagination.next_page);
        } while (paginate && opts.params.page_token && response.collection.length < maxResults);

        if (response.collection.length > maxResults) {
          response.collection.length = maxResults;
          response.pagination.count = maxResults;
        }

        return response;
      } catch (error) {
        throw new Error(`${error.response.data.title} - ${error.response.data.message}`);
      }
    },
    async getUserInfo(user, $) {
      const opts = {
        path: `/users/${user || "me"}`,
      };
      return axios(
        $ ?? this,
        this._makeRequestOpts(opts),
      );
    },
    async defaultUser($) {
      return (await this.getUserInfo(null, $)).resource.uri;
    },
    async getUserOrganizations($) {
      const opts = {
        path: "/organization_memberships",
        params: {
          user: await this.defaultUser($),
        },
      };

      return axios(
        $ ?? this,
        this._makeRequestOpts(opts),
      );
    },
    async listOrganizationMembers(params, $) {
      const opts = {
        path: "/organization_memberships",
        params,
      };

      return axios(
        $ ?? this,
        this._makeRequestOpts(opts),
      );
    },
    async listEvents(params, uuid, $) {
      if (uuid) {
        params.user = this._buildUserUri(uuid);
      }
      if (params.group) {
        params.group = this._buildGroupUri(params.group);
      }
      if (!params.organization && !params.group && !params.user) {
        params.user = await this.defaultUser($);
      }

      const opts = {
        path: "/scheduled_events",
        params,
      };

      return this._makeRequest(opts, $);
    },
    async listUserAvailabilitySchedules(uuid, $) {
      const user = this._buildUserUri(uuid);
      const opts = {
        path: "/user_availability_schedules",
        params: {
          user,
        },
      };

      return axios(
        $ ?? this,
        this._makeRequestOpts(opts),
      );
    },
    async getEvent(uuid, $) {
      const opts = {
        path: `/scheduled_events/${uuid}`,
      };

      return axios(
        $ ?? this,
        this._makeRequestOpts(opts),
      );
    },
    async listEventInvitees(params, uuid, $) {
      const opts = {
        path: `/scheduled_events/${uuid}/invitees`,
        params,
      };

      return this._makeRequest(opts, $);
    },
    async listEventTypes(params, $) {
      const opts = {
        path: "/event_types",
        params: {
          user: await this.defaultUser($),
          ...params,
        },
      };

      return this._makeRequest(opts, $);
    },
    async listGroups(params, $) {
      const opts = {
        path: "/groups",
        params,
      };

      return this._makeRequest(opts, $);
    },
    async createSchedulingLink(params, $) {
      params.owner = this._buildEventType(params.owner);

      const opts = {
        path: "/scheduling_links",
        method: "post",
        params,
      };

      return axios(
        $ ?? this,
        this._makeRequestOpts(opts),
      );
    },
    async createWebhookSubscription(events, url, organization, user, signatureKey, scope) {
      const data = {
        url,
        events,
        organization,
        user,
        scope,
        signing_key: signatureKey,
      };

      const opts = {
        path: "/webhook_subscriptions",
        method: "post",
        data,
      };

      return axios(
        this,
        this._makeRequestOpts(opts),
      );
    },
    async deleteWebhookSubscription(uuid) {
      const opts = {
        path: `/webhook_subscriptions/${uuid}`,
        method: "delete",
      };

      return axios(
        this,
        this._makeRequestOpts(opts),
      );
    },
    listEventsAdditionalProps(props, scope) {
      props.organization.hidden = scope === "authenticatedUser";
      props.organization.optional = scope === "authenticatedUser";

      props.group.hidden = scope !== "group";
      props.group.optional = scope !== "group";

      props.user.hidden = scope !== "user";
      props.user.optional = scope !== "user";

      return {};
    },
  },
};
