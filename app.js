const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "cricketMatchDetails.db");
let db = null;

const convertDbObjectToResponseObject = (dbObject) => {
  return {
    playerId: dbObject.player_id,
    playerName: dbObject.player_name,
    matchId: dbObject.match_id,
    match: dbObject.match,
    year: dbObject.year,
    playerMatchId: dbObject.player_match_id,
    score: dbObject.score,
    fours: dbObject.fours,
    sixes: dbObject.sixes,
  };
};

const initDBandServer = async () => {
  try {
    db = await open({ filename: dbPath, driver: sqlite3.Database });
    app.listen(3000, () => {
      console.log("Server Running at localhost:3000");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initDBandServer();

//For all the players
app.get("/players/", async (request, response) => {
  const allPlayersQuery = `select * from player_details;`;
  const allPlayers = await db.all(allPlayersQuery);
  response.send(
    allPlayers.map((eachState) => convertDbObjectToResponseObject(eachState))
  );
});

//For a particular PLayer
app.get("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  const playerQuery = `select * from player_details where player_id = ${playerId};`;
  const singlePlayer = await db.get(playerQuery);
  response.send(convertDbObjectToResponseObject(singlePlayer));
});

//Update Details of a PLayer
app.put("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  const updatedPlayer = request.body;
  const { playerName } = updatedPlayer;
  const updatePlayerQuery = `update player_details set player_name = "${playerName}";`;
  await db.run(updatePlayerQuery);
  response.send("Player Details Updated");
});

//For a specific match
app.get("/matches/:matchId/", async (request, response) => {
  const { matchId } = request.params;
  const matchQuery = `select * from match_details where match_id = ${matchId};`;
  const singleMatch = await db.get(matchQuery);
  response.send(convertDbObjectToResponseObject(singleMatch));
});

//All the matches by a player
app.get("/players/:playerId/matches", async (request, response) => {
  const { playerId } = request.params;
  const matchQuery = `
    select match_details.match_id, match_details.match, match_details.year from 
    player_match_score natural join match_details
    where player_id = ${playerId};
    `;
  const queryResult = await db.all(matchQuery);
  response.send(
    queryResult.map((each) => convertDbObjectToResponseObject(each))
  );
});

//All the players in a match
app.get("/matches/:matchId/players", async (request, response) => {
  const { matchId } = request.params;
  const playersQuery = `select player_details.player_id as playerId,
    player_details.player_name as playerName
    from 
    player_match_score natural join player_details
    where match_id = ${matchId};`;
  const allPlayersQueryResult = await db.all(playersQuery);
  response.send(allPlayersQueryResult);
});

//Stats of a particular player
app.get("/players/:playerId/playerScores", async (request, response) => {
  const { playerId } = request.params;
  const statsQuery = `select player_details.player_id as playerId,
                        player_details.player_name as playerName,
                        sum(player_match_score.score) as totalScore,
                                      sum(fours) as totalFours,
                                      sum(sixes) as totalSixes
                              from player_details inner join player_match_score
                              on
                              player_details.player_id = player_match_score.player_id
                              where player_details.player_id = ${playerId};`;
  const stat = await db.get(statsQuery);
  response.send(stat);
});

module.exports = app;
