export default async function handler(req, res) {
  const KOMMO_DOMAIN = "lsinmobiliariaperu";
  const TOKEN = process.env.KOMMO_TOKEN;

  const filter = req.query.range || "month";
  const startTimestamp = getDateRange(filter);

  // ---------------- USERS ----------------
  const userMap = await fetchUsers();

  // ---------------- LEADS (PAGINADO) ----------------
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

  // ---------------- FILTER BY DATE ----------------
  const filteredLeads = allLeads.filter(
    l => l.created_at >= startTimestamp
  );

  // ---------------- BY STATUS ----------------
  const byStatus = {};

  filteredLeads.forEach(l => {
    const key = l.status_id;
    byStatus[key] = (byStatus[key] || 0) + 1;
  });

  // ---------------- BY ASSIGNEE ----------------
  const byAssignee = {};

  filteredLeads.forEach(l => {
    const userId = l.responsible_user_id;
    const name = userMap[userId] || `unknown_${userId}`;

    byAssignee[name] = (byAssignee[name] || 0) + 1;
  });

  res.json({
    totalLeads: filteredLeads.length,
    byStatus,
    byAssignee
  });

  // ---------------- FUNCTIONS ----------------
  async function fetchUsers() {
    const res = await fetch(
      `https://${KOMMO_DOMAIN}.kommo.com/api/v4/users`,
      {
        headers: {
          Authorization: `Bearer ${TOKEN}`
        }
      }
    );

    const data = await res.json();

    const map = {};
    (data._embedded?.users || []).forEach(u => {
      map[u.id] = u.name;
    });

    return map;
  }

  function getDateRange(filter) {
    const now = new Date();
    const start = new Date(now);

    if (filter === "today") start.setHours(0, 0, 0, 0);
    if (filter === "yesterday") start.setDate(now.getDate() - 1);
    if (filter === "week") start.setDate(now.getDate() - 7);
    if (filter === "month") start.setMonth(now.getMonth() - 1);
    if (filter === "year") start.setFullYear(now.getFullYear() - 1);

    return Math.floor(start.getTime() / 1000);
  }
}