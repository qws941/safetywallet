declare module "piexifjs" {
  interface ExifObj {
    [key: string]: Record<number, unknown> | null;
  }

  const piexif: {
    load(dataUrl: string): ExifObj;
    remove(dataUrl: string): string;
    dump(exifObj: ExifObj): string;
    insert(exifBytes: string, dataUrl: string): string;
  };

  export default piexif;
}
