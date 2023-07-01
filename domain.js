
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

const Node = (posX, posY, size, i, j) => {
  let walkable = true;
  let weight = 20;
  let blurredWeight = 0;
  return {
    set weight(_weight){weight = _weight;},
    set blurredWeight(_blurredWeight){blurredWeight = _blurredWeight;},
    set walkable(_walkable){walkable = _walkable;},
    get weight(){return weight;},
    get blurredWeight(){return blurredWeight;},
    get posX(){return posX;},
    get posY(){return posY;},
    get size(){return size;},
    get walkable(){return walkable;},
    get i(){return i;},
    get j(){return j;},
    get leftPos(){return posX - (size / 2);},
    get rightPos(){return this.leftPos + size;},
    get topPos(){return posY - (size / 2);},
    get bottomPos(){return this.topPos + size;}
  };
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
  const nodes
      = Array.from(Array(nodesPerRow)).map((_, i) => Array.from(Array(nodesPerCol)).map(
      (_, j) => {
        const nodeLeftPos = i * nodeSize;
        const nodePosX = nodeLeftPos + (nodeSize / 2);
        const nodeTopPos = j * nodeSize;
        const nodePosY = nodeTopPos + (nodeSize / 2);

        return Node(nodePosX, nodePosY, nodeSize, i, j);
      }
  ));

  obstacles.forEach((obstacle) => {
    const top = obstacle.posY - Math.trunc(obstacle.height / 2);
    const bottom = top + obstacle.height;
    const left = obstacle.posX - Math.trunc(obstacle.width / 2);
    const right = left + obstacle.width;
    const nodeRowTop = Math.max(0, Math.trunc(top / nodeSize));
    const nodeRowBottom = Math.min(nodesPerCol - 1, Math.trunc(bottom / nodeSize));
    const nodeColLeft = Math.max(0, Math.trunc(left / nodeSize));
    const nodeColRight = Math.min(nodesPerRow - 1, Math.trunc(right / nodeSize));

    for (let i = nodeColLeft; i <= nodeColRight; i++) {
      for (let j = nodeRowTop; j <= nodeRowBottom; j++) {
        nodes[i][j].walkable = false;
      }
    }
  });

  return {
    get width(){return width},
    get height(){return height},
    get nodeSize(){return nodeSize},
    get obstacles(){return obstacles},
    get nodesPerRow(){return nodesPerRow;},
    get nodesPerCol(){return nodesPerCol;},
    get nodes(){return nodes;},
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
