"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseDateTime = parseDateTime;
function parseDateTime(value) {
    if (value === undefined || value === null || String(value).trim() === "")
        return null;
    const text = String(value).trim();
    const localDateTime = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?$/.test(text);
    const date = new Date(localDateTime ? `${text}${text.length === 16 ? ":00" : ""}+07:00` : text);
    return Number.isNaN(date.getTime()) ? null : date;
}
