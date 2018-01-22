import { ConfigureFileJSON } from './JSONInterface';
export declare function searchAndLoad(fileOrDir: string): Promise<{
    filePath: string;
    config: ConfigureFileJSON;
}>;
