const { ppCapture, sendMail, createDownloadToken, productFilesFromCartIds, orderEmailText } = require('./_shared.js');

exports.handler = async (event) => {
  try {
    const { orderId, notifyEmail } = JSON.parse(event.body || '{}');
    if (!orderId) return { statusCode: 400, body: 'orderId required' };

    const cap = await ppCapture(orderId);

    // cart-IDs aus custom_id ziehen
    const pu = (cap.purchase_units && cap.purchase_units[0]) || {};
    const custom = (pu.custom_id || '').trim();
    const cartIds = custom ? custom.split(',').filter(Boolean) : [];

    // E-Mail-Adresse: bevorzugt aus Formular (notifyEmail), sonst aus PayPal
    const payerEmail =
      notifyEmail ||
      (cap.payer && cap.payer.email_address) ||
      (cap.payment_source && cap.payment_source.paypal && cap.payment_source.paypal.email_address);

    // Downloadlinks erzeugen
    let links = [];
    if (cartIds.length) {
      const files = productFilesFromCartIds(cartIds);
      const base = process.env.URL || `https://${event.headers.host}`;
      links = files.map(f => `${base}/.netlify/functions/download?t=${createDownloadToken(f, 24*3600)}`);
    }

    // Mail versenden (nur wenn wir eine Zieladresse haben)
    if (payerEmail && links.length) {
      await sendMail({
        to: payerEmail,
        subject: 'Dein Download (Raymel Music – Sandbox-Test)',
        text: orderEmailText(links),
      });
    }

    return { statusCode: 200, body: JSON.stringify({ status: cap.status, email: !!payerEmail, links }) };
  } catch (e) {
    return { statusCode: 400, body: String(e) };
  }
};
