const svc = require('../services/sharedFiles.service');
const { success } = require('../utils/response.utils');

const list = (req, res, next) => {
  try { return success(res, { files: svc.forUser(req.user.id) }); }
  catch (err) { next(err); }
};

const download = (req, res, next) => {
  try {
    const path = require('path');
    const fs = require('fs');
    const { DOC_DIR } = require('../services/doctor.service.paths');
    const doc = svc.getOne(req.user.id, req.params.id);

    const full = path.join(DOC_DIR, doc.storedName);
    if (!fs.existsSync(full)) {
      throw Object.assign(new Error('That file is no longer available'), { statusCode: 404 });
    }

    // Headers are latin-1 only, so send an ASCII fallback plus RFC 5987
    const ascii = doc.name.replace(/[^\x20-\x7E]/g, '-').replace(/["\\]/g, '');
    res.setHeader('Content-Type', doc.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition',
      `${req.query.inline === '1' ? 'inline' : 'attachment'}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(doc.name)}`);
    fs.createReadStream(full).pipe(res);
  } catch (err) { next(err); }
};

module.exports = { list, download };
