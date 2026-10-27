# mooSpots 🚲📍

**Because in Davis, there are a gazillion bike racks, a gazillion bikes, and — naturally — now an app for that.**

[Live Demo](https://moospots.vercel.app)

mooSpots is a location-based web app that helps UC Davis students find the *nearest* bike racks. Not the best ones. Not the shaded ones. Just the *closest*. 

Was this app necessary? Absolutely not.  
Did I build it anyway? You bet.

## 🤔 Why mooSpots?

It started as a self-taught React journey, where I was messing around with geolocation tutorials. Then I thought, *"Hey, what if I made something completely unnecessary but oddly useful — like a bike rack finder?"* So here we are.


## 🛠️ Built With

- **React.js** (with Hooks like `useState`, `useEffect`, `useRef`, and custom `useMooSpots` / `useNavigation`)
- **Leaflet** – the map, plus a radar-scan pin drop because why not
- **OSRM on OpenStreetMap** – real walking and biking routes for turn-by-turn, no API key
- **Browser Geolocation API** – for that Big Brother vibe
- **Haversine Formula** – math stuff to measure distances
- **Plain CSS with design tokens** – warm palette, UC Davis blue + gold, no framework
- **Vite** – fast dev builds because life is short
- **Node.js** – just vibing in the background

## 📦 Features

- **Parking spots, not 1,000 identical racks.** Racks are grouped into 123 named spots ("Wellman Hall", "Silo") so you pick a place, not a pole
- **Turn-by-turn directions** that follow you as you walk or ride, reroute when you wander, and end with one tap (or Esc, or swiping back)
- **Phone:** an animated intro, then a map-first, one-thumb flow with a bottom sheet
- **Desktop:** a GIS-style full-screen map: drop a pin anywhere (or right-click) and watch it scan for the closest spots; basemap switcher, an individual-racks layer, live coordinates
- Individual racks are still there, one tap deeper, for when you care which one
- Bike/walk toggle that remembers your choice

## 🗺️ The data

`src/bike-rack.js` is the raw UC Davis rack inventory and stays untouched. `npm run zones` turns it into `src/data/zones.js`:

1. **Clean**: drops entries with 0 spaces (54 of them, all one block of "Other" racks) and the one marked *Removed*.
2. **Cluster**: complete-linkage clustering capped at a 140 m diameter, so every rack in a spot is within ~2 minutes' walk of every other and one travel time is honest for the whole spot.
3. **Name**: each spot is named after the most recognizable nearby campus building from OpenStreetMap (cached in `scripts/campus-buildings.json`; `npm run zones -- --fetch` refreshes it).

Heads-up: the inventory has exactly 1,000 rows (`p1`–`p1000`), which smells like an export capped at 1,000 records. If the source has more racks, re-export and rerun `npm run zones`.

## 🧠 Lessons Learned

### 🚫 Location Permissions Drama

One of the trickiest things? Browsers get clingy. Once they have your location permission, they stop asking. Which sounds great until you're testing and nothing updates.

**Solution?**  
Add a ✨Refresh✨ button.  
Let users manually trigger the geolocation API again, re-run the Haversine calculations, and boom — updated results. No extra prompts, no security risks. Just good ol' fashioned button mashing.

## 🧪 Running Locally

Wanna see the chaos under the hood?

```bash
# Clone the project
git clone https://github.com/your-username/moospots.git
cd moospots

# Install dependencies
npm install

# Run it
npm run dev

# Test turn-by-turn at your desk: a fake rider walks the route (value = speed multiplier)
open "http://localhost:5173/?sim=4"
```
🔮 Future Features
Show bike rack availability (one day... when I make friends with IoT sensors)


Favorite rack saving (for creatures of habit)

Expansion beyond Davis (jk, Davis is the bike capital of the world)

💙 With Love, For Aggies
This app was made with a whole lotta love (and just a little sarcasm) for the UC Davis community. Because let’s be honest — between navigating construction, cows, and overdue essays — finding a bike rack shouldn't be a crisis.

Built by a student, for students. Powered by javaScript-fueled determination, a borderline unhealthy love of React and a passionate hatred for CSS.
