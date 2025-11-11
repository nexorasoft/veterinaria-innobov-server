
const allowedOrigins = [
    'http://localhost:5173',
    'http://192.168.1.10:4321',
];

export const corsMiddleware = (req, res, next) => {
    const origin = req.headers.origin;

    const isAllowed = allowedOrigins.includes(origin) ||
        (origin && origin.match(/^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+):\d+$/));

    if (isAllowed) {
        res.header('Access-Control-Allow-Origin', origin);
    }

    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');

    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }

    next();
};


export const customCorsMiddleware = (customOrigins = []) => {
    const origins = [...allowedOrigins, ...customOrigins];

    return (req, res, next) => {
        const origin = req.headers.origin;

        if (origins.includes(origin)) {
            res.header('Access-Control-Allow-Origin', origin);
        }

        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.header('Access-Control-Allow-Credentials', 'true');

        if (req.method === 'OPTIONS') {
            return res.sendStatus(200);
        }

        next();
    };
};