import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import fs from 'fs';
dotenv.config();

async function test() {
  const dbData = JSON.parse(fs.readFileSync('data/telehost_relational.json', 'utf8'));
  const user = dbData.users.find((u: any) => u.email === 'gauravbeniwal30003@gmail.com');
  const token = jwt.sign({ id: user.id, email: user.email, role: 'admin' }, process.env.JWT_SECRET || 'telehost_jwt_super_secure_production_secret_2026', { expiresIn: '1h' });
  
  const bRes = await fetch('http://localhost:3000/api/bots', { headers: { Authorization: `Bearer ${token}` }});
  const { bots } = await bRes.json();
  const botId = bots[0].id;

  // upload a file with a space
  const boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW";
  let body = `--${boundary}\r\n`;
  body += `Content-Disposition: form-data; name="file"; filename="my file with spaces.txt"\r\n`;
  body += `Content-Type: text/plain\r\n\r\n`;
  body += `hello world\r\n`;
  body += `--${boundary}--`;

  await fetch(`http://localhost:3000/api/bots/${botId}/files/upload`, {
    method: 'POST',
    headers: { 
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/form-data; boundary=${boundary}`
    },
    body
  });

  const fRes = await fetch(`http://localhost:3000/api/bots/${botId}/files`, { headers: { Authorization: `Bearer ${token}` }});
  const fData = await fRes.json();
  const file = fData.files.find((f: any) => f.fileName === 'my file with spaces.txt');
  console.log('uploaded file path:', file.filePath);

  const dRes = await fetch(`http://localhost:3000/api/bots/${botId}/files?filePath=${encodeURIComponent(file.filePath)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log('delete status:', dRes.status);
  
  const fRes2 = await fetch(`http://localhost:3000/api/bots/${botId}/files`, { headers: { Authorization: `Bearer ${token}` }});
  const fData2 = await fRes2.json();
  const found = fData2.files.find((f: any) => f.fileName === 'my file with spaces.txt');
  console.log('is file still there?', !!found);
}
test();
