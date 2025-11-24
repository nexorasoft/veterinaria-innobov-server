export const hPet = {
    _calculateAgeLabel(birthDateStr) {
        if (!birthDateStr) return 'Unknown age';
        
        const birthDate = new Date(birthDateStr);
        const today = new Date();
        
        let years = today.getFullYear() - birthDate.getFullYear();
        let months = today.getMonth() - birthDate.getMonth();
        let days = today.getDate() - birthDate.getDate();
        
        if (days < 0) {
            months--;
            const lastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
            days += lastMonth.getDate();
        }
        
        if (months < 0) {
            years--;
            months += 12;
        }
        
        const parts = [];
        
        if (years > 0) {
            parts.push(`${years} año${years !== 1 ? 's' : ''}`);
        }
        
        if (months > 0) {
            parts.push(`${months} mes${months !== 1 ? 'es' : ''}`);
        }
        
        if (days > 0 && years === 0) {
            parts.push(`${days} día${days !== 1 ? 's' : ''}`);
        }
        
        return parts.length > 0 ? parts.join(', ') : '0 días';
    },
}