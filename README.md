# Bolt Rumble

An 8-bit robot battler you play in the browser. Snap on parts, charge your core, win the rumble!

- **Arcade Ladder**: 20 rounds in a row on changing arenas. Every win takes a part from your rival; bosses give whole robots and chips.
- **Workshop**: mix the heads, arms, legs, cores and chips you own.
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
- **Personalities**: each core fights in its own style (Shooter, Defender, Medic, Berserker, Sniper, Interrupter). Enemy robots and the AUTO button follow it.
- **Animation**: robots are jointed puppets, redrawn as pixel art every frame. Each leg type moves its own way: walking legs step, treads roll, spider legs scuttle, wings flap over a jet, roller legs skate, fish tails swish. Guns are carried low and raised to fire with recoil. Melee robots wind up, dash over, swing and hop back. Hits knock robots back, misses become dodges, broken arms fall off, and a KO sends the head flying.
- **Music**: three original chiptune songs (menus, battle, boss) on GBA-style voices: square lead, arpeggio, triangle bass and noise drums.
- **Friendly UI**: new players are pointed to Arcade, the move list says what each move does, a message tells you who is waiting for an order, phones get big tap targets, and the online lobby has Copy and Cancel.
- **Smooth motion** (lessons from the SpriteCast animation plugin): heel-to-toe foot rolls while walking, a seamless 4-second idle with two breaths and a weight shift, springy follow-through on arms and head (antennae, ears and horns lag behind), weapon swing trails, level eyes while the body rocks, and stronger ground shadows.
- **Different parts look different**: every arm carries its own weapon (blaster, twin gun, rifle, cannon, beam emitter, fist, blade, claw, drill, hammer or shield), and every head has its own crest plus a gadget for its move.

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
- `js/rig.js`: jointed robots. Limbs are shapes placed at joint angles (with leg IK), rasterised with outlines and 3-tone shading in a 15-bit palette.
- `js/pixel.js`: menu pictures of the robots, Scale2x and the pixel font.
- `js/scene.js`: 240×160 canvas battle scene with effects.
- `js/ui.js`: menus, workshop, battle controller, arcade and versus modes.
- `js/net.js`: online play over WebRTC via [PeerJS](https://peerjs.com/). Its public broker only introduces the two players; the match data then goes directly between them.
- Progress is saved in the browser's localStorage.

Bolt Rumble is a fan-made, non-commercial game with its own original robots, names and art.
