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


  {
    const blurWeightMap = (blurSize) => {

      // let weightMax = Number.MIN_VALUE;
      // let weightMin = Number.MAX_VALUE;

      const clamp = (val, min, max) => {
        return Math.min(Math.max(val, min), max);
      };

      const weightsHorizPass = [];
      for (let i = 0; i < NODES_PER_ROW; i++) {
        weightsHorizPass[i] = [];
        for (let j = 0; j < NODES_PER_COL; j++) {
          weightsHorizPass[i][j] = 0;
        }
      }

      const weightsVertPass = [];
      for (let i = 0; i < NODES_PER_ROW; i++) {
        weightsVertPass[i] = [];
        for (let j = 0; j < NODES_PER_COL; j++) {
          weightsVertPass[i][j] = 0;
        }
      }

      const kernalSize = blurSize * 2 - 1;
      const kernalExtents = (kernalSize - 1) / 2;

      for (let j = 0; j < NODES_PER_COL; j++) {
        for (let i = -kernalExtents; i <= kernalExtents; i++) {
          let sampleI = clamp(i, 0, kernalExtents);
          weightsHorizPass[0][j] += grid.nodeAt(sampleI, j).weight;
        }
        for (let i = 1; i < NODES_PER_ROW; i++) {
          let removeIndex = Math.max((i - kernalExtents - 1), 0);
          let addIndex = Math.min((i + kernalExtents), NODES_PER_ROW - 1);
          weightsHorizPass[i][j] = weightsHorizPass[i-1][j] - grid.nodeAt(removeIndex, j).weight + grid.nodeAt(addIndex, j).weight;
        }
      }

      for (let i = 0; i < NODES_PER_ROW; i++) {
        for (let j = -kernalExtents; j <= kernalExtents; j++) {
          let sampleJ = clamp(j, 0, kernalExtents);
          weightsVertPass[i][0] += weightsHorizPass[i][sampleJ];
        }

        let blurredWeight = Math.round(weightsVertPass[i][0] / (kernalSize * kernalSize));
        grid.nodeAt(i, 0).weight = blurredWeight;

        for (let j = 1; j < NODES_PER_COL; j++) {
          let removeIndex = Math.max((j - kernalExtents - 1), 0);
          let addIndex = Math.min((j + kernalExtents - 1), NODES_PER_COL - 1);
          weightsVertPass[i][j] = weightsVertPass[i][j-1] - weightsHorizPass[i][removeIndex] + weightsHorizPass[i][addIndex];

          blurredWeight = Math.round(weightsVertPass[i][j] / (kernalSize * kernalSize));
          grid.nodeAt(i, j).weight = blurredWeight;

          /*
          if (blurredWeight > weightMax) {
            weightMax = blurredWeight;
          }
          if (blurredWeight < weightMin) {
            weightMin = blurredWeight;
          }
          */

        }
      }
    };


    blurWeightMap(3);
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