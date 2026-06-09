export default async () => {
  const url = `${process.env.URL}/api/cron/publish-posts`;
  const res = await fetch(url, {
    headers: { authorization: `Bearer ${process.env.CRON_SECRET}` }
  });
  if (!res.ok) {
    console.error("publish-posts failed:", res.status, await res.text());
    return { statusCode: res.status };
  }
  const data = await res.json();
  console.log("publish-posts:", JSON.stringify(data));
  return { statusCode: 200, body: JSON.stringify(data) };
};
