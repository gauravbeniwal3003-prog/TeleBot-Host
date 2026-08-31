import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
dotenv.config();

async function test() {
  const token = jwt.sign({ id: 'user_1', email: 'gauravbeniwal30003@gmail.com', role: 'admin' }, process.env.JWT_SECRET || 'telehost_jwt_super_secure_production_secret_2026', { expiresIn: '1h' });
  
  // Get bots
  const bRes = await fetch('http://localhost:3000/api/bots', { headers: { Authorization: `Bearer ${token}` }});
  const { bots } = await bRes.json();
  if (!bots || bots.length === 0) return console.log('no bots');
  const botId = bots[0].id;
  
  // Get files
  const fRes = await fetch(`http://localhost:3000/api/bots/${botId}/files`, { headers: { Authorization: `Bearer ${token}` }});
  const fData = await fRes.json();
  console.log('files:', fData.files);
  if (!fData.files || fData.files.length === 0) return console.log('no files to delete');
  const filePath = fData.files[0].filePath;
  
  console.log('Deleting', filePath);
  // Delete file
  const dRes = await fetch(`http://localhost:3000/api/bots/${botId}/files?filePath=${encodeURIComponent(filePath)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
  const dData = await dRes.json();
  console.log('delete response:', dData);
  
  // Check files again
  const fRes2 = await fetch(`http://localhost:3000/api/bots/${botId}/files`, { headers: { Authorization: `Bearer ${token}` }});
  const fData2 = await fRes2.json();
  console.log('files after delete:', fData2.files);
}
test();
