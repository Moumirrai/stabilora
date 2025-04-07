export interface Command {
    execute(): void;
    undo(): void;
    getName(): string;
}