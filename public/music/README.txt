Emberline music: your own tracks

Put music files in this folder, then list them in tracks.json (in this
folder) by when they should play. For example:

  {
    "title": "title-theme.mp3",
    "era-0": "campfire.mp3",
    "era-1": "ancient.mp3",
    "battle": "war-drums.ogg"
  }

The names it understands:

  title     the title screen and menus
  era-0     Stone Age
  era-1     Ancient
  era-2     Classical
  era-3     Medieval & Renaissance
  era-4     Industrial & Modern
  era-5     Future & Space
  battle    while raiders attack
  night     at night (optional)

Files can be .mp3, .ogg, .m4a or .wav. Each track loops, so make the end
lead back into the start (1 to 3 minutes is plenty). The game crossfades
between them when the era, day or night, or a battle changes. Anything not
listed keeps the built-in music. Volume follows Menu > Sound.
