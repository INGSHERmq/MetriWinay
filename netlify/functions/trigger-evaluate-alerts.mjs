export default async () => {
  const url = `${process.env.URL}/api/cron/evaluate-alerts`;
  const res = await fetch(url, {
    headers: { authorization: `Bearer ${process.env.CRON_SECRET}` }
  });
  if (!res.ok) {
    console.error("evaluate-alerts failed:", res.status, await res.text());
    return { statusCode: res.status };
  }
  const data = await res.json();
  console.log("evaluate-alerts:", JSON.stringify(data));
  return { statusCode: 200, body: JSON.stringify(data) };
};
