function errorHandler(err, req, res, _next) {
  console.error('Error:', err.message);

  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message, details: err.details });
  }

  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ error: 'Resource already exists' });
  }

  const status = err.statusCode || 500;
  res.status(status).json({
    error: status === 500 ? 'Internal server error' : err.message,
  });
}

function notFound(req, res) {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
}

module.exports = { errorHandler, notFound };
