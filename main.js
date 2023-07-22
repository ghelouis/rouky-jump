import kaboom from "https://unpkg.com/kaboom@3000.0.1/dist/kaboom.mjs";

const FLOOR_HEIGHT = 48;
const JUMP_FORCE = 800;
const GRAVITY = 1800;

// i18n
const frLang = navigator.language.startsWith("fr")
const pressSpaceToStartText = frLang ? "Appuyer sur espace pour commencer" : "Press space to start";
const nightIsFallingText = frLang ? "La nuit tombe..." : "Night is falling...";
const hightScoreText = frLang ? "Meilleur score : " : "High score : ";

// initialize context
kaboom({
  background: [51, 151, 255],
});

// load assets
loadSprite("rouky_casquette", "sprites/rouky_casquette.png");
loadSprite("rouky", "sprites/rouky.png");
loadSprite("food", "sprites/food.png");
loadSprite("bolt", "sprites/bolt.png");
loadSprite("kong", "sprites/kong.png");
loadSound("explosion", "sounds/explosion.wav"); // https://freesound.org/people/LittleRobotSoundFactory/sounds/270310/
loadSound("jump", "sounds/jump.wav"); // https://freesound.org/people/LittleRobotSoundFactory/sounds/270323/
loadSound("crunch", "sounds/crunch.mp3"); // https://freesound.org/people/Borgory/sounds/548367/
loadSound("new_high_score", "sounds/new_high_score.wav"); // https://freesound.org/people/rhodesmas/sounds/320655/
loadSound("light_off", "sounds/light_off.wav"); // https://freesound.org/people/mtndewfan123/sounds/687451/
loadSound("upside_down", "sounds/upside_down.wav"); // https://freesound.org/people/Greenhourglass/sounds/159376/
loadSound("upside_down_off", "sounds/upside_down_off.wav"); // https://freesound.org/people/dossantosbarbosa/sounds/221145/
loadSound("blip", "sounds/blip.wav"); // https://freesound.org/people/oneloginacc/sounds/73444/
loadShaderURL("invert", null, "shaders/invert.frag");
loadShaderURL("light", null, "shaders/light.frag");

// set volume level
volume(0.2);

// welcome screen
scene("welcome", () => {
  // background tile
  const backgroundTile = add([
    rect(width(), 150),
    pos(width() / 2, height() / 2),
    color(30, 30, 30),
    anchor("center"),
  ]);

  // rotating rouky
  const rouky = add([
    sprite("rouky_casquette"),
    pos(width() / 2, height() / 2 -  height() / 100 * 25),
    rotate(360),
    anchor("center"),
  ]);
  rouky.onUpdate(() => {
    if (rouky.angle < 720) {
      rouky.angle += dt() * 150;
    }
  });

  // title text
  add([
    text("[wavy]Rouky Jump[/wavy]", {
      styles: {
        wavy: (idx, ch) => ({
          color: hsl2rgb((time() * 0.2 + idx * 0.1) % 1, 0.7, 0.8),
          pos: vec2(0, wave(-4, 4, time() * 6 + idx * 0.5)),
        }),
      },
    }),
    pos(width() / 2, height() / 2),
    scale(2),
    anchor("center"),
  ]);
  add([
    text(pressSpaceToStartText),
    pos(width() / 2, height() / 2 + backgroundTile.height),
    anchor("center"),
    scale(0.7)
  ]);

  // version
  add([
    text("v0.0.2"),
    pos(width(), height()),
    anchor("botright"),
    scale(0.5)
  ]);


  // press space (or click or tap on phone) to begin the game
  onKeyPress("space", () => {
    go("game", { highScore: 0 });
  });
  onClick(() => go("game", { highScore: 0 }));
});

// game screen
scene("game", ({ highScore }) => {
  // initial game state
  let isGameOver = false;
  let speed = 480;
  let isDark = false;
  let isUpsideDown = false;
  let score = 0;

  // define gravity
  setGravity(GRAVITY);

  function addFloor() {
    return add([
      rect(width(), FLOOR_HEIGHT),
      outline(4),
      pos(0, height()),
      anchor("botleft"),
      area(),
      body({ isStatic: true }),
      color(144, 238, 144),
    ]);
  }

  // add floor
  let floor = addFloor();

  // add player
  const player = add([sprite("rouky"), pos(80, 40), area(), body(), "player"]);


  function jump() {
    if (isGameOver) {
      // start a new game
      go("game", { highScore: highScore });
    } else if (isUpsideDown &&
      (!player.isFalling() && !player.isJumping())
    ) {
      player.jump(-JUMP_FORCE);
      play("jump");
    } else if (player.isGrounded()) {
      player.jump(JUMP_FORCE);
      play("jump");
    }
  }

  // jump when user press space
  onKeyPress("space", jump);
  onClick(() => jump());

  function spawnItem() {
    // stop spawning items if the game is over
    if (isGameOver) {
      return;
    }

    // Chose which item to spawn and adapt screen position according to whether we are upside down
    let itemAnchor = anchor("botleft");
    if (isUpsideDown) {
      itemAnchor = "topleft";
    }

    function getItemHeight(offset = 0) {
      if (isUpsideDown) {
        return FLOOR_HEIGHT + offset;
      } else {
        return height() - FLOOR_HEIGHT - offset;
      }
    }

    let r = rand(0, 1);

    if (score > 4000 && r > 0.95 && !isUpsideDown && !isDark && get("bolt").length === 0) {
      // add bolt (rare)
      add([
        sprite("bolt"),
        pos(width(), getItemHeight(5)),
        area(),
        itemAnchor,
        move(LEFT, speed),
        offscreen({ destroy: true }),
        "bolt",
      ]);
    } else if (score > 2000 && r > 0.92 && get("food").length === 0) {
      // add food (semi-frequent)
      add([
        sprite("food"),
        pos(width(), getItemHeight(10)),
        area(),
        itemAnchor,
        move(LEFT, speed),
        offscreen({ destroy: true }),
        "food",
      ]);
    } else if (r > 0.87 && get("kong").length === 0) {
      // add kong (somewhat frequent)
      add([
        sprite("kong", {flipY: isUpsideDown}),
        pos(width(), getItemHeight()),
        area(),
        itemAnchor,
        move(LEFT, speed),
        offscreen({ destroy: true }),
        "kong",
      ]);
    } else {
      // add tree (default, almost always)
      add([
        rect(48, rand(32, 96)),
        area(),
        outline(4),
        pos(width(), getItemHeight()),
        itemAnchor,
        color(255, 180, 255),
        move(LEFT, speed),
        offscreen({ destroy: true }),
        "tree",
      ]);
    }

    // wait a random amount of time to spawn next item
    wait(rand(1, 2), spawnItem);
  }

  // start spawning items
  spawnItem();

  // game over if player collides with any game obj with tag "tree"
  player.onCollide("tree", () => {
    get("*").forEach((obj) => {
      obj.paused = true;
    });
    addKaboom(
      vec2(player.pos.x + player.width / 2, player.pos.y + player.height / 2),
    );
    shake();
    play("explosion");
    destroyAll("mainText");
    add([
      text("Game Over"),
      pos(width() / 2, height() / 2),
      scale(2),
      anchor("center"),
    ]);
    isGameOver = true;
    isDark = false;
    usePostEffect("");
    if (score > highScore) {
      highScore = score;
    }
  });

  // if player collides with food, play crunch sound
  player.onCollide("food", (food) => {
    play("crunch");
    destroy(food);
  });

  // if player collides with kong clear trees
  player.onCollide("kong", (kong) => {
    play("blip");
    get("tree").forEach((tree) => {
      if (isUpsideDown) {
        addKaboom(vec2(tree.pos.x + tree.width / 2, tree.pos.y + tree.height / 2));
      } else {
        addKaboom(vec2(tree.pos.x + tree.width / 2, tree.pos.y - tree.height / 2));
      }
      destroy(tree);
    });
    destroy(kong);
  });

  // if player collides with a bolt, switch on upside down mode for a bit
  player.onCollide("bolt", (bolt) => {
    destroy(bolt);
    if (isDark) {
      return;
    }
    play("upside_down");
    destroyAll("food");
    destroyAll("kong");
    destroyAll("bolt");
    destroyAll("tree");
    usePostEffect("invert");
    setGravity(-GRAVITY);
    destroy(floor);
    player.flipY = true;
    const upsideDownFloor = add([
      rect(width(), FLOOR_HEIGHT),
      outline(4),
      pos(0, 0),
      anchor("topleft"),
      area(),
      body({ isStatic: true }),
      color(144, 238, 144),
    ]);
    scoreLabel.pos.y = height() - height() / 100 * 2 - highScoreLabel.height / 2 - 10;
    highScoreLabel.pos.y = height() - height() / 100 * 2 - 10;
    isUpsideDown = true;
    wait(rand(8, 15), () => {
      play("upside_down_off");
      player.flipY = false;
      destroyAll("food");
      destroyAll("kong");
      destroyAll("bolt");
      destroyAll("tree");
      destroy(upsideDownFloor);
      setGravity(GRAVITY);
      scoreLabel.pos.y = height() / 100 * 2 + highScoreLabel.height / 2;
      highScoreLabel.pos.y = height() / 100 * 2;
      isUpsideDown = false;
      usePostEffect("");
      floor = addFloor();
    });
  });

  // random chance of getting dark
  loop(10, () => {
    if (
      !isGameOver &&
      !isDark &&
      !isUpsideDown &&
      score > 1000 &&
      rand(0, 1) > 0.6
    ) {
      const label = add([
        text(nightIsFallingText),
        pos(width() / 2, height() / 2),
        scale(2),
        anchor("center"),
        "mainText",
      ]);
      wait(2, () => {
        destroy(label);
        if (!isGameOver && !isUpsideDown) {
          play("light_off");
          isDark = true;
        }
      });
    } else if (!isUpsideDown) {
      usePostEffect("");
      isDark = false;
    }
  });

  // display score & high score
  let highScoreLabel = add([
    text(hightScoreText+ highScore),
    pos(width() / 100, height() / 100 * 2),
    scale(0.5)
  ]);
  let scoreLabel = add([
    text(score),
    pos(width() / 100, height() / 100 * 2 + highScoreLabel.height / 2),
  ]);

  // every frame: increment score, check if best score was beaten, manage speed and darkness
  onUpdate(() => {
    if (!isGameOver) {
      score++;
      scoreLabel.text = score;
      if (highScore !== 0 && score === highScore + 1) {
        play("new_high_score");
        addKaboom(vec2(
          scoreLabel.pos.x + scoreLabel.width / 2,
          scoreLabel.pos.y + scoreLabel.height / 2,
        ));
      }
    }
    if (score % 1000 === 0) {
      speed *= 1.1;
    }
    if (isDark) {
      usePostEffect("light", {
        u_radius: 64,
        u_blur: 64,
        u_resolution: vec2(width(), height()),
        u_mouse: vec2(
          player.pos.x + player.width / 2,
          player.pos.y + player.height / 2,
        ),
      });
    }
  });
});

go("welcome");
