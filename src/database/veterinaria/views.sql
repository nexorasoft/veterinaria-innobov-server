-- ============================================
-- VISTAS ÚTILES PARA REPORTES
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
-- DATOS DE PRUEBA (OPCIONALES)
-- ============================================

-- Categorías comunes
INSERT INTO categories (id, name, description) VALUES
    ('cat001', 'Medicamentos', 'Medicamentos veterinarios'),
    ('cat002', 'Alimentos', 'Alimentos para mascotas'),
    ('cat003', 'Accesorios', 'Collares, correas, juguetes'),
    ('cat004', 'Higiene', 'Productos de limpieza y aseo'),
    ('cat005', 'Suplementos', 'Vitaminas y suplementos');

-- Síntomas comunes
INSERT INTO symptoms (id, name, severity) VALUES
    ('sym001', 'Fiebre', 'MODERADO'),
    ('sym002', 'Vómito', 'MODERADO'),
    ('sym003', 'Diarrea', 'MODERADO'),
    ('sym004', 'Pérdida de apetito', 'LEVE'),
    ('sym005', 'Letargo', 'MODERADO'),
    ('sym006', 'Tos', 'LEVE'),
    ('sym007', 'Estornudos', 'LEVE'),
    ('sym008', 'Picazón', 'LEVE'),
    ('sym009', 'Cojera', 'MODERADO'),
    ('sym010', 'Convulsiones', 'GRAVE');

-- ============================================
-- FUNCIONES ÚTILES (COMENTADAS PARA REFERENCIA)
-- ============================================

/*
-- Función para calcular edad de mascota en años
CREATE VIEW view_pet_age AS
SELECT 
    id,
    name,
    birth_date,
    CAST((julianday('now') - julianday(birth_date)) / 365.25 AS INTEGER) as age_years,
    CAST(((julianday('now') - julianday(birth_date)) / 365.25 - 
          CAST((julianday('now') - julianday(birth_date)) / 365.25 AS INTEGER)) * 12 AS INTEGER) as age_months
FROM pets
WHERE birth_date IS NOT NULL;

-- Procedimiento para cerrar caja diaria
-- (Implementar en la aplicación)
SELECT 
    SUM(CASE WHEN type = 'INGRESO' THEN amount ELSE 0 END) as total_ingresos,
    SUM(CASE WHEN type = 'EGRESO' THEN amount ELSE 0 END) as total_egresos,
    SUM(CASE WHEN type = 'INGRESO' THEN amount ELSE -amount END) as balance_final
FROM cash_movements
WHERE DATE(created_at) = DATE('now', '-5 hours');
*/