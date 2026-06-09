export default async () => {
  const url = `${process.env.URL}/api/cron/refresh-tokens`;
  const res = await fetch(url, {
    headers: { authorization: `Bearer ${process.env.CRON_SECRET}` }
  });
  if (!res.ok) {
    console.error("refresh-tokens failed:", res.status, await res.text());
    return { statusCode: res.status };
  }
  const data = await res.json();
  console.log("refresh-tokens:", JSON.stringify(data));
  return { statusCode: 200, body: JSON.stringify(data) };
};
