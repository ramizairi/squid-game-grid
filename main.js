import { genPlayers } from "./player.js";
import { db } from "./player.js"; // Import the Firestore instance from player.js

const CONFIG_PATH = "config.json";
const USE_PROGRESSIVE_SQUARE = true;
const AUTO_RUNNING = true;

class Game {
  eqSet = (xs, ys) => xs.size === ys.size && [...xs].every((x) => ys.has(x));

  constructor(
    players,
    screenElm,
    useProgressiveSquare = true,
    autoRunning = true,
    eliminationOrder = [],
    eliminateTimeSep = 1000
  ) {
    this.players = players;
    this.screenElm = screenElm;
    this.useProgressiveSquare = useProgressiveSquare;
    this.eliminationOrder = eliminationOrder;
    this.autoRunning = autoRunning && eliminationOrder.length > 0;
    this.eliminateTimeSep = eliminateTimeSep;

    let playerIds = this.players.map((_, id) => id);
    this.canEliminateAll = this.eqSet(
      new Set(eliminationOrder),
      new Set(playerIds)
    );

    this.refreshScreen();

    onresize = () => {
      this.resetDimensions();
    };

    document.body.addEventListener("click", (e) => {
      if (e.target !== e.currentTarget) {
        return;
      }

      this.toggleAuto();
    });
    /*
        if (eliminationOrder.length > 0) {
            this.runEliminateLoop();
        }
            */
  }

  pauseAuto = () => {
    this.autoRunning = false;
  };

  // cannot be resume because it's not guaranteed that the players are in the same state as before
  restartAuto = () => {
    this.autoRunning = true;
    this.reGame();
  };
  toggleAuto = () => {
    if (this.autoRunning) {
      this.pauseAuto();
    } else {
      this.restartAuto();
    }
  };

  getNumOfAlivePlayers = () =>
    this.players.filter((player) => player.isAlive()).length;
  resurrectAllPlayers = () =>
    this.players.forEach((player) => player.setAlive(true));

  // some squares may be empty if the number of players is not a perfect square (e.g. 37 players, 7x7 grid, 12 empty squares)
  getSquareSideSize = () =>
    Math.ceil(
      Math.sqrt(this.players.filter((player) => player.isAlive()).length)
    );

  reGame() {
    let audio = new Audio("sg-sound-effect-rev.ogg");
    audio.play().then(() => {
      this.clearPressAnywhereText();
    });
    audio.addEventListener("ended", () => {
      this.resurrectAllPlayers();
      this.refreshScreen();
    });
  }

  clearPressAnywhereText() {
    let pressAnywhereText = document.getElementById("pressAnywhereText");
    if (pressAnywhereText) {
      pressAnywhereText.style.display = "none";
    }
  }

  async runEliminateLoop() {
    while (1) {
      while (!this.autoRunning || !document.hasFocus()) {
        await new Promise((r) => setTimeout(r, 1000));
      }

      for (let i = 0; i < this.eliminationOrder.length; i++) {
        await new Promise((r) => setTimeout(r, this.eliminateTimeSep));

        if (!this.autoRunning) {
          break;
        }

        while (!document.hasFocus()) {
          await new Promise((r) => setTimeout(r, 1000));
        }

        let playerId = this.eliminationOrder[i];
        let eliminated = this.tryToEliminatePlayer(playerId);

        if (!eliminated) {
          console.log(`Player ${playerId} is already dead`);
          break;
        }
      }
      if (!this.canEliminateAll) {
        await new Promise((r) => setTimeout(r, this.eliminateTimeSep * 3));
        this.reGame();
      }
      await new Promise((r) => setTimeout(r, this.eliminateTimeSep * 3));
    }
  }

  resetDimensions = () => {
    let squareSideSize = this.getSquareSideSize();
    let screen = this.screenElm;
    screen.style.gridTemplateColumns = `repeat(${squareSideSize}, 1fr)`;

    let squareDiagonal = Math.ceil((squareSideSize + 0.5) * Math.sqrt(2));
    let vx = Math.floor(100 / squareDiagonal);
    let useVWorVH =
      document.documentElement.clientHeight <
      document.documentElement.clientWidth
        ? "vh"
        : "vw";

    let squares = screen.querySelectorAll(".square");
    squares.forEach((square) => {
      square.style.height = `${vx}${useVWorVH}`;
      square.style.margin = `${vx / 40}${useVWorVH}`;
    });

    let text = screen.querySelectorAll(".text");
    text.forEach((text) => {
      text.style.transform = `rotate(45deg) translateY(${vx / 3}${useVWorVH})`;
      text.style.fontSize = `${vx / 3}${useVWorVH}`;
    });
  };

  numIsSquare = (num) => Math.sqrt(num) % 1 === 0;

  isSquareAlivesNum() {
    return this.numIsSquare(this.getNumOfAlivePlayers());
  }

  clickSquare(playerId) {
    if (this.autoRunning) {
      return;
    }
    this.tryToEliminatePlayer(playerId);
  }

  // returns true if the player was eliminated
  tryToEliminatePlayer(playerId) {
    if (!this.players[playerId]?.isAlive()) {
      return false;
    }

    let squareElm = this.screenElm.querySelector(`[playerId="${playerId}"]`);
    let audio1 = new Audio("sg-sound-effect.ogg");

    audio1.play().then(() => {
      this.clearPressAnywhereText();
    });

    this.players[playerId].setAlive(false);

    if (this.getNumOfAlivePlayers() > 0) {
      squareElm.classList.add("gone");

      if (this.useProgressiveSquare && this.isSquareAlivesNum()) {
        squareElm.addEventListener("transitionend", () => {
          this.refreshScreen();
        });
      }
    }
    // eliminated last player alive
    else {
      // maybe there's a bettet way to do the animation
      squareElm.style.scale = "2";
      squareElm.querySelector(".pic").style.filter = "none";
      this.reGame();
    }
    return true;
  }

  refreshScreen() {
    this.screenElm.innerHTML = "";
    let numOfSquares = this.getSquareSideSize() ** 2;

    let alivePlayerIds = this.players
      .map((player, i) => {
        if (player.isAlive()) {
          return i;
        }
      })
      .filter((id) => id != null);

    let squaresOrder = alivePlayerIds.concat(
      Array(numOfSquares - alivePlayerIds.length).fill(-1)
    );
    squaresOrder.sort(() => Math.random() - 0.5);

    for (let i = 0; i < numOfSquares; i++) {
      let squareDiv = document.createElement("div");
      squareDiv.classList.add("square");

      let order = squaresOrder[i];

      if (order == -1 || order >= this.players.length) {
        squareDiv.classList.add("empty");
        this.screenElm.appendChild(squareDiv);
        continue;
      }

      let player = this.players[order];

      squareDiv.setAttribute("playerId", order);
      squareDiv.setAttribute("playerNumber", player.getNumber());
      if (!player.isAlive()) {
        squareDiv.classList.add("gone");
      }

      let picDiv = document.createElement("div");
      picDiv.classList.add("pic");
      picDiv.style.backgroundImage = `url(${player.getPicUrl()})`;

      let textDiv = document.createElement("div");
      textDiv.classList.add("text");
      textDiv.textContent = player.getNumber().toString().padStart(3, "0");

      squareDiv.appendChild(picDiv);
      squareDiv.appendChild(textDiv);

      squareDiv.addEventListener("click", this.clickSquare.bind(this, order));

      this.screenElm.appendChild(squareDiv);
    }
    this.resetDimensions();
  }
}
async function main() {
  let players = await genPlayers(); // Fetch players from Firestore
  let playerIds = players.map((_, id) => id);
  let eliminationOrder = playerIds.sort(() => Math.random() - 0.5);
  let game = new Game(
    players,
    document.getElementById("screen"),
    USE_PROGRESSIVE_SQUARE,
    AUTO_RUNNING,
    eliminationOrder
  );
  window.game = game;

  // Listen for real-time updates
  setupRealTimeUpdates(game);
}

function setupRealTimeUpdates(game) {
  const playersRef = collection(db, "players");

  // Set up a real-time listener
  onSnapshot(playersRef, (snapshot) => {
    console.log("Players updated in real-time!");
    playSoundEffect(); // Play sound effect on change

    // Update the game with the latest players
    const updatedPlayers = [];
    snapshot.forEach((doc) => {
      const playerData = doc.data();
      updatedPlayers.push(new Player(playerData.number, playerData.picUrl));
    });

    game.players = updatedPlayers;
    game.refreshScreen(); // Refresh the game screen
  });
}

function playSoundEffect() {
  const audio = new Audio("sg-sound-effect.ogg");
  audio.play().catch((error) => {
    console.error("Error playing sound effect: ", error);
  });
}

document.addEventListener("DOMContentLoaded", function () {
  main();
});
