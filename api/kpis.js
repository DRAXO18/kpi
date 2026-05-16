export default async function handler(req, res) {
  const KOMMO_DOMAIN = "lsinmobiliariaperu";
  const TOKEN = process.env.KOMMO_TOKEN;

  // ---------------- FETCH PIPELINES + STATUS MAP ----------------
  const pipelineRes = await fetch(
    `https://${KOMMO_DOMAIN}.kommo.com/api/v4/leads/pipelines`,
    {
      headers: {
        Authorization: `Bearer ${TOKEN}`
      }
    }
  );

  const pipelineData = await pipelineRes.json();

  const statusMap = {};

  (pipelineData._embedded?.pipelines || []).forEach(pipeline => {
    (pipeline._embedded?.statuses || []).forEach(status => {
      statusMap[status.id] = status.name;
    });
  });

  // ---------------- FETCH ALL LEADS (PAGINATED) ----------------
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

  // ---------------- GROUP BY STATUS NAME ----------------
  const byStatus = {};

  allLeads.forEach(l => {
    const id = l.status_id;
    const name = statusMap[id] || `unknown_${id}`;

    byStatus[name] = (byStatus[name] || 0) + 1;
  });

  res.json({
    totalLeads: allLeads.length,
    byStatus
  });
}