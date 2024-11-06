const a = [1, 2, 3, 4, 5]
const b = [2, 3, 4]
console.log(Array.from(new Set([...a, ...b])))