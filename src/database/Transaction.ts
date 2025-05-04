import { AddElementCommand } from './commands/AddElementCommand';
import { AddNodeCommand } from './commands/AddNodeCommand';
import type { ICommand } from './ICommand';

export class Transaction {
    private commands: ICommand[] = []; // ordered list of commands
    public readonly name: string; // name of the transaction to be displayed in the UI
    public timestamp?: number;

    constructor(name: string) {
        this.name = name;
    }

    addCommand(command: ICommand) {
        this.commands.push(command);
    }

    addNode(...args: ConstructorParameters<typeof AddNodeCommand>): String {
        const command = new AddNodeCommand(...args);
        this.addCommand(command);
        return command.id;
    }

    addElement(...args: ConstructorParameters<typeof AddElementCommand>): String {
        const command = new AddElementCommand(...args);
        this.addCommand(command);
        return command.id;
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