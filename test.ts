import RBush from 'rbush';

const tree = new RBush(9);

const item = {
    minX: 20,
    minY: 40,
    maxX: 30,
    maxY: 50,
    foo: 'bar'
};
tree.insert(item);
const point = {
    minX: 25,
    minY: 45,
    maxX: 25,
    maxY: 45,
    foo: 'baz'
};
tree.insert(point);

const result = tree.search({minX: 10, minY: 10, maxX: 28, maxY: 80});

console.log(result);