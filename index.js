import {Context, SEED_PARAM_NAME, DEFAULT_OPS_PER_ITER, OPS_PER_ITER_PARAM_NAME,
  ROAD_HEIGHT_NODES, ROUGH_SIZE_NODES, NODE_SIZE, GRID_HEIGHT, GRID_WIDTH} from "./context.js";
import {SeededRandom} from "./utils.js";


window.addEventListener('load', () => {

  const urlSearchParams = new URLSearchParams(window.location.search);
  const seedParam = urlSearchParams.has(SEED_PARAM_NAME) ? urlSearchParams.get(SEED_PARAM_NAME) : null;
  const seedVal = seedParam !== null && Number.isInteger(Number(seedParam)) ? Number(seedParam) : Math.trunc(Math.random() * 10000); // DEFAULT_SEED_VAL;
  console.log(`seedVal=${seedVal}`);
  const opsPerIterParam = urlSearchParams.has(OPS_PER_ITER_PARAM_NAME) ? urlSearchParams.get(OPS_PER_ITER_PARAM_NAME) : null;
  const opsPerIter = opsPerIterParam !== null && Number.isInteger(Number(opsPerIterParam)) ? Number(opsPerIterParam) : DEFAULT_OPS_PER_ITER;

  const context = Context(SeededRandom(seedVal));
  const {grid, road, roughLeftTopIjs} = context;


  const findPathWorker = new Worker(new URL(`./find-path-worker.js` +
                                            `?${SEED_PARAM_NAME}=${seedVal}` +
                                            `&${OPS_PER_ITER_PARAM_NAME}=${opsPerIter}`,
                                            import.meta.url), {type: 'module'});
  findPathWorker.postMessage('wake up');

  // const PATH_COLORS = ['lightgreen', 'orange', 'lightblue']; //, 'pink', 'yellow', 'sandybrown', 'midnightblue', 'cornflowerblue'];
  const PATH_COLORS = ['lightgreen', 'orange', 'lightblue', 'pink', 'yellow', 'sandybrown', 'midnightblue', 'cornflowerblue'];

  const canvas = document.createElement('canvas');
  document.body.appendChild(canvas);
  canvas.style.position = 'absolute';
  canvas.height = GRID_HEIGHT;
  canvas.width = GRID_WIDTH;
  const canvasContext = canvas.getContext('2d');

  const pathsAnimatorCanvas = document.createElement('canvas');
  document.body.appendChild(pathsAnimatorCanvas);
  pathsAnimatorCanvas.style.position = 'absolute';
  pathsAnimatorCanvas.height = GRID_HEIGHT;
  pathsAnimatorCanvas.width = GRID_WIDTH;

  const frontCanvas = pathsAnimatorCanvas;

  const pathsAnimatorCanvasOffscreen = pathsAnimatorCanvas.transferControlToOffscreen();

  const pathsAnimatorWorker = new Worker(new URL(`./paths-animator-worker.js?${SEED_PARAM_NAME}=${seedVal}`, import.meta.url), {type: 'module'});
  console.log('pathsAnimatorWorker.postMessage');
  pathsAnimatorWorker.postMessage({canvas: pathsAnimatorCanvasOffscreen}, [pathsAnimatorCanvasOffscreen]);

  let pathIdSeq = 0;
  const pathsMax = PATH_COLORS.length;
  const paths = new Map();
  const pathsNodesColors = new Map();

  const deletePath = (pathId) => {
    const path = paths.get(pathId);
    paths.delete(pathId);
    const prevColor = PATH_COLORS[pathId % pathsMax];
    path.forEach((pathNode) => {
      const colorList = pathsNodesColors.get(pathNode);
      colorList.delete(prevColor);
      if (colorList.size === 0) {
        pathsNodesColors.delete(pathNode);
      }
    });
    pathsAnimatorWorker.postMessage({removePath: pathId});
  };

  const addPath = (pathNodeIjs) => {
    const pathNodes = Array(pathNodeIjs.length);
    const pathNodeIjsReversed = Array(pathNodeIjs.length);

    for (let i = pathNodeIjs.length - 1; i >= 0; i--) {
      const [pathNodeIjI, pathNodeIjJ] = pathNodeIjs[i];
      pathNodes[i] = context.grid.nodeAt(pathNodeIjI, pathNodeIjJ);
      pathNodeIjsReversed[(pathNodeIjs.length - 1) - i] = pathNodeIjs[i];
    }

    const newPathId = pathIdSeq++;

    if (paths.size === pathsMax) {
      const pathOldestId = newPathId - pathsMax;
      deletePath(pathOldestId);
    }
    paths.set(newPathId, pathNodes);
    const color = PATH_COLORS[newPathId % pathsMax];

    pathNodes.forEach((pathNode) => {
      if (pathsNodesColors.has(pathNode)) {
        pathsNodesColors.get(pathNode).add(color);
      }
      else {
        pathsNodesColors.set(pathNode, new Set().add(color))
      }
    });
    console.log('pathsAnimatorWorker.postMessage({addPath: [newPathId, pathNodeIjs, color]});');
    pathsAnimatorWorker.postMessage({addPath: [newPathId, pathNodeIjsReversed, color]});

  };

  const clearPaths = () => {
    pathsAnimatorWorker.postMessage('clearPaths');
    paths.clear();
    pathsNodesColors.clear();
  };

  findPathWorker.addEventListener('message', (e) => {
    const data = e.data;
    let ind = 0;

    const startTime = data[ind++];
    const [startNodeI, startNodeJ] = data[ind++];
    const _startNode = context.grid.nodeAt(startNodeI, startNodeJ);
    const [targetNodeI, targetNodeJ] = data[ind++];
    const _targetNode = context.grid.nodeAt(targetNodeI, targetNodeJ);
    const success = data[ind++];
    const workerTimeTakenMillis = data[ind++];
    const endTime = performance.now();
    const timeTakenMillis = endTime - startTime;
    const roundTripTimeTaken = endTime - startTime;
    console.log(`timeTakenMillis=${timeTakenMillis.toFixed(2)}, workerTimeTakenMillis=${workerTimeTakenMillis.toFixed(2)} round trip timeTaken=${roundTripTimeTaken.toFixed(2)}`);

    if (success === true) {
      const pathNodeIjs = data[ind++];
      const hasDuplicates = data[ind++];
      (hasDuplicates ? data[ind++].concat(startTime) : [startTime]).forEach((_startTime) => {
        addPath(pathNodeIjs);
        drawGrid(_startNode, _targetNode);
      });
      console.log(`findPath took ${performance.now() - startTime} ms`);
    }
  });


  let startNode = null;
  let targetNode = null;

  const findPathStart = (_startNode, _targetNode) => {
    const startTime = performance.now();
    const message = [
        startTime,
        [_startNode.i, _startNode.j],
        [_targetNode.i, _targetNode.j]
    ];
    findPathWorker.postMessage(message);
  };


  const drawGrid = (_startNode, _targetNode) => {
    canvasContext.clearRect(0, 0, canvas.width, canvas.height);

    const obstaclePaddingPerc = 13.3333333;
    const obstaclePadding = (grid.nodeSize * obstaclePaddingPerc / 100);

    grid.obstacles.forEach((obstacle, i) => {
      canvasContext.beginPath();
      canvasContext.fillStyle = 'black';
      canvasContext.fillRect(obstacle.leftPos + obstaclePadding, obstacle.topPos + obstaclePadding, obstacle.width - (obstaclePadding * 2), obstacle.height - (obstaclePadding * 2));
      canvasContext.closePath();
    });

    const walkablePaddingPerc = 10;
    const walkablePadding = (grid.nodeSize * walkablePaddingPerc / 100);
    const unwalkablePaddingPerc = 10;
    const unwalkablePadding = (grid.nodeSize * unwalkablePaddingPerc / 100);

    for (let i = 0; i < grid.nodesPerRow; i++) {
      for (let j = 0; j < grid.nodesPerCol; j++) {
        const node = grid.nodeAt(i, j);
        canvasContext.beginPath();
        if (node.walkable) {
          canvasContext.strokeStyle = 'lightgrey';
          canvasContext.strokeRect(i * grid.nodeSize + walkablePadding, j * grid.nodeSize + walkablePadding,
                             grid.nodeSize - (walkablePadding * 2), grid.nodeSize - (walkablePadding * 2));
        }
        else {
          canvasContext.strokeStyle = 'crimson';
          canvasContext.strokeRect(i * grid.nodeSize + unwalkablePadding, j * grid.nodeSize + unwalkablePadding,
                           grid.nodeSize - (unwalkablePadding * 2), grid.nodeSize - (unwalkablePadding * 2));
        }
        canvasContext.closePath();
      }
    }

    {
      canvasContext.beginPath();
      canvasContext.fillStyle = 'slategrey';

      for (let i = 0; i < road.length; i += ROAD_HEIGHT_NODES) {
        const roadNode = road[i];
        canvasContext.fillRect(roadNode.i * NODE_SIZE, roadNode.j * NODE_SIZE, NODE_SIZE, NODE_SIZE * ROAD_HEIGHT_NODES);
      }
      canvasContext.closePath();
    }

    {
      canvasContext.beginPath();
      canvasContext.fillStyle = 'olive';
      for (let i = 0; i < roughLeftTopIjs.length; i++) {
        const roughLeftTopIj = roughLeftTopIjs[i];
        canvasContext.fillRect(roughLeftTopIj.i * NODE_SIZE, roughLeftTopIj.j * NODE_SIZE, ROUGH_SIZE_NODES * NODE_SIZE, ROUGH_SIZE_NODES * NODE_SIZE);
      }
      canvasContext.closePath();
    }

    paths.forEach((path) => {
      if (path === null) {
        return;
      }
      for (let i = 0; i < path.length; i++) {
        const pathNode = path[i];
        const pathNodeColors = pathsNodesColors.get(pathNode);
        let iii = 0;
        for (const color of pathNodeColors) {
          const ii = iii;
          iii++;

          canvasContext.beginPath();

          const paddingFactor = 0.1;
          const padding = (grid.nodeSize * paddingFactor);
          canvasContext.fillStyle = color;

          canvasContext.fillRect(
              pathNode.leftPos + padding + ((grid.nodeSize - (2 * padding)) / pathNodeColors.size) * ii,
              pathNode.topPos + padding,
              (grid.nodeSize - (2 * padding)) / pathNodeColors.size,
              grid.nodeSize - 2 * padding
          );
          canvasContext.closePath();

        }
      }
    });

    if (_startNode !== null) {
      canvasContext.beginPath();
      canvasContext.fillStyle = 'blue';
      const startNodePaddingPerc = 10;
      const startNodePadding = (grid.nodeSize * startNodePaddingPerc / 100);
      const halfNodeSize = grid.nodeSize / 2;
      canvasContext.fillRect(_startNode.posX - halfNodeSize + startNodePadding, _startNode.posY - halfNodeSize + startNodePadding,
                       grid.nodeSize - (startNodePadding * 2), grid.nodeSize - (startNodePadding * 2));
      canvasContext.strokeStyle = 'black';
      canvasContext.strokeRect(_startNode.posX - halfNodeSize, _startNode.posY - halfNodeSize, grid.nodeSize, grid.nodeSize);
      canvasContext.closePath();
    }

    if (_targetNode !== null) {
      canvasContext.beginPath();
      canvasContext.fillStyle = 'green';
      const startNodePaddingPerc = 10;
      const startNodePadding = (grid.nodeSize * startNodePaddingPerc / 100);
      const halfNodeSize = grid.nodeSize / 2;
      canvasContext.fillRect(_targetNode.posX - halfNodeSize + startNodePadding, _targetNode.posY - halfNodeSize + startNodePadding,
                       grid.nodeSize - (startNodePadding * 2), grid.nodeSize - (startNodePadding * 2));
      canvasContext.strokeStyle = 'black';
      canvasContext.strokeRect(_targetNode.posX - halfNodeSize, _targetNode.posY - halfNodeSize, grid.nodeSize, grid.nodeSize);
      canvasContext.closePath();
    }
  };

  drawGrid(null, null);

  frontCanvas.addEventListener('contextmenu', (event) => {
    event.preventDefault();

    const {pageX, pageY} = event;
    const nodeClickedI = Math.trunc(pageX / grid.nodeSize);
    const nodeClickedJ = Math.trunc(pageY / grid.nodeSize);
    if (nodeClickedI >= grid.nodesPerRow || nodeClickedJ >= grid.nodesPerCol) {
      return;
    }
    const _startNode = grid.nodeAt(nodeClickedI, nodeClickedJ);

    if (!_startNode.walkable) {
      return;
    }

    clearPaths();

    startNode = _startNode;

    drawGrid(_startNode, targetNode);
    if (targetNode !== null) {
      findPathStart(_startNode, targetNode);
    }
  });

  frontCanvas.addEventListener('click', (event) => {

    const {pageX, pageY} = event;
    const nodeClickedI = Math.trunc(pageX / grid.nodeSize);
    const nodeClickedJ = Math.trunc(pageY / grid.nodeSize);
    if (nodeClickedI >= grid.nodesPerRow || nodeClickedJ >= grid.nodesPerCol) {
      return;
    }
    const _targetNode = grid.nodeAt(nodeClickedI, nodeClickedJ);

    if (!_targetNode.walkable) {
      return;
    }
    targetNode = _targetNode;

    drawGrid(startNode, _targetNode);
    if (startNode !== null) {
      findPathStart(startNode, _targetNode);
    }
  });

});
