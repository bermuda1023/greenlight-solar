import { NextApiRequest, NextApiResponse } from "next";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { code } = req.query;

  if (!code) {
    return res.status(400).json({ message: "No authorization code provided" });
  }

  // Send the code back to the opener window
  res.setHeader("Content-Type", "text/html");
  res.send(`
    <!DOCTYPE html>
    <html>
      <body>
        <script>
          if (window.opener) {
            window.opener.postMessage({ code: "${code}" }, "*");
            window.close();
          }
        </script>
      </body>
    </html>
  `);
}
