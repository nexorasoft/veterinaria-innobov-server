-- ============================================
-- SISTEMA VETERINARIO - VISTAS
-- Vistas útiles para reportes y consultas
-- ============================================

-- ============================================
-- VISTAS DE PRODUCTOS E INVENTARIO
-- ============================================

-- Vista: Productos con stock bajo
CREATE VIEW view_low_stock_products AS
SELECT 
    p.id,
    p.code,
    p.name,
    p.stock,
    p.min_stock,
    c.name as category,
    s.name as supplier,
    p.sale_price
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN suppliers s ON p.supplier_id = s.id
WHERE p.stock <= p.min_stock 
AND p.active = 1;

-- Vista: Productos próximos a vencer
CREATE VIEW view_expiring_products AS
SELECT 
    p.id,
    p.code,
    p.name,
    p.expiration_date,
    julianday(p.expiration_date) - julianday('now') as days_until_expiry,
    p.stock,
    c.name as category
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
WHERE p.expiration_date IS NOT NULL
AND julianday(p.expiration_date) - julianday('now') <= 60
AND p.active = 1
ORDER BY p.expiration_date ASC;

-- Vista: Top productos más vendidos
CREATE VIEW view_top_selling_products AS
SELECT 
    p.id,
    p.code,
    p.name,
    COUNT(sd.id) as times_sold,
    SUM(sd.quantity) as total_quantity,
    SUM(sd.subtotal) as total_revenue,
    c.name as category
FROM products p
JOIN sale_details sd ON sd.product_id = p.id
JOIN categories c ON p.category_id = c.id
JOIN sales s ON sd.sale_id = s.id
WHERE s.status = 'EMITIDA'
GROUP BY p.id
ORDER BY total_revenue DESC;

-- ============================================
-- VISTAS DE VENTAS
-- ============================================

-- Vista: Ventas del día
CREATE VIEW view_daily_sales AS
SELECT 
    s.id,
    s.sequential,
    c.name as client_name,
    u.name as user_name,
    s.total,
    s.payment_method,
    s.status,
    s.sri_status,
    s.created_at
FROM sales s
JOIN clients c ON s.client_id = c.id
JOIN users u ON s.user_id = u.id
WHERE DATE(s.created_at) = DATE('now', '-5 hours')
ORDER BY s.created_at DESC;

-- Vista: Resumen de ventas por período
CREATE VIEW view_sales_summary AS
SELECT 
    DATE(created_at) as sale_date,
    COUNT(*) as total_sales,
    SUM(total) as total_amount,
    AVG(total) as average_sale,
    SUM(CASE WHEN payment_method = 'EFECTIVO' THEN total ELSE 0 END) as cash_sales,
    SUM(CASE WHEN payment_method = 'TARJETA' THEN total ELSE 0 END) as card_sales,
    SUM(CASE WHEN payment_method = 'TRANSFERENCIA' THEN total ELSE 0 END) as transfer_sales
FROM sales
WHERE status = 'EMITIDA'
GROUP BY DATE(created_at)
ORDER BY sale_date DESC;

-- ============================================
-- VISTAS DE CLÍNICA
-- ============================================

-- Vista: Citas del día
CREATE VIEW view_today_appointments AS
SELECT 
    a.id,
    p.name as pet_name,
    sp.name as species,
    c.name as client_name,
    c.phone as client_phone,
    u.name as veterinarian,
    a.date,
    a.duration_minutes,
    a.reason,
    a.status
FROM appointments a
JOIN pets p ON a.pet_id = p.id
JOIN species sp ON p.species_id = sp.id
JOIN clients c ON p.client_id = c.id
JOIN users u ON a.user_id = u.id
WHERE DATE(a.date) = DATE('now', '-5 hours')
ORDER BY a.date ASC;

-- Vista: Historial clínico completo de mascotas
CREATE VIEW view_pet_medical_history AS
SELECT 
    p.id as pet_id,
    p.name as pet_name,
    c.name as client_name,
    'CONSULTA' as record_type,
    con.created_at as date,
    con.diagnosis as details,
    u.name as attended_by
FROM pets p
JOIN clients c ON p.client_id = c.id
JOIN consultations con ON con.pet_id = p.id
JOIN users u ON con.user_id = u.id
UNION ALL
SELECT 
    p.id,
    p.name,
    c.name,
    'VACUNA',
    v.date_given,
    v.vaccine_name || ' - Próxima: ' || COALESCE(v.next_due, 'N/A'),
    COALESCE(u.name, 'N/A')
FROM pets p
JOIN clients c ON p.client_id = c.id
JOIN vaccinations v ON v.pet_id = p.id
LEFT JOIN users u ON v.applied_by = u.id
ORDER BY date DESC;

-- ============================================
-- VISTAS DE FINANZAS
-- ============================================

-- Vista: Cuentas por cobrar pendientes
CREATE VIEW view_pending_receivables AS
SELECT 
    ar.id,
    c.name as client_name,
    c.phone as client_phone,
    ar.amount,
    ar.amount_paid,
    ar.balance,
    ar.due_date,
    CASE 
        WHEN julianday('now') > julianday(ar.due_date) THEN 'VENCIDO'
        WHEN julianday(ar.due_date) - julianday('now') <= 7 THEN 'POR_VENCER'
        ELSE 'VIGENTE'
    END as urgency,
    ar.created_at
FROM accounts_receivable ar
JOIN clients c ON ar.client_id = c.id
WHERE ar.status IN ('PENDIENTE', 'PAGADO_PARCIAL')
ORDER BY ar.due_date ASC;

-- Vista: Cuentas por pagar pendientes
CREATE VIEW view_pending_payables AS
SELECT 
    ap.id,
    s.name as supplier_name,
    s.phone as supplier_phone,
    ap.amount,
    ap.amount_paid,
    ap.balance,
    ap.due_date,
    CASE 
        WHEN julianday('now') > julianday(ap.due_date) THEN 'VENCIDO'
        WHEN julianday(ap.due_date) - julianday('now') <= 7 THEN 'POR_VENCER'
        ELSE 'VIGENTE'
    END as urgency,
    ap.created_at
FROM accounts_payable ap
JOIN suppliers s ON ap.supplier_id = s.id
WHERE ap.status IN ('PENDIENTE', 'PAGADO_PARCIAL')
ORDER BY ap.due_date ASC;

-- Vista: Flujo de caja
CREATE VIEW view_cash_flow AS
SELECT 
    DATE(created_at) as date,
    type,
    category,
    SUM(amount) as total_amount,
    COUNT(*) as transaction_count
FROM cash_movements
GROUP BY DATE(created_at), type, category
ORDER BY date DESC, type;

-- ============================================
-- VISTAS DE SESIONES Y SEGURIDAD
-- ============================================

-- Vista: Sesiones activas por usuario
CREATE VIEW view_active_sessions AS
SELECT 
    u.id as user_id,
    u.name as user_name,
    u.email,
    r.name as role,
    s.id as session_id,
    s.ip_address,
    s.device_info,
    s.created_at as login_time,
    s.last_activity,
    CAST((julianday('now', '-5 hours') - julianday(s.last_activity)) * 24 * 60 AS INTEGER) as minutes_inactive,
    s.expires_at
FROM user_sessions s
JOIN users u ON s.user_id = u.id
JOIN roles r ON u.role_id = r.id
WHERE s.is_active = 1
AND s.expires_at > datetime('now', '-5 hours')
ORDER BY s.last_activity DESC;

-- Vista: Historial de login por usuario
CREATE VIEW view_login_history AS
SELECT 
    u.id as user_id,
    u.name as user_name,
    u.email,
    la.ip_address,
    la.success,
    la.failure_reason,
    la.created_at
FROM login_attempts la
LEFT JOIN users u ON la.email = u.email
ORDER BY la.created_at DESC;

-- Vista: Dispositivos por usuario
CREATE VIEW view_user_devices AS
SELECT 
    u.id as user_id,
    u.name as user_name,
    td.device_name,
    td.device_fingerprint,
    td.ip_address,
    td.last_used,
    td.is_active,
    td.created_at as first_seen
FROM trusted_devices td
JOIN users u ON td.user_id = u.id
ORDER BY td.last_used DESC;-- ============================================
-- SISTEMA VETERINARIO - VISTAS
-- Vistas útiles para reportes y consultas
-- ============================================

-- ============================================
-- VISTAS DE PRODUCTOS E INVENTARIO
-- ============================================

-- Vista: Productos con stock bajo
CREATE VIEW view_low_stock_products AS
SELECT 
    p.id,
    p.code,
    p.name,
    p.stock,
    p.min_stock,
    c.name as category,
    s.name as supplier,
    p.sale_price
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN suppliers s ON p.supplier_id = s.id
WHERE p.stock <= p.min_stock 
AND p.active = 1;

-- Vista: Productos próximos a vencer
CREATE VIEW view_expiring_products AS
SELECT 
    p.id,
    p.code,
    p.name,
    p.expiration_date,
    julianday(p.expiration_date) - julianday('now') as days_until_expiry,
    p.stock,
    c.name as category
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
WHERE p.expiration_date IS NOT NULL
AND julianday(p.expiration_date) - julianday('now') <= 60
AND p.active = 1
ORDER BY p.expiration_date ASC;

-- Vista: Top productos más vendidos
CREATE VIEW view_top_selling_products AS
SELECT 
    p.id,
    p.code,
    p.name,
    COUNT(sd.id) as times_sold,
    SUM(sd.quantity) as total_quantity,
    SUM(sd.subtotal) as total_revenue,
    c.name as category
FROM products p
JOIN sale_details sd ON sd.product_id = p.id
JOIN categories c ON p.category_id = c.id
JOIN sales s ON sd.sale_id = s.id
WHERE s.status = 'EMITIDA'
GROUP BY p.id
ORDER BY total_revenue DESC;

-- ============================================
-- VISTAS DE VENTAS
-- ============================================

-- Vista: Ventas del día
CREATE VIEW view_daily_sales AS
SELECT 
    s.id,
    s.sequential,
    c.name as client_name,
    u.name as user_name,
    s.total,
    s.payment_method,
    s.status,
    s.sri_status,
    s.created_at
FROM sales s
JOIN clients c ON s.client_id = c.id
JOIN users u ON s.user_id = u.id
WHERE DATE(s.created_at) = DATE('now', '-5 hours')
ORDER BY s.created_at DESC;

-- Vista: Resumen de ventas por período
CREATE VIEW view_sales_summary AS
SELECT 
    DATE(created_at) as sale_date,
    COUNT(*) as total_sales,
    SUM(total) as total_amount,
    AVG(total) as average_sale,
    SUM(CASE WHEN payment_method = 'EFECTIVO' THEN total ELSE 0 END) as cash_sales,
    SUM(CASE WHEN payment_method = 'TARJETA' THEN total ELSE 0 END) as card_sales,
    SUM(CASE WHEN payment_method = 'TRANSFERENCIA' THEN total ELSE 0 END) as transfer_sales
FROM sales
WHERE status = 'EMITIDA'
GROUP BY DATE(created_at)
ORDER BY sale_date DESC;

-- ============================================
-- VISTAS DE CLÍNICA
-- ============================================

-- Vista: Citas del día
CREATE VIEW view_today_appointments AS
SELECT 
    a.id,
    p.name as pet_name,
    sp.name as species,
    c.name as client_name,
    c.phone as client_phone,
    u.name as veterinarian,
    a.date,
    a.duration_minutes,
    a.reason,
    a.status
FROM appointments a
JOIN pets p ON a.pet_id = p.id
JOIN species sp ON p.species_id = sp.id
JOIN clients c ON p.client_id = c.id
JOIN users u ON a.user_id = u.id
WHERE DATE(a.date) = DATE('now', '-5 hours')
ORDER BY a.date ASC;

-- Vista: Historial clínico completo de mascotas
CREATE VIEW view_pet_medical_history AS
SELECT 
    p.id as pet_id,
    p.name as pet_name,
    c.name as client_name,
    'CONSULTA' as record_type,
    con.created_at as date,
    con.diagnosis as details,
    u.name as attended_by
FROM pets p
JOIN clients c ON p.client_id = c.id
JOIN consultations con ON con.pet_id = p.id
JOIN users u ON con.user_id = u.id
UNION ALL
SELECT 
    p.id,
    p.name,
    c.name,
    'VACUNA',
    v.date_given,
    v.vaccine_name || ' - Próxima: ' || COALESCE(v.next_due, 'N/A'),
    COALESCE(u.name, 'N/A')
FROM pets p
JOIN clients c ON p.client_id = c.id
JOIN vaccinations v ON v.pet_id = p.id
LEFT JOIN users u ON v.applied_by = u.id
ORDER BY date DESC;

-- ============================================
-- VISTAS DE FINANZAS
-- ============================================

-- Vista: Cuentas por cobrar pendientes
CREATE VIEW view_pending_receivables AS
SELECT 
    ar.id,
    c.name as client_name,
    c.phone as client_phone,
    ar.amount,
    ar.amount_paid,
    ar.balance,
    ar.due_date,
    CASE 
        WHEN julianday('now') > julianday(ar.due_date) THEN 'VENCIDO'
        WHEN julianday(ar.due_date) - julianday('now') <= 7 THEN 'POR_VENCER'
        ELSE 'VIGENTE'
    END as urgency,
    ar.created_at
FROM accounts_receivable ar
JOIN clients c ON ar.client_id = c.id
WHERE ar.status IN ('PENDIENTE', 'PAGADO_PARCIAL')
ORDER BY ar.due_date ASC;

-- Vista: Cuentas por pagar pendientes
CREATE VIEW view_pending_payables AS
SELECT 
    ap.id,
    s.name as supplier_name,
    s.phone as supplier_phone,
    ap.amount,
    ap.amount_paid,
    ap.balance,
    ap.due_date,
    CASE 
        WHEN julianday('now') > julianday(ap.due_date) THEN 'VENCIDO'
        WHEN julianday(ap.due_date) - julianday('now') <= 7 THEN 'POR_VENCER'
        ELSE 'VIGENTE'
    END as urgency,
    ap.created_at
FROM accounts_payable ap
JOIN suppliers s ON ap.supplier_id = s.id
WHERE ap.status IN ('PENDIENTE', 'PAGADO_PARCIAL')
ORDER BY ap.due_date ASC;

-- Vista: Flujo de caja
CREATE VIEW view_cash_flow AS
SELECT 
    DATE(created_at) as date,
    type,
    category,
    SUM(amount) as total_amount,
    COUNT(*) as transaction_count
FROM cash_movements
GROUP BY DATE(created_at), type, category
ORDER BY date DESC, type;

-- ============================================
-- VISTAS DE SESIONES Y SEGURIDAD
-- ============================================

-- Vista: Sesiones activas por usuario
CREATE VIEW view_active_sessions AS
SELECT 
    u.id as user_id,
    u.name as user_name,
    u.email,
    r.name as role,
    s.id as session_id,
    s.ip_address,
    s.device_info,
    s.created_at as login_time,
    s.last_activity,
    CAST((julianday('now', '-5 hours') - julianday(s.last_activity)) * 24 * 60 AS INTEGER) as minutes_inactive,
    s.expires_at
FROM user_sessions s
JOIN users u ON s.user_id = u.id
JOIN roles r ON u.role_id = r.id
WHERE s.is_active = 1
AND s.expires_at > datetime('now', '-5 hours')
ORDER BY s.last_activity DESC;

-- Vista: Historial de login por usuario
CREATE VIEW view_login_history AS
SELECT 
    u.id as user_id,
    u.name as user_name,
    u.email,
    la.ip_address,
    la.success,
    la.failure_reason,
    la.created_at
FROM login_attempts la
LEFT JOIN users u ON la.email = u.email
ORDER BY la.created_at DESC;

-- Vista: Dispositivos por usuario
CREATE VIEW view_user_devices AS
SELECT 
    u.id as user_id,
    u.name as user_name,
    td.device_name,
    td.device_fingerprint,
    td.ip_address,
    td.last_used,
    td.is_active,
    td.created_at as first_seen
FROM trusted_devices td
JOIN users u ON td.user_id = u.id
ORDER BY td.last_used DESC;

-- ============================================
-- VISTA ÚTIL: Devoluciones con Detalles
-- ============================================

CREATE VIEW view_purchase_returns AS
SELECT 
    pr.id,
    pr.purchase_id,
    pr.action_type,
    pr.total_amount,
    pr.reason,
    pr.expected_replacement_date,
    pr.received_date,
    pr.status,
    pr.created_at,
    
    -- Datos de la compra original
    p.supplier_id,
    s.name as supplier_name,
    s.phone as supplier_phone,
    s.email as supplier_email,
    
    -- Usuario que registró
    u.name as created_by,
    
    -- Resumen
    COUNT(prd.id) as total_items,
    SUM(prd.quantity) as total_quantity,
    
    -- Días transcurridos
    CAST(julianday('now', '-5 hours') - julianday(pr.created_at) AS INTEGER) as days_since_return,
    
    -- Para reposiciones pendientes
    CASE 
        WHEN pr.action_type = 'REPLACEMENT' AND pr.status = 'PENDING' THEN
            CAST(julianday(pr.expected_replacement_date) - julianday('now', '-5 hours') AS INTEGER)
        ELSE NULL
    END as days_until_replacement

FROM purchase_returns pr
JOIN purchases p ON pr.purchase_id = p.id
JOIN suppliers s ON p.supplier_id = s.id
JOIN users u ON pr.user_id = u.id
LEFT JOIN purchase_return_details prd ON pr.id = prd.return_id
GROUP BY pr.id;