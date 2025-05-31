# Multi-City Weather Comparison Table (WEAT-1)

This project implements a beautiful, responsive, glassmorphism UI to compare the current weather of 3 or more cities using Open-Meteo and OpenStreetMap APIs. Built for York Hackathon 2025 - Team 11.

## Features
- **Search & compare** weather for 3+ cities at once
- **Animated, responsive table** with glass effect
- **Error-resilient:** 3-retry logic for all APIs
- **Loading skeletons & spinner**
- **Keyboard accessible, ARIA safe**
- **Flag icons per country**
- **Clean modern UI (HTML/CSS/JS only)**

## Setup Instructions
1. Run `npm install`
2. Launch server: `npm start` (browse http://localhost:3000)
3. Enter 3 or more city names (comma separated)
4. Enjoy the comparison table with live weather

## APIs Used
- [Nominatim OpenStreetMap (geocode)](https://nominatim.openstreetmap.org/)
- [Open-Meteo Weather](https://open-meteo.com/)

## Testing Checklist
- [ ] Loads and is responsive on desktop/mobile
- [ ] At least 3 valid cities renders the table
- [ ] Errors are shown for bad/no cities
- [ ] Loading animation appears
- [ ] Table columns animate in
- [ ] Keyboard navigation works

## File Structure
- **index.html** – main entry + imports
- **styles/** – `main.css`, `components.css`, `animations.css`
- **scripts/** – `main.js`, `api.js`, `utils.js`
- **assets/** – images/icons (flag: emoji-only here)

## Dev Notes
- Branch: `dare2win`
- PRs auto-linked to Jira ticket WEAT-1

---
For issues, create a Jira ticket on the WEAT board.
