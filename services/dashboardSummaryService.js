const ORDERS_API_URL = process.env.ORDERS_API_URL || 'https://api-orders.creceidea.pe/api/orders/list';
const mongoose = require('mongoose');
const TIME_ZONE = 'America/Lima';
const PAID_STATUSES = new Set(['completed', 'paid', 'approved', 'success']);
const NON_CONFIRMABLE_STATUSES = new Set(['cancelled', 'canceled', 'declined', 'decline', 'failed', 'failure', 'rejected', 'refunded']);
const { getHomePageTraffic } = require('./googleAnalyticsService');

async function getDashboardSummary({ domain, query, fetcher = fetch, now = new Date() }) {
    const range = parseDateRange(query, now);
    const previousRange = getPreviousRange(range);
    const annualRange = getAnnualRange(range.end);
    const pagePath = parsePagePath(query.pagePath);
    const orders = await getOrders(domain, fetcher);
    const currentOrders = orders.filter((order) => isWithinRange(order.createdAt, range));
    const previousOrders = orders.filter((order) => isWithinRange(order.createdAt, previousRange));
    const annualOrders = orders.filter((order) => isWithinRange(order.createdAt, annualRange));
    const current = summarizeOrders(currentOrders);
    const previous = summarizeOrders(previousOrders);
    const annual = summarizeOrders(annualOrders);
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
            history: buildRevenueHistory(currentOrders, range),
        },
        annual: {
            year: annualRange.start.getUTCFullYear(),
            totalOrders: annual.totalOrders,
            totalAmount: annual.totalAmount,
            confirmedOrders: annual.confirmedOrders,
            confirmedAmount: annual.revenue,
            pendingOrders: annual.pendingOrders,
            pendingAmount: annual.pendingRevenue,
            currency: 'PEN',
        },
        orders: {
            total: current.totalOrders,
            changePercentage: percentageChange(current.totalOrders, previous.totalOrders),
            byPaymentStatus: current.byPaymentStatus,
            byOrderStatus: current.byOrderStatus,
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
            channels: traffic.channels,
        };
    } catch (error) {
        return {
            available: false,
            visits: null,
            changePercentage: null,
            pagePath,
            channels: [],
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
        const paymentStatus = String(order.paymentStatus?.typeStatus || 'pending').trim().toLowerCase() || 'pending';
        const orderStatus = String(order.orderStatus?.typeStatus || 'pending').trim().toLowerCase() || 'pending';
        const total = Number(order.total) || 0;

        summary.totalOrders += 1;
        summary.totalAmount += total;
        summary.byPaymentStatus[paymentStatus] = (summary.byPaymentStatus[paymentStatus] || 0) + 1;
        summary.byOrderStatus[orderStatus] = (summary.byOrderStatus[orderStatus] || 0) + 1;

        if (PAID_STATUSES.has(paymentStatus)) {
            summary.confirmedOrders += 1;
            summary.revenue += total;
        } else if (!NON_CONFIRMABLE_STATUSES.has(paymentStatus)) {
            summary.pendingOrders += 1;
            summary.pendingRevenue += total;
        }

        return summary;
    }, {
        totalOrders: 0,
        totalAmount: 0,
        confirmedOrders: 0,
        revenue: 0,
        pendingOrders: 0,
        pendingRevenue: 0,
        byPaymentStatus: {},
        byOrderStatus: {},
    });
}

async function getTopCustomers({ domain, query = {}, now = new Date() }) {
    const range = parseTopCustomersRange(query, now);
    const limit = parseLimit(query.limit);
    const sortBy = parseCustomerSortBy(query.sortBy);
    const paidOrders = await getConfirmedOrdersFromDatabase(domain, range);

    return {
        range: {
            startDate: formatDate(range.start),
            endDate: formatDate(range.end),
            timezone: TIME_ZONE,
        },
        sortBy,
        customers: aggregateTopCustomers(paidOrders, { limit, sortBy }),
    };
}

async function getConfirmedOrdersFromDatabase(domain, range) {
    if (mongoose.connection.readyState !== 1) {
        throw createHttpError(503, 'La conexión principal a MongoDB no está disponible.');
    }

    const collection = mongoose.connection.collection('orders');
    const endExclusive = new Date(range.end);
    endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);

    try {
        return await collection.find({
            domain,
            'paymentStatus.typeStatus': { $in: [...PAID_STATUSES] },
            createdAt: { $gte: range.start, $lt: endExclusive },
        }, {
            projection: {
                clientInfo: 1,
                createdAt: 1,
                products: 1,
                total: 1,
            },
        }).toArray();
    } catch (error) {
        throw createHttpError(502, `No se pudo consultar la colección de órdenes: ${error.message}`);
    }
}

function buildRevenueHistory(orders, range) {
    const amountsByDate = new Map();
    for (const order of orders) {
        const paymentStatus = String(order.paymentStatus?.typeStatus || 'pending').toLowerCase();
        const orderDate = parseOrderDate(order.createdAt);
        if (!PAID_STATUSES.has(paymentStatus) || !orderDate) continue;

        const date = formatDate(orderDate);
        amountsByDate.set(date, (amountsByDate.get(date) || 0) + (Number(order.total) || 0));
    }

    const history = [];
    for (let date = new Date(range.start); date <= range.end; date.setUTCDate(date.getUTCDate() + 1)) {
        const label = formatDate(date);
        history.push({ label, amount: amountsByDate.get(label) || 0 });
    }
    return history;
}

function aggregateTopCustomers(orders, { limit, sortBy }) {
    const customers = new Map();

    for (const order of orders) {
        const customer = getCustomerIdentity(order.clientInfo);
        if (!customer) continue;

        const current = customers.get(customer.key) || {
            customerKey: customer.key,
            name: customer.name,
            initials: getInitials(customer.name),
            amount: 0,
            orders: 0,
            products: new Map(),
        };

        current.amount += Number(order.total) || 0;
        current.orders += 1;

        for (const product of Array.isArray(order.products) ? order.products : []) {
            const title = String(product?.title || '').trim();
            if (!title) continue;
            const quantity = Number(product.qty) || 1;
            current.products.set(title, (current.products.get(title) || 0) + quantity);
        }

        customers.set(customer.key, current);
    }

    return [...customers.values()]
        .map((customer) => ({
            name: customer.name,
            initials: customer.initials,
            amount: Number(customer.amount.toFixed(2)),
            orders: customer.orders,
            detail: buildProductDetail(customer.products),
        }))
        .sort((left, right) => {
            const first = sortBy === 'orders' ? right.orders - left.orders : right.amount - left.amount;
            if (first !== 0) return first;

            const second = sortBy === 'orders' ? right.amount - left.amount : right.orders - left.orders;
            return second !== 0 ? second : left.name.localeCompare(right.name, 'es');
        })
        .slice(0, limit);
}

function getCustomerIdentity(clientInfo) {
    if (!clientInfo || typeof clientInfo !== 'object') return null;

    const documentNumber = normalizeIdentifier(clientInfo.number_doc);
    const email = String(clientInfo.email || '').trim().toLowerCase();
    const phone = normalizeIdentifier(clientInfo.phone);
    const name = [clientInfo.first_name, clientInfo.last_name]
        .map((value) => String(value || '').trim())
        .filter(Boolean)
        .join(' ');
    const normalizedName = normalizeName(name);
    const key = documentNumber
        ? `document:${documentNumber}`
        : email
            ? `email:${email}`
            : phone
                ? `phone:${phone}`
                : normalizedName
                    ? `name:${normalizedName}`
                    : null;

    if (!key) return null;

    return {
        key,
        name: name || email || phone || 'Cliente sin nombre',
    };
}

function normalizeIdentifier(value) {
    return String(value || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
}

function normalizeName(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
}

function getInitials(name) {
    return String(name)
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('') || 'CL';
}

function buildProductDetail(products) {
    const sorted = [...products.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0], 'es'));
    if (!sorted.length) return 'Sin productos registrados';

    const [first, second] = sorted;
    const labels = [first, second].filter(Boolean).map(([title]) => title);
    const remaining = sorted.length - labels.length;
    return `${labels.join(', ')}${remaining ? ` + ${remaining} más` : ''}`;
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

function parseTopCustomersRange(query, now) {
    if (query.date || query.startDate || query.endDate) return parseDateRange(query, now);

    const end = startOfDayInLima(now);
    const start = new Date(end);
    start.setUTCDate(start.getUTCDate() - 29);
    return { start, end };
}

function parseLimit(value) {
    if (value === undefined) return 5;
    const limit = Number(value);
    if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
        throw createHttpError(400, 'limit debe ser un entero entre 1 y 50.');
    }
    return limit;
}

function parseCustomerSortBy(value) {
    if (value === undefined || value === 'amount') return 'amount';
    if (value === 'orders') return 'orders';
    throw createHttpError(400, 'sortBy debe ser amount u orders.');
}

function getAnnualRange(endDate) {
    const year = endDate.getUTCFullYear();
    return {
        start: new Date(Date.UTC(year, 0, 1)),
        end: new Date(endDate),
    };
}

function isWithinRange(value, range) {
    const date = parseOrderDate(value);
    return date !== null && date >= range.start && date <= range.end;
}

function parseOrderDate(value) {
    if (value instanceof Date) {
        return Number.isNaN(value.valueOf())
            ? null
            : new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
    }
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
    getTopCustomers,
    parseDateRange,
    summarizeOrders,
    buildRevenueHistory,
    aggregateTopCustomers,
};
