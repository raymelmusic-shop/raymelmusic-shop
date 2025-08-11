const { ppCreateOrder } = require('./_shared.js');
exports.handler = async () => {
  try {
    const o = await ppCreateOrder(1.00, 'health');
    return { statusCode: 200, body: 'ok:' + (o?.id || '') };
  } catch (e) {
    return { statusCode: 400, body: 'err:' + String(e) };
  }
};
