import Konva from 'konva';

const margin: number = 30;
const size: number = 40;
const lineWidth: number = 2;
const colorX: string = 'gray';
const colorZ: string = 'gray';

export const CoordSystemIndicator = new Konva.Group({ listening: false }).add(
  new Konva.Arrow({
    points: [margin, margin, margin + size, margin],
    fill: colorX,
    stroke: colorX,
    strokeWidth: lineWidth,
    draggable: false,
    pointerWidth: 5,
    pointerLength: 5,
    perfectDrawEnabled: false,
  }),
  new Konva.Text({
    text: 'X',
    fontSize: 10,
    fill: colorX,
    x: margin + size + 5,
    y: margin - 5,
    align: 'center',
    fontVariant: 'bold',
    draggable: false,
  }),
  new Konva.Arrow({
    points: [margin, margin, margin, margin + size],
    fill: colorZ,
    stroke: colorZ,
    strokeWidth: lineWidth,
    draggable: false,
    scaleX: 1,
    id: 'y-axis',

    pointerWidth: 5,
    pointerLength: 5,
    perfectDrawEnabled: false,
  }),
  new Konva.Text({
    text: 'Z',
    fontVariant: 'bold',
    fontSize: 10,
    fill: colorZ,
    x: margin - 3,
    y: margin + size + 5,
    draggable: false,
  })
);
