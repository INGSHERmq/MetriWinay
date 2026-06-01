const token = process.env.META_DEBUG_ACCESS_TOKEN;
const version = process.env.META_GRAPH_API_VERSION || "v25.0";

if (!token) {
  console.error("Set META_DEBUG_ACCESS_TOKEN only for this command.");
  process.exit(1);
}

const graph = async (path, params = {}) => {
  const search = new URLSearchParams({ ...params, access_token: token });
  const response = await fetch(
    `https://graph.facebook.com/${version}${path}?${search.toString()}`,
    { headers: { Accept: "application/json" } }
  );
  const data = await response.json();
  return { ok: response.ok, status: response.status, data };
};

const summarize = (value) => JSON.stringify(value, null, 2);
const until = new Date();
until.setUTCDate(until.getUTCDate() - 1);
const since = new Date(until);
since.setUTCDate(until.getUTCDate() - 29);
const timeRange = {
  since: since.toISOString().slice(0, 10),
  until: until.toISOString().slice(0, 10)
};

console.log(`Graph API ${version}`);

const me = await graph("/me", { fields: "id,name" });
console.log("\n/me");
console.log(summarize(me));

const permissions = await graph("/me/permissions");
console.log("\n/me/permissions");
console.log(summarize(permissions));

const pages = await graph("/me/accounts", {
  fields:
    "id,name,access_token,tasks,instagram_business_account{id,username,followers_count,media_count}"
});
const safePages = {
  ...pages,
  data: {
    ...pages.data,
    data: pages.data?.data?.map((page) => ({
      ...page,
      access_token: page.access_token ? "[present]" : "[missing]"
    }))
  }
};
console.log("\n/me/accounts");
console.log(summarize(safePages));

const firstPage = pages.data?.data?.[0];
if (firstPage?.id && firstPage?.access_token) {
  const pageInsights = await graph(`/${firstPage.id}/insights`, {
    metric: "page_impressions,page_post_engagements",
    period: "day",
    access_token: firstPage.access_token
  });
  console.log(`\n/${firstPage.id}/insights`);
  console.log(summarize(pageInsights));
}

const adAccounts = await graph("/me/adaccounts", {
  fields: "id,name,account_status,currency,timezone_name"
});
console.log("\n/me/adaccounts");
console.log(summarize(adAccounts));

const firstAdAccount = adAccounts.data?.data?.[0];
if (firstAdAccount?.id) {
  const adsInsights = await graph(`/${firstAdAccount.id}/insights`, {
    fields:
      "impressions,reach,spend,clicks,ctr,cpc,cpm,actions,video_thruplay_watched_actions,date_start,date_stop",
    time_range: JSON.stringify(timeRange)
  });
  console.log(`\n/${firstAdAccount.id}/insights`);
  console.log(summarize(adsInsights));
}
