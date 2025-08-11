async function ppCreateOrder(totalEUR, cartIdsCsv) {
  const { access_token } = await ppToken();
  const BASE = process.env.URL || process.env.DEPLOY_PRIME_URL || 'https://creative-cocada-a83de3.netlify.app';
  const res = await fetch(`${PP_BASE}/v2/checkout/orders`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      intent: 'CAPTURE',
      application_context: {
        brand_name: 'Raymel Music',
        landing_page: 'LOGIN',
        user_action: 'PAY_NOW',
        shipping_preference: 'NO_SHIPPING',
        locale: 'de-DE',
        return_url: `${BASE}/?ppreturn=1`,
        cancel_url: `${BASE}/?ppcancel=1`
      },
      purchase_units: [{
        amount: { currency_code: 'EUR', value: totalEUR.toFixed(2) },
        custom_id: cartIdsCsv.slice(0, 127)
      }]
    })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(data));
  return data; // enthält .id und .links (u.a. approve)
}
