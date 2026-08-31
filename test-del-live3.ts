import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import fs from 'fs';
dotenv.config();

async function test() {
  const dbData = JSON.parse(fs.readFileSync('data/telehost_relational.json', 'utf8'));
  const user = dbData.users.find((u: any) => u.email === 'gauravbeniwal30003@gmail.com');
  if (!user) return console.log('no user');
  
  const token = jwt.sign({ id: user.id, email: user.email, role: 'admin' }, process.env.JWT_SECRET || 'telehost_jwt_super_secure_production_secret_2026', { expiresIn: '1h' });
  
  const bRes = await fetch('http://localhost:3000/api/bots', { headers: { Authorization: `Bearer ${token}` }});
  const { bots } = await bRes.json();
  const botId = bots[0].id;
  
  const fRes = await fetch(`http://localhost:3000/api/bots/${botId}/files`, { headers: { Authorization: `Bearer ${token}` }});
  const fData = await fRes.json();
  console.log('files before:', fData.files.map((f: any) => f.filePath));
  
  if (fData.files.length === 0) return;
  const filePath = fData.files[0].filePath;
  console.log('Deleting', filePath);
  
  const dRes = await fetch(`http://localhost:3000/api/bots/${botId}/files?filePath=${encodeURIComponent(filePath)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log('delete status:', dRes.status);
  const dData = await dRes.json();
  console.log('delete response:', dData);
  
  const fRes2 = await fetch(`http://localhost:3000/api/bots/${botId}/files`, { headers: { Authorization: `Bearer ${token}` }});
  const fData2 = await fRes2.json();
  console.log('files after:', fData2.files.map((f: any) => f.filePath));
}
test();
