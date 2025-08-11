const { sumEUR, ppCreateOrder } = require('./_shared.js');

exports.handler = async (event) => {
  try {
    const { cart } = JSON.parse(event.body || '{}');
    const ids = (cart || []).map(i => i.id);
    if (!ids.length) {
      return { statusCode: 400, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'cart empty' }) };
    }
    const total = sumEUR(cart || []);
    const order = await ppCreateOrder(total, ids.join(','));
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId: order.id }) };
  } catch (e) {
    return { statusCode: 400, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: String(e) }) };
  }
};
