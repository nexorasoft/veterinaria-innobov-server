-- ============================================
-- SISTEMA VETERINARIO - TABLAS
-- Creación de todas las tablas del sistema
-- ============================================

PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;

-- ============================================
-- LIMPIEZA DE TABLAS EXISTENTES
-- ============================================
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS cash_movements;
DROP TABLE IF EXISTS accounts_payable;
DROP TABLE IF EXISTS accounts_receivable;
DROP TABLE IF EXISTS vaccinations;
DROP TABLE IF EXISTS consultation_medicines;
DROP TABLE IF EXISTS consultations;
DROP TABLE IF EXISTS appointments;
DROP TABLE IF EXISTS sale_details;
DROP TABLE IF EXISTS sales;
DROP TABLE IF EXISTS purchase_details;
DROP TABLE IF EXISTS purchases;
DROP TABLE IF EXISTS medicine_symptom;
DROP TABLE IF EXISTS symptoms;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS services;
DROP TABLE IF EXISTS suppliers;
DROP TABLE IF EXISTS pet_weight_history;
DROP TABLE IF EXISTS pets;
DROP TABLE IF EXISTS clients;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS roles;
DROP TABLE IF EXISTS species;
DROP TABLE IF EXISTS system_settings;
DROP TABLE IF EXISTS user_sessions;
DROP TABLE IF EXISTS password_reset_tokens;
DROP TABLE IF EXISTS email_verification_tokens;
DROP TABLE IF EXISTS login_attempts;
DROP TABLE IF EXISTS trusted_devices;
DROP TABLE IF EXISTS two_factor_codes;

-- ============================================
-- CONFIGURACIÓN DEL SISTEMA
-- ============================================
CREATE TABLE system_settings (
    id TEXT PRIMARY KEY DEFAULT 'main',
    ruc TEXT,
    business_name TEXT NOT NULL,
    trade_name TEXT NOT NULL,
    address TEXT,
    headquarters_address TEXT,
    establishment_address TEXT,
    phone TEXT,
    email TEXT,
    establishment_code TEXT NOT NULL DEFAULT '001',
    emission_point TEXT NOT NULL DEFAULT '001',
    environment_type INTEGER NOT NULL DEFAULT 1,
    emission_type INTEGER NOT NULL DEFAULT 1,
    accounting_obligation INTEGER DEFAULT 0,
    special_taxpayer TEXT,
    notification_email TEXT,
    certificate TEXT,
    certificate_password TEXT,
    logo_url TEXT,
    logo_public_id TEXT,
    code_tax TEXT DEFAULT '4',
    tax_percentage REAL DEFAULT 15.0,
    currency TEXT DEFAULT 'USD',
    created_at DATETIME DEFAULT (datetime('now', '-5 hours')),
    updated_at DATETIME DEFAULT (datetime('now', '-5 hours')),
    UNIQUE(ruc, establishment_code) 
);

INSERT INTO system_settings (id) VALUES ('main');

-- ============================================
-- USUARIOS Y ROLES
-- ============================================
CREATE TABLE roles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    permissions TEXT,
    active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT (datetime('now', '-5 hours'))
);

CREATE TABLE users (
    id TEXT PRIMARY KEY,
    role_id TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    phone TEXT,
    password TEXT NOT NULL,
    profile_image TEXT,
    status BOOLEAN DEFAULT 1,
    last_login DATETIME,
    failed_login_attempts INTEGER DEFAULT 0,
    account_locked_until DATETIME,
    password_changed_at DATETIME,
    must_change_password BOOLEAN DEFAULT 0,
    two_factor_enabled BOOLEAN DEFAULT 0,
    two_factor_secret TEXT,
    created_at DATETIME DEFAULT (datetime('now', '-5 hours')),
    updated_at DATETIME DEFAULT (datetime('now', '-5 hours')),
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT
);

INSERT INTO roles (id, name, description) VALUES 
    ('admin', 'Administrador', 'Acceso completo al sistema'),
    ('vet', 'Veterinario', 'Gestión clínica y consultas'),
    ('cashier', 'Cajero', 'Ventas y facturación'),
    ('assistant', 'Asistente', 'Apoyo administrativo');

-- ============================================
-- CONTROL DE SESIONES Y AUTENTICACIÓN
-- ============================================
CREATE TABLE user_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    device_info TEXT,
    ip_address TEXT,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT 1,
    last_activity DATETIME DEFAULT (datetime('now', '-5 hours')),
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT (datetime('now', '-5 hours')),
    closed_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE password_reset_tokens (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    used BOOLEAN DEFAULT 0,
    used_at DATETIME,
    ip_address TEXT,
    created_at DATETIME DEFAULT (datetime('now', '-5 hours')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE email_verification_tokens (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    verified BOOLEAN DEFAULT 0,
    verified_at DATETIME,
    created_at DATETIME DEFAULT (datetime('now', '-5 hours')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE login_attempts (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    ip_address TEXT NOT NULL,
    user_agent TEXT,
    success BOOLEAN NOT NULL,
    failure_reason TEXT,
    created_at DATETIME DEFAULT (datetime('now', '-5 hours'))
);

CREATE TABLE trusted_devices (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    device_fingerprint TEXT NOT NULL,
    device_name TEXT,
    ip_address TEXT,
    user_agent TEXT,
    last_used DATETIME DEFAULT (datetime('now', '-5 hours')),
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT (datetime('now', '-5 hours')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, device_fingerprint)
);

CREATE TABLE two_factor_codes (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    code TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    used BOOLEAN DEFAULT 0,
    used_at DATETIME,
    created_at DATETIME DEFAULT (datetime('now', '-5 hours')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================
-- ESPECIES
-- ============================================
CREATE TABLE species (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    typical_lifespan_years INTEGER,
    common_diseases TEXT,
    created_at DATETIME DEFAULT (datetime('now', '-5 hours'))
);

-- ============================================
-- CLIENTES Y MASCOTAS
-- ============================================
CREATE TABLE identification_types(
  id TEXT PRIMARY KEY, 
  code TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL
);

CREATE TABLE clients (
    id TEXT PRIMARY KEY,
    identification_type TEXT NOT NULL,
    identification TEXT UNIQUE,
    name TEXT NOT NULL,
    phone TEXT UNIQUE,
    email TEXT,
    address TEXT,
    emergency_contact TEXT,
    emergency_phone TEXT,
    notes TEXT,
    active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT (datetime('now', '-5 hours')),
    updated_at DATETIME DEFAULT (datetime('now', '-5 hours')),
    FOREIGN KEY (identification_type) REFERENCES identification_types(id) ON DELETE RESTRICT
);

CREATE TABLE pets (
    id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL,
    name TEXT NOT NULL,
    species_id TEXT NOT NULL,
    breed TEXT,
    sex TEXT CHECK(sex IN ('Macho', 'Hembra')),
    birth_date DATE,
    color TEXT,
    weight REAL,
    microchip TEXT UNIQUE,
    sterilized BOOLEAN DEFAULT 0,
    allergies TEXT,
    special_conditions TEXT,
    photo_url TEXT,
    photo_public_id TEXT,
    active BOOLEAN DEFAULT 1,
    deceased BOOLEAN DEFAULT 0,
    deceased_date DATE,
    created_at DATETIME DEFAULT (datetime('now', '-5 hours')),
    updated_at DATETIME DEFAULT (datetime('now', '-5 hours')),
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE RESTRICT,
    FOREIGN KEY (species_id) REFERENCES species(id) ON DELETE RESTRICT
);

CREATE TABLE pet_weight_history (
    id TEXT PRIMARY KEY,
    pet_id TEXT NOT NULL,
    weight REAL NOT NULL,
    recorded_at DATETIME DEFAULT (datetime('now', '-5 hours')),
    recorded_by TEXT,
    notes TEXT,
    FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE,
    FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================
-- PROVEEDORES
-- ============================================
CREATE TABLE suppliers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    ruc TEXT UNIQUE,
    phone TEXT,
    email TEXT,
    address TEXT,
    contact_person TEXT,
    payment_terms TEXT,
    active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT (datetime('now', '-5 hours')),
    updated_at DATETIME DEFAULT (datetime('now', '-5 hours'))
);

-- ============================================
-- CATEGORÍAS Y PRODUCTOS
-- ============================================
CREATE TABLE categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    parent_category_id TEXT,
    active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT (datetime('now', '-5 hours')),
    FOREIGN KEY (parent_category_id) REFERENCES categories(id) ON DELETE SET NULL
);

CREATE TABLE products (
    id TEXT PRIMARY KEY,
    category_id TEXT NOT NULL,
    supplier_id TEXT,
    code TEXT UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    purchase_price REAL NOT NULL DEFAULT 0,
    sale_price REAL NOT NULL,
    wholesale_price REAL,
    stock INTEGER DEFAULT 0,
    min_stock INTEGER DEFAULT 1,
    max_stock INTEGER,
    unit TEXT DEFAULT 'UND',
    is_medicine BOOLEAN DEFAULT 0,
    requires_prescription BOOLEAN DEFAULT 0,
    active_ingredient TEXT,
    concentration TEXT,
    expiration_date DATE,
    batch_number TEXT,
    active BOOLEAN DEFAULT 1,
    taxable BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT (datetime('now', '-5 hours')),
    updated_at DATETIME DEFAULT (datetime('now', '-5 hours')),
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL
);

INSERT INTO categories (id, name, description) VALUES
    ('cat001', 'Medicamentos', 'Medicamentos veterinarios'),
    ('cat002', 'Alimentos', 'Alimentos para mascotas'),
    ('cat003', 'Accesorios', 'Collares, correas, juguetes'),
    ('cat004', 'Higiene', 'Productos de limpieza y aseo'),
    ('cat005', 'Suplementos', 'Vitaminas y suplementos');

-- ============================================
-- SERVICIOS VETERINARIOS
-- ============================================
CREATE TABLE services (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    duration_minutes INTEGER DEFAULT 30,
    category TEXT CHECK(category IN ('CONSULTA', 'CIRUGIA', 'ESTETICA', 'DIAGNOSTICO', 'HOSPITALIZACION', 'OTRO')),
    requires_appointment BOOLEAN DEFAULT 1,
    active BOOLEAN DEFAULT 1,
    taxable BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT (datetime('now', '-5 hours')),
    updated_at DATETIME DEFAULT (datetime('now', '-5 hours'))
);

INSERT INTO services (id, code, name, price, category, duration_minutes) VALUES
    ('srv001', 'CONS-GEN', 'Consulta General', 15.00, 'CONSULTA', 30),
    ('srv002', 'CONS-ESP', 'Consulta Especializada', 25.00, 'CONSULTA', 45),
    ('srv003', 'VAC-STD', 'Vacunación', 10.00, 'CONSULTA', 15),
    ('srv004', 'CIR-CAST', 'Castración', 80.00, 'CIRUGIA', 120),
    ('srv005', 'BANO-STD', 'Baño y Peluquería', 20.00, 'ESTETICA', 60),
    ('srv006', 'RX-STD', 'Radiografía', 30.00, 'DIAGNOSTICO', 20);

-- ============================================
-- BÚSQUEDA INTELIGENTE (SÍNTOMAS ↔ MEDICINAS)
-- ============================================
CREATE TABLE symptoms (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    severity TEXT CHECK(severity IN ('LEVE', 'MODERADO', 'GRAVE')),
    created_at DATETIME DEFAULT (datetime('now', '-5 hours'))
);

CREATE TABLE medicine_symptom (
    medicine_id TEXT NOT NULL,
    symptom_id TEXT NOT NULL,
    effectiveness TEXT CHECK(effectiveness IN ('ALTA', 'MEDIA', 'BAJA')) DEFAULT 'MEDIA',
    notes TEXT,
    PRIMARY KEY (medicine_id, symptom_id),
    FOREIGN KEY (medicine_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (symptom_id) REFERENCES symptoms(id) ON DELETE CASCADE
);

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
-- COMPRAS E INVENTARIO
-- ============================================
CREATE TABLE purchases (
    id TEXT PRIMARY KEY,
    supplier_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    subtotal REAL NOT NULL DEFAULT 0,
    tax REAL DEFAULT 0,
    discount REAL DEFAULT 0,
    total REAL NOT NULL,
    payment_method TEXT CHECK(payment_method IN ('EFECTIVO', 'TRANSFERENCIA', 'CREDITO', 'CHEQUE')) DEFAULT 'EFECTIVO',
    status TEXT CHECK(status IN ('BORRADOR', 'PAGADA', 'PENDIENTE', 'ANULADA')) DEFAULT 'PENDIENTE',
    invoice_number TEXT,
    due_date DATE,
    notes TEXT,
    created_at DATETIME DEFAULT (datetime('now', '-5 hours')),
    updated_at DATETIME DEFAULT (datetime('now', '-5 hours')),
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE RESTRICT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE TABLE purchase_details (
    id TEXT PRIMARY KEY,
    purchase_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK(quantity > 0),
    price REAL NOT NULL,
    discount REAL DEFAULT 0,
    subtotal REAL NOT NULL,
    expiration_date DATE,
    batch_number TEXT,
    FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
);

-- ============================================
-- VENTAS / FACTURACIÓN ELECTRÓNICA SRI
-- ============================================
CREATE TABLE sales (
    id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    subtotal REAL NOT NULL DEFAULT 0,
    tax REAL DEFAULT 0,
    discount REAL DEFAULT 0,
    total REAL NOT NULL,
    payment_method TEXT CHECK(payment_method IN ('EFECTIVO', 'TRANSFERENCIA', 'TARJETA', 'CREDITO', 'OTRO')) DEFAULT 'EFECTIVO',
    status TEXT CHECK(status IN ('BORRADOR', 'EMITIDA', 'ANULADA')) DEFAULT 'EMITIDA',
    document_type TEXT CHECK(document_type IN ('01', '04', '05', '07')) DEFAULT '01',
    establishment TEXT,
    emission_point TEXT,
    sequential TEXT,
    access_key TEXT UNIQUE,
    authorization_number TEXT,
    authorization_date DATETIME,
    sri_status TEXT CHECK(sri_status IN ('PENDIENTE', 'AUTORIZADO', 'RECHAZADO', 'NO_AUTORIZADO')) DEFAULT 'PENDIENTE',
    sri_response TEXT,
    xml_signed TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT (datetime('now', '-5 hours')),
    updated_at DATETIME DEFAULT (datetime('now', '-5 hours')),
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE RESTRICT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE TABLE sale_details (
    id TEXT PRIMARY KEY,
    sale_id TEXT NOT NULL,
    item_type TEXT CHECK(item_type IN ('PRODUCTO', 'SERVICIO')) DEFAULT 'PRODUCTO',
    product_id TEXT,
    service_id TEXT,
    description TEXT,
    quantity INTEGER NOT NULL CHECK(quantity > 0),
    price REAL NOT NULL,
    discount REAL DEFAULT 0,
    subtotal REAL NOT NULL,
    FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
    FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE RESTRICT,
    CHECK ((item_type = 'PRODUCTO' AND product_id IS NOT NULL AND service_id IS NULL) 
        OR (item_type = 'SERVICIO' AND service_id IS NOT NULL AND product_id IS NULL))
);

-- ============================================
-- CLÍNICA (CITAS Y CONSULTAS)
-- ============================================
CREATE TABLE appointments (
    id TEXT PRIMARY KEY,
    pet_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    service_id TEXT,
    date DATETIME NOT NULL,
    duration_minutes INTEGER DEFAULT 30,
    reason TEXT,
    status TEXT CHECK(status IN ('PENDIENTE', 'CONFIRMADA', 'EN_CURSO', 'COMPLETADA', 'CANCELADA', 'NO_ASISTIO')) DEFAULT 'PENDIENTE',
    reminder_sent BOOLEAN DEFAULT 0,
    reminder_sent_at DATETIME,
    notes TEXT,
    cancellation_reason TEXT,
    created_at DATETIME DEFAULT (datetime('now', '-5 hours')),
    updated_at DATETIME DEFAULT (datetime('now', '-5 hours')),
    FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE RESTRICT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL
);

CREATE TABLE consultations (
    id TEXT PRIMARY KEY,
    pet_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    appointment_id TEXT,
    weight REAL,
    temperature REAL,
    heart_rate INTEGER,
    respiratory_rate INTEGER,
    symptoms TEXT,
    diagnosis TEXT,
    treatment TEXT,
    observations TEXT,
    next_visit DATE,
    next_visit_reason TEXT,
    status TEXT CHECK(status IN ('EN_CURSO', 'FINALIZADA', 'ANULADA')) DEFAULT 'EN_CURSO';
    created_at DATETIME DEFAULT (datetime('now', '-5 hours')),
    updated_at DATETIME DEFAULT (datetime('now', '-5 hours')),
    FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE RESTRICT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL
);

CREATE TABLE consultation_medicines (
    id TEXT PRIMARY KEY,
    consultation_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    dosage TEXT NOT NULL,
    duration TEXT,
    frequency TEXT,
    quantity_prescribed REAL,
    administration_route TEXT,
    instructions TEXT,
    FOREIGN KEY (consultation_id) REFERENCES consultations(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
);

CREATE TABLE vaccinations (
    id TEXT PRIMARY KEY,
    pet_id TEXT NOT NULL,
    consultation_id TEXT,
    vaccine_name TEXT NOT NULL,
    batch_number TEXT,
    manufacturer TEXT,
    date_given DATE NOT NULL,
    next_due DATE,
    applied_by TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT (datetime('now', '-5 hours')),
    FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE RESTRICT,
    FOREIGN KEY (consultation_id) REFERENCES consultations(id) ON DELETE SET NULL,
    FOREIGN KEY (applied_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================
-- FINANZAS
-- ============================================
CREATE TABLE accounts_receivable (
    id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL,
    sale_id TEXT,
    amount REAL NOT NULL,
    amount_paid REAL DEFAULT 0,
    balance REAL NOT NULL,
    due_date DATE,
    status TEXT CHECK(status IN ('PENDIENTE', 'PAGADO_PARCIAL', 'PAGADO', 'VENCIDO')) DEFAULT 'PENDIENTE',
    notes TEXT,
    created_at DATETIME DEFAULT (datetime('now', '-5 hours')),
    updated_at DATETIME DEFAULT (datetime('now', '-5 hours')),
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE RESTRICT,
    FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE SET NULL
);

CREATE TABLE accounts_payable (
    id TEXT PRIMARY KEY,
    supplier_id TEXT NOT NULL,
    purchase_id TEXT,
    amount REAL NOT NULL,
    amount_paid REAL DEFAULT 0,
    balance REAL NOT NULL,
    due_date DATE,
    status TEXT CHECK(status IN ('PENDIENTE', 'PAGADO_PARCIAL', 'PAGADO', 'VENCIDO')) DEFAULT 'PENDIENTE',
    notes TEXT,
    created_at DATETIME DEFAULT (datetime('now', '-5 hours')),
    updated_at DATETIME DEFAULT (datetime('now', '-5 hours')),
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE RESTRICT,
    FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE SET NULL
);

CREATE TABLE cash_movements (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    cash_shift_id TEXT,
    type TEXT CHECK(type IN ('INGRESO', 'EGRESO')) NOT NULL,
    category TEXT CHECK(category IN ('VENTA', 'COMPRA', 'PAGO_SERVICIO', 'PAGO_SALARIO', 'GASTO_OPERATIVO', 'COBRO_DEUDA','OTRO')),
    concept TEXT NOT NULL,
    amount REAL NOT NULL,
    sale_id TEXT,
    purchase_id TEXT,
    reference_number TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT (datetime('now', '-5 hours')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE SET NULL,
    FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE SET NULL,
    FOREIGN KEY (cash_shift_id) REFERENCES cash_shifts(id) ON DELETE SET NULL
);

-- ============================================
-- NOTIFICACIONES Y AUDITORÍA
-- ============================================
CREATE TABLE notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT CHECK(type IN ('SISTEMA', 'CITA', 'VACUNA', 'PAGO', 'STOCK', 'RECORDATORIO')),
    priority TEXT CHECK(priority IN ('BAJA', 'MEDIA', 'ALTA', 'URGENTE')) DEFAULT 'MEDIA',
    related_entity_type TEXT,
    related_entity_id TEXT,
    seen BOOLEAN DEFAULT 0,
    seen_at DATETIME,
    created_at DATETIME DEFAULT (datetime('now', '-5 hours')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    action TEXT NOT NULL,
    module TEXT NOT NULL,
    entity_type TEXT,
    entity_id TEXT,
    old_values TEXT,
    new_values TEXT,
    ip_address TEXT,
    user_agent TEXT,
    details TEXT,
    created_at DATETIME DEFAULT (datetime('now', '-5 hours')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS modules (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    icon TEXT,
    path TEXT,
    category TEXT,
    order_index INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT 1
);

CREATE TABLE IF NOT EXISTS permissions (
    id TEXT PRIMARY KEY,
    role_id TEXT NOT NULL,
    module_id TEXT NOT NULL,
    can_view BOOLEAN DEFAULT 0,
    can_create BOOLEAN DEFAULT 0,
    can_edit BOOLEAN DEFAULT 0,
    can_delete BOOLEAN DEFAULT 0,
    FOREIGN KEY (role_id) REFERENCES roles(id),
    FOREIGN KEY (module_id) REFERENCES modules(id)
);

-- ============================================
-- TABLAS PARA GESTIÓN DE DEVOLUCIONES
-- ============================================

-- Tabla principal de devoluciones
CREATE TABLE IF NOT EXISTS purchase_returns (
    id TEXT PRIMARY KEY,
    purchase_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    
    -- Tipo de acción
    action_type TEXT CHECK(action_type IN ('REPLACEMENT', 'REFUND')) NOT NULL,
    
    -- Montos
    total_amount REAL NOT NULL,
    
    -- Detalles
    reason TEXT NOT NULL,
    
    -- Fechas
    expected_replacement_date DATE,  -- Solo si action_type = REPLACEMENT
    received_date DATETIME,           -- Cuando llega la reposición
    
    -- Estado
    status TEXT CHECK(status IN ('PENDING', 'COMPLETED', 'CANCELLED')) DEFAULT 'PENDING',
    
    notes TEXT,
    created_at DATETIME DEFAULT (datetime('now', '-5 hours')),
    updated_at DATETIME DEFAULT (datetime('now', '-5 hours')),
    
    FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE RESTRICT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
);

-- Detalle de productos devueltos
CREATE TABLE IF NOT EXISTS purchase_return_details (
    id TEXT PRIMARY KEY,
    return_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    
    quantity INTEGER NOT NULL,
    price REAL NOT NULL,
    amount REAL NOT NULL,
    
    -- Tipo de defecto
    defect_type TEXT CHECK(defect_type IN ('DAMAGED', 'EXPIRED', 'WRONG_PRODUCT', 'QUALITY_ISSUE', 'OTHER')),
    
    notes TEXT,
    
    FOREIGN KEY (return_id) REFERENCES purchase_returns(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
);

-- Define las cajas físicas (Ej: Caja Principal, Caja Farmacia)
CREATE TABLE cash_registers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    status TEXT CHECK(status IN ('ABIERTA', 'CERRADA')) DEFAULT 'CERRADA',
    current_user_id TEXT, -- Quién la tiene abierta actualmente
    created_at DATETIME DEFAULT (datetime('now', '-5 hours'))
);

-- Registra cada turno/sesión de caja (Apertura y Cierre)
CREATE TABLE cash_shifts (
    id TEXT PRIMARY KEY,
    cash_register_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    
    -- Apertura
    start_time DATETIME NOT NULL,
    start_amount REAL NOT NULL, -- Base inicial de dinero
    
    -- Cierre
    end_time DATETIME,
    expected_amount REAL, -- Calculado por el sistema (Base + Ventas - Gastos)
    actual_amount REAL,   -- Lo que el usuario contó físicamente
    difference REAL,      -- (actual - expected) Sobrante o Faltante
    
    status TEXT CHECK(status IN ('ABIERTA', 'CERRADA')) DEFAULT 'ABIERTA',
    notes TEXT,
    
    FOREIGN KEY (cash_register_id) REFERENCES cash_registers(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE bank_accounts (
    id TEXT PRIMARY KEY,
    bank_name TEXT NOT NULL, -- Ej: Banco Pichincha, Produbanco
    account_number TEXT,
    account_type TEXT, -- Ahorros/Corriente
    holder_name TEXT,
    current_balance REAL DEFAULT 0, -- Saldo actual (Opcional, calculado es mejor)
    active BOOLEAN DEFAULT 1
);

INSERT INTO bank_accounts (id, bank_name, holder_name) VALUES 
('ba_001', 'Banco Pichincha', 'Veterinaria Patitas S.A.'),
('ba_002', 'Produbanco', 'Veterinaria Patitas S.A.');

ALTER TABLE sales ADD COLUMN bank_account_id TEXT REFERENCES bank_accounts(id);
ALTER TABLE purchases ADD COLUMN bank_account_id TEXT REFERENCES bank_accounts(id);


CREATE TABLE invoices (
    id TEXT PRIMARY KEY,
    issuing_company_id INTEGER NOT NULL,
    client_id INTEGER NOT NULL,
    issue_date DATETIME NOT NULL,
    access_key TEXT NOT NULL UNIQUE,
    sequential TEXT NOT NULL,
    status TEXT NOT NULL,
    total_without_taxes REAL NOT NULL,
    total_vat REAL NOT NULL,
    total_with_taxes REAL NOT NULL,
    xml TEXT,
    signed_xml TEXT,
    authorization_number TEXT,
    authorization_date DATETIME,
    xml_authorized TEXT,
    sri_status TEXT,
    sri_sent_at DATETIME,
    sri_messages TEXT,
    sri_response_at DATETIME,
    original_data TEXT,
    FOREIGN KEY (issuing_company_id) REFERENCES system_settings(id),
    FOREIGN KEY (client_id) REFERENCES clients(id)
);

CREATE TABLE invoice_details (
    id TEXT PRIMARY KEY,
    invoice_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity REAL NOT NULL,
    unit_price REAL NOT NULL,
    subtotal REAL NOT NULL,
    vat_value REAL NOT NULL,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE RESTRICT,
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (product_id) REFERENCES services(id)
);

CREATE TABLE invoice_pdfs (
    id TEXT PRIMARY KEY,
    invoice_id INTEGER NOT NULL,
    access_key TEXT NOT NULL UNIQUE,
    pdf_path TEXT NOT NULL,
    pdf_buffer BLOB,
    generated_at DATETIME DEFAULT (datetime('now', '-5 hours'))
    status TEXT CHECK(status IN ('GENERATED', 'ERROR')) DEFAULT 'GENERATED',
    file_size INTEGER NOT NULL,
    authorization_number TEXT NOT NULL,
    authorization_date DATETIME NOT NULL,
    email_status TEXT CHECK(email_status IN ('PENDING', 'SENT', 'ERROR', 'NOT_SENT')) DEFAULT 'NOT_SENT',
    email_recipient TEXT,
    email_sent_at DATETIME,
    email_attempts INTEGER NOT NULL DEFAULT 0,
    email_last_error TEXT,
    email_sent_by TEXT,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE RESTRICT
);

CREATE TABLE invoice_types (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,               
    name TEXT NOT NULL,                 
    description TEXT,
    electronic INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT (datetime('now', '-5 hours')),
    updated_at DATETIME DEFAULT (datetime('now', '-5 hours'))
);
