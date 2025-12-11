import { mSend } from "../models/mSend.js";
import { BrevoConfig } from "../utils/email.js";
import { render } from "@react-email/render";
import CashRegisterNotification from "../emails/cash-register-notification.jsx";
import React from 'react';

export const hSend = {
    async cashRegistrNotification(req, data) {
        try {
            const info = await mSend.cashRegisterNotification(req, data);
            
            let startTime = null;
            let endTime = null;
            const isOpen = data.status === 'ABIERTA';

            if (isOpen) {
                startTime = data.start_time;
            } else {
                endTime = data.end_time;
            }

            const emailElement = React.createElement(CashRegisterNotification, {
                name: info.admin.name,
                isOpen: isOpen,
                datetime: isOpen ? startTime : endTime,
                cashier_name: info.cashier_name,
                cash_name: info.cash_name,
                initial_amount: data.start_amount,
                expected_amount: data.expected_amount,
                actual_amount: data.actual_amount,
                difference: data.difference,
                clinic: info.clinic_name,
                notes: data.notes,
                ip_address: info.client_info.ip_address,
                device: info.client_info.user_agent
            });

            const emailHtml = await render(emailElement);

            const subject = `${isOpen ? '🔔 Apertura' : '🔒 Cierre'} de Caja - ${info.cash_name}`;
            const sender = { name: "Sistema Veterinario", email: "nexorasoft582@gmail.com" };
            const to = { name: info.admin.name, email: info.admin.email };

            await BrevoConfig.sendEmail(subject, to, emailHtml, sender);
        } catch (error) {
            console.error("Error enviando notificación de caja:", error);
            throw error;
        }
    }
};