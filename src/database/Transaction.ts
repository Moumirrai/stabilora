import { AddElementOperation } from './operations/AddElementOperation';
import { AddNodeOperation } from './operations/AddNodeOperation';
import type { IOperation } from './IOperation';
import { RemoveNodeOperation } from './operations/RemoveNodeOperation';
import { RemoveElementOperation } from './operations/RemoveElementOperation';

export class Transaction {
  private commands: IOperation[] = []; // ordered list of operations
  public readonly name: string; // name of the transaction to be displayed in the UI
  public timestamp?: number;

  constructor(name: string) {
    this.name = name;
  }

  addCommand(command: IOperation) {
    this.commands.push(command);
  }

  addNode(...args: ConstructorParameters<typeof AddNodeOperation>): String {
    const command = new AddNodeOperation(...args);
    this.addCommand(command);
    return command.id;
  }

  addElement(
    ...args: ConstructorParameters<typeof AddElementOperation>
  ): String {
    const command = new AddElementOperation(...args);
    this.addCommand(command);
    return command.id;
  }

  removeNode(...args: ConstructorParameters<typeof RemoveNodeOperation>): void {
    const command = new RemoveNodeOperation(...args);
    this.addCommand(command);
  }

  removeElement(
    ...args: ConstructorParameters<typeof RemoveElementOperation>
  ): void {
    const command = new RemoveElementOperation(...args);
    this.addCommand(command);
  }
  do() {
    this.timestamp = Date.now();
    this.commands.forEach((command) => command.do());
  }

  undo() {
    this.timestamp = Date.now();
    this.commands.reverse().forEach((command) => command.undo());
  }
}
