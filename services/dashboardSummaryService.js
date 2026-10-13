const ORDERS_API_URL = process.env.ORDERS_API_URL || 'https://api-orders.creceidea.pe/api/orders/list';
const TIME_ZONE = 'America/Lima';
const PAID_STATUSES = new Set(['completed', 'paid', 'approved', 'success']);
const { getHomePageTraffic } = require('./googleAnalyticsService');

async function getDashboardSummary({ domain, query, fetcher = fetch, now = new Date() }) {
    const range = parseDateRange(query, now);
    const previousRange = getPreviousRange(range);
    const pagePath = parsePagePath(query.pagePath);
    const orders = await getOrders(domain, fetcher);
    const currentOrders = orders.filter((order) => isWithinRange(order.createdAt, range));
    const previousOrders = orders.filter((order) => isWithinRange(order.createdAt, previousRange));
    const current = summarizeOrders(currentOrders);
    const previous = summarizeOrders(previousOrders);
    const traffic = await getTrafficSummary({ domain, range, previousRange, pagePath });

    return {
        range: {
            startDate: formatDate(range.start),
            endDate: formatDate(range.end),
            timezone: TIME_ZONE,
        },
        revenue: {
            total: current.revenue,
            currency: 'PEN',
            confirmedOrders: current.confirmedOrders,
            changePercentage: percentageChange(current.revenue, previous.revenue),
        },
        orders: {
            total: current.totalOrders,
            changePercentage: percentageChange(current.totalOrders, previous.totalOrders),
            byPaymentStatus: current.byPaymentStatus,
        },
        sales: {
            changePercentage: percentageChange(current.revenue, previous.revenue),
        },
        traffic,
    };
}

async function getTrafficSummary({ domain, range, previousRange, pagePath }) {
    try {
        const traffic = await getHomePageTraffic({
            startDate: formatDate(range.start),
            endDate: formatDate(range.end),
            previousStartDate: formatDate(previousRange.start),
            previousEndDate: formatDate(previousRange.end),
            pagePath,
            hostName: domain,
        });

        return {
            available: true,
            visits: traffic.visits,
            changePercentage: percentageChange(traffic.visits, traffic.previousVisits),
            pagePath,
        };
    } catch (error) {
        return {
            available: false,
            visits: null,
            changePercentage: null,
            pagePath,
            reason: `No se pudo consultar Google Analytics: ${error.message}`,
        };
    }
}

async function getOrders(domain, fetcher) {
    const firstPage = await fetchOrderPage(domain, 1, fetcher);
    const totalPages = Math.max(1, Number(firstPage.pagination?.totalPages) || 1);
    const pages = await Promise.all(
        Array.from({ length: totalPages - 1 }, (_, index) => fetchOrderPage(domain, index + 2, fetcher)),
    );

    return [firstPage, ...pages].flatMap((page) => page.data);
}

async function fetchOrderPage(domain, page, fetcher) {
    const url = new URL(ORDERS_API_URL);
    url.searchParams.set('page', String(page));
    url.searchParams.set('limit', '100');

    let response;
    try {
        response = await fetcher(url, { headers: { domain } });
    } catch {
        throw createHttpError(502, 'No se pudo conectar con el servicio de pedidos.');
    }

    if (!response.ok) {
        throw createHttpError(502, `El servicio de pedidos respondió con estado ${response.status}.`);
    }

    let body;
    try {
        body = await response.json();
    } catch {
        throw createHttpError(502, 'El servicio de pedidos devolvió una respuesta inválida.');
    }

    if (!body?.status || !Array.isArray(body.data)) {
        throw createHttpError(502, 'El servicio de pedidos no devolvió una lista válida.');
    }

    return body;
}

function summarizeOrders(orders) {
    return orders.reduce((summary, order) => {
        const paymentStatus = String(order.paymentStatus?.typeStatus || 'pending').toLowerCase();
        const total = Number(order.total) || 0;

        summary.totalOrders += 1;
        summary.byPaymentStatus[paymentStatus] = (summary.byPaymentStatus[paymentStatus] || 0) + 1;

        if (PAID_STATUSES.has(paymentStatus)) {
            summary.confirmedOrders += 1;
            summary.revenue += total;
        }

        return summary;
    }, { totalOrders: 0, confirmedOrders: 0, revenue: 0, byPaymentStatus: {} });
}

function parseDateRange(query, now) {
    const date = query.date ? parseDate(query.date, 'date') : null;
    const start = date || (query.startDate ? parseDate(query.startDate, 'startDate') : startOfDayInLima(now));
    const end = date || (query.endDate ? parseDate(query.endDate, 'endDate') : start);

    if (end < start) {
        throw createHttpError(400, 'endDate no puede ser anterior a startDate.');
    }

    return { start, end };
}

function parsePagePath(value) {
    const pagePath = value || process.env.GOOGLE_ANALYTICS_HOME_PATH || '/';
    if (typeof pagePath !== 'string' || !pagePath.startsWith('/')) {
        throw createHttpError(400, 'pagePath debe comenzar con /.');
    }
    return pagePath;
}

function parseDate(value, field) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        throw createHttpError(400, `${field} debe tener el formato YYYY-MM-DD.`);
    }

    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
        throw createHttpError(400, `${field} no es una fecha válida.`);
    }
    return date;
}

function startOfDayInLima(date) {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: TIME_ZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).formatToParts(date);
    const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
    return new Date(Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day)));
}

function getPreviousRange({ start, end }) {
    const days = Math.round((end - start) / 86_400_000) + 1;
    const previousEnd = new Date(start);
    previousEnd.setUTCDate(previousEnd.getUTCDate() - 1);
    const previousStart = new Date(previousEnd);
    previousStart.setUTCDate(previousStart.getUTCDate() - days + 1);
    return { start: previousStart, end: previousEnd };
}

function isWithinRange(value, range) {
    const date = parseOrderDate(value);
    return date !== null && date >= range.start && date <= range.end;
}

function parseOrderDate(value) {
    if (typeof value !== 'string') return null;
    const peruvianDate = value.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (peruvianDate) {
        return new Date(Date.UTC(Number(peruvianDate[3]), Number(peruvianDate[2]) - 1, Number(peruvianDate[1])));
    }

    const date = new Date(value);
    return Number.isNaN(date.valueOf()) ? null : new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function percentageChange(current, previous) {
    if (previous === 0) return current === 0 ? 0 : null;
    return Number((((current - previous) / previous) * 100).toFixed(2));
}

function formatDate(date) {
    return date.toISOString().slice(0, 10);
}

function createHttpError(statusCode, message) {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
}

module.exports = {
    getDashboardSummary,
    parseDateRange,
    summarizeOrders,
};
