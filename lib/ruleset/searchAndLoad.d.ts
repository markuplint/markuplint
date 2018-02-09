import { ConfigureFileJSON } from './JSONInterface';
export default function searchAndLoad(fileOrDir: string): Promise<{
    filePath: string;
    config: ConfigureFileJSON;
}>;
