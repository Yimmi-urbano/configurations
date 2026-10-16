const { BetaAnalyticsDataClient } = require('@google-analytics/data');

let analyticsClient;
const topProductViewsCache = new Map();
const TOP_PRODUCT_VIEWS_CACHE_TTL_MS = 5 * 60 * 1000;

async function getHomePageTraffic({ startDate, endDate, previousStartDate, previousEndDate, pagePath, hostName, client = getAnalyticsClient() }) {
    const propertyId = process.env.GOOGLE_ANALYTICS_PROPERTY_ID;
    if (!propertyId) {
        throw new Error('GOOGLE_ANALYTICS_PROPERTY_ID no está configurada.');
    }

    const request = (start, end) => client.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [{ startDate: start, endDate: end }],
        metrics: [{ name: 'screenPageViews' }],
        dimensionFilter: {
            andGroup: {
                expressions: [
                    {
                        filter: {
                            fieldName: 'pagePath',
                            stringFilter: {
                                matchType: 'EXACT',
                                value: pagePath,
                            },
                        },
                    },
                    {
                        filter: {
                            fieldName: 'hostName',
                            stringFilter: {
                                matchType: 'EXACT',
                                value: hostName,
                            },
                        },
                    },
                ],
            },
        },
    });

    const channelRequest = client.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'sessionDefaultChannelGroup' }],
        metrics: [{ name: 'sessions' }],
        dimensionFilter: {
            filter: {
                fieldName: 'hostName',
                stringFilter: {
                    matchType: 'EXACT',
                    value: hostName,
                },
            },
        },
    });

    const [[currentReport], [previousReport], [channelReport]] = await Promise.all([
        request(startDate, endDate),
        request(previousStartDate, previousEndDate),
        channelRequest,
    ]);

    return {
        visits: getMetricValue(currentReport),
        previousVisits: getMetricValue(previousReport),
        channels: getChannelRows(channelReport),
    };
}

async function getTopProductPages({ startDate, endDate, previousStartDate, previousEndDate, hostName, productPathPrefix = '/product/', client = getAnalyticsClient() }) {
    const propertyId = process.env.GOOGLE_ANALYTICS_PROPERTY_ID;
    if (!propertyId) {
        throw new Error('GOOGLE_ANALYTICS_PROPERTY_ID no está configurada.');
    }

    const cacheKey = [hostName, startDate, endDate, previousStartDate, previousEndDate, productPathPrefix].join(':');
    const cached = topProductViewsCache.get(cacheKey);
    if (cached && Date.now() - cached.createdAt < TOP_PRODUCT_VIEWS_CACHE_TTL_MS) {
        return cached.value;
    }

    const request = (start, end) => client.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [{ startDate: start, endDate: end }],
        dimensions: [{ name: 'pagePath' }, { name: 'pageTitle' }],
        metrics: [{ name: 'screenPageViews' }],
        limit: 100,
        orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
        dimensionFilter: {
            andGroup: {
                expressions: [
                    { filter: { fieldName: 'hostName', stringFilter: { matchType: 'EXACT', value: hostName } } },
                    { filter: { fieldName: 'pagePath', stringFilter: { matchType: 'BEGINS_WITH', value: productPathPrefix } } },
                ],
            },
        },
    });

    const [[currentReport], [previousReport]] = await Promise.all([
        request(startDate, endDate),
        request(previousStartDate, previousEndDate),
    ]);
    const previousViews = new Map(
        getProductPageRows(previousReport, productPathPrefix).map((product) => [product.slug, product.views]),
    );
    const products = getProductPageRows(currentReport, productPathPrefix)
        .map((product) => ({ ...product, previousViews: previousViews.get(product.slug) || 0 }));

    topProductViewsCache.set(cacheKey, { createdAt: Date.now(), value: products });
    return products;
}

function getAnalyticsClient() {
    if (analyticsClient) return analyticsClient;

    const clientEmail = process.env.GOOGLE_ANALYTICS_CLIENT_EMAIL;
    const privateKey = process.env.GOOGLE_ANALYTICS_PRIVATE_KEY?.replace(/\\n/g, '\n');
    if ((clientEmail && !privateKey) || (!clientEmail && privateKey)) {
        throw new Error('GOOGLE_ANALYTICS_CLIENT_EMAIL y GOOGLE_ANALYTICS_PRIVATE_KEY deben configurarse juntos.');
    }

    analyticsClient = new BetaAnalyticsDataClient(
        clientEmail ? { credentials: { client_email: clientEmail, private_key: privateKey } } : undefined,
    );
    return analyticsClient;
}

function getMetricValue(report) {
    return Number(report.rows?.[0]?.metricValues?.[0]?.value || 0);
}

function getChannelRows(report) {
    return (report.rows || [])
        .map((row) => ({
            name: row.dimensionValues?.[0]?.value || 'Sin clasificar',
            sessions: Number(row.metricValues?.[0]?.value || 0),
        }))
        .filter((channel) => channel.sessions > 0)
        .sort((first, second) => second.sessions - first.sessions);
}

function getProductPageRows(report, productPathPrefix) {
    const products = new Map();

    for (const row of report.rows || []) {
        const pagePath = row.dimensionValues?.[0]?.value || '';
        const slug = getProductSlug(pagePath, productPathPrefix);
        if (!slug) continue;

        const title = normalizeProductTitle(row.dimensionValues?.[1]?.value, slug);
        const views = Number(row.metricValues?.[0]?.value || 0);
        const current = products.get(slug) || { slug, title, views: 0 };
        current.views += views;
        if (current.title === slug && title !== slug) current.title = title;
        products.set(slug, current);
    }

    return [...products.values()].sort((first, second) => second.views - first.views || first.title.localeCompare(second.title, 'es'));
}

function getProductSlug(pagePath, productPathPrefix) {
    if (typeof pagePath !== 'string' || !pagePath.startsWith(productPathPrefix)) return null;

    const slug = pagePath.slice(productPathPrefix.length).replace(/\/+$/, '').split('/')[0];
    if (!slug) return null;

    try {
        return decodeURIComponent(slug);
    } catch {
        return slug;
    }
}

function normalizeProductTitle(value, slug) {
    const title = String(value || '').trim();
    return title && title !== '(not set)' ? title : slug;
}

module.exports = { getHomePageTraffic, getTopProductPages, getChannelRows };
