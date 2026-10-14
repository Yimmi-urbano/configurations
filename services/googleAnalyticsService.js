const { BetaAnalyticsDataClient } = require('@google-analytics/data');

let analyticsClient;

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

module.exports = { getHomePageTraffic, getChannelRows };
