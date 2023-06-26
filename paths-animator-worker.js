import {Context, SEED_PARAM_NAME, NODE_SIZE} from "./context.js"
import {DEFAULT_SEED_VAL, SeededRandom, Vec2, atan2d, cosd, sind} from "./utils.js";

let context = null;
const paths = new Map();
let canvas = null;
let canvasContext = null;

const Path = (id, nodes, color) => {
  if (!Array.isArray(nodes) || nodes.length < 2) {
    throw 'nodes must be an array of minimum length 2';
  }

  let lastDrawAt = null;
  const firstNode = nodes[0];
  const lastPosition = Vec2(firstNode.posX, firstNode.posY);
  const position = Vec2(firstNode.posX, firstNode.posY);
  // const velocity = Vec2(0, 0);
  let nodeIndex = 0;
  let node = firstNode;
  let approachingNodeIndex = 1;
  let approachingNode = nodes[approachingNodeIndex];
  let angle = 0;

  const calcAngle = () => {
    angle = atan2d(approachingNode.posY - position.y, approachingNode.posX - position.x);
  };

  calcAngle();

  return {
    setStartPosition() {
      position.setXy(firstNode.posX, firstNode.posY);
      nodeIndex = 0;
      node = firstNode;
      approachingNodeIndex = 1;
      approachingNode = nodes[approachingNodeIndex];
      calcAngle();
    },
    setApproachingNext() {
      if (approachingNodeIndex === nodes.length - 1) {
        this.setStartPosition();
      }
      else {
        nodeIndex = approachingNodeIndex;
        node = approachingNode;
        approachingNodeIndex++;
        approachingNode = nodes[approachingNodeIndex];
        calcAngle();
      }
    },
    update() {

      calcAngle();
      lastPosition.x = position.x;
      lastPosition.y = position.y;

      position.x += cosd(angle) * (40 / (node.weight + 1)); // better way to avoid 0?
      position.y += sind(angle) * (40 / (node.weight + 1));

      if (Math.abs(position.x - approachingNode.posX) < 10 &&
          Math.abs(position.y - approachingNode.posY) < 10) {
        this.setApproachingNext();
      }

    },
    get lastDrawAt(){return lastDrawAt;},
    set lastDrawAt(_lastDrawAt){lastDrawAt = _lastDrawAt;},
    get position(){return position;},
    get node(){return node;},
    get nodeIndex(){return nodeIndex;},
    get approachingNode(){return approachingNode;},
    get approachingNodeIndex(){return approachingNodeIndex;},
    set approachingNodeIndex(_approachingNodeIndex){approachingNodeIndex = _approachingNodeIndex;},
    get id(){return id;},
    get nodes(){return nodes;},
    get color(){return color;}
  }
};

const addPath = (pathId, nodeIjsArr, color) => {
  const startAnimation = paths.size === 0;

  const nodes = nodeIjsArr.map(([nodeI, nodeJ]) => context.grid.nodeAt(nodeI, nodeJ));
  const path = Path(pathId, nodes, color);
  paths.set(path.id, path);

  if (startAnimation) {
    animate();
  }
};

const removePath = (pathId) => {
  paths.delete(pathId);
  if (paths.size === 0) {
    stopAnimation();
  }
};

const clearPaths = () => {
  paths.clear();
  stopAnimation();
};

let animationRequestId = null;

const RADIUS = Math.trunc(NODE_SIZE / 3);

const draw  = () => {
  canvasContext.clearRect(0, 0, canvas.width, canvas.height);

  paths.forEach((path) => {
    path.update();
    canvasContext.beginPath();
    canvasContext.fillStyle = path.color;
    canvasContext.arc(path.position.x, path.position.y, RADIUS, 0, 2 * Math.PI);
    canvasContext.fill();
    canvasContext.strokeStyle = 'black';
    canvasContext.arc(path.position.x, path.position.y, RADIUS, 0, 2 * Math.PI);
    canvasContext.stroke();
    canvasContext.closePath();
  });

};

const animate = () => {
  draw();
  animationRequestId = requestAnimationFrame(animate);
};

const stopAnimation = () => {
  cancelAnimationFrame(animationRequestId);
};


addEventListener('message', (e) => {
  const data = e.data;

  console.log('animator got message ', data);

  if (context === null) {
    const urlSearchParams = new URLSearchParams(self.location.search);
    const seedParam = urlSearchParams.has(SEED_PARAM_NAME) ? urlSearchParams.get(SEED_PARAM_NAME) : null;
    const seedVal = seedParam !== null && Number.isInteger(Number(seedParam)) ? Number(seedParam) : DEFAULT_SEED_VAL;

    context = Context(SeededRandom(seedVal));
  }
  if ('clearPaths' === data) {
    clearPaths();
  }
  else if (typeof data !== 'object') {
    console.log('paths-animator-worker ignoring non-object message');
  }
  else if ('canvas' in data) {
    canvas = data.canvas;
    canvasContext = canvas.getContext('2d');
  }
  else if ('addPath' in data) {
    const [pathId, nodeIjsArr, color] = data.addPath;
    addPath(pathId, nodeIjsArr, color);
  }
  else if ('removePath' in data) {
    const pathId = data.removePath;
    removePath(pathId);
  }
  else {
    console.log('paths-animator-worker ignoring unrecognized message');
  }



});


