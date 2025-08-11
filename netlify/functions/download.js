const { verifyDownloadToken, fs, path } = require('./_shared.js');

exports.handler = async (event) => {
  try {
    const t = (event.queryStringParameters && event.queryStringParameters.t) || '';
    const data = verifyDownloadToken(t);
    if (!data) return { statusCode: 410, body: 'Link abgelaufen oder ungültig.' };

    const abs = path.join(process.cwd(), data.file);
    if (!fs.existsSync(abs)) return { statusCode: 404, body: 'Datei nicht gefunden.' };

    const buf = fs.readFileSync(abs);
    const filename = path.basename(abs);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${filename}"`
      },
      body: buf.toString('base64'),
      isBase64Encoded: true
    };
  } catch (e) {
    return { statusCode: 400, body: String(e) };
  }
};
