-- ============================================
-- SISTEMA VETERINARIO - ÍNDICES
-- Índices para optimización de consultas
-- ============================================

-- ============================================
-- CLIENTES Y MASCOTAS
-- ============================================
CREATE INDEX idx_clients_dni ON clients(dni);
CREATE INDEX idx_clients_name ON clients(name);
CREATE INDEX idx_clients_active ON clients(active);
CREATE INDEX idx_pets_client ON pets(client_id);
CREATE INDEX idx_pets_species ON pets(species_id);
CREATE INDEX idx_pets_active ON pets(active);
CREATE INDEX idx_pet_weight_pet ON pet_weight_history(pet_id);

-- ============================================
-- PRODUCTOS
-- ============================================
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_supplier ON products(supplier_id);
CREATE INDEX idx_products_code ON products(code);
CREATE INDEX idx_products_stock ON products(stock);
CREATE INDEX idx_products_active ON products(active);
CREATE INDEX idx_products_medicine ON products(is_medicine);
CREATE INDEX idx_products_expiration ON products(expiration_date);

-- ============================================
-- VENTAS
-- ============================================
CREATE INDEX idx_sales_client ON sales(client_id);
CREATE INDEX idx_sales_user ON sales(user_id);
CREATE INDEX idx_sales_date ON sales(created_at);
CREATE INDEX idx_sales_status ON sales(status);
CREATE INDEX idx_sales_sri_status ON sales(sri_status);
CREATE INDEX idx_sale_details_sale ON sale_details(sale_id);
CREATE INDEX idx_sale_details_product ON sale_details(product_id);
CREATE INDEX idx_sale_details_service ON sale_details(service_id);

-- ============================================
-- COMPRAS
-- ============================================
CREATE INDEX idx_purchases_supplier ON purchases(supplier_id);
CREATE INDEX idx_purchases_date ON purchases(created_at);
CREATE INDEX idx_purchases_status ON purchases(status);
CREATE INDEX idx_purchase_details_purchase ON purchase_details(purchase_id);
CREATE INDEX idx_purchase_details_product ON purchase_details(product_id);

-- ============================================
-- CITAS Y CONSULTAS
-- ============================================
CREATE INDEX idx_appointments_pet ON appointments(pet_id);
CREATE INDEX idx_appointments_user ON appointments(user_id);
CREATE INDEX idx_appointments_date ON appointments(date);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_consultations_pet ON consultations(pet_id);
CREATE INDEX idx_consultations_user ON consultations(user_id);
CREATE INDEX idx_consultations_date ON consultations(created_at);
CREATE INDEX idx_consultation_medicines_consultation ON consultation_medicines(consultation_id);
CREATE INDEX idx_consultation_medicines_product ON consultation_medicines(product_id);
CREATE INDEX idx_vaccinations_pet ON vaccinations(pet_id);
CREATE INDEX idx_vaccinations_date ON vaccinations(date_given);

-- ============================================
-- FINANZAS
-- ============================================
CREATE INDEX idx_accounts_receivable_client ON accounts_receivable(client_id);
CREATE INDEX idx_accounts_receivable_status ON accounts_receivable(status);
CREATE INDEX idx_accounts_payable_supplier ON accounts_payable(supplier_id);
CREATE INDEX idx_accounts_payable_status ON accounts_payable(status);
CREATE INDEX idx_cash_movements_user ON cash_movements(user_id);
CREATE INDEX idx_cash_movements_date ON cash_movements(created_at);
CREATE INDEX idx_cash_movements_type ON cash_movements(type);

-- ============================================
-- NOTIFICACIONES Y AUDITORÍA
-- ============================================
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_seen ON notifications(seen);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_module ON audit_logs(module);
CREATE INDEX idx_audit_logs_date ON audit_logs(created_at);

-- ============================================
-- SESIONES Y AUTENTICACIÓN
-- ============================================
CREATE INDEX idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token ON user_sessions(token);
CREATE INDEX idx_user_sessions_active ON user_sessions(is_active);
CREATE INDEX idx_user_sessions_expires ON user_sessions(expires_at);
CREATE INDEX idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX idx_password_reset_tokens_user ON password_reset_tokens(user_id);
CREATE INDEX idx_login_attempts_email ON login_attempts(email);
CREATE INDEX idx_login_attempts_ip ON login_attempts(ip_address);
CREATE INDEX idx_login_attempts_date ON login_attempts(created_at);
CREATE INDEX idx_trusted_devices_user ON trusted_devices(user_id);
CREATE INDEX idx_two_factor_codes_user ON two_factor_codes(user_id);