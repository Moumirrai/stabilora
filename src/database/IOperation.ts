export interface IOperation {
  do(): boolean; // returns true if the operation was successful
  undo(): boolean;
}
