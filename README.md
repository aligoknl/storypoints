# AllStoryPoints

AllStoryPoints is a small app I built to make planning poker sessions easier.
If you’ve ever done sprint planning, you know the drill: everyone votes on story points, then the team discusses.
This app lets you do that in real-time, with a clean UI and a couple of nice touches like timers, and even a Pokémon easter egg if everyone agrees 😉.

---
## Demo
https://allstorypoints.netlify.app/
---

## What it does

- Create or join a room with your team
- Everyone picks a card from the deck (Fibonacci, coffee, ? … you know the game)
- Votes stay hidden until someone hits **Reveal**
- Once revealed, everyone’s cards flip at the same time
- The app shows the **average** of all numeric votes (ignoring people who didn’t vote)
- Bonus: if everyone picks the same number → a little Pokémon surprise 🐾

---

## Tech I used

- **Vue 3 + TypeScript** – main frontend
- **Pinia** – state management
- **PrimeVue + Tailwind** – UI and styling
- **Firebase Firestore** – realtime sync between players
- **Vite** – fast dev/build setup

---

## Getting started

Clone the repo:

```bash
git clone https://github.com/aligoknl/storypoints.git
cd storypoints