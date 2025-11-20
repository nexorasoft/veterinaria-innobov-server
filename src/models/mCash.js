import { turso } from "../database/index.js";
import { logger } from "../utils/logger.js";

export const mCash = {
    async createCash(cashData) {
        try {
            const query = `
                INSERT INTO cash_registers(
                    id, name, status
                ) VALUES (?, ?, ?);
            `;

            const result = await turso.execute({
                sql: query,
                args: [
                    cashData.id,
                    cashData.name,
                    cashData.status
                ]
            })

            if (result.rowsAffected === 0) {
                logger.warn('Error creating cash register', { cashData });
                return {
                    success: false,
                    code: 500,
                    message: 'Error creating cash register',
                    data: null
                };
            }


            logger.info('Cash register created successfully', { cashId: cashData.id });
            return {
                success: true,
                code: 201,
                message: 'Cash register created successfully',
                data: { id: cashData.id }
            };
        } catch (error) {
            logger.error('Error creating cash register', { error, cashData });
            return {
                success: false,
                code: 500,
                message: 'An error occurred while creating the cash register',
                data: null
            };
        }
    },

    async registerCashShift(shiftData) {
        const tx = await turso.transaction();
        try {
            const checkRegisterSql = `
                SELECT status, current_user_id, name 
                FROM cash_registers 
                WHERE id = ?
            `;

            const checkResult = await tx.execute({
                sql: checkRegisterSql,
                args: [shiftData.cash_register_id]
            });

            if (checkResult.rows.length === 0) {
                await tx.rollback();
                return {
                    success: false,
                    code: 404,
                    message: 'Cash register not found',
                    data: null
                };
            }

            const currentRegister = checkResult.rows[0];

            if (shiftData.status === 'ABIERTA') {
                if (currentRegister.status === 'ABIERTA') {
                    await tx.rollback();
                    return {
                        success: false,
                        code: 409,
                        message: `Cannot open: Cash register '${currentRegister.name}' is already open.`,
                        data: null
                    };
                }
            }
            else if (shiftData.status === 'CERRADA') {
                if (currentRegister.status === 'CERRADA') {
                    await tx.rollback();
                    return {
                        success: false,
                        code: 409,
                        message: `Cannot close: Cash register '${currentRegister.name}' is already closed.`,
                        data: null
                    };
                }

                if (currentRegister.current_user_id !== shiftData.user_id) {
                    await tx.rollback();
                    return { success: false, code: 403, message: 'Only the user who opened the cash register can close it.', data: null };
                }
            }

            let mainOperationResult;

            // CASO 1: APERTURA DE CAJA (CREAR)
            if (shiftData.status === 'ABIERTA') {
                const insertCashShift = `
                    INSERT INTO cash_shifts(
                        id, cash_register_id, user_id, 
                        start_time, start_amount, 
                        status, notes
                    ) VALUES (?, ?, ?, ?, ?, ?, ?);
                `;

                mainOperationResult = await tx.execute({
                    sql: insertCashShift,
                    args: [
                        shiftData.id,
                        shiftData.cash_register_id,
                        shiftData.user_id,
                        shiftData.start_time,
                        shiftData.start_amount,
                        'ABIERTA',
                        shiftData.notes || null
                    ]
                });

                // CASO 2: CIERRE DE CAJA (ACTUALIZAR)
            } else if (shiftData.status === 'CERRADA') {
                const updateCashShift = `
                    UPDATE cash_shifts
                    SET 
                        end_time = ?, 
                        expected_amount = ?, 
                        actual_amount = ?, 
                        difference = ?, 
                        status = 'CERRADA', 
                        notes = COALESCE(?, notes)
                    WHERE id = ? AND cash_register_id = ?;
                `;

                mainOperationResult = await tx.execute({
                    sql: updateCashShift,
                    args: [
                        shiftData.end_time,
                        shiftData.expected_amount,
                        shiftData.actual_amount,
                        shiftData.difference,
                        shiftData.notes || null,
                        shiftData.id,
                        shiftData.cash_register_id
                    ]
                });
            } else {
                throw new Error("Invalid shift status provided. Must be 'ABIERTA' or 'CERRADA'.");
            }

            if (mainOperationResult.rowsAffected === 0) {
                logger.warn(`Operation failed for status ${shiftData.status}: No rows affected`, { shiftId: shiftData.id });
                await tx.rollback();
                return {
                    success: false,
                    code: shiftData.status === 'CERRADA' ? 404 : 500,
                    message: shiftData.status === 'CERRADA' ? 'No open shift found to close' : 'Error creating shift',
                    data: null
                };
            }

            const isClosing = shiftData.status === 'CERRADA';
            const nextRegisterStatus = isClosing ? 'CERRADA' : 'ABIERTA';
            const nextUserId = isClosing ? null : shiftData.user_id;

            const updateRegisterSql = `
                UPDATE cash_registers
                SET current_user_id = ?, status = ?
                WHERE id = ?;
            `;

            const updateResult = await tx.execute({
                sql: updateRegisterSql,
                args: [
                    nextUserId,
                    nextRegisterStatus,
                    shiftData.cash_register_id
                ]
            });

            if (updateResult.rowsAffected === 0) {
                logger.warn('Failed to update cash register status', { cashRegisterId: shiftData.cash_register_id });
                await tx.rollback();
                return {
                    success: false,
                    code: 404,
                    message: 'Cash register not found for status update',
                    data: null
                };
            }

            await tx.commit();

            logger.info(`Cash shift ${shiftData.status === 'ABIERTA' ? 'created' : 'closed'} successfully`, { shiftId: shiftData.id });

            return {
                success: true,
                code: shiftData.status === 'ABIERTA' ? 201 : 200,
                message: `Cash shift ${shiftData.status === 'ABIERTA' ? 'created' : 'closed'} successfully`,
                data: { id: shiftData.id }
            };
        } catch (error) {
            await tx.rollback();
            logger.error('Error interacting with cash shift', { error: error.message });
            return {
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            };
        }
    },

    async calculateExpectedCashAmount(cashShiftId) {
        try {
            const query = `
                SELECT 
                    s.start_amount,
                    s.status,
                    
                    -- 1. CALCULO DE EFECTIVO (CASH)
                    COALESCE(SUM(CASE 
                        WHEN COALESCE(sa.payment_method, pu.payment_method, 'EFECTIVO') = 'EFECTIVO' THEN
                            CASE WHEN m.type = 'INGRESO' THEN m.amount ELSE -m.amount END
                        ELSE 0 
                    END), 0) as cash_net_movements,

                    -- 2. CALCULO DE TRANSFERENCIA
                    COALESCE(SUM(CASE 
                        WHEN COALESCE(sa.payment_method, pu.payment_method, 'EFECTIVO') = 'TRANSFERENCIA' THEN
                            CASE WHEN m.type = 'INGRESO' THEN m.amount ELSE -m.amount END
                        ELSE 0 
                    END), 0) as transfer_net_movements,

                    -- 3. CALCULO DE OTROS (TARJETAS, CHEQUES, ETC) - Opcional pero útil para cuadrar
                    COALESCE(SUM(CASE 
                        WHEN COALESCE(sa.payment_method, pu.payment_method, 'EFECTIVO') NOT IN ('EFECTIVO', 'TRANSFERENCIA') THEN
                            CASE WHEN m.type = 'INGRESO' THEN m.amount ELSE -m.amount END
                        ELSE 0 
                    END), 0) as other_net_movements

                FROM cash_shifts s
                LEFT JOIN cash_movements m ON s.id = m.cash_shift_id
                LEFT JOIN sales sa ON m.sale_id = sa.id
                LEFT JOIN purchases pu ON m.purchase_id = pu.id
                WHERE s.id = ?
                GROUP BY s.id, s.start_amount, s.status;
            `;

            const result = await turso.execute({
                sql: query,
                args: [cashShiftId]
            });

            if (result.rows.length === 0) {
                logger.warn('Cash shift not found', { cashShiftId });
                return {
                    success: false,
                    code: 404,
                    message: 'Turno de caja no encontrado',
                    data: null
                };
            }

            const row = result.rows[0];
            const startAmount = Number(row.start_amount);

            const expectedCash = startAmount + Number(row.cash_net_movements);

            const expectedTransfer = Number(row.transfer_net_movements);

            const expectedOthers = Number(row.other_net_movements);

            const totalCalculated = expectedCash + expectedTransfer + expectedOthers;

            return {
                success: true,
                code: 200,
                message: 'Cálculo de cierre realizado correctamente',
                data: {
                    status: row.status,
                    totals: {
                        expected_cash: expectedCash,
                        expected_transfer: expectedTransfer,
                        expected_others: expectedOthers,
                        total_calculated: totalCalculated
                    },
                    details: {
                        start_amount: startAmount,
                        net_cash_movements: Number(row.cash_net_movements),
                        net_transfer_movements: Number(row.transfer_net_movements)
                    }
                }
            };
        } catch (error) {
            logger.error('Error calculating cash shift expectations', { error: error.message });
            return {
                success: false,
                code: 500,
                message: 'Error interno calculando montos esperados',
                data: null
            };
        }
    },

    async getOpenShiftsByUser(userId) {
        try {
            const query = `
                SELECT
                    s.id as shift_id,
                    s.cash_register_id,
                    r.name as cash_register_name, 
                    s.start_time, 
                    s.start_amount, 
                    s.status 
                FROM cash_shifts s
                JOIN cash_registers r ON s.cash_register_id = r.id
                WHERE s.user_id = ? AND s.status = 'ABIERTA'
                LIMIT 1;
            `;

            const result = await turso.execute({
                sql: query,
                args: [userId]
            });

            if (result.rows.length === 0) {
                return {
                    success: false,
                    code: 404,
                    message: 'No open shifts found for user',
                    data: null
                };
            }

            return {
                success: true,
                code: 200,
                message: 'Open shift retrieved successfully',
                data: result.rows[0]
            }
        } catch (error) {
            logger.error('Error retrieving open shifts for user', { error, userId });
            return {
                success: false,
                code: 500,
                message: 'Internal server error retrieving open shifts',
                data: null
            };
        }
    },

    async registerManualMovement(movementData) {
        const tx = await turso.transaction();
        try {
            const shiftCheckQuery = `
                SELECT id
                FROM cash_shifts
                WHERE user_id = ? and status = 'ABIERTA';
            `;

            const shiftCheckResult = await tx.execute({
                sql: shiftCheckQuery,
                args: [movementData.user_id]
            });

            if (shiftCheckResult.rows.length === 0) {
                await tx.rollback();
                return {
                    success: false,
                    code: 400,
                    message: 'No open cash shift found for user',
                    data: null
                };
            }

            const currentShiftId = shiftCheckResult.rows[0].id;

            const insertMovementQuery = `
                INSERT INTO cash_movements(
                    id, cash_shift_id, user_id, 
                    type, category, concept, amount, notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);   
            `;

            const insertMovementResult = await tx.execute({
                sql: insertMovementQuery,
                args: [
                    movementData.id,
                    currentShiftId,
                    movementData.user_id,
                    movementData.type,
                    movementData.category,
                    movementData.concept,
                    movementData.amount,
                    movementData.notes || null
                ]
            });

            if (insertMovementResult.rowsAffected === 0) {
                await tx.rollback();
                logger.warn('Failed to insert manual cash movement', { movementData });
                return {
                    success: false,
                    code: 500,
                    message: 'Error inserting cash movement',
                    data: null
                };
            }

            await tx.commit();
            logger.info('Manual cash movement registered successfully', { movementId: movementData.id });

            return {
                success: true,
                code: 201,
                message: 'Cash movement registered successfully',
                data: { id: movementData.id }
            };
        } catch (error) {
            await tx.rollback();
            logger.error('Error registering manual cash movement', { error, movementData });
            return {
                success: false,
                code: 500,
                message: 'Internal server error registering cash movement',
                data: null
            };
        }
    },

    async getCurrentShiftHeader(userId) {
        try {
            const query = `
                SELECT
                    s.id as shift_id,
                    r.id as cash_register_id,
                    r.name as cash_register_name,
                    u.name as user_name, 
                    s.start_time, 
                    s.status
                FROM cash_shifts s
                INNER JOIN cash_registers r ON s.cash_register_id = r.id
                INNER JOIN users u ON s.user_id = u.id
                WHERE s.user_id = ? AND s.status = 'ABIERTA';
            `;

            const result = await turso.execute({
                sql: query,
                args: [userId]
            });

            if (result.rows.length === 0) {
                return {
                    success: false,
                    code: 404,
                    message: 'No open shift found for user',
                    data: null
                };
            }

            return {
                success: true,
                code: 200,
                message: 'Current shift header retrieved successfully',
                data: result.rows[0]
            };
        } catch (error) {
            logger.error('Error retrieving current shift header', { error, userId });
            return {
                success: false,
                code: 500,
                message: 'Internal server error retrieving shift header',
                data: null
            };
        }
    },

    async getCurrentShiftKPIs(userId) {
        try {
            const shiftCheckQuery = `
                SELECT id, start_amount
                FROM cash_shifts
                WHERE user_id = ? and status = 'ABIERTA';
            `;

            const shiftCheckResult = await turso.execute({
                sql: shiftCheckQuery,
                args: [userId]
            });

            if (shiftCheckResult.rows.length === 0) {
                return {
                    success: false,
                    code: 400,
                    message: 'No open cash shift found for user',
                    data: null
                };
            }

            const currentShiftId = shiftCheckResult.rows[0].id;
            const startAmount = shiftCheckResult.rows[0].start_amount;

            const query = `
                SELECT 
                    -- 1. VENTAS REALES (Efectivo)
                    COALESCE(SUM(CASE 
                        WHEN m.type = 'INGRESO' 
                             AND m.category = 'VENTA' 
                             AND COALESCE(sa.payment_method, 'EFECTIVO') = 'EFECTIVO' 
                        THEN m.amount ELSE 0 END), 0) as cash_sales,

                    -- 2. OTROS INGRESOS (Manuales: Sencillo, Aportes)
                    COALESCE(SUM(CASE 
                        WHEN m.type = 'INGRESO' 
                             AND m.category != 'VENTA'
                        THEN m.amount ELSE 0 END), 0) as other_income,

                    -- 3. VENTAS TRANSFERENCIA (Banco)
                    COALESCE(SUM(CASE 
                        WHEN m.type = 'INGRESO' 
                             AND sa.payment_method = 'TRANSFERENCIA' 
                        THEN m.amount ELSE 0 END), 0) as transfer_sales,

                    -- 4. EGRESOS POR COMPRAS (Pago a Proveedores en Efectivo)
                    COALESCE(SUM(CASE 
                        WHEN m.type = 'EGRESO' 
                             AND m.category = 'COMPRA'
                             AND COALESCE(pu.payment_method, 'EFECTIVO') = 'EFECTIVO'
                        THEN m.amount ELSE 0 END), 0) as cash_purchases,

                    -- 5. OTROS EGRESOS (Retiros Manuales, Gastos Operativos, Servicios)
                    COALESCE(SUM(CASE 
                        WHEN m.type = 'EGRESO' 
                             AND m.category != 'COMPRA'
                             -- Asumimos efectivo para gastos manuales
                        THEN m.amount ELSE 0 END), 0) as other_expenses

                FROM cash_movements m
                LEFT JOIN sales sa ON m.sale_id = sa.id
                LEFT JOIN purchases pu ON m.purchase_id = pu.id
                WHERE m.cash_shift_id = ?;
            `;

            const result = await turso.execute({
                sql: query,
                args: [currentShiftId]
            });

            const rows = result.rows[0];

            const cashSales = Number(rows.cash_sales);
            const otherIncome = Number(rows.other_income);
            const transferSales = Number(rows.transfer_sales);

            const cashPurchases = Number(rows.cash_purchases); // Nuevo desglose
            const otherExpenses = Number(rows.other_expenses); // Nuevo desglose

            // Saldo Teórico: 
            // (Base + Ventas + Otros Ingresos) - (Compras Efectivo + Otros Gastos)
            const theoreticalBalance = (startAmount + cashSales + otherIncome) - (cashPurchases + otherExpenses);

            return {
                success: true,
                code: 200,
                message: 'KPIs retrieved successfully',
                data: {
                    start_amount: startAmount,

                    // Ingresos
                    cash_sales: cashSales,
                    other_income: otherIncome,
                    transfer_sales: transferSales,

                    // Egresos Desglosados
                    cash_purchases: cashPurchases,   // Pagar a proveedores
                    other_expenses: otherExpenses,   // Gastos manuales / Sangría

                    // Total
                    theoretical_balance: theoreticalBalance
                }
            }
        } catch (error) {
            logger.error('Error retrieving KPIs', error);
            return {
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            };
        }
    },

    async getCurrentShiftMovements(userId, page = 1, limit = 10) {
        try {
            const shiftCheckQuery = `
                SELECT id
                FROM cash_shifts
                WHERE user_id = ? and status = 'ABIERTA';
            `;

            const shiftCheckResult = await turso.execute({
                sql: shiftCheckQuery,
                args: [userId]
            });

            if (shiftCheckResult.rows.length === 0) {
                return {
                    success: false,
                    code: 400,
                    message: 'No open cash shift found for user',
                    data: null
                };
            }

            const currentShiftId = shiftCheckResult.rows[0].id;

            const pageNum = Math.max(1, parseInt(page));
            const limitNum = Math.max(1, Math.min(100, parseInt(limit)));
            const offset = (pageNum - 1) * limitNum;

            const movementsQuery = `
                SELECT 
                    m.id,
                    time(m.created_at) as time,
                    m.type,   
                    m.category,
                    m.concept,
                    m.amount,
                    u.name as user_name,
                    COUNT(*) OVER() as total_count
                FROM cash_movements m
                INNER JOIN users u ON m.user_id = u.id
                WHERE m.cash_shift_id = ?
                ORDER BY m.created_at DESC
                LIMIT ? OFFSET ?;
            `;

            const result = await turso.execute({
                sql: movementsQuery,
                args: [currentShiftId, limitNum, offset]
            });

            if (result.rows.length === 0) {
                return {
                    success: false,
                    code: 404,
                    message: 'No movements found for current shift',
                    data: null
                };
            }

            const total = result.rows[0]?.total_count || 0;
            const movements = result.rows.map(({ total_count, ...movement }) => movement);
            const totalPages = Math.ceil(total / limitNum);

            return {
                success: true,
                code: 200,
                message: 'Current shift movements retrieved successfully',
                data: {
                    movements,
                    pagination: {
                        currentPage: pageNum,
                        totalPages,
                        totalItems: total,
                        itemsPerPage: limitNum,
                        hasNextPage: pageNum < totalPages,
                        hasPreviousPage: pageNum > 1
                    }
                }
            };
        } catch (error) {
            logger.error('Error retrieving current shift movements', error);
            return {
                success: false,
                code: 500,
                message: 'Internal server error retrieving shift movements',
                data: null
            };
        }
    },

    async getAvailableCashRegisters() {
        try {
            const query = `
                SELECT id, name
                FROM cash_registers
                WHERE status = 'CERRADA';
            `;

            const result = await turso.execute(query);

            if (result.rows.length === 0) {
                return {
                    success: false,
                    code: 404,
                    message: 'No available cash registers found',
                    data: null
                };
            }

            return {
                success: true,
                code: 200,
                message: 'Available cash registers retrieved successfully',
                data: result.rows
            };
        } catch (error) {
            logger.error('Error retrieving available cash registers', error);
            return {
                success: false,
                code: 500,
                message: 'Internal server error retrieving available cash registers',
                data: null
            };
        }
    },
};