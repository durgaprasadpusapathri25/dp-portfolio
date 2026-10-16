import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { PDFDocument, StandardFonts, rgb } from "npm:pdf-lib"
import nodemailer from "npm:nodemailer@^9"
import { Buffer } from "node:buffer"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

const LOGO_URL = "https://dp-portfolio-7q6.pages.dev/dp-logo.png"

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

function escapeHtml(value: unknown) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }
    return entities[character]
  })
}

function safePdfText(value: unknown) {
  return String(value ?? "").replace(/[^\x20-\x7E]/g, "?")
}

function formatMoney(amount: number, currency: string) {
  return `${currency} ${amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405)

  try {
    const authorization = request.headers.get("Authorization")
    if (!authorization) return jsonResponse({ error: "Sign in is required." }, 401)

    const supabaseUrl = Deno.env.get("SUPABASE_URL")
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")
    const smtpHost = Deno.env.get("SMTP_HOSTNAME")
    const smtpPort = Number(Deno.env.get("SMTP_PORT") || "465")
    const smtpUsername = Deno.env.get("SMTP_USERNAME")
    const smtpPassword = Deno.env.get("SMTP_PASSWORD")?.replace(/\s/g, "")
    const fromEmail = Deno.env.get("SMTP_FROM")
    if (
      !supabaseUrl || !supabaseAnonKey || !smtpHost || !smtpUsername ||
      !smtpPassword || !fromEmail || !Number.isFinite(smtpPort)
    ) {
      return jsonResponse({ error: "Email service is not configured yet." }, 500)
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError || !userData.user) {
      return jsonResponse({ error: "Your session is invalid. Please sign in again." }, 401)
    }

    const body = await request.json()
    const receiptId = String(body.receipt_id ?? "")
    if (!receiptId) return jsonResponse({ error: "Receipt ID is required." }, 400)

    const { data: receipt, error: receiptError } = await supabase
      .from("receipts")
      .select("id, receipt_number, client_id, payment_id, amount, currency, issue_date, description")
      .eq("id", receiptId)
      .single()
    if (receiptError || !receipt) {
      return jsonResponse({ error: "Receipt was not found or you do not have access." }, 404)
    }
    if (!receipt.client_id) return jsonResponse({ error: "This receipt has no linked client." }, 400)

    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("client_name, email, phone")
      .eq("id", receipt.client_id)
      .single()
    if (clientError || !client?.email) {
      return jsonResponse({ error: "Add an email address to this client before sending the receipt." }, 400)
    }

    let payment: any = null
    let project: any = null
    if (receipt.payment_id) {
      const { data, error } = await supabase
        .from("payments")
        .select("payment_method, project_id, payment_status")
        .eq("id", receipt.payment_id)
        .maybeSingle()
      if (error) return jsonResponse({ error: "Unable to read the linked payment." }, 500)
      payment = data

      if (payment?.project_id) {
        const { data: projectData, error: projectError } = await supabase
          .from("projects")
          .select("project_name, budget")
          .eq("id", payment.project_id)
          .maybeSingle()
        if (projectError) return jsonResponse({ error: "Unable to read the linked project." }, 500)
        project = projectData
      }
    }

    const amount = Number(receipt.amount)
    const currency = receipt.currency === "USD" ? "USD" : "INR"
    const formattedAmount = formatMoney(amount, currency)
    let projectTotal: number | null = null
    let receivedToDate = amount

    if (project?.budget !== null && project?.budget !== undefined) {
      projectTotal = Number(project.budget)
    }

    // Sum all paid installments linked to this project, including this payment.
    if (payment?.project_id) {
      const { data: paidPayments, error: paidPaymentsError } = await supabase
        .from("payments")
        .select("amount")
        .eq("project_id", payment.project_id)
        .eq("payment_status", "Paid")
      if (paidPaymentsError) {
        return jsonResponse({ error: "Unable to calculate payments received for this project." }, 500)
      }
      receivedToDate = (paidPayments ?? []).reduce(
        (sum: number, item: { amount: number | string }) => sum + Number(item.amount || 0),
        0,
      )
    }

    const balanceDue = projectTotal === null
      ? null
      : Math.max(projectTotal - receivedToDate, 0)
    const isPaidInFull = balanceDue !== null && balanceDue <= 0
    const receiptDate = new Date(`${receipt.issue_date}T00:00:00Z`).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    })

    // A public logo is embedded in the PDF and attached inline for email clients.
    let logoBytes: Uint8Array | null = null
    try {
      const logoResponse = await fetch(LOGO_URL)
      if (logoResponse.ok) logoBytes = new Uint8Array(await logoResponse.arrayBuffer())
    } catch {
      // Continue sending the receipt without a logo if the public image is unavailable.
    }

    const pdf = await PDFDocument.create()
    const page = pdf.addPage([595, 842])
    const regular = await pdf.embedFont(StandardFonts.Helvetica)
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
    const cream = rgb(0.99, 0.98, 0.95)
    const gold = rgb(0.61, 0.43, 0.19)
    const ink = rgb(0.13, 0.11, 0.08)
    const muted = rgb(0.40, 0.36, 0.30)
    const safeClientName = safePdfText(client.client_name || "Client")
    const safeProject = safePdfText(project?.project_name || "")
    const safeDescription = safePdfText(receipt.description || "Payment received")

    page.drawRectangle({ x: 0, y: 0, width: 595, height: 842, color: cream })
    page.drawRectangle({
      x: 38,
      y: 38,
      width: 519,
      height: 766,
      borderColor: rgb(0.84, 0.77, 0.63),
      borderWidth: 1,
    })

    if (logoBytes) {
      try {
        const logo = await pdf.embedPng(logoBytes)
        const logoScale = Math.min(74 / logo.width, 54 / logo.height)
        page.drawImage(logo, {
          x: 62,
          y: 728,
          width: logo.width * logoScale,
          height: logo.height * logoScale,
        })
      } catch {
        // Continue with the text brand if the logo is not a valid PNG.
      }
    }

    page.drawText("DP CREATIVE STUDIO", { x: 150, y: 758, size: 14, font: bold, color: gold })
    page.drawText("CREATIVE SERVICES  |  DIGITAL EXPERIENCES", { x: 150, y: 740, size: 8, font: regular, color: muted })
    page.drawText("PAYMENT RECEIPT", { x: 62, y: 672, size: 25, font: bold, color: ink })
    page.drawText(`Receipt No. ${safePdfText(receipt.receipt_number)}`, { x: 62, y: 642, size: 11, font: regular, color: muted })
    page.drawText(`Issue date: ${receiptDate}`, { x: 62, y: 624, size: 11, font: regular, color: muted })
    page.drawLine({ start: { x: 62, y: 598 }, end: { x: 533, y: 598 }, thickness: 1.5, color: gold })

    page.drawText("RECEIVED FROM", { x: 62, y: 564, size: 9, font: bold, color: gold })
    page.drawText(safeClientName.slice(0, 48), { x: 62, y: 540, size: 16, font: bold, color: ink })
    if (client.email) page.drawText(safePdfText(client.email).slice(0, 58), { x: 62, y: 520, size: 10, font: regular, color: muted })
    if (client.phone) page.drawText(safePdfText(client.phone).slice(0, 32), { x: 62, y: 504, size: 10, font: regular, color: muted })
    if (safeProject) page.drawText(`Project: ${safeProject.slice(0, 50)}`, { x: 62, y: 478, size: 11, font: regular, color: ink })
    if (payment?.payment_method) page.drawText(`Method: ${safePdfText(payment.payment_method).slice(0, 36)}`, { x: 62, y: 458, size: 11, font: regular, color: ink })

    page.drawRectangle({ x: 62, y: 360, width: 471, height: 70, color: rgb(0.96, 0.94, 0.89) })
    page.drawText("DESCRIPTION", { x: 78, y: 405, size: 9, font: bold, color: muted })
    page.drawText("AMOUNT", { x: 420, y: 405, size: 9, font: bold, color: muted })
    page.drawText(safeDescription.slice(0, 48), { x: 78, y: 380, size: 11, font: regular, color: ink })
    page.drawText(formatMoney(amount, currency), { x: 365, y: 380, size: 11, font: bold, color: ink })

    let summaryY = 324
    const drawSummaryRow = (label: string, value: string, emphasis = false) => {
      page.drawText(label, {
        x: 78,
        y: summaryY,
        size: emphasis ? 12 : 10,
        font: emphasis ? bold : regular,
        color: emphasis ? ink : muted,
      })
      page.drawText(value, {
        x: 365,
        y: summaryY,
        size: emphasis ? 12 : 10,
        font: emphasis ? bold : regular,
        color: emphasis ? gold : ink,
      })
      summaryY -= 23
    }

    if (projectTotal !== null) {
      drawSummaryRow("Project total", formatMoney(projectTotal, currency))
      drawSummaryRow("Paid this payment", formattedAmount)
      drawSummaryRow("Total received to date", formatMoney(receivedToDate, currency), true)
      drawSummaryRow("Balance remaining", formatMoney(balanceDue ?? 0, currency), true)
    } else {
      drawSummaryRow("Total paid", formattedAmount, true)
    }

    const statusY = 188
    page.drawRectangle({ x: 62, y: statusY, width: 471, height: 52, color: rgb(0.96, 0.94, 0.89) })
    page.drawText(
      projectTotal === null
        ? "PAYMENT RECEIVED"
        : isPaidInFull
        ? "PROJECT PAID IN FULL"
        : "PARTIAL PAYMENT RECEIVED",
      { x: 78, y: statusY + 30, size: 10, font: bold, color: gold },
    )
    page.drawText("Thank you for choosing DP Creative Studio.", { x: 78, y: statusY + 12, size: 10, font: regular, color: muted })
    page.drawText("Thank you for your trust. We appreciate your business.", { x: 116, y: 136, size: 10, font: regular, color: muted })
    const pdfBytes = await pdf.save()

    const safeName = escapeHtml(client.client_name || "Client")
    const safeNumber = escapeHtml(receipt.receipt_number)
    const safeProjectHtml = project?.project_name
      ? `<tr><td style="padding:12px 0;color:#766b5b;border-bottom:1px solid #e9dfcd">Project</td><td style="padding:12px 0;text-align:right;color:#211b12;border-bottom:1px solid #e9dfcd">${escapeHtml(project.project_name)}</td></tr>`
      : ""
    const safeMethodHtml = payment?.payment_method
      ? `<tr><td style="padding:12px 0;color:#766b5b;border-bottom:1px solid #e9dfcd">Payment method</td><td style="padding:12px 0;text-align:right;color:#211b12;border-bottom:1px solid #e9dfcd">${escapeHtml(payment.payment_method)}</td></tr>`
      : ""
    const logoHtml = logoBytes
      ? `<img src="cid:dpcreativestudio-logo" alt="DP Creative Studio" width="76" style="display:block;width:76px;height:auto;max-height:58px;object-fit:contain;margin:0 auto 12px">`
      : ""
    const breakdownHtml = projectTotal !== null
      ? `<tr><td style="padding:12px 0;color:#766b5b;border-bottom:1px solid #e9dfcd">Project total</td><td style="padding:12px 0;text-align:right;border-bottom:1px solid #e9dfcd">${escapeHtml(formatMoney(projectTotal, currency))}</td></tr><tr><td style="padding:12px 0;color:#766b5b;border-bottom:1px solid #e9dfcd">Paid this payment</td><td style="padding:12px 0;text-align:right;border-bottom:1px solid #e9dfcd">${escapeHtml(formattedAmount)}</td></tr><tr><td style="padding:12px 0;color:#211b12;font-weight:bold;border-bottom:1px solid #e9dfcd">Total received to date</td><td style="padding:12px 0;text-align:right;color:#211b12;font-weight:bold;border-bottom:1px solid #e9dfcd">${escapeHtml(formatMoney(receivedToDate, currency))}</td></tr><tr><td style="padding:12px 0;color:#211b12;font-weight:bold;border-top:1px solid #d7b477">Balance remaining</td><td style="padding:12px 0;text-align:right;color:#9b7237;font-size:17px;font-weight:bold;border-top:1px solid #d7b477">${escapeHtml(formatMoney(balanceDue ?? 0, currency))}</td></tr>`
      : `<tr><td style="padding:16px 0;color:#211b12;font-weight:bold;border-top:1px solid #d7b477">Total paid</td><td style="padding:16px 0;text-align:right;color:#9b7237;font-size:18px;font-weight:bold;border-top:1px solid #d7b477">${escapeHtml(formattedAmount)}</td></tr>`
    const statusLabel = projectTotal === null
      ? "PAYMENT RECEIVED"
      : isPaidInFull
      ? "PROJECT PAID IN FULL"
      : "PARTIAL PAYMENT RECEIVED"

    const html = `<!doctype html><html><body style="margin:0;background:#f2eee6;font-family:Arial,sans-serif;color:#211b12"><div style="max-width:620px;margin:30px auto;background:#fffdf8;border:1px solid #ddcfb5;border-radius:14px;overflow:hidden"><div style="padding:26px 32px;background:#151310;color:#fffdf8;text-align:center">${logoHtml}<div style="color:#d7b477;font-size:12px;letter-spacing:3px;font-weight:bold">DP CREATIVE STUDIO</div><h1 style="margin:16px 0 6px;font-family:Georgia,serif;font-size:26px">Payment receipt</h1><div style="color:#d8c9ae;font-size:13px">Receipt ${safeNumber}</div></div><div style="padding:28px 32px"><p style="font-size:15px">Hi ${safeName},</p><p style="color:#766b5b;line-height:1.7">Thank you for your payment. Your receipt is attached to this email.</p><table style="width:100%;border-collapse:collapse;margin:22px 0"><tr><td style="padding:12px 0;color:#766b5b;border-bottom:1px solid #e9dfcd">Issue date</td><td style="padding:12px 0;text-align:right;border-bottom:1px solid #e9dfcd">${escapeHtml(receiptDate)}</td></tr>${safeProjectHtml}${safeMethodHtml}${breakdownHtml}</table><div style="display:inline-block;padding:10px 14px;border:1px solid #d7b477;border-radius:20px;color:#805b25;font-size:11px;font-weight:bold;letter-spacing:1px">${statusLabel}</div><p style="color:#766b5b;font-size:13px;line-height:1.7;margin-top:24px">We appreciate your business and look forward to working with you.</p><div style="margin-top:26px;color:#9b7237;font-size:11px;letter-spacing:1px">DP CREATIVE STUDIO</div></div></div></body></html>`

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUsername, pass: smtpPassword },
    })

    try {
      const attachments: Array<Record<string, unknown>> = [{
        filename: `Receipt-${receipt.receipt_number}.pdf`,
        content: Buffer.from(pdfBytes),
        contentType: "application/pdf",
      }]
      if (logoBytes) {
        attachments.push({
          filename: "dp-logo.png",
          content: Buffer.from(logoBytes),
          contentType: "image/png",
          cid: "dpcreativestudio-logo",
          disposition: "inline",
        })
      }

      await transporter.sendMail({
        from: fromEmail,
        to: client.email,
        subject: `Your payment receipt ${receipt.receipt_number} | DP Creative Studio`,
        html,
        attachments,
      })
    } finally {
      transporter.close()
    }

    return jsonResponse({ success: true, email: client.email })
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Unexpected email error." }, 500)
  }
})
