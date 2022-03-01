// mock images
export const mockImages = [
  { type: "image", src: "/ferrari-f430-sport-car.jpg" },
  { type: "image", src: "/Ferrari Scuderia Spider.jpg" },
];
// mock video
export const mockVideo = {
  type: "video",
  src: "/laptop-extra-screen.mp4",
};
// mock media
export const mockMedia = [...mockImages, mockVideo];

export const testList = Array.from({ length: 5 }).map((_, i) => ({
  name: "A" + i,
  tags: ["tag1" + i, "tag2" + i],
  createdAt: new Date(Date.now() + 1e3 * i),
}));
