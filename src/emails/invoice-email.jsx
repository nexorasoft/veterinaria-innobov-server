import React from "react";
import { Html, Body, Container, Text, Heading, Link, Hr } from "@react-email/components";

const InvoiceEmail = ({ clientName, invoiceNumber, date, total, accessKey, companyName }) => {
    return (
        <Html>
            <Body style={main}>
                <Container style={container}>
                    <Heading style={h1}>Nuevo Comprobante Electrónico</Heading>
                    <Text style={text}>Hola, <strong>{clientName}</strong></Text>
                    <Text style={text}>
                        {companyName} ha emitido un nuevo comprobante electrónico.
                    </Text>

                    <Container style={infoBox}>
                        <Text style={infoText}><strong>Documento:</strong> Factura</Text>
                        <Text style={infoText}><strong>Número:</strong> {invoiceNumber}</Text>
                        <Text style={infoText}><strong>Fecha:</strong> {date}</Text>
                        <Text style={infoText}><strong>Total:</strong> ${Number(total).toFixed(2)}</Text>
                    </Container>

                    <Text style={text}>
                        Adjunto a este correo encontrarás el documento RIDE (PDF).
                    </Text>

                    <Hr style={hr} />

                    <Text style={smallText}>Clave de Acceso:</Text>
                    <Text style={code}>{accessKey}</Text>
                </Container>
            </Body>
        </Html>
    );
};

// Estilos simples
const main = { backgroundColor: "#f6f9fc", fontFamily: "sans-serif" };
const container = { backgroundColor: "#ffffff", margin: "0 auto", padding: "20px 0 48px", marginBottom: "64px" };
const h1 = { color: "#333", fontSize: "24px", fontWeight: "bold", padding: "17px 0 0", textAlign: "center" };
const text = { color: "#525f7f", fontSize: "16px", lineHeight: "24px", textAlign: "left", padding: "0 40px" };
const infoBox = { padding: "20px", backgroundColor: "#f4f4f4", borderRadius: "5px", margin: "20px 40px" };
const infoText = { margin: "5px 0", color: "#333", fontSize: "14px" };
const hr = { borderColor: "#e6ebf1", margin: "20px 0" };
const smallText = { color: "#8898aa", fontSize: "12px", textAlign: "center" };
const code = { color: "#8898aa", fontSize: "10px", textAlign: "center", wordBreak: "break-all" };

export default InvoiceEmail;