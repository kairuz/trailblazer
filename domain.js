
const Cost = () => {
  let gCost = 0;
  let hCost = 0;

  return {
    set gCost(_gCost){gCost = _gCost;},
    set hCost(_hCost){hCost = _hCost;},
    get gCost(){return gCost;},
    get hCost(){return hCost;},
    get fCost(){return gCost + hCost;},
  };
};

const Node = (posX, posY, size, walkable, i, j) => {
  let weight = 20;
  return {
    reset(){
      weight = 10;
    },

    set weight(_weight){weight = _weight;},
    set walkable(_walkable){walkable = _walkable;},
    get weight(){return weight;},
    get posX(){return posX;},
    get posY(){return posY;},
    get size(){return size;},
    get walkable(){return walkable;},
    get i(){return i;},
    get j(){return j;},
    get leftPos(){return posX - (size / 2);},
    get rightPos(){return this.leftPos + size;},
    get topPos(){return posY - (size / 2);},
    get bottomPos(){return this.topPos + size;},
    toArr(){return Node.toArr(this);}
  };
};
Node.toArr = (node) => {
  return [node.posX, node.posY, node.size, node.walkable, node.i, node.j];
};
Node.fromArr = (_arr) => {
  let ii = 0;
  const posX      = _arr[ii++];
  const posY      = _arr[ii++];
  const size      = _arr[ii++];
  const walkable  = _arr[ii++];
  const i         = _arr[ii++];
  const j         = _arr[ii++];
  return Node(posX, posY, size, walkable, i, j);
};

const Obstacle = (posX, posY, width, height) => {
  return {
    get posX(){return posX;},
    get posY(){return posY;},
    get width(){return width;},
    get height(){return height;},
    get leftPos(){return posX - (width / 2);},
    get rightPos(){return this.leftPos + width;},
    get topPos(){return posY - (height / 2);},
    get bottomPos(){return this.topPos + height;}
  }
};

const Grid = (width, height, nodeSize, obstacles) => {
  const nodesPerRow = Math.trunc(width / nodeSize);
  const nodesPerCol = Math.trunc(height / nodeSize);
  const walkableNodes = [];
  const unwalkableNodes = [];
  const nodes
      = Array.from(Array(nodesPerRow)).map((_, i) => Array.from(Array(nodesPerCol)).map(
      (_, j) => {
        const nodeLeftPos = i * nodeSize;
        const nodeRightPos = nodeLeftPos + nodeSize;
        const nodePosX = nodeLeftPos + (nodeSize / 2);
        const nodeTopPos = j * nodeSize;
        const nodeBottomPos = nodeTopPos + nodeSize;
        const nodePosY = nodeTopPos + (nodeSize / 2);

        const walkable = !obstacles.some((obstacle) => {
          const combinedHalfWidths = (obstacle.width / 2) + (nodeSize / 2);
          const combinedHalfHeights = (obstacle.height / 2) + (nodeSize / 2);
          const xCenterDiff = Math.abs(nodePosX - obstacle.posX);
          const yCenterDiff = Math.abs(nodePosY - obstacle.posY);

          return xCenterDiff < combinedHalfWidths && yCenterDiff < combinedHalfHeights;
        });

        const node = Node(nodePosX, nodePosY, nodeSize, walkable, i, j);

        if (walkable) {
          walkableNodes.push(node);
        }
        else {
          unwalkableNodes.push(node);
        }
        return node;
      }
  ));
  let path;
  return {
    get width(){return width},
    get height(){return height},
    get nodeSize(){return nodeSize},
    get obstacles(){return obstacles},
    get nodesPerRow(){return nodesPerRow;},
    get nodesPerCol(){return nodesPerCol;},
    get nodes(){return nodes;},
    get walkableNodes(){return walkableNodes;},
    get unwalkableNodes(){return unwalkableNodes;},
    get path(){return path;},
    set path(_path){path = _path;},
    nodeAt(i, j){return nodes[i][j];},
    getNeighbors(node) {
      const neighbors = [];
      for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
          if (i === 0 && j === 0) {
            continue;
          }
          let checkI = node.i + i;
          let checkJ = node.j + j;

          if (checkI >= 0 && checkI < nodesPerRow && checkJ >= 0 && checkJ < nodesPerCol) {
            neighbors.push(this.nodeAt(checkI, checkJ));
          }
        }

      }
      return neighbors;
    }
  }

};


export {Cost, Node, Obstacle, Grid};
