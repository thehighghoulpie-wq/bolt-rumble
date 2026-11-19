# Bolt Rumble

An 8-bit robot battler you play in the browser. Snap on parts, charge your core, win the rumble!

- **Arcade Ladder**: 20 rounds in a row. Every win unlocks a new robot.
- **Workshop**: mix heads, arms, legs and cores from every robot you've unlocked.
- **Versus on this device**: two players, one screen.
- **Versus a friend online**: create a room, send the 5-letter code, play from two devices.

## Systems
- **Cores** level up (bronze, silver +, gold MAX) and unlock up to three specials. Each core boosts its favourite part types.
- **Chips**: one gem per core with a passive bonus. Bosses drop them; the shop sells them.
- **Sub-skills** on parts: SNIPE (pick which enemy part to hit, faster charge), RECKLESS (splash damage), ANTI-AIR and ANTI-SEA.
- **Transform**: a robot in a full matching set can transform. It moves faster, and every hit is shared over its whole body.
- **Leg types and terrain**: seven arenas, each grading the six leg types A to D. Tanks are armoured, crawlers hit hard up close, wheels shoot well.
- **Spoils**: win a part from every rival you beat. Bosses hand over a whole robot.
- **Collection and shop**: an album of all robots, and bolts to buy parts and chips.
- **Bolt Watch**: a mystery robot that assembles itself from the steps your robots take in battle.

## How a battle works
Each team has three robots. The ★ leader stands in the middle, and if its head breaks, that team loses. A robot waits on its command line until you give it an order. Then it walks to the centre while charging, does its move, and walks back to cool down. Faster legs walk faster. Every part has its own armor: broken arms can't be used, broken legs slow you down, and a broken head knocks the robot out.

## Run it
It's a static site with no build step. Serve the folder with any web server, for example:

```
python -m http.server 8000
```

Then open http://localhost:8000. Add `?reset` to the URL to wipe local progress.

## Tests
```
node tests/engine.test.js
```
These run 1,500+ simulated battles and check: no crashes, sensible battle length, tier balance, every robot winnable in its tier, and that two copies of a battle stay identical when given the same commands (this is what online play relies on).

## Tech
- `js/engine.js`: deterministic real-time battle engine (no DOM).
- `js/pixel.js`: hand-drawn pixel part templates, composited into 32×32 robots with a 15-bit palette.
- `js/scene.js`: 240×160 canvas battle scene with effects.
- `js/ui.js`: menus, workshop, battle controller, arcade and versus modes.
- `js/net.js`: online play over WebRTC via [PeerJS](https://peerjs.com/). Its public broker only introduces the two players; the match data then goes directly between them.
- Progress is saved in the browser's localStorage.

Bolt Rumble is a fan-made, non-commercial game with its own original robots, names and art.
