const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

exports.transcribe = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No audio file uploaded' });

    const filePath = req.file.path;

    // If OPENAI_API_KEY is not set, return instructive error
    if (!process.env.OPENAI_API_KEY) {
      // Clean up uploaded file
      try { fs.unlinkSync(filePath); } catch (e) {}
      return res.status(501).json({ error: 'STT not configured. Set OPENAI_API_KEY to enable server-side transcription.' });
    }

    const form = new FormData();
    form.append('file', fs.createReadStream(filePath));
    form.append('model', 'whisper-1');

    const fetchRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        ...form.getHeaders(),
      },
      body: form,
    });

    const data = await fetchRes.json();

    // Clean up uploaded file
    try { fs.unlinkSync(filePath); } catch (e) {}

    if (!fetchRes.ok) {
      return res.status(fetchRes.status).json({ error: data.error || 'Transcription failed' });
    }

    return res.json({ text: data.text });
  } catch (err) {
    console.error('STT error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
