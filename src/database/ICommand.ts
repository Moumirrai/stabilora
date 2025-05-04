export interface ICommand {
    do(): void;
    undo(): void;
}