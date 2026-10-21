"use strict";

const NumbersSearch = {
  solve(numbers, targetText, ids = numbers.map((_, index) => `input:${index}`), progress = () => {}) {
    const target = BigInt(targetText);
    const initial = numbers.map((value, index) => ({
      value: BigInt(value), index, id: ids[index], ops: 0,
      expression: BigInt(value) < 0n ? `(${value})` : String(value)
    }));
    const failed = new Map();
    let visited = 0;
    let lastProgress = Date.now();
    const abs = value => value < 0n ? -value : value;
    let closest = null;
    const consider = node => {
      const distance = abs(node.value - target);
      if (!closest || distance < closest.distance || (distance === closest.distance && node.ops < closest.node.ops)) closest = { node, distance };
    };
    const keyFor = nodes => nodes.map(node => node.value).sort((a, b) => a < b ? -1 : a > b ? 1 : 0).join(",");

    function search(nodes, remaining) {
      visited++;
      const already = nodes.find(node => node.value === target);
      if (already) return already;
      if (!remaining) return null;
      if (visited % 4096 === 0 && Date.now() - lastProgress > 150) {
        progress({ visited, depth: currentDepth });
        lastProgress = Date.now();
      }
      const key = keyFor(nodes);
      if ((failed.get(key) ?? -1) >= remaining) return null;
      const candidates = [];
      const pairs = new Set();
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          const pair = a.value < b.value ? `${a.value},${b.value}` : `${b.value},${a.value}`;
          if (pairs.has(pair)) continue;
          pairs.add(pair);
          const outcomes = new Map();
          function add(value, left, operator, right) {
            if (value === a.value || value === b.value || outcomes.has(value)) return;
            outcomes.set(value, {
              value, left, right, operator, ops: left.ops + right.ops + 1,
              expression: `(${left.expression} ${operator} ${right.expression})`
            });
          }
          add(a.value + b.value, a, "+", b);
          add(a.value - b.value, a, "-", b);
          add(b.value - a.value, b, "-", a);
          add(a.value * b.value, a, "*", b);
          if (b.value !== 0n && a.value % b.value === 0n) add(a.value / b.value, a, "/", b);
          if (a.value !== 0n && b.value % a.value === 0n) add(b.value / a.value, b, "/", a);
          for (const node of outcomes.values()) {
            if (node.value === target) return node;
            consider(node);
            if (remaining > 1) candidates.push({ i, j, node, distance: abs(node.value - target) });
          }
        }
      }
      candidates.sort((a, b) => a.distance < b.distance ? -1 : a.distance > b.distance ? 1 : 0);
      for (const { i, j, node } of candidates) {
        const next = nodes.filter((_, index) => index !== i && index !== j);
        next.push(node);
        const answer = search(next, remaining - 1);
        if (answer) return answer;
      }
      if (failed.size >= 250000) failed.clear();
      failed.set(key, remaining);
      return null;
    }

    let answer = initial.find(node => node.value === target);
    initial.forEach(consider);
    let currentDepth = 0;
    for (currentDepth = 1; !answer && currentDepth < initial.length; currentDepth++) {
      progress({ visited, depth: currentDepth });
      answer = search(initial, currentDepth);
    }
    function build(answer) {
    const steps = [];
    const usedIndices = [];
    function collect(node) {
      if (!node.left) {
        usedIndices.push(node.index);
        return { id: node.id, step: null };
      }
      const left = collect(node.left), right = collect(node.right);
      const step = steps.length + 1;
      const id = `step:${step}`;
      steps.push({
        id, leftId: left.id, rightId: right.id,
        leftStep: left.step, rightStep: right.step,
        left: String(node.left.value), right: String(node.right.value),
        value: String(node.value), operator: node.operator
      });
      return { id, step };
    }
    collect(answer);
    return {
      expression: `${answer.expression} = ${answer.value}`, steps, used: usedIndices.length, usedIndices,
      value: String(answer.value), distance: String(abs(answer.value - target))
    };
    }
    if (answer) return { visited, solution: build(answer) };
    return { visited, solution: null, closest: build(closest.node) };
  }
};

function numbersSearchWorker() {
  self.onmessage = ({ data }) => {
    try {
      const result = NumbersSearch.solve(data.numbers, data.target, data.ids, progress => {
        self.postMessage({ type: "progress", ...progress });
      });
      self.postMessage({ type: "done", ...result });
    } catch (error) {
      self.postMessage({ type: "error", message: `No se pudo completar el c\u00e1lculo: ${error.message}` });
    }
  };
}

function createNumbersWorker() {
  const methodSource = `const NumbersSearch = { ${NumbersSearch.solve.toString()} }; (${numbersSearchWorker.toString()})();`;
  const url = URL.createObjectURL(new Blob([methodSource], { type: "text/javascript" }));
  try {
    return { worker: new Worker(url), url };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

function formatNumberValue(value) {
  const text = String(value);
  return text.length > 12 ? `${text.slice(0, 4)}\u2026${text.slice(-4)}` : text;
}

function createNumberStep(step) {
  const operation = document.createElement("span");
  operation.className = "operation";
  const operand = (value, reference, result = false) => {
    const span = document.createElement("span");
    span.className = result ? "step-value" : reference ? "step-derived" : "step-original";
    const display = formatNumberValue(value);
    span.textContent = BigInt(value) < 0n ? `(${display})` : display;
    span.title = String(value);
    span.setAttribute("aria-label", String(value));
    if (reference) {
      span.title = "Resultado anterior";
      span.setAttribute("aria-label", `${value}, resultado anterior`);
    }
    return span;
  };
  const symbol = { "+": "+", "-": "\u2212", "*": "\u00d7", "/": "\u00f7" };
  operation.append(
    operand(step.left, step.leftStep), ` ${symbol[step.operator]} `,
    operand(step.right, step.rightStep), " = ", operand(step.value, null, true)
  );
  return operation;
}

if (typeof module !== "undefined") module.exports = { NumbersSearch };
