# Backend

## Template PDF

**Put your PDF file here as `template.pdf`**

The backend loads `template.pdf` from this folder. When a user drops an image on the frontend, the backend inserts that image into the target area (white box) on the first page.

## Image placement

Edit `IMAGE_PLACEMENT` in `server.js` to match your template’s white box:

```js
const IMAGE_PLACEMENT = {
  x: 140,      // left edge (points, 72 = 1 inch)
  y: 200,      // bottom edge
  width: 240,  // box width
  height: 300, // box height
};
```

- Origin is bottom-left of the page
- 72 points = 1 inch
- If the image is off, tweak these values until it lines up with your white box
