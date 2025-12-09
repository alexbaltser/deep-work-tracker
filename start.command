#!/bin/bash
cd "$(dirname "$0")"
echo "Запускаю Deep Work Tracker..."
# Open browser after 2 seconds
(sleep 2 && open "http://localhost:3000") &
# Start server
npm start
