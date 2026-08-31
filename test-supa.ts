import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://nurvwlwqurovglbptknf.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im51cnZ3bHdxdXJvdmdsYnB0a25mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyOTg1NzcsImV4cCI6MjA4NDg3NDU3N30.L7D3LTkHq1ZudoyHPbzWVumOXm4zi2AXXspKvTPNv-w';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function test() {
  const { data, error } = await supabase.from('files').select('*').limit(1);
  console.log('Error:', error);
  console.log('Data:', data);
}
test();
