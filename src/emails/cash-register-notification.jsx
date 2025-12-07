import * as React from 'react';

export default function CashRegisterNotification({
    name = "Jose Luis Zambrano",
    isOpen = false,
    datetime = "2025-12-01 14:30:00",
    cashier_name = "Juan Pérez",
    cash_name = "Caja Principal",
    initial_amount = 150.00,
    expected_amount = 450.00,
    actual_amount = 445.00,
    difference = -5.00,
    clinic = "Sucursal Centro",
    notes = "Apertura regular del turno matutino.",
    ip_address = "192.168.1.10",
    device = "Chrome / Windows",
}) {

    const actionText = isOpen ? "Apertura de Caja" : "Cierre de Caja";

    // Colores semánticos
    const accentColor = isOpen ? "#059669" : "#dc2626";
    const accentBg = isOpen ? "#ecfdf5" : "#fef2f2";

    // Lógica para el color de la diferencia (Solo aplica en Cierre)
    const diffVal = difference || 0;
    const differenceColor = diffVal === 0 ? "#059669" : diffVal > 0 ? "#0891b2" : "#dc2626";
    const differenceLabel = diffVal === 0 ? "Cuadrado" : diffVal > 0 ? "Sobrante" : "Faltante";

    return (
        <div style={main}>
            <div style={container}>

                {/* HEADER HORIZONTAL */}
                <div style={headerSection}>
                    <table width="100%" border={0} cellPadding={0} cellSpacing={0}>
                        <tbody>
                            <tr>
                                <td align="left" style={{ width: '60%' }}>
                                    <img
                                        src="https://res.cloudinary.com/dfg9b8dtx/image/upload/v1764604894/logo-veterinaria_gqauas.png"
                                        alt="Logo Veterinaria"
                                        style={logo}
                                        width="140"
                                        height="auto"
                                    />
                                </td>
                                <td align="right" style={{ verticalAlign: 'middle' }}>
                                    <span style={{
                                        ...badge,
                                        color: accentColor,
                                        backgroundColor: accentBg,
                                        borderColor: accentColor
                                    }}>
                                        {actionText.toUpperCase()}
                                    </span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* BODY CONTENT */}
                <div style={bodySection}>
                    <h1 style={heading}>Hola, {name}</h1>
                    <p style={paragraph}>
                        Se ha registrado una actividad en <strong>{clinic}</strong> con fecha <strong>{datetime}</strong>.
                    </p>

                    {/* SECCIÓN FINANCIERA (Diseño Horizontal) */}
                    <div style={{ ...financialBar, borderLeft: `4px solid ${accentColor}` }}>
                        {isOpen ? (
                            // CASO APERTURA: Solo mostramos monto inicial
                            <table width="100%" border={0} cellPadding={0} cellSpacing={0}>
                                <tbody>
                                    <tr>
                                        <td align="left" style={{ verticalAlign: 'middle' }}>
                                            <span style={label}>Monto Inicial</span>
                                        </td>
                                        <td align="right" style={{ verticalAlign: 'middle' }}>
                                            <span style={{ ...bigNumber, color: accentColor }}>
                                                $ {initial_amount?.toFixed(2)}
                                            </span>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        ) : (
                            // CASO CIERRE: Grid de 3 columnas (Esperado | Real | Diferencia)
                            <table width="100%" border={0} cellPadding={0} cellSpacing={0}>
                                <tbody>
                                    <tr>
                                        {/* Columna 1: Esperado */}
                                        <td width="33%" align="center" style={{ verticalAlign: 'top' }}>
                                            <span style={statNumber}>
                                                $ {expected_amount?.toFixed(2)}
                                            </span>
                                            <span style={statLabel}>Esperado</span>
                                        </td>

                                        {/* Columna 2: Real (Con bordes laterales) */}
                                        <td width="33%" align="center" style={{ verticalAlign: 'top', borderLeft: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0' }}>
                                            <span style={{ ...statNumber, color: '#1e293b' }}>
                                                $ {actual_amount?.toFixed(2)}
                                            </span>
                                            <span style={statLabel}>Real en Caja</span>
                                        </td>

                                        {/* Columna 3: Diferencia */}
                                        <td width="33%" align="center" style={{ verticalAlign: 'top' }}>
                                            <span style={{ ...statNumber, color: differenceColor }}>
                                                $ {Math.abs(diffVal).toFixed(2)}
                                            </span>
                                            <span style={{ ...statLabel, color: differenceColor }}>
                                                {differenceLabel}
                                            </span>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* DETAILS GRID (Caja / Responsable) */}
                    <div style={detailsGrid}>
                        <table width="100%" style={{ borderCollapse: 'collapse' }}>
                            <tbody>
                                <tr>
                                    <td style={gridCell}>
                                        <span style={label}>CAJA</span>
                                        <p style={value}>{cash_name}</p>
                                    </td>
                                    <td style={{ ...gridCell, borderLeft: '1px solid #e2e8f0', paddingLeft: '24px' }}>
                                        <span style={label}>RESPONSABLE</span>
                                        <p style={value}>{cashier_name}</p>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* NOTES SECTION */}
                    {notes && (
                        <div style={notesSection}>
                            <p style={notesText}>
                                <strong style={{ color: '#854d0e' }}>Nota:</strong> {notes}
                            </p>
                        </div>
                    )}
                </div>

                {/* FOOTER HORIZONTAL */}
                <div style={footerSection}>
                    <table width="100%" border={0} cellPadding={0} cellSpacing={0}>
                        <tbody>
                            <tr>
                                <td align="left" style={footerText}>
                                    <strong>IP:</strong> {ip_address}
                                </td>
                                <td align="right" style={footerText}>
                                    {device}
                                </td>
                            </tr>
                            <tr>
                                <td colSpan={2} align="center" style={{ paddingTop: '24px' }}>
                                    <p style={copyright}>
                                        © {new Date().getFullYear()} Sistema Veterinario. Notificación automática.
                                    </p>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

            </div>
        </div>
    );
}

// --- ESTILOS OPTIMIZADOS Y RESPONSIVE (JS) ---

const main = {
    backgroundColor: '#f8fafc',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Helvetica Neue", sans-serif',
    // FIX MOVIL: boxSizing y padding seguro
    boxSizing: 'border-box',
    padding: '40px 16px',
    width: '100%',
    minHeight: '100%',
};

const container = {
    backgroundColor: '#ffffff',
    margin: '0 auto',
    maxWidth: '600px',
    width: '100%',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    overflow: 'hidden',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
    boxSizing: 'border-box',
};

const headerSection = {
    padding: '32px 32px 24px 32px',
    borderBottom: '1px solid #f1f5f9',
};

const logo = {
    display: 'block',
    maxWidth: '100%',
    border: 'none',
    outline: 'none',
};

const badge = {
    fontSize: '12px',
    fontWeight: '700',
    padding: '6px 12px',
    borderRadius: '20px',
    border: '1px solid',
    whiteSpace: 'nowrap',
    letterSpacing: '0.5px',
    display: 'inline-block',
};

const bodySection = {
    padding: '32px',
};

const heading = {
    margin: '0 0 16px',
    fontSize: '22px',
    fontWeight: '700',
    color: '#1e293b',
    lineHeight: '1.3',
};

const paragraph = {
    margin: '0 0 28px',
    fontSize: '16px',
    lineHeight: '26px',
    color: '#475569',
};

const financialBar = {
    backgroundColor: '#f8fafc',
    padding: '24px',
    borderRadius: '8px',
    marginBottom: '28px',
    border: '1px solid #e2e8f0',
};

// Estilos específicos para Apertura (Número grande simple)
const bigNumber = {
    fontSize: '26px',
    fontWeight: '800',
    margin: '0',
    display: 'block',
    lineHeight: '1',
};

// Estilos específicos para Cierre (Grid de 3 columnas)
const statNumber = {
    fontSize: '18px', // Un poco más pequeño para caber 3 en línea
    fontWeight: '700',
    color: '#64748b',
    display: 'block',
    marginBottom: '4px',
};

const statLabel = {
    fontSize: '11px',
    fontWeight: '700',
    textTransform: 'uppercase',
    color: '#94a3b8',
    letterSpacing: '0.5px',
};

const detailsGrid = {
    marginBottom: '28px',
    width: '100%',
};

const gridCell = {
    verticalAlign: 'top',
    paddingBottom: '8px',
    width: '50%',
};

const label = {
    fontSize: '12px',
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    marginBottom: '6px',
    letterSpacing: '0.5px',
    display: 'block',
};

const value = {
    fontSize: '16px',
    fontWeight: '600',
    color: '#334155',
    margin: '0',
    lineHeight: '1.4',
};

const notesSection = {
    backgroundColor: '#fffbeb',
    padding: '16px 20px',
    borderRadius: '6px',
    borderLeft: '4px solid #f59e0b',
    width: 'auto',
};

const notesText = {
    margin: '0',
    fontSize: '14px',
    color: '#92400e',
    lineHeight: '22px',
};

const footerSection = {
    backgroundColor: '#f1f5f9',
    padding: '24px 32px',
    borderTop: '1px solid #e2e8f0',
};

const footerText = {
    fontSize: '12px',
    color: '#94a3b8',
    fontFamily: 'SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace',
    lineHeight: '1.5',
};

const copyright = {
    margin: '0',
    fontSize: '12px',
    color: '#cbd5e1',
    fontWeight: '500',
};