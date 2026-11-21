/** Semua parameter berukuran piksel dikali tinggi buffer / 1920, supaya still 0.5x dan master 1.33x identik. */
export const pxScale = (drawingBufferHeight: number) => drawingBufferHeight / 1920;
