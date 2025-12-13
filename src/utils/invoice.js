
export function generateAccessKey(data) {
    if (!data) {
        return null;
    }

    const {
        document_type = '01',
        ruc,
        environment_type,
        sequential_number,
        numeric_code,
        emission_type
    } = data;

    if (!ruc || !environment_type || !sequential_number || !numeric_code || !emission_type) {
        return null;
    }

    const { day, month, year } = getCurrentDateParts();
    const dayFormatted = String(day).padStart(2, '0');
    const monthFormatted = String(month).padStart(2, '0');

    const base = `${dayFormatted}${monthFormatted}${year}${document_type}${ruc}${environment_type}${sequential_number}${numeric_code}${emission_type}`;
    const verificate = getVerifierDigit(base);

    console.log('Access key generated:', `${base}${verificate}`);
    return `${base}${verificate}`;
}

function getVerifierDigit(key) {
    const coef = [2, 3, 4, 5, 6, 7];
    let sum = 0;

    for (let i = key.length - 1, j = 0; i >= 0; i--, j++) {
        sum += parseInt(key[i], 10) * coef[j % coef.length];
    }

    const mod = 11 - (sum % 11);

    if (mod === 11) return '0';
    if (mod === 10) return '1';
    return mod.toString();
}

function getCurrentDateParts(timezone = 'America/Guayaquil') {
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