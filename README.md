# mooSpots 🚲📍

mooSpots is a front-end web app designed to help UC Davis students quickly locate nearby bike parking spots based on their current location. Whether you're rushing to class or just trying to find an open rack, mooSpots uses location-based sorting to guide you to the nearest available bike parking.

## 🚀 About the Project

This project started as a self-learning exercise in React, inspired by a tutorial on place-picking apps that sorted cities by proximity. Realizing the same concept could solve a daily problem at UC Davis, I created mooSpots to help students find open bike racks around campus.

## 🛠 Tech Stack

- **React.js** with Hooks (`useState`, `useEffect`, `useRef`, `useCallback`)
- **Geolocation API** for user location
- **Haversine formula** to compute distances
- **Styled Components** for clean, intuitive UI
- **Vite** for fast bundling and development
- **Node.js** as the runtime environment

## 📍 Core Features

- Detects and uses the user's current location
- Sorts bike racks by distance using the Haversine algorithm
- Intuitive, mobile-friendly interface
- Includes a **Refresh** button to re-capture location and re-sort results
- Clean and responsive design with Styled Components

## ⚠️ Challenges & Solutions

### Location Permission Handling

One of the biggest hurdles was handling browser location permissions. Most browsers remember when permission is granted, and won’t prompt again — which made testing or re-running location detection tricky.

**Solution:**  
Instead of forcing the permission dialog or relying on browser behavior, a **Refresh** button was implemented. When clicked, it:
1. Re-triggers the Geolocation API
2. Re-calculates distances via the Haversine formula
3. Re-sorts the bike rack list

This made the app feel more responsive and user-driven without violating browser security practices.

## 🧪 Getting Started

To run the app locally:

```bash
# Clone the repository
git clone https://github.com/your-username/moospots.git
cd moospots

# Install dependencies
npm install

# Run the development server
npm run dev
