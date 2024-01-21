import Head from "next/head";
import { useEffect, useRef } from "react";

const imageUrl =
  "https://upload.wikimedia.org/wikipedia/commons/c/cb/Broadway_tower_edit.jpg";

const kernelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
const kernelY = [1, 2, 1, 0, 0, 0, -1, -2, -1];

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const img = new Image();
    img.src = imageUrl;
    img.crossOrigin = "Anonymous";

    img.onload = () => {
      const aspectRatio = img.width / img.height;
      const width = Math.floor(window.innerHeight * aspectRatio);
      const height = Math.floor(window.innerHeight);

      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      const scale = window.devicePixelRatio;
      canvas.width = width * scale;
      canvas.height = height * scale;

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
  }, []);

  const convolve = (i: number, pixels: Uint8ClampedArray, kernel: number[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return 0;

    const r = canvas.width * 4;
    const c = 4;

    return (
      (pixels.at(i - r - c) || 0) * (kernel.at(0) || 0) +
      (pixels.at(i - r + 0) || 0) * (kernel.at(1) || 0) +
      (pixels.at(i - r + c) || 0) * (kernel.at(2) || 0) +
      (pixels.at(i - 0 - c) || 0) * (kernel.at(3) || 0) +
      (pixels.at(i - 0 + 0) || 0) * (kernel.at(4) || 0) +
      (pixels.at(i - 0 + c) || 0) * (kernel.at(5) || 0) +
      (pixels.at(i + r - c) || 0) * (kernel.at(6) || 0) +
      (pixels.at(i + r + 0) || 0) * (kernel.at(7) || 0) +
      (pixels.at(i + r + c) || 0) * (kernel.at(8) || 0)
    );
  };

  const manipulatePixels = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    console.time("process");

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;

    const energy = new Float32Array(canvas.width * canvas.height);

    for (let i = 0; i < pixels.length; i += 4) {
      const dx = convolve(i, pixels, kernelX);
      const dy = convolve(i, pixels, kernelY);
      const value = Math.sqrt(dx ** 2 + dy ** 2);
      energy[i / 4] = value;
    }

    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;
    for (let i = energy.length - canvas.width - 1; i >= 0; i--) {
      const centerIndex = i + canvas.width + 0;
      const leftIndex = centerIndex - 1;
      const rightIndex = centerIndex + 1;

      const centerY = Math.floor(centerIndex / canvas.width);
      const leftY = Math.floor(leftIndex / canvas.width);
      const rightY = Math.floor(rightIndex / canvas.width);

      const isLeftInBounds = leftY === centerY;
      const isRightInBounds = rightY === centerY;

      const value = Math.min(
        isLeftInBounds ? energy[leftIndex] : energy[centerIndex],
        energy[centerIndex],
        isRightInBounds ? energy[rightIndex] : energy[centerIndex]
      );

      if (value < min) min = value;
      if (value > max) max = value;
      energy[i] += value;
    }

    const firstRow = energy.slice(0, canvas.width);
    let removalIndex = firstRow.indexOf(Math.min(...firstRow));
    for (let i = 0; i < canvas.height; i++) {
      energy[i * canvas.width + removalIndex] = Number.NEGATIVE_INFINITY;

      const centerIndex = removalIndex + canvas.width;
      const leftIndex = centerIndex - 1;
      const rightIndex = centerIndex + 1;

      const centerY = Math.floor(centerIndex / canvas.width);
      const leftY = Math.floor(leftIndex / canvas.width);
      const rightY = Math.floor(rightIndex / canvas.width);

      const isLeftInBounds = leftY === centerY;
      const isRightInBounds = rightY === centerY;

      const values = [
        isLeftInBounds ? energy[leftIndex] : Number.POSITIVE_INFINITY,
        energy[centerIndex],
        isRightInBounds ? energy[rightIndex] : Number.POSITIVE_INFINITY,
      ];

      const offset = values.indexOf(Math.min(...values)) - 1;
      removalIndex += canvas.width + offset;
    }

    for (let i = 0; i < pixels.length; i += 4) {
      const normalised = (energy[i / 4] - min) / (max - min);
      const value = Math.floor(normalised * 255);
      pixels.set(
        energy[i / 4] === Number.NEGATIVE_INFINITY
          ? [255, 0, 0, 255]
          : [value, value, value, 255],
        i
      );
    }

    // ctx.createImageData(canvas.width - 1, canvas.height);

    // canvas.style.width = `${width}px`;
    // canvas.style.height = `${height}px`;

    // const scale = window.devicePixelRatio;
    // canvas.width = width * scale;
    // canvas.height = height * scale;

    // ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    ctx.putImageData(imageData, 0, 0);
    console.timeEnd("process");
  };

  return (
    <>
      <Head>
        <title>Alex McDermott</title>
        <meta name="description" content="Welcome to my portfolio" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <main className="flex justify-center">
        <canvas ref={canvasRef} onClick={manipulatePixels} />
      </main>
    </>
  );
}
