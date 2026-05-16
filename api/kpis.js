export default async function handler(req, res) {
  try {
    const response = await fetch("https://TU_SUBDOMINIO.kommo.com/api/v4/leads", {
      headers: {
        Authorization: `Bearer ${process.env.KOMMO_TOKEN}`
      }
    });

    const data = await response.json();

    const leads = data._embedded?.leads || [];

    // KPIs básicos
    const total = leads.length;

    const porEstado = leads.reduce((acc, lead) => {
      const status = lead.status_id || "unknown";
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    const porAsesor = leads.reduce((acc, lead) => {
      const user = lead.responsible_user_id || "unknown";
      acc[user] = (acc[user] || 0) + 1;
      return acc;
    }, {});

    res.status(200).json({
      totalLeads: total,
      byStatus: porEstado,
      byAdvisor: porAsesor
    });

  } catch (err) {
    res.status(500).json({ error: "Error fetching Kommo data" });
  }
}