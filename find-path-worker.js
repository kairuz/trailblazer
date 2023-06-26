import {SeededRandom, NodeMinHeap, DEFAULT_SEED_VAL} from "./utils.js";
import {Context, OPS_PER_ITER_PARAM_NAME, DEFAULT_OPS_PER_ITER, SEED_PARAM_NAME} from "./context.js";
import {Cost} from "./domain.js";


let context = null;
let opsPerIter = null;

let checkTimeoutId = null;

const checkLoop = () => {
  checkTimeoutId = null;
  process();
  if (runningFindPaths.size > 0) {
    checkTimeoutId = setTimeout(checkLoop);
  }
};

const process = () => {
  runningFindPaths.forEach((runningFindPath) => {
    let complete = false;
    for (let i = 0;!complete && i < opsPerIter; i++) {
      if (runningFindPath.openSet.isNotEmpty) {
        let currentNode = runningFindPath.openSet.pop();
        if (!runningFindPath.costs.has(currentNode)) {
          runningFindPath.costs.set(currentNode, Cost());
        }
        runningFindPath.currentNode = currentNode;
        runningFindPath.closedSet.add(currentNode);
        complete = findPathIter(runningFindPath);
      }
      else {
        console.log('NOT FOUND - runningFindPath.openSet.isEmpty ' + runningFindPath.openSet.isEmpty);
        runningFindPath.success = false;
        findPathEnd(runningFindPath);
        complete = true;
      }
    }
  });
};

const FindPathsContext = (
    idStr, startTime, workerStartTime, _startNode, _targetNode, openSet, closedSet, parents, costs
) => {
  let currentNode = null;
  let workerEndTime = null;
  let success = null;

  return {
    get parents(){return parents;},
    get costs(){return costs;},
    get idStr(){return idStr;},
    get openSet(){return openSet;},
    get closedSet(){return closedSet;},
    get workerStartTime(){return workerStartTime;},
    get workerEndTime(){return workerStartTime;},
    set workerEndTime(_workerEndTime){workerEndTime = _workerEndTime;},
    get currentNode(){return currentNode;},
    set currentNode(_currentNode){currentNode = _currentNode;},
    get startTime(){return startTime},
    get startNode(){return _startNode},
    get targetNode(){return _targetNode},
    get success(){return success;},
    set success(_success){success = _success;}
  };
};

const startNodeTargetNodeToIdStr = (_startNode, _targetNode) => {
  return `${_startNode.i},${_startNode.j}-${_targetNode.i},${_targetNode.j}`;
};

const runningFindPaths = new Map();
const runningFindPathDuplicates = new Map();

const getDistance = (nodeA, nodeB) => {
  const distI = Math.abs(nodeA.i - nodeB.i);
  const distJ = Math.abs(nodeA.j - nodeB.j);

  if (distI > distJ) {
    return (14 * distJ) + (10 * (distI - distJ));
  }
  return (14 * distI) + (10 * (distJ - distI));
};

const findPathEnd = (runningFindPath) => {
  const workerEndTime = performance.now();
  const workerTimeTakenMillis = workerEndTime - runningFindPath.workerStartTime;
  runningFindPaths.delete(runningFindPath.idStr);
  const pathNodeIjs = runningFindPath.success ? (() => {
    const pathNodeIjs = [];
    let currentNode = runningFindPath.targetNode;
    while (currentNode !== runningFindPath.startNode) {
      pathNodeIjs.push([currentNode.i, currentNode.j]);
      currentNode = runningFindPath.parents.get(currentNode);
    }
    pathNodeIjs.push([runningFindPath.startNode.i, runningFindPath.startNode.j]);
    return pathNodeIjs;
  })() : null;

  const hasDuplicates = runningFindPathDuplicates.has(runningFindPath.idStr);
  const duplicateStartTimes = hasDuplicates ? (() => {
    const dupStartTimes = [];
    const dups = runningFindPathDuplicates.get(runningFindPath.idStr);
    runningFindPathDuplicates.delete(runningFindPath.idStr);
    dups.forEach((dup) => {
      dupStartTimes.push(dup.startTime);
    });
    return dupStartTimes;
  })() : null;

  const message = [
    runningFindPath.startTime,
    [runningFindPath.startNode.i, runningFindPath.startNode.j],
    [runningFindPath.targetNode.i, runningFindPath.targetNode.j],
    runningFindPath.success,
    workerTimeTakenMillis,
    pathNodeIjs,
    hasDuplicates,
    duplicateStartTimes
  ];
  postMessage(message);
};

const findPathIter = (runningFindPath) => {
  if (runningFindPath.currentNode === runningFindPath.targetNode) {
    runningFindPath.success = true;
    findPathEnd(runningFindPath);
    return true;
  }
  else {
    updateNeighbors(runningFindPath);
    return false;
  }
};

const updateNeighbors = (runningFindPath) => {
  for (const neighbor of context.grid.getNeighbors(runningFindPath.currentNode)) {

    if (neighbor.walkable) {
      if (!runningFindPath.costs.has(neighbor)) {
        runningFindPath.costs.set(neighbor, Cost());
      }
    }

    if (!neighbor.walkable || runningFindPath.closedSet.has(neighbor)) {
      continue;
    }

    const neighborCost = runningFindPath.costs.get(neighbor);
    const currentNodeCost = runningFindPath.costs .get(runningFindPath.currentNode);

    const newMovementCostToNeighbor = currentNodeCost.gCost + getDistance(runningFindPath.currentNode, neighbor) + neighbor.weight;
    if (newMovementCostToNeighbor < neighborCost.gCost || !runningFindPath.openSet.contains(neighbor)) {
      neighborCost.gCost = newMovementCostToNeighbor;
      neighborCost.hCost = getDistance(neighbor, runningFindPath.targetNode);
      runningFindPath.parents.set(neighbor, runningFindPath.currentNode);
      if (!runningFindPath.openSet.contains(neighbor)) {
        runningFindPath.openSet.add(neighbor);
      }
      else {
        runningFindPath.openSet.updateNode(neighbor);
      }
    }
  }
};

addEventListener('message', (e) => {
  const data = e.data;

  if (context === null) {
    const urlSearchParams = new URLSearchParams(self.location.search);
    const seedParam = urlSearchParams.has(SEED_PARAM_NAME) ? urlSearchParams.get(SEED_PARAM_NAME) : null;
    const seedVal = seedParam !== null && Number.isInteger(Number(seedParam)) ? Number(seedParam) : DEFAULT_SEED_VAL;
    const opsPerIterParam = urlSearchParams.has(OPS_PER_ITER_PARAM_NAME) ? urlSearchParams.get(OPS_PER_ITER_PARAM_NAME) : null;
    opsPerIter = opsPerIterParam !== null && Number.isInteger(Number(opsPerIterParam)) ? Number(opsPerIterParam) : DEFAULT_OPS_PER_ITER;

    context = Context(SeededRandom(seedVal));
  }

  if (!Array.isArray(data)) {
    console.log('find-path-worker ignoring non-array message');
    return;
  }

  let ind = 0;
  const startTime = data[ind++];
  const [startNodeI, startNodeJ] = data[ind++];
  const [targetNodeI, targetNodeJ] = data[ind++];
  const _startNode = context.grid.nodeAt(startNodeI, startNodeJ);
  const _targetNode = context.grid.nodeAt(targetNodeI, targetNodeJ);
  const workerStartTime = performance.now();
  const parents = new Map();
  const costs = new Map();
  const heapIndexes = new Map();
  const openSet = NodeMinHeap(heapIndexes, costs);
  openSet.add(_startNode);
  const closedSet = new Set();
  const idStr = startNodeTargetNodeToIdStr(_startNode, _targetNode);

  const findPathsContext = FindPathsContext(idStr, startTime, workerStartTime, _startNode, _targetNode, openSet, closedSet, parents, costs)

  if (runningFindPaths.has(idStr)) {
    if (runningFindPathDuplicates.has(idStr)) {
      runningFindPathDuplicates.get(idStr).add(findPathsContext);
    }
    else {
      runningFindPathDuplicates.set(idStr, new Set().add(findPathsContext));
    }
  }
  else {
    runningFindPaths.set(idStr, findPathsContext);
    if (checkTimeoutId === null) {
      console.log('not yet processing - kicking off');
      checkTimeoutId = setTimeout(checkLoop);
    }
    else {
      console.log('already processing');
    }
  }
});
