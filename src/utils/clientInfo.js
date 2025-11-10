export function getClientInfo(req) {
    const userAgent = req.get('User-Agent') || null;

    let ip = null;
    const xff = req.headers['x-forwarded-for'];
    if (xff) {
        ip = xff.split(',')[0].trim();
    } else if (req.ip) {
        ip = req.ip;
    } else if (req.connection && req.connection.remoteAddress) {
        ip = req.connection.remoteAddress;
    } else if (req.socket && req.socket.remoteAddress) {
        ip = req.socket.remoteAddress;
    }

    if (ip) {
        if (ip.startsWith('::ffff:')) ip = ip.replace('::ffff:', '');
        if (ip === '::1') ip = '127.0.0.1';
        ip = ip.split(':').slice(-1).length === 1 && ip.includes('.') ? ip : ip.split(':')[0];
    }

    return {
        ip_address: ip || null,
        user_agent: userAgent || null
    };
}
