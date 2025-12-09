// db.js
const { createClient } = require('@supabase/supabase-js');

// These should be environment variables in production
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://knshikqslvsshknzpbch.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtuc2hpa3FzbHZzc2hrbnpwYmNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyODYwMTIsImV4cCI6MjA4MDg2MjAxMn0.Q16Cn3cKhgGxRukZItR9CTwttIykFCRBFz2OUa2LOd0';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

module.exports = supabase;
