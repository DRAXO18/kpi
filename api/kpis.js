export default async function handler(req, res) {
  const KOMMO_DOMAIN = "lsinmobiliariaperu";
  const TOKEN = process.env.KOMMO_TOKEN;

  let page = 1;
  let allLeads = [];

  while (true) {
    const response = await fetch(
      `https://${KOMMO_DOMAIN}.kommo.com/api/v4/leads?limit=250&page=${page}`,
      {
        headers: {
          Authorization: `Bearer ${TOKEN}`
        }
      }
    );

    const data = await response.json();
    const leads = data._embedded?.leads || [];

    allLeads = allLeads.concat(leads);

    if (!data._links?.next) break;

    page++;
  }

  const byStatus = {};

  allLeads.forEach(l => {
    const status = l.status_id || "unknown";
    byStatus[status] = (byStatus[status] || 0) + 1;
  });

  res.json({
    totalLeads: allLeads.length,
    byStatus
  });
}