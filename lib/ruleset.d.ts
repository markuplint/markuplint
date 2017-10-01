export interface Ruleset {
    rules?: {
        require?: {
            [tag: string]: {
                position: 'child' | 'descendant';
            };
        };
    };
}
