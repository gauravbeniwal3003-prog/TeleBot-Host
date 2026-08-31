import express from 'express';

const app = express();
const botsRouter = express.Router();
botsRouter.delete('/:id', (req, res) => res.send('matched botsRouter delete'));

const filesRouter = express.Router();
filesRouter.delete('/:botId/files', (req, res) => res.send('matched filesRouter delete'));

app.use('/api/bots', botsRouter);
app.use('/api/bots', filesRouter);

const request = require('supertest');
request(app).delete('/api/bots/bot_123/files?filePath=main.py')
  .expect(200)
  .then(res => console.log('Response:', res.text))
  .catch(err => console.error('Error:', err));
