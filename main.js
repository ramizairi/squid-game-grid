import Player from "./player.js";

const DEFAULT_NUM_OF_PLAYERS = 37;

async function main() {
    let players = await initPlayers();
    genSquares(players);

    let squareSideSize = Math.ceil(Math.sqrt(players.length));
    let style = document.createElement('style');
    document.head.appendChild(style);
    resetDimensions(style, squareSideSize);
    onresize = (event) => {
        resetDimensions(style, squareSideSize);
    };
}

async function initPlayers() {
    let players = [];

    await fetch("config.json")
        .then(response => response.json())
        .then(json => {
            json.players.forEach((player) => {
                players.push(new Player(player.id, player.picUrl));
            });
        })
        .catch((e) => {
            console.log("config.json not found, using default players");
            for (let i = 1; i <= DEFAULT_NUM_OF_PLAYERS; i++) {
                players.push(new Player(i, "456.webp"));
            }
        });

    return players;
}


function genSquares(players) {
    let numOfPlayers = players.length;
    let squareSideSize = Math.ceil(Math.sqrt(numOfPlayers));
    let numOfSquares = squareSideSize ** 2;

    let nums = Array.from({ length: numOfSquares }, (_, i) => i + 1);

    // shuffle nums
    for (let i = 0; i < numOfSquares; i++) {
        let j = Math.floor(Math.random() * numOfSquares);
        [nums[i], nums[j]] = [nums[j], nums[i]];
    }

    let screen = document.getElementById("screen");

    for (let i = 0; i < numOfSquares; i++) {
        let squareDiv = document.createElement("div");
        squareDiv.classList.add("square");

        if (nums[i] > numOfPlayers) {
            squareDiv.classList.add("empty");
            screen.appendChild(squareDiv);
            continue;
        }

        let picDiv = document.createElement("div");
        picDiv.classList.add("pic");
        picDiv.style.backgroundImage = `url(${players[nums[i] - 1].getPicUrl()})`;

        let textDiv = document.createElement("div");
        textDiv.classList.add("text");
        textDiv.textContent = nums[i].toString().padStart(3, "0");

        squareDiv.appendChild(picDiv);
        squareDiv.appendChild(textDiv);

        // TODO: decouple this
        squareDiv.addEventListener("click", function () {
            if (!this.classList.contains("gone")) {
                new Audio("sg-sound-effect.ogg").play();
            }
            this.classList.toggle("gone");
        });

        screen.appendChild(squareDiv);
    }

}

function resetDimensions(style, squareSideSize) {
    let screen = document.getElementById("screen");
    screen.style.gridTemplateColumns = `repeat(${squareSideSize}, 1fr)`;

    //remove all rules from style
    while (style.sheet.cssRules.length > 0) {
        style.sheet.deleteRule(0);
    }

    let squareDiagonal = Math.ceil((squareSideSize + .5) * Math.sqrt(2));
    let vx = Math.floor(100 / (squareDiagonal));
    let useVWorVH = document.documentElement.clientHeight < document.documentElement.clientWidth ? "vh" : "vw";

    // insert rule into style
    style.sheet.insertRule(`.square {height: ${vx}${useVWorVH}; margin: ${vx / 40}${useVWorVH};}`);
    style.sheet.insertRule(`.text {transform: rotate(45deg) translateY(${vx / 3}${useVWorVH});}`);
    style.sheet.insertRule(`.text {font-size: ${vx / 3}${useVWorVH};}`);
}

document.addEventListener("DOMContentLoaded", function () {
    main();
});