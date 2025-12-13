export function getCurrentDateTime() {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

export function getCurrentDateForSRI(timezone = 'America/Guayaquil') {
    try {
        const now = new Date();
        const options = {
            timeZone: timezone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        };

        const formatter = new Intl.DateTimeFormat('en-CA', options);
        const [year, month, day] = formatter.format(now).split('-');

        return `${day}/${month}/${year}`;
    } catch (error) {
        console.error('Error getting local date for SRI:', error);
        const now = new Date();
        const day = String(now.getDate()).padStart(2, '0');
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const year = now.getFullYear();
        return `${day}/${month}/${year}`;
    }
}

export function getCurrentDateParts(timezone = 'America/Guayaquil') {
    const now = new Date();

    const options = {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    };

    const formatter = new Intl.DateTimeFormat('en-CA', options);
    const formatted = formatter.format(now);

    const [year, month, day] = formatted.split('-');

    return {
        day: parseInt(day, 10),
        month: parseInt(month, 10),
        year: parseInt(year, 10)
    };
}

export function getCurrentDateTimeWithMs() {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const milliseconds = String(now.getMilliseconds()).padStart(3, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds}`;
}

export function getSriPaymentCode(method) {
    if (!method) return '01';
    const m = method.toUpperCase();
    if (m === 'EFECTIVO') return '01';
    if (m === 'TRANSFERENCIA') return '20';
    if (m === 'TARJETA') return '19';
    if (m === 'CREDITO') return '20';
    return '01';
};

export function convertDateTime(input) {
    const date = new Date(input); // interpreta el string ISO

    const pad = n => String(n).padStart(2, '0');

    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());

    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    const seconds = pad(date.getSeconds());

    const ms = String(date.getMilliseconds()).padStart(3, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${ms}`;
}
