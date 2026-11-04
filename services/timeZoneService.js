const mongoose = require('mongoose');

const DEFAULT_TIME_ZONE = 'America/Lima';

function isValidTimeZone(timeZone) {
    if (typeof timeZone !== 'string' || !timeZone.trim()) return false;
    try {
        new Intl.DateTimeFormat('en-US', { timeZone }).format();
        return true;
    } catch {
        return false;
    }
}

async function getDomainTimeZone(domain) {
    if (!domain || mongoose.connection.readyState !== 1) return DEFAULT_TIME_ZONE;
    try {
        const config = await mongoose.connection.collection('configuration').findOne(
            { domain },
            { projection: { timeZone: 1 } },
        );
        return isValidTimeZone(config?.timeZone) ? config.timeZone : DEFAULT_TIME_ZONE;
    } catch {
        return DEFAULT_TIME_ZONE;
    }
}

function getDateKeyInTimeZone(date, timeZone) {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).formatToParts(date);
    const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
    return `${values.year}-${values.month}-${values.day}`;
}

function dateKeyToInstant(dateKey, timeZone) {
    if (typeof dateKey !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
        throw new Error('La fecha debe tener el formato YYYY-MM-DD.');
    }
    const [year, month, day] = dateKey.split('-').map(Number);
    const checkedDate = new Date(Date.UTC(year, month - 1, day));
    if (checkedDate.getUTCFullYear() !== year || checkedDate.getUTCMonth() !== month - 1 || checkedDate.getUTCDate() !== day) {
        throw new Error('La fecha no es válida.');
    }
    const wallClock = Date.UTC(year, month - 1, day);
    const offsetAt = (instant) => {
        const parts = new Intl.DateTimeFormat('en-US', {
            timeZone,
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
        }).formatToParts(new Date(instant));
        const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
        return Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day), Number(values.hour), Number(values.minute), Number(values.second)) - instant;
    };
    const firstOffset = offsetAt(wallClock);
    const firstGuess = wallClock - firstOffset;
    const timestamp = wallClock - offsetAt(firstGuess);
    const result = new Date(timestamp);
    if (Number.isNaN(result.valueOf())) throw new Error('La fecha no es válida.');
    return result;
}

module.exports = { DEFAULT_TIME_ZONE, dateKeyToInstant, getDateKeyInTimeZone, getDomainTimeZone, isValidTimeZone };
