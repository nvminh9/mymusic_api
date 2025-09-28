export function encodeCursor(obj) {
    // obj e.g. { createdAt: '2025-07-01T..', messageId: 'uuid' }
    const s = JSON.stringify(obj);
    return Buffer.from(s).toString("base64");
}

export function decodeCursor(cursor) {
    try {
        const s = Buffer.from(cursor, "base64").toString("utf8");
        return JSON.parse(s);
    } catch (err) {
        return null;
    }
}