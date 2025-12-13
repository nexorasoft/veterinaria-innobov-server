import { mSend } from "../models/mSend.js";
import { BrevoConfig } from "../utils/email.js";
import { render } from "@react-email/render";
import CashRegisterNotification from "../emails/cash-register-notification.jsx";
import InvoiceEmail from "../emails/invoice-email.jsx";

import React from 'react';
import { uRide } from "../utils/pdf.js";
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
    },

    async sendRideEmail(invoiceData) {
        try {
            if (!invoiceData.client_email) {
                console.warn(`La factura ${invoiceData.sequential} no tiene email de cliente configurado.`);
                return { success: false, message: 'Cliente sin email' };
            }

            const rideBuffer = await uRide.generateRidePdf(invoiceData);

            const emailElement = React.createElement(InvoiceEmail, {
                clientName: invoiceData.client_name,
                invoiceNumber: `${invoiceData.establishment_code}-${invoiceData.emission_point}-${invoiceData.sequential}`,
                date: invoiceData.issue_date,
                total: invoiceData.total_with_taxes,
                accessKey: invoiceData.access_key,
                companyName: "NEXORA SOFT"
            });

            const emailHtml = await render(emailElement);

            const subject = `Comprobante Electrónico - Factura #${invoiceData.sequential}`;
            const sender = { name: "NEXORA SOFT", email: "nexorasoft582@gmail.com" };
            const to = { name: invoiceData.client_name, email: invoiceData.client_email };

            const attachments = [
                {
                    name: `Factura-${invoiceData.sequential}.pdf`,
                    content: rideBuffer.toString('base64')
                },
                {
                    name: `Factura-${invoiceData.sequential}.xml`,
                    content: Buffer.from(invoiceData.xml_authorized).toString('base64')
                }
            ];

            await BrevoConfig.sendEmail(subject, to, emailHtml, sender, attachments);

            return { success: true };

        } catch (error) {
            console.error("Error enviando RIDE por correo:", error);
            return { success: false, error: error.message };
        }
    }
};