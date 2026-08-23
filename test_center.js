const THREE = require('three');
const matrix = new THREE.Matrix4().makeTranslation(10, 0, 0);
const center = new THREE.Vector3(1, 2, 3);
const worldCenter = center.clone().applyMatrix4(matrix);
console.log(worldCenter);
