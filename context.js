import {DEFAULT_SEEDED_RANDOM} from "./utils.js";
import {Grid, Obstacle} from "./domain.js";


const SEED_PARAM_NAME = 'seed';
const OPS_PER_ITER_PARAM_NAME = 'opsPerIter';
const DEFAULT_OPS_PER_ITER = 100;

// const NODE_SIZE = 10;
const NODE_SIZE = 20;
// const NODE_SIZE = 10;
const GRID_WIDTH = Math.trunc(1400 / NODE_SIZE) * NODE_SIZE;
const GRID_HEIGHT = Math.trunc((GRID_WIDTH * 0.56) / NODE_SIZE) * NODE_SIZE;
// const GRID_WIDTH = Math.trunc(2400 / NODE_SIZE) * NODE_SIZE;
// const GRID_HEIGHT = Math.trunc((GRID_WIDTH * 0.56) / NODE_SIZE) * NODE_SIZE;

const NODES_PER_ROW = Math.trunc(GRID_WIDTH / NODE_SIZE);
const NODES_PER_COL = Math.trunc(GRID_HEIGHT / NODE_SIZE);

const OBSTACLE_COUNT = 30;
const OBSTACLE_MAX_SIZE = 160;
const OBSTACLE_MIN_SIZE = 40;
// const OBSTACLE_COUNT = 60;
// const OBSTACLE_MAX_SIZE = 180;
// const OBSTACLE_MIN_SIZE = 90;

const ROAD_HEIGHT_NODES = Math.trunc(NODES_PER_COL / 4);

const ROUGH_SIZE_NODES = Math.trunc(OBSTACLE_MIN_SIZE / 10);

const Context = (seededRandom = DEFAULT_SEEDED_RANDOM) => {

  const obstacles = Array.from(Array(OBSTACLE_COUNT)).map(() => {
    const width = seededRandom.int(OBSTACLE_MAX_SIZE - OBSTACLE_MIN_SIZE) + OBSTACLE_MIN_SIZE;
    const halfWidth = Math.trunc(width / 2);
    const height = seededRandom.int(OBSTACLE_MAX_SIZE - OBSTACLE_MIN_SIZE) + OBSTACLE_MIN_SIZE;
    const halfHeight = Math.trunc(height / 2);
    return Obstacle(seededRandom.int(GRID_WIDTH - halfWidth) + halfWidth, seededRandom.int(GRID_HEIGHT - halfHeight) + halfHeight, width, height);
  });

  const grid = Grid(GRID_WIDTH, GRID_HEIGHT, NODE_SIZE, obstacles);

  const road = [];
  {
    const roadEndI = grid.nodesPerRow;
    const jInterval = 4;

    let j = 1;
    for (let i = 0; i < roadEndI && i < grid.nodesPerRow; i++) {
      for (let jj = j; jj < (ROAD_HEIGHT_NODES + j) && jj < grid.nodesPerCol; jj++) {
        const node = grid.nodeAt(i, jj);
        node.walkable = true;
        node.weight = 8;
        road.push(node);
      }

      if (i % jInterval === jInterval - 1) {
        j++;
      }
    }
  }

  const roughLeftTopIjs = [];
  {
    Array.from(Array(seededRandom.int(25) + 1)).forEach(() => {
      const startI = seededRandom.int(NODES_PER_ROW);
      const startJ = seededRandom.int(NODES_PER_COL);
      roughLeftTopIjs.push(grid.nodeAt(startI, startJ));
      for (let i = startI; i < (ROUGH_SIZE_NODES + startI) && i < NODES_PER_ROW; i++) {
        for (let j = startJ; j < (ROUGH_SIZE_NODES + startJ) && j < NODES_PER_COL; j++) {
          const node = grid.nodeAt(i, j);
          node.walkable = true;
          node.weight = 50;
        }
      }
    });
  }

  return {
    get seededRandom(){return seededRandom;},
    get grid(){return grid;},
    get road(){return road;},
    get roughLeftTopIjs(){return roughLeftTopIjs;},
    get obstacles(){return obstacles;}
  }
};


export {
  SEED_PARAM_NAME, OPS_PER_ITER_PARAM_NAME, DEFAULT_OPS_PER_ITER,
  NODE_SIZE, GRID_WIDTH, GRID_HEIGHT,
  OBSTACLE_COUNT, OBSTACLE_MAX_SIZE, OBSTACLE_MIN_SIZE,
  NODES_PER_ROW, NODES_PER_COL,
  ROAD_HEIGHT_NODES, ROUGH_SIZE_NODES,
  Context
};