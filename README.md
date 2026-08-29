# mooSpots 🚲📍

**Because in Davis, there are a gazillion bike racks, a gazillion bikes, and — naturally — now an app for that.**

[Live Demo](https://moospots.vercel.app)

mooSpots is a location-based web app that helps UC Davis students find the *nearest* bike racks. Not the best ones. Not the shaded ones. Just the *closest*. 

Was this app necessary? Absolutely not.  
Did I build it anyway? You bet.

## 🤔 Why mooSpots?

It started as a self-taught React journey, where I was messing around with geolocation tutorials. Then I thought, *"Hey, what if I made something completely unnecessary but oddly useful — like a bike rack finder?"* So here we are.


## 🛠️ Built With

- **React.js** (with Hooks like `useState`, `useEffect`, `useRef`, and a custom `useNearestRacks`)
- **Leaflet** – an interactive map that frames your closest racks with numbered pins
- **Browser Geolocation API** – for that Big Brother vibe
- **Haversine Formula** – math stuff to measure distances
- **Plain CSS with design tokens** – warm palette, UC Davis blue + gold, no framework
- **Vite** – fast dev builds because life is short
- **Node.js** – just vibing in the background

## 📦 Features

- Automatically finds your current location — assuming your browser isn't shy
- Ranks the closest bike racks using real math™ and shows them on a live map
- Numbered pins + result cards with walk/ride estimates and a one-tap Navigate
- Refresh button to re-scan when you panic-locate your next class
- "Use a campus spot" fallback so you can browse without sharing location
- Clean, mobile-friendly UI designed for minimal decision-making under stress

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
🔮 Future Features
Show bike rack availability (one day... when I make friends with IoT sensors)

Routed distances instead of straight-line (if a routing API is ever worth it)

Favorite rack saving (for creatures of habit)

Expansion beyond Davis (jk, Davis is the bike capital of the world)

💙 With Love, For Aggies
This app was made with a whole lotta love (and just a little sarcasm) for the UC Davis community. Because let’s be honest — between navigating construction, cows, and overdue essays — finding a bike rack shouldn't be a crisis.

Built by a student, for students. Powered by javaScript-fueled determination, a borderline unhealthy love of React and a passionate hatred for CSS.
