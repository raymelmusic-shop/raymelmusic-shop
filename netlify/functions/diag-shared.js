const shared = require('./_shared.js');

exports.handler = async () => {
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ keys: Object.keys(shared) })
  };
};
