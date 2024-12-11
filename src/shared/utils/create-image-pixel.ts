const createImagePixel = (url: string): HTMLImageElement => {
  const pixel = document.createElement("img");

  pixel.src = url;
  // Ensure it's 1x1 pixel in size
  pixel.width = 1;
  pixel.height = 1;

  // Make it invisible
  pixel.style.position = "absolute";
  pixel.style.left = "-9999px";

  return pixel;
};

export default createImagePixel;
