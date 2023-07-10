import kaboom from "./lib/kaboom.mjs";

const FLOOR_HEIGHT = 48;
const JUMP_FORCE = 800;
const GRAVITY = 1800;

// initialize context
kaboom({
  background: [51, 151, 255],
});

// load assets
loadSprite("rouky_casquette", "sprites/rouky_casquette.png");
loadSprite("rouky", "sprites/rouky.png");
loadSprite("food", "sprites/food.png");
loadSprite("bolt", "sprites/bolt.png");
loadSound("explosion", "sounds/explosion.wav"); // https://freesound.org/people/LittleRobotSoundFactory/sounds/270310/
loadSound("jump", "sounds/jump.wav"); // https://freesound.org/people/LittleRobotSoundFactory/sounds/270323/
loadSound("crunch", "sounds/crunch.mp3"); // https://freesound.org/people/Borgory/sounds/548367/
loadSound("new_high_score", "sounds/new_high_score.wav"); // https://freesound.org/people/rhodesmas/sounds/320655/
loadSound("light_off", "sounds/light_off.wav"); // https://freesound.org/people/mtndewfan123/sounds/687451/
loadSound("multi_jump_off", "sounds/multi_jump_off.wav"); // https://freesound.org/people/boonryan/sounds/91091/
loadSound("upside_down", "sounds/upside_down.wav"); // https://freesound.org/people/Greenhourglass/sounds/159376/
loadSound("upside_down_off", "sounds/upside_down_off.wav"); // https://freesound.org/people/dossantosbarbosa/sounds/221145/
loadShaderURL("invert", null, "shaders/invert.frag");
loadShaderURL("light", null, "shaders/light.frag");

// set volume level
volume(0.2);

// welcome screen
scene("welcome", () => {
  // background
  add([
    rect(width(), height() - 300),
    pos(width() / 2, height() / 2),
    color(30, 30, 30),
    anchor("center"),
  ]);

  // rotating rouky
  const rouky = add([
    sprite("rouky_casquette"),
    pos(width() / 2, height() - 225),
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
    pos(width() / 2, height() / 2 - 150),
    scale(2),
    anchor("center"),
  ]);
  add([
    text("Appuyer sur espace pour commencer"),
    pos(width() / 2, height() / 2 - 80),
    anchor("center"),
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
  let multiJumpEnabled = false;
  let score = 0;

  // define gravity
  setGravity(GRAVITY);

  // add player object to screen
  const player = add([sprite("rouky"), pos(80, 40), area(), body(), "player"]);

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

  function jump() {
    if (isGameOver) {
      // start a new game
      go("game", { highScore: highScore });
    } else if (
      isUpsideDown &&
      (multiJumpEnabled || (!player.isFalling() && !player.isJumping()))
    ) {
      player.jump(-JUMP_FORCE);
      play("jump");
    } else if (player.isGrounded() || multiJumpEnabled) {
      player.jump(JUMP_FORCE);
      play("jump");
    }
  }

  // jump when user press space
  onKeyPress("space", jump);
  onClick(() => jump());

  function spawnItem() {
    // stop spawing items if the game is over
    if (isGameOver) {
      return;
    }

    // Chose which item to spawn and adapt screen position according to whether we are upside down
    let itemAnchor = anchor("botleft");
    if (isUpsideDown) {
      itemAnchor = "topleft";
    }
    function getItemHeight(n = 0) {
      if (isUpsideDown) {
        return FLOOR_HEIGHT + n;
      } else {
        return height() - FLOOR_HEIGHT - n;
      }
    }
    let r = rand(0, 1);
    if (score > 4000 && r > 0.95 && !isUpsideDown && !isDark) {
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
    } else if (score > 2000 && r > 0.92) {
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

  // if player collides with food, enable multi jump for a short while
  player.onCollide("food", (food) => {
    play("crunch");
    destroy(food);
    multiJumpEnabled = true;
    wait(7, () => {
      play("multi_jump_off");
      multiJumpEnabled = false;
    });
  });

  // if player collides with a bolt, switch on upside down mode for a bit
  player.onCollide("bolt", (bolt) => {
    destroy(bolt);
    if (isDark) {
      return;
    }
    play("upside_down");
    destroyAll("food");
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
    scoreLabel.pos.y = height() - 80;
    highScoreLabel.pos.y = height() - 34;
    isUpsideDown = true;
    wait(rand(8, 15), () => {
      play("upside_down_off");
      player.flipY = false;
      destroyAll("food");
      destroyAll("bolt");
      destroyAll("tree");
      destroy(upsideDownFloor);
      setGravity(GRAVITY);
      scoreLabel.pos.y = 120;
      highScoreLabel.pos.y = 24;
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
        text("La nuit tombe..."),
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
    text("Meilleur score : " + highScore),
    pos(24, 24),
  ]);
  let scoreLabel = add([
    text(score),
    scale(2),
    pos(150, 120),
    anchor("center"),
  ]);

  // every frame: increment score, check if best score was beaten, manage speed and darkness
  onUpdate(() => {
    if (!isGameOver) {
      score++;
      scoreLabel.text = score;
      if (highScore !== 0 && score === highScore + 1) {
        play("new_high_score");
        addKaboom(scoreLabel.pos);
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
