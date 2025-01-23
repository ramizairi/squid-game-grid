import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// Firebase configuration
const firebaseConfig = {
  apiKey: "",
  authDomain: "",
  databaseURL: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: "",
  measurementId: "",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export default class Player {
  constructor(number, picUrl) {
    this.number = number;
    this.picUrl = picUrl;
    this.alive = true;
  }

  getNumber = () => this.number;
  getPicUrl = () => this.picUrl;
  isAlive = () => this.alive;
  setAlive = (alive) => (this.alive = alive);
}

const DEFAULT_NUM_OF_PLAYERS = 37;
function genDefaultPlayers() {
  let players = [];
  for (let i = 1; i <= DEFAULT_NUM_OF_PLAYERS; i++) {
    players.push(new Player(i, "456.webp"));
  }
  return players;
}

export async function genPlayers() {
  let players = [];
  try {
    const playersRef = collection(db, "players");
    const snapshot = await getDocs(playersRef);
    snapshot.forEach((doc) => {
      const playerData = doc.data();
      players.push(new Player(playerData.number, playerData.picUrl));
    });
  } catch (error) {
    console.error("Error fetching players from Firestore: ", error);
    console.log("Using default players");
    players = genDefaultPlayers();
  }
  return players;
}

// Function to set up real-time updates
export function setupRealTimeUpdates(callback) {
  const playersRef = collection(db, "players");

  // Set up a real-time listener
  onSnapshot(playersRef, (snapshot) => {
    console.log("Players updated in real-time!");
    const updatedPlayers = [];
    snapshot.forEach((doc) => {
      const playerData = doc.data();
      updatedPlayers.push(new Player(playerData.number, playerData.picUrl));
    });

    // Call the callback function with the updated players
    callback(updatedPlayers);
  });
}

export { db }; // Export the Firestore instance
