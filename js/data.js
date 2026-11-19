// Generated from design/original-roster.json (Bolt Rumble roster)
export const DATA = {
 "title": "Bolt Rumble",
 "tagline": "Snap on parts. Charge your core. Win the rumble!",
 "cores": [
  {
   "id": "c1",
   "name": "Blast Core",
   "color": "#ff5a36",
   "special": "burst",
   "desc": "One huge hit that ignores a bit of armor"
  },
  {
   "id": "c2",
   "name": "Wall Core",
   "color": "#3db8ff",
   "special": "shield",
   "desc": "Halves all damage for a few turns"
  },
  {
   "id": "c3",
   "name": "Mend Core",
   "color": "#46e08a",
   "special": "repair",
   "desc": "Fixes every broken part a little"
  },
  {
   "id": "c4",
   "name": "Surge Core",
   "color": "#ffd23f",
   "special": "overclock",
   "desc": "Boosts power, then you cool down"
  },
  {
   "id": "c5",
   "name": "Eagle Core",
   "color": "#c77dff",
   "special": "focus",
   "desc": "Next attacks never miss"
  },
  {
   "id": "c6",
   "name": "Zip Core",
   "color": "#ff7ad9",
   "special": "haste",
   "desc": "Act twice in a row"
  }
 ],
 "robots": [
  {
   "id": "r01",
   "name": "SPARKY",
   "tier": 1,
   "body": "biped",
   "colors": {
    "main": "#ffd23f",
    "accent": "#ff8a1f",
    "eye": "#ffffff"
   },
   "flavor": "Zaps first, asks questions never.",
   "head": {
    "name": "Spark Lens",
    "kind": "laser",
    "armor": 30,
    "power": 15,
    "uses": 4
   },
   "rarm": {
    "name": "Zap Rod",
    "kind": "shoot",
    "armor": 35,
    "power": 18,
    "accuracy": 75
   },
   "larm": {
    "name": "Pop Fist",
    "kind": "strike",
    "armor": 30,
    "power": 14,
    "accuracy": 70
   },
   "legs": {
    "name": "Hop Boots",
    "armor": 50,
    "speed": 45,
    "evasion": 15
   }
  },
  {
   "id": "r02",
   "name": "FLUTTER",
   "tier": 1,
   "body": "flyer",
   "colors": {
    "main": "#7df9ff",
    "accent": "#ff7ad9",
    "eye": "#fff36b"
   },
   "flavor": "Light as a sock, twice as annoying.",
   "head": {
    "name": "Peek Visor",
    "kind": "scan",
    "armor": 25,
    "power": 5,
    "uses": 5
   },
   "rarm": {
    "name": "Feather Gun",
    "kind": "shoot",
    "armor": 25,
    "power": 14,
    "accuracy": 85
   },
   "larm": {
    "name": "Wing Slap",
    "kind": "strike",
    "armor": 25,
    "power": 12,
    "accuracy": 70
   },
   "legs": {
    "name": "Puff Wings",
    "armor": 35,
    "speed": 70,
    "evasion": 35
   }
  },
  {
   "id": "r03",
   "name": "CLUNK",
   "tier": 1,
   "body": "tank",
   "colors": {
    "main": "#9fb4c7",
    "accent": "#ff5a36",
    "eye": "#ffe14d"
   },
   "flavor": "Slow, sturdy, and proud of the dents.",
   "head": {
    "name": "Iron Bucket",
    "kind": "shield",
    "armor": 45,
    "power": 0,
    "uses": 3
   },
   "rarm": {
    "name": "Thump Gun",
    "kind": "shoot",
    "armor": 55,
    "power": 20,
    "accuracy": 60
   },
   "larm": {
    "name": "Plate Guard",
    "kind": "guard",
    "armor": 60,
    "power": 0,
    "accuracy": 60
   },
   "legs": {
    "name": "Slow Treads",
    "armor": 80,
    "speed": 20,
    "evasion": 5
   }
  },
  {
   "id": "r04",
   "name": "SKITTER",
   "tier": 1,
   "body": "crawler",
   "colors": {
    "main": "#9dff4a",
    "accent": "#2f6bff",
    "eye": "#ff4f6d"
   },
   "flavor": "Six legs, zero patience.",
   "head": {
    "name": "Bug Eye",
    "kind": "laser",
    "armor": 25,
    "power": 14,
    "uses": 4
   },
   "rarm": {
    "name": "Pinch Claw",
    "kind": "strike",
    "armor": 35,
    "power": 20,
    "accuracy": 70
   },
   "larm": {
    "name": "Snip Claw",
    "kind": "strike",
    "armor": 30,
    "power": 16,
    "accuracy": 70
   },
   "legs": {
    "name": "Scuttle Legs",
    "armor": 45,
    "speed": 55,
    "evasion": 20
   }
  },
  {
   "id": "r05",
   "name": "ROLLO",
   "tier": 1,
   "body": "wheels",
   "colors": {
    "main": "#ff8a1f",
    "accent": "#00e0c6",
    "eye": "#ffffff"
   },
   "flavor": "Always rolling, never reading the map.",
   "head": {
    "name": "Dash Cam",
    "kind": "scan",
    "armor": 25,
    "power": 5,
    "uses": 5
   },
   "rarm": {
    "name": "Bonk Arm",
    "kind": "strike",
    "armor": 35,
    "power": 17,
    "accuracy": 70
   },
   "larm": {
    "name": "Pea Shooter",
    "kind": "shoot",
    "armor": 30,
    "power": 12,
    "accuracy": 80
   },
   "legs": {
    "name": "Zoom Wheels",
    "armor": 50,
    "speed": 60,
    "evasion": 20
   }
  },
  {
   "id": "r06",
   "name": "BUBBLES",
   "tier": 1,
   "body": "swimmer",
   "colors": {
    "main": "#4fc3ff",
    "accent": "#fff36b",
    "eye": "#ff4f9a"
   },
   "flavor": "Smells like pond. Cheers like a champ.",
   "head": {
    "name": "Soap Dome",
    "kind": "repair",
    "armor": 30,
    "power": 0,
    "uses": 3
   },
   "rarm": {
    "name": "Splash Gun",
    "kind": "shoot",
    "armor": 30,
    "power": 13,
    "accuracy": 80
   },
   "larm": {
    "name": "Drip Beam",
    "kind": "beam",
    "armor": 30,
    "power": 12,
    "accuracy": 75
   },
   "legs": {
    "name": "Flipper Fins",
    "armor": 45,
    "speed": 45,
    "evasion": 25
   }
  },
  {
   "id": "r07",
   "name": "BOLTBOY",
   "tier": 1,
   "body": "tank",
   "colors": {
    "main": "#ff4f6d",
    "accent": "#ffd23f",
    "eye": "#7df9ff"
   },
   "flavor": "Rolls in loud. Leaves louder.",
   "head": {
    "name": "Siren Top",
    "kind": "missile",
    "armor": 35,
    "power": 18,
    "uses": 3
   },
   "rarm": {
    "name": "Rocket Pipe",
    "kind": "shoot",
    "armor": 45,
    "power": 22,
    "accuracy": 60
   },
   "larm": {
    "name": "Rivet Gun",
    "kind": "shoot",
    "armor": 40,
    "power": 14,
    "accuracy": 70
   },
   "legs": {
    "name": "Rust Tracks",
    "armor": 70,
    "speed": 25,
    "evasion": 5
   }
  },
  {
   "id": "r08",
   "name": "DOTTY",
   "tier": 1,
   "body": "wheels",
   "colors": {
    "main": "#c77dff",
    "accent": "#9dff4a",
    "eye": "#fff36b"
   },
   "flavor": "Polka-dot paint, serious sparkle.",
   "head": {
    "name": "Dot Lamp",
    "kind": "laser",
    "armor": 25,
    "power": 13,
    "uses": 5
   },
   "rarm": {
    "name": "Beam Dot",
    "kind": "beam",
    "armor": 30,
    "power": 15,
    "accuracy": 80
   },
   "larm": {
    "name": "Buddy Shield",
    "kind": "guard",
    "armor": 40,
    "power": 0,
    "accuracy": 60
   },
   "legs": {
    "name": "Dot Wheels",
    "armor": 45,
    "speed": 50,
    "evasion": 20
   }
  },
  {
   "id": "r09",
   "name": "TWINKLE",
   "tier": 2,
   "body": "biped",
   "colors": {
    "main": "#ff7ad9",
    "accent": "#7df9ff",
    "eye": "#ffffff"
   },
   "flavor": "A sniper with a sparkle problem.",
   "head": {
    "name": "Star Scope",
    "kind": "laser",
    "armor": 30,
    "power": 22,
    "uses": 4
   },
   "rarm": {
    "name": "Long Beam",
    "kind": "beam",
    "armor": 35,
    "power": 30,
    "accuracy": 90
   },
   "larm": {
    "name": "Glint Pistol",
    "kind": "shoot",
    "armor": 30,
    "power": 20,
    "accuracy": 85
   },
   "legs": {
    "name": "Tippy Toes",
    "armor": 45,
    "speed": 50,
    "evasion": 25
   }
  },
  {
   "id": "r10",
   "name": "ZIPPER",
   "tier": 2,
   "body": "flyer",
   "colors": {
    "main": "#fff36b",
    "accent": "#ff4f6d",
    "eye": "#2f6bff"
   },
   "flavor": "Gone before you finish blinking.",
   "head": {
    "name": "Zip Sight",
    "kind": "scan",
    "armor": 30,
    "power": 8,
    "uses": 5
   },
   "rarm": {
    "name": "Jab Wing",
    "kind": "strike",
    "armor": 35,
    "power": 27,
    "accuracy": 75
   },
   "larm": {
    "name": "Peck Gun",
    "kind": "shoot",
    "armor": 30,
    "power": 19,
    "accuracy": 80
   },
   "legs": {
    "name": "Turbo Wings",
    "armor": 45,
    "speed": 85,
    "evasion": 40
   }
  },
  {
   "id": "r11",
   "name": "MOSSBACK",
   "tier": 2,
   "body": "crawler",
   "colors": {
    "main": "#6dff8f",
    "accent": "#ffa63d",
    "eye": "#ff4f6d"
   },
   "flavor": "Grows on you. Literally. Ferns.",
   "head": {
    "name": "Leaf Hood",
    "kind": "repair",
    "armor": 40,
    "power": 0,
    "uses": 4
   },
   "rarm": {
    "name": "Vine Whip",
    "kind": "strike",
    "armor": 50,
    "power": 24,
    "accuracy": 70
   },
   "larm": {
    "name": "Moss Guard",
    "kind": "guard",
    "armor": 55,
    "power": 0,
    "accuracy": 60
   },
   "legs": {
    "name": "Root Legs",
    "armor": 75,
    "speed": 30,
    "evasion": 10
   }
  },
  {
   "id": "r12",
   "name": "TIDEPOOL",
   "tier": 2,
   "body": "swimmer",
   "colors": {
    "main": "#00e0c6",
    "accent": "#ff8a1f",
    "eye": "#ffffff"
   },
   "flavor": "Splashy support with a heart of foam.",
   "head": {
    "name": "Spa Dome",
    "kind": "repair",
    "armor": 40,
    "power": 0,
    "uses": 5
   },
   "rarm": {
    "name": "Jet Nozzle",
    "kind": "shoot",
    "armor": 40,
    "power": 22,
    "accuracy": 80
   },
   "larm": {
    "name": "Bubble Wall",
    "kind": "guard",
    "armor": 50,
    "power": 0,
    "accuracy": 60
   },
   "legs": {
    "name": "Wave Fins",
    "armor": 60,
    "speed": 50,
    "evasion": 25
   }
  },
  {
   "id": "r13",
   "name": "DRIFTER",
   "tier": 2,
   "body": "wheels",
   "colors": {
    "main": "#ff5a36",
    "accent": "#ffffff",
    "eye": "#7df9ff"
   },
   "flavor": "Takes every corner sideways. On purpose.",
   "head": {
    "name": "Nitro Light",
    "kind": "laser",
    "armor": 30,
    "power": 20,
    "uses": 4
   },
   "rarm": {
    "name": "Rammer",
    "kind": "strike",
    "armor": 45,
    "power": 30,
    "accuracy": 75
   },
   "larm": {
    "name": "Slide Kick",
    "kind": "strike",
    "armor": 40,
    "power": 24,
    "accuracy": 75
   },
   "legs": {
    "name": "Drift Tires",
    "armor": 55,
    "speed": 75,
    "evasion": 30
   }
  },
  {
   "id": "r14",
   "name": "BRICKHEAD",
   "tier": 2,
   "body": "tank",
   "colors": {
    "main": "#ffa63d",
    "accent": "#4fc3ff",
    "eye": "#ffffff"
   },
   "flavor": "Hard head, soft spot for cupcakes.",
   "head": {
    "name": "Brick Dome",
    "kind": "shield",
    "armor": 65,
    "power": 0,
    "uses": 4
   },
   "rarm": {
    "name": "Wrecker",
    "kind": "strike",
    "armor": 70,
    "power": 32,
    "accuracy": 65
   },
   "larm": {
    "name": "Brick Wall",
    "kind": "guard",
    "armor": 75,
    "power": 0,
    "accuracy": 60
   },
   "legs": {
    "name": "Heavy Treads",
    "armor": 95,
    "speed": 22,
    "evasion": 5
   }
  },
  {
   "id": "r15",
   "name": "JESTER",
   "tier": 2,
   "body": "biped",
   "colors": {
    "main": "#c77dff",
    "accent": "#ffd23f",
    "eye": "#9dff4a"
   },
   "flavor": "Pranks first, battles second.",
   "head": {
    "name": "Bell Cap",
    "kind": "missile",
    "armor": 30,
    "power": 24,
    "uses": 3
   },
   "rarm": {
    "name": "Confetti Gun",
    "kind": "shoot",
    "armor": 35,
    "power": 25,
    "accuracy": 70
   },
   "larm": {
    "name": "Rubber Fist",
    "kind": "strike",
    "armor": 35,
    "power": 22,
    "accuracy": 75
   },
   "legs": {
    "name": "Springy Legs",
    "armor": 50,
    "speed": 60,
    "evasion": 30
   }
  },
  {
   "id": "r16",
   "name": "GALEHAWK",
   "tier": 3,
   "body": "flyer",
   "colors": {
    "main": "#4fc3ff",
    "accent": "#ffffff",
    "eye": "#ff5a36"
   },
   "flavor": "Rides the storm and critiques its form.",
   "head": {
    "name": "Storm Eye",
    "kind": "missile",
    "armor": 40,
    "power": 30,
    "uses": 3
   },
   "rarm": {
    "name": "Gale Cannon",
    "kind": "beam",
    "armor": 50,
    "power": 36,
    "accuracy": 80
   },
   "larm": {
    "name": "Talon Swipe",
    "kind": "strike",
    "armor": 45,
    "power": 32,
    "accuracy": 80
   },
   "legs": {
    "name": "Jet Wings",
    "armor": 60,
    "speed": 80,
    "evasion": 35
   }
  },
  {
   "id": "r17",
   "name": "PINCHER",
   "tier": 3,
   "body": "crawler",
   "colors": {
    "main": "#ff4f6d",
    "accent": "#7df9ff",
    "eye": "#ffe14d"
   },
   "flavor": "Two big claws. Zero chill.",
   "head": {
    "name": "Crab Visor",
    "kind": "laser",
    "armor": 45,
    "power": 24,
    "uses": 4
   },
   "rarm": {
    "name": "Mega Claw",
    "kind": "strike",
    "armor": 70,
    "power": 40,
    "accuracy": 75
   },
   "larm": {
    "name": "Snap Claw",
    "kind": "strike",
    "armor": 65,
    "power": 34,
    "accuracy": 75
   },
   "legs": {
    "name": "Crab Legs",
    "armor": 80,
    "speed": 50,
    "evasion": 15
   }
  },
  {
   "id": "r18",
   "name": "SPLASHER",
   "tier": 3,
   "body": "swimmer",
   "colors": {
    "main": "#2f6bff",
    "accent": "#ffd23f",
    "eye": "#7dff9a"
   },
   "flavor": "Makes waves, then makes puddles.",
   "head": {
    "name": "Brine Lens",
    "kind": "scan",
    "armor": 40,
    "power": 12,
    "uses": 6
   },
   "rarm": {
    "name": "Tide Beam",
    "kind": "beam",
    "armor": 50,
    "power": 34,
    "accuracy": 85
   },
   "larm": {
    "name": "Surf Shot",
    "kind": "shoot",
    "armor": 45,
    "power": 30,
    "accuracy": 80
   },
   "legs": {
    "name": "Torpedo Fins",
    "armor": 65,
    "speed": 65,
    "evasion": 30
   }
  },
  {
   "id": "r19",
   "name": "TURBO TOM",
   "tier": 3,
   "body": "wheels",
   "colors": {
    "main": "#9dff4a",
    "accent": "#ff4f6d",
    "eye": "#ffffff"
   },
   "flavor": "Speed first. Brakes are for later.",
   "head": {
    "name": "Rev Light",
    "kind": "laser",
    "armor": 40,
    "power": 26,
    "uses": 4
   },
   "rarm": {
    "name": "Ram Lance",
    "kind": "strike",
    "armor": 60,
    "power": 42,
    "accuracy": 80
   },
   "larm": {
    "name": "Boost Fist",
    "kind": "strike",
    "armor": 55,
    "power": 34,
    "accuracy": 80
   },
   "legs": {
    "name": "Rocket Wheels",
    "armor": 65,
    "speed": 88,
    "evasion": 35
   }
  },
  {
   "id": "r20",
   "name": "FORTRESS",
   "tier": 3,
   "body": "tank",
   "colors": {
    "main": "#b8c4d6",
    "accent": "#ff8a1f",
    "eye": "#ff4f6d"
   },
   "flavor": "Why dodge when you can be a wall?",
   "head": {
    "name": "Tower Top",
    "kind": "shield",
    "armor": 70,
    "power": 0,
    "uses": 5
   },
   "rarm": {
    "name": "Siege Cannon",
    "kind": "shoot",
    "armor": 80,
    "power": 40,
    "accuracy": 65
   },
   "larm": {
    "name": "Bunker Plate",
    "kind": "guard",
    "armor": 85,
    "power": 0,
    "accuracy": 60
   },
   "legs": {
    "name": "Fort Tracks",
    "armor": 105,
    "speed": 20,
    "evasion": 5
   }
  },
  {
   "id": "r21",
   "name": "NINJABIT",
   "tier": 3,
   "body": "biped",
   "colors": {
    "main": "#7a5cff",
    "accent": "#00e0c6",
    "eye": "#ff4f9a"
   },
   "flavor": "Silent steps, extremely loud snacks.",
   "head": {
    "name": "Shadow Mask",
    "kind": "scan",
    "armor": 35,
    "power": 14,
    "uses": 6
   },
   "rarm": {
    "name": "Blade Arm",
    "kind": "strike",
    "armor": 50,
    "power": 40,
    "accuracy": 85
   },
   "larm": {
    "name": "Star Thrower",
    "kind": "shoot",
    "armor": 45,
    "power": 30,
    "accuracy": 85
   },
   "legs": {
    "name": "Silent Legs",
    "armor": 55,
    "speed": 80,
    "evasion": 45
   }
  },
  {
   "id": "r22",
   "name": "SKYLANCE",
   "tier": 4,
   "body": "flyer",
   "colors": {
    "main": "#ff8a1f",
    "accent": "#ffffff",
    "eye": "#2f6bff"
   },
   "flavor": "Dives from orbit. Lands with style.",
   "head": {
    "name": "Comet Head",
    "kind": "missile",
    "armor": 50,
    "power": 36,
    "uses": 3
   },
   "rarm": {
    "name": "Lance Beam",
    "kind": "beam",
    "armor": 65,
    "power": 44,
    "accuracy": 85
   },
   "larm": {
    "name": "Dive Talon",
    "kind": "strike",
    "armor": 60,
    "power": 40,
    "accuracy": 85
   },
   "legs": {
    "name": "Sky Thrusters",
    "armor": 75,
    "speed": 85,
    "evasion": 40
   }
  },
  {
   "id": "r23",
   "name": "GRAVEL",
   "tier": 4,
   "body": "crawler",
   "colors": {
    "main": "#d9a066",
    "accent": "#7df9ff",
    "eye": "#ff4f6d"
   },
   "flavor": "Mostly rocks. Totally unbreakable.",
   "head": {
    "name": "Boulder Brow",
    "kind": "shield",
    "armor": 70,
    "power": 0,
    "uses": 6
   },
   "rarm": {
    "name": "Quake Fist",
    "kind": "strike",
    "armor": 85,
    "power": 45,
    "accuracy": 70
   },
   "larm": {
    "name": "Rock Wall",
    "kind": "guard",
    "armor": 90,
    "power": 0,
    "accuracy": 60
   },
   "legs": {
    "name": "Quarry Legs",
    "armor": 105,
    "speed": 30,
    "evasion": 10
   }
  },
  {
   "id": "r24",
   "name": "ANGLER",
   "tier": 4,
   "body": "swimmer",
   "colors": {
    "main": "#ff4fd8",
    "accent": "#fff36b",
    "eye": "#00ffa6"
   },
   "flavor": "Glows in the dark. Bites in the light.",
   "head": {
    "name": "Lure Lamp",
    "kind": "laser",
    "armor": 55,
    "power": 36,
    "uses": 4
   },
   "rarm": {
    "name": "Deep Beam",
    "kind": "beam",
    "armor": 65,
    "power": 42,
    "accuracy": 90
   },
   "larm": {
    "name": "Fang Snap",
    "kind": "strike",
    "armor": 60,
    "power": 38,
    "accuracy": 80
   },
   "legs": {
    "name": "Abyss Fins",
    "armor": 75,
    "speed": 60,
    "evasion": 30
   }
  },
  {
   "id": "r25",
   "name": "RUMBLER",
   "tier": 4,
   "body": "wheels",
   "colors": {
    "main": "#ff5a36",
    "accent": "#ffd23f",
    "eye": "#ffffff"
   },
   "flavor": "You hear it, you feel it, you lose.",
   "head": {
    "name": "Bass Horn",
    "kind": "missile",
    "armor": 55,
    "power": 35,
    "uses": 3
   },
   "rarm": {
    "name": "Thunder Ram",
    "kind": "strike",
    "armor": 75,
    "power": 45,
    "accuracy": 80
   },
   "larm": {
    "name": "Echo Cannon",
    "kind": "shoot",
    "armor": 70,
    "power": 38,
    "accuracy": 80
   },
   "legs": {
    "name": "Monster Wheels",
    "armor": 85,
    "speed": 70,
    "evasion": 25
   }
  },
  {
   "id": "r26",
   "name": "MENDER",
   "tier": 4,
   "body": "tank",
   "colors": {
    "main": "#46e08a",
    "accent": "#ffffff",
    "eye": "#ff4f6d"
   },
   "flavor": "Tank with a toolbox and a big hug.",
   "head": {
    "name": "Care Dome",
    "kind": "repair",
    "armor": 65,
    "power": 0,
    "uses": 6
   },
   "rarm": {
    "name": "Fix Beam",
    "kind": "beam",
    "armor": 70,
    "power": 30,
    "accuracy": 90
   },
   "larm": {
    "name": "Hug Shield",
    "kind": "guard",
    "armor": 90,
    "power": 0,
    "accuracy": 60
   },
   "legs": {
    "name": "Cozy Treads",
    "armor": 100,
    "speed": 28,
    "evasion": 8
   }
  },
  {
   "id": "r27",
   "name": "CRIMSONX",
   "tier": 4,
   "body": "biped",
   "colors": {
    "main": "#ff2e63",
    "accent": "#ffe14d",
    "eye": "#7df9ff"
   },
   "flavor": "Glass cannon. Very shiny glass.",
   "head": {
    "name": "Ruby Eye",
    "kind": "laser",
    "armor": 40,
    "power": 40,
    "uses": 3
   },
   "rarm": {
    "name": "Hyper Cannon",
    "kind": "beam",
    "armor": 50,
    "power": 45,
    "accuracy": 90
   },
   "larm": {
    "name": "Blaze Blade",
    "kind": "strike",
    "armor": 45,
    "power": 44,
    "accuracy": 85
   },
   "legs": {
    "name": "Dash Legs",
    "armor": 55,
    "speed": 88,
    "evasion": 40
   }
  },
  {
   "id": "r28",
   "name": "LEVIATHAN",
   "tier": 5,
   "body": "swimmer",
   "colors": {
    "main": "#00c2ff",
    "accent": "#ff7ad9",
    "eye": "#fff36b"
   },
   "flavor": "Boss of the deep end. Hates cannonballs.",
   "head": {
    "name": "Tide Crown",
    "kind": "missile",
    "armor": 70,
    "power": 40,
    "uses": 4
   },
   "rarm": {
    "name": "Maelstrom",
    "kind": "beam",
    "armor": 90,
    "power": 45,
    "accuracy": 92
   },
   "larm": {
    "name": "Kraken Grip",
    "kind": "strike",
    "armor": 85,
    "power": 45,
    "accuracy": 85
   },
   "legs": {
    "name": "Titan Fins",
    "armor": 110,
    "speed": 70,
    "evasion": 30
   }
  },
  {
   "id": "r29",
   "name": "STORMKING",
   "tier": 5,
   "body": "flyer",
   "colors": {
    "main": "#ffe14d",
    "accent": "#7a5cff",
    "eye": "#ff2e63"
   },
   "flavor": "Rules the sky. Sneezes lightning.",
   "head": {
    "name": "Thunder Crown",
    "kind": "laser",
    "armor": 65,
    "power": 40,
    "uses": 5
   },
   "rarm": {
    "name": "Bolt Cannon",
    "kind": "beam",
    "armor": 85,
    "power": 45,
    "accuracy": 95
   },
   "larm": {
    "name": "Gale Talon",
    "kind": "strike",
    "armor": 80,
    "power": 45,
    "accuracy": 90
   },
   "legs": {
    "name": "Tempest Wings",
    "armor": 95,
    "speed": 90,
    "evasion": 45
   }
  },
  {
   "id": "r30",
   "name": "OMEGA ANT",
   "tier": 5,
   "body": "crawler",
   "colors": {
    "main": "#9dff4a",
    "accent": "#ff5a36",
    "eye": "#ffffff"
   },
   "flavor": "The queen of crunch. Bring snacks, bring luck.",
   "head": {
    "name": "Hive Mind",
    "kind": "scan",
    "armor": 70,
    "power": 20,
    "uses": 6
   },
   "rarm": {
    "name": "Colossus Claw",
    "kind": "strike",
    "armor": 90,
    "power": 45,
    "accuracy": 90
   },
   "larm": {
    "name": "Royal Shell",
    "kind": "guard",
    "armor": 90,
    "power": 0,
    "accuracy": 70
   },
   "legs": {
    "name": "Swarm Legs",
    "armor": 110,
    "speed": 60,
    "evasion": 25
   }
  }
 ]
};
