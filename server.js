const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const supabase = require('./db-supabase');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Get current status (is running?)
app.get('/api/status', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .is('end_time', null)
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    if (data) {
      res.json({ running: true, session: data });
    } else {
      res.json({ running: false });
    }
  } catch (err) {
    console.error('Error fetching status:', err);
    res.status(500).json({ error: err.message });
  }
});

// Start a session
app.post('/api/start', async (req, res) => {
  const { note } = req.body;
  const startTime = new Date().toISOString();

  try {
    // Check if already running
    const { data: running } = await supabase
      .from('sessions')
      .select('*')
      .is('end_time', null)
      .maybeSingle();

    if (running) {
      return res.status(400).json({ error: 'Session already running' });
    }

    const { data, error } = await supabase
      .from('sessions')
      .insert([{ start_time: startTime, note: note || '' }])
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, id: data.id, start_time: startTime });
  } catch (err) {
    console.error('Error starting session:', err);
    res.status(500).json({ error: err.message });
  }
});

// Stop a session
app.post('/api/stop', async (req, res) => {
  const endTime = new Date().toISOString();

  try {
    const { data: running } = await supabase
      .from('sessions')
      .select('*')
      .is('end_time', null)
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!running) {
      return res.status(400).json({ error: 'No running session' });
    }

    const start = new Date(running.start_time);
    const end = new Date(endTime);
    const duration = Math.floor((end - start) / 1000); // seconds

    const { error } = await supabase
      .from('sessions')
      .update({ end_time: endTime, duration: duration })
      .eq('id', running.id);

    if (error) throw error;

    res.json({ success: true, duration });
  } catch (err) {
    console.error('Error stopping session:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get all sessions (for heatmap and logs)
app.get('/api/sessions', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .not('end_time', 'is', null)
      .order('start_time', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Error fetching sessions:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update a session
app.put('/api/sessions/:id', async (req, res) => {
  const { id } = req.params;
  const { start_time, end_time, note } = req.body;

  try {
    const start = new Date(start_time);
    const end = new Date(end_time);
    const duration = Math.floor((end - start) / 1000); // seconds

    const { error } = await supabase
      .from('sessions')
      .update({ start_time, end_time, duration, note })
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('Error updating session:', err);
    res.status(500).json({ error: err.message });
  }
});

// Delete a session
app.delete('/api/sessions/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { error } = await supabase
      .from('sessions')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting session:', err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
