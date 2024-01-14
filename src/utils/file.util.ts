import * as fs from "fs";

export class FileUtil {
    public static exists(path: string): boolean {
        return fs.existsSync(path);
    }

    public static write(path: string, output: string) {
        fs.writeFileSync(path, output);
    }

    public static read(path: string): string {
        return fs.readFileSync(path).toString()
    }
}