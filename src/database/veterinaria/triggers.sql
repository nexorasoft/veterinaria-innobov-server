-- ============================================
-- SISTEMA VETERINARIO - TRIGGERS
-- Triggers automáticos para lógica de negocio
-- ============================================

-- ============================================
-- TRIGGERS DE INVENTARIO Y STOCK
-- ============================================

-- TRIGGER 1: Actualizar stock al registrar venta
CREATE TRIGGER trg_update_stock_after_sale
AFTER INSERT ON sale_details
WHEN NEW.item_type = 'PRODUCTO'
BEGIN
    UPDATE products 
    SET stock = stock - NEW.quantity,
        updated_at = datetime('now', '-5 hours')
    WHERE id = NEW.product_id;
    
    -- Notificar si el stock está bajo
    INSERT INTO notifications (id, title, message, type, priority, related_entity_type, related_entity_id)
    SELECT 
        'notif_' || hex(randomblob(16)),
        'Stock Bajo',
        'El producto "' || p.name || '" tiene stock bajo (' || p.stock || ' unidades)',
        'STOCK',
        'ALTA',
        'product',
        p.id
    FROM products p
    WHERE p.id = NEW.product_id 
    AND p.stock <= p.min_stock
    AND p.active = 1;
END;

-- TRIGGER 2: Revertir stock al anular venta
CREATE TRIGGER trg_revert_stock_on_sale_cancel
AFTER UPDATE ON sales
WHEN NEW.status = 'ANULADA' AND OLD.status != 'ANULADA'
BEGIN
    UPDATE products
    SET stock = stock + (
        SELECT COALESCE(SUM(sd.quantity), 0)
        FROM sale_details sd
        WHERE sd.sale_id = NEW.id 
        AND sd.item_type = 'PRODUCTO'
        AND sd.product_id = products.id
    ),
    updated_at = datetime('now', '-5 hours')
    WHERE id IN (
        SELECT product_id 
        FROM sale_details 
        WHERE sale_id = NEW.id 
        AND item_type = 'PRODUCTO'
    );
END;

-- TRIGGER 3: Aumentar stock al registrar compra
CREATE TRIGGER trg_update_stock_after_purchase
AFTER INSERT ON purchase_details
BEGIN
    UPDATE products 
    SET stock = stock + NEW.quantity,
        updated_at = datetime('now', '-5 hours')
    WHERE id = NEW.product_id;
END;

-- TRIGGER 13: Notificar productos próximos a vencer
CREATE TRIGGER trg_notify_expiring_products
AFTER INSERT ON products
WHEN NEW.expiration_date IS NOT NULL 
AND julianday(NEW.expiration_date) - julianday('now') <= 30
BEGIN
    INSERT INTO notifications (id, title, message, type, priority, related_entity_type, related_entity_id)
    VALUES (
        'notif_' || hex(randomblob(16)),
        'Producto Próximo a Vencer',
        'El producto "' || NEW.name || '" vence el ' || NEW.expiration_date,
        'STOCK',
        'ALTA',
        'product',
        NEW.id
    );
END;

-- ============================================
-- TRIGGERS DE MASCOTAS
-- ============================================

-- TRIGGER 4: Registrar peso en historial al actualizar mascota
CREATE TRIGGER trg_record_pet_weight
AFTER UPDATE ON pets
WHEN NEW.weight IS NOT NULL AND NEW.weight != OLD.weight
BEGIN
    INSERT INTO pet_weight_history (id, pet_id, weight, notes)
    VALUES (
        'weight_' || hex(randomblob(16)),
        NEW.id,
        NEW.weight,
        'Actualización automática'
    );
END;

-- TRIGGER 14: Registrar peso automáticamente en consulta
CREATE TRIGGER trg_record_consultation_weight
AFTER INSERT ON consultations
WHEN NEW.weight IS NOT NULL
BEGIN
    INSERT INTO pet_weight_history (id, pet_id, weight, recorded_by, notes)
    VALUES (
        'weight_' || hex(randomblob(16)),
        NEW.pet_id,
        NEW.weight,
        NEW.user_id,
        'Registrado en consulta'
    );
    
    -- Actualizar peso actual de la mascota
    UPDATE pets
    SET weight = NEW.weight,
        updated_at = datetime('now', '-5 hours')
    WHERE id = NEW.pet_id;
END;

-- ============================================
-- TRIGGERS DE TIMESTAMPS
-- ============================================

-- TRIGGER 5: Actualizar timestamp de clientes
CREATE TRIGGER trg_update_clients_timestamp
AFTER UPDATE ON clients
BEGIN
    UPDATE clients SET updated_at = datetime('now', '-5 hours') WHERE id = NEW.id;
END;

CREATE TRIGGER trg_update_pets_timestamp
AFTER UPDATE ON pets
BEGIN
    UPDATE pets SET updated_at = datetime('now', '-5 hours') WHERE id = NEW.id;
END;

CREATE TRIGGER trg_update_products_timestamp
AFTER UPDATE ON products
BEGIN
    UPDATE products SET updated_at = datetime('now', '-5 hours') WHERE id = NEW.id;
END;

CREATE TRIGGER trg_update_users_timestamp
AFTER UPDATE ON users
BEGIN
    UPDATE users SET updated_at = datetime('now', '-5 hours') WHERE id = NEW.id;
END;

CREATE TRIGGER trg_update_sales_timestamp
AFTER UPDATE ON sales
BEGIN
    UPDATE sales SET updated_at = datetime('now', '-5 hours') WHERE id = NEW.id;
END;

CREATE TRIGGER trg_update_purchases_timestamp
AFTER UPDATE ON purchases
BEGIN
    UPDATE purchases SET updated_at = datetime('now', '-5 hours') WHERE id = NEW.id;
END;

-- ============================================
-- TRIGGERS DE CITAS Y CONSULTAS
-- ============================================

-- TRIGGER 6: Notificaciones de citas próximas
CREATE TRIGGER trg_notify_upcoming_appointment
AFTER INSERT ON appointments
WHEN NEW.status = 'PENDIENTE'
BEGIN
    INSERT INTO notifications (id, user_id, title, message, type, priority, related_entity_type, related_entity_id)
    VALUES (
        'notif_' || hex(randomblob(16)),
        NEW.user_id,
        'Nueva Cita Agendada',
        'Cita programada para ' || datetime(NEW.date),
        'CITA',
        'MEDIA',
        'appointment',
        NEW.id
    );
END;

-- TRIGGER 15: Actualizar estado de cita al crear consulta
CREATE TRIGGER trg_complete_appointment_on_consultation
AFTER INSERT ON consultations
WHEN NEW.appointment_id IS NOT NULL
BEGIN
    UPDATE appointments
    SET status = 'COMPLETADA',
        updated_at = datetime('now', '-5 hours')
    WHERE id = NEW.appointment_id;
END;

-- ============================================
-- TRIGGERS DE AUDITORÍA
-- ============================================

-- TRIGGER 7: Auditoría de ventas
CREATE TRIGGER trg_audit_sales_insert
AFTER INSERT ON sales
BEGIN
    INSERT INTO audit_logs (id, user_id, action, module, entity_type, entity_id, new_values)
    VALUES (
        'audit_' || hex(randomblob(16)),
        NEW.user_id,
        'CREATE',
        'sales',
        'sale',
        NEW.id,
        json_object('total', NEW.total, 'client_id', NEW.client_id, 'status', NEW.status)
    );
END;

-- TRIGGER 8: Auditoría de modificación de ventas
CREATE TRIGGER trg_audit_sales_update
AFTER UPDATE ON sales
BEGIN
    INSERT INTO audit_logs (id, user_id, action, module, entity_type, entity_id, old_values, new_values)
    VALUES (
        'audit_' || hex(randomblob(16)),
        NEW.user_id,
        'UPDATE',
        'sales',
        'sale',
        NEW.id,
        json_object('status', OLD.status, 'total', OLD.total),
        json_object('status', NEW.status, 'total', NEW.total)
    );
END;

-- ============================================
-- TRIGGERS DE FINANZAS
-- ============================================

-- TRIGGER 9: Crear movimiento de caja automático al confirmar venta
CREATE TRIGGER trg_create_cash_movement_on_sale
AFTER INSERT ON sales
WHEN NEW.status = 'EMITIDA' AND NEW.payment_method IN ('EFECTIVO', 'TARJETA', 'TRANSFERENCIA')
BEGIN
    INSERT INTO cash_movements (id, user_id, type, category, concept, amount, sale_id)
    VALUES (
        'cash_' || hex(randomblob(16)),
        NEW.user_id,
        'INGRESO',
        'VENTA',
        'Venta #' || NEW.id,
        NEW.total,
        NEW.id
    );
END;

-- TRIGGER 10: Crear movimiento de caja automático al confirmar compra
CREATE TRIGGER trg_create_cash_movement_on_purchase
AFTER INSERT ON purchases
WHEN NEW.status = 'PAGADA' AND NEW.payment_method IN ('EFECTIVO', 'TRANSFERENCIA')
BEGIN
    INSERT INTO cash_movements (id, user_id, type, category, concept, amount, purchase_id)
    VALUES (
        'cash_' || hex(randomblob(16)),
        NEW.user_id,
        'EGRESO',
        'COMPRA',
        'Compra #' || NEW.id || ' - ' || (SELECT name FROM suppliers WHERE id = NEW.supplier_id),
        NEW.total,
        NEW.id
    );
END;

-- TRIGGER 11: Actualizar estado de cuentas por cobrar
CREATE TRIGGER trg_update_receivable_status
AFTER UPDATE ON accounts_receivable
WHEN NEW.amount_paid >= NEW.amount
BEGIN
    UPDATE accounts_receivable
    SET status = 'PAGADO',
        balance = 0
    WHERE id = NEW.id;
END;

-- TRIGGER 12: Actualizar estado de cuentas por pagar
CREATE TRIGGER trg_update_payable_status
AFTER UPDATE ON accounts_payable
WHEN NEW.amount_paid >= NEW.amount
BEGIN
    UPDATE accounts_payable
    SET status = 'PAGADO',
        balance = 0
    WHERE id = NEW.id;
END;

-- ============================================
-- TRIGGERS DE SESIONES Y SEGURIDAD
-- ============================================

-- TRIGGER 16: Registrar intento de login exitoso
CREATE TRIGGER trg_log_successful_login
AFTER UPDATE ON users
WHEN NEW.last_login != OLD.last_login AND NEW.last_login IS NOT NULL
BEGIN
    INSERT INTO login_attempts (id, email, ip_address, success, created_at)
    VALUES (
        'login_' || hex(randomblob(16)),
        NEW.email,
        'SYSTEM',
        1,
        datetime('now', '-5 hours')
    );
    
    -- Resetear intentos fallidos
    UPDATE users
    SET failed_login_attempts = 0,
        account_locked_until = NULL
    WHERE id = NEW.id;
END;

-- TRIGGER 17: Limpiar sesiones expiradas automáticamente
CREATE TRIGGER trg_cleanup_expired_sessions
AFTER INSERT ON user_sessions
BEGIN
    UPDATE user_sessions
    SET is_active = 0,
        closed_at = datetime('now', '-5 hours')
    WHERE expires_at < datetime('now', '-5 hours')
    AND is_active = 1;
END;

-- TRIGGER 18: Registrar cierre de sesión en auditoría
CREATE TRIGGER trg_audit_session_close
AFTER UPDATE ON user_sessions
WHEN NEW.is_active = 0 AND OLD.is_active = 1
BEGIN
    INSERT INTO audit_logs (id, user_id, action, module, entity_type, entity_id, details)
    VALUES (
        'audit_' || hex(randomblob(16)),
        NEW.user_id,
        'LOGOUT',
        'auth',
        'session',
        NEW.id,
        json_object('session_duration', (julianday(NEW.closed_at) - julianday(NEW.created_at)) * 24 * 60)
    );
END;

-- TRIGGER 19: Notificar nuevo inicio de sesión desde dispositivo desconocido
CREATE TRIGGER trg_notify_new_device_login
AFTER INSERT ON user_sessions
WHEN NOT EXISTS (
    SELECT 1 FROM trusted_devices 
    WHERE user_id = NEW.user_id 
    AND device_fingerprint = NEW.device_info
)
BEGIN
    INSERT INTO notifications (id, user_id, title, message, type, priority)
    VALUES (
        'notif_' || hex(randomblob(16)),
        NEW.user_id,
        'Nuevo inicio de sesión',
        'Se detectó un inicio de sesión desde un dispositivo nuevo. IP: ' || COALESCE(NEW.ip_address, 'Desconocida'),
        'SISTEMA',
        'ALTA'
    );
END;

-- TRIGGER 20: Actualizar última actividad de sesión
CREATE TRIGGER trg_update_session_activity
AFTER INSERT ON audit_logs
WHEN NEW.user_id IS NOT NULL
BEGIN
    UPDATE user_sessions
    SET last_activity = datetime('now', '-5 hours')
    WHERE user_id = NEW.user_id
    AND is_active = 1
    AND expires_at > datetime('now', '-5 hours');
END;