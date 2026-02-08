# Insert Image into PDF

A fullstack app that inserts a dropped image into a template PDF and downloads the result. Put your PDF in `backend/template.pdf`, drop an image on the frontend, and get the modified PDF.

## Tech Stack

- **Frontend**: React + Vite, react-dropzone
- **Backend**: Node.js, Express
- **PDF**: PDF-Lib
- **Images**: Sharp (optimization)

## Setup

1. **Put your PDF in the backend folder:**
   - Place your PDF file at `backend/template.pdf`

2. **Install dependencies:**
   ```bash
   npm install
   cd backend && npm install
   cd ../frontend && npm install
   ```

3. **Run the app** (in two terminals, or `npm run dev` from root):

   **Terminal 1 – Backend:**
   ```bash
   cd backend && npm run dev
   ```

   **Terminal 2 – Frontend:**
   ```bash
   cd frontend && npm run dev
   ```

4. Open **http://localhost:5173** in your browser.

## Usage

1. Place your template PDF at `backend/template.pdf`
2. Drag and drop an image onto the frontend, or click to browse
3. Click **Insert image & Download PDF** to get the modified PDF

The image is inserted centered on the first page of your template PDF, scaled to fit with margins.
