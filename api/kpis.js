export default async function handler(req, res) {
    const KOMMO_DOMAIN = "lsinmobiliariaperu";
    const TOKEN = process.env.KOMMO_TOKEN;
    const userMap = await fetchUsers();

    const filter = req.query.range || "month";
    const start = getDateRange(filter);

    const byAssignee = groupByAssignee(allLeads, userMap, start);

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

    // ---------------- LLAMAR TODOS LOS LEADS ----------------
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

    // ---------------- AGRUPAR BAJO ESTADO ----------------
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

    // ---------------- AGRUPAR POR ASESORES ----------------

    async function fetchUsers() {
        const res = await fetch(`https://${KOMMO_DOMAIN}.kommo.com/api/v4/users`, {
            headers: {
                Authorization: `Bearer ${TOKEN}`
            }
        });

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

        if (filter === "today") {
            start.setHours(0, 0, 0, 0);
        }

        if (filter === "yesterday") {
            start.setDate(now.getDate() - 1);
            start.setHours(0, 0, 0, 0);
        }

        if (filter === "week") {
            start.setDate(now.getDate() - 7);
        }

        if (filter === "month") {
            start.setMonth(now.getMonth() - 1);
        }

        if (filter === "year") {
            start.setFullYear(now.getFullYear() - 1);
        }

        return Math.floor(start.getTime() / 1000);
    }

    function groupByAssignee(leads, userMap, startTimestamp) {
        const result = {};

        leads.forEach(l => {
            if (l.created_at < startTimestamp) return;

            const userId = l.responsible_user_id;
            const name = userMap[userId] || `unknown_${userId}`;

            result[name] = (result[name] || 0) + 1;
        });

        return result;
    }
}