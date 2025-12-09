const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const noteInput = document.getElementById('note');
const statusDiv = document.getElementById('status');
const heatmapDiv = document.getElementById('heatmap');
const heatmapMonthsDiv = document.getElementById('heatmap-months');
const logsDiv = document.getElementById('logs');
const liveTimer = document.getElementById('liveTimer');
const timerStatus = document.getElementById('timerStatus');

let isRunning = false;
let currentSessionStartTime = null;
let timerInterval = null;

// Initial load
fetchStatus();
fetchSessions();

startBtn.addEventListener('click', async () => {
  const note = noteInput.value;
  
  // Optimistic UI update
  setRunningState(true, new Date(), note);

  try {
    const res = await fetch('/api/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note })
    });
    
    if (!res.ok) {
      throw new Error('Failed to start');
    }
    // We can fetchStatus() here to be sure, but we are already running
  } catch (err) {
    console.error(err);
    alert('Could not start session. Please try again.');
    setRunningState(false);
  }
});

stopBtn.addEventListener('click', async () => {
  // Optimistic UI update
  setRunningState(false);

  try {
    const res = await fetch('/api/stop', { method: 'POST' });
    if (res.ok) {
      fetchSessions(); // Update history
    } else {
       throw new Error('Failed to stop');
    }
  } catch (err) {
    console.error(err);
    alert('Could not stop session. Please refresh.');
    // In case of stop failure, we might want to re-fetch status to see true state
    fetchStatus();
  }
});

async function fetchStatus() {
  try {
    const res = await fetch('/api/status');
    const data = await res.json();
    
    if (data.running) {
       setRunningState(true, new Date(data.session.start_time), data.session.note);
    } else {
       setRunningState(false);
    }
  } catch (err) {
    console.error('Error fetching status', err);
  }
}

function setRunningState(running, startTime = null, note = '') {
  isRunning = running;
  if (running) {
    currentSessionStartTime = startTime || new Date();
    startBtn.disabled = true;
    stopBtn.disabled = false;
    noteInput.value = note || '';
    noteInput.disabled = true;
    
    const startTimeStr = currentSessionStartTime.toLocaleString('ru-RU');
    statusDiv.innerHTML = `🏁 Started: <strong>${startTimeStr}</strong>`;
    
    timerStatus.textContent = 'Running...';
    timerStatus.classList.add('running');
    startTimerInterval();
  } else {
    currentSessionStartTime = null;
    stopTimerInterval();
    
    startBtn.disabled = false;
    stopBtn.disabled = true;
    noteInput.disabled = false;
    noteInput.value = '';
    statusDiv.textContent = '⏸ Timer stopped';
    
    liveTimer.textContent = '00:00:00';
    timerStatus.textContent = 'Not running';
    timerStatus.classList.remove('running');
  }
}

function startTimerInterval() {
  if (timerInterval) clearInterval(timerInterval);
  
  updateTimerDisplay(); // immediate update
  timerInterval = setInterval(updateTimerDisplay, 1000);
}

function stopTimerInterval() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function updateTimerDisplay() {
  if (!currentSessionStartTime) return;
  
  const now = new Date();
  const diff = Math.floor((now - currentSessionStartTime) / 1000); // seconds
  
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  const s = diff % 60;
  
  const hStr = h.toString().padStart(2, '0');
  const mStr = m.toString().padStart(2, '0');
  const sStr = s.toString().padStart(2, '0');
  
  liveTimer.textContent = `${hStr}:${mStr}:${sStr}`;
}

async function fetchSessions() {
  const res = await fetch('/api/sessions');
  const sessions = await res.json();
  renderLogs(sessions);
  renderHeatmap(sessions);
}

function renderLogs(sessions) {
  logsDiv.innerHTML = '';
  // Show top 20 recent
  sessions.slice(0, 20).forEach(session => {
    const el = document.createElement('div');
    el.className = 'log-item';
    
    const durationText = formatDurationVerbose(session.duration);
    const timeAgoText = timeAgo(new Date(session.end_time || session.start_time));
    
    const noteHtml = session.note 
      ? `<div class="log-note-bubble">📝 ${session.note}</div>` 
      : '';

    el.innerHTML = `
      <div class="log-marker"></div>
      <div class="log-content">
        <div class="log-header-row">
           <div class="log-text">
             <strong>You</strong> completed ${durationText} of deep work.
             <span class="log-time-ago">${timeAgoText}</span>
           </div>
           <button class="delete-btn" onclick="deleteSession(${session.id})" title="Delete session">×</button>
        </div>
        ${noteHtml}
      </div>
    `;
    logsDiv.appendChild(el);
  });
}

async function deleteSession(id) {
  if (!confirm('Are you sure you want to delete this session?')) return;
  
  const res = await fetch(`/api/sessions/${id}`, { method: 'DELETE' });
  if (res.ok) {
    fetchSessions();
  }
}

function formatDurationVerbose(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  
  const parts = [];
  if (h > 0) parts.push(`${h} hours`);
  if (m > 0 || h === 0) parts.push(`${m} minutes`);
  
  return parts.join(' and ');
}

function timeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " years ago";
  
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " months ago";
  
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " days ago";
  
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " hours ago";
  
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " minutes ago";
  
  return "just now";
}

function renderHeatmap(sessions) {
  heatmapDiv.innerHTML = '';
  heatmapMonthsDiv.innerHTML = '';
  
  // 1. Aggregate duration by day (YYYY-MM-DD)
  const dailyData = {};
  sessions.forEach(s => {
    const date = new Date(s.start_time).toISOString().split('T')[0];
    dailyData[date] = (dailyData[date] || 0) + s.duration;
  });

  // 2. Setup dates
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - (52 * 7)); // Go back 52 weeks
  
  // Adjust to previous Sunday to align grid rows
  while (startDate.getDay() !== 0) { // 0 is Sunday
     // If we want Mon-start like EU, we'd change this. GitHub uses Sun-start usually.
     // But user screenshot shows Tues/Thurs/Sat imply Sun-start or Mon-start. 
     // Standard JS getDay(): 0=Sun, 1=Mon.
     // If we align to Sunday start:
     startDate.setDate(startDate.getDate() - 1);
  }
  
  // 3. Generate Grid & Month Labels
  let currentDate = new Date(startDate);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  // We need to track where each month starts in terms of columns
  // Each column is a week.
  
  let currentMonthIndex = -1;
  
  // Total weeks to show = 53
  for (let week = 0; week < 53; week++) {
    // Check month of the first day of this week (which is Sunday/Monday)
    // Actually, GitHub puts the month label over the column where the month *mostly* is or starts.
    // Simplification: Check month of the first day of the week.
    const monthIndex = currentDate.getMonth();
    
    if (monthIndex !== currentMonthIndex) {
      // New month started in this week column
      // Add label
      const label = document.createElement('div');
      label.className = 'heatmap-month-label';
      label.textContent = months[monthIndex];
      // Calculate position relative to container width? No, in grid/flex layout.
      // We can just use flex and `margin-right`. 
      // But accurate alignment requires knowing how many weeks the previous month took.
      
      // Better approach: Absolute positioning based on column index * (13px + gap)
      // Or just append empty spacers?
      
      // Let's use absolute positioning relative to container for labels, or just grid.
      // The container `heatmap-months` is flex.
      
      // Let's try this:
      // The months container is separate. We need to place text at specific offsets.
      // offset = weekIndex * 16px (13px width + 3px gap)
      
      label.style.position = 'absolute';
      label.style.left = `${week * 12}px`;
      heatmapMonthsDiv.appendChild(label);
      
      currentMonthIndex = monthIndex;
    }
    
    // Render 7 days for this week column
    for (let day = 0; day < 7; day++) {
       const dateStr = currentDate.toISOString().split('T')[0];
       const duration = dailyData[dateStr] || 0;
       
       const el = document.createElement('div');
       el.className = `day-cell ${getLevel(duration)}`;
       // Tooltip: "2 hours on Dec 9, 2025"
       const tooltipDate = currentDate.toLocaleDateString('en-US', {month:'short', day:'numeric', year:'numeric'});
       el.title = `${formatDurationVerbose(duration)} on ${tooltipDate}`;
       
       // Add to grid
       // The grid is auto-flow column. So just appending fills column first (7 rows) then next column.
       heatmapDiv.appendChild(el);
       
       currentDate.setDate(currentDate.getDate() + 1);
    }
  }
  
  // Ensure the months container has relative positioning to work
  heatmapMonthsDiv.style.position = 'relative';
}

function getLevel(seconds) {
  if (seconds === 0) return 'level-0';
  const hours = seconds / 3600;
  if (hours < 1) return 'level-1'; 
  if (hours < 2) return 'level-2'; 
  if (hours < 4) return 'level-3'; 
  return 'level-4';                
}
