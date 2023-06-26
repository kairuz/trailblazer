

const randomInt = (max, randomNum = Math.random) => {
  if (!Number.isInteger(max) || max < 0) {
    throw 'invalid max';
  }

  return Math.trunc(randomNum() * max);

};

const randomChoice = (arr, randomNum = Math.random) => {
  if (!Array.isArray(arr) || arr.length === 0) {
    throw 'invalid arr';
  }
  return arr[randomInt(arr.length, randomNum)];
};
const randomChance = (outOf, randomNum = Math.random) => randomInt(outOf, randomNum) === 0;


const seed = (s) => {
  const mask = 0xffffffff;
  let m_w  = (123456789 + s) & mask;
  let m_z  = (987654321 - s) & mask;

  return () => {
    m_z = (36969 * (m_z & 65535) + (m_z >>> 16)) & mask;
    m_w = (18000 * (m_w & 65535) + (m_w >>> 16)) & mask;

    let result = ((m_z << 16) + (m_w & 65535)) >>> 0;
    result /= 4294967296;
    return result;
  }
};

const DEFAULT_SEED_VAL = 1234;

const SeededRandom = (seedVal = DEFAULT_SEED_VAL) => {

  const randomNum = seed(seedVal);

  return {
    get seedVal(){return seedVal;},
    num: () => randomNum(),
    int: (max) => randomInt(max, randomNum),
    choice: (arr) => randomChoice(arr, randomNum),
    chance: (outOf) => randomChance(outOf, randomNum)
  }

};

const DEFAULT_SEEDED_RANDOM = SeededRandom(DEFAULT_SEED_VAL);

const NodeMinHeap = (heapIndexes, costs) => {
  const arr = [];

  const isLessThan = (nodeA, nodeB) => {
    const costsA = costs.get(nodeA);
    const costsB = costs.get(nodeB);
    const fCostDiff = costsA.fCost - costsB.fCost;
    return fCostDiff === 0 ? costsA.hCost - costsB.hCost < 0 : fCostDiff < 0;
  };

  const add = (node) => {
    arr.push(node);
    const heapIndex = arr.length - 1;
    heapIndexes.set(node, heapIndex);
    if (arr.length > 1) {
      trickleUp(heapIndex);
    }
  };

  const trickleUp = (index) => {
    const node = arr[index];
    const parentInd = Math.floor((index - 1) / 2);
    const parent = arr[parentInd];

    if (parentInd >= 0) {
      const violation = isLessThan(node, parent);
      if (violation) {
        arr[parentInd] = node;
        heapIndexes.set(node, parentInd);
        arr[index] = parent;
        heapIndexes.set(parent, index);
        trickleUp(parentInd);
      }
    }
  };

  const peek = () => {
    if (arr.length === 0) {
      throw 'heap is empty';
    }
    return arr[0];
  };

  const pop = () => {
    if (arr.length === 0) {
      throw 'heap is empty';
    }
    else if (arr.length === 1) {
      heapIndexes.delete(arr[0]);
      return arr.pop();
    }
    const popped = arr[0];
    heapIndexes.delete(popped);
    arr[0] = arr.pop();
    heapIndexes.set(arr[0], 0);
    trickleDown(0);
    return popped;
  };

  const trickleDown = (index) => {
    const node = arr[index];
    const child1Index = (index * 2) + 1;

    const hasChild1 = child1Index in arr;

    if (hasChild1) {
      const child2Index = (index * 2) + 2;
      const childNode1 = arr[child1Index];
      const hasChild2 = child2Index in arr;
      const childNode2 = hasChild2 ? arr[child2Index] : null;

      const chosenChildIndex = hasChild2 && isLessThan(childNode2, childNode1) ?
                               child2Index : child1Index;
      const chosenChildNode = arr[chosenChildIndex];

      const violation = isLessThan(chosenChildNode, node);
      if (violation) {
        arr[index] = chosenChildNode;
        heapIndexes.set(chosenChildNode, index);
        arr[chosenChildIndex] = node;
        heapIndexes.set(node, chosenChildIndex);
        trickleDown(chosenChildIndex);
      }
    }
  };

  return {
    add,
    peek,
    pop,
    updateNode: (node) => trickleUp(heapIndexes.get(node)),
    contains: (node) => arr[heapIndexes.get(node)] === node,
    clear: () => arr.length = 0,
    get isEmpty(){return arr.length === 0;},
    get isNotEmpty() {return !this.isEmpty;},
    get size() {return arr.length;},
    toArray: () => [...arr],
    values: () => arr.values()
  };

};


const degToRad = (degrees) => degrees * (Math.PI / 180);

const radToDeg = (radians) => radians * (180 / Math.PI);

const sinr = (radians) => Math.sin(radians);
const sind = (degrees) => sinr(degToRad(degrees));
const cosr = (radians) => Math.cos(radians);
const cosd = (degrees) => cosr(degToRad(degrees));
const tanr = (radians) => Math.tan(radians);
const tand = (degrees) => tanr(degToRad(degrees));

const atan2r = (y, x) => Math.atan2(y, x);
const atan2d = (y, x) => radToDeg(atan2r(y, x));


const Vec2 = (_x, _y) => {
  let x = _x;
  let y = _y;

  const addXy = (_x, _y) => {x += _x; y += _y;};
  const addScalar = (_n) => {x += _n; y += _n;};
  const add = (_vec2) => addXy(_vec2.x, _vec2.y);

  const mulXy = (_x, _y) => {x *= _x; y *= _y;};
  const mul = (_vec2) => mulXy(_vec2.x, _vec2.y);
  const mulScalar = (_scalar) => mulXy(_scalar, _scalar);

  return {
    toString: () => `[${x},${y}]`,
    toPrettyStr: () => `[${x.toFixed(2)},${y.toFixed(2)}]`,
    setXy: (_x = x, _y = y) => {x = _x; y = _y;},
    set(that){Vec2.set(this, that);},
    clear: () => {x = 0; y = 0;},
    setFromArr: (_arr) => {x = _arr[0]; y = _arr[1];},
    get x(){return x;},
    get y(){return y;},
    set x(_x){x = _x;},
    set y(_y){y = _y;},
    addXy,
    add,
    sub: (_vec2) => {x -= _vec2.x; y -= _vec2.y;},
    addX: (_n) => x += _n,
    addY: (_n) => y += _n,
    diff: (_vec2) => Vec2(x - _vec2.x, y - _vec2.y),
    normalize: () => {
      const sqrtAdded = Math.sqrt(x**2 + y**2);
      x /= sqrtAdded; y /= sqrtAdded;
    },
    mulXy,
    mul,
    mulScalar,
    pow: (_n) => Vec2(Math.pow(x, _n), Math.pow(y, _n)),
    sq: function(){return this.pow(2);},
    toInv: () => Vec2(-x, -y),
    setInv: () => {x = -x; y = -y;},
    equals: (_vec2) => x === _vec2.x && y === _vec2.y,
    copyOf: () => Vec2(x, y),
    toArr: () => [x, y]
  };
};
Vec2.copyOf = (_vec2) => _vec2.copyOf();
Vec2.fromArr = (_arr) => Vec2(_arr[0], _arr[1], _arr[2]);
Vec2.toArr = (_vec2) => _vec2.toArr();
Vec2.set = (thiz, that) => {thiz.x = that.x; thiz.y = that.y;};
Vec2.zero = () => Vec2(0, 0, 0);
const _Vec2_zero = Vec2.zero();
Vec2.zeroArr = () => _Vec2_zero.toArr();


export {
  DEFAULT_SEED_VAL, DEFAULT_SEEDED_RANDOM,
  randomInt, randomChoice, randomChance, seed,
  SeededRandom, NodeMinHeap,
  degToRad, radToDeg, sinr, sind, cosr, cosd, tanr, tand, atan2r, atan2d,
  Vec2
};
